/**
 * Socials: feed, posts (with images in the "posts" bucket), likes, comments,
 * communities, top contributors, follows and public profile cards.
 */
const { check } = require('../lib/supabase');
const { AppError } = require('../middleware/errorHandler');
const storage = require('./storageService');
const { DEFAULT_PREFERENCES } = require('./profileService');

async function profilesById(ctx, ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const rows = check(await ctx.db.from('profiles').select('id, name, avatar_path').in('id', unique), 'Loading profiles');
  return Object.fromEntries(rows.map((p) => [p.id, { id: p.id, name: p.name, avatarUrl: storage.publicUrl('avatars', p.avatar_path) }]));
}

async function feed(ctx, { communityId, authorId, limit = 30 }) {
  let q = ctx.db.from('posts').select('*').order('created_at', { ascending: false }).limit(Math.min(Math.max(Number(limit) || 30, 1), 50));
  if (communityId) q = q.eq('community_id', communityId);
  if (authorId) q = q.eq('user_id', authorId);
  const posts = check(await q, 'Loading posts');
  const ids = posts.map((p) => p.id);
  const [authors, likes, comments, communities] = await Promise.all([
    profilesById(ctx, posts.map((p) => p.user_id)),
    ids.length ? ctx.db.from('post_likes').select('post_id, user_id').in('post_id', ids).then((r) => check(r, 'Loading likes')) : [],
    ids.length ? ctx.db.from('post_comments').select('post_id').in('post_id', ids).then((r) => check(r, 'Loading comments')) : [],
    ctx.db.from('communities').select('id, name').then((r) => check(r, 'Loading communities')),
  ]);
  const cname = Object.fromEntries(communities.map((c) => [c.id, c.name]));
  return posts.map((p) => {
    const pl = likes.filter((l) => String(l.post_id) === String(p.id));
    return {
      id: p.id,
      content: p.content,
      imageUrl: storage.publicUrl('posts', p.image_path),
      communityId: p.community_id,
      communityName: cname[p.community_id] || null,
      author: authors[p.user_id] || { id: p.user_id, name: 'Student', avatarUrl: null },
      likes: pl.length,
      likedByMe: pl.some((l) => l.user_id === ctx.userId),
      comments: comments.filter((c) => String(c.post_id) === String(p.id)).length,
      isMine: p.user_id === ctx.userId,
      createdAt: p.created_at,
    };
  });
}

async function createPost(ctx, { content, communityId }, image) {
  const text = String(content || '').trim();
  if (!text && !image) throw new AppError('Write something or add an image.', 400);
  if (text.length > 5000) throw new AppError('Posts can be at most 5000 characters.', 400);
  let imagePath = null;
  if (image) {
    imagePath = storage.pathFor(ctx.userId, image.originalname);
    await storage.upload('posts', imagePath, image.buffer, image.mimetype);
  }
  try {
    check(await ctx.db.from('posts').insert({ user_id: ctx.userId, content: text, image_path: imagePath, community_id: communityId ? Number(communityId) : null }), 'Saving the post');
  } catch (err) {
    await storage.remove('posts', imagePath);
    throw err;
  }
}

async function removePost(ctx, id) {
  const p = check(await ctx.db.from('posts').select('image_path').eq('id', id).eq('user_id', ctx.userId).maybeSingle(), 'Loading the post');
  if (!p) throw new AppError('You can only delete your own posts.', 403);
  check(await ctx.db.from('posts').delete().eq('id', id).eq('user_id', ctx.userId), 'Deleting the post');
  await storage.remove('posts', p.image_path);
}

async function setLike(ctx, postId, liked) {
  if (liked) check(await ctx.db.from('post_likes').upsert({ post_id: postId, user_id: ctx.userId }, { onConflict: 'post_id,user_id', ignoreDuplicates: true }), 'Liking the post');
  else check(await ctx.db.from('post_likes').delete().eq('post_id', postId).eq('user_id', ctx.userId), 'Removing the like');
}

async function comments(ctx, postId) {
  const rows = check(await ctx.db.from('post_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true }).limit(200), 'Loading comments');
  const authors = await profilesById(ctx, rows.map((c) => c.user_id));
  return rows.map((c) => ({ id: c.id, content: c.content, createdAt: c.created_at, author: authors[c.user_id] || { name: 'Student' } }));
}

async function addComment(ctx, postId, content) {
  const text = String(content || '').trim();
  if (!text) throw new AppError('Write a comment first.', 400);
  check(await ctx.db.from('post_comments').insert({ post_id: postId, user_id: ctx.userId, content: text.slice(0, 1000) }), 'Saving the comment');
}

async function communities(ctx) {
  const [list, members, posts] = await Promise.all([
    ctx.db.from('communities').select('*').order('name').then((r) => check(r, 'Loading communities')),
    ctx.db.from('community_members').select('community_id, user_id').then((r) => check(r, 'Loading members')),
    ctx.db.from('posts').select('community_id').not('community_id', 'is', null).then((r) => check(r, 'Loading posts')),
  ]);
  return list.map((c) => {
    const m = members.filter((x) => String(x.community_id) === String(c.id));
    return { ...c, members: m.length, posts: posts.filter((p) => String(p.community_id) === String(c.id)).length, joined: m.some((x) => x.user_id === ctx.userId) };
  });
}

/** One community + top contributors (10 points per post + 2 per like received). */
async function community(ctx, slug) {
  const c = (await communities(ctx)).find((x) => x.slug === slug || String(x.id) === String(slug));
  if (!c) throw new AppError('Community not found.', 404);
  const posts = check(await ctx.db.from('posts').select('id, user_id').eq('community_id', c.id), 'Loading posts');
  const likes = posts.length ? check(await ctx.db.from('post_likes').select('post_id').in('post_id', posts.map((p) => p.id)), 'Loading likes') : [];
  const points = {};
  posts.forEach((p) => { points[p.user_id] = (points[p.user_id] || 0) + 10; });
  const ownerOf = Object.fromEntries(posts.map((p) => [p.id, p.user_id]));
  likes.forEach((l) => { const o = ownerOf[l.post_id]; if (o) points[o] += 2; });
  const people = await profilesById(ctx, Object.keys(points));
  const topContributors = Object.entries(points)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id, pts]) => ({ ...(people[id] || { id, name: 'Student' }), points: pts }));
  return { community: c, topContributors };
}

async function setMembership(ctx, communityId, joined) {
  if (joined) check(await ctx.db.from('community_members').upsert({ community_id: communityId, user_id: ctx.userId }, { onConflict: 'community_id,user_id', ignoreDuplicates: true }), 'Joining');
  else check(await ctx.db.from('community_members').delete().eq('community_id', communityId).eq('user_id', ctx.userId), 'Leaving');
}

async function userStats(ctx, userId) {
  const [posts, communitiesCount, followers, following] = await Promise.all([
    ctx.db.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', userId).then((r) => check(r, 'Counting posts', { withCount: true })),
    ctx.db.from('community_members').select('community_id', { count: 'exact', head: true }).eq('user_id', userId).then((r) => check(r, 'Counting communities', { withCount: true })),
    ctx.db.from('follows').select('follower_id').eq('following_id', userId).then((r) => check(r, 'Loading followers')),
    ctx.db.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId).then((r) => check(r, 'Counting following', { withCount: true })),
  ]);
  return {
    posts: posts.count || 0,
    communities: communitiesCount.count || 0,
    followers: followers.length,
    following: following.count || 0,
    iFollow: followers.some((f) => f.follower_id === ctx.userId),
  };
}

/** Another student's public card - respects their privacy settings. */
async function userCard(ctx, userId) {
  const p = check(await ctx.db.from('profiles').select('id, name, avatar_path, education_level, preferences, created_at').eq('id', userId).maybeSingle(), 'Loading the profile');
  if (!p) throw new AppError('Student not found.', 404);
  const prefs = { ...DEFAULT_PREFERENCES, ...(p.preferences || {}) };
  const isMe = userId === ctx.userId;
  const stats = await userStats(ctx, userId);
  const isPrivate = prefs.profileVisibility === 'private';
  const hidden = isPrivate && !isMe && !stats.iFollow;
  return {
    id: p.id,
    name: p.name,
    avatarUrl: storage.publicUrl('avatars', p.avatar_path),
    handle: prefs.username ? `@${prefs.username}` : null,
    school: hidden ? null : prefs.school || null,
    educationLevel: prefs.showStudyStats && !hidden ? p.education_level : null,
    isPrivate,
    isMe,
    createdAt: p.created_at,
    ...stats,
    ...(hidden ? { posts: null } : {}),
  };
}

async function setFollow(ctx, userId, follow) {
  if (userId === ctx.userId) throw new AppError('You can’t follow yourself.', 400);
  if (follow) check(await ctx.db.from('follows').upsert({ follower_id: ctx.userId, following_id: userId }, { onConflict: 'follower_id,following_id', ignoreDuplicates: true }), 'Following');
  else check(await ctx.db.from('follows').delete().eq('follower_id', ctx.userId).eq('following_id', userId), 'Unfollowing');
}

module.exports = { feed, createPost, removePost, setLike, comments, addComment, communities, community, setMembership, userStats, userCard, setFollow };

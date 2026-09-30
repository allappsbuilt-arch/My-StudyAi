-- =====================================================================
-- MyStudyAI - schema
-- Tables for profiles, materials, notes, quizzes, chat, study plan, flashcards, socials and games.
-- Idempotent: safe to run more than once.
-- =====================================================================

-- ---------- Profiles (one per Supabase Auth user) ----------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text not null default 'Student',
  avatar_path     text,
  education_level text,
  preferences     jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

-- Create the profile automatically when someone signs up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, preferences)
  values (new.id,
          coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(coalesce(new.email, 'Student'), '@', 1)),
          jsonb_build_object('darkMode', false, 'studyReminders', true, 'pushNotifications', true, 'onboarded', false,
                             'subjects', '[]'::jsonb, 'studyMethods', '[]'::jsonb, 'language', 'en'))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- Study materials + AI analysis ----------
create table if not exists public.materials (
  id              bigint generated always as identity primary key,
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  filename        text not null,
  storage_path    text not null,
  file_type       text not null check (file_type in ('pdf', 'video', 'image', 'document')),
  mime_type       text not null,
  file_size       bigint not null default 0,
  subject         text,
  description     text,
  analysis_status text not null default 'not_started' check (analysis_status in ('not_started', 'extracting', 'analyzing', 'completed', 'failed')),
  analysis_error  text,
  uploaded_at     timestamptz not null default now()
);

create table if not exists public.analysis_results (
  material_id         bigint primary key references public.materials(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  title               text,
  summary             text,
  key_points          jsonb not null default '[]'::jsonb,
  definitions         jsonb not null default '[]'::jsonb,
  important_topics    jsonb not null default '[]'::jsonb,
  important_questions jsonb not null default '[]'::jsonb,
  recommendations     jsonb not null default '[]'::jsonb,
  extracted_text      text,
  was_truncated       boolean not null default false,
  created_at          timestamptz not null default now()
);

-- ---------- Notes ----------
create table if not exists public.notes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null,
  subject    text,
  content    text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Quizzes (answer keys are readable only by the backend) ----------
create table if not exists public.quizzes (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  material_id     bigint references public.materials(id) on delete set null,
  subject         text not null,
  topic           text not null,
  difficulty      text not null check (difficulty in ('easy', 'medium', 'hard')),
  total_questions int not null,
  time_limit      int not null,
  created_at      timestamptz not null default now()
);
create table if not exists public.quiz_questions (
  id       bigint generated always as identity primary key,
  quiz_id  bigint not null references public.quizzes(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  position int not null default 0,
  question text not null,
  options  jsonb not null
);
create table if not exists public.quiz_answer_keys (
  question_id    bigint primary key references public.quiz_questions(id) on delete cascade,
  correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D')),
  explanation    text
);
create table if not exists public.quiz_attempts (
  id           bigint generated always as identity primary key,
  quiz_id      bigint not null references public.quizzes(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  score        int not null,
  percentage   numeric(5, 2) not null,
  answers      jsonb not null default '{}'::jsonb,
  results      jsonb not null default '[]'::jsonb,
  time_taken   int not null default 0,
  completed_at timestamptz not null default now()
);

-- ---------- AI tutor ----------
create table if not exists public.chat_history (
  id              bigint generated always as identity primary key,
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id uuid not null,
  message         text not null,
  response        text not null,
  created_at      timestamptz not null default now()
);

-- ---------- Study time, study plan ----------
create table if not exists public.study_sessions (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  study_date date not null,
  minutes    int not null default 0,
  primary key (user_id, study_date)
);
create table if not exists public.study_tasks (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null,
  topic      text,
  minutes    int not null default 30,
  task_date  date not null,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Flashcards (spaced repetition) ----------
create table if not exists public.flashcard_decks (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  subject     text,
  tags        jsonb not null default '[]'::jsonb,
  material_id bigint references public.materials(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create table if not exists public.flashcards (
  id            bigint generated always as identity primary key,
  deck_id       bigint not null references public.flashcard_decks(id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  front         text not null,
  back          text not null,
  ease          numeric(4, 2) not null default 2.5,
  interval_days int not null default 0,
  repetitions   int not null default 0,
  due_at        timestamptz not null default now(),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------- Socials ----------
create table if not exists public.communities (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  name        text not null,
  description text not null,
  emoji       text not null default '📚'
);
create table if not exists public.community_members (
  community_id bigint not null references public.communities(id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);
create table if not exists public.posts (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  community_id bigint references public.communities(id) on delete cascade,
  content      text not null default '',
  image_path   text,
  created_at   timestamptz not null default now()
);
create table if not exists public.post_likes (
  post_id    bigint not null references public.posts(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists public.post_comments (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references public.posts(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ---------- Games ----------
create table if not exists public.game_scores (
  id        bigint generated always as identity primary key,
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  game      text not null,
  score     int not null default 0,
  won       boolean not null default false,
  played_at timestamptz not null default now()
);

-- ---------- Indexes for the backend's queries ----------
create index if not exists materials_user_uploaded_idx   on public.materials (user_id, uploaded_at desc);
create index if not exists notes_user_updated_idx        on public.notes (user_id, updated_at desc);
create index if not exists quizzes_user_created_idx      on public.quizzes (user_id, created_at desc);
create index if not exists quiz_questions_quiz_idx       on public.quiz_questions (quiz_id, position);
create index if not exists quiz_attempts_user_idx        on public.quiz_attempts (user_id, completed_at desc);
create index if not exists chat_history_user_convo_idx   on public.chat_history (user_id, conversation_id, created_at);
create index if not exists study_tasks_user_date_idx     on public.study_tasks (user_id, task_date);
create index if not exists flashcard_decks_user_idx      on public.flashcard_decks (user_id, updated_at desc);
create index if not exists flashcards_deck_due_idx       on public.flashcards (deck_id, due_at);
create index if not exists flashcards_user_idx           on public.flashcards (user_id);
create index if not exists posts_created_idx             on public.posts (created_at desc);
create index if not exists posts_community_idx           on public.posts (community_id, created_at desc);
create index if not exists posts_user_idx                on public.posts (user_id);
create index if not exists post_likes_post_idx           on public.post_likes (post_id);
create index if not exists post_comments_post_idx        on public.post_comments (post_id, created_at);
create index if not exists community_members_user_idx    on public.community_members (user_id);
create index if not exists follows_following_idx         on public.follows (following_id);
create index if not exists game_scores_user_idx          on public.game_scores (user_id, played_at desc);

-- keep updated_at fresh on edits
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at before update on public.notes for each row execute function public.set_updated_at();
drop trigger if exists flashcard_decks_set_updated_at on public.flashcard_decks;
create trigger flashcard_decks_set_updated_at before update on public.flashcard_decks for each row execute function public.set_updated_at();

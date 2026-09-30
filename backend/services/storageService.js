/**
 * Supabase Storage helpers (service role, server side only).
 * Every file lives under "<user id>/..." so ownership is visible in the path and matches the storage policies.
 */
const crypto = require('crypto');
const { admin, check } = require('../lib/supabase');
const { sanitizeFilename } = require('../middleware/upload');

function pathFor(userId, originalName) {
  return `${userId}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${sanitizeFilename(originalName).replace(/\s+/g, '_')}`;
}

async function upload(bucket, path, buffer, contentType) {
  check(await admin().storage.from(bucket).upload(path, buffer, { contentType: contentType || 'application/octet-stream', upsert: false }), 'Uploading the file');
  return path;
}

async function remove(bucket, paths) {
  const list = (Array.isArray(paths) ? paths : [paths]).filter(Boolean);
  if (list.length) await admin().storage.from(bucket).remove(list);
}

function publicUrl(bucket, path) {
  return path ? admin().storage.from(bucket).getPublicUrl(path).data.publicUrl : null;
}

async function signedUrl(bucket, path, seconds = 300) {
  return check(await admin().storage.from(bucket).createSignedUrl(path, seconds), 'Opening the file').signedUrl;
}

async function download(bucket, path) {
  const blob = check(await admin().storage.from(bucket).download(path), 'Reading the file');
  return Buffer.from(await blob.arrayBuffer());
}

module.exports = { pathFor, upload, remove, publicUrl, signedUrl, download };

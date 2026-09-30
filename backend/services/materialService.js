/**
 * Study materials (files in the private "materials" bucket) and their AI analysis.
 *
 * Analysis runs in the background:
 *   Storage file -> temp file -> extract content -> AI -> analysis_results
 * and the app polls the status (not_started -> extracting -> analyzing -> completed | failed).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { admin, check } = require('../lib/supabase');
const { AppError } = require('../middleware/errorHandler');
const { MATERIAL_TYPES, sanitizeFilename } = require('../middleware/upload');
const storage = require('./storageService');
const aiService = require('./aiService');
const extractService = require('./extractService');

function toPublic(m, hasAnalysis) {
  return {
    id: m.id,
    filename: m.filename,
    fileType: m.file_type,
    mimeType: m.mime_type,
    fileSize: Number(m.file_size),
    subject: m.subject,
    description: m.description,
    analysisStatus: m.analysis_status,
    analysisError: m.analysis_error,
    hasAnalysis: Boolean(hasAnalysis),
    uploadedAt: m.uploaded_at,
  };
}

function analysisToPublic(a) {
  if (!a) return null;
  return {
    materialId: a.material_id,
    title: a.title,
    summary: a.summary,
    keyPoints: a.key_points || [],
    definitions: a.definitions || [],
    importantTopics: a.important_topics || [],
    importantQuestions: a.important_questions || [],
    recommendations: a.recommendations || [],
    wasTruncated: Boolean(a.was_truncated),
    createdAt: a.created_at,
  };
}

async function getRow(ctx, id) {
  const m = check(await ctx.db.from('materials').select('*').eq('id', id).eq('user_id', ctx.userId).maybeSingle(), 'Loading the material');
  if (!m) throw new AppError('Material not found.', 404);
  return m;
}

async function upload(ctx, file, { subject, description }) {
  if (!file) throw new AppError('Please choose a file to upload.', 400);
  const ext = path.extname(file.originalname).toLowerCase();
  const storagePath = storage.pathFor(ctx.userId, file.originalname);
  await storage.upload('materials', storagePath, file.buffer, file.mimetype);
  try {
    const row = check(
      await ctx.db
        .from('materials')
        .insert({
          user_id: ctx.userId,
          filename: sanitizeFilename(file.originalname),
          storage_path: storagePath,
          file_type: MATERIAL_TYPES[ext].type,
          mime_type: file.mimetype,
          file_size: file.size,
          subject: subject || null,
          description: description || null,
        })
        .select()
        .single(),
      'Saving the material'
    );
    return toPublic(row, false);
  } catch (err) {
    await storage.remove('materials', storagePath); // no orphan files
    throw err;
  }
}

async function list(ctx, { type, search }) {
  let q = ctx.db.from('materials').select('*').eq('user_id', ctx.userId).order('uploaded_at', { ascending: false });
  if (type) q = q.eq('file_type', type);
  if (search) q = q.or(`filename.ilike.%${search.replace(/[%,()]/g, '')}%,subject.ilike.%${search.replace(/[%,()]/g, '')}%`);
  const [rows, analysed] = await Promise.all([
    q.then((r) => check(r, 'Loading materials')),
    ctx.db.from('analysis_results').select('material_id').eq('user_id', ctx.userId).then((r) => check(r, 'Loading analyses')),
  ]);
  const done = new Set(analysed.map((a) => String(a.material_id)));
  return rows.map((m) => toPublic(m, done.has(String(m.id))));
}

async function get(ctx, id) {
  const m = await getRow(ctx, id);
  const a = check(await ctx.db.from('analysis_results').select('*').eq('material_id', id).maybeSingle(), 'Loading the analysis');
  return { material: toPublic(m, Boolean(a)), analysis: analysisToPublic(a) };
}

async function remove(ctx, id) {
  const m = await getRow(ctx, id);
  if (['extracting', 'analyzing'].includes(m.analysis_status)) throw new AppError('This material is being analysed right now. Please wait until it finishes.', 409);
  check(await ctx.db.from('materials').delete().eq('id', id).eq('user_id', ctx.userId), 'Deleting the material');
  await storage.remove('materials', m.storage_path);
}

async function fileUrl(ctx, id) {
  const m = await getRow(ctx, id);
  return storage.signedUrl('materials', m.storage_path, 300);
}

// ---------------------------------------------------------------------------
// AI analysis (background job, service role)
// ---------------------------------------------------------------------------
const running = new Set();

async function setStatus(id, status, error = null) {
  await admin().from('materials').update({ analysis_status: status, analysis_error: error }).eq('id', id);
}

async function runAnalysis(material) {
  running.add(material.id);
  const tmp = path.join(os.tmpdir(), `mystudyai-${crypto.randomBytes(8).toString('hex')}${path.extname(material.filename).toLowerCase()}`);
  try {
    await setStatus(material.id, 'extracting');
    await fs.promises.writeFile(tmp, await storage.download('materials', material.storage_path));
    const extracted = await extractService.extract({ ...material, file_path: tmp });

    await setStatus(material.id, 'analyzing');
    const analysis = await aiService.analyzeMaterial({
      filename: material.filename,
      fileType: material.file_type,
      text: extracted.text,
      images: extracted.images,
      pdfBase64: extracted.pdfBase64,
      description: material.description,
      wasTruncated: extracted.wasTruncated,
    });
    const reusableText = extracted.text || [material.description, analysis.summary, ...analysis.keyPoints].filter(Boolean).join('\n\n');

    check(
      await admin().from('analysis_results').upsert({
        material_id: material.id,
        user_id: material.user_id,
        title: analysis.title,
        summary: analysis.summary,
        key_points: analysis.keyPoints,
        definitions: analysis.definitions,
        important_topics: analysis.importantTopics,
        important_questions: analysis.importantQuestions,
        recommendations: analysis.recommendations,
        extracted_text: reusableText,
        was_truncated: Boolean(extracted.wasTruncated),
        created_at: new Date().toISOString(),
      }),
      'Saving the analysis'
    );
    if (!material.subject && analysis.subject) await admin().from('materials').update({ subject: analysis.subject.slice(0, 100) }).eq('id', material.id);
    await setStatus(material.id, 'completed');
  } catch (err) {
    const message = err.statusCode ? err.message : 'Something went wrong while analysing this file. Please try again.';
    if (!err.statusCode) console.error('[analysis] material', material.id, err);
    await setStatus(material.id, 'failed', message.slice(0, 500)).catch(() => {});
  } finally {
    running.delete(material.id);
    fs.promises.unlink(tmp).catch(() => {});
  }
}

async function startAnalysis(ctx, id) {
  const m = await getRow(ctx, id);
  if (running.has(m.id)) return 'extracting';
  if (!aiService.isConfigured()) throw new AppError(aiService.AI_NOT_CONFIGURED_MESSAGE, 503, undefined, 'AI_NOT_CONFIGURED');
  await setStatus(m.id, 'extracting');
  runAnalysis(m); // don't wait
  return 'extracting';
}

async function analysisStatus(ctx, id) {
  const m = await getRow(ctx, id);
  return { material: toPublic(m), status: m.analysis_status, error: m.analysis_error };
}

/** On start-up, jobs that were running when the server stopped can't finish. */
async function failInterruptedJobs() {
  await admin()
    .from('materials')
    .update({ analysis_status: 'failed', analysis_error: 'Analysis was interrupted because the server restarted. Please try again.' })
    .in('analysis_status', ['extracting', 'analyzing']);
}

/** Text of an analysed material for quizzes / flashcards / tutor (only if it belongs to the student). */
async function analysedText(ctx, id) {
  const m = await getRow(ctx, id);
  const a = check(await ctx.db.from('analysis_results').select('title, summary, extracted_text').eq('material_id', id).maybeSingle(), 'Loading the analysis');
  return { material: m, analysis: a };
}

module.exports = { upload, list, get, remove, fileUrl, startAnalysis, analysisStatus, failInterruptedJobs, analysedText };

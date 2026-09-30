/**
 * AI study tools: Scan & Solve, Translate, Summarize, Essay Help, Lecture Notes.
 * They return an answer; saving it (e.g. as a note) is a separate request.
 */
const aiService = require('../services/aiService');
const { AppError } = require('../middleware/errorHandler');
const { requireString, optionalString } = require('../middleware/validate');

// POST /api/tools/solve  (multipart: image?, question?)
async function solve(req, res) {
  const text = optionalString(req.body.question, 'Question', { max: 5000 });
  if (!req.file && !text) throw new AppError('Take a photo or type a question.', 400);
  const image = req.file ? { mediaType: req.file.mimetype === 'image/jpg' ? 'image/jpeg' : req.file.mimetype, data: req.file.buffer.toString('base64') } : null;
  if (req.file && req.file.size > 4.5 * 1024 * 1024) throw new AppError('This photo is larger than 4.5 MB. Please use a smaller photo.', 400);
  const solution = await aiService.solveProblem({ text, image });
  res.json({ success: true, solution });
}

// POST /api/tools/translate  { text, from, to, explain }
async function translate(req, res) {
  const text = requireString(req.body.text, 'Text', { max: 5000 });
  const to = requireString(req.body.to, 'Target language', { max: 40 });
  const from = optionalString(req.body.from, 'Source language', { max: 40 }) || 'auto';
  const result = await aiService.translate({ text, from, to, explain: Boolean(req.body.explain) });
  res.json({ success: true, ...result });
}

// POST /api/tools/summarize  { text, length }
async function summarize(req, res) {
  const text = requireString(req.body.text, 'Text', { min: 20, max: 150000 });
  const length = ['short', 'medium', 'long'].includes(req.body.length) ? req.body.length : 'medium';
  res.json({ success: true, summary: await aiService.summarize({ text, length }) });
}

// POST /api/tools/essay  { mode: write|improve|structure, text }
async function essay(req, res) {
  const mode = ['write', 'improve', 'structure'].includes(req.body.mode) ? req.body.mode : 'write';
  const text = requireString(req.body.text, mode === 'write' ? 'Essay topic' : 'Your writing', { min: 3, max: 30000 });
  res.json({ success: true, result: await aiService.essayHelp({ mode, text }) });
}

// POST /api/tools/lecture-notes  { transcript, title }
async function lectureNotes(req, res) {
  const transcript = requireString(req.body.transcript, 'Transcript', { min: 10, max: 150000 });
  const title = optionalString(req.body.title, 'Title', { max: 200 }) || 'Lecture';
  res.json({ success: true, notes: await aiService.lectureNotes({ transcript, title }) });
}

module.exports = { solve, translate, summarize, essay, lectureNotes };

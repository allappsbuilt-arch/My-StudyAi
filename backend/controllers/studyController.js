/**
 * Study data: materials + AI analysis, notes, quizzes, AI tutor chat, progress, study plan.
 */
const { ctxOf } = require('../lib/context');
const { requireId } = require('../middleware/validate');
const materialService = require('../services/materialService');
const noteService = require('../services/noteService');
const quizService = require('../services/quizService');
const chatService = require('../services/chatService');
const progressService = require('../services/progressService');
const planService = require('../services/planService');
const { AppError } = require('../middleware/errorHandler');

const str = (v, max = 100) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

// ---------- Materials ----------
const materials = {
  upload: async (req, res) =>
    res.status(201).json({
      success: true,
      message: 'File uploaded successfully.',
      material: await materialService.upload(ctxOf(req), req.file, { subject: str(req.body.subject), description: str(req.body.description, 20000) }),
    }),
  list: async (req, res) => {
    const type = ['pdf', 'video', 'image', 'document'].includes(req.query.type) ? req.query.type : undefined;
    res.json({ success: true, materials: await materialService.list(ctxOf(req), { type, search: str(req.query.search) }) });
  },
  get: async (req, res) => res.json({ success: true, ...(await materialService.get(ctxOf(req), requireId(req.params.id))) }),
  remove: async (req, res) => {
    await materialService.remove(ctxOf(req), requireId(req.params.id));
    res.json({ success: true, message: 'Material deleted.' });
  },
  fileUrl: async (req, res) => res.json({ success: true, url: await materialService.fileUrl(ctxOf(req), requireId(req.params.id)) }),
  startAnalysis: async (req, res) => res.status(202).json({ success: true, status: await materialService.startAnalysis(ctxOf(req), requireId(req.params.id)) }),
  analysis: async (req, res) => res.json({ success: true, ...(await materialService.analysisStatus(ctxOf(req), requireId(req.params.id))) }),
};

// ---------- Notes ----------
const notes = {
  list: async (req, res) => res.json({ success: true, notes: await noteService.list(ctxOf(req), { search: str(req.query.search), subject: str(req.query.subject) }) }),
  get: async (req, res) => res.json({ success: true, note: await noteService.get(ctxOf(req), requireId(req.params.id)) }),
  create: async (req, res) => res.status(201).json({ success: true, message: 'Note created.', note: await noteService.create(ctxOf(req), req.body) }),
  update: async (req, res) => res.json({ success: true, message: 'Note updated.', note: await noteService.update(ctxOf(req), requireId(req.params.id), req.body) }),
  remove: async (req, res) => {
    await noteService.remove(ctxOf(req), requireId(req.params.id));
    res.json({ success: true, message: 'Note deleted.' });
  },
};

// ---------- Quizzes ----------
const quiz = {
  generate: async (req, res) => res.status(201).json({ success: true, message: 'Quiz generated.', quiz: await quizService.generate(ctxOf(req), req.body) }),
  get: async (req, res) => res.json({ success: true, ...(await quizService.get(ctxOf(req), requireId(req.params.id))) }),
  submit: async (req, res) => res.json({ success: true, result: await quizService.submit(ctxOf(req), requireId(req.params.id), req.body) }),
  attempt: async (req, res) => res.json({ success: true, result: await quizService.attempt(ctxOf(req), requireId(req.params.attemptId, 'attempt id')) }),
  history: async (req, res) => res.json({ success: true, ...(await quizService.history(ctxOf(req))) }),
};

// ---------- AI Tutor ----------
const chat = {
  send: async (req, res) => res.json({ success: true, ...(await chatService.chat(ctxOf(req), req.body)) }),
  list: async (req, res) => res.json({ success: true, conversations: await chatService.conversations(ctxOf(req)) }),
  get: async (req, res) => res.json({ success: true, conversationId: req.params.id, messages: await chatService.conversation(ctxOf(req), req.params.id) }),
  remove: async (req, res) => {
    await chatService.removeConversation(ctxOf(req), req.params.id);
    res.json({ success: true, message: 'Conversation deleted.' });
  },
  clear: async (req, res) => {
    await chatService.clear(ctxOf(req));
    res.json({ success: true, message: 'Chat history cleared.' });
  },
};

// ---------- Progress ----------
const progress = {
  overview: async (req, res) => res.json({ success: true, ...(await progressService.overview(ctxOf(req), { activityLimit: req.query.activityLimit })) }),
  weekly: async (req, res) => res.json({ success: true, ...(await progressService.weekly(ctxOf(req), req.query.days)) }),
  studyTime: async (req, res) => {
    const minutes = Number(req.body.minutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 15) throw new AppError('minutes must be a whole number from 1 to 15.', 400);
    await progressService.addStudyTime(ctxOf(req), minutes);
    res.json({ success: true });
  },
};

// ---------- Study plan ----------
const plan = {
  overview: async (req, res) => res.json({ success: true, ...(await planService.overview(ctxOf(req))) }),
  create: async (req, res) => res.status(201).json({ success: true, task: await planService.create(ctxOf(req), req.body) }),
  update: async (req, res) => res.json({ success: true, task: await planService.update(ctxOf(req), requireId(req.params.id), req.body) }),
  remove: async (req, res) => {
    await planService.remove(ctxOf(req), requireId(req.params.id));
    res.json({ success: true });
  },
};

module.exports = { materials, notes, quiz, chat, progress, plan };

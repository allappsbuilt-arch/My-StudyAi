/**
 * File uploads (multer, kept in memory). Files are validated here, then stored in
 * Supabase Storage by services/storageService.js - nothing is written to the server's disk.
 */
const path = require('path');
const multer = require('multer');
const config = require('../config');
const { AppError } = require('./errorHandler');

// extension -> { type stored in the database, allowed MIME types }
const MATERIAL_TYPES = {
  '.pdf': { type: 'pdf', mimes: ['application/pdf'] },
  '.mp4': { type: 'video', mimes: ['video/mp4'] },
  '.docx': { type: 'document', mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream', 'application/zip'] },
  '.txt': { type: 'document', mimes: ['text/plain', 'application/octet-stream'] },
  '.md': { type: 'document', mimes: ['text/markdown', 'text/plain', 'text/x-markdown', 'application/octet-stream'] },
  '.jpg': { type: 'image', mimes: ['image/jpeg'] },
  '.jpeg': { type: 'image', mimes: ['image/jpeg'] },
  '.png': { type: 'image', mimes: ['image/png'] },
  '.webp': { type: 'image', mimes: ['image/webp'] },
  '.gif': { type: 'image', mimes: ['image/gif'] },
};
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

/** Remove characters that are unsafe in file names and limit the length. */
function sanitizeFilename(name) {
  const base = path.basename(name || 'file');
  return base.replace(/[^\w.\- ()]+/g, '_').replace(/\s+/g, ' ').trim().slice(-150) || 'file';
}

function imageOnly(what, exts = IMAGE_EXTS) {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!exts.includes(ext) || !file.mimetype.startsWith('image/')) return cb(new AppError(`${what} must be a ${exts.map((e) => e.slice(1).toUpperCase()).join(', ')} image.`, 400));
    cb(null, true);
  };
}

const memory = multer.memoryStorage();

const uploadMaterial = multer({
  storage: memory,
  limits: { fileSize: config.upload.maxMaterialMB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const rule = MATERIAL_TYPES[ext];
    if (!rule) return cb(new AppError('Unsupported file type. Allowed: PDF, MP4, DOCX, TXT, MD, JPG, PNG, WEBP, GIF.', 400));
    if (!rule.mimes.includes(file.mimetype)) return cb(new AppError(`The file content type (${file.mimetype}) does not match its ${ext} extension.`, 400));
    cb(null, true);
  },
}).single('file');

const uploadAvatar = multer({ storage: memory, limits: { fileSize: 5 * 1024 * 1024, files: 1 }, fileFilter: imageOnly('Profile picture') }).single('avatar');
const uploadPostImage = multer({ storage: memory, limits: { fileSize: 8 * 1024 * 1024, files: 1 }, fileFilter: imageOnly('Post image', [...IMAGE_EXTS, '.gif']) }).single('image');
const uploadScanImage = multer({ storage: memory, limits: { fileSize: 8 * 1024 * 1024, files: 1 }, fileFilter: imageOnly('Photo') }).single('image');

module.exports = { uploadMaterial, uploadAvatar, uploadPostImage, uploadScanImage, MATERIAL_TYPES, sanitizeFilename };

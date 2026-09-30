/**
 * Extracts content from uploaded files so the AI can read it.
 *
 *  PDF    -> text (pdf-parse). Scanned PDFs with no text are sent to the AI as a PDF document.
 *  DOCX   -> text (mammoth)
 *  TXT/MD -> text
 *  Image  -> resized JPEG (the AI reads images directly)
 *  Video  -> 8 frames sampled evenly with ffmpeg + the student's optional description/transcript
 *
 * ffmpeg comes from the optional "ffmpeg-static" package. If it is missing,
 * images under 4.5 MB still work and videos rely on the description.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const mammoth = require('mammoth');
// Import the library file directly: pdf-parse's index.js runs a debug self-test when required.
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
const config = require('../config');
const { AppError } = require('../middleware/errorHandler');

let ffmpegPath = null;
try {
  const p = require('ffmpeg-static');
  if (p && fs.existsSync(p)) ffmpegPath = p;
} catch {
  ffmpegPath = null;
}

const MAX_RAW_IMAGE_BYTES = 4.5 * 1024 * 1024; // AI image limit is 5 MB
const MAX_PDF_DOCUMENT_BYTES = 30 * 1024 * 1024; // AI request limit is 32 MB
const VIDEO_FRAMES = 8;

const IMAGE_MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };

/** Run ffmpeg and resolve with { stdout: Buffer, stderr: string }. */
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { windowsHide: true });
    const out = [];
    let err = '';
    proc.stdout.on('data', (d) => out.push(d));
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => resolve({ code, stdout: Buffer.concat(out), stderr: err }));
  });
}

/** Resize any image to a JPEG no larger than 1568px (the AI's preferred size). */
async function imageToJpeg(filePath, seekSeconds) {
  const args = ['-hide_banner', '-loglevel', 'error'];
  if (seekSeconds !== undefined) args.push('-ss', String(seekSeconds));
  args.push('-i', filePath, '-frames:v', '1', '-vf', "scale='min(1568,iw)':-2", '-q:v', '4', '-f', 'image2', '-c:v', 'mjpeg', 'pipe:1');
  const { code, stdout } = await runFfmpeg(args);
  if (code !== 0 || !stdout.length) return null;
  return { mediaType: 'image/jpeg', data: stdout.toString('base64') };
}

async function videoDuration(filePath) {
  const { stderr } = await runFfmpeg(['-hide_banner', '-i', filePath]);
  const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

function limitText(text) {
  const clean = (text || '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length > config.ai.maxInputChars) {
    return { text: clean.slice(0, config.ai.maxInputChars), wasTruncated: true };
  }
  return { text: clean, wasTruncated: false };
}

/**
 * @param {{file_path:string, file_type:string, filename:string, file_size:number, description?:string}} material
 * @returns {Promise<{text:string, wasTruncated:boolean, images:Array, pdfBase64?:string}>}
 */
async function extract(material) {
  // file_path is stored relative to backend/uploads (e.g. "materials/123-abc.pdf")
  const filePath = path.isAbsolute(material.file_path) ? material.file_path : path.join(config.upload.dir, material.file_path);
  if (!fs.existsSync(filePath)) throw new AppError('The uploaded file could not be found on the server. Please upload it again.', 404);

  const ext = path.extname(filePath).toLowerCase();
  const result = { text: '', wasTruncated: false, images: [] };

  switch (material.file_type) {
    case 'pdf': {
      const buffer = await fs.promises.readFile(filePath);
      let text = '';
      try {
        const data = await pdfParse(buffer);
        text = data.text || '';
      } catch {
        text = '';
      }
      if (text.replace(/\s/g, '').length >= 200) {
        Object.assign(result, limitText(text));
      } else if (buffer.length <= MAX_PDF_DOCUMENT_BYTES) {
        // Scanned / image-only PDF: let the AI read the pages directly
        result.pdfBase64 = buffer.toString('base64');
      } else {
        throw new AppError('This PDF has no selectable text and is too large for the AI to read as images. Try a smaller PDF.', 422);
      }
      break;
    }

    case 'document': {
      if (ext === '.docx') {
        const { value } = await mammoth.extractRawText({ path: filePath });
        Object.assign(result, limitText(value));
      } else {
        Object.assign(result, limitText(await fs.promises.readFile(filePath, 'utf8')));
      }
      if (!result.text) throw new AppError('This document appears to be empty.', 422);
      break;
    }

    case 'image': {
      let img = null;
      if (ffmpegPath) img = await imageToJpeg(filePath);
      if (!img) {
        if (material.file_size > MAX_RAW_IMAGE_BYTES) {
          throw new AppError('This image is larger than 4.5 MB. Please upload a smaller image.', 422);
        }
        const data = (await fs.promises.readFile(filePath)).toString('base64');
        img = { mediaType: IMAGE_MIME[ext] || 'image/jpeg', data };
      }
      result.images.push(img);
      break;
    }

    case 'video': {
      if (ffmpegPath) {
        const duration = await videoDuration(filePath);
        if (duration > 0) {
          for (let i = 0; i < VIDEO_FRAMES; i++) {
            const t = ((i + 0.5) * duration) / VIDEO_FRAMES;
            const frame = await imageToJpeg(filePath, t.toFixed(2));
            if (frame) result.images.push(frame);
          }
        }
      }
      if (!result.images.length && !material.description) {
        throw new AppError(
          'Could not read frames from this video. Add a short description or transcript of the video when uploading, then try again.',
          422
        );
      }
      break;
    }

    default:
      throw new AppError('Unsupported file type.', 400);
  }

  return result;
}

module.exports = { extract, hasFfmpeg: () => Boolean(ffmpegPath) };

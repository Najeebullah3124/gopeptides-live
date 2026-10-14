import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';
import { ApiError } from '../utils/apiResponse';

const uploadDir = path.resolve(env.upload.dir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}${ext ? '' : ''}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: env.upload.maxFileSize },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return cb(ApiError.badRequest('Only image uploads are allowed (jpeg, png, webp, gif)'));
    }
    cb(null, true);
  },
});

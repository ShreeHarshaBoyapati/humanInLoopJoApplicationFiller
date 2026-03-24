import express from 'express';
import multer from 'multer';
import ResumeController from '../controllers/resume-controller.js';
import { authMiddleware } from '../middlewares/user.js';
import {
  createResumeValidation,
  updateResumeValidation,
  deleteResumeValidation,
  getResumeByIdValidation,
} from '../middlewares/resume.js';
import { asHandler } from '../types/api.js';

const router: express.Router = express.Router();

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept PDF and common document formats
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
    }
  },
});

router.post(
  '/',
  authMiddleware,
  upload.single('file'),
  createResumeValidation,
  asHandler(ResumeController.create)
);
router.put(
  '/',
  authMiddleware,
  upload.single('file'),
  updateResumeValidation,
  asHandler(ResumeController.update)
);
router.delete('/', authMiddleware, deleteResumeValidation, asHandler(ResumeController.delete));
router.get('/:id', authMiddleware, getResumeByIdValidation, asHandler(ResumeController.getById));
router.get('/', authMiddleware, asHandler(ResumeController.getAll));

export default router;

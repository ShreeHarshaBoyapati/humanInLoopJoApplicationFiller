import express from 'express';
import multer from 'multer';
import ResumeController from '../controllers/resume-controller.js';
import { authMiddleware } from '../middlewares/user.js';
import {
  createResumeValidation,
  updateResumeValidation,
  deleteResumeValidation,
  getResumeByIdValidation,
  parseFileResumeValidation,
  setActiveResumeValidation,
} from '../middlewares/resume.js';
import { asHandler } from '../types/api.js';
import type { Request, Response, NextFunction } from 'express';

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
      'application/octet-stream',
      'application/x-zip-compressed',
    ];

    const extension = file.originalname.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'doc', 'docx', 'txt'];

    if (
      allowedMimeTypes.includes(file.mimetype) ||
      (extension && allowedExtensions.includes(extension))
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
    }
  },
});

const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
      }

      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

router.post(
  '/',
  authMiddleware,
  handleUpload,
  createResumeValidation,
  asHandler(ResumeController.create)
);
router.put(
  '/',
  authMiddleware,
  handleUpload,
  updateResumeValidation,
  asHandler(ResumeController.update)
);
router.delete('/', authMiddleware, deleteResumeValidation, asHandler(ResumeController.delete));
router.post(
  '/parse-file',
  authMiddleware,
  handleUpload,
  parseFileResumeValidation,
  asHandler(ResumeController.parseFile)
);

router.get('/:id', authMiddleware, getResumeByIdValidation, asHandler(ResumeController.getById));
router.get('/', authMiddleware, asHandler(ResumeController.getAll));
router.post(
  '/set-active',
  authMiddleware,
  setActiveResumeValidation,
  asHandler(ResumeController.setActive)
);

export default router;

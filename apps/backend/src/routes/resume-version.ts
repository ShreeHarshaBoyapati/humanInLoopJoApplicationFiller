import express from 'express';
import multer from 'multer';
import ResumeVersionController from '../controllers/resume-version-controller.js';
import { authMiddleware } from '../middlewares/user.js';
import {
  getResumeVersionByIdValidation,
  createResumeVersionValidation,
  updateResumeVersionValidation,
  deleteResumeVersionValidation,
  setActiveResumeVersionValidation,
  branchResumeValidation,
  compareVersionsValidation,
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

// List all versions for a resume
router.get('/:id/versions', authMiddleware, asHandler(ResumeVersionController.getAll));

// Get a specific version
router.get(
  '/:id/versions/:versionId',
  authMiddleware,
  getResumeVersionByIdValidation,
  asHandler(ResumeVersionController.getById)
);

// View document
router.get(
  '/:id/versions/:versionId/document',
  authMiddleware,
  getResumeVersionByIdValidation,
  asHandler(ResumeVersionController.viewDocument)
);

// View parsed data
router.get(
  '/:id/versions/:versionId/parsed',
  authMiddleware,
  getResumeVersionByIdValidation,
  asHandler(ResumeVersionController.viewParsedData)
);

// Upload new version
router.post(
  '/:id/versions',
  authMiddleware,
  handleUpload,
  createResumeVersionValidation,
  asHandler(ResumeVersionController.create)
);

// Update version
router.put(
  '/:id/versions/:versionId',
  authMiddleware,
  handleUpload,
  updateResumeVersionValidation,
  asHandler(ResumeVersionController.update)
);

// Delete version
router.delete(
  '/:id/versions/:versionId',
  authMiddleware,
  deleteResumeVersionValidation,
  asHandler(ResumeVersionController.delete)
);

// Set version as active
router.post(
  '/:id/versions/:versionId/set-active',
  authMiddleware,
  setActiveResumeVersionValidation,
  asHandler(ResumeVersionController.setActive)
);

// Branch (create new resume from version)
router.post(
  '/:id/versions/:versionId/branch',
  authMiddleware,
  branchResumeValidation,
  asHandler(ResumeVersionController.branch)
);

// Compare two versions
router.post(
  '/:id/versions/compare',
  authMiddleware,
  compareVersionsValidation,
  asHandler(ResumeVersionController.compare)
);

// Parse file endpoint
router.post(
  '/versions/parse-file',
  authMiddleware,
  handleUpload,
  asHandler(ResumeVersionController.parseFile)
);

export default router;

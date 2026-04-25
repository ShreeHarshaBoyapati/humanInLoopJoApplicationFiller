import express from 'express';
import ResumeController from '../controllers/resume-controller.js';
import { authMiddleware } from '../middlewares/user.js';
import {
  createResumeValidation,
  updateResumeValidation,
  deleteResumeValidation,
  getResumeByIdValidation,
  setActiveResumeValidation,
} from '../middlewares/resume.js';
import { asHandler } from '../types/api.js';

const router: express.Router = express.Router();

// Create a new resume (metadata only, file uploads go through resume-version routes)
router.post('/', authMiddleware, createResumeValidation, asHandler(ResumeController.create));

// Update resume metadata
router.put('/', authMiddleware, updateResumeValidation, asHandler(ResumeController.update));

// Delete a resume
router.delete('/', authMiddleware, deleteResumeValidation, asHandler(ResumeController.delete));

// Get all resumes (paginated)
router.get('/', authMiddleware, asHandler(ResumeController.getPaginated));

// Get a specific resume
router.get('/:id', authMiddleware, getResumeByIdValidation, asHandler(ResumeController.getById));

// Get active resume
router.get('/active', authMiddleware, asHandler(ResumeController.getActive));

// Set active resume
router.post(
  '/set-active',
  authMiddleware,
  setActiveResumeValidation,
  asHandler(ResumeController.setActive)
);

export default router;

import express from 'express';
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

// Create a new resume (metadata only, file uploads go through resume-version routes)
router.post('/', authMiddleware, createResumeValidation, asHandler(ResumeController.create));

// Update resume metadata
router.put('/', authMiddleware, updateResumeValidation, asHandler(ResumeController.update));

// Delete a resume
router.delete('/', authMiddleware, deleteResumeValidation, asHandler(ResumeController.delete));

// Get all resumes (paginated)
router.get('/', authMiddleware, asHandler(ResumeController.getPaginated));

// Get active resume (MUST come before /:id)
router.get('/active', authMiddleware, asHandler(ResumeController.getActive));

// Get a specific resume
router.get('/:id', authMiddleware, getResumeByIdValidation, asHandler(ResumeController.getById));

export default router;

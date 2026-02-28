import express from 'express';
import JobController from '../controllers/job-controller.js';
import { authMiddleware } from '../middlewares/user.js';
import {
  createJobValidation,
  updateJobValidation,
  deleteJobValidation,
  getJobsValidation,
} from '../middlewares/job.js';
import { asHandler } from '../types/api.js';

const router: express.Router = express.Router();

router.post('/', authMiddleware, createJobValidation, asHandler(JobController.create));
router.put('/', authMiddleware, updateJobValidation, asHandler(JobController.update));
router.delete('/', authMiddleware, deleteJobValidation, asHandler(JobController.delete));
router.get('/', authMiddleware, getJobsValidation, asHandler(JobController.get));

export default router;

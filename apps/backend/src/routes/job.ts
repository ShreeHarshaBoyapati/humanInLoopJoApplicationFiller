import express from 'express';
import JobController from '../controllers/job-controller.js';
import { authMiddleware } from '../middlewares/user.js';
import {
  createJobValidation,
  updateJobValidation,
  deleteJobValidation,
  getJobsValidation,
} from '../middlewares/job.js';

const router: express.Router = express.Router();

router.post('/', authMiddleware, createJobValidation, JobController.create);
router.put('/', authMiddleware, updateJobValidation, JobController.update);
router.delete('/', authMiddleware, deleteJobValidation, JobController.delete);
router.get('/', authMiddleware, getJobsValidation, JobController.get);

export default router;

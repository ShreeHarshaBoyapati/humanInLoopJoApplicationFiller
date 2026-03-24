import express from 'express';
import user from './user.js';
import job from './job.js';
import ai from './ai.js';
import apiKey from './api-key.js';
import persona from './persona.js';
import resume from './resume.js';
const router: express.Router = express.Router();

router.use('/user', user);
router.use('/job', job);
router.use('/ai', ai);
router.use('/api-key', apiKey);
router.use('/persona', persona);
router.use('/resume', resume);

export default router;

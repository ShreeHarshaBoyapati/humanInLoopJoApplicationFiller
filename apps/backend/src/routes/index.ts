import express from 'express';
import user from './user.js';
import job from './job.js';
import ai from './ai.js';
import apiKey from './api-key.js';
import persona from './persona.js';
import resume from './resume.js';
import resumeVersion from './resume-version.js';
import result from './result.js';
import tag from './tag.js';
import event from './event.js';

const router: express.Router = express.Router();

router.use('/user', user);
router.use('/job', job);
router.use('/ai', ai);
router.use('/api-key', apiKey);
router.use('/persona', persona);
router.use('/resume', resume);
router.use('/resume', resumeVersion);
router.use('/tag', tag);
router.use('/event', event);
router.use('/', result);

export default router;

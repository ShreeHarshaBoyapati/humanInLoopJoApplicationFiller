import type { Response, AuthenticatedTypedRequest } from '../types/index.js';
import {
  ApiResponse,
  type WeeklyGoalResponse,
  type UpdateWeeklyGoalInput,
} from '@repo/shared-types';
import {
  getJobRepository,
  getUserRepository,
  getWeeklyGoalRepository,
} from '../database/repositories/index.js';
import type { StatusUpdatedAtMap } from '../database/entities/job.js';

const DEFAULT_APPLICATIONS_TARGET = 5;
const DEFAULT_INTERVIEWS_TARGET = 2;

function emptyStatusUpdatedAt(): StatusUpdatedAtMap {
  return {
    draft: null,
    applied: null,
    interview: null,
    offer: null,
    rejected: null,
  };
}

function startOfThisWeek(now: Date): Date {
  const d = new Date(now);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfNextWeek(now: Date): Date {
  const start = startOfThisWeek(now);
  const next = new Date(start);
  next.setDate(next.getDate() + 7);
  return next;
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function getOrCreateWeeklyGoal(userId: string) {
  const userRepository = getUserRepository();
  const weeklyGoalRepository = getWeeklyGoalRepository();
  let weeklyGoal = await weeklyGoalRepository.findOne({
    where: { user: { id: userId } },
    relations: ['user'],
  });
  if (!weeklyGoal) {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { weeklyGoal: null, user: null };
    }
    weeklyGoal = weeklyGoalRepository.create({
      user,
      applicationsTarget: DEFAULT_APPLICATIONS_TARGET,
      interviewsTarget: DEFAULT_INTERVIEWS_TARGET,
    });
    await weeklyGoalRepository.save(weeklyGoal);
  }
  return { weeklyGoal, user: weeklyGoal.user };
}

async function buildResponse(userId: string): Promise<WeeklyGoalResponse | null> {
  const { weeklyGoal } = await getOrCreateWeeklyGoal(userId);
  if (!weeklyGoal) return null;

  const jobRepository = getJobRepository();
  const now = new Date();
  const weekStart = startOfThisWeek(now);
  const nextWeek = startOfNextWeek(now);

  const jobs = await jobRepository.find({
    where: { user: { id: userId } },
    select: ['id', 'statusUpdatedAt'],
  });

  let applicationsDone = 0;
  let interviewsDone = 0;
  for (const job of jobs) {
    const map = (job.statusUpdatedAt as StatusUpdatedAtMap) || emptyStatusUpdatedAt();
    const appliedAt = map.applied ? new Date(map.applied) : null;
    const interviewAt = map.interview ? new Date(map.interview) : null;
    if (appliedAt && appliedAt.getTime() >= weekStart.getTime()) applicationsDone += 1;
    if (interviewAt && interviewAt.getTime() >= weekStart.getTime()) interviewsDone += 1;
  }

  return {
    applicationsTarget: weeklyGoal.applicationsTarget,
    interviewsTarget: weeklyGoal.interviewsTarget,
    applicationsDone,
    interviewsDone,
    resetsOn: formatYMD(nextWeek),
    updatedAt: weeklyGoal.updatedAt,
  };
}

class WeeklyGoalController {
  async get(req: AuthenticatedTypedRequest<null>, res: Response) {
    const userId = req.userId;
    const payload = await buildResponse(userId);
    if (!payload) {
      const data: ApiResponse = { success: false, message: 'User not found' };
      res.status(404).json(data);
      return;
    }
    const data: ApiResponse<WeeklyGoalResponse> = { success: true, data: payload };
    res.status(200).json(data);
  }

  async update(req: AuthenticatedTypedRequest<UpdateWeeklyGoalInput>, res: Response) {
    const userId = req.userId;
    const { applicationsTarget, interviewsTarget } = req.body;

    const { weeklyGoal } = await getOrCreateWeeklyGoal(userId);
    if (!weeklyGoal) {
      const data: ApiResponse = { success: false, message: 'User not found' };
      res.status(404).json(data);
      return;
    }

    weeklyGoal.applicationsTarget = applicationsTarget;
    weeklyGoal.interviewsTarget = interviewsTarget;
    await getWeeklyGoalRepository().save(weeklyGoal);

    const payload = await buildResponse(userId);
    if (!payload) {
      const data: ApiResponse = { success: false, message: 'User not found' };
      res.status(404).json(data);
      return;
    }
    const data: ApiResponse<WeeklyGoalResponse> = { success: true, data: payload };
    res.status(200).json(data);
  }
}

export default new WeeklyGoalController();

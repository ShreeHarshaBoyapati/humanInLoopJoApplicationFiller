import type { Response, AuthenticatedTypedRequest } from '../types/index.js';
import { DataSource, In } from 'typeorm';
import initializeDataSource from '../database/data-source.js';
import {
  getJobRepository,
  getUserRepository,
  getPersonaRepository,
  getResumeVersionRepository,
  getApiKeyRepository,
  getEventRepository,
  getWeeklyGoalRepository,
} from '../database/repositories/index.js';
import Job from '../database/entities/job.js';
import {
  ApiResponse,
  type JobStatus,
  type OnboardingResponse,
  type OnboardingStep,
  type DashboardResponse,
  type DashboardRange,
  type DashboardStatusMetric,
  type DashboardFunnelStage,
  type DashboardTopAtsMatch,
  type DashboardUpcomingEvent,
  type DashboardPersonaBreakdown,
} from '@repo/shared-types';
import type { DashboardQuery } from '../middlewares/dashboard.js';
import type { StatusUpdatedAtMap } from '../database/entities/job.js';

const STATUSES: JobStatus[] = ['draft', 'applied', 'interview', 'offer', 'rejected'];

const FUNNEL_ORDER: JobStatus[] = ['draft', 'applied', 'interview', 'offer'];

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

function rangeStart(range: DashboardRange, now: Date): Date | null {
  if (range === 'all') return null;
  if (range === 'month') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return d;
  }
  const d = new Date(now);
  d.setMonth(d.getMonth() - 3);
  return d;
}

class DashboardController {
  async onboarding(req: AuthenticatedTypedRequest<null>, res: Response) {
    const userId = req.userId;
    const userRepository = getUserRepository();
    const jobRepository = getJobRepository();
    const apiKeyRepository = getApiKeyRepository();
    const eventRepository = getEventRepository();
    const resumeVersionRepository = getResumeVersionRepository();

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      const data: ApiResponse = { success: false, message: 'User not found' };
      res.status(404).json(data);
      return;
    }

    if (user.onboardingComplete) {
      const completedPayload: OnboardingResponse = {
        isComplete: true,
        completedSteps: 4,
        totalSteps: 4,
        steps: [
          { key: 'aiProvider', severity: 'required', isComplete: true },
          { key: 'personaAndResume', severity: 'required', isComplete: true },
          { key: 'firstJob', severity: 'recommended', isComplete: true },
          { key: 'eventOrTag', severity: 'optional', isComplete: true },
        ],
      };
      const completedData: ApiResponse<OnboardingResponse> = {
        success: true,
        data: completedPayload,
      };
      res.status(200).json(completedData);
      return;
    }

    const hasAiKey =
      (await apiKeyRepository.count({ where: { user: { id: userId }, active: true } })) > 0;

    const personaAndResumeComplete =
      (await resumeVersionRepository.count({
        where: {
          isDeleted: false,
          resume: { isDeleted: false, persona: { isDeleted: false, user: { id: userId } } },
        },
      })) > 0;

    const firstJobComplete = (await jobRepository.count({ where: { user: { id: userId } } })) > 0;

    const eventCount = await eventRepository.count({ where: { user: { id: userId } } });
    const eventOrTagComplete = eventCount > 0;

    const steps: OnboardingStep[] = [
      { key: 'aiProvider', severity: 'required', isComplete: hasAiKey },
      { key: 'personaAndResume', severity: 'required', isComplete: personaAndResumeComplete },
      { key: 'firstJob', severity: 'recommended', isComplete: firstJobComplete },
      { key: 'eventOrTag', severity: 'optional', isComplete: eventOrTagComplete },
    ];

    const completedSteps = steps.filter((s) => s.isComplete).length;
    const isComplete = completedSteps === steps.length;

    if (isComplete) {
      user.onboardingComplete = true;
      await userRepository.save(user);
    }

    const payload: OnboardingResponse = {
      isComplete,
      completedSteps,
      totalSteps: 4,
      steps,
    };

    const data: ApiResponse<OnboardingResponse> = { success: true, data: payload };
    res.status(200).json(data);
  }

  async skipOnboarding(req: AuthenticatedTypedRequest<null>, res: Response) {
    const userId = req.userId;
    const userRepository = getUserRepository();
    const jobRepository = getJobRepository();
    const apiKeyRepository = getApiKeyRepository();
    const resumeVersionRepository = getResumeVersionRepository();

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      const data: ApiResponse = { success: false, message: 'User not found' };
      res.status(404).json(data);
      return;
    }

    const hasAiKey =
      (await apiKeyRepository.count({ where: { user: { id: userId }, active: true } })) > 0;

    const personaAndResumeComplete =
      (await resumeVersionRepository.count({
        where: {
          isDeleted: false,
          resume: { isDeleted: false, persona: { isDeleted: false, user: { id: userId } } },
        },
      })) > 0;

    const firstJobComplete = (await jobRepository.count({ where: { user: { id: userId } } })) > 0;

    if (!(hasAiKey && personaAndResumeComplete && firstJobComplete)) {
      const data: ApiResponse = {
        success: false,
        message: 'All required onboarding steps must be completed first',
      };
      res.status(400).json(data);
      return;
    }

    if (!user.onboardingComplete) {
      user.onboardingComplete = true;
      await userRepository.save(user);
    }

    const data: ApiResponse<{ onboardingComplete: true }> = {
      success: true,
      data: { onboardingComplete: true },
    };
    res.status(200).json(data);
  }

  async get(req: AuthenticatedTypedRequest<null>, res: Response) {
    const userId = req.userId;
    const { range, topAtsLimit, eventsLimit } = (
      req as AuthenticatedTypedRequest<null> & { parsedQuery: DashboardQuery }
    ).parsedQuery;

    const ds: DataSource = initializeDataSource();
    const userRepository = getUserRepository();
    const jobRepository = getJobRepository();
    const apiKeyRepository = getApiKeyRepository();
    const eventRepository = getEventRepository();
    const personaRepository = getPersonaRepository();
    const weeklyGoalRepository = getWeeklyGoalRepository();

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      const data: ApiResponse = { success: false, message: 'User not found' };
      res.status(404).json(data);
      return;
    }

    const now = new Date();
    const weekStart = startOfThisWeek(now);
    const nextWeek = startOfNextWeek(now);

    // 1. Metrics (by status)
    const jobRepoForUser = ds
      .getRepository(jobRepository.target)
      .createQueryBuilder('job')
      .leftJoin('job.user', 'user')
      .where('user.id = :userId', { userId })
      .select(['job.id', 'job.status', 'job.statusUpdatedAt', 'job.createdAt']);

    if (range !== 'all') {
      const since = rangeStart(range, now);
      if (since) {
        jobRepoForUser.andWhere('job.createdAt >= :since', { since });
      }
    }

    const jobs = await jobRepoForUser.getMany();

    const byStatus: Record<JobStatus, number> = {
      draft: 0,
      applied: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    };
    const deltaThisWeek: Record<JobStatus, number> = {
      draft: 0,
      applied: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    };
    for (const job of jobs) {
      const status = job.status as JobStatus;
      if (byStatus[status] !== undefined) byStatus[status] += 1;
      const map = (job.statusUpdatedAt as StatusUpdatedAtMap) || emptyStatusUpdatedAt();
      for (const s of STATUSES) {
        const ts = map[s];
        if (ts && new Date(ts).getTime() >= weekStart.getTime()) {
          deltaThisWeek[s] += 1;
        }
      }
    }
    const total = jobs.length;

    const rejectedReached: Record<'interview' | 'offer', number> = { interview: 0, offer: 0 };
    for (const job of jobs) {
      if ((job.status as JobStatus) !== 'rejected') continue;
      const map = (job.statusUpdatedAt as StatusUpdatedAtMap) || emptyStatusUpdatedAt();
      if (map.interview) rejectedReached.interview += 1;
    }

    const metricsByStatus: DashboardStatusMetric[] = STATUSES.map((status) => ({
      status,
      count: byStatus[status],
      deltaThisWeek: deltaThisWeek[status],
    }));

    // 2. Funnel
    const stageCount: Record<JobStatus, number> = {
      draft: byStatus.draft,
      applied: byStatus.applied,
      interview: byStatus.interview + rejectedReached.interview,
      offer: byStatus.offer,
      rejected: byStatus.rejected,
    };
    let cumulative = 0;
    cumulative += byStatus.rejected;
    for (const s of [...FUNNEL_ORDER].reverse()) {
      cumulative += byStatus[s];
      stageCount[s] = cumulative;
    }
    stageCount.offer = byStatus.offer;

    const baseline = stageCount.draft;
    const percent = (count: number) =>
      baseline === 0 ? 0 : Math.round((count / baseline) * 1000) / 10;

    const stages: DashboardFunnelStage[] = FUNNEL_ORDER.map((status, idx) => {
      const count = stageCount[status];
      const prev = idx === 0 ? null : FUNNEL_ORDER[idx - 1];
      const prevCount = prev ? stageCount[prev] : null;
      const dropoffFromPrevPercent =
        prevCount === null
          ? null
          : prevCount === 0
            ? 0
            : Math.round(((prevCount - count) / prevCount) * 1000) / 10;
      return {
        status,
        count,
        percent: percent(count),
        dropoffFromPrevPercent,
      };
    });

    let biggestDropoff: DashboardResponse['funnel']['biggestDropoff'] = null;
    for (let i = 1; i < FUNNEL_ORDER.length; i += 1) {
      const prevStatus = FUNNEL_ORDER[i - 1] as JobStatus;
      const curStatus = FUNNEL_ORDER[i] as JobStatus;
      const cur = stages.find((s) => s.status === curStatus);
      if (!cur || cur.dropoffFromPrevPercent === null) continue;
      if (cur.dropoffFromPrevPercent <= 0) continue;
      if (!biggestDropoff || cur.dropoffFromPrevPercent > biggestDropoff.percent) {
        biggestDropoff = {
          from: prevStatus,
          to: curStatus,
          percent: cur.dropoffFromPrevPercent,
        };
      }
    }

    const overallSuccessRate: DashboardResponse['funnel']['overallSuccessRate'] = {
      percent: percent(stageCount.offer),
      offers: stageCount.offer,
      bookmarked: stageCount.draft,
    };

    const funnel: DashboardResponse['funnel'] = {
      range,
      stages,
      biggestDropoff,
      overallSuccessRate,
    };

    // 3. Weekly goal
    let weeklyGoalRow = await weeklyGoalRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!weeklyGoalRow) {
      weeklyGoalRow = weeklyGoalRepository.create({
        user,
        applicationsTarget: 5,
        interviewsTarget: 2,
      });
      await weeklyGoalRepository.save(weeklyGoalRow);
    }

    const weeklyGoal: DashboardResponse['weeklyGoal'] = {
      applications: { done: deltaThisWeek.applied, target: weeklyGoalRow.applicationsTarget },
      interviews: { done: deltaThisWeek.interview, target: weeklyGoalRow.interviewsTarget },
      resetsOn: formatYMD(nextWeek),
    };

    // 4. Top ATS matches — max score per job, joined to persona via resume
    const topAtsQuery = await ds
      .createQueryBuilder()
      .from((sub) => {
        return sub
          .select('result.jobId', 'jobId')
          .addSelect('MAX(result.score)', 'maxScore')
          .from('results', 'result')
          .innerJoin(Job, 'job', 'job.id = result."jobId"')
          .where('job.userId = :userId', { userId })
          .groupBy('result.jobId');
      }, 't')
      .setParameter('userId', userId)
      .getRawMany<{ jobId: string; maxScore: string | number }>();

    let topAtsMatches: DashboardTopAtsMatch[] = [];
    if (topAtsQuery.length > 0) {
      const jobIds = topAtsQuery.map((r) => r.jobId);
      const jobsFull = await jobRepository.find({
        where: { id: In(jobIds), user: { id: userId } },
        relations: ['persona'],
      });
      const jobMap = new Map(jobsFull.map((j) => [j.id, j]));
      topAtsMatches = topAtsQuery
        .map((row) => {
          const job = jobMap.get(row.jobId);
          if (!job) return null;
          return {
            jobId: job.id,
            title: job.title,
            companyName: job.companyName,
            score: Number(row.maxScore),
            personaName: job.persona?.title ?? 'Unassigned',
          };
        })
        .filter((x): x is DashboardTopAtsMatch => x !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, topAtsLimit);
    }

    // 5. Upcoming events (next N, isCompleted=false, date >= today)
    const today = formatYMD(now);
    const upcomingRaw = await eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.tag', 'tag')
      .leftJoinAndSelect('event.job', 'job')
      .where('event.userId = :userId', { userId })
      .andWhere('event.isCompleted = :completed', { completed: false })
      .andWhere('event.date >= :today', { today })
      .orderBy('event.date', 'ASC')
      .addOrderBy('event.time', 'ASC')
      .limit(eventsLimit)
      .getMany();

    const upcomingEvents: DashboardUpcomingEvent[] = upcomingRaw.map((e) => ({
      id: e.id,
      title: e.title,
      jobName: e.job?.title ?? null,
      companyName: e.job?.companyName ?? null,
      date: e.date,
      time: e.time ?? null,
      type: e.tag?.name ?? 'task',
      tagColor: e.tag?.color ?? '#888888',
      jobId: e.jobId ?? null,
    }));

    // 6. Persona breakdown
    const personaCounts = await jobRepository
      .createQueryBuilder('job')
      .leftJoin('job.user', 'user')
      .select('job.personaId', 'personaId')
      .addSelect('COUNT(*)', 'count')
      .where('user.id = :userId', { userId })
      .groupBy('job.personaId')
      .getRawMany<{ personaId: string | null; count: string }>();

    const totalJobsForBreakdown = personaCounts.reduce((acc, r) => acc + Number(r.count), 0);
    let personaBreakdown: DashboardPersonaBreakdown[] = [];
    if (totalJobsForBreakdown > 0) {
      const nonNullPersonaIds = personaCounts
        .map((r) => r.personaId)
        .filter((id): id is string => Boolean(id));
      const personaRows = nonNullPersonaIds.length
        ? await personaRepository.find({ where: { id: In(nonNullPersonaIds) } })
        : [];
      const personaMap = new Map(personaRows.map((p) => [p.id, p.title]));

      personaBreakdown = personaCounts
        .map((row) => {
          const count = Number(row.count);
          const id = row.personaId;
          const name = id ? (personaMap.get(id) ?? 'Unassigned') : 'Unassigned';
          return {
            personaId: id,
            name,
            jobsCount: count,
            percentage: Math.round((count / totalJobsForBreakdown) * 1000) / 10,
          };
        })
        .sort((a, b) => b.jobsCount - a.jobsCount);
    }

    // 7. hasAiKey
    const hasAiKey =
      (await apiKeyRepository.count({ where: { user: { id: userId }, active: true } })) > 0;

    const payload: DashboardResponse = {
      user: { id: user.id, email: user.email },
      hasAiKey,
      metrics: { total, byStatus: metricsByStatus },
      funnel,
      weeklyGoal,
      topAtsMatches,
      upcomingEvents,
      personaBreakdown,
    };

    const data: ApiResponse<DashboardResponse> = { success: true, data: payload };
    res.status(200).json(data);
  }
}

export default new DashboardController();

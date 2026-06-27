import type { Response, AuthenticatedTypedRequest } from '../types/index.js';
import {
  getEventRepository,
  getTagRepository,
  getJobRepository,
} from '../database/repositories/index.js';
import {
  ApiResponse,
  STATUS_PSEUDO_COLOR,
  type EventDotsResponse,
  type Job,
  type JobStatus,
  type Event,
  type EventList,
  type StatusPseudoEvent,
} from '@repo/shared-types';
import * as wsHub from '../realtime/ws-hub.js';
import { eventToPublic } from '../realtime/payload-mappers.js';
import type JobEntity from '../database/entities/job.js';
import type {
  CreateEventInput,
  UpdateEventInput,
  DeleteEventInput,
  GetEventsInfer,
} from '../middlewares/event.js';

const RESERVED_TASK_TAG = 'task';
const COMPLETED_TASK_CAP = 100;
const COMPLETED_TASK_CLEANUP_BATCH = 10;

function toUtcDateString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

class EventController {
  private async enforceCompletedTaskCap(userId: string): Promise<void> {
    const eventRepository = getEventRepository();
    const tagRepository = getTagRepository();

    const taskTag = await tagRepository.findOne({
      where: { name: RESERVED_TASK_TAG, user: { id: userId } },
    });
    if (!taskTag) return;

    const count = await eventRepository.count({
      where: { user: { id: userId }, tag: { id: taskTag.id }, isCompleted: true },
    });
    if (count <= COMPLETED_TASK_CAP) return;

    const oldest = await eventRepository.find({
      where: { user: { id: userId }, tag: { id: taskTag.id }, isCompleted: true },
      order: { completedAt: 'ASC' },
      take: COMPLETED_TASK_CLEANUP_BATCH,
    });
    if (oldest.length === 0) return;
    await eventRepository.delete(oldest.map((e) => e.id));
  }

  private computeStatusPseudoEvents(job: JobEntity | Job): StatusPseudoEvent[] {
    const map = (job as JobEntity).statusUpdatedAt as Record<JobStatus, Date | null> | undefined;
    if (!map) return [];

    const statuses: JobStatus[] = ['draft', 'applied', 'interview', 'offer', 'rejected'];

    const events: StatusPseudoEvent[] = [];
    for (const status of statuses) {
      const ts = map[status];
      if (!ts) continue;
      const tsDate = ts instanceof Date ? ts : new Date(ts);
      events.push({ date: toUtcDateString(tsDate), status, color: STATUS_PSEUDO_COLOR });
    }

    return events.sort((a, b) => a.date.localeCompare(b.date));
  }

  create = async (req: AuthenticatedTypedRequest<CreateEventInput>, res: Response) => {
    const eventRepository = getEventRepository();
    const tagRepository = getTagRepository();
    const jobRepository = getJobRepository();

    const userId = req.userId;
    const { title, description, date, time, tagId, jobId } = req.body;

    const tag = await tagRepository.findOne({ where: { id: tagId, user: { id: userId } } });
    if (!tag) {
      res.status(400).json({ success: false, message: 'Tag not found' });
      return;
    }

    if (tag.name === RESERVED_TASK_TAG) {
      if (jobId !== null) {
        res
          .status(400)
          .json({ success: false, message: 'Task tag events must not be linked to a job' });
        return;
      }
    } else {
      if (!jobId) {
        res
          .status(400)
          .json({ success: false, message: 'jobId is required for non-task tag events' });
        return;
      }
      const job = await jobRepository.findOne({ where: { id: jobId, user: { id: userId } } });
      if (!job) {
        res.status(400).json({ success: false, message: 'Job not found or not authorized' });
        return;
      }
    }

    const event = eventRepository.create({
      title,
      description: description ?? '',
      date,
      time: time ?? null,
      tagId: tag.id,
      jobId: tag.name === RESERVED_TASK_TAG ? null : jobId,
      isCompleted: false,
      completedAt: null,
      user: { id: userId } as never,
    });
    await eventRepository.save(event);

    wsHub.emit(
      userId,
      'event',
      'create',
      event.id,
      { id: event.id, date: event.date, tagId: event.tagId, jobId: event.jobId },
      undefined,
      req.realtimeClientId
    );

    const data: ApiResponse<{ id: string }> = {
      success: true,
      message: 'Event created successfully',
      data: { id: event.id },
    };
    res.status(201).json(data);
  };

  update = async (req: AuthenticatedTypedRequest<UpdateEventInput>, res: Response) => {
    const eventRepository = getEventRepository();
    const tagRepository = getTagRepository();
    const jobRepository = getJobRepository();

    const userId = req.userId;
    const { id, isCompleted, ...rest } = req.body;

    const event = await eventRepository.findOne({ where: { id, user: { id: userId } } });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    const { title, description, date, time, tagId, jobId } = rest as Partial<CreateEventInput>;

    const nextTagId: string | null | undefined = tagId === undefined ? undefined : tagId;
    let nextJobId: string | null | undefined = jobId === undefined ? undefined : jobId;

    if (nextTagId !== undefined) {
      const tag = await tagRepository.findOne({
        where: { id: nextTagId, user: { id: userId } },
      });
      if (!tag) {
        res.status(400).json({ success: false, message: 'Tag not found' });
        return;
      }
      if (tag.name === RESERVED_TASK_TAG) {
        nextJobId = null;
      }
    }

    if (nextJobId !== undefined && nextJobId !== null) {
      const job = await jobRepository.findOne({
        where: { id: nextJobId, user: { id: userId } },
      });
      if (!job) {
        res.status(400).json({ success: false, message: 'Job not found or not authorized' });
        return;
      }
    }

    if (nextTagId !== undefined && nextJobId === undefined) {
      const tag = await tagRepository.findOne({
        where: { id: nextTagId, user: { id: userId } },
      });
      if (tag && tag.name !== RESERVED_TASK_TAG && !event.jobId) {
        res
          .status(400)
          .json({ success: false, message: 'jobId is required for non-task tag events' });
        return;
      }
    }

    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (date !== undefined) event.date = date;
    if (time !== undefined) event.time = time;
    if (nextTagId !== undefined) event.tagId = nextTagId;
    if (nextJobId !== undefined) event.jobId = nextJobId;

    if (isCompleted !== undefined) {
      event.isCompleted = isCompleted;
      event.completedAt = isCompleted ? new Date() : null;
    }

    await eventRepository.save(event);
    await this.enforceCompletedTaskCap(userId);

    wsHub.emit(
      userId,
      'event',
      'update',
      event.id,
      eventToPublic(event),
      undefined,
      req.realtimeClientId
    );

    const data: ApiResponse<Event> = {
      success: true,
      data: this.toPublicEvent(event),
    };
    res.status(200).json(data);
  };

  delete = async (req: AuthenticatedTypedRequest<DeleteEventInput>, res: Response) => {
    const eventRepository = getEventRepository();

    const userId = req.userId;
    const { id } = req.body;

    const event = await eventRepository.findOne({ where: { id, user: { id: userId } } });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    const eventCopy = { ...event };
    await eventRepository.remove(event);
    await this.enforceCompletedTaskCap(userId);

    wsHub.emit(
      userId,
      'event',
      'delete',
      eventCopy.id,
      { id: eventCopy.id, date: eventCopy.date, tagId: eventCopy.tagId, jobId: eventCopy.jobId },
      undefined,
      req.realtimeClientId
    );

    res.status(200).json({ success: true, message: 'Event deleted successfully' });
  };

  get = async (
    req: AuthenticatedTypedRequest<null> & { parsedQuery: GetEventsInfer },
    res: Response
  ) => {
    const eventRepository = getEventRepository();
    const jobRepository = getJobRepository();

    const userId = req.userId;
    const params = (req as unknown as { parsedQuery: GetEventsInfer }).parsedQuery;
    const { mode = 'list', page, limit, from, to, tagId, jobId, includeCompleted, select } = params;

    if (mode === 'dots') {
      const data = await this.getDots({
        eventRepository,
        userId,
        from,
        to,
        tagId,
        jobId,
        includeCompleted,
      });
      res.status(200).json({ success: true, data } as ApiResponse<EventDotsResponse>);
      return;
    }

    const defaultFields = [
      'id',
      'title',
      'description',
      'date',
      'time',
      'tagId',
      'jobId',
      'isCompleted',
      'completedAt',
      'createdAt',
      'updatedAt',
    ];
    const fieldsToSelect = select && select.length > 0 ? select : defaultFields;

    const qb = eventRepository
      .createQueryBuilder('event')
      .select(fieldsToSelect.map((f) => `event.${f}`))
      .leftJoin('event.user', 'user')
      .where('user.id = :userId', { userId });

    if (from) qb.andWhere('event.date >= :from', { from });
    if (to) qb.andWhere('event.date <= :to', { to });
    if (tagId) qb.andWhere('event.tagId = :tagId', { tagId });
    if (jobId) qb.andWhere('event.jobId = :jobId', { jobId });
    if (!includeCompleted) qb.andWhere('event.isCompleted = :isCompleted', { isCompleted: false });

    qb.addOrderBy('event.isCompleted', 'ASC')
      .addOrderBy('event.date', 'ASC')
      .addOrderBy('event.time', 'ASC', 'NULLS FIRST')
      .addOrderBy('event.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [events, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    const responseData: EventList = {
      events: events.map((e) => this.toPublicEvent(e)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    if (jobId) {
      const job = await jobRepository.findOne({ where: { id: jobId, user: { id: userId } } });
      if (job) {
        const pseudoEvents = this.computeStatusPseudoEvents(job);
        responseData.statusPseudoEvents = pseudoEvents.filter((sp) => {
          if (from && sp.date < from) return false;
          if (to && sp.date > to) return false;
          return true;
        });
      }
    }

    res.status(200).json({ success: true, data: responseData } as ApiResponse<EventList>);
  };

  private async getDots(args: {
    eventRepository: ReturnType<typeof getEventRepository>;
    userId: string;
    from?: string;
    to?: string;
    tagId?: string;
    jobId?: string;
    includeCompleted: boolean;
  }): Promise<EventDotsResponse> {
    const { eventRepository, userId, from, to, tagId, jobId, includeCompleted } = args;

    const qb = eventRepository
      .createQueryBuilder('event')
      .select(['event.date AS date', 'event.tagId AS "tagId"', 'tag.color AS color'])
      .innerJoin('event.tag', 'tag')
      .leftJoin('event.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('event.tagId IS NOT NULL');

    if (from) qb.andWhere('event.date >= :from', { from });
    if (to) qb.andWhere('event.date <= :to', { to });
    if (tagId) qb.andWhere('event.tagId = :tagId', { tagId });
    if (!includeCompleted) {
      qb.andWhere('event.isCompleted = :isCompleted', { isCompleted: false });
    }

    if (jobId) {
      qb.andWhere('event.jobId = :jobId', { jobId });
    } else if (tagId) {
      qb.andWhere('event.tagId = :tagId', { tagId });
    }

    const rows: Array<{ date: string; color: string }> = await qb.getRawMany();

    const colorsByDate = new Map<string, Set<string>>();
    for (const { date, color } of rows) {
      const set = colorsByDate.get(date) ?? new Set<string>();
      set.add(color);
      colorsByDate.set(date, set);
    }

    if (jobId) {
      const jobRepository = getJobRepository();
      const job = await jobRepository.findOne({ where: { id: jobId, user: { id: userId } } });
      if (job) {
        for (const sp of this.computeStatusPseudoEvents(job)) {
          const set = colorsByDate.get(sp.date) ?? new Set<string>();
          set.add(sp.color);
          colorsByDate.set(sp.date, set);
        }
      }
    }

    const dates: EventDotsResponse['dates'] = Array.from(colorsByDate.entries())
      .map(([date, colors]) => ({ date, tagColor: Array.from(colors) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { dates };
  }

  private toPublicEvent(e: {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string | null;
    tagId: string | null;
    jobId: string | null;
    isCompleted: boolean;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Event {
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date,
      time: e.time,
      tagId: e.tagId,
      jobId: e.jobId,
      isCompleted: e.isCompleted,
      completedAt: e.completedAt,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }
}

export default new EventController();

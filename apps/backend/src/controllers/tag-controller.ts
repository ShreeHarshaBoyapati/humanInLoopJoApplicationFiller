import crypto from 'crypto';
import type { Response, AuthenticatedTypedRequest } from '../types/index.js';
import { getTagRepository, getUserRepository } from '../database/repositories/index.js';
import { ApiResponse, STATUS_PSEUDO_COLOR, type Tag, type TagList } from '@repo/shared-types';
import * as wsHub from '../realtime/ws-hub.js';
import { tagToPublic } from '../realtime/payload-mappers.js';
import type {
  CreateTagInput,
  UpdateTagInput,
  DeleteTagInput,
  GetTagsInfer,
} from '../middlewares/tag.js';

const RESERVED_TASK_TAG = 'task';

function hashColor(input: string): string {
  const normalized = input.trim().toLowerCase();
  const hex = crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 6);
  return `#${hex}`;
}

async function generateUniqueColor(
  tagRepository: ReturnType<typeof getTagRepository>,
  userId: string,
  name: string
): Promise<string> {
  let color = hashColor(name);

  if (color.toLowerCase() === STATUS_PSEUDO_COLOR.toLowerCase()) {
    color = hashColor(`${name}:reserved`);
  }

  const existingColors = new Set(
    (await tagRepository.find({ where: { user: { id: userId } }, select: ['color'] })).map((t) =>
      t.color.toLowerCase()
    )
  );

  let attempt = 0;
  while (existingColors.has(color.toLowerCase()) && attempt < 100) {
    attempt += 1;
    color = hashColor(`${name}:${attempt}`);
  }

  return color;
}

class TagController {
  async create(req: AuthenticatedTypedRequest<CreateTagInput>, res: Response) {
    const tagRepository = getTagRepository();
    const userRepository = getUserRepository();

    const userId = req.userId;
    const { name } = req.body;
    const trimmedName = name.trim();

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const existing = await tagRepository.findOne({
      where: { name: trimmedName, user: { id: userId } },
    });
    if (existing) {
      const data: ApiResponse = {
        success: false,
        message: 'A tag with this name already exists',
      };
      res.status(409).json(data);
      return;
    }

    const color = await generateUniqueColor(tagRepository, userId, trimmedName);
    const tag = tagRepository.create({
      name: trimmedName,
      color,
      user,
    });
    await tagRepository.save(tag);

    wsHub.emit(userId, 'tag', 'create', tag.id, tagToPublic(tag), undefined, req.realtimeClientId);

    const data: ApiResponse<{ id: string }> = {
      success: true,
      message: 'Tag created successfully',
      data: { id: tag.id },
    };
    res.status(201).json(data);
  }

  async update(req: AuthenticatedTypedRequest<UpdateTagInput>, res: Response) {
    const tagRepository = getTagRepository();

    const userId = req.userId;
    const { id, name } = req.body;

    const tag = await tagRepository.findOne({
      where: { id, user: { id: userId } },
    });
    if (!tag) {
      res.status(404).json({ success: false, message: 'Tag not found' });
      return;
    }

    if (name !== undefined) {
      const trimmed = name.trim();
      if (trimmed !== tag.name) {
        const conflict = await tagRepository.findOne({
          where: { name: trimmed, user: { id: userId } },
        });
        if (conflict) {
          res.status(409).json({ success: false, message: 'A tag with this name already exists' });
          return;
        }
        tag.name = trimmed;
      }
    }

    await tagRepository.save(tag);

    wsHub.emit(userId, 'tag', 'update', tag.id, tagToPublic(tag), undefined, req.realtimeClientId);

    const data: ApiResponse<Tag> = {
      success: true,
      data: {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      },
    };
    res.status(200).json(data);
  }

  async delete(req: AuthenticatedTypedRequest<DeleteTagInput>, res: Response) {
    const tagRepository = getTagRepository();

    const userId = req.userId;
    const { id } = req.body;

    const tag = await tagRepository.findOne({
      where: { id, user: { id: userId } },
    });
    if (!tag) {
      res.status(404).json({ success: false, message: 'Tag not found' });
      return;
    }

    if (tag.name === RESERVED_TASK_TAG) {
      res.status(400).json({ success: false, message: 'Reserved tag cannot be deleted' });
      return;
    }

    await tagRepository.delete({ id });

    wsHub.emit(userId, 'tag', 'delete', tag.id, undefined, undefined, req.realtimeClientId);

    res.status(200).json({ success: true, message: 'Tag deleted successfully' });
  }

  async get(req: AuthenticatedTypedRequest<null> & { parsedQuery: GetTagsInfer }, res: Response) {
    const tagRepository = getTagRepository();

    const userId = req.userId;
    const { search, limit } = (req as unknown as { parsedQuery: GetTagsInfer }).parsedQuery;

    const qb = tagRepository
      .createQueryBuilder('tag')
      .leftJoin('tag.user', 'user')
      .where('user.id = :userId', { userId });

    if (search) {
      qb.andWhere('LOWER(tag.name) LIKE :search', { search: `%${search.toLowerCase()}%` });
    }

    qb.orderBy('tag.name', 'ASC').take(limit);

    const tags = await qb.getMany();

    const data: ApiResponse<TagList> = {
      success: true,
      data: {
        tags: tags.map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
      },
    };
    res.status(200).json(data);
  }
}

export default new TagController();

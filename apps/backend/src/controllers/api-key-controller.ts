import type { Response, AuthenticatedTypedRequest } from '../types/index.js';
import type {
  ApiResponse,
  TestConnectionResponse,
  ModelOption,
  PaginatedApiKeysResponse,
} from '@repo/shared-types';
import { getApiKeyRepository, getUserRepository } from '../database/repositories/index.js';
import { encryptText, decryptText } from '../utils/encryption.js';
import {
  UpdateApiKeyInputType,
  TestConnectionInputType,
  GetApiKeysQueryType,
} from '../middlewares/api-key.js';
import ApiKey from '../database/entities/api-key.js';
import { ProviderName } from '../services/ai/registry.js';
import { transitDecrypt, transitEncrypt } from '@repo/utils';
import { ApiKeyService } from '../services/api-key-service.js';
import { apiKeyToPublic } from '../realtime/payload-mappers.js';
import * as wsHub from '../realtime/ws-hub.js';
import logger from '../utils/logger.js';

const TRANSIT_SECRET = process.env.TRANSIT_SECRET ?? 'jfp-default-transit-secret-change-in-prod';

class ApiKeyController {
  /**
   * Upsert an API Key for the authenticated user and provider
   * POST /api/api-key
   * Body: { providerName: 'gemini' | 'anthropic', apiKey: string }
   */
  async upsertApiKey(req: AuthenticatedTypedRequest<UpdateApiKeyInputType>, res: Response) {
    const userId = req.userId;
    const { id, providerName, credentials, model } = req.body;
    const apiKeyRepository = getApiKeyRepository();
    const userRepository = getUserRepository();

    try {
      const user = await userRepository.findOne({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const encryptedCredentials: Record<string, string> = {};
      for (const [key, value] of Object.entries(credentials)) {
        if (value) {
          if (
            key.toLowerCase().includes('key') ||
            key.toLowerCase().includes('secret') ||
            key.toLowerCase().includes('token')
          ) {
            let plainText = value as string;
            try {
              if (plainText.includes(':')) {
                const decryptedStr = await transitDecrypt(plainText, TRANSIT_SECRET);
                if (decryptedStr) plainText = decryptedStr;
              }
            } catch {
              // treat as plaintext
            }
            encryptedCredentials[key] = encryptText(plainText);
          } else {
            encryptedCredentials[key] = value as string;
          }
        }
      }

      let existingKey = undefined;

      if (id) {
        existingKey = await apiKeyRepository.findOne({
          where: { id, user: { id: userId } },
        });
      } else {
        const existingKeysForModel = await apiKeyRepository.find({
          where: { user: { id: userId }, provider: providerName as ProviderName, model },
        });
        existingKey = existingKeysForModel.find(
          (k) => JSON.stringify(k.credentials) === JSON.stringify(encryptedCredentials)
        );
      }

      if (existingKey) {
        existingKey.credentials = encryptedCredentials;
        existingKey.model = model;
        await apiKeyRepository.save(existingKey);
        try {
          const payload = await apiKeyToPublic(existingKey);
          wsHub.emit(
            userId,
            'apiKey',
            'update',
            existingKey.id,
            payload,
            undefined,
            req.realtimeClientId
          );
        } catch (emitErr) {
          logger.error({ err: emitErr, id: existingKey.id }, 'apiKey update emit failed');
        }
      } else {
        const userKeyCount = await apiKeyRepository.count({
          where: { user: { id: userId } },
        });

        const newKey = new ApiKey();
        newKey.provider = providerName as ProviderName;
        newKey.credentials = encryptedCredentials;
        newKey.model = model;
        newKey.user = user;
        newKey.active = userKeyCount === 0;
        await apiKeyRepository.save(newKey);
        try {
          const payload = await apiKeyToPublic(newKey);
          wsHub.emit(
            userId,
            'apiKey',
            'create',
            newKey.id,
            payload,
            undefined,
            req.realtimeClientId
          );
        } catch (emitErr) {
          logger.error({ err: emitErr, id: newKey.id }, 'apiKey create emit failed');
        }
      }

      const response: ApiResponse = {
        success: true,
        message: `API Key for ${providerName} saved successfully`,
      };
      res.status(200).json(response);
    } catch (error: unknown) {
      console.error('Error saving API Key:', error);
      const response: ApiResponse = { success: false, message: 'Failed to save API Key' };
      res.status(500).json(response);
    }
  }

  /**
   * Get configured API Key providers for the authenticated user
   * GET /api/api-key
   */
  async getApiKeys(
    req: AuthenticatedTypedRequest<null> & { parsedQuery: GetApiKeysQueryType },
    res: Response
  ) {
    const userId = req.userId!;
    const { page, limit, search } = req.parsedQuery;
    const apiKeyRepository = getApiKeyRepository();

    try {
      const queryBuilder = apiKeyRepository
        .createQueryBuilder('key')
        .where('key.userId = :userId', { userId })
        .orderBy('key.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      if (search) {
        queryBuilder.andWhere('LOWER(CAST(key.provider AS TEXT)) LIKE LOWER(:search)', {
          search: `%${search}%`,
        });
      }

      const [keys, total] = await queryBuilder.getManyAndCount();

      const data = await Promise.all(
        keys.map(async (k) => {
          const { credentials, ...rest } = k;
          const safeCredentials: Record<string, string> = {};
          if (credentials) {
            for (const [key, value] of Object.entries(credentials)) {
              try {
                if (
                  key.toLowerCase().includes('key') ||
                  key.toLowerCase().includes('secret') ||
                  key.toLowerCase().includes('token')
                ) {
                  let plainText = value;
                  try {
                    plainText = decryptText(value);
                  } catch {
                    // Fallback for old/transit-only strings
                  }

                  let isAlreadyTransit = false;
                  try {
                    if (plainText.includes(':')) {
                      await transitDecrypt(plainText, TRANSIT_SECRET);
                      isAlreadyTransit = true;
                    }
                  } catch {
                    // Fallback for new strings
                  }

                  if (isAlreadyTransit) {
                    safeCredentials[key] = plainText;
                  } else {
                    safeCredentials[key] = await transitEncrypt(plainText, TRANSIT_SECRET);
                  }
                } else {
                  safeCredentials[key] = value;
                }
              } catch {
                safeCredentials[key] = value;
              }
            }
          }
          return { ...rest, credentials: safeCredentials };
        })
      );

      const totalPages = Math.ceil(total / limit);
      const response: ApiResponse<PaginatedApiKeysResponse> = {
        success: true,
        data: {
          items: data,
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
      res.status(200).json(response);
    } catch (error: unknown) {
      console.error('Error fetching API Keys:', error);
      const response: ApiResponse = { success: false, message: 'Failed to fetch API Keys' };
      res.status(500).json(response);
    }
  }

  /**
   * Test if an API key is valid for the given provider and return available models.
   * POST /api/api-key/test-connection
   * Body: { providerName: 'gemini', apiKey: string (transit-encrypted) }
   */
  async testConnection(req: AuthenticatedTypedRequest<TestConnectionInputType>, res: Response) {
    const { providerName, credentials } = req.body;
    try {
      const decryptedCredentials: Record<string, string> = { ...credentials };
      if (decryptedCredentials.apiKey) {
        decryptedCredentials.apiKey = await transitDecrypt(
          decryptedCredentials.apiKey,
          TRANSIT_SECRET
        );
      }
      const models = await ApiKeyService.testConnection(providerName, decryptedCredentials);
      const response: ApiResponse<TestConnectionResponse> = {
        success: true,
        message: 'Connection successful',
        data: { models: models as ModelOption[] },
      };
      res.status(200).json(response);
    } catch (error: unknown) {
      let message = 'Connection failed';
      if (error instanceof Error) {
        message = error.message;
        logger.error({ error: error }, 'Connection failed');
      }
      const response: ApiResponse = { success: false, message };
      res.status(200).json(response);
    }
  }

  /**
   * Delete an API Key for the authenticated user
   * DELETE /api/api-key/:id
   */
  async deleteApiKey(req: AuthenticatedTypedRequest<null>, res: Response) {
    const userId = req.userId!;
    const id = req.params.id as string;
    const apiKeyRepository = getApiKeyRepository();

    try {
      const key = await apiKeyRepository.findOne({
        where: { id, user: { id: userId } },
      });

      if (!key) {
        const response: ApiResponse = { success: false, message: 'Provider not found' };
        res.status(404).json(response);
        return;
      }

      await apiKeyRepository.remove(key);

      try {
        wsHub.emit(userId, 'apiKey', 'delete', id, undefined, undefined, req.realtimeClientId);
      } catch (emitErr) {
        logger.error({ err: emitErr, id }, 'apiKey delete emit failed');
      }

      const response: ApiResponse = { success: true, message: 'Provider deleted successfully' };
      res.status(200).json(response);
    } catch (error: unknown) {
      console.error('Error deleting API Key:', error);
      const response: ApiResponse = { success: false, message: 'Failed to delete Provider' };
      res.status(500).json(response);
    }
  }

  async selectApiKey(req: AuthenticatedTypedRequest<null>, res: Response) {
    const userId = req.userId!;
    const id = req.params.id as string;
    const apiKeyRepository = getApiKeyRepository();

    try {
      const keys = await apiKeyRepository.find({
        where: { user: { id: userId } },
      });

      const targetKey = keys.find((obj) => obj.id === id);
      if (!targetKey) {
        const response: ApiResponse = { success: false, message: 'Provider not found' };
        res.status(404).json(response);
        return;
      }

      const previousActiveId = keys.find((obj) => obj.active && obj.id !== id)?.id;

      keys.forEach((obj) => {
        obj.active = obj.id === id;
      });

      await apiKeyRepository.save(keys);

      try {
        const payload = await apiKeyToPublic(targetKey);
        const related = previousActiveId ? [{ id: previousActiveId, active: false }] : undefined;
        wsHub.emit(
          userId,
          'apiKey',
          'setActive',
          targetKey.id,
          payload,
          related,
          req.realtimeClientId
        );
      } catch (emitErr) {
        logger.error({ err: emitErr, id: targetKey.id }, 'apiKey setActive emit failed');
      }

      const response: ApiResponse = { success: true, message: 'Provider selected successfully' };
      res.status(200).json(response);
    } catch (error: unknown) {
      console.error('Error selecting API Key:', error);
      const response: ApiResponse = { success: false, message: 'Failed to select Provider' };
      res.status(500).json(response);
    }
  }
}

export default new ApiKeyController();

import { GetJobParams, Job, JobPublic } from './job';
import { GetResumeParams } from './resume';
import {
  GetResumeVersionsParams,
  SetActiveVersionParams,
  GetVersionParsedDataParams,
} from './resume-version';
import type { StoredAuth } from './auth-types';
import type { ResourceChangedEvent } from './realtime';

/**
 * Chrome extension message contracts.
 * Discriminated union on the `action` field — ensures type-safe
 * message passing between the popup/content-script and the background worker.
 *
 * Add new actions here as the extension grows (e.g. job-related actions).
 */
export type ExtensionMessage =
  | { action: 'CHECK_AUTH' }
  | { action: 'CHECK_AUTH_WITH_TIMESTAMP' }
  | { action: 'SEND_CODE'; payload: { email: string } }
  | { action: 'VERIFY_CODE'; payload: { email: string; code: string } }
  | { action: 'LOGIN'; payload: { email: string; password: string } }
  | { action: 'GOOGLE_LOGIN_INTERACTIVE' }
  | { action: 'LOGOUT' }
  | { action: 'CREATE_JOB'; payload: Omit<Job, 'id'> }
  | { action: 'UPDATE_JOB'; payload: Job }
  | { action: 'DELETE_JOB'; payload: JobPublic & { requestId?: string } }
  | { action: 'CANCEL_DELETE_JOB'; payload: { requestId: string } }
  | { action: 'GET_JOBS'; payload: GetJobParams }
  | { action: 'OPEN_SIDE_PANEL' }
  | { action: 'LOGOUT_TRIGGERED'; payload?: { message?: string } }
  | {
      action: 'TEST_CONNECTION';
      payload: { providerName: string; credentials: Record<string, string> };
    }
  | {
      action: 'SAVE_PROVIDER';
      payload: {
        id?: string;
        providerName: string;
        credentials: Record<string, string>;
        model: string;
      };
    }
  | { action: 'GET_CONFIGURED_PROVIDERS' }
  | { action: 'DELETE_PROVIDER'; payload: { id: string } }
  | { action: 'DECRYPT_API_KEY'; payload: { encryptedKey: string } }
  | { action: 'SELECT_PROVIDER'; payload: { id: string } }
  | {
      action: 'GET_PERSONAS';
      payload?: { page?: number; limit?: number; search?: string };
    }
  | { action: 'GET_CURRENT_USER' }
  | {
      action: 'GET_RESUMES';
      payload?: GetResumeParams & { page?: number; limit?: number; search?: string };
    }
  | {
      action: 'ANALYZE_RESUME';
      payload: { jobId: string; resumeVersionId: string; requestId?: string };
    }
  | { action: 'CANCEL_ANALYZE_RESUME'; payload: { requestId: string } }
  | { action: 'GET_RESUME_VERSIONS'; payload?: GetResumeVersionsParams }
  | { action: 'SET_ACTIVE_VERSION'; payload: SetActiveVersionParams }
  | { action: 'GET_VERSION_PARSED_DATA'; payload: GetVersionParsedDataParams }
  | { action: 'GET_ACTIVE_SELECTION' }
  | { action: 'SYNC_AUTH_FROM_WEB'; payload: StoredAuth }
  | { action: 'AUTH_STATE_CHANGED'; payload: StoredAuth | null }
  | { action: 'AUTH_STORAGE_SET'; payload: StoredAuth }
  | { action: 'AUTH_STORAGE_GET' }
  | { action: 'AUTH_STORAGE_REMOVE' }
  | { action: 'DASHBOARD_FETCH_ONBOARDING' }
  | { action: 'DASHBOARD_FETCH_SUMMARY'; payload?: { range?: 'month' | 'threeMonths' | 'all' } }
  | { action: 'RESOURCE_CHANGED'; payload: ResourceChangedEvent };

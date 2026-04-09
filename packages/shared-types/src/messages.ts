import { GetJobParams, Job, JobPublic } from './job';
import {
  GetResumeParams,
  CreateResumeParams,
  UpdateResumeParams,
  DeleteResumeParams,
  GetResumeByIdParams,
  SetActiveResumeParams,
  FileDataPayload,
} from './resume';
import type { StoredAuth } from './auth-types';

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
  | { action: 'LOGIN'; payload: { email: string; password: string } }
  | { action: 'NewUser'; payload: { email: string; password: string } }
  | { action: 'LOGOUT' }
  | { action: 'CREATE_JOB'; payload: Omit<Job, 'id'> }
  | { action: 'UPDATE_JOB'; payload: Job }
  | { action: 'DELETE_JOB'; payload: JobPublic }
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
  | { action: 'CREATE_PERSONA'; payload: { title: string; keywords?: string[] } }
  | { action: 'UPDATE_PERSONA'; payload: { id: string; title?: string; keywords?: string[] } }
  | { action: 'DELETE_PERSONA'; payload: { id: string } }
  | { action: 'GET_ACTIVE_PERSONA' }
  | { action: 'GET_PERSONAS' }
  | { action: 'SELECT_PERSONA'; payload: { id: string } }
  | { action: 'GET_CURRENT_USER' }
  | { action: 'GET_RESUMES'; payload?: GetResumeParams }
  | { action: 'GET_ACTIVE_RESUME'; payload?: { personaId: string } }
  | { action: 'CREATE_RESUME'; payload: CreateResumeParams }
  | { action: 'UPDATE_RESUME'; payload: UpdateResumeParams }
  | { action: 'DELETE_RESUME'; payload: DeleteResumeParams }
  | { action: 'GET_RESUME_BY_ID'; payload: GetResumeByIdParams }
  | { action: 'PARSE_FILE_RESUME'; payload: { file: FileDataPayload } }
  | { action: 'ANALYZE_RESUME'; payload: { jobId: string; resumeId: string } }
  | { action: 'SET_ACTIVE_RESUME'; payload: SetActiveResumeParams }
  | { action: 'GET_PARSED_RESUME' }
  | { action: 'SYNC_AUTH_FROM_WEB'; payload: StoredAuth }
  | { action: 'AUTH_STATE_CHANGED'; payload: StoredAuth | null };

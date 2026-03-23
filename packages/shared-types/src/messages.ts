import { GetJobParams, Job, JobPublic } from './job';

/**
 * Chrome extension message contracts.
 * Discriminated union on the `action` field — ensures type-safe
 * message passing between the popup/content-script and the background worker.
 *
 * Add new actions here as the extension grows (e.g. job-related actions).
 */
export type ExtensionMessage =
  | { action: 'CHECK_AUTH' }
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
  | { action: 'DELETE_PROVIDER'; payload: { id: string } };

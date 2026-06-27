/**
 * API Key related types - shared between backend and extension.
 */

/**
 * API key data returned to the client (credentials are sanitized)
 */
export interface ApiKeyData {
  id: string;
  provider: string;
  model: string | null;
  active: boolean;
  credentials: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Model option returned from AI providers
 */
export interface ModelOption {
  label: string;
  value: string;
}

/**
 * Models returned from test connection
 */
export interface TestConnectionResponse {
  models: ModelOption[];
}

export interface PaginatedApiKeysResponse {
  items: ApiKeyData[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

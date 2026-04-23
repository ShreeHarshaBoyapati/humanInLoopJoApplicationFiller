/**
 * Public persona shape — mirrors the backend Persona entity without relations.
 * Used in API responses for persona CRUD operations.
 */
export interface Persona {
  id: string;
  title: string;
  keywords: string[];
  active: boolean;
  resumesCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonaPublic {
  id: string;
}

export interface PersonaList {
  personas: Persona[];
  total: number;
}

export interface CreatePersonaInput {
  title: string;
  keywords?: string[];
}

export interface UpdatePersonaInput {
  id: string;
  title?: string;
  keywords?: string[];
}

export interface DeletePersonaInput {
  id: string;
}

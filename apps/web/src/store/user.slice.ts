import { type StateCreator } from 'zustand';

export interface UserState {
  id: string | null;
  email: string | null;
}

export interface UserActions {
  setUser: (user: Partial<UserState>) => void;
  clearUser: () => void;
}

export type UserSlice = UserState & UserActions;

export const createUserSlice: StateCreator<UserSlice, [], [], UserSlice> = (set) => ({
  id: null,
  email: null,
  setUser: (user) => set({ id: user.id, email: user.email }),
  clearUser: () => set({ id: null, email: null }),
});

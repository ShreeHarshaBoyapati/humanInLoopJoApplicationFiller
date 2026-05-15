import { create, type StateCreator } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { createUserSlice, type UserSlice } from './user.slice';
import { createSnackbarSlice, type SnackbarSlice } from './snackbar.slice';

export type StoreState = UserSlice & SnackbarSlice;

const loggerMiddleware =
  <T extends object>(config: StateCreator<T>): StateCreator<T> =>
  (set, get, store) =>
    config(
      (state) => {
        console.log('[Zustand] Dispatching:', state);
        set(state);
        console.log('[Zustand] New state:', get());
      },
      get,
      store
    );

const createRootSlice: StateCreator<StoreState> = (...args) => ({
  ...createUserSlice(...args),
  ...createSnackbarSlice(...args),
});

export const createStore = () => {
  return create<StoreState>()(
    persist(devtools(loggerMiddleware(createRootSlice), { name: 'zustand-store' }), {
      name: 'jfp-storage',
    })
  );
};

export const useStore = createStore();

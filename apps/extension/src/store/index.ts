import { create, type StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createSnackbarSlice, type SnackbarSlice } from './snackbar.slice';

export type StoreState = SnackbarSlice;

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
  ...createSnackbarSlice(...args),
});

export const createStore = () => {
  return create<StoreState>()(
    devtools(loggerMiddleware(createRootSlice), { name: 'zustand-store' })
  );
};

export const useStore = createStore();

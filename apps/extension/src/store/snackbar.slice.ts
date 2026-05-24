import { type StateCreator } from 'zustand';

export type SnackbarSeverity = 'success' | 'warning' | 'error' | 'info';

export interface SnackbarState {
  snackbar: {
    open: boolean;
    message: string;
    header?: string;
    severity: SnackbarSeverity;
    autoHideDuration: number | null;
  };
}

export interface SnackbarActions {
  showSnackbar: (
    message: string,
    options?: {
      header?: string;
      severity?: SnackbarSeverity;
      autoHideDuration?: number | null;
    }
  ) => void;
  hideSnackbar: () => void;
}

export type SnackbarSlice = SnackbarState & SnackbarActions;

export const createSnackbarSlice: StateCreator<SnackbarSlice, [], [], SnackbarSlice> = (set) => ({
  snackbar: {
    open: false,
    message: '',
    header: undefined,
    severity: 'success',
    autoHideDuration: 400000,
  },
  showSnackbar: (message, options = {}) => {
    set({
      snackbar: {
        open: true,
        message,
        header: options.header,
        severity: options.severity || 'success',
        autoHideDuration: options.autoHideDuration ?? 400000,
      },
    });
  },
  hideSnackbar: () => {
    set((state) => ({
      snackbar: {
        ...state.snackbar,
        open: false,
      },
    }));
  },
});

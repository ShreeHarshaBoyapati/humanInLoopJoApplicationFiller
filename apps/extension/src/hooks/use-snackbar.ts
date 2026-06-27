import { useCallback } from 'react';
import { useStore } from '../store';
import type { SnackbarSeverity } from '../store/snackbar.slice';

export const useSnackbar = () => {
  const snackbar = useStore((state) => state.snackbar);
  const showSnackbar = useStore((state) => state.showSnackbar);
  const hideSnackbar = useStore((state) => state.hideSnackbar);

  const handleShowSnackbar = useCallback(
    (
      message: string,
      options?: {
        header?: string;
        severity?: SnackbarSeverity;
        autoHideDuration?: number | null;
      }
    ) => {
      showSnackbar(message, options);
    },
    [showSnackbar]
  );

  return {
    snackbar,
    showSnackbar: handleShowSnackbar,
    hideSnackbar,
  };
};

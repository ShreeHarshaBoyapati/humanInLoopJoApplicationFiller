import { EnhancedSnackbar } from '@repo/ui';
import { useSnackbar } from '../hooks/use-snackbar';

export const SnackbarContainer = () => {
  const { snackbar, hideSnackbar } = useSnackbar();

  return (
    <EnhancedSnackbar
      open={snackbar.open}
      message={snackbar.message}
      header={snackbar.header}
      severity={snackbar.severity}
      autoHideDuration={snackbar.autoHideDuration}
      onClose={hideSnackbar}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    />
  );
};

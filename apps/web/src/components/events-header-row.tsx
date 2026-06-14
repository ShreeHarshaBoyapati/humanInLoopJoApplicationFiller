import AddIcon from '@mui/icons-material/Add';
import { EnhancedButton } from '@repo/ui';
import styles from './style/events-header-row.module.css';

interface EventsHeaderRowProps {
  onAddClick: () => void;
}

export function EventsHeaderRow({ onAddClick }: EventsHeaderRowProps) {
  return (
    <div className={styles.container}>
      <span className={styles.title}>Events</span>
      <EnhancedButton
        label="Add Event"
        colorTheme="secondary"
        size="small"
        onClick={onAddClick}
        customProps={{ props: { sx: { width: 'fit-content', maxWidth: 'fit-content' } } }}
        startIcon={<AddIcon sx={{ fontSize: '1rem' }} />}
      />
    </div>
  );
}

export default EventsHeaderRow;

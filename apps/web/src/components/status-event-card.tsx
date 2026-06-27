import type { StatusPseudoEvent } from '@repo/shared-types';
import { formatDateDDMMYYYY } from '../utils/date';
import styles from './style/status-event-card.module.css';

interface StatusEventCardProps {
  statusEvent: StatusPseudoEvent;
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function StatusEventCard({ statusEvent }: StatusEventCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.body}>
        <span className={styles.title}>
          Status changed to:{' '}
          <span className={styles.status}>{formatStatus(statusEvent.status)}</span>
        </span>
        <span className={styles.meta}>{formatDateDDMMYYYY(statusEvent.date)}</span>
      </div>
    </div>
  );
}

export default StatusEventCard;

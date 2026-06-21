/**
 * Dashboard greeting bar.
 * Shows a time-of-day greeting, today's date, today's event count, and a shortcut to open the extension.
 */

import { EnhancedButton } from '@repo/ui';
import { getDisplayName, getTimeOfDayGreeting } from '../../utils/dashboard.ts';
import styles from './style/dashboard-greeting-bar.module.css';

interface DashboardGreetingBarProps {
  email: string;
  eventsToday: number;
  onOpenExtension: () => void;
}

export const DashboardGreetingBar = ({
  email,
  eventsToday,
  onOpenExtension,
}: DashboardGreetingBarProps) => {
  const displayName = getDisplayName(email);
  const greeting = getTimeOfDayGreeting();
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className={styles.bar}>
      <div className={styles.greetingBlock}>
        <h1 className={styles.greeting}>
          {greeting}, {displayName}
        </h1>
        <p className={styles.meta}>
          {today} · {eventsToday} event{eventsToday === 1 ? '' : 's'} today
        </p>
      </div>
      <EnhancedButton
        label="Open extension"
        colorTheme="secondary"
        onClick={onOpenExtension}
        size="small"
      />
    </div>
  );
};

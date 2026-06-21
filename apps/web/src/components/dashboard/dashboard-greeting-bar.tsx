/**
 * Dashboard greeting bar.
 * Shows a time-of-day greeting, today's date, and today's event count.
 */

import { getDisplayName, getTimeOfDayGreeting } from '../../utils/dashboard.ts';
import styles from './style/dashboard-greeting-bar.module.css';

interface DashboardGreetingBarProps {
  email: string;
  eventsToday: number;
}

export const DashboardGreetingBar = ({ email, eventsToday }: DashboardGreetingBarProps) => {
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
    </div>
  );
};

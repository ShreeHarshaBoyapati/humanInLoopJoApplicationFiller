/**
 * Weekly goal card.
 * Shows progress bars for applications and interviews with an edit trigger.
 */

import type { DashboardWeeklyGoal as WeeklyGoalData } from '@repo/shared-types';
import { EnhancedButton } from '@repo/ui';
import styles from './style/dashboard-weekly-goal.module.css';

interface DashboardWeeklyGoalProps {
  weeklyGoal: WeeklyGoalData;
  isEditing: boolean;
  onEditToggle: () => void;
  children: React.ReactNode;
}

export const DashboardWeeklyGoal = ({
  weeklyGoal,
  isEditing,
  onEditToggle,
  children,
}: DashboardWeeklyGoalProps) => {
  const applicationsPercent = Math.min(
    100,
    Math.round((weeklyGoal.applications.done / weeklyGoal.applications.target) * 100)
  );
  const interviewsPercent = Math.min(
    100,
    Math.round((weeklyGoal.interviews.done / weeklyGoal.interviews.target) * 100)
  );

  const applicationsRemaining = Math.max(
    0,
    weeklyGoal.applications.target - weeklyGoal.applications.done
  );
  const interviewsRemaining = Math.max(
    0,
    weeklyGoal.interviews.target - weeklyGoal.interviews.done
  );

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Weekly goal</span>
        <span className={styles.subtitle}>resets Monday</span>
      </div>

      {isEditing ? (
        children
      ) : (
        <div className={styles.goal}>
          <GoalRow
            label="Applications"
            done={weeklyGoal.applications.done}
            target={weeklyGoal.applications.target}
            percent={applicationsPercent}
            remaining={applicationsRemaining}
          />
          <GoalRow
            label="Interviews"
            done={weeklyGoal.interviews.done}
            target={weeklyGoal.interviews.target}
            percent={interviewsPercent}
            remaining={interviewsRemaining}
          />
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.currentGoal}>
          {weeklyGoal.applications.target} apps · {weeklyGoal.interviews.target} interviews / week
        </span>
        <EnhancedButton
          label={isEditing ? 'Cancel' : 'Edit goal'}
          colorTheme="tertiary"
          size="medium"
          onClick={onEditToggle}
        />
      </div>
    </div>
  );
};

interface GoalRowProps {
  label: string;
  done: number;
  target: number;
  percent: number;
  remaining: number;
}

const GoalRow = ({ label, done, target, percent, remaining }: GoalRowProps) => {
  return (
    <div className={styles.goalRow}>
      <div className={styles.goalHeader}>
        <span className={styles.goalLabel}>{label}</span>
        <span className={styles.goalCount}>
          {done} / {target}
        </span>
      </div>
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{ '--goal-percent': `${percent}` } as React.CSSProperties}
        />
      </div>
      <p className={styles.goalNote}>
        {remaining === 0 ? 'Goal hit for this week 🎉' : `${remaining} more to hit your target`}
      </p>
    </div>
  );
};

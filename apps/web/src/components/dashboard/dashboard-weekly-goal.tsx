/**
 * Web wrapper for the shared DashboardWeeklyGoal widget.
 * Adds the in-place editor and "Edit goal" / "Cancel" toggle while reusing
 * the shared read-only progress display from @repo/ui.
 */

import { useState } from 'react';
import { DashboardWeeklyGoal as SharedWeeklyGoal, EnhancedButton } from '@repo/ui';
import type { DashboardWeeklyGoal as WeeklyGoalData } from '@repo/shared-types';
import { WeeklyGoalEditor } from './weekly-goal-editor.tsx';
import styles from './style/dashboard-weekly-goal.module.css';

interface DashboardWeeklyGoalProps {
  weeklyGoal: WeeklyGoalData;
}

export const DashboardWeeklyGoal = ({ weeklyGoal }: DashboardWeeklyGoalProps) => {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div className={styles.editorWrapper}>
        <WeeklyGoalEditor
          applicationsTarget={weeklyGoal.applications.target}
          interviewsTarget={weeklyGoal.interviews.target}
          onSaved={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <SharedWeeklyGoal weeklyGoal={weeklyGoal} />
      <div className={styles.editRow}>
        <EnhancedButton
          label="Edit goal"
          colorTheme="tertiary"
          size="medium"
          onClick={() => setIsEditing(true)}
        />
      </div>
    </div>
  );
};

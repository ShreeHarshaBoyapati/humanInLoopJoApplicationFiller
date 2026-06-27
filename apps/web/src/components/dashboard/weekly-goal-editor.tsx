/**
 * Weekly goal inline editor.
 * Lets the user update weekly application and interview targets.
 */

import { useState } from 'react';
import { EnhancedButton, EnhancedTextField } from '@repo/ui';
import { useUpdateWeeklyGoal } from '../../hooks/use-weekly-goal.ts';
import styles from './style/weekly-goal-editor.module.css';

interface WeeklyGoalEditorProps {
  applicationsTarget: number;
  interviewsTarget: number;
  onSaved: () => void;
  onCancel: () => void;
}

export const WeeklyGoalEditor = ({
  applicationsTarget,
  interviewsTarget,
  onSaved,
  onCancel,
}: WeeklyGoalEditorProps) => {
  const [applications, setApplications] = useState(String(applicationsTarget));
  const [interviews, setInterviews] = useState(String(interviewsTarget));
  const update = useUpdateWeeklyGoal();

  const handleSave = () => {
    const apps = Math.max(1, parseInt(applications, 10) || 1);
    const ints = Math.max(1, parseInt(interviews, 10) || 1);

    update.mutate(
      { applicationsTarget: apps, interviewsTarget: ints },
      {
        onSuccess: () => {
          onSaved();
        },
      }
    );
  };

  return (
    <div className={styles.editor}>
      <div className={styles.row}>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Applications per week</label>
          <EnhancedTextField
            value={applications}
            onChange={(e) => setApplications(e.target.value)}
            type="number"
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Interviews per week</label>
          <EnhancedTextField
            value={interviews}
            onChange={(e) => setInterviews(e.target.value)}
            type="number"
          />
        </div>
      </div>
      <div className={styles.actions}>
        <EnhancedButton label="Cancel" colorTheme="secondary" onClick={onCancel} size="medium" />
        <EnhancedButton
          label="Save"
          colorTheme="primary"
          onClick={handleSave}
          disabled={update.isPending}
          size="medium"
        />
      </div>
    </div>
  );
};

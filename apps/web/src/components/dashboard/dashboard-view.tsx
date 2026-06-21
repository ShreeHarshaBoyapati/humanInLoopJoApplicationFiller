/**
 * Full dashboard view orchestrator.
 * Fetches the dashboard summary and renders the greeting bar, optional AI-key banner,
 * status metrics, pipeline funnel, weekly goal, top ATS matches, upcoming events,
 * and persona breakdown.
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { DashboardRange } from '@repo/shared-types';
import { useStore } from '../../store/index.ts';
import { useDashboard } from '../../hooks/use-dashboard.ts';
import { DashboardGreetingBar } from './dashboard-greeting-bar.tsx';
import { DashboardStatusMetrics } from './dashboard-status-metrics.tsx';
import { DashboardPipelineFunnel } from './dashboard-pipeline-funnel.tsx';
import { DashboardWeeklyGoal } from './dashboard-weekly-goal.tsx';
import { WeeklyGoalEditor } from './weekly-goal-editor.tsx';
import { DashboardTopAtsMatches } from './dashboard-top-ats-matches.tsx';
import { DashboardUpcomingEvents } from './dashboard-upcoming-events.tsx';
import { DashboardPersonaBreakdown } from './dashboard-persona-breakdown.tsx';
import sharedStyles from './style/dashboard.module.css';
import styleConstants from '@repo/ui/constants/style-constants.js';

export const DashboardView = () => {
  const email = useStore((state: { email: string | null }) => state.email);
  const navigate = useNavigate();
  const [range, setRange] = useState<DashboardRange>('month');
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  const { data: dashboard, isLoading } = useDashboard({ range });

  if (isLoading || !dashboard) {
    return (
      <div
        className={sharedStyles.card}
        style={{
          color: styleConstants.white700,
          textAlign: 'center',
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        Loading dashboard…
      </div>
    );
  }

  const eventsToday = dashboard.upcomingEvents.filter(
    (event: { date: string }) => event.date === new Date().toISOString().split('T')[0]
  ).length;

  return (
    <div className={sharedStyles.page}>
      <DashboardGreetingBar email={email ?? ''} eventsToday={eventsToday} />

      <DashboardStatusMetrics
        metrics={dashboard.metrics}
        onStatusClick={(status) => navigate({ to: '/job-tracker', search: { status } })}
      />

      <DashboardPipelineFunnel funnel={dashboard.funnel} range={range} onRangeChange={setRange} />

      <div className={sharedStyles.twoColumn}>
        <DashboardWeeklyGoal
          weeklyGoal={dashboard.weeklyGoal}
          isEditing={isEditingGoal}
          onEditToggle={() => setIsEditingGoal((prev) => !prev)}
        >
          <WeeklyGoalEditor
            applicationsTarget={dashboard.weeklyGoal.applications.target}
            interviewsTarget={dashboard.weeklyGoal.interviews.target}
            onSaved={() => setIsEditingGoal(false)}
            onCancel={() => setIsEditingGoal(false)}
          />
        </DashboardWeeklyGoal>

        <DashboardTopAtsMatches
          matches={dashboard.topAtsMatches}
          onJobClick={(jobId) => navigate({ to: '/job-tracker', search: { jobId } })}
        />
      </div>

      <div className={sharedStyles.twoColumn}>
        <DashboardUpcomingEvents
          events={dashboard.upcomingEvents}
          onJobClick={(jobId) => navigate({ to: '/job-tracker', search: { jobId } })}
          onTaskClick={(date) => navigate({ to: '/job-tracker', search: { date } })}
        />

        <DashboardPersonaBreakdown
          breakdown={dashboard.personaBreakdown}
          onPersonaClick={(personaId) =>
            navigate({ to: '/job-tracker', search: personaId ? { personaId } : {} })
          }
        />
      </div>
    </div>
  );
};

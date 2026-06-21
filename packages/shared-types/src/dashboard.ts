import type { JobStatus } from './job.js';

export type OnboardingStepKey = 'aiProvider' | 'personaAndResume' | 'firstJob' | 'eventOrTag';

export type OnboardingStepSeverity = 'required' | 'recommended' | 'optional';

export interface OnboardingStep {
  key: OnboardingStepKey;
  severity: OnboardingStepSeverity;
  isComplete: boolean;
}

export interface OnboardingResponse {
  isComplete: boolean;
  completedSteps: number;
  totalSteps: 4;
  steps: OnboardingStep[];
}

export type DashboardRange = 'month' | 'threeMonths' | 'all';

export interface DashboardStatusMetric {
  status: JobStatus;
  count: number;
  deltaThisWeek: number;
}

export interface DashboardFunnelStage {
  status: JobStatus;
  count: number;
  percent: number;
  dropoffFromPrevPercent: number | null;
}

export interface DashboardFunnelBiggestDropoff {
  from: JobStatus;
  to: JobStatus;
  percent: number;
}

export interface DashboardFunnelOverallSuccessRate {
  percent: number;
  offers: number;
  bookmarked: number;
}

export interface DashboardFunnel {
  range: DashboardRange;
  stages: DashboardFunnelStage[];
  biggestDropoff: DashboardFunnelBiggestDropoff | null;
  overallSuccessRate: DashboardFunnelOverallSuccessRate;
}

export interface DashboardWeeklyGoalMetric {
  done: number;
  target: number;
}

export interface DashboardWeeklyGoal {
  applications: DashboardWeeklyGoalMetric;
  interviews: DashboardWeeklyGoalMetric;
  resetsOn: string;
}

export interface DashboardTopAtsMatch {
  jobId: string;
  title: string;
  companyName: string;
  score: number;
  personaName: string;
}

export interface DashboardUpcomingEvent {
  id: string;
  title: string;
  jobName: string | null;
  companyName: string | null;
  date: string;
  time: string | null;
  type: string;
  tagColor: string;
  jobId: string | null;
}

export interface DashboardPersonaBreakdown {
  personaId: string | null;
  name: string;
  jobsCount: number;
  percentage: number;
}

export interface DashboardResponse {
  user: { id: string; email: string };
  hasAiKey: boolean;
  metrics: {
    total: number;
    byStatus: DashboardStatusMetric[];
  };
  funnel: DashboardFunnel;
  weeklyGoal: DashboardWeeklyGoal;
  topAtsMatches: DashboardTopAtsMatch[];
  upcomingEvents: DashboardUpcomingEvent[];
  personaBreakdown: DashboardPersonaBreakdown[];
}

export interface WeeklyGoalResponse {
  applicationsTarget: number;
  interviewsTarget: number;
  applicationsDone: number;
  interviewsDone: number;
  resetsOn: string;
  updatedAt: Date;
}

export interface UpdateWeeklyGoalInput {
  applicationsTarget: number;
  interviewsTarget: number;
}

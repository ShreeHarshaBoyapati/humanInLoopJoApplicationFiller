import { createFileRoute } from '@tanstack/react-router';
import { JobTrackerSection } from '../components/job-tracker-section';

export const Route = createFileRoute('/job-tracker')({
  component: JobTrackerPage,
});

function JobTrackerPage() {
  return <JobTrackerSection />;
}

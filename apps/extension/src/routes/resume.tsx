import { ResumeSection } from '../components/resume-section';
import { createFileRoute, ErrorComponent } from '@tanstack/react-router';
import type { PaginatedResumeListItem } from '@repo/shared-types';

export interface ResumeSearch {
  personaId?: string;
  title?: string;
  from?: string;
}

export const Route = createFileRoute('/resume')({
  validateSearch: (search: Record<string, unknown>): ResumeSearch => {
    return {
      personaId: search.personaId as string | undefined,
      title: search.title as string | undefined,
      from: search.from as string | undefined,
    };
  },
  component: ResumePage,
  pendingComponent: () => (
    <div style={{ color: 'var(--grey-500)', padding: '1rem' }}>Loading...</div>
  ),
  errorComponent: ErrorComponent,
});

function ResumePage() {
  const navigate = Route.useNavigate();
  const { personaId } = Route.useSearch();

  const handleBack = () => {
    navigate({ to: '/personas' });
  };

  const handleSelectResume = (resume: PaginatedResumeListItem) => {
    navigate({
      to: '/resume-version',
      search: {
        resumeId: resume.id,
        personaId: personaId || '',
      },
    });
  };

  return (
    <ResumeSection
      personaId={personaId || ''}
      onSelectResume={handleSelectResume}
      onBack={handleBack}
    />
  );
}

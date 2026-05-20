import { createFileRoute } from '@tanstack/react-router';
import { ResumeSection } from '../../components/resume-section';

export interface SelectResumeSearch {
  personaId: string;
  jobId?: string;
}

export const Route = createFileRoute('/autofill/select-resume')({
  validateSearch: (search: Record<string, unknown>): SelectResumeSearch => {
    return {
      personaId: search.personaId as string,
      jobId: search.jobId as string | undefined,
    };
  },
  component: SelectResumeComponent,
});

function SelectResumeComponent() {
  const navigate = Route.useNavigate();
  const { personaId, jobId } = Route.useSearch();

  const handleSelectResume = (resumeId: string) => {
    navigate({
      to: '/autofill/select-version',
      search: {
        personaId,
        resumeId,
        jobId,
      },
    });
  };

  const handleBack = () => {
    navigate({
      to: '/autofill/select-persona',
      search: { jobId },
    });
  };

  return (
    <ResumeSection
      personaId={personaId}
      onSelectResume={handleSelectResume}
      onBack={handleBack}
      isFromAutofill
    />
  );
}

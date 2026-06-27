import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ResumeVersionSection } from '../../components/resume-version-section';

export interface SelectVersionSearch {
  personaId: string;
  resumeId: string;
  jobId?: string;
}

export const Route = createFileRoute('/autofill/select-version')({
  validateSearch: (search: Record<string, unknown>): SelectVersionSearch => {
    return {
      personaId: search.personaId as string,
      resumeId: search.resumeId as string,
      jobId: search.jobId as string | undefined,
    };
  },
  component: SelectVersionComponent,
});

function SelectVersionComponent() {
  const navigate = useNavigate();
  const { personaId, resumeId, jobId } = Route.useSearch();

  const handleBack = () => {
    navigate({
      to: '/autofill/select-resume',
      search: { personaId, jobId },
    });
  };

  const handleBackToPersonas = () => {
    navigate({
      to: '/autofill/select-persona',
      search: { jobId },
    });
  };

  const handleConfirmSelection = () => {
    // Navigate back to autofill with step 2 selected
    navigate({
      to: '/autofill',
      search: { step: 1, jobId },
    });
  };

  return (
    <ResumeVersionSection
      resumeId={resumeId}
      personaId={personaId}
      onBack={handleBack}
      onBackToPersonas={handleBackToPersonas}
      isFromAutofill
      onConfirmSelection={handleConfirmSelection}
    />
  );
}

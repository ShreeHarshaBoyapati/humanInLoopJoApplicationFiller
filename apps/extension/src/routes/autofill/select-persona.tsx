import { createFileRoute } from '@tanstack/react-router';
import { PersonasSection } from '../../components/personas-section';

export interface SelectPersonaSearch {
  jobId?: string;
}

export const Route = createFileRoute('/autofill/select-persona')({
  validateSearch: (search: Record<string, unknown>): SelectPersonaSearch => {
    return {
      jobId: search.jobId as string | undefined,
    };
  },
  component: SelectPersonaComponent,
});

function SelectPersonaComponent() {
  const navigate = Route.useNavigate();
  const { jobId } = Route.useSearch();

  const handleSelectPersona = (personaId: string) => {
    navigate({
      to: '/autofill/select-resume',
      search: {
        personaId,
        jobId,
      },
    });
  };

  return <PersonasSection onSelectPersona={handleSelectPersona} isFromAutofill />;
}

import { ResumeVersionSection } from '../components/resume-version-section';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/resume-version')({
  validateSearch: (
    search: Record<string, unknown>
  ): {
    resumeId: string;
    personaId: string;
    from?: string;
  } => {
    return {
      resumeId: search.resumeId as string,
      personaId: search.personaId as string,
      from: search.from as string | undefined,
    };
  },
  component: ResumeVersionPage,
});

function ResumeVersionPage() {
  const navigate = Route.useNavigate();
  const { resumeId, personaId, from } = Route.useSearch();

  const handleBack = () => {
    navigate({
      to: '/resume',
      search: {
        personaId,
        title: '',
        from: from || '/personas',
      },
    });
  };

  const handleBackToPersonas = () => {
    navigate({
      to: '/personas',
    });
  };

  return (
    <ResumeVersionSection
      resumeId={resumeId}
      personaId={personaId}
      onBack={handleBack}
      onBackToPersonas={handleBackToPersonas}
    />
  );
}

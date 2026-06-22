import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { PersonaSection } from '../components/persona-section';
import { ResumeSection } from '../components/resume-section';
import { ResumeVersionSection } from '../components/resume-version-section';
import type { Persona, PaginatedResumeListItem } from '@repo/shared-types';

interface PersonaResumesSearch {
  personaId?: string;
  resumeId?: string;
}

export const Route = createFileRoute('/persona-resumes')({
  component: PersonaResumes,
  validateSearch: (search: Record<string, unknown>): PersonaResumesSearch => ({
    personaId: typeof search.personaId === 'string' ? search.personaId : undefined,
    resumeId: typeof search.resumeId === 'string' ? search.resumeId : undefined,
  }),
});

type Layer = 'persona' | 'resume' | 'resume-version';

function PersonaResumes() {
  const search = useSearch({ from: '/persona-resumes' });
  const navigate = useNavigate();
  const [activeLayer, setActiveLayer] = useState<Layer>('persona');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [selectedResume, setSelectedResume] = useState<PaginatedResumeListItem | null>(null);

  useEffect(() => {
    const { personaId, resumeId } = search;
    if (personaId && resumeId) {
      setSelectedPersona({
        id: personaId,
        title: '',
        keywords: [],
        active: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setSelectedResume({
        id: resumeId,
        fileName: '',
        active: false,
        versionsCount: 0,
        updatedAt: new Date(),
      });
      setActiveLayer('resume-version');
    } else if (personaId) {
      setSelectedPersona({
        id: personaId,
        title: '',
        keywords: [],
        active: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setSelectedResume(null);
      setActiveLayer('resume');
    }
  }, [search.personaId, search.resumeId]);

  const handleSelectPersona = (persona: Persona) => {
    setSelectedPersona(persona);
    setSelectedResume(null);
    setActiveLayer('resume');
  };

  const handleSelectResume = (resume: PaginatedResumeListItem) => {
    setSelectedResume(resume);
    setActiveLayer('resume-version');
  };

  const handleBackToPersona = () => {
    setActiveLayer('persona');
    setSelectedPersona(null);
    setSelectedResume(null);
    navigate({ to: '/persona-resumes', search: {} });
  };

  const handleBackToResume = () => {
    setActiveLayer('resume');
    setSelectedResume(null);
  };

  return (
    <>
      {activeLayer === 'persona' && <PersonaSection onSelectPersona={handleSelectPersona} />}
      {activeLayer === 'resume' && selectedPersona && (
        <ResumeSection
          persona={selectedPersona}
          onBack={handleBackToPersona}
          onSelectResume={handleSelectResume}
        />
      )}
      {activeLayer === 'resume-version' && selectedResume && selectedPersona && (
        <ResumeVersionSection
          resume={selectedResume}
          personaId={selectedPersona.id}
          onBack={handleBackToResume}
          onBackToPersonas={handleBackToPersona}
        />
      )}
    </>
  );
}

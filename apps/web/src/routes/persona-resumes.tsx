import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { PersonaSection } from '../components/persona-section';
import { ResumeSection } from '../components/resume-section';
import { ResumeVersionSection } from '../components/resume-version-section';
import type { Persona, PaginatedResumeListItem } from '@repo/shared-types';

export const Route = createFileRoute('/persona-resumes')({
  component: PersonaResumes,
});

type Layer = 'persona' | 'resume' | 'resume-version';

function PersonaResumes() {
  const [activeLayer, setActiveLayer] = useState<Layer>('persona');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [selectedResume, setSelectedResume] = useState<PaginatedResumeListItem | null>(null);

  const handleSelectPersona = (persona: Persona) => {
    setSelectedPersona(persona);
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
      {activeLayer === 'resume-version' && selectedResume && (
        <ResumeVersionSection
          resume={selectedResume}
          onBack={handleBackToResume}
          onBackToPersonas={handleBackToPersona}
        />
      )}
    </>
  );
}

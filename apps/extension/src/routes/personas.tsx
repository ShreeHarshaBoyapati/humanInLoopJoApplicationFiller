import { createFileRoute } from '@tanstack/react-router';
import { PersonasSection } from '../components/personas-section';

export const Route = createFileRoute('/personas')({
  component: PersonasComponent,
});

function PersonasComponent() {
  return <PersonasSection />;
}

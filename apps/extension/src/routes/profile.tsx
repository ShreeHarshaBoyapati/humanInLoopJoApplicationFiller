import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/profile')({
  component: ProfileComponent,
});

function ProfileComponent() {
  return (
    <div style={{ padding: '1rem', color: 'var(--white-900)' }}>
      <h2>Profile Page</h2>
      <p>This is a placeholder for the profile page.</p>
    </div>
  );
}

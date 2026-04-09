import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/sign-up' });
  },
  component: function Index() {
    return null;
  },
});

/**
 * Onboarding greeting block.
 * Displays a welcome message addressed to the user and a short secondary line.
 */

import sharedStyles from '../style/onboarding.module.css';

interface OnboardingGreetingProps {
  displayName: string;
}

export const OnboardingGreeting = ({ displayName }: OnboardingGreetingProps) => {
  return (
    <div className={sharedStyles.section}>
      <h1 className={sharedStyles.title}>Welcome to JobFillPro, {displayName}</h1>
      <p className={sharedStyles.subtitle}>
        Let's get you set up in 4 quick steps so everything works from day one.
      </p>
    </div>
  );
};

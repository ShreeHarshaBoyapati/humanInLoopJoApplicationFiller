/**
 * Expanded bodies for the four onboarding steps.
 * Each body includes context info and the primary CTA for that step.
 */

import { useNavigate } from '@tanstack/react-router';
import { EnhancedButton } from '@repo/ui';
import styles from './style/onboarding-step-bodies.module.css';

interface StepBodyProps {
  onSkip?: () => void;
}

export const Step1AiProviderBody = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.body}>
      <p className={styles.text}>
        The AI provider API key powers resume parsing and ATS scoring. Your key is stored encrypted.
      </p>
      <ul className={styles.providerList}>
        <li>OpenAI</li>
        <li>Anthropic</li>
        <li>Gemini</li>
        <li>Ollama</li>
        <li>Custom (Open AI Supported)</li>
      </ul>
      <div className={styles.ctaRow}>
        <EnhancedButton
          label="Go to settings"
          colorTheme="primary"
          onClick={() => navigate({ to: '/settings' })}
        />
      </div>
    </div>
  );
};

export const Step2PersonaResumeBody = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.body}>
      <div className={styles.infoCards}>
        <InfoCard
          title="Persona"
          text="A persona groups resumes by role type, like Frontend or Backend."
        />
        <InfoCard
          title="Resume"
          text="Upload your resume so the app can match it against job descriptions."
        />
        <InfoCard
          title="Resume version"
          text="Create tailored versions of a resume for different jobs."
        />
      </div>
      <div className={styles.ctaRow}>
        <EnhancedButton
          label="Go to persona"
          colorTheme="primary"
          onClick={() => navigate({ to: '/persona-resumes' })}
          customProps={{ props: { sx: { width: 'fit-content', maxWidth: 'fit-content' } } }}
        />
      </div>
    </div>
  );
};

export const Step3FirstJobBody = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.body}>
      <p className={styles.text}>
        Visit a job listing on LinkedIn, Indeed, or a company career page and click the quick-save
        button in the extension. The extension extracts the job details, runs ATS analysis, and
        suggests resume improvements.
      </p>
      <div className={styles.note}>
        Open the JobFillPro extension on a job listing page to see the auto-fill flow in action.
      </div>
      <p className={styles.text}>Or you can manually add a job in the Job Tracker.</p>
      <div className={styles.ctaRow}>
        <EnhancedButton
          label="Go to Job Tracker"
          colorTheme="primary"
          onClick={() => navigate({ to: '/job-tracker' })}
          customProps={{ props: { sx: { width: 'fit-content', maxWidth: 'fit-content' } } }}
        />
      </div>
    </div>
  );
};

export const Step4EventOrTagBody = ({ onSkip }: StepBodyProps) => {
  const navigate = useNavigate();

  return (
    <div className={styles.body}>
      <div className={styles.infoCards}>
        <InfoCard
          title="Events"
          text="Mark the important dates and tasks in your calendar for better productivity and planning."
        />
        <InfoCard title="Event Tags" text="Group events so you can filter and plan quickly." />
      </div>
      <div className={styles.ctaRow}>
        <EnhancedButton
          label="Open Job Tracker"
          colorTheme="primary"
          onClick={() => navigate({ to: '/job-tracker' })}
          customProps={{ props: { sx: { width: 'fit-content', maxWidth: 'fit-content' } } }}
        />
        {onSkip && <EnhancedButton label="Skip" colorTheme="secondary" onClick={onSkip} />}
      </div>
    </div>
  );
};

interface InfoCardProps {
  title: string;
  text: string;
}

const InfoCard = ({ title, text }: InfoCardProps) => {
  return (
    <div className={styles.infoCard}>
      <span className={styles.infoCardTitle}>{title}</span>
      <p className={styles.infoCardText}>{text}</p>
    </div>
  );
};

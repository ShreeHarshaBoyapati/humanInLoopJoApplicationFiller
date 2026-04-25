import { ArrowBack } from '@mui/icons-material';
import styles from '../routes/style/section.module.css';
import '@repo/ui/constants/css-constants.css';
import { PageHeader } from './page-header';

interface ResumeVersionSectionProps {
  resume: { id: string; fileName: string };
  onBack: () => void;
}

export function ResumeVersionSection({ resume, onBack }: ResumeVersionSectionProps) {
  return (
    <div className={styles.sectionContainer}>
      {/* Box 1: Header */}
      <PageHeader
        title="Resume Versions"
        buttonLabel="Add Version"
        onButtonClick={() => console.log('Add version clicked')}
      />

      {/* Box 2: Navigation */}
      <div className={styles.navigation}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ArrowBack sx={{ fontSize: '1rem' }} />
        </button>
        <span className={styles.navTextBlue} onClick={onBack}>
          All Personas
        </span>
        <span className={styles.navSeparator}>/</span>
        <span className={styles.navTextBlue} onClick={onBack}>
          Resumes
        </span>
        <span className={styles.navSeparator}>/</span>
        <span className={styles.navCurrent}>Versions</span>
      </div>

      {/* Box 3 & 4: Placeholder */}
      <p className={styles.emptyText}>
        Resume versions feature coming soon. Selected resume: {resume.fileName}
      </p>
    </div>
  );
}

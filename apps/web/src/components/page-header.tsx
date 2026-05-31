import { EnhancedButton } from '@repo/ui';
import styles from './style/page-header.module.css';

interface PageHeaderProps {
  title: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
  buttonIcon?: React.ReactNode;
  headerProps?: React.HTMLAttributes<HTMLDivElement>;
}

export const PageHeader = ({
  title,
  buttonLabel,
  onButtonClick,
  buttonIcon,
  headerProps,
}: PageHeaderProps) => {
  return (
    <div className={styles.header} {...headerProps}>
      <h1 className={styles.title}>{title}</h1>
      {onButtonClick && (
        <EnhancedButton
          label={buttonLabel}
          colorTheme="secondary"
          onClick={onButtonClick}
          customProps={{ props: { sx: { width: 'fit-content', maxWidth: 'fit-content' } } }}
          startIcon={buttonIcon}
        />
      )}
    </div>
  );
};

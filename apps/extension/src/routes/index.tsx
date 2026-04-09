import { useState, MouseEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { EnhancedActionCard, StyledMenu, StyledMenuItem } from '@repo/ui';
import { Typography } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddLinkIcon from '@mui/icons-material/AddLink';
import TokenIcon from '@mui/icons-material/Token';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import rootStyles from './style/__root.module.css';
import styles from './style/index.module.css';

interface LogoutResponse {
  success: boolean;
  error?: string;
}

export const Route = createFileRoute('/')({
  component: HomeComponent,
});

function HomeComponent() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleUserClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // TODO: need to add a module for confirmation
      chrome.runtime.sendMessage({ action: 'LOGOUT' }, (response: LogoutResponse) => {
        if (response?.success) {
          window.location.reload();
        } else {
          console.error('Logout failed', response?.error);
        }
      });
    } else {
      alert('Logout clicked (chrome runtime unavailable)');
    }
  };

  return (
    <>
      <header className={rootStyles.header}>
        <div className={rootStyles.logoArea}>
          <AutoAwesomeIcon className={rootStyles.logoIcon} />
          <h1 className={rootStyles.logoText}>JFP</h1>
        </div>

        <button className={rootStyles.userBtn} onClick={handleUserClick} aria-label="User Menu">
          <AccountCircleIcon fontSize="large" />
        </button>

        <StyledMenu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <StyledMenuItem
            onClick={() => {
              handleClose();
              navigate({ to: '/settings' });
            }}
          >
            <Typography>Settings</Typography>
          </StyledMenuItem>
          <StyledMenuItem onClick={handleLogout}>
            <Typography>Logout</Typography>
          </StyledMenuItem>
        </StyledMenu>
      </header>

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome back!</h1>
          <p className={styles.subtitle}>Ready to automate your job search today?</p>
        </div>

        <div className={styles.cardsContainer}>
          <EnhancedActionCard
            icon={<AddLinkIcon />}
            iconBgColor="var(--blue-500)"
            iconColor="var(--black-700)"
            title="Extract New Job"
            description="Click on Quick save button. Our extension will extract requirements, salary, and fit analysis instantly."
            buttonLabel="Extract"
            onButtonClick={() => navigate({ to: '/job' })}
          />

          <div className={styles.usageCard}>
            <div className={styles.usageHeader}>
              <TokenIcon className={styles.usageIcon} />
              <div className={styles.usageTitleWrapper}>
                <span className={styles.usageTitleText}>API Token Usage</span>
                <span className={styles.usageSubtitle}>Monthly quota resets in 12 days</span>
              </div>
            </div>
            <div className={styles.progressSection}>
              <div className={styles.progressLabels}>
                <span className={styles.progressLabelText}>Tokens Used</span>
                <span className={styles.progressValueText}>4,520 / 10,000</span>
              </div>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressBarFill} style={{ width: '45.2%' }}></div>
              </div>
            </div>
          </div>

          <div className={styles.savedJobsCard}>
            <div className={styles.savedJobsHeader}>
              <div className={styles.savedJobsTitleWrapper}>
                <div className={styles.savedJobsTitle}>
                  <FolderOutlinedIcon fontSize="small" />
                  <span>Recent Saved Jobs</span>
                </div>
                <span className={styles.savedJobsSubtitle}>4 new matches found today</span>
              </div>
              <Link to="/recent-jobs" className={styles.chevronIcon}>
                <ChevronRightIcon />
              </Link>
            </div>

            <div className={styles.jobItem}>
              <div className={styles.jobIconWrapper}>SF</div>
              <div className={styles.jobItemDetails}>
                <span className={styles.jobItemTitle}>Senior Frontend Engineer</span>
                <span className={styles.jobItemCompany}>Stripe • Remote</span>
              </div>
            </div>

            <div className={styles.jobItem}>
              <div className={styles.jobIconWrapper}>PM</div>
              <div className={styles.jobItemDetails}>
                <span className={styles.jobItemTitle}>Product Manager</span>
                <span className={styles.jobItemCompany}>Linear • NYC</span>
              </div>
            </div>
          </div>

          <div className={styles.aiStatusArea}>
            <h3 className={styles.sectionHeading}>AI CONFIGURATION</h3>
            <div className={styles.aiStatusCard}>
              <div className={styles.aiStatusLabels}>
                <span className={styles.aiStatusTitle}>Provider & Persona</span>
                <span className={styles.aiStatusValue}>Gemini • Default</span>
              </div>
              <Link to="/profile" className={styles.aiStatusLink}>
                Change
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

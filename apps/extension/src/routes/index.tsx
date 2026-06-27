/**
 * Extension home route.
 * Keeps the existing header + greeting, and renders only the Extract widget.
 * Below it, when the user has completed onboarding, shows the three read-only
 * dashboard widgets (Weekly goal, Upcoming events, Status metrics). When the
 * user has NOT completed onboarding, shows a banner pointing to the web app.
 */

import { useState, MouseEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  EnhancedActionCard,
  StyledMenu,
  StyledMenuItem,
  DashboardWeeklyGoal,
  DashboardUpcomingEvents,
  DashboardStatusMetrics,
} from '@repo/ui';
import { Typography } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddLinkIcon from '@mui/icons-material/AddLink';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import rootStyles from './style/__root.module.css';
import styles from './style/index.module.css';
import onboardingStyles from './style/extension-onboarding-banner.module.css';
import { useOnboarding } from '../hooks/use-onboarding.ts';
import { useDashboard } from '../hooks/use-dashboard.ts';
import { buildWebDeepLink } from '../utils/build-web-deep-link.ts';
import AddIcon from '@mui/icons-material/Add';

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

  const { data: onboarding } = useOnboarding();
  const isOnboarded = onboarding?.isComplete ?? false;
  const { data: dashboard } = useDashboard('month');

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
            description="Click on Quick save button. Our extension will extract requirements, salary, and fit analysis instantly. Or you can enter job details manually."
            buttonLabel="Add New Job"
            onButtonClick={() => navigate({ to: '/job', search: { from: '/' } })}
          />

          {!isOnboarded && (
            <div className={onboardingStyles.onboardingBanner}>
              <span className={onboardingStyles.onboardingTitle}>Complete your onboarding</span>
              <p className={onboardingStyles.onboardingText}>
                Finish the quick setup in the web app to unlock the full dashboard here.
              </p>
              <Link
                to={buildWebDeepLink({ path: '/dashboard' })}
                target="_blank"
                rel="noopener noreferrer"
                className={onboardingStyles.onboardingLink}
              >
                Open dashboard in web app
                <OpenInNewIcon style={{ fontSize: '0.75rem' }} />
              </Link>
            </div>
          )}

          {isOnboarded && dashboard && (
            <>
              <DashboardWeeklyGoal weeklyGoal={dashboard.weeklyGoal} />
              <DashboardUpcomingEvents
                events={dashboard.upcomingEvents}
                onEventClick={(event) => {
                  window.open(
                    buildWebDeepLink({
                      path: '/job-tracker',
                      search: { date: event.date, tab: 'calendar' },
                    }),
                    '_blank',
                    'noopener,noreferrer'
                  );
                }}
              />
              <DashboardStatusMetrics
                metrics={dashboard.metrics}
                onStatusClick={(status) => {
                  window.open(
                    buildWebDeepLink({
                      path: '/job-tracker',
                      search: { status },
                    }),
                    '_blank',
                    'noopener,noreferrer'
                  );
                }}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}

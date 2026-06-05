import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { AccountCircle } from '@mui/icons-material';
import { StyledMenu, StyledMenuItem } from '@repo/ui';
import styles from './style/home-page-banner.module.css';
import { Typography } from '@mui/material';

const TABS: Array<{ id: string; label: string; route?: string }> = [
  { id: 'dashboard', label: 'Dashboard', route: '/' },
  { id: 'job-tracker', label: 'Job tracker', route: '/job-tracker' },
  { id: 'persona-resumes', label: 'Persona and Resumes', route: '/persona-resumes' },
  { id: 'settings', label: 'Settings', route: '/settings' },
];

interface HomePageBannerProps {
  onLogout: () => void;
}

export function HomePageBanner({ onLogout }: HomePageBannerProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('persona-resumes');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = () => {
    handleMenuClose();
    onLogout();
  };

  return (
    <header className={styles.banner}>
      <div className={styles.leftSection}>
        <Link to="/" className={styles.logo}>
          JobFillPro
        </Link>
      </div>

      <nav className={styles.centerSection}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? styles.tabActive : styles.tab}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.route) {
                navigate({ to: tab.route });
              }
            }}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.rightSection}>
        <button
          className={styles.userIcon}
          type="button"
          aria-label="User menu"
          aria-controls={open ? 'user-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleMenuOpen}
        >
          <AccountCircle fontSize="large" />
        </button>
        <StyledMenu
          id="user-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          slotProps={{
            list: {
              'aria-labelledby': 'user-menu',
            },
          }}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <StyledMenuItem onClick={handleLogoutClick}>
            <Typography>Logout</Typography>
          </StyledMenuItem>
        </StyledMenu>
      </div>
    </header>
  );
}

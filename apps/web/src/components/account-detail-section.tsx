import { useEffect } from 'react';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { useStore } from '../store';
import { axiosInstance } from '../utils/axios.ts';
import type { ApiResponse, UserPublic } from '@repo/shared-types';
import styles from './style/account-detail-section.module.css';

/**
 * Account detail section — displays the authenticated user's email
 * and a fallback hydration call to /api/user/me.
 */
export function AccountDetailSection() {
  const email = useStore((state) => state.email);

  useEffect(() => {
    if (email) return;

    const hydrateUser = async () => {
      try {
        const response = await axiosInstance.get<ApiResponse<UserPublic>>('/user/me');
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to fetch user');
        }
        const { id: userId, email: userEmail } = response.data.data;
        useStore.getState().setUser({ id: userId, email: userEmail });
      } catch (error) {
        console.error('[AccountDetailSection] Failed to hydrate user:', error);
      }
    };

    void hydrateUser();
  }, [email]);

  if (!email) {
    return (
      <section className={styles.section}>
        <p className={styles.loading}>Loading…</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.row}>
        <div className={styles.avatar}>
          <AccountCircle fontSize="large" />
        </div>
        <div className={styles.info}>
          <p className={styles.email}>{email}</p>
        </div>
      </div>
    </section>
  );
}

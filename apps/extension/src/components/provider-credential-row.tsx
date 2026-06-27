/**
 * Provider credential row — displays one credential with reveal-on-click.
 *
 * Credentials arrive either transit-encrypted (apiKey / secrets / tokens) or
 * plaintext (customUrl, organizationId, projectId, etc.). Encrypted values are
 * decrypted via the DECRYPT_API_KEY background action; plaintext values are shown
 * directly. Copy-to-clipboard is intentionally omitted to keep secrets from
 * sitting on the clipboard.
 */

import { useCallback, useState } from 'react';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { EnhancedTooltipWithText } from '@repo/ui';

import styles from './style/provider-credential-row.module.css';

interface ProviderCredentialRowProps {
  label: string;
  value: string;
}

const TRANSIT_ENCRYPTED_PATTERN = /^[0-9a-fA-F]+:[0-9a-fA-F]+$/;

function looksTransitEncrypted(value: string): boolean {
  return TRANSIT_ENCRYPTED_PATTERN.test(value);
}

export function ProviderCredentialRow({ label, value }: ProviderCredentialRowProps) {
  const [revealed, setRevealed] = useState(false);
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const masked = '••••••••';
  const isEncrypted = looksTransitEncrypted(value);

  const handleToggleReveal = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      if (revealed) {
        setRevealed(false);
        return;
      }

      if (decrypted !== null) {
        setRevealed(true);
        return;
      }

      if (!looksTransitEncrypted(value)) {
        setDecrypted(value);
        setRevealed(true);
        return;
      }

      if (typeof chrome === 'undefined' || !chrome.runtime) {
        setError('Chrome runtime not available');
        return;
      }

      setIsDecrypting(true);
      setError(null);
      chrome.runtime.sendMessage(
        { action: 'DECRYPT_API_KEY', payload: { encryptedKey: value } },
        (response: { success: boolean; data?: unknown; error?: string }) => {
          setIsDecrypting(false);
          if (response?.success) {
            const plaintext =
              typeof response.data === 'string'
                ? response.data
                : (response.data as { decryptedKey?: string } | undefined)?.decryptedKey;
            if (plaintext) {
              setDecrypted(plaintext);
              setRevealed(true);
            } else {
              setError('Decryption returned empty value');
            }
          } else {
            setError(response?.error || 'Failed to decrypt credential');
          }
        }
      );
    },
    [decrypted, revealed, value]
  );

  const displayValue = isEncrypted ? (revealed && decrypted !== null ? decrypted : masked) : value;
  const EyeIcon = revealed ? VisibilityOffOutlinedIcon : VisibilityOutlinedIcon;

  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <div className={styles.valueWrapper}>
        <EnhancedTooltipWithText
          description={displayValue}
          showIcon={false}
          placement="top"
          customProps={{
            childProps: {
              childrenBox: {
                sx: {
                  minWidth: 0,
                  overflow: 'hidden',
                },
              },
            },
          }}
        >
          <span className={styles.value}>{displayValue}</span>
        </EnhancedTooltipWithText>
      </div>
      {isEncrypted && (
        <button
          type="button"
          className={styles.actionButton}
          onClick={handleToggleReveal}
          disabled={isDecrypting}
          aria-label={revealed ? 'Hide credential' : 'Reveal credential'}
        >
          <EyeIcon sx={{ fontSize: '1.25rem' }} />
        </button>
      )}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}

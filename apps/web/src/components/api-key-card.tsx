import { Radio } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { EnhancedTooltipWithText } from '@repo/ui';
import type { ApiKeyData } from '@repo/shared-types';
import styles from './style/api-key-card.module.css';

interface ApiKeyCardProps {
  keyData: ApiKeyData;
  isActive: boolean;
  isSettingActive: boolean;
  onSetActive: (id: string) => void;
  onEdit: (keyData: ApiKeyData) => void;
  onDelete: (id: string) => void;
}

/**
 * One row in the AI provider list. Radio selects active, edit/delete in actions.
 */
export function ApiKeyCard({
  keyData,
  isActive,
  isSettingActive,
  onSetActive,
  onEdit,
  onDelete,
}: ApiKeyCardProps) {
  const provider = keyData.provider || '';
  const model = keyData.model || '';

  const formatName = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

  const radioTooltip = isActive ? 'Active' : 'Click to set as active';

  const handleRowClick = () => {
    if (!isActive && !isSettingActive) {
      onSetActive(keyData.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(keyData);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(keyData.id);
  };

  return (
    <div
      className={`${styles.keyCard} ${isActive ? styles.selected : ''}`}
      onClick={handleRowClick}
    >
      <div className={styles.radioSection}>
        <EnhancedTooltipWithText description={radioTooltip} showIcon={false} placement="top">
          <Radio
            checked={isActive}
            disabled={isActive}
            onChange={handleRowClick}
            sx={{
              color: 'var(--grey-500)',
              '&.Mui-disabled': {
                color: 'var(--grey-500)',
                pointerEvents: 'none',
                opacity: 0.5,
              },
              '&.Mui-checked': {
                color: 'var(--blue-500)',
              },
            }}
          />
        </EnhancedTooltipWithText>
      </div>

      <div className={styles.dataSection}>
        <div className={styles.providerIcon}>{provider.charAt(0).toUpperCase()}</div>
        <div className={styles.providerInfo}>
          <p className={styles.providerName}>{formatName(provider)}</p>
          <p className={styles.modelLine}>Model: {model}</p>
        </div>
      </div>

      <div className={styles.actionsSection}>
        <EnhancedTooltipWithText description="Edit" showIcon={false} placement="top">
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleEdit}
            aria-label="Edit provider"
          >
            <EditOutlinedIcon sx={{ fontSize: '1.25rem' }} />
          </button>
        </EnhancedTooltipWithText>
        <EnhancedTooltipWithText
          description={isActive ? 'Cannot delete active provider' : 'Delete'}
          showIcon={false}
          placement="top"
        >
          <button
            type="button"
            className={`${styles.actionButton} ${styles.delete} ${
              isActive ? styles.actionButtonDisabled : ''
            }`}
            onClick={handleDelete}
            disabled={isActive}
            aria-label={isActive ? 'Cannot delete active provider' : 'Delete provider'}
          >
            <DeleteOutlineIcon sx={{ fontSize: '1.25rem' }} />
          </button>
        </EnhancedTooltipWithText>
      </div>
    </div>
  );
}

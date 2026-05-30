import { Radio } from '@mui/material';
import { Edit, Delete, ArrowForward } from '@mui/icons-material';
import { EnhancedTooltipWithText } from '@repo/ui';
import type { Persona } from '@repo/shared-types';
import styles from './style/persona-card.module.css';

interface PersonaCardProps {
  persona: Persona;
  isSelected: boolean;
  onNavigate: (persona: Persona) => void;
  onEdit: (persona: Persona, e: React.MouseEvent) => void;
  onDelete: (personaId: string, e: React.MouseEvent) => void;
}

export const PersonaCard = ({
  persona,
  isSelected,
  onNavigate,
  onEdit,
  onDelete,
}: PersonaCardProps) => {
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const radioTooltip = persona.active ? 'Active' : 'Click to set as active';

  return (
    <div className={`${styles.personaCard} ${isSelected ? styles.selected : ''}`}>
      {/* Section 1: Radio button with tooltip */}
      <div className={styles.radioSection}>
        <EnhancedTooltipWithText description={radioTooltip} showIcon={false} placement="top">
          <Radio
            checked={persona.active}
            disabled={true}
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

      {/* Section 2: Data (icon, title, resumes, keywords) */}
      <div className={styles.dataSection}>
        <div className={styles.personaIcon}>{getInitials(persona.title)}</div>
        <div className={styles.personaInfo}>
          <div className={styles.personaNameRow}>
            <p className={styles.personaName}>{persona.title}</p>
            <span className={styles.personaResumesCount}>{persona.resumesCount || 0} resumes</span>
          </div>
          <p className={styles.personaSummary}>{persona.keywords?.join(', ') || 'No keywords'}</p>
        </div>
      </div>

      {/* Section 3: Action buttons */}
      <div className={styles.actionsSection}>
        <button type="button" className={styles.actionButton} onClick={(e) => onEdit(persona, e)}>
          <Edit sx={{ fontSize: '1.25rem' }} />
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.delete}`}
          onClick={(e) => onDelete(persona.id, e)}
        >
          <Delete sx={{ fontSize: '1.25rem' }} />
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.arrow}`}
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(persona);
          }}
        >
          <ArrowForward sx={{ fontSize: '1.25rem' }} />
        </button>
      </div>
    </div>
  );
};

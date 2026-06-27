import { EnhancedTextField } from '@repo/ui';
import { Search } from '@mui/icons-material';
import styles from './style/search-bar.module.css';

interface SearchBarProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

export const SearchBar = ({ placeholder, value, onChange }: SearchBarProps) => {
  return (
    <div className={styles.searchBox}>
      <div className={styles.searchContainer}>
        <EnhancedTextField
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          startIcon={<Search sx={{ color: 'var(--grey-500)' }} />}
        />
      </div>
    </div>
  );
};

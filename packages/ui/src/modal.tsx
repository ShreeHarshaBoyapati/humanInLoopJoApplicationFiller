import { type ReactNode } from 'react';
import { Close } from '@mui/icons-material';
import type { BoxProps, ButtonProps } from '@mui/material';
import { Box } from '@mui/material';
import styles from './modal.module.css';

interface ChildProps {
  overlay?: Partial<BoxProps>;
  modal?: Partial<BoxProps>;
  header?: Partial<BoxProps>;
  title?: {
    props?: Partial<BoxProps>;
  };
  closeButton?: {
    props?: Partial<ButtonProps>;
  };
  body?: Partial<BoxProps>;
  footer?: Partial<BoxProps>;
}

interface CustomProps {
  props?: Partial<BoxProps>;
  childProps?: ChildProps;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  headerTitle: string;
  children: ReactNode;
  footer?: ReactNode;
  customProps?: CustomProps;
}

export function Modal({ isOpen, onClose, headerTitle, children, footer, customProps }: ModalProps) {
  if (!isOpen) return null;

  const { props = {}, childProps = {} } = customProps || {};
  const { overlay, modal, header, body, footer: footerStyles } = childProps;

  return (
    <Box component="div" className={styles.overlay} onClick={onClose} {...props} {...overlay}>
      <Box
        component="div"
        className={styles.modal}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        {...modal}
      >
        <Box component="div" className={styles.header} {...header}>
          <Box component="h2" className={styles.title} {...childProps.title?.props}>
            {headerTitle}
          </Box>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
            {...childProps.closeButton?.props}
          >
            <Close sx={{ fontSize: '1.5rem', color: 'var(--grey-500)' }} />
          </button>
        </Box>
        <Box component="div" className={styles.body} {...body}>
          {children}
        </Box>
        {footer && (
          <Box component="div" className={styles.footer} {...footerStyles}>
            {footer}
          </Box>
        )}
      </Box>
    </Box>
  );
}

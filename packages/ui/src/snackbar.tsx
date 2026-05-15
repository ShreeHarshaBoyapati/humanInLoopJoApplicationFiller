import { forwardRef, type ReactNode } from 'react';
import type { SnackbarProps, IconButtonProps, TypographyProps } from '@mui/material';
import { Snackbar, Alert, IconButton, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import styleConstants from './constants/style-constants';
import WarningIcon from './icons/warning';
import ErrorIcon from './icons/error';
import InfoIconSnackbar from './icons/info';
import { CloseIcon } from './icons/close-icon';
import SuccessIconSnackBar from './icons/success';

type SnackbarSeverity = 'success' | 'warning' | 'error' | 'info';

interface StyledAlertProps {
  header?: string | boolean;
}

interface StyledBoxProps {
  header?: string | boolean;
}

interface StyledWrapperBoxProps {
  className?: string;
  style?: React.CSSProperties;
}

interface MessageWrapperBoxProps {
  header?: string | boolean;
}

type CustomProps = {
  snackbarProps?: Partial<SnackbarProps>;
  styledWrapperBoxProps?: Partial<StyledWrapperBoxProps>;
  headerTypographyProps?: Partial<TypographyProps>;
  messageTypographyProps?: Partial<TypographyProps>;
  closeButtonParentBoxProps?: Partial<StyledBoxProps>;
  closeButtonProps?: Partial<IconButtonProps>;
  messageWrapperProps?: Partial<MessageWrapperBoxProps>;
};

interface EnhancedSnackbarProps {
  message?: ReactNode;
  header?: string;
  severity?: SnackbarSeverity;
  open?: boolean;
  onClose?: () => void;
  autoHideDuration?: number | null;
  anchorOrigin?: SnackbarProps['anchorOrigin'];
  customProps?: Partial<CustomProps>;
}

const StyledAlert = styled(Alert, {
  shouldForwardProp: (prop) => prop !== 'header',
})<StyledAlertProps>(({ header }) => ({
  padding: '8px 10px',
  borderRadius: styleConstants.borderRadius,
  width: '290px',
  minWidth: '290px',
  maxWidth: '390px',
  maxHeight: '147px',
  '&.MuiAlert-root': {
    transition: 'none !important',
    animation: 'none !important',
  },

  '&.MuiAlert-filledSuccess': {
    background: `${styleConstants.green450}`,
    border: `1px solid ${styleConstants.grey700}`,
  },
  '&.MuiAlert-filledError': {
    background: `${styleConstants.red800}`,
    border: `1px solid ${styleConstants.grey700}`,
  },

  '&.MuiAlert-filledWarning': {
    background: `${styleConstants.yellow600}`,
    border: `1px solid ${styleConstants.grey700}`,
  },

  '&.MuiAlert-filledInfo': {
    background: `${styleConstants.blue700}`,
    border: `1px solid ${styleConstants.grey700}`,
  },

  '& .MuiAlert-message': {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    marginTop: '0px',
    maxHeight: header && '131px',
  },
  '& .MuiAlert-action': {
    paddingLeft: '10px',
    marginRight: '0px',
    paddingTop: '0px',
    position: 'absolute',
    right: '10px',
  },
  '& .MuiAlert-icon': {
    padding: 0,
    marginRight: '10px',
    minWidth: 'unset',
  },
}));

const HeaderTypography = styled(Typography)(() => ({
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: '19px',
  marginBottom: '4px',
  color: styleConstants.white700,
}));

const MessageTypography = styled(Typography)(() => ({
  fontSize: '12px',
  fontWeight: 400,
  lineHeight: '18px',
  color: styleConstants.white700,
}));

const CloseButton = styled(IconButton)(() => ({
  padding: '4px',
  backgroundColor: 'transparent',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    boxShadow: 'none',
  },
  '&:focus': {
    outline: 'none',
  },
  '&.Mui-focusVisible': {
    outline: 'none',
  },
  '& .MuiSvgIcon-root': {
    fontSize: '16px',
  },
}));

const ICONS: Record<SnackbarSeverity, ReactNode> = {
  success: <SuccessIconSnackBar />,
  warning: <WarningIcon />,
  error: <ErrorIcon />,
  info: <InfoIconSnackbar />,
};

const StyledBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'header',
})<StyledBoxProps>(({ header }) => ({
  marginTop: header ? '0px' : '-2px',
  alignSelf: 'flex-start',
}));

const StyledWrapperBox = styled(Box)(() => ({
  background: 'white',
  borderRadius: styleConstants.borderRadius,
}));

const MessageWrapperBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'header',
})<MessageWrapperBoxProps>(({ header }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '0px 12px 0px 0px',
  width: header ? '100%' : undefined,
  maxHeight: '131px',
  overflowY: header ? 'auto' : undefined,
  '&::-webkit-scrollbar': {
    width: '4px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent !important',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: ` ${styleConstants.grey700} !important`,
    borderRadius: '4px',
  },
  '&:hover': {
    scrollbarWidth: 'auto',
    '&::-webkit-scrollbar': {
      width: '4px',
    },
  },
}));

const EnhancedSnackbar = forwardRef<HTMLDivElement, EnhancedSnackbarProps>(
  (
    {
      message,
      header,
      severity = 'success',
      open,
      onClose,
      autoHideDuration = 400000,
      anchorOrigin = { vertical: 'bottom', horizontal: 'left' },
      customProps = {
        snackbarProps: {},
        headerTypographyProps: {},
        messageTypographyProps: {},
        closeButtonParentBoxProps: {},
        closeButtonProps: {},
        messageWrapperProps: {},
      },
    },
    ref
  ) => {
    const icon = ICONS[severity] || null;
    let headerValue = header;
    if (headerValue === undefined) {
      switch (severity) {
        case 'success':
          headerValue = 'Success';
          break;
        case 'info':
          headerValue = 'Info';
          break;
        case 'warning':
          headerValue = 'Warning';
          break;
        case 'error':
          headerValue = 'Error';
          break;
        default:
          break;
      }
    }
    return (
      <Snackbar
        open={open}
        autoHideDuration={autoHideDuration}
        onClose={onClose}
        anchorOrigin={anchorOrigin}
        ref={ref}
        {...customProps.snackbarProps}
      >
        <StyledWrapperBox {...customProps.styledWrapperBoxProps}>
          <StyledAlert
            severity={severity}
            variant="filled"
            icon={icon}
            header={headerValue || false}
            action={
              <StyledBox header={headerValue || false} {...customProps.closeButtonParentBoxProps}>
                <CloseButton onClick={onClose} {...customProps.closeButtonProps}>
                  <CloseIcon />
                </CloseButton>
              </StyledBox>
            }
          >
            {headerValue && (
              <HeaderTypography {...customProps.headerTypographyProps}>
                {headerValue}
              </HeaderTypography>
            )}
            <MessageWrapperBox header={headerValue || false} {...customProps.messageWrapperProps}>
              <MessageTypography {...customProps.messageTypographyProps}>
                {message}
              </MessageTypography>
            </MessageWrapperBox>
          </StyledAlert>
        </StyledWrapperBox>
      </Snackbar>
    );
  }
);

EnhancedSnackbar.displayName = 'EnhancedSnackbar';

export default EnhancedSnackbar;

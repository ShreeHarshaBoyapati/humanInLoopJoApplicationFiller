import { forwardRef } from 'react';
import type { ButtonProps } from '@mui/material';
import { Button } from '@mui/material';
import { styled, keyframes, type CSSObject } from '@mui/material/styles';
import styleConstants from './constants/style-constants';
import { primaryButtonImg } from '@repo/assets';

const moveBackground = keyframes`
  0% { background-position: 40% 40%; }
  50% { background-position: 60% 60%; }
  100% { background-position: 40% 40%; }
`;

type ColorThemeStyle = CSSObject & {
  color: string;
};

const colorThemeStyles = {
  primary: {
    background: 'transparent',
    color: styleConstants.white900,
    border: `1px solid ${styleConstants.grey700}`,
    position: 'relative',
    zIndex: 1,
    '&:hover,&:active': {
      scale: 1.05,
      fontWeight: 600,
      '&::after': {
        inset: '1px',
      },
    },
    '&:focus-visible': {
      outline: 'none',
    },
    '&::before': {
      content: '""',
      zIndex: -2,
      position: 'absolute',
      inset: '-3px',
      backgroundImage: `url(${primaryButtonImg})`,
      borderRadius: 'calc(0.5em + 3px)',
      backgroundSize: '200% 200%',
      transition: 'all .2s ease-in-out',
      animation: `${moveBackground} 30s ease-in-out infinite`,
    },
    '&::after': {
      content: '""',
      zIndex: -1,
      position: 'absolute',
      inset: 0,
      background: styleConstants.black700,
      borderRadius: 'inherit',
      transition: 'inset 0.3s ease',
    },
  },
  secondary: {
    background: styleConstants.black700,
    color: styleConstants.white900,
    border: `1px solid ${styleConstants.grey700}`,
    '&:hover,&:active': {
      scale: 1.05,
      background: styleConstants.white900,
      color: styleConstants.black700,
    },
    '&:focus-visible': {
      outline: 'none',
    },
  },
  tertiary: {
    background: styleConstants.black700,
    color: styleConstants.blue500,
    border: `1px solid ${styleConstants.grey700}`,
    transition: 'scale 0.5s ease',
    '&:hover,&:active': {
      scale: 1.05,
      borderColor: styleConstants.blue500,
    },
    '&:focus-visible': {
      outline: 'none',
    },
  },
  negativeSecondary: {
    background: styleConstants.black700,
    border: `1px solid ${styleConstants.grey700}`,
    color: styleConstants.red700,
    '&:hover,&:active': {
      scale: 1.05,
      borderColor: styleConstants.red600,
    },
    '&:focus-visible': {
      outline: 'none',
    },
  },
  hyperLinkTertiary: {
    background: 'transparent',
    color: styleConstants.blue500,
    padding: '0px',
    height: '0px',
    '&:hover,&:active': {
      scale: 1.05,
      background: 'transparent',
      color: styleConstants.blue500,
    },
    '&:focus-visible': {
      outline: 'none',
    },
    textDecoration: 'underline',
  },
} satisfies Record<string, ColorThemeStyle>;

type ColorTheme = keyof typeof colorThemeStyles;

const sizeStyles = {
  small: {
    minHeight: '28px',
    height: '2em',
    maxHeight: '32px',
    padding: '0.5em 1em',
    fontSize: '0.75rem',
    width: 'fit-content',
    fontWeight: 500,
    maxWidth: '144px',
  },
  medium: {
    minHeight: '38px',
    maxHeight: '42px',
    height: '2.3em',
    padding: '0.5em 1em',
    fontSize: '1rem',
    width: 'fit-content',
    fontWeight: 500,
    maxWidth: '144px',
  },
  large: {
    minHeight: '42px',
    maxHeight: '46px',
    height: '2.3em',
    padding: '0.5em 1em',
    fontSize: '1.125rem',
    width: 'fit-content',
    fontWeight: 500,
    maxWidth: '144px',
  },
} satisfies Record<string, CSSObject>;

type ButtonSize = keyof typeof sizeStyles;

const getThemeStyle = (colorTheme?: ColorTheme): CSSObject => {
  if (!colorTheme) return {};
  return colorThemeStyles[colorTheme] || {};
};

interface StyledButtonProps {
  colorTheme: ColorTheme;
  size?: ButtonSize;
}

const StyledButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'colorTheme',
})<StyledButtonProps>((props) => {
  const { size, colorTheme } = props;
  const sizeStyle = sizeStyles[size || 'medium'];
  const theme = getThemeStyle(colorTheme);

  return {
    ...sizeStyle,
    boxShadow: 'none',
    textTransform: 'none' as const,
    lineHeight: 1.2,
    fontFamily: styleConstants.secondaryFont,
    minWidth: 'auto',
    transition: 'scale 0.5s ease',
    borderRadius: styleConstants.borderRadius,
    '&:focus,&:focus-visible': {
      outline: 'none',
    },
    '&.Mui-disabled': {
      opacity: 0.4,
      color: theme.color,
    },
    ...theme,
  };
});

export interface EnhancedButtonProps extends Omit<ButtonProps, 'color' | 'variant'> {
  label?: string;
  testId?: string;
  colorTheme: ColorTheme;
  customProps?: {
    props?: Omit<
      ButtonProps,
      'id' | 'onClick' | 'startIcon' | 'endIcon' | 'customProps' | 'disabled' | 'type' | 'className'
    >;
    childProps?: {
      span?: React.HTMLAttributes<HTMLSpanElement>;
    };
  };
}

export const EnhancedButton = forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  (
    {
      id = '',
      testId = '',
      label,
      onClick,
      size = 'medium',
      colorTheme,
      startIcon,
      endIcon,
      customProps,
      disabled = false,
      type = 'button',
      className = '',
    },
    ref
  ) => {
    return (
      <StyledButton
        type={type}
        id={id}
        disableRipple
        disableElevation
        ref={ref}
        onClick={onClick}
        size={size}
        disabled={disabled}
        startIcon={startIcon}
        endIcon={endIcon}
        colorTheme={colorTheme}
        className={className}
        data-testid={testId}
        {...(customProps?.props || {})}
      >
        <span
          {...(customProps?.childProps?.span || {})}
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            ...(customProps?.childProps?.span?.style || {}),
          }}
        >
          {label}
        </span>
      </StyledButton>
    );
  }
);

EnhancedButton.displayName = 'EnhancedButton';

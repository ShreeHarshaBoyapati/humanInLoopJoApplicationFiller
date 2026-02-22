import { forwardRef, type ReactNode } from 'react';
import type { TextFieldProps, BoxProps } from '@mui/material';
import { TextField, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { EnhancedFieldLabel, EnhancedFieldLabelProps } from './field-label';
import styleConstants from './constants/style-constants';

type TextFieldVariant = 'default' | 'disabled' | 'error';
type TextFieldSize = 'small' | 'medium';
type TextFieldType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url';

interface StyledTextFieldProps {
  hasStartIcon?: boolean;
  size?: TextFieldSize;
}

const StyledTextField = styled(TextField, {
  shouldForwardProp: (prop) => prop !== 'hasStartIcon' && prop !== 'size',
})<StyledTextFieldProps>((prop) => {
  const { size } = prop;
  return {
    '& .MuiOutlinedInput-root input': {
      '&::placeholder': {
        WebkitTextFillColor: styleConstants.grey500,
        color: styleConstants.grey500,
        opacity: 1,
      },
    },
    '& .MuiOutlinedInput-root': {
      lineHeight: 1.2,
      borderRadius: styleConstants.borderRadius,
      backgroundColor: styleConstants.black800,
      minHeight: size === 'small' ? '28px' : '38px',
      height: '2em',
      maxHeight: size === 'small' ? '32px' : '42px',
      padding: '0px',
      flex: 1,
      alignItems: 'center',
      '& fieldset,&:hover fieldset': {
        borderColor: styleConstants.grey700,
        borderWidth: '1px',
      },

      '&:hover': {
        backgroundColor: styleConstants.grey300,
      },

      '&.Mui-focused fieldset': {
        borderColor: styleConstants.blue500,
        borderWidth: '1px',
      },
      '&.Mui-focused': {
        backgroundColor: styleConstants.black800,
      },

      '& input': {
        padding: '0em 1em',
        color: styleConstants.white900,
        WebkitTextFillColor: styleConstants.white900,
        height: '1em',
        fontSize: size === 'small' ? '0.8rem' : '1rem',
        lineHeight: 1.2,
      },

      '&.Mui-disabled': {
        opacity: 0.4,
        backgroundColor: styleConstants.black800,
      },
      '&.Mui-disabled fieldset': {
        borderColor: styleConstants.grey700,
      },
    },

    '& .Mui-error': {
      '& .MuiOutlinedInput-notchedOutline,&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: styleConstants.red600,
      },
      '& input,&:hover input': {
        color: styleConstants.red700,
        WebkitTextFillColor: styleConstants.red700,
      },

      '&:hover .MuiOutlinedInput-root': {
        backgroundColor: styleConstants.grey300,
      },

      '&.Mui-focused .MuiOutlinedInput-notchedOutline ': {
        borderColor: styleConstants.blue500,
        borderWidth: '1px',
        boxShadow: 'none',
      },
      '&.Mui-focused .MuiOutlinedInput-root': {
        backgroundColor: styleConstants.black800,
      },
      '&.Mui-focused input,&.Mui-focused:hover input': {
        color: styleConstants.white900,
        WebkitTextFillColor: styleConstants.white900,
      },
    },

    '& .MuiInputLabel-root': {
      display: 'none',
    },

    '& .MuiFormHelperText-root': {
      fontSize: '0.7em',
      lineHeight: 1.2,
      color: styleConstants.white700,
      marginTop: '0.37em',
      marginLeft: 0,
      marginRight: 0,
    },
  };
});

const renderStartAdornment = (startIcon: ReactNode, props: BoxProps) => {
  if (!startIcon) return null;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: '0.5em',
        height: '100%',
        borderRight: `1px solid ${styleConstants.grey700}`,
        cursor: 'auto',
      }}
      {...(props || {})}
    >
      {startIcon}
    </Box>
  );
};

const renderEndAdornment = (endIcon: ReactNode, props: BoxProps = {}) => {
  if (!endIcon) return null;
  return (
    <Box
      {...(props || {})}
      sx={{
        display: 'flex',
        alignItems: 'center',
        paddingRight: '0.5em',
        height: '100%',
        cursor: 'auto',
        ...(props?.sx || {}),
      }}
    >
      {endIcon}
    </Box>
  );
};

type CustomProps = {
  props?: Partial<Omit<TextFieldProps, 'size' | 'variant' | 'type' | 'slotProps'>>;
  childProps?: {
    parentBox?: Partial<BoxProps>;
    fieldLabel?: Partial<Omit<EnhancedFieldLabelProps, 'label' | 'showTooltip' | 'tooltipText'>>;
    textfieldBox?: Partial<BoxProps>;
    slotProps?: Partial<TextFieldProps['slotProps']>;
    startIconProps?: Partial<BoxProps>;
    endIconProps?: Partial<BoxProps>;
  };
};

interface EnhancedTextFieldProps extends Omit<TextFieldProps, 'size' | 'variant' | 'type'> {
  label?: string;
  testId?: string;
  variant?: TextFieldVariant;
  size?: TextFieldSize;
  type?: TextFieldType;
  showTooltip?: boolean;
  tooltipText?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  customProps?: Partial<CustomProps>;
}

export const EnhancedTextField = forwardRef<HTMLInputElement, EnhancedTextFieldProps>(
  (
    {
      id = '',
      testId = '',
      label = '',
      placeholder,
      value,
      onChange,
      onKeyDown,
      variant = 'default',
      size = 'medium',
      type = 'text',
      helperText,
      showTooltip = false,
      tooltipText = 'How to use this component',
      startIcon,
      endIcon,
      customProps = {
        props: {},
        childProps: {
          parentBox: {},
          fieldLabel: {},
          textfieldBox: {},
          slotProps: {
            htmlInput: {},
            input: {},
          },
          startIconProps: {},
          endIconProps: {},
        },
      },
    },
    ref
  ) => {
    return (
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          gap: '.5em',
        }}
        {...(customProps?.childProps?.parentBox || {})}
      >
        {label && (
          <EnhancedFieldLabel
            label={label}
            showTooltip={showTooltip}
            tooltipText={tooltipText}
            {...(customProps?.childProps?.fieldLabel || {})}
          />
        )}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
          }}
          {...(customProps?.childProps?.textfieldBox || {})}
        >
          <StyledTextField
            id={id}
            inputRef={ref}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            type={type}
            variant="outlined"
            size={size}
            disabled={variant === 'disabled'}
            error={Boolean(
              value && typeof value === 'string' && value.length > 0 && variant === 'error'
            )}
            helperText={
              value && typeof value === 'string' && value.length > 0 && variant === 'error'
                ? helperText
                : undefined
            }
            hasStartIcon={!!startIcon}
            {...customProps.props}
            slotProps={{
              ...customProps?.childProps?.slotProps,
              htmlInput: {
                'data-testId': testId,
                ...(customProps.childProps?.slotProps?.htmlInput || {}),
              },
              input: {
                startAdornment: renderStartAdornment(
                  startIcon,
                  customProps.childProps?.startIconProps || {}
                ),
                endAdornment: renderEndAdornment(endIcon, customProps.childProps?.endIconProps),
                ...customProps?.childProps?.slotProps?.input,
              },
            }}
          />
        </Box>
      </Box>
    );
  }
);

EnhancedTextField.displayName = 'EnhancedTextField';

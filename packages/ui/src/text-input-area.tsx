import { forwardRef } from 'react';
import type { TextFieldProps, BoxProps } from '@mui/material';
import { TextField, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { EnhancedFieldLabel, EnhancedFieldLabelProps } from './field-label';
import styleConstants from './constants/style-constants';

type TextInputAreaVariant = 'default' | 'disabled' | 'error';
type TextInputAreaSize = 'small' | 'medium';

interface StyledTextInputAreaProps {
  size?: TextInputAreaSize;
}

const StyledTextInputArea = styled(TextField, {
  shouldForwardProp: (prop) => prop !== 'size',
})<StyledTextInputAreaProps>((prop) => {
  const { size } = prop;
  return {
    width: '100%',
    '& .MuiOutlinedInput-root textarea': {
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
      padding: '0.8em 0px',
      flex: 1,
      alignItems: 'flex-start',
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

      '& textarea': {
        padding: '0 1em',
        color: styleConstants.white900,
        WebkitTextFillColor: styleConstants.white900,
        fontSize: size === 'small' ? '0.8rem' : '1rem',
        lineHeight: 1.5,
        scrollbarGutter: 'stable',
        overflowY: 'auto !important',
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'transparent !important',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'transparent !important',
          borderRadius: '8px',
        },
        '&:hover': {
          scrollbarWidth: 'auto',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track:hover': {
            backgroundColor: `${styleConstants.black800} !important`,
            borderRadius: '8px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: `${styleConstants.grey500} !important`,
            borderRadius: '8px',
          },
        },
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
      '& textarea,&:hover textarea': {
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
      '&.Mui-focused textarea,&.Mui-focused:hover textarea': {
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
      '&.Mui-error': {
        color: styleConstants.red700,
      },
    },
  };
});

type CustomProps = {
  props?: Partial<Omit<TextFieldProps, 'size' | 'variant'>>;
  childProps?: {
    parentBox?: Partial<BoxProps>;
    fieldLabel?: Partial<Omit<EnhancedFieldLabelProps, 'label' | 'showTooltip' | 'tooltipText'>>;
    textfieldBox?: Partial<BoxProps>;
    slotProps?: Partial<TextFieldProps['slotProps']>;
  };
};

export interface EnhancedTextInputAreaProps extends Omit<TextFieldProps, 'size' | 'variant'> {
  label?: string;
  testId?: string;
  variant?: TextInputAreaVariant;
  size?: TextInputAreaSize;
  showTooltip?: boolean;
  tooltipText?: string;
  customProps?: Partial<CustomProps>;
}

export const EnhancedTextInputArea = forwardRef<HTMLInputElement, EnhancedTextInputAreaProps>(
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
      helperText,
      showTooltip = false,
      tooltipText = 'How to use this component',
      minRows = 3,
      maxRows = 3,
      customProps = {
        props: {},
        childProps: {
          parentBox: {},
          fieldLabel: {},
          textfieldBox: {},
          slotProps: {
            htmlInput: {},
          },
        },
      },
      ...rest
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
            alignItems: 'flex-start',
            width: '100%',
          }}
          {...(customProps?.childProps?.textfieldBox || {})}
        >
          <StyledTextInputArea
            id={id}
            inputRef={ref}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            variant="outlined"
            size={size}
            multiline
            minRows={minRows}
            maxRows={maxRows}
            disabled={variant === 'disabled'}
            error={Boolean(variant === 'error')}
            helperText={variant === 'error' ? helperText : undefined}
            {...customProps.props}
            {...rest}
            slotProps={{
              ...customProps?.childProps?.slotProps,
              htmlInput: {
                'data-testid': testId,
                ...(customProps.childProps?.slotProps?.htmlInput || {}),
              },
            }}
          />
        </Box>
      </Box>
    );
  }
);

EnhancedTextInputArea.displayName = 'EnhancedTextInputArea';

export default EnhancedTextInputArea;

import { forwardRef, useRef, useEffect } from 'react';
import { Box, type BoxProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { EnhancedFieldLabel, type EnhancedFieldLabelProps } from './field-label';
import styleConstants from './constants/style-constants';

type VerificationCodeSize = 'small' | 'medium';

interface StyledInputProps {
  size?: VerificationCodeSize;
  hasError?: boolean;
}

const StyledInput = styled('input', {
  shouldForwardProp: (prop) => prop !== 'size' && prop !== 'hasError',
})<StyledInputProps>((props) => {
  const { size, hasError } = props;
  return {
    width: size === 'small' ? '40px' : '48px',
    height: size === 'small' ? '48px' : '56px',
    borderRadius: styleConstants.borderRadius,
    backgroundColor: styleConstants.black800,
    border: `1px solid ${hasError ? styleConstants.red600 : styleConstants.grey700}`,
    color: hasError ? styleConstants.red700 : styleConstants.white900,
    fontSize: size === 'small' ? '1.25rem' : '1.5rem',
    fontWeight: 600,
    textAlign: 'center',
    outline: 'none',
    transition: 'all 0.2s ease',
    flexShrink: 0,

    '&::placeholder': {
      color: styleConstants.grey500,
    },

    '&:hover:not(:disabled)': {
      backgroundColor: styleConstants.grey300,
      borderColor: hasError ? styleConstants.red600 : styleConstants.grey700,
    },

    '&:focus': {
      backgroundColor: styleConstants.black800,
      borderColor: hasError ? styleConstants.red600 : styleConstants.blue500,
      borderWidth: '1px',
    },

    '&:disabled': {
      opacity: 0.4,
      backgroundColor: styleConstants.black800,
      cursor: 'not-allowed',
    },

    '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
      WebkitAppearance: 'none',
      margin: 0,
    },
    '&[type=number]': {
      MozAppearance: 'textfield',
    },
  };
});

type CustomProps = {
  props?: Partial<React.InputHTMLAttributes<HTMLInputElement>>;
  childProps?: {
    parentBox?: Partial<BoxProps>;
    labelProps?: Partial<Omit<EnhancedFieldLabelProps, 'label' | 'showTooltip' | 'tooltipText'>>;
    inputsContainer?: Partial<BoxProps>;
    inputBox?: Partial<BoxProps>;
  };
};

interface EnhancedVerificationCodeProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  label?: string;
  testId?: string;
  size?: VerificationCodeSize;
  autoFocus?: boolean;
  customProps?: CustomProps;
}

export const VerificationCode = forwardRef<HTMLInputElement, EnhancedVerificationCodeProps>(
  (
    {
      length = 6,
      value = '',
      onChange,
      onComplete,
      disabled = false,
      error = false,
      helperText = '',
      label = '',
      testId = '',
      size = 'medium',
      autoFocus = true,
      customProps = {
        props: {},
        childProps: {
          parentBox: {},
          labelProps: {},
          inputsContainer: {},
          inputBox: {},
        },
      },
    },
    ref
  ) => {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Get value for specific index
    const getDigit = (index: number): string => {
      return value[index] || '';
    };

    // Check if code is complete
    const isComplete = (code: string): boolean => {
      return code.length === length;
    };

    // Update value and trigger callbacks
    const updateCode = (newCode: string, focusIndex?: number) => {
      onChange?.(newCode);
      if (isComplete(newCode)) {
        onComplete?.(newCode);
      }
      if (focusIndex !== undefined && focusIndex >= 0 && focusIndex < length) {
        inputRefs.current[focusIndex]?.focus();
      }
    };

    const handleInputChange = (index: number, inputValue: string) => {
      const digit = inputValue.slice(-1);
      if (!/^\d*$/.test(digit)) return;

      // Build new value - pad to ensure we can replace at any position
      const currentValue = value.padEnd(length, ' ');
      const newValue = (currentValue.slice(0, index) + digit + currentValue.slice(index + 1)).slice(
        0,
        length
      );

      // Focus next if digit entered and not last
      const nextFocus = digit && index < length - 1 ? index + 1 : undefined;
      updateCode(newValue.trimEnd(), nextFocus);
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'Backspace':
          e.preventDefault();
          {
            // Pad value to ensure we can modify at any position
            const currentValue = value.padEnd(length, ' ');
            let newValue: string;
            let nextFocus: number | undefined;

            if (getDigit(index)) {
              // Current has value: clear it and move to previous
              newValue = currentValue.slice(0, index) + ' ' + currentValue.slice(index + 1);
              nextFocus = index > 0 ? index - 1 : undefined;
            } else if (index > 0) {
              // Current is empty, move to previous and clear it
              newValue = currentValue.slice(0, index - 1) + ' ' + currentValue.slice(index);
              nextFocus = index - 1;
            } else {
              // At first box and empty, just clear
              newValue = currentValue;
              nextFocus = undefined;
            }
            updateCode(newValue.trimEnd(), nextFocus);
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (index > 0) inputRefs.current[index - 1]?.focus();
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (index < length - 1) inputRefs.current[index + 1]?.focus();
          break;

        case 'Delete':
          e.preventDefault();
          {
            const currentValue = value.padEnd(length, ' ');
            const newValue = currentValue.slice(0, index) + ' ' + currentValue.slice(index + 1);
            updateCode(newValue.trimEnd());
          }
          break;
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      if (!pasted) return;

      const focusIndex = Math.min(pasted.length, length - 1);
      updateCode(paddedValue(pasted), focusIndex);
    };

    const paddedValue = (val: string): string => val.padEnd(length, ' ').slice(0, length);

    const handleFocus = (index: number) => {
      inputRefs.current[index]?.select();
    };

    // Set ref to first input
    useEffect(() => {
      const firstInput = inputRefs.current[0];
      if (!firstInput) return;

      if (typeof ref === 'function') {
        ref(firstInput);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = firstInput;
      }
    }, [ref]);

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
            showTooltip={false}
            {...(customProps?.childProps?.labelProps || {})}
          />
        )}

        <Box
          sx={{
            display: 'flex',
            gap: '0.75em',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
          {...(customProps?.childProps?.inputsContainer || {})}
        >
          {Array.from({ length }, (_, index) => (
            <Box key={index} {...(customProps?.childProps?.inputBox || {})}>
              <StyledInput
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={getDigit(index)}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                onFocus={() => handleFocus(index)}
                disabled={disabled}
                hasError={error}
                // @ts-expect-error - size is handled by shouldForwardProp
                size={size}
                autoFocus={autoFocus && index === 0}
                data-testid={testId ? `${testId}-input-${index}` : undefined}
                {...customProps?.props}
              />
            </Box>
          ))}
        </Box>

        {error && helperText && (
          <Box
            sx={{
              fontSize: '0.7em',
              lineHeight: 1.2,
              color: styleConstants.red700,
              marginTop: '0.37em',
            }}
          >
            {helperText}
          </Box>
        )}
      </Box>
    );
  }
);

VerificationCode.displayName = 'VerificationCode';

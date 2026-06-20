import { Box, Typography, Autocomplete, TextField, styled, CircularProgress } from '@mui/material';
import type { BoxProps, TypographyOwnProps } from '@mui/material';
import type { SyntheticEvent } from 'react';
import { forwardRef, type ReactNode, type HTMLAttributes } from 'react';
import styleConstants from './constants/style-constants.js';
import scrollbarStyles from './scroll-bar.module.css';
import { EnhancedFieldLabel, type EnhancedFieldLabelProps } from './field-label.js';
import ArrowDownIcon from './icons/arrow-down.js';
import ClearIcon from './icons/clear.js';

const RootContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  width: '100%',
  gap: `calc(${styleConstants.spacing} * 2)`,
});

interface HelperTextProps {
  error?: boolean;
}
// prettier-ignore
const HelperText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'error',
}) < HelperTextProps > (({ error = false }) => ({
  fontStyle: 'normal',
  marginTop: '0.37em',
  fontWeight: 400,
  fontSize: '0.7rem',
  lineHeight: 1.2,
  color: error ? styleConstants.red700 : styleConstants.white700,
}));

// Styled TextField to match the Select styles
const StyledTextField = styled(TextField)(() => ({
  width: '100%',
  '& .MuiOutlinedInput-root': {
    backgroundColor: styleConstants.black800,
    borderRadius: styleConstants.borderRadius,
    minHeight: '33px',
    maxHeight: '38px',
    '& fieldset': {
      border: `1px solid ${styleConstants.grey700}`,
      borderRadius: styleConstants.borderRadius,
    },
    '&:hover': {
      backgroundColor: styleConstants.grey300,
      '& fieldset': {
        border: `1px solid ${styleConstants.grey700}`,
      },
    },
    '&.Mui-focused': {
      backgroundColor: styleConstants.black800,
      '& fieldset': {
        border: `1px solid ${styleConstants.blue500}`,
      },
    },
    '&.Mui-error': {
      '& fieldset': {
        border: `1px solid ${styleConstants.red600}`,
      },
    },
    '&.Mui-disabled': {
      opacity: 0.4,
      '& fieldset': {
        border: `1px solid ${styleConstants.grey700}`,
      },
      '&:hover': {
        backgroundColor: styleConstants.black800,
      },
    },
  },
  '& .MuiInputBase-input': {
    fontSize: '1rem',
    padding: '0.5em 1em',
    lineHeight: 1.2,
    color: styleConstants.white900,
    '&::placeholder': {
      color: styleConstants.white700,
      opacity: 0.7,
    },
  },
}));

// Popper styles for the dropdown
const autocompletePaperStyles = {
  borderRadius: styleConstants.borderRadius,
  border: `1px solid ${styleConstants.grey700}`,
  backgroundColor: styleConstants.black800,
  marginTop: '2px',
};

const autocompleteListboxStyles = {
  padding: `calc(${styleConstants.spacing} * 2)`,
  display: 'flex',
  flexDirection: 'column',
  gap: `calc(${styleConstants.spacing} * 2)`,
  '& .MuiAutocomplete-option': {
    display: 'flex',
    alignItems: 'center',
    padding: `calc(${styleConstants.spacing} * 3) calc(${styleConstants.spacing} * 3)`,
    borderRadius: styleConstants.borderRadius,
    fontSize: '0.75rem',
    minHeight: 'fit-content',
    color: styleConstants.white700,
    '&:hover': {
      backgroundColor: styleConstants.grey300,
    },
    '&.Mui-focused': {
      backgroundColor: 'transparent',
    },
    '&.Mui-selected': {
      backgroundColor: styleConstants.blue500,
      color: styleConstants.white900,
      '&.Mui-focused': {
        backgroundColor: styleConstants.blue500,
      },
      '&:hover': {
        backgroundColor: styleConstants.blue500,
      },
    },
  },
};

interface ListboxFooterWrapperProps extends HTMLAttributes<HTMLUListElement> {
  footer?: ReactNode;
}

const ListboxFooterWrapper = forwardRef<HTMLUListElement, ListboxFooterWrapperProps>(
  ({ children, footer, ...rest }, ref) => {
    return (
      <Box component="ul" ref={ref} {...rest}>
        {children}
        {footer && (
          <Box
            component="li"
            role="presentation"
            aria-hidden="true"
            sx={{
              padding: `calc(${styleConstants.spacing} * 3)`,
              textAlign: 'center',
              cursor: 'default',
            }}
          >
            {footer}
          </Box>
        )}
      </Box>
    );
  }
);

ListboxFooterWrapper.displayName = 'ListboxFooterWrapper';

export type AutocompleteOption = {
  value: string | number;
  label: string;
};

export interface EnhancedAutocompleteDropdownProps {
  id: string;
  testId: string;
  label?: string;
  showTooltip?: boolean;
  tooltipText?: string;
  showSupportingText?: boolean;
  supportingText?: string;
  showErrorMsg?: boolean;
  errorText?: string;
  error?: boolean;
  options: AutocompleteOption[];
  value: AutocompleteOption | null;
  onChange: (value: AutocompleteOption | null) => void;
  onInputChange?: (value: string) => void;
  inputValue?: string;
  onOpen?: () => void;
  onClose?: () => void;
  loading?: boolean;
  placeholder?: string;
  loadingText?: string;
  disabled?: boolean;
  width?: string | number | null;
  listboxFooter?: ReactNode;
  customProps?: {
    childProps?: {
      containerProps?: Partial<BoxProps>;
      fieldLabel?: Partial<Omit<EnhancedFieldLabelProps, 'label' | 'showTooltip' | 'tooltipText'>>;
      autocompleteContainerProps?: Partial<BoxProps>;
      supportingTextContainerProps?: Partial<BoxProps>;
      supportingTextProps?: HelperTextProps;
      errorContainerProps?: Partial<BoxProps>;
      errorTextProps?: Partial<TypographyOwnProps>;
    };
  };
}

export const EnhancedAutocompleteDropdown = forwardRef<
  HTMLDivElement,
  EnhancedAutocompleteDropdownProps
>((props) => {
  const {
    id = '',
    testId = '',
    label = '',
    showTooltip = false,
    tooltipText = '',
    showSupportingText = false,
    supportingText = 'This is a supporting text.',
    options = [],
    value = null,
    onChange,
    onInputChange,
    inputValue: controlledInputValue,
    onOpen,
    onClose,
    loading = false,
    loadingText = 'Loading...',
    placeholder = 'Search...',
    disabled = false,
    error = false,
    showErrorMsg = false,
    errorText = 'Missing or invalid value.',
    width = '100%',
    listboxFooter,
    customProps = {
      childProps: {
        containerProps: {},
        fieldLabel: {},
        autocompleteContainerProps: {},
        supportingTextContainerProps: {},
        supportingTextProps: {},
        errorContainerProps: {},
        errorTextProps: {},
      },
    },
  } = props;

  return (
    <RootContainer {...(customProps?.childProps?.containerProps || {})}>
      {label && (
        <EnhancedFieldLabel
          label={label}
          showTooltip={showTooltip}
          tooltipText={tooltipText}
          {...(customProps?.childProps?.fieldLabel || {})}
        />
      )}
      <Box
        {...(customProps?.childProps?.autocompleteContainerProps || {})}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          width: width,
          ...(customProps?.childProps?.autocompleteContainerProps?.sx || {}),
        }}
      >
        <Autocomplete<AutocompleteOption, false, false, false>
          id={id}
          data-testid={testId}
          options={options}
          {...(controlledInputValue !== undefined ? { inputValue: controlledInputValue } : {})}
          onChange={(_: SyntheticEvent, newValue: AutocompleteOption | null) => {
            onChange(newValue);
          }}
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          onInputChange={(_: SyntheticEvent, newInputValue: string, _reason: string) => {
            if (onInputChange) {
              onInputChange(newInputValue);
            }
          }}
          onOpen={() => {
            onOpen?.();
          }}
          onClose={() => {
            onClose?.();
          }}
          disabled={disabled}
          loading={loading}
          disableClearable={false}
          clearOnBlur={false}
          clearOnEscape
          openOnFocus
          getOptionLabel={(option: AutocompleteOption) => option.label}
          isOptionEqualToValue={(
            option: AutocompleteOption,
            optionValue: AutocompleteOption | null | undefined
          ) => {
            if (optionValue === null || optionValue === undefined) return false;
            return option.value === optionValue.value;
          }}
          getOptionKey={(option) => option.value}
          renderOption={(props, option, state) => {
            return (
              <Box
                component="li"
                {...props}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: `calc(${styleConstants.spacing} * 3)`,
                  borderRadius: styleConstants.borderRadius,
                  fontSize: '0.75rem',
                  minHeight: 'fit-content',
                  color: state.selected ? styleConstants.white900 : styleConstants.white700,
                  cursor: 'pointer',
                  backgroundColor: state.selected ? styleConstants.blue500 : 'transparent',
                  '&:hover': {
                    backgroundColor: state.selected
                      ? styleConstants.blue500
                      : styleConstants.grey300,
                  },
                  '&.Mui-focused': {
                    backgroundColor: state.selected ? styleConstants.blue500 : 'transparent',
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    lineHeight: 1.2,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: '0px',
                  }}
                >
                  {option.label}
                </Typography>
              </Box>
            );
          }}
          value={value ?? null}
          popupIcon={<ArrowDownIcon />}
          clearIcon={<ClearIcon />}
          slotProps={{
            clearIndicator: {
              sx: {
                padding: '4px',
              },
            },
            popupIndicator: {
              sx: {
                padding: '4px',
              },
            },
            paper: {
              sx: autocompletePaperStyles,
            },
            listbox: {
              component: ListboxFooterWrapper,
              className: scrollbarStyles.scrollbarVerticalContainer,
              sx: autocompleteListboxStyles,
              footer: listboxFooter,
            } as HTMLAttributes<HTMLUListElement> & { footer?: ReactNode },
          }}
          renderInput={(params) => {
            return (
              <StyledTextField
                {...params}
                placeholder={placeholder}
                error={error}
                disabled={disabled}
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading ? (
                          <CircularProgress size={16} sx={{ color: styleConstants.white700 }} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                  htmlInput: params.inputProps,
                }}
              />
            );
          }}
          noOptionsText={
            <Box
              sx={{
                alignItems: 'center',
                color: styleConstants.white700,
                display: 'flex',
                flexDirection: 'column',
                fontSize: '0.75rem',
                gap: `calc(${styleConstants.spacing} * 2)`,
                justifyContent: 'center',
                padding: `calc(${styleConstants.spacing} * 2)`,
              }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ color: styleConstants.white700 }} />
                  <Typography sx={{ color: styleConstants.white700, fontSize: '0.75rem' }}>
                    {loadingText}
                  </Typography>
                </>
              ) : (
                <Typography sx={{ color: styleConstants.white700, fontSize: '0.75rem' }}>
                  No options
                </Typography>
              )}
            </Box>
          }
        />
        {showSupportingText && (
          <Box {...(customProps?.childProps?.supportingTextContainerProps || {})}>
            <HelperText {...(customProps?.childProps?.supportingTextProps || {})}>
              {supportingText}
            </HelperText>
          </Box>
        )}
        {error && showErrorMsg && (
          <Box {...(customProps?.childProps?.errorContainerProps || {})}>
            <HelperText error {...(customProps?.childProps?.errorTextProps || {})}>
              {errorText}
            </HelperText>
          </Box>
        )}
      </Box>
    </RootContainer>
  );
});

EnhancedAutocompleteDropdown.displayName = 'EnhancedAutocompleteDropdown';

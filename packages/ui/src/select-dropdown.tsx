import {
  Box,
  BoxProps,
  Menu,
  MenuItem,
  MenuItemProps,
  Select,
  SelectProps,
  Typography,
  TypographyOwnProps,
  styled,
} from '@mui/material';
import { forwardRef } from 'react';
import styleConstants from './constants/style-constants';
import { EnhancedFieldLabel, EnhancedFieldLabelProps } from './field-label.js';
import ArrowDownIcon from './icons/arrow-down.js';

const RootContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  width: '100%',
  gap: `calc(${styleConstants.spacing} * 2)`,
});

const StyledSelect = styled(Select)(() => ({
  backgroundColor: styleConstants.black800,
  borderRadius: styleConstants.borderRadius,
  width: '100%',
  height: '2rem',
  minHeight: '38px',
  maxHeight: '42px',

  '&:hover': {
    backgroundColor: styleConstants.grey300,
  },
  '&.Mui-error .MuiOutlinedInput-notchedOutline': {
    borderColor: styleConstants.red600,
  },
  '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
    borderColor: styleConstants.grey700,
  },
  '&.Mui-disabled:hover': {
    backgroundColor: styleConstants.black800,
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: styleConstants.blue500,
    borderWidth: '1px',
  },
  '&.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderWidth: '1px',
  },

  '.MuiOutlinedInput-notchedOutline,&:hover .MuiOutlinedInput-notchedOutline': {
    border: `1px solid ${styleConstants.grey700}`,
    borderRadius: styleConstants.borderRadius,
  },

  '.MuiSelect-select': {
    fontSize: '1rem',
    padding: `0.5em 1em`,
    lineHeight: 1.2,
    color: styleConstants.white900,
    '&.Mui-disabled': {
      color: styleConstants.white900,
      WebkitTextFillColor: styleConstants.white900,
      opacity: '0.4',
    },
  },
  '.MuiSelect-select.MuiInputBase-input.MuiOutlinedInput-input': {
    paddingRight: '0.5em',
  },
  '.MuiSelect-icon': {
    top: 'calc(50% - 3px)',
    right: '0.875em',
  },
}));

export const menuListStyles = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: `calc(${styleConstants.spacing} * 2)`,
  padding: `calc(${styleConstants.spacing} * 2) calc(${styleConstants.spacing} * 2)`,
};

export const StyledMenu = styled(Menu)({
  '& .MuiPaper-root': {
    borderRadius: styleConstants.borderRadius,
    border: `1px solid ${styleConstants.grey700}`,
    backgroundColor: styleConstants.black800,
    transform: 'translateY(2px)',
    opacity: 1,
    backdropFilter: 'blur(10px)',
    minWidth: 0,
    padding: 0,
  },
  '& .MuiList-root.MuiMenu-list': {
    ...menuListStyles,
  },
});

export const StyledMenuItem = styled(MenuItem)({
  display: 'flex',
  alignItems: 'center',
  alignSelf: 'stretch',
  padding: `calc(${styleConstants.spacing} * 3) calc(${styleConstants.spacing} * 3)`,
  gap: `calc(${styleConstants.spacing} * 2)`,
  borderRadius: styleConstants.borderRadius,
  fontSize: '0.75rem',
  minHeight: 'fit-content',
  '&:hover': {
    backgroundColor: styleConstants.grey300,
  },
  '&.Mui-selected': {
    backgroundColor: styleConstants.blue500,
    '&.Mui-focusVisible': {
      backgroundColor: styleConstants.blue500,
    },
    '&:hover': {
      backgroundColor: styleConstants.blue500,
    },
  },
  '&.Mui-focusVisible': {
    backgroundColor: 'transparent',
  },
  '& .MuiTypography-root': {
    color: styleConstants.white700,
    fontSize: '0.75rem',
    fontStyle: 'normal',
    fontWeight: 500,
    lineHeight: 1.2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: '0px',
  },
});
interface HelperTextProps {
  error?: boolean;
}
const HelperText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'error',
})<HelperTextProps>(({ error = false }) => ({
  fontStyle: 'normal',
  marginTop: '0.37em',
  fontWeight: 400,
  fontSize: '0.7rem',
  lineHeight: 1.2,
  color: error ? styleConstants.red700 : styleConstants.white700,
}));

export const menuPaperStyles = {
  borderRadius: styleConstants.borderRadius,
  border: `1px solid ${styleConstants.grey700}`,
  backgroundColor: styleConstants.black800,
  transform: 'translateY(2px)',
  opacity: 1,
};

export type EnhancedSelectDropdownProps<Value = string | number | readonly string[]> =
  SelectProps<Value> & {
    testId: string;
    label?: string;
    showTooltip?: boolean;
    tooltipText?: string;
    showSupportingText?: boolean;
    supportingText?: string;
    showErrorMsg?: boolean;
    errorText?: string;
    options?: {
      dataId?: string;
      value: string | number | readonly string[];
      label: React.ReactNode | string;
    }[];
    noOfVisibleChips?: number;
    width?: string | number | null;
    customProps?: {
      props?: Partial<
        Omit<
          SelectProps<Value>,
          | 'value'
          | 'onChange'
          | 'id'
          | 'disabled'
          | 'error'
          | 'displayEmpty'
          | 'renderValue'
          | 'MenuProps'
        >
      >;
      childProps?: {
        containerProps?: Partial<BoxProps>;
        fieldLabel?: Partial<
          Omit<EnhancedFieldLabelProps, 'label' | 'showTooltip' | 'tooltipText'>
        >;
        selectContainerProps?: Partial<BoxProps>;
        menuItemProps?: Partial<MenuItemProps>;
        supportingTextContainerProps?: Partial<BoxProps>;
        supportingTextProps?: HelperTextProps;
        errorContainerProps?: Partial<BoxProps>;
        errorTextProps?: Partial<TypographyOwnProps>;
        renderValueProps?: {
          placeholderProps?: React.HTMLAttributes<HTMLSpanElement>;
          singleSelectContainerProps?: Partial<BoxProps>;
        };
      };
    };
  };

export const EnhancedSelectDropdown = forwardRef<HTMLSelectElement, EnhancedSelectDropdownProps>(
  (
    {
      id = '',
      testId = '',
      label = '',
      showTooltip = false,
      tooltipText = '',
      showSupportingText = false,
      supportingText = 'This is a supporting text.',
      value = '',
      onChange = () => {},
      disabled = false,
      error = false,
      showErrorMsg = false,
      errorText = 'Missing or invalid value.',
      options = [],
      width = '100%',
      customProps = {
        props: {},
        childProps: {
          containerProps: {},
          fieldLabel: {},
          selectContainerProps: {},
          menuItemProps: {},
          supportingTextContainerProps: {},
          supportingTextProps: {},
          errorContainerProps: {},
          errorTextProps: {},
          renderValueProps: {
            placeholderProps: {},
            singleSelectContainerProps: {},
          },
        },
      },
    },
    ref
  ) => {
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
          {...(customProps?.childProps?.selectContainerProps || {})}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            width: width,
          }}
        >
          <StyledSelect
            ref={ref}
            value={value}
            /* eslint-disable @typescript-eslint/no-explicit-any */
            onChange={onChange as any}
            disabled={disabled}
            error={error}
            IconComponent={(iconProps) => <ArrowDownIcon {...iconProps} />}
            MenuProps={{
              anchorOrigin: {
                vertical: 'bottom',
                horizontal: 'left',
              },
              transformOrigin: {
                vertical: 'top',
                horizontal: 'left',
              },
              slotProps: {
                paper: {
                  style: {
                    ...menuPaperStyles,
                  },
                },
              },
              sx: {
                '& .MuiList-root.MuiMenu-list': menuListStyles,
              },
            }}
            displayEmpty
            renderValue={(selected) => {
              if (!selected || (typeof selected === 'string' && selected.length === 0)) {
                return (
                  <span
                    style={{
                      fontSize: '1rem',
                      position: 'relative',
                      top: '2px',
                      lineHeight: 1.2,
                      color: styleConstants.white700,
                      WebkitTextFillColor: styleConstants.white700,
                    }}
                    {...(customProps?.childProps?.renderValueProps?.placeholderProps || {})}
                  >
                    Select
                  </span>
                );
              }
              return (
                <Box
                  sx={{
                    width: 'calc(100% - 1.625em)',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    position: 'relative',
                    top: '2px',
                  }}
                  {...(customProps?.childProps?.renderValueProps?.singleSelectContainerProps || {})}
                >
                  {options.find((opt) => opt.value === selected)?.label}
                </Box>
              );
            }}
            {...(customProps?.props || {})}
            id={id}
            inputProps={{
              id: id,
              'data-testid': testId,
            }}
          >
            {options.length > 0 ? (
              options.map((option, index) => (
                <StyledMenuItem
                  id={`${option.dataId}-${index}`}
                  key={index}
                  value={option.value}
                  data-testid={`${option.dataId}-${index}`}
                  {...(customProps?.childProps?.menuItemProps || {})}
                >
                  <Typography>{String(option.label)}</Typography>
                </StyledMenuItem>
              ))
            ) : (
              <StyledMenuItem
                id="no-options"
                key="no-options"
                value="no-options"
                data-testid="no-options-dropdownValue"
                sx={{ pointerEvents: 'none' }}
                {...(customProps?.childProps?.menuItemProps || {})}
              >
                <Typography>No-options</Typography>
              </StyledMenuItem>
            )}
          </StyledSelect>
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
  }
);

EnhancedSelectDropdown.displayName = 'EnhancedSelectDropdown';

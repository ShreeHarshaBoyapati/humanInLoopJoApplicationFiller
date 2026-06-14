import { forwardRef, useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Box, DialogActions, Popper } from '@mui/material';
import { styled } from '@mui/material/styles';
import { DesktopTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { usePickerActionsContext } from '@mui/x-date-pickers/hooks';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { Dayjs } from 'dayjs';
import styleConstants from './constants/style-constants';
import { EnhancedFieldLabel, type EnhancedFieldLabelProps } from './field-label';
import { EnhancedButton } from './button';

interface TimePickerProps {
  label?: string;
  value?: Dayjs | null;
  onChange?: (value: Dayjs | null) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  ampm?: boolean;
  timeSteps?: { hours?: number; minutes?: number; seconds?: number };
  showTooltip?: boolean;
  tooltipText?: string;
  customProps?: {
    labelProps?: Partial<Omit<EnhancedFieldLabelProps, 'label' | 'showTooltip' | 'tooltipText'>>;
    containerProps?: React.ComponentProps<typeof Box>;
    actionBarProps?: Record<string, unknown>;
    timePickerSlots?: Record<string, unknown>;
    timePickerSlotProps?: Record<string, unknown>;
    timePickerGeneralProps?: Record<string, unknown>;
  };
}

const StyledDialogActions = styled(DialogActions)({
  height: '56px',
  boxSizing: 'border-box',
  padding: '12px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '13px',
});

function StyledActionBar(props: unknown) {
  const { customProps = {}, ...others } = props as {
    customProps?: {
      actionBarProps?: Record<string, unknown>;
      cancelButtonProps?: Record<string, unknown>;
      addButtonProps?: Record<string, unknown>;
    };
  };
  const { acceptValueChanges, cancelValueChanges } = usePickerActionsContext();
  return (
    <StyledDialogActions
      {...(others as React.ComponentProps<typeof DialogActions>)}
      {...(customProps.actionBarProps || {})}
    >
      <EnhancedButton
        colorTheme="secondary"
        label="Cancel"
        onClick={cancelValueChanges}
        {...(customProps.cancelButtonProps || {})}
      />
      <EnhancedButton
        colorTheme="primary"
        label="Save"
        onClick={acceptValueChanges}
        {...(customProps.addButtonProps || {})}
      />
    </StyledDialogActions>
  );
}

const StyledDesktopTimePicker = styled(
  ({ value: _value, ...props }: React.ComponentProps<typeof DesktopTimePicker>) => (
    <DesktopTimePicker {...props} />
  )
)(() => ({
  '& .MuiPickersInputBase-root.MuiPickersOutlinedInput-root': {
    padding: '0px 1em',
    cursor: 'pointer',
    '&.Mui-disabled': {
      backgroundColor: styleConstants.black800,
      borderRadius: styleConstants.borderRadius,
      cursor: 'auto',
    },
  },
  '& .MuiPickersSectionList-root.MuiPickersInputBase-sectionsContainer': {
    height: '16px',
    width: 'auto',
    padding: '0.6em 0px',
    boxSizing: 'content-box',
    opacity: 1,
    '& span': {
      display: 'flex',
    },
    '& span *': {
      opacity: 1,
      fontSize: '1rem',
      fontStyle: 'normal',
      fontWeight: 400,
      lineHeight: '16px',
      color: styleConstants.white900,
    },
  },
  '& .MuiInputAdornment-root': {
    width: '16px',
    marginLeft: '0.5em',
  },
  '& .MuiButtonBase-root.MuiIconButton-root': {
    padding: '0px',
    '&:hover': {
      backgroundColor: 'transparent',
    },
    '&:focus': {
      outline: 'none',
    },
    '&.Mui-focusVisible': {
      outline: 'none',
      boxShadow: 'none',
    },
  },
  '& .MuiSvgIcon-root': {
    height: '16px',
    width: '16px',
    color: styleConstants.grey500,
  },
  '& .MuiPickersOutlinedInput-notchedOutline': {
    border: `1px solid ${styleConstants.grey700}`,
    borderRadius: styleConstants.borderRadius,
  },
  '&:hover:not(.Mui-disabled) .MuiPickersOutlinedInput-notchedOutline': {
    borderColor: styleConstants.grey500,
  },
  '& .MuiPickersInputBase-root.MuiPickersOutlinedInput-root.Mui-error .MuiPickersOutlinedInput-notchedOutline':
    {
      borderColor: styleConstants.red600,
      borderWidth: '1px',
    },
  '& .MuiPickersInputBase-root.MuiPickersOutlinedInput-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline':
    {
      borderWidth: '1px',
      borderColor: styleConstants.blue500,
    },
  '& .MuiPickersInputBase-root.MuiPickersOutlinedInput-root.Mui-disabled .MuiPickersOutlinedInput-notchedOutline':
    {
      borderColor: styleConstants.grey700,
      borderRadius: styleConstants.borderRadius,
    },
  '& .MuiPickersInputBase-root.Mui-disabled': {
    backgroundColor: styleConstants.black800,
    borderRadius: styleConstants.borderRadius,
    opacity: 0.4,
    '& .MuiPickersSectionList-root.MuiPickersInputBase-sectionsContainer': {
      cursor: 'auto',
    },
  },
  '& .MuiFormHelperText-root.Mui-error': {
    margin: '0px',
    marginTop: '0.37em',
    fontSize: '0.7em',
    lineHeight: 1.2,
    color: styleConstants.red700,
  },
}));

const StyledTimePickerPopper = styled(Popper)({
  '&.MuiPopper-root': {
    zIndex: 1500,
  },
  '&.MuiPopper-root.MuiPickerPopper-root .MuiPaper-root': {
    borderRadius: styleConstants.borderRadius,
    border: `1px solid ${styleConstants.grey700}`,
    transform: 'translateY(2px) !important',
    width: 'auto',
    maxWidth: '100%',
    boxSizing: 'border-box',
    backgroundColor: styleConstants.black800,
    color: styleConstants.white900,
  },
  '& .MuiPickersLayout-contentWrapper': {
    width: '100%',
    height: 'calc(100% - 56px)',
  },
  '& .MuiPickersLayout-root': {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  '& .MuiMultiSectionDigitalClock-root': {
    backgroundColor: styleConstants.black800,
    display: 'flex',
    justifyContent: 'center',
    borderBottom: `1px solid ${styleConstants.grey700}`,
  },
  '& .MuiList-root.MuiMultiSectionDigitalClockSection-root': {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '4px 8px',
    scrollbarWidth: 'auto',
    overflowY: 'scroll',
    borderRight: `1px solid ${styleConstants.grey700}`,
    '&:last-child': {
      borderRight: 'none',
    },
    '&::-webkit-scrollbar': {
      width: '4px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'transparent !important',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'transparent !important',
    },
    '&:hover': {
      scrollbarWidth: 'auto',
      '&::-webkit-scrollbar': {
        width: '4px',
      },
      '&::-webkit-scrollbar-track:hover': {
        backgroundColor: `${styleConstants.grey500}80 !important`,
        borderRadius: '4px',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: `${styleConstants.grey500}80 !important`,
        borderRadius: '4px',
      },
    },
  },
  '& .MuiButtonBase-root.MuiMenuItem-root.MuiMultiSectionDigitalClockSection-item': {
    color: styleConstants.white900,
    textAlign: 'center',
    fontSize: '10px',
    fontWeight: '400',
    lineHeight: 'normal',
    padding: '4px 5px',
    borderRadius: '20px',
    margin: '4px 0px',
    height: '22px',
    width: '39px',
    '&:hover': {
      backgroundColor: styleConstants.grey700,
    },
    '&.Mui-selected': {
      color: styleConstants.white900,
      backgroundColor: styleConstants.blue500,
    },
  },
});

export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(
  (
    {
      label = '',
      value = null,
      onChange = () => {},
      disabled = false,
      error = false,
      helperText = '',
      ampm = false,
      timeSteps = { minutes: 1 },
      showTooltip = false,
      tooltipText = '',
      customProps = {
        labelProps: {},
        containerProps: {},
        actionBarProps: {},
        timePickerSlots: {},
        timePickerSlotProps: {},
        timePickerGeneralProps: {},
      },
    },
    ref
  ) => {
    const [open, setOpen] = useState(false);
    const [popoverWidth, setPopoverWidth] = useState(232);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const pickerWrapperRef = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
      if (pickerWrapperRef.current) {
        setPopoverWidth(pickerWrapperRef.current.offsetWidth || 232);
      }
    }, []);

    useEffect(() => {
      if (!open) return;

      const handleClick = (event: MouseEvent) => {
        const target = event.target as Node;
        if (pickerWrapperRef.current?.contains(target)) return;
        const popperEl = document.querySelector('.MuiPickerPopper-root');
        if (popperEl?.contains(target)) return;
        setOpen(false);
      };

      const timer = setTimeout(() => {
        document.addEventListener('click', handleClick);
      }, 0);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClick);
      };
    }, [open]);

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          gap: '.5em',
          width: '100%',
        }}
        {...(customProps.containerProps || {})}
      >
        {label && (
          <EnhancedFieldLabel
            label={label}
            showTooltip={showTooltip}
            tooltipText={tooltipText}
            {...(customProps.labelProps || {})}
          />
        )}
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Box ref={pickerWrapperRef} sx={{ width: '100%' }}>
            <StyledDesktopTimePicker
              open={open}
              onOpen={() => setOpen(true)}
              onClose={() => setOpen(false)}
              inputRef={ref || inputRef}
              disabled={disabled}
              value={value}
              onChange={onChange}
              ampm={ampm}
              timeSteps={timeSteps}
              slots={{
                openPickerIcon: AccessTimeIcon,
                actionBar: StyledActionBar,
                popper: StyledTimePickerPopper,
                ...(customProps.timePickerSlots || {}),
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: error,
                  helperText: error ? helperText : undefined,
                  onClick: () => {
                    if (!disabled) setOpen(true);
                  },
                },
                actionBar: {
                  actions: ['cancel', 'accept'],
                } as Record<string, unknown>,
                openPickerButton: {
                  disableRipple: true,
                },
                popper: {
                  sx: {
                    '& .MuiPaper-root': {
                      width: popoverWidth,
                      minWidth: popoverWidth,
                    },
                    '& .MuiMultiSectionDigitalClock-root': {
                      width: popoverWidth,
                    },
                  },
                },
                ...(customProps.timePickerSlotProps || {}),
              }}
              {...(customProps.timePickerGeneralProps || {})}
            />
          </Box>
        </LocalizationProvider>
      </Box>
    );
  }
);

TimePicker.displayName = 'TimePicker';

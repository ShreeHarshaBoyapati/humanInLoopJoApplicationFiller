import { forwardRef, useState, useRef, useLayoutEffect } from 'react';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { DesktopDatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import styleConstants from './constants/style-constants';

import { EnhancedFieldLabel, type EnhancedFieldLabelProps } from './field-label';

dayjs.locale('en-gb');

interface DatePickerProps {
  label?: string;
  value?: Dayjs | null;
  onChange?: (value: Dayjs | null) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  format?: string;
  minDate?: Dayjs;
  maxDate?: Dayjs;
  showTooltip?: boolean;
  tooltipText?: string;
  customProps?: {
    labelProps?: Partial<Omit<EnhancedFieldLabelProps, 'label' | 'showTooltip' | 'tooltipText'>>;
    containerProps?: React.ComponentProps<typeof Box>;
    datePickerGeneralProps?: Record<string, unknown>;
    datePickerSlot?: Record<string, unknown>;
    datePickerSlotProps?: Record<string, unknown>;
  };
}

const popperStyles = {
  '& .MuiPaper-root': {
    backgroundColor: styleConstants.black800,
    borderRadius: styleConstants.borderRadius,
    border: `1px solid ${styleConstants.grey700}`,
    boxShadow: `0px 0px 5px 1px ${styleConstants.grey700}`,
    color: styleConstants.white900,
  },
  '& .MuiDateCalendar-root': {
    padding: '12px',
    height: '212px',
    maxHeight: '212px',
    backgroundColor: styleConstants.black800,
    color: styleConstants.white900,
  },
  '& .MuiDayCalendar-header': {
    height: '15px',
    marginTop: '8px',
  },
  '& .MuiDayCalendar-weekDayLabel': {
    color: styleConstants.grey500,
    fontSize: '10px',
    lineHeight: '15px',
  },
  '& .MuiPickersDay-root': {
    color: styleConstants.white900,
    fontSize: '10px',
    height: '22px',
    width: '22px',
    '&:hover': {
      backgroundColor: styleConstants.grey700,
    },
    '&:focus': {
      outline: 'none',
    },
    '&.Mui-focusVisible': {
      outline: 'none',
      boxShadow: 'none',
    },
  },
  '& .MuiPickersDay-root.Mui-selected': {
    backgroundColor: `${styleConstants.blue500} !important`,
    color: styleConstants.white900,
  },
  '& .MuiButtonBase-root.MuiPickersDay-root.Mui-selected': {
    backgroundColor: `${styleConstants.blue500} !important`,
  },
  '& .MuiButtonBase-root.MuiPickersDay-root:focus': {
    backgroundColor: styleConstants.black800,
  },
  '& .MuiPickersDay-root:not(.Mui-selected)': {
    border: 'none',
  },
  '& .MuiDayCalendar-weekContainer': {
    margin: '8px 0px',
    justifyContent: 'space-between',
  },
  '& .MuiYearCalendar-root': {
    height: '164px',
    gridTemplateColumns: 'repeat(6, auto)',
    columnGap: '12px',
    rowGap: '16px',
    overflowX: 'hidden',
    margin: '6px 0px',
    scrollbarWidth: 'auto',
    overflowY: 'scroll',
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
};

const calendarHeaderStyles = {
  margin: '0px',
  padding: '0px',
  width: '100%',
  height: '18px',
  maxHeight: '18px',
  minHeight: '18px',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
  '& .MuiPickersCalendarHeader-labelContainer': {
    marginRight: '0px',
    position: 'relative',
    top: '4px',
  },
  '& .MuiPickersCalendarHeader-label': {
    lineHeight: '18px',
    fontWeight: 600,
    fontSize: '12px',
    color: styleConstants.white900,
    marginRight: '0px',
  },
  '& .MuiPickersCalendarHeader-labelContainer .MuiButtonBase-root': {
    padding: '0px',
    height: '14px',
    width: '14px',
    marginLeft: '2px',
    borderRadius: '0px',
    '& svg': {
      height: '14px',
      width: '14px',
      color: styleConstants.grey500,
    },
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
  '& .MuiPickersArrowSwitcher-root button:first-child': {
    position: 'absolute',
    left: '0px',
    top: 'calc(50% + 3px)',
    transform: 'translateY(-50%)',
    height: '18px',
    width: '18px',
    padding: '0px',
    '& svg': {
      height: '18px',
      width: '18px',
      color: styleConstants.white900,
    },
    '&:hover': {
      backgroundColor: styleConstants.grey700,
    },
    '&:focus': {
      outline: 'none',
    },
    '&.Mui-focusVisible': {
      outline: 'none',
      boxShadow: 'none',
    },
  },
  '& .MuiPickersArrowSwitcher-root button:last-child': {
    position: 'absolute',
    right: '0px',
    top: 'calc(50% + 3px)',
    transform: 'translateY(-50%)',
    height: '18px',
    width: '18px',
    padding: '0px',
    '& svg': {
      height: '18px',
      width: '18px',
      color: styleConstants.white900,
    },
    '&:hover': {
      backgroundColor: styleConstants.grey700,
    },
    '&:focus': {
      outline: 'none',
    },
    '&.Mui-focusVisible': {
      outline: 'none',
      boxShadow: 'none',
    },
  },
  '& .MuiPickersArrowSwitcher-spacer': {
    display: 'none',
  },
};

const dayStyles = {
  color: styleConstants.white900,
  height: '22px',
  width: '22px',
  fontSize: '10px',
  '&.MuiPickersDay-dayOutsideMonth': {
    color: styleConstants.grey500,
  },
};

const yearButtonStyles = {
  width: '22px',
  height: '22px',
  flexShrink: 0,
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '10px',
  zIndex: 1,
  color: styleConstants.white900,
  fontWeight: 400,
  '&::before': {
    content: '""',
    position: 'absolute',
    zIndex: -1,
    pointerEvents: 'none',
    transition: 'all 0.2s ease-in-out',
    background: 'transparent',
    borderRadius: '50%',
    width: '22px',
    height: '22px',
    left: '0',
    top: '0',
  },
  '&.Mui-selected': {
    color: styleConstants.white900,
    fontWeight: 600,
  },
  '&.Mui-selected::before': {
    background: styleConstants.blue500,
    borderRadius: styleConstants.borderRadius,
    width: '39px',
    left: '-8.5px',
  },
  '&:hover': {
    backgroundColor: 'transparent',
  },
  '&:hover::before': {
    content: '""',
    position: 'absolute',
    zIndex: -1,
    pointerEvents: 'none',
    transition: 'all 0.2s ease-in-out',
    background: styleConstants.grey700,
    borderRadius: styleConstants.borderRadius,
    width: '39px',
    height: '22px',
    left: '-8.5px',
    top: '0',
  },
  '&.Mui-selected:hover::before': {
    background: styleConstants.blue500,
  },
  '&:focus': {
    backgroundColor: 'transparent',
    outline: 'none',
  },
  '&.Mui-focusVisible': {
    outline: 'none',
    boxShadow: 'none',
  },
};

const StyledDesktopDatePicker = styled(DesktopDatePicker)(() => ({
  '& .MuiPickersInputBase-root.MuiPickersOutlinedInput-root': {
    padding: '0px 1em',
  },
  '& .MuiPickersSectionList-root.MuiPickersInputBase-sectionsContainer': {
    height: '16px',
    width: 'auto',
    padding: '0.6em 0px',
    boxSizing: 'content-box',
    cursor: 'pointer',
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
    padding: '4px',
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

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      label = '',
      value = null,
      onChange = () => {},
      disabled = false,
      error = false,
      helperText = '',
      format = 'DD/MM/YYYY',
      minDate,
      maxDate,
      showTooltip = false,
      tooltipText = '',
      customProps = {
        labelProps: {},
        containerProps: {},
        datePickerGeneralProps: {},
        datePickerSlot: {},
        datePickerSlotProps: {},
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
        setPopoverWidth(pickerWrapperRef.current.offsetWidth);
      }
    }, []);

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
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <Box ref={pickerWrapperRef} sx={{ width: '100%' }}>
            <StyledDesktopDatePicker
              open={open}
              inputRef={ref || inputRef}
              disabled={disabled}
              format={format}
              value={value}
              onChange={onChange}
              minDate={minDate}
              maxDate={maxDate}
              yearsPerRow={4}
              onOpen={() => setOpen(true)}
              onClose={() => setOpen(false)}
              showDaysOutsideCurrentMonth={true}
              disableHighlightToday={false}
              dayOfWeekFormatter={(day: Dayjs) => day.format('ddd').toUpperCase()}
              slots={{
                openPickerIcon: CalendarTodayIcon,
                leftArrowIcon: ArrowBackIosNewIcon,
                rightArrowIcon: ArrowForwardIosIcon,
                switchViewIcon: ArrowDropDownIcon,
                ...(customProps.datePickerSlot || {}),
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
                popper: {
                  sx: {
                    ...popperStyles,
                    '& .MuiPaper-root': {
                      ...popperStyles['& .MuiPaper-root'],
                      width: popoverWidth,
                      minWidth: popoverWidth,
                    },
                    '& .MuiDateCalendar-root': {
                      ...popperStyles['& .MuiDateCalendar-root'],
                      width: popoverWidth,
                      minWidth: popoverWidth,
                    },
                    '& .MuiYearCalendar-root': {
                      ...popperStyles['& .MuiYearCalendar-root'],
                      width: '100%',
                    },
                  },
                },
                calendarHeader: {
                  sx: calendarHeaderStyles,
                },
                day: {
                  sx: dayStyles,
                },
                yearButton: {
                  sx: yearButtonStyles,
                },
                openPickerButton: {
                  disableRipple: true,
                },
                switchViewButton: {
                  disableRipple: true,
                },
                ...(customProps.datePickerSlotProps || {}),
              }}
              {...(customProps.datePickerGeneralProps || {})}
            />
          </Box>
        </LocalizationProvider>
      </Box>
    );
  }
);

DatePicker.displayName = 'DatePicker';

import React from 'react';
import { Checkbox, type CheckboxProps, styled } from '@mui/material';
import styleConstants from './constants/style-constants';

const StyledCheckbox = styled(Checkbox)(() => ({
  color: styleConstants.grey500,
  padding: 0,
  '&.Mui-checked': {
    color: styleConstants.blue500,
  },
  '&.Mui-disabled': {
    color: styleConstants.grey500,
    pointerEvents: 'none',
    opacity: 0.5,
  },
}));

export interface EnhancedCheckboxProps {
  checked: CheckboxProps['checked'];
  onChange: CheckboxProps['onChange'];
  disabled?: CheckboxProps['disabled'];
  size?: CheckboxProps['size'];
  customProps?: {
    checkboxProps?: Partial<Omit<CheckboxProps, 'checked' | 'onChange' | 'size' | 'disabled'>>;
  };
}

export const EnhancedCheckbox = React.forwardRef<HTMLButtonElement, EnhancedCheckboxProps>(
  ({ checked, onChange, disabled, size = 'small', customProps }, ref) => {
    return (
      <StyledCheckbox
        ref={ref}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        size={size}
        {...(customProps?.checkboxProps || {})}
      />
    );
  }
);

EnhancedCheckbox.displayName = 'EnhancedCheckbox';

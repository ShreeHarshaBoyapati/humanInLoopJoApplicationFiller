import React from 'react';
import { Chip, type ChipProps, styled } from '@mui/material';
import styleConstants from './constants/style-constants';
import { CloseIcon, CloseIconProps } from './icons/close-icon';

const StyledChip = styled(Chip)(() => ({
  minHeight: '28px',
  height: '2em',
  maxHeight: '32px',
  padding: '0.5em 1em',
  fontSize: '0.75rem',
  width: 'fit-content',
  fontWeight: 500,
  borderRadius: styleConstants.borderRadius,
  backgroundColor: styleConstants.black800,
  border: `1px solid ${styleConstants.grey700}`,
  gap: `calc(${styleConstants.spacing} * 2)`,
  cursor: 'pointer',

  '&:hover': {
    backgroundColor: styleConstants.grey300,
  },

  '& .MuiChip-label': {
    padding: '0',
    fontSize: '0.75rem',
    lineHeight: 1.2,
    fontWeight: 400,
    color: styleConstants.white900,
  },

  '& .MuiChip-deleteIcon': {
    width: '0.75rem',
    height: '0.75rem',
    margin: '0',
  },
}));

export interface EnhancedChipProps {
  id: ChipProps['id'];
  testId: string;
  label: ChipProps['label'];
  onDelete?: ChipProps['onDelete'];
  showDeleteIcon: boolean;
  customProps?: {
    chipProps?: Partial<Omit<ChipProps, 'label' | 'onDelete' | 'id'>>;
    deleteIconProps?: Partial<CloseIconProps>;
  };
}

export const EnhancedChip = React.forwardRef<HTMLInputElement, EnhancedChipProps>(
  (
    {
      id,
      testId,
      label,
      onDelete,
      customProps = {
        chipProps: {},
        labelProps: {},
        deleteIconProps: {},
      },
      showDeleteIcon,
    },
    ref
  ) => {
    return (
      <StyledChip
        id={id}
        data-testid={testId}
        ref={ref}
        label={label}
        onDelete={onDelete}
        deleteIcon={
          showDeleteIcon ? (
            <CloseIcon
              width={12}
              height={12}
              fill={`${styleConstants.white700}`}
              {...(customProps?.deleteIconProps || {})}
            />
          ) : (
            <></>
          )
        }
        {...(customProps?.chipProps || {})}
      />
    );
  }
);

EnhancedChip.displayName = 'EnhancedChip';

import { Typography, styled, Box, type TypographyProps, type BoxProps } from '@mui/material';
import styleConstants from './constants/style-constants';
import { EnhancedTooltipWithText, type EnhancedTooltipWithTextProps } from './tool-tip';

interface LabelProps {
  thin?: boolean;
}

const StyledLabel = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'thin',
})<LabelProps>(({ thin }) => ({
  fontWeight: thin ? 400 : 600,
  color: styleConstants.white900,
  display: 'flex',
  alignItems: 'center',
}));

export interface EnhancedFieldLabelProps {
  label: string;
  showTooltip?: boolean;
  tooltipText?: string;
  thin?: boolean;
  fontSize?: TypographyProps['fontSize'];
  labelWithTooltip?: boolean;
  placement?: EnhancedTooltipWithTextProps['placement'];
  lineHeight?: TypographyProps['lineHeight'];
  customProps?: {
    props?: TypographyProps;
    childProps?: {
      tooltip?: Partial<Omit<EnhancedTooltipWithTextProps, 'placement' | 'description'>>;
      parentBox?: BoxProps;
    };
  };
}

export const EnhancedFieldLabel = ({
  label,
  showTooltip = false,
  tooltipText = 'How to use this component',
  thin = false,
  fontSize = '1rem',
  placement = 'top',
  lineHeight = 1.2,
  customProps = {
    props: {},
    childProps: {
      tooltip: {},
      parentBox: {},
    },
  },
}: EnhancedFieldLabelProps) => {
  if (!label) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        padding: '0px',
        minHeight: '16px',
        gap: '4px',
      }}
      {...(customProps?.childProps?.parentBox || {})}
    >
      <StyledLabel thin={thin} fontSize={fontSize} lineHeight={lineHeight} {...customProps?.props}>
        {label}
      </StyledLabel>
      {showTooltip && (
        <EnhancedTooltipWithText
          description={tooltipText}
          placement={placement}
          {...(customProps?.childProps?.tooltip || {})}
        />
      )}
    </Box>
  );
};

EnhancedFieldLabel.displayName = 'EnhancedFieldLabel';

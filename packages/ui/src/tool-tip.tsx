import { forwardRef, SVGProps } from 'react';
import {
  Box,
  BoxProps,
  Tooltip,
  TooltipProps,
  IconButton,
  Typography,
  TypographyProps,
  tooltipClasses,
  SxProps,
  ButtonProps,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import styleConstants from './constants/style-constants';
import TooltipIcon from './icons/tooltip-icon';

const StyledBox = styled(Box)({
  display: 'flex',
  alignItems: 'center',
});

const StyledIconButton = styled(IconButton)({
  width: 16,
  height: 16,
  backgroundColor: 'none',
  padding: 0,
  ' &>svg': {
    display: 'block',
    overflow: 'visible',
  },
});

interface CustomWidthTooltipProps extends TooltipProps {
  toolTipCustomization?: {
    tooltip?: SxProps;
    arrow?: SxProps;
  };
}

const CustomWidthTooltip = styled(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ({ className, toolTipCustomization, ...props }: CustomWidthTooltipProps) => (
    <Tooltip {...props} classes={{ popper: className }} />
  )
)(({ toolTipCustomization = {} }) => ({
  zIndex: 9999,
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: styleConstants.black800,
    color: styleConstants.white700,
    maxWidth: '184px',
    border: `1px solid ${styleConstants.grey700}`,
    borderRadius: styleConstants.borderRadius,
    maxHeight: '92px',
    minHeight: '32px',
    fontSize: '1rem',
    padding: 0,
    ...toolTipCustomization.tooltip,
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: styleConstants.grey700,
    ...toolTipCustomization.arrow,
  },
}));

const StyledTooltipParentContainer = styled(Box)({
  maxHeight: 'inherit',
  padding: '0.375em 0.5em',
  display: 'flex',
  flexDirection: 'column',
});

const StyledTooltipScrollableContent = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: '4px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent !important',
  },
  '&:hover': {
    scrollbarWidth: 'auto',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: `${styleConstants.grey700} !important`,
    borderRadius: '4px',
  },
  paddingRight: '4px',
  marginRight: '-4px',
});

interface EnhancedTooltipWithTextProps extends Omit<TooltipProps, 'title'> {
  description: string;
  showIcon: boolean;
  customProps?: {
    props?: Partial<CustomWidthTooltipProps>;
    childProps?: {
      description?: TypographyProps;
      descriptionBox?: BoxProps;
      descriptionScrollBox?: BoxProps;
      parentBox?: BoxProps;
      iconButton?: ButtonProps;
      iconProps?: SVGProps<SVGSVGElement>;
      childrenBox?: BoxProps;
    };
  };
}

const EnhancedTooltipWithText = forwardRef<HTMLDivElement, EnhancedTooltipWithTextProps>(
  (
    {
      placement = 'top',
      description = 'This is a default tooltip description',
      showIcon = true,
      children,
      customProps = {
        props: {
          toolTipCustomization: {},
        },
        childProps: {
          description: {},
          descriptionBox: {},
          descriptionScrollBox: {},
          parentBox: {},
          iconButton: {},
          iconProps: {},
          childrenBox: {},
        },
      },
    },
    ref
  ) => {
    const tooltipTitle = (
      <StyledTooltipParentContainer {...(customProps?.childProps?.parentBox || {})}>
        <StyledTooltipScrollableContent {...(customProps?.childProps?.descriptionScrollBox || {})}>
          <Typography {...(customProps?.childProps?.description || {})}>{description}</Typography>
        </StyledTooltipScrollableContent>
      </StyledTooltipParentContainer>
    );

    return (
      <StyledBox ref={ref} {...(customProps?.childProps?.parentBox || {})}>
        <CustomWidthTooltip
          title={tooltipTitle}
          placement={placement}
          open={true}
          arrow
          {...(customProps?.props || {})}
        >
          {showIcon ? (
            <StyledIconButton {...(customProps?.childProps?.iconButton || {})}>
              <TooltipIcon {...(customProps?.childProps?.iconProps || {})} />
            </StyledIconButton>
          ) : (
            <Box {...(customProps?.childProps?.childrenBox || {})}>{children}</Box>
          )}
        </CustomWidthTooltip>
      </StyledBox>
    );
  }
);

EnhancedTooltipWithText.displayName = 'EnhancedTooltipWithText';

export default EnhancedTooltipWithText;

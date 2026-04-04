import { Box, styled } from '@mui/material';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepConnector, { stepConnectorClasses } from '@mui/material/StepConnector';
import CheckIcon from '@mui/icons-material/Check';
import styleConstants from './constants/style-constants';

export interface EnhancedStepperProps {
  steps: string[];
  activeStep?: number;
  optionalSteps?: number[];
  errorSteps?: number[];
  testId?: string;
  disabled?: boolean;
  customProps?: {
    props?: Omit<React.HTMLAttributes<HTMLDivElement>, 'id' | 'className'>;
    childProps?: {
      stepper?: Omit<
        React.ComponentProps<typeof Stepper>,
        'activeStep' | 'alternativeLabel' | 'children'
      >;
      step?: Omit<React.ComponentProps<typeof Step>, 'children'>;
      stepLabel?: Omit<
        React.ComponentProps<typeof StepLabel>,
        'children' | 'slots' | 'slotProps' | 'optional' | 'error'
      >;
    };
  };
}

const CustomConnector = styled(StepConnector)(() => ({
  [`& .${stepConnectorClasses.alternativeLabel}`]: {
    left: 'calc(-50% + 16px)',
    right: 'calc(50% + 16px)',
  },
  [`& .${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: styleConstants.blue500,
    },
  },
  [`& .${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: styleConstants.blue500,
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    borderColor: styleConstants.grey700,
    borderTopWidth: 2,
    borderRadius: 1,
  },
}));

const StepIconRoot = styled('div')<{
  ownerState: { completed?: boolean; active?: boolean; error?: boolean };
}>(({ ownerState }) => ({
  backgroundColor: styleConstants.grey700,
  zIndex: 1,
  color: styleConstants.grey500,
  width: 32,
  height: 32,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  fontFamily: styleConstants.secondaryFont,
  fontWeight: 500,
  fontSize: '0.875rem',
  transition: 'all 0.2s ease-in-out',
  ...(ownerState.active && {
    backgroundColor: styleConstants.blue500,
    color: styleConstants.white900,
    boxShadow: `0 0 0 4px ${styleConstants.blue500}33`,
  }),
  ...(ownerState.completed && {
    backgroundColor: styleConstants.blue500,
    color: styleConstants.white900,
  }),
  ...(ownerState.error && {
    backgroundColor: styleConstants.red600,
    color: styleConstants.white900,
  }),
}));

interface StepIconProps {
  active?: boolean;
  completed?: boolean;
  error?: boolean;
  icon?: string | number;
}

const StepIcon = (props: StepIconProps) => {
  const { active, completed, error, icon } = props;

  return (
    <StepIconRoot ownerState={{ completed, active, error }}>
      {completed ? <CheckIcon sx={{ fontSize: 18 }} /> : icon}
    </StepIconRoot>
  );
};

const StyledStepLabel = styled(StepLabel)(() => ({
  '& .MuiStepLabel-label': {
    fontFamily: styleConstants.secondaryFont,
    fontSize: '0.875rem',
    fontWeight: 500,
    marginTop: `calc(${styleConstants.spacing} * 2)`,
    color: styleConstants.grey500,
    '&.Mui-active': {
      color: styleConstants.white900,
    },
    '&.Mui-completed': {
      color: styleConstants.white700,
    },
    '&.Mui-error': {
      color: styleConstants.red600,
    },
  },
  '& .MuiStepLabel-optional': {
    fontFamily: styleConstants.secondaryFont,
    fontSize: '0.75rem',
    color: styleConstants.grey500,
    marginTop: `calc(${styleConstants.spacing})`,
  },
}));

const StepperContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'disabled',
})<{ disabled?: boolean }>(({ disabled }) => ({
  width: '100%',
  opacity: disabled ? 0.5 : 1,
  pointerEvents: disabled ? 'none' : 'auto',
}));

export const EnhancedStepper = ({
  steps,
  activeStep = 0,
  optionalSteps = [],
  errorSteps = [],
  testId = '',
  disabled = false,
  customProps,
}: EnhancedStepperProps) => {
  return (
    <StepperContainer disabled={disabled} data-testid={testId} {...(customProps?.props || {})}>
      <Stepper
        activeStep={activeStep}
        alternativeLabel
        connector={<CustomConnector />}
        {...(customProps?.childProps?.stepper || {})}
      >
        {steps.map((label, index) => (
          <Step key={label} {...(customProps?.childProps?.step || {})}>
            <StyledStepLabel
              slots={{ stepIcon: StepIcon }}
              slotProps={{
                stepIcon: {
                  completed: index < activeStep,
                  active: index === activeStep,
                  error: errorSteps.includes(index),
                },
              }}
              optional={optionalSteps.includes(index) ? <span>Optional</span> : undefined}
              error={errorSteps.includes(index)}
              {...(customProps?.childProps?.stepLabel || {})}
            >
              {label}
            </StyledStepLabel>
          </Step>
        ))}
      </Stepper>
    </StepperContainer>
  );
};

EnhancedStepper.displayName = 'EnhancedStepper';

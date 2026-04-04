import { Box, styled, Typography } from '@mui/material';
import { EnhancedButton } from './button';
import styleConstants from './constants/style-constants';
import React from 'react';

export interface EnhancedActionCardProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  title: string;
  description: string;
  buttonLabel: string;
  onButtonClick: () => void;
  testId?: string;
}

const CardContainer = styled(Box)({
  backgroundColor: styleConstants.black800,
  borderRadius: styleConstants.borderRadius,
  border: `1px solid ${styleConstants.grey700}`,
  padding: `calc(${styleConstants.spacing} * 5)`,
  display: 'flex',
  flexDirection: 'column',
  gap: `calc(${styleConstants.spacing} * 4)`,
  width: '100%',
});

const HeaderSection = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
});

const IconWrapper = styled(Box)<{ bgcolor: string; colorkey: string }>(({ bgcolor, colorkey }) => ({
  backgroundColor: bgcolor,
  color: colorkey,
  borderRadius: styleConstants.borderRadius,
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

export const EnhancedActionCard: React.FC<EnhancedActionCardProps> = ({
  icon,
  iconBgColor = styleConstants.blue500,
  iconColor = styleConstants.black700,
  title,
  description,
  buttonLabel,
  onButtonClick,
  testId,
}) => {
  return (
    <CardContainer data-testid={testId}>
      <HeaderSection>
        <IconWrapper bgcolor={iconBgColor} colorkey={iconColor}>
          {icon}
        </IconWrapper>
      </HeaderSection>

      <Box>
        <Typography
          variant="h6"
          sx={{
            fontFamily: styleConstants.headingFont,
            fontWeight: 700,
            color: styleConstants.white900,
            marginBottom: '0.5rem',
            fontSize: '1.1rem',
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: styleConstants.white700,
            lineHeight: 1.5,
          }}
        >
          {description}
        </Typography>
      </Box>

      <EnhancedButton
        label={buttonLabel}
        onClick={onButtonClick}
        colorTheme="primary"
        style={{ width: '100%' }}
      />
    </CardContainer>
  );
};

import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  AccordionProps,
  AccordionSummaryProps,
  AccordionDetailsProps,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import styleConstants from './constants/style-constants';

export interface EnhancedAccordionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  customProps?: {
    props?: AccordionProps;
    childProps?: {
      summary?: AccordionSummaryProps;
      details?: AccordionDetailsProps;
    };
  };
}

/**
 * A reusable accordion component using the standardized design system.
 */
export const EnhancedAccordion: React.FC<EnhancedAccordionProps> = ({
  title,
  children,
  defaultExpanded = false,
  customProps = {},
}) => {
  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      sx={{
        backgroundColor: styleConstants.black700,
        border: `1px solid ${styleConstants.grey700}`,
        borderRadius: `${styleConstants.borderRadius} !important`,
        boxShadow: 'none',
        color: styleConstants.white900,
        '&::before': { display: 'none' },
        '&:hover': {
          backgroundColor: styleConstants.grey300,
        },
        '&.Mui-expanded': { margin: 0 },
        '&.Mui-expanded:hover': { backgroundColor: styleConstants.black700 },
      }}
      {...(customProps?.props || {})}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: styleConstants.white900 }} />}
        sx={{
          minHeight: '38px !important',
          padding: '0 1rem',
          '& .MuiAccordionSummary-content': { margin: '0' },
          '&.Mui-expanded': { minHeight: '38px' },
        }}
        {...(customProps?.childProps?.summary || {})}
      >
        {typeof title === 'string' ? (
          <span style={{ color: styleConstants.white900, fontSize: '1rem', fontWeight: 500 }}>
            {title}
          </span>
        ) : (
          title
        )}
      </AccordionSummary>
      <AccordionDetails
        sx={{
          padding: '0.75rem',
        }}
        {...(customProps?.childProps?.details || {})}
      >
        {children}
      </AccordionDetails>
    </Accordion>
  );
};

EnhancedAccordion.displayName = 'EnhancedAccordion';

export default EnhancedAccordion;

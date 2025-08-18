import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ChevronDown } from 'lucide-react';
import { FillerWordRemover } from '../FillerWordRemover';

export function OptimizerSidebar() {
  return (
    <Box sx={{ p: 1, height: '100%', color: '#cccccc', backgroundColor: '#252526' }}>
      <Box sx={{ p: 1.5, borderBottom: '1px solid #3c3c3c', mb: 1 }}>
        <Typography variant="h6" sx={{ color: '#cccccc' }}>
          Optimizer
        </Typography>
      </Box>
      <Accordion
        defaultExpanded
        sx={{
          backgroundColor: '#2c2c2c',
          color: '#cccccc',
          boxShadow: 'none',
          '&:before': {
            display: 'none',
          },
          margin: '0 !important',
        }}
      >
        <AccordionSummary
          expandIcon={<ChevronDown size={16} />}
          sx={{
            minHeight: '32px',
            '&.Mui-expanded': {
              minHeight: '32px',
            },
            '& .MuiAccordionSummary-content': {
              fontWeight: 'bold',
              margin: '6px 0',
              '&.Mui-expanded': {
                margin: '6px 0',
              },
            },
          }}
        >
          <Typography sx={{ fontSize: '0.85rem' }}>Simple Mode</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0.5 }}>
          <FillerWordRemover />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
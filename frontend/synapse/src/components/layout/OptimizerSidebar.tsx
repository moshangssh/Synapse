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
      <Accordion defaultExpanded sx={{ backgroundColor: '#2c2c2c', color: '#cccccc' }}>
        <AccordionSummary
          expandIcon={<ChevronDown size={18} />}
          sx={{
            '& .MuiAccordionSummary-content': {
              fontWeight: 'bold',
            },
          }}
        >
          <Typography>Simple Mode</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FillerWordRemover />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
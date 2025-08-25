import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  useTheme,
} from '@mui/material';
import { ChevronDown } from 'lucide-react';
import { FillerWordRemover } from '../FillerWordRemover';

export function OptimizerSidebar() {
  const theme = useTheme();
  
  return (
    <Paper
      sx={{
        height: '100%',
        backgroundColor: '#1E1E1E',
        borderRadius: 0,
        borderRight: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box sx={{ p: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="subtitle1" sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>
          Optimizer
        </Typography>
      </Box>
      <Accordion
        defaultExpanded
        sx={{
          backgroundColor: 'transparent',
          color: theme.palette.text.primary,
          boxShadow: 'none',
          '&:before': {
            display: 'none',
          },
          margin: '0 !important',
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
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
    </Paper>
  );
}
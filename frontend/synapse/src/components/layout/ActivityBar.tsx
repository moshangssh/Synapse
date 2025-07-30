import { Box, IconButton, Tooltip, Paper } from '@mui/material';
import { Files, Search, GitBranch } from 'lucide-react';

interface ActivityBarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  const items = [
    { id: 'explorer', icon: Files, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'git', icon: GitBranch, label: 'Source Control' },
  ];

  return (
    <Paper
      sx={{
        width: 48,
        height: '100%',
        backgroundColor: '#2c2c2c',
        borderRadius: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #3c3c3c',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {items.map((item) => (
          <Tooltip key={item.id} title={item.label} placement="right">
            <IconButton
              onClick={() => onViewChange(item.id)}
              sx={{
                height: 48,
                width: 48,
                borderRadius: 0,
                color: '#cccccc',
                backgroundColor: activeView === item.id ? '#37373d' : 'transparent',
                borderRight: activeView === item.id ? '2px solid #007acc' : 'none',
                '&:hover': {
                  backgroundColor: '#37373d',
                },
              }}
            >
              <item.icon size={20} />
            </IconButton>
          </Tooltip>
        ))}
      </Box>
    </Paper>
  );
}
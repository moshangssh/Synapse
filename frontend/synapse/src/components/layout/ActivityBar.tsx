import { Box, IconButton, Tooltip, Paper } from '@mui/material';
import { Files, Search, Upload, Wand2 } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';

export function ActivityBar() {
  const { activeView, setActiveView, isSidebarOpen, toggleSidebar } = useUIStore();

  const items = [
    { id: 'explorer', icon: Files, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'optimizer', icon: Wand2, label: 'Optimizer' },
    { id: 'git', icon: Upload, label: 'Export' },
  ];

  const handleViewChange = (viewId: string) => {
    if (activeView === viewId) {
      // 点击相同图标：切换 Sidebar 的收纳/展示状态
      toggleSidebar();
    } else {
      // 点击不同图标：切换视图并确保 Sidebar 展开
      setActiveView(viewId);
      if (!isSidebarOpen) {
        toggleSidebar();
      }
    }
  };

  return (
    <Paper
          sx={{
            width: 48,
            height: '100%',
            backgroundColor: '#1E1E1E',
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
              onClick={() => handleViewChange(item.id)}
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
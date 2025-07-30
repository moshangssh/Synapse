import { Box, Typography, Paper } from '@mui/material';
import { Circle } from '@mui/icons-material';

import { useDataStore } from '../../stores/useDataStore';
import { useUIStore } from '../../stores/useUIStore';

export function StatusBar() {
  const selectedSubtitleId = useUIStore((state) => state.selectedSubtitleId);
  const {
    connectionStatus,
    errorMessage,
    subtitles,
    projectInfo,
  } = useDataStore();

  const statusConfig = {
    connected: { label: '已连接', color: 'success', iconColor: '#4ade80' },
    connecting: { label: '连接中...', color: 'warning', iconColor: '#fde047' },
    error: { label: `错误: ${errorMessage}`, color: 'error', iconColor: '#f87171' },
    disconnected: { label: '等待连接...', color: 'default', iconColor: '#9ca3af' },
  } as const;

  const { label, iconColor } = statusConfig[connectionStatus];

  return (
    <Paper
      sx={{
        height: 24,
        backgroundColor: '#252526',
        color: '#cccccc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingX: 1.5,
        borderRadius: 0,
        borderTop: '1px solid #3c3c3c',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Circle sx={{ fontSize: 8, color: iconColor }} />
          <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
            {label}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
          Project: {projectInfo?.projectName || 'N/A'}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
          Timeline: {projectInfo?.timelineName || 'N/A'}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
          Total Chars: {subtitles.reduce((acc, s) => acc + s.text.length, 0)} ({subtitles.reduce((acc, s) => acc + s.originalText.length, 0)})
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
          Selected: {selectedSubtitleId ?? 'N/A'}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
          Timecode: {subtitles.find(s => s.id === selectedSubtitleId)?.startTimecode ?? 'N/A'}
        </Typography>
      </Box>
    </Paper>
  );
}
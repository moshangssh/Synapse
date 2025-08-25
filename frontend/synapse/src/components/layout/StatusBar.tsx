import { Box, Typography, Paper, useTheme } from '@mui/material';
import { Circle } from 'lucide-react';
import { useMemo } from 'react';

import { useDataStore } from '../../stores/useDataStore';
import { useUIStore } from '../../stores/useUIStore';
import { JumpModeSelector } from './JumpModeSelector';

export function StatusBar() {
  const theme = useTheme();
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
  const [totalChars, originalChars] = useMemo(() => {
    const total = subtitles.reduce((acc, s) => acc + s.text.length, 0);
    const original = subtitles.reduce((acc, s) => acc + s.originalText.length, 0);
    return [total, original];
  }, [subtitles]);
  const selectedStartTimecode = useMemo(() => {
    return subtitles.find(s => s.id === selectedSubtitleId)?.startTimecode ?? 'N/A';
  }, [subtitles, selectedSubtitleId]);

  return (
    <Paper
          sx={{
            height: 24,
            backgroundColor: '#1E1E1E',
            color: '#cccccc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingX: 1.5,
            borderRadius: 0,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Circle size={8} color={iconColor} />
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

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <JumpModeSelector />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, flex: 1 }}>
        <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
          Total Chars: {totalChars} ({originalChars})
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
          Selected: {selectedSubtitleId ?? 'N/A'}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
          Timecode: {selectedStartTimecode}
        </Typography>
      </Box>
    </Paper>
  );
}
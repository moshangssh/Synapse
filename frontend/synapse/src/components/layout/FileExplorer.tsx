import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  IconButton
} from '@mui/material';
import { InsertDriveFile } from '@mui/icons-material';
import { RefreshCw } from 'lucide-react';
import { useDataStore } from '../../stores/useDataStore';
import { useUIStore } from '../../stores/useUIStore';

interface FileExplorerProps {
  fetchSubtitleTracks: () => Promise<void>;
  loading: boolean;
  onTrackSelect: (trackIndex: number) => void;
}

export function FileExplorer({
  fetchSubtitleTracks,
  loading,
  onTrackSelect,
}: FileExplorerProps) {
  const subtitleTracks = useDataStore((state) => state.subtitleTracks);
  const activeTrackIndex = useUIStore((state) => state.activeTrackIndex);

  return (
    <Paper
      sx={{
        height: '100%',
        backgroundColor: '#252526',
        borderRadius: 0,
        borderRight: '1px solid #3c3c3c',
      }}
    >
      <Box sx={{ p: 1.5, borderBottom: '1px solid #3c3c3c', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ color: '#cccccc' }}>
          Timeline Tracks
        </Typography>
        <IconButton onClick={fetchSubtitleTracks} disabled={loading} size="small">
          <RefreshCw size={16} color={loading ? "#666" : "#ccc"} />
        </IconButton>
      </Box>
      <List dense sx={{ py: 1 }}>
        {subtitleTracks.map(track => (
          <ListItemButton
            key={track.track_index}
            onClick={() => onTrackSelect(track.track_index)}
            selected={activeTrackIndex === track.track_index}
            sx={{
              paddingLeft: `16px`,
              paddingY: 0.25,
              minHeight: 28,
              color: '#cccccc',
              '&:hover': {
                backgroundColor: '#37373d',
              },
              '&.Mui-selected': {
                backgroundColor: '#37373d',
                '&:hover': {
                  backgroundColor: '#37373d',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 24, color: '#519aba' }}>
              <InsertDriveFile sx={{ fontSize: 16 }} />
            </ListItemIcon>
            <ListItemText
              primary={track.track_name}
              primaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}
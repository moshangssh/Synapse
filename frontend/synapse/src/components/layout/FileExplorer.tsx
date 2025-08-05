import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import { InsertDriveFile, Description } from '@mui/icons-material';
import { RefreshCcw, Import } from 'lucide-react';
import { useDataStore } from '../../stores/useDataStore';
import { useSrtImporter } from '../../hooks/useSrtImporter';
import { useState } from 'react';
import { Subtitle } from '../../types';
import { convertSrtToSubtitles } from '../../utils/converter';

// 定义选择状态类型
type SelectionType = 'track' | 'importedFile' | null;

interface SelectionState {
  type: SelectionType;
  id: string | number; // 对于 track 是 trackIndex，对于 importedFile 是 fileName
}

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
  const setSubtitles = useDataStore((state) => state.setSubtitles);
  const importedSubtitleFiles = useDataStore((state) => state.importedSubtitleFiles);
  const [selection, setSelection] = useState<SelectionState>({ type: null, id: 0 });
  
  // 判断是否选中的逻辑
  const isSelected = (type: SelectionType, id: string | number) => {
    return selection.type === type && selection.id === id;
  };
  
  // 使用自定义Hook处理SRT文件导入
  const {
    handleFileChange,
    isImporting,
    triggerFileSelect,
    fileInputRef,
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    handleSnackbarClose,
  } = useSrtImporter();

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
          字幕源
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton onClick={fetchSubtitleTracks} disabled={loading} size="small">
            <RefreshCcw size={16} color={loading ? "#666" : "#ccc"} />
          </IconButton>
          <IconButton onClick={triggerFileSelect} disabled={isImporting} size="small" title="导入SRT文件">
            <Import size={16} color={isImporting ? "#666" : "#ccc"} />
          </IconButton>
        </Box>
      </Box>
      
      {/* 隐藏的文件输入元素 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".srt"
        style={{ display: 'none' }}
      />
      <List dense sx={{ py: 1 }}>
        {/* 显示导入的SRT文件 */}
        {importedSubtitleFiles.length > 0 && (
          <>
            <Box sx={{ px: 2, py: 0.5 }}>
              <Typography variant="caption" sx={{ color: '#888888' }}>
                导入的文件
              </Typography>
            </Box>
            {importedSubtitleFiles.map((file) => (
              <ListItemButton
                key={`imported-${file.fileName}`}
                onClick={() => {
                  // 当点击导入的文件时，将其字幕数据设置为当前显示的字幕
                  const convertedSubtitles: Subtitle[] = convertSrtToSubtitles(file.subtitles);
                  setSubtitles(convertedSubtitles);
                  setSelection({ type: 'importedFile', id: file.fileName });
                }}
                selected={isSelected('importedFile', file.fileName)}
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
                <ListItemIcon sx={{ minWidth: 24, color: '#4ec9b0' }}>
                  <Description sx={{ fontSize: 16 }} />
                </ListItemIcon>
                <ListItemText
                  primary={`[导入] ${file.fileName}`}
                  primaryTypographyProps={{ fontSize: '0.75rem' }}
                />
              </ListItemButton>
            ))}
          </>
        )}
        
        {/* 显示时间线轨道 */}
        {subtitleTracks.length > 0 && (
          <>
            <Box sx={{ px: 2, py: 0.5, mt: importedSubtitleFiles.length > 0 ? 1 : 0 }}>
              <Typography variant="caption" sx={{ color: '#888888' }}>
                时间线轨道
              </Typography>
            </Box>
        
            {subtitleTracks.map(track => (
              <ListItemButton
                key={track.trackIndex}
                onClick={() => {
                  onTrackSelect(track.trackIndex);
                  setSelection({ type: 'track', id: track.trackIndex });
                }}
                selected={isSelected('track', track.trackIndex)}
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
                  primary={`[轨道] ${track.trackName}`}
                  primaryTypographyProps={{ fontSize: '0.75rem' }}
                />
              </ListItemButton>
            ))}
          </>
        )}
      </List>
      
      {/* 当没有字幕源时显示提示信息 */}
      {importedSubtitleFiles.length === 0 && subtitleTracks.length === 0 && (
        <Box sx={{ p: 2, textAlign: 'center', color: '#888888' }}>
          <Typography variant="body2">
            暂无字幕源
          </Typography>
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            点击上方按钮导入SRT文件或刷新时间线轨道
          </Typography>
        </Box>
      )}
      
      {/* 导入结果提示 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
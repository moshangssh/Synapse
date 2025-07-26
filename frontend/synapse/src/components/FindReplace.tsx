import React, { useCallback, memo } from 'react';
import { TextField, Box, IconButton, InputAdornment, Paper, Tooltip, Typography } from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowRight,
  ArrowForward,
  Replay,
  Abc, // Placeholder for Match Case
  FormatQuote, // Placeholder for Match Whole Word
  DataObject // Placeholder for Regex
} from '@mui/icons-material';

interface FindReplaceProps {
  searchQuery: string;
  replaceQuery: string;
  showReplace: boolean;
  matchCase: boolean;
  matchWholeWord: boolean;
  useRegex: boolean;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onReplaceChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onReplaceAll: () => void;
  onToggleShowReplace: () => void;
  onToggleMatchCase: () => void;
  onToggleMatchWholeWord: () => void;
  onToggleUseRegex: () => void;
}

const FindReplace: React.FC<FindReplaceProps> = ({
  searchQuery,
  replaceQuery,
  showReplace,
  matchCase,
  matchWholeWord,
  useRegex,
  onSearchChange,
  onReplaceChange,
  onReplaceAll,
  onToggleShowReplace,
  onToggleMatchCase,
  onToggleMatchWholeWord,
  onToggleUseRegex,
}) => {
  const handleReplaceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onReplaceAll();
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 1.5, mb: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={showReplace ? "隐藏高级替换" : "显示高级替换"}>
            <IconButton onClick={onToggleShowReplace} size="small">
              {showReplace ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
            </IconButton>
          </Tooltip>
          <TextField
            placeholder="在此处搜索字幕..."
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={onSearchChange}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="大小写匹配">
                    <IconButton size="small" onClick={onToggleMatchCase} color={matchCase ? 'primary' : 'default'}><Abc fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="全词匹配">
                    <IconButton size="small" onClick={onToggleMatchWholeWord} color={matchWholeWord ? 'primary' : 'default'}><FormatQuote fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="使用正则表达式">
                    <IconButton size="small" onClick={onToggleUseRegex} color={useRegex ? 'primary' : 'default'}><DataObject fontSize="small" /></IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        </Box>
        {showReplace && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: '40px' }}>
            <TextField
              placeholder="替换为..."
              variant="outlined"
              size="small"
              value={replaceQuery}
              onChange={onReplaceChange}
              onKeyDown={handleReplaceKeyDown}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="全部替换">
                      <IconButton onClick={onReplaceAll} size="small">
                        <Replay />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default memo(FindReplace);
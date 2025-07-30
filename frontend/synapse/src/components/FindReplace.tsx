import React, { memo } from 'react';
import { TextField, Box, IconButton, InputAdornment, Tooltip } from '@mui/material';
import {
  ChevronDown,
  ChevronRight,
  CaseSensitive,
  WholeWord,
  Regex,
  ReplaceAll,
} from 'lucide-react';

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

  const commonInputStyles = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: '#3c3c3c',
      color: '#cccccc',
      fontSize: '0.8rem',
      height: '28px',
      '& fieldset': {
        borderColor: '#464647',
      },
      '&:hover fieldset': {
        borderColor: '#464647',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#007acc',
      },
    },
    '& .MuiOutlinedInput-input': {
      '&::placeholder': {
        color: '#969696',
        opacity: 1,
      },
    },
  };

  const iconButtonStyles = (isActive: boolean) => ({
    width: 24,
    height: 24,
    borderRadius: '4px',
    color: '#cccccc',
    backgroundColor: isActive ? '#094771' : 'transparent',
    '&:hover': {
      backgroundColor: isActive ? '#094771' : '#464647',
    },
  });

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
      <Tooltip title={showReplace ? "隐藏替换" : "显示替换"}>
        <IconButton
          onClick={onToggleShowReplace}
          size="small"
          sx={{
            color: '#cccccc',
            mt: showReplace ? '18px' : '2px',
            transition: 'margin-top 0.2s ease-in-out',
          }}
        >
          {showReplace ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </IconButton>
      </Tooltip>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <TextField
          placeholder="搜索"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={onSearchChange}
          fullWidth
          sx={commonInputStyles}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" sx={{ gap: 0.5 }}>
                <Tooltip title="大小写匹配">
                  <IconButton sx={iconButtonStyles(matchCase)} onClick={onToggleMatchCase}>
                    <CaseSensitive size={14} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="全词匹配">
                  <IconButton sx={iconButtonStyles(matchWholeWord)} onClick={onToggleMatchWholeWord}>
                    <WholeWord size={14} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="使用正则表达式">
                  <IconButton sx={iconButtonStyles(useRegex)} onClick={onToggleUseRegex}>
                    <Regex size={14} />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
        {showReplace && (
          <TextField
            placeholder="替换"
            variant="outlined"
            size="small"
            value={replaceQuery}
            onChange={onReplaceChange}
            onKeyDown={handleReplaceKeyDown}
            fullWidth
            sx={commonInputStyles}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="全部替换">
                    <IconButton sx={iconButtonStyles(false)} onClick={onReplaceAll}>
                      <ReplaceAll size={14} />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default memo(FindReplace);
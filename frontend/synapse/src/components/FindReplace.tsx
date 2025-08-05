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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, position: 'relative' }}>
      {/* Toggle Button - Positioned absolutely */}
      <Tooltip title={showReplace ? "隐藏替换" : "显示替换"}>
        <IconButton
          onClick={onToggleShowReplace}
          size="small"
          sx={{
            color: '#cccccc',
            padding: '1px',
            width: '18px',
            height: '18px',
            position: 'absolute',
            left: 0,
            top: showReplace ? 'calc(26px + 0.125rem - 9px)' : '4px', // Center align with the search input when collapsed
            zIndex: 1, // Ensure it's above other elements
            transition: 'top 0.2s ease-in-out', // Smooth transition when expanding/collapsing
          }}
        >
          {showReplace ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </IconButton>
      </Tooltip>

      {/* Search Input */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, paddingLeft: '22px' /* Space for the button */ }}>
        <TextField
          placeholder="搜索"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={onSearchChange}
          fullWidth
          sx={{
            ...commonInputStyles,
            '& .MuiOutlinedInput-root': {
              ...commonInputStyles['& .MuiOutlinedInput-root'],
              width: '100%',
              height: '26px',
            }
          }}
          InputProps={{
            sx: { height: '26px', minHeight: '26px' },
            endAdornment: (
              <InputAdornment position="end" sx={{ gap: 0.25 }}>
                <Tooltip title="大小写匹配">
                  <IconButton sx={{...iconButtonStyles(matchCase), width: 24, height: 24, padding: '2px'}} onClick={onToggleMatchCase}>
                    <CaseSensitive size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="全词匹配">
                  <IconButton sx={{...iconButtonStyles(matchWholeWord), width: 24, height: 24, padding: '2px'}} onClick={onToggleMatchWholeWord}>
                    <WholeWord size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="使用正则表达式">
                  <IconButton sx={{...iconButtonStyles(useRegex), width: 24, height: 24, padding: '2px'}} onClick={onToggleUseRegex}>
                    <Regex size={16} />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Replace Input */}
      {showReplace && (
        <Box sx={{ display: 'flex', alignItems: 'center', paddingLeft: '22px' /* Space for the button */ }}>
          <TextField
            placeholder="替换"
            variant="outlined"
            size="small"
            value={replaceQuery}
            onChange={onReplaceChange}
            onKeyDown={handleReplaceKeyDown}
            fullWidth
            sx={{
              ...commonInputStyles,
              '& .MuiOutlinedInput-root': {
                ...commonInputStyles['& .MuiOutlinedInput-root'],
                height: '26px',
              }
            }}
            InputProps={{
              sx: { height: '26px', minHeight: '26px' },
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="全部替换">
                    <IconButton sx={{...iconButtonStyles(false), width: 24, height: 24, padding: '2px'}} onClick={onReplaceAll}>
                      <ReplaceAll size={16} />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default memo(FindReplace);

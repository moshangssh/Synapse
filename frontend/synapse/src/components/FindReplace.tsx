import React, { memo, useMemo } from 'react';
import { TextField, Box, IconButton, InputAdornment, Tooltip, useTheme } from '@mui/material';
import {
  ChevronDown,
  ChevronRight,
  ReplaceAll,
} from 'lucide-react';

interface FindReplaceProps {
  searchQuery: string;
  replaceQuery: string;
  showReplace: boolean;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onReplaceChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onReplaceAll: () => void;
  onToggleShowReplace: () => void;
}

const FindReplace: React.FC<FindReplaceProps> = ({
  searchQuery,
  replaceQuery,
  showReplace,
  onSearchChange,
  onReplaceChange,
  onReplaceAll,
  onToggleShowReplace,
}) => {
  const theme = useTheme();
  const handleReplaceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onReplaceAll();
    }
  };

  // 使用主题中定义的样式，保持一致性
  const commonInputStyles = useMemo(() => ({
    '& .MuiOutlinedInput-root': {
      color: theme.palette.text.primary,
      fontSize: '0.8rem',
      height: '28px',
      '& fieldset': {
        borderColor: '#464647',
      },
      '&:hover fieldset': {
        borderColor: '#464647',
      },
      '&.Mui-focused fieldset': {
        borderColor: theme.palette.primary.main,
      },
    },
    '& .MuiOutlinedInput-input': {
      '&::placeholder': {
        color: theme.palette.text.secondary,
        opacity: 1,
      },
    },
  }), [theme]);

  const iconButtonStyles = useMemo(() => (isActive: boolean) => ({
    width: 24,
    height: 24,
    borderRadius: '2px', // 与主题中的按钮样式保持一致
    color: theme.palette.text.primary,
    backgroundColor: isActive ? '#094771' : 'transparent',
    '&:hover': {
      backgroundColor: isActive ? '#094771' : theme.palette.action.hover,
    },
  }), [theme]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, position: 'relative' }}>
      {/* Toggle Button - Positioned absolutely */}
      <Tooltip title={showReplace ? "隐藏替换" : "显示替换"}>
        <IconButton
          onClick={onToggleShowReplace}
          size="small"
          sx={{
            color: theme.palette.text.primary,
            padding: '1px',
            width: '18px',
            height: '18px',
            position: 'absolute',
            left: 0,
            top: showReplace ? 'calc(26px + 0.125rem - 9px)' : '4px', // Center align with the search input when collapsed
            zIndex: 1, // Ensure it's above other elements
            transition: 'top 0.2s ease-in-out', // Smooth transition when expanding/collapsing
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
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

import { useState } from 'react';
import { Box, Typography, Menu, MenuItem } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import { useUIStore } from '../../stores/useUIStore';
import type { JumpTo } from '../../stores/useUIStore';

const JUMP_MODE_MAP: Record<JumpTo, string> = {
  start: '入点',
  middle: '中点',
  end: '出点',
};

const JUMP_MODE_COLOR_MAP: Record<JumpTo, string> = {
  start: '#4ade80', // Green
  middle: '#facc15', // Yellow
  end: '#f87171',   // Red
};

const JUMP_MODE_ORDER: JumpTo[] = ['start', 'middle', 'end'];

export function JumpModeSelector() {
  const jumpTo = useUIStore((state) => state.jumpTo);
  const setJumpTo = useUIStore((state) => state.setJumpTo);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (mode: JumpTo) => {
    setJumpTo(mode);
    handleClose();
  };

  return (
    <div>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography
          variant="caption"
          sx={{ fontSize: '0.6rem', color: '#9ca3af' }}
        >
          播放头跳转:
        </Typography>
        <Box
          id="jump-mode-button"
          aria-controls={open ? 'jump-mode-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleClick}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: 'pointer',
            backgroundColor: '#313131',
            border: '1px solid #242424',
            paddingX: 1,
            paddingY: 0,
            borderRadius: 1,
            transition: 'background-color 0.2s',
            '&:hover': {
              backgroundColor: '#424242',
            },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.6rem',
              fontWeight: 'medium',
              color: JUMP_MODE_COLOR_MAP[jumpTo],
            }}
          >
            {JUMP_MODE_MAP[jumpTo]}
          </Typography>
          <KeyboardArrowDown sx={{ fontSize: 12, color: '#9ca3af' }} />
        </Box>
      </Box>
      <Menu
        id="jump-mode-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'jump-mode-button',
        }}
        PaperProps={{
          sx: {
            backgroundColor: '#3c3c3c',
            color: '#cccccc',
            border: '1px solid #555',
          },
        }}
      >
        {JUMP_MODE_ORDER.map((mode) => (
          <MenuItem
            key={mode}
            selected={mode === jumpTo}
            onClick={() => handleMenuItemClick(mode)}
            sx={{
              fontSize: '0.8rem',
              minWidth: 60,
              display: 'flex',
              justifyContent: 'center',
              color: JUMP_MODE_COLOR_MAP[mode],
              '&.Mui-selected': {
                fontWeight: 'bold',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              },
            }}
          >
            {JUMP_MODE_MAP[mode]}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}
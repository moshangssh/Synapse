import { Box, IconButton } from '@mui/material';
import {
  PushPin,
  PushPinOutlined,
  Minimize,
  CropSquare,
  Close,
  FilterNone,
} from '@mui/icons-material';
import { useState, useCallback, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function TitleBar() {
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const updateMaximizeState = async () => {
      try {
        const window = getCurrentWindow();
        const maximized = await window.isMaximized();
        setIsMaximized(maximized);
      } catch (error) {
        console.error('Failed to update maximize state:', error);
      }
    };

    updateMaximizeState();

    const unlistenPromise = getCurrentWindow().onResized(() => {
      updateMaximizeState();
    });

    return () => {
      unlistenPromise.then((f: () => void) => {
        f();
      }).catch((error: any) => {
        console.error('Failed to setup resize listener:', error);
      });
    };
  }, []);

  const toggleAlwaysOnTop = useCallback(async () => {
    try {
      const window = getCurrentWindow();
      const newIsAlwaysOnTop = !isAlwaysOnTop;
      await window.setAlwaysOnTop(newIsAlwaysOnTop);
      setIsAlwaysOnTop(newIsAlwaysOnTop);
    } catch (error) {
      console.error('Failed to toggle always on top:', error);
    }
  }, [isAlwaysOnTop]);

  const minimizeWindow = useCallback(() => {
    try {
      const window = getCurrentWindow();
      window.minimize().catch((err: any) => console.error('Failed to minimize window:', err));
    } catch (error) {
      console.error('Failed to get window for minimize:', error);
    }
  }, []);

  const toggleMaximize = useCallback(async () => {
    try {
      const window = getCurrentWindow();
      const isMaximized = await window.isMaximized();
      if (isMaximized) {
        await window.unmaximize();
      } else {
        await window.maximize();
      }
    } catch (error) {
      console.error('Failed to toggle maximize:', error);
    }
  }, []);

  const closeWindow = useCallback(() => {
    try {
      const window = getCurrentWindow();
      window.close().catch((err: any) => console.error('Failed to close window:', err));
    } catch (error) {
      console.error('Failed to get window for close:', error);
    }
  }, []);

  return (
    <Box
          sx={{
            height: 30,
            backgroundColor: '#1E1E1E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 1,
            userSelect: 'none',
            borderBottom: '1px solid #3c3c3c',
          }}
        >
      <Box data-tauri-drag-region sx={{ flexGrow: 1, height: '100%' }} />
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <IconButton
          size="small"
          onClick={toggleAlwaysOnTop}
          sx={{
            color: '#cccccc',
            width: 46,
            height: 30,
            borderRadius: 0,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            },
          }}
        >
          {isAlwaysOnTop ? <PushPin sx={{ fontSize: '1rem', transform: 'rotate(45deg)', transition: 'transform 0.2s ease' }} /> : <PushPinOutlined sx={{ fontSize: '1rem', transition: 'transform 0.2s ease' }} />}
        </IconButton>
        <IconButton
          size="small"
          onClick={minimizeWindow}
          sx={{
            color: '#cccccc',
            width: 46,
            height: 30,
            borderRadius: 0,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            },
          }}
        >
          <Minimize sx={{ fontSize: '1rem' }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={toggleMaximize}
          sx={{
            color: '#cccccc',
            width: 46,
            height: 30,
            borderRadius: 0,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            },
          }}
        >
          {isMaximized ? <FilterNone sx={{ fontSize: '1rem' }} /> : <CropSquare sx={{ fontSize: '1rem' }} />}
        </IconButton>
        <IconButton
          size="small"
          onClick={closeWindow}
          sx={{
            color: '#cccccc',
            width: 46,
            height: 30,
            borderRadius: 0,
            '&:hover': {
              backgroundColor: '#E81123'
            },
          }}
        >
          <Close sx={{ fontSize: '1rem' }} />
        </IconButton>
      </Box>
    </Box>
  );
}
import { SxProps, Theme } from '@mui/material/styles';

export const tableRowStyle: SxProps<Theme> = {
  cursor: "pointer",
  "&:hover": {
    backgroundColor: "action.hover",
  },
  display: 'flex',
  width: '100%',
};

export const idCellStyle: SxProps<Theme> = { width: '80px', flexShrink: 0 };
export const timecodeCellStyle: SxProps<Theme> = { width: '150px', flexShrink: 0 };
export const textCellStyle: SxProps<Theme> = {
  flexGrow: 1,
  padding: 0,
  whiteSpace: 'normal',
  wordBreak: 'break-word',
};

export const textFieldStyle: SxProps<Theme> = {
  height: '100%',
  '& .MuiOutlinedInput-root': {
    height: '100%',
    padding: 0,
    boxSizing: 'border-box',
    '& .MuiOutlinedInput-notchedOutline': {
      border: '1px solid #1976d2',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderWidth: '1px',
    },
  },
  '& .MuiInputBase-input': {
    padding: '4px',
    height: '100%',
    boxSizing: 'border-box',
  },
};

export const textDisplayStyle: React.CSSProperties = {
  padding: '4px',
  height: 'auto', // Allow height to grow with content
  minHeight: '36px', // Maintain a minimum height
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
};

// VSCode 风格的滚动条样式
export const scrollbarStyle: SxProps<Theme> = {
  // Firefox
  scrollbarWidth: 'thin',
  scrollbarColor: '#424242 transparent',
  
  // Webkit browsers (Chrome, Safari, Edge)
  '&::-webkit-scrollbar': {
    width: '10px',
    height: '10px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#424242',
    border: '2px solid transparent',
    backgroundClip: 'content-box',
    
    '&:hover': {
      backgroundColor: '#616161',
    },
  },
  '&::-webkit-scrollbar-corner': {
    backgroundColor: 'transparent',
  },
};
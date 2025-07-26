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
export const textCellStyle: SxProps<Theme> = { flexGrow: 1, padding: 0 };

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
    padding: '16px',
    height: '100%',
    boxSizing: 'border-box',
  },
};

export const textDisplayStyle: React.CSSProperties = {
  padding: '16px',
  height: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center'
};
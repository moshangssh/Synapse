import { SxProps, Theme } from '@mui/material/styles';

// 通用对齐样式
export const flexStartAlign: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'flex-start',
};

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
  whiteSpace: 'pre-wrap', // 保留换行符并允许自动换行
  wordBreak: 'break-word',
  overflow: 'hidden', // 防止内容溢出
  ...flexStartAlign,
  minHeight: '36px', // 最小高度
};

export const textFieldStyle: SxProps<Theme> = {
  height: '100%',
  '& .MuiOutlinedInput-root': {
    height: '100%',
    padding: 0,
    boxSizing: 'border-box',
    alignItems: 'flex-start', // 顶部对齐
    '& .MuiOutlinedInput-notchedOutline': {
      border: '1px solid transparent',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderWidth: '1px',
      borderColor: 'primary.main',
    },
  },
  '& .MuiInputBase-input': {
    padding: '4px 8px',
    height: '100%',
    boxSizing: 'border-box',
    lineHeight: '1.5', // 设置与文本显示状态一致的行高
    whiteSpace: 'pre-wrap', // 保留换行符并允许自动换行
    wordBreak: 'break-word', // 允许长单词换行
  },
  '& .MuiInputBase-multiline': {
    padding: 0,
    alignItems: 'flex-start', // 确保多行文本顶部对齐
  },
};

export const textDisplayStyle: React.CSSProperties = {
  padding: '4px 8px',
  height: 'auto', // Allow height to grow with content
  minHeight: '36px', // Maintain a minimum height
  boxSizing: 'border-box',
  ...flexStartAlign,
  whiteSpace: 'pre-wrap', // 保留换行符并允许自动换行
  wordBreak: 'break-word',
  overflow: 'hidden', // 防止内容溢出
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
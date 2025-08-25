import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#1e1e1e',
      paper: '#252526',
    },
    text: {
      primary: '#cccccc',
      secondary: '#969696',
    },
    primary: {
      main: '#007acc',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#37373d',
    },
    divider: '#3c3c3c',
    action: {
      hover: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(255, 255, 255, 0.16)',
    },
  },
  typography: {
    fontSize: 12,
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  },
  components: {
    MuiButtonBase: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.15s ease-in-out, border-color 0.15s ease-in-out',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          transition: 'border-color 0.15s ease-in-out',
        },
      },
    },
    // 统一所有按钮风格
    MuiButton: {
      defaultProps: {
        variant: 'contained',
      },
      styleOverrides: {
        root: {
          textTransform: 'none', // VS Code按钮通常不是全大写
          boxShadow: 'none',
          borderRadius: '2px',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    // 统一输入框风格
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#3c3c3c',
            borderRadius: '2px',
            '& fieldset': {
              borderColor: '#464647',
            },
            '&:hover fieldset': {
              borderColor: '#464647',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#007acc', // 焦点蓝色
            },
          },
          '& .MuiInputBase-input': {
            padding: '4px 8px',
          },
        },
      },
    },
    // 统一Paper组件风格
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // 移除Material Design的渐变效果
          backgroundColor: '#252526',
          transition: 'background-color 0.15s ease-in-out',
        },
      },
    },
    // 统一列表项风格
    MuiListItem: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 255, 255, 0.16)',
          },
          '&.Mui-selected:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.24)',
          },
        },
      },
    },
  },
});

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#ffffff',
      paper: '#f5f5f5',
    },
    text: {
      primary: '#333333',
      secondary: '#757575',
    },
    primary: {
      main: '#007acc',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#e0e0e0',
    },
    divider: '#dcdcdc',
    action: {
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
    },
  },
  typography: {
    fontSize: 12,
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  },
});
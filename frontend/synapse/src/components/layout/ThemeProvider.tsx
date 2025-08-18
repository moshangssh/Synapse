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
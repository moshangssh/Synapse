import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { ReactNode } from 'react';

const theme = createTheme({
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
      hover: '#37373d',
      selected: '#37373d',
    },
  },
  typography: {
    fontSize: 12,
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    h6: {
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      fontWeight: 400,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#1e1e1e',
          color: '#cccccc',
          fontSize: '12px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          minWidth: 'auto',
          padding: '8px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
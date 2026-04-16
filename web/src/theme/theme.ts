import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#63c7b2', // accent color
    },
    secondary: {
      main: '#1d242c',
    },
    background: {
      default: '#12161b',
      paper: '#1d242c',
    },
    text: {
      primary: '#ffffff',
      secondary: '#97a4ad',
    },
    error: {
      main: '#c65a5a',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none' },
      },
    },
  },
});
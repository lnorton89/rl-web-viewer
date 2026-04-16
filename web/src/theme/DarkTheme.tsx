import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ReactNode } from 'react';
import { darkTheme } from './theme.js';

interface DarkThemeProps {
  children: ReactNode;
}

export function DarkTheme({ children }: DarkThemeProps) {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
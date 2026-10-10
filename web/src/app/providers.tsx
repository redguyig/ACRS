'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from '@/lib/auth';
import { useState } from 'react';

/* ── MUI Dark Theme matching ACRS design tokens ── */
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0B0E14',
      paper: '#11141B',
    },
    primary: {
      main: '#22D3EE',
      light: '#67E8F9',
      dark: '#06B6D4',
    },
    secondary: {
      main: '#A855F7',
      light: '#C084FC',
      dark: '#7C3AED',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
    },
    warning: {
      main: '#EAB308',
      light: '#FACC15',
    },
    success: {
      main: '#22C55E',
      light: '#4ADE80',
    },
    info: {
      main: '#3B82F6',
      light: '#60A5FA',
    },
    text: {
      primary: '#E6EDF3',
      secondary: '#8B949E',
      disabled: '#484F58',
    },
    divider: '#1F2937',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#11141B',
          border: '1px solid #1F2937',
          borderRadius: 16,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderColor: '#30363D',
        },
        outlined: {
          borderColor: '#30363D',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 0 20px rgba(34, 211, 238, 0.2)',
          },
        },
        outlined: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          borderColor: '#30363D',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#161B22',
          border: '1px solid #30363D',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#30363D',
            },
          },
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

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
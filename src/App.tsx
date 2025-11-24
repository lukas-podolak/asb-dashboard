import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ColorModeContext } from './contexts/ColorModeContext';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import { useState, useMemo } from 'react';

function App() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [],
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === 'light' ? '#000000' : '#FFD700',
            contrastText: mode === 'light' ? '#FFFFFF' : '#000000',
          },
          secondary: {
            main: '#FFD700',
            contrastText: '#000000',
          },
          background: {
            default: mode === 'light' ? '#FFFFFF' : '#121212',
            paper: mode === 'light' ? '#FFFFFF' : '#1E1E1E',
          },
          text: {
            primary: mode === 'light' ? '#000000' : '#FFFFFF',
            secondary: mode === 'light' ? '#666666' : '#AAAAAA',
          },
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: '#000000',
                color: '#FFFFFF',
                '& .MuiIconButton-root': {
                  color: '#FFD700',
                },
                '& .MuiSvgIcon-root': {
                  color: '#FFD700',
                },
                '& .MuiButton-root': {
                  color: '#FFFFFF',
                  '& .MuiSvgIcon-root': {
                    color: '#FFD700',
                  },
                },
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              contained: {
                backgroundColor: '#FFD700',
                color: '#000000',
                '&:hover': {
                  backgroundColor: '#FFC700',
                },
              },
              outlined: {
                borderColor: mode === 'light' ? '#000000' : '#FFD700',
                color: mode === 'light' ? '#000000' : '#FFD700',
                '&:hover': {
                  borderColor: '#FFD700',
                  backgroundColor: 'rgba(255, 215, 0, 0.1)',
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                backgroundColor: '#FFD700',
                color: '#000000',
              },
              outlined: {
                borderColor: mode === 'light' ? '#000000' : '#FFD700',
                color: mode === 'light' ? '#000000' : '#FFD700',
              },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                color: '#FFD700',
                '&:hover': {
                  backgroundColor: 'rgba(255, 215, 0, 0.1)',
                },
              },
            },
          },
          MuiSvgIcon: {
            styleOverrides: {
              root: {
                '&.MuiSvgIcon-colorPrimary': {
                  color: '#FFD700',
                },
              },
            },
          },
          MuiListItemIcon: {
            styleOverrides: {
              root: {
                color: '#FFD700',
                minWidth: 40,
              },
            },
          },
        },
      }),
    [mode],
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/user-management"
                element={
                  <AdminRoute>
                    <UserManagement />
                  </AdminRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;

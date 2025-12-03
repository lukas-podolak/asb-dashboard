import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';

interface TrenerRouteProps {
  children: React.ReactNode;
}

const TrenerRoute: React.FC<TrenerRouteProps> = ({ children }) => {
  const { currentUser, isTrener, isAdmin, isFunkcionar, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Admin, Funkcionář nebo Trenér mají přístup
  if (!isAdmin && !isFunkcionar && !isTrener) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 3 }}>
        <Paper sx={{ p: 4, maxWidth: 500 }}>
          <Typography variant="h5" gutterBottom color="error">
            Přístup odepřen
          </Typography>
          <Typography>
            Nemáte oprávnění pro zobrazení této stránky. Vyžaduje se role ASB_TRENER, ASB_FUNKCIONAR nebo ASB_ADMIN.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return <>{children}</>;
};

export default TrenerRoute;

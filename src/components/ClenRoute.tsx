import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';

interface ClenRouteProps {
  children: React.ReactNode;
}

const ClenRoute: React.FC<ClenRouteProps> = ({ children }) => {
  const { currentUser, isClen, isTrener, isAdmin, isFunkcionar, loading } = useAuth();

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

  // Admin, Funkcionář, Trenér nebo Člen mají přístup
  if (!isAdmin && !isFunkcionar && !isTrener && !isClen) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 3 }}>
        <Paper sx={{ p: 4, maxWidth: 500 }}>
          <Typography variant="h5" gutterBottom color="error">
            Přístup odepřen
          </Typography>
          <Typography>
            Nemáte oprávnění pro zobrazení této stránky. Vyžaduje se role ASB_CLEN, ASB_TRENER, ASB_FUNKCIONAR nebo ASB_ADMIN.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return <>{children}</>;
};

export default ClenRoute;

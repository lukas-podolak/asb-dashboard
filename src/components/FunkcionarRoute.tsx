import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Box, CircularProgress } from '@mui/material';

interface FunkcionarRouteProps {
  children: React.ReactNode;
}

const FunkcionarRoute: React.FC<FunkcionarRouteProps> = ({ children }) => {
  const { currentUser, isAdmin, isFunkcionar, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Přístup mají administrátoři i funkcionáři
  if (!isAdmin && !isFunkcionar) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

export default FunkcionarRoute;

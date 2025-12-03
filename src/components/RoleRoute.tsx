import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';
import { UserRole } from '../types/user';
import { canAccess, getRoleLabel } from '../utils/roleHelpers';

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: readonly UserRole[];
  redirectOnDenied?: string;
  showMessage?: boolean;
}

/**
 * Univerzální komponenta pro ochranu tras podle rolí
 * 
 * @param allowedRoles - Pole povolených rolí (hierarchie: admin > funkcionář > trenér > člen)
 * @param redirectOnDenied - Kam přesměrovat při odepření (výchozí: /dashboard)
 * @param showMessage - Zda zobrazit zprávu o odepření místo přesměrování
 * 
 * @example
 * // Pouze admin
 * <RoleRoute allowedRoles={[UserRole.ASB_ADMIN]}>
 *   <AdminPage />
 * </RoleRoute>
 * 
 * @example
 * // Admin nebo funkcionář
 * <RoleRoute allowedRoles={[UserRole.ASB_ADMIN, UserRole.ASB_FUNKCIONAR]}>
 *   <MembersPage />
 * </RoleRoute>
 * 
 * @example
 * // Admin, funkcionář nebo trenér
 * <RoleRoute allowedRoles={[UserRole.ASB_ADMIN, UserRole.ASB_FUNKCIONAR, UserRole.ASB_TRENER]}>
 *   <TrainingPage />
 * </RoleRoute>
 * 
 * @example
 * // Jakákoliv role (pouze přihlášení uživatelé)
 * <RoleRoute allowedRoles={[UserRole.ASB_ADMIN, UserRole.ASB_FUNKCIONAR, UserRole.ASB_TRENER, UserRole.ASB_CLEN]}>
 *   <DashboardPage />
 * </RoleRoute>
 */
const RoleRoute: React.FC<RoleRouteProps> = ({ 
  children, 
  allowedRoles, 
  redirectOnDenied = '/dashboard',
  showMessage = true 
}) => {
  const { currentUser, userProfile, loading } = useAuth();

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

  // Kontrola, zda má uživatel některou z povolených rolí
  const hasAccess = allowedRoles.some(role => canAccess(userProfile, role));

  if (!hasAccess) {
    if (showMessage) {
      const roleLabels = allowedRoles.map(role => getRoleLabel(role)).join(', ');
      
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 3 }}>
          <Paper sx={{ p: 4, maxWidth: 500 }}>
            <Typography variant="h5" gutterBottom color="error">
              Přístup odepřen
            </Typography>
            <Typography>
              Nemáte oprávnění pro zobrazení této stránky.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Vyžaduje se některá z rolí: <strong>{roleLabels}</strong>
            </Typography>
          </Paper>
        </Box>
      );
    }
    
    return <Navigate to={redirectOnDenied} replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;

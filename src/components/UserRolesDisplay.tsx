import React from 'react';
import { Box, Card, CardContent, Typography, Chip, Stack } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { getRoleLabel, getRoleColor } from '../utils/roleHelpers';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import GroupIcon from '@mui/icons-material/Group';
import { UserRole } from '../types/user';

/**
 * Komponenta pro zobrazení aktuálních rolí uživatele
 * Použití: <UserRolesDisplay />
 */
const UserRolesDisplay: React.FC = () => {
  const { userProfile, userRoles, isAdmin, isFunkcionar, isTrener, isClen } = useAuth();

  if (!userProfile) {
    return null;
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ASB_ADMIN:
        return <AdminPanelSettingsIcon />;
      case UserRole.ASB_FUNKCIONAR:
        return <PersonIcon />;
      case UserRole.ASB_TRENER:
        return <SportsSoccerIcon />;
      case UserRole.ASB_CLEN:
        return <GroupIcon />;
      default:
        return <PersonIcon />;
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Vaše oprávnění
        </Typography>
        
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {userRoles.map((role) => (
            <Chip
              key={role}
              icon={getRoleIcon(role)}
              label={getRoleLabel(role)}
              color={getRoleColor(role)}
              size="small"
            />
          ))}
        </Stack>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Úroveň přístupu:</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isAdmin && '✓ Administrátor - plný přístup ke všem funkcím'}
            {!isAdmin && isFunkcionar && '✓ Funkcionář - správa členů a přístupového systému'}
            {!isAdmin && !isFunkcionar && isTrener && '✓ Trenér - zobrazení členů a tréninků'}
            {!isAdmin && !isFunkcionar && !isTrener && isClen && '✓ Člen - přístup k vlastnímu profilu'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default UserRolesDisplay;

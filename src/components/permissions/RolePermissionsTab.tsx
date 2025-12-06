import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
} from '@mui/icons-material';
import { UserRole } from '../../types/user';
import { AccessLevel, PageId, RolePermission } from '../../types/permission';
import {
  PAGE_METADATA,
  getPagesByCategory,
  getAccessLevelLabel,
  getAccessLevelColor,
  getRoleLabel,
  getRoleColor,
} from '../../utils/permissionHelpers';
import { setRolePermission, deleteRolePermission } from '../../utils/permissionService';
import { useAuth } from '../../hooks/useAuth';

interface RolePermissionsTabProps {
  rolePermissions: RolePermission[];
  onRefresh: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const RolePermissionsTab: React.FC<RolePermissionsTabProps> = ({
  rolePermissions,
  onRefresh,
  onSuccess,
  onError,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.ASB_TRENER);
  const [editedPermissions, setEditedPermissions] = useState<Partial<Record<PageId, AccessLevel>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);

  const allRoles = Object.values(UserRole);
  const categories = ['system', 'access', 'training', 'member'] as const;

  // Získat aktuální oprávnění pro vybranou roli a stránku
  const getCurrentPermission = (pageId: PageId): AccessLevel => {
    // Pokud je v editedPermissions, použít to
    if (editedPermissions[pageId]) {
      return editedPermissions[pageId];
    }
    // Jinak najít v rolePermissions
    const perm = rolePermissions.find((rp) => rp.roleId === selectedRole && rp.pageId === pageId);
    return perm?.accessLevel || PAGE_METADATA[pageId].defaultAccessLevel;
  };

  // Změna oprávnění
  const handlePermissionChange = (pageId: PageId, newLevel: AccessLevel) => {
    setEditedPermissions((prev) => ({
      ...prev,
      [pageId]: newLevel,
    }));
    setHasChanges(true);
  };

  // Zrušit změny
  const handleReset = () => {
    setEditedPermissions({});
    setHasChanges(false);
  };

  // Uložit změny
  const handleSave = async () => {
    if (!currentUser || !userProfile) {
      onError('Nejste přihlášen');
      return;
    }

    setSaving(true);
    try {
      // Uložit všechny změny
      for (const [pageIdStr, accessLevel] of Object.entries(editedPermissions)) {
        const pageId = pageIdStr as PageId;
        
        if (accessLevel === AccessLevel.NONE) {
          // Smazat oprávnění
          await deleteRolePermission(
            selectedRole,
            pageId,
            currentUser.uid,
            userProfile.email
          );
        } else {
          // Nastavit oprávnění
          await setRolePermission(
            selectedRole,
            pageId,
            accessLevel,
            currentUser.uid,
            userProfile.email
          );
        }
      }

      onSuccess(`Oprávnění pro roli "${getRoleLabel(selectedRole)}" byla uložena`);
      setEditedPermissions({});
      setHasChanges(false);
      setConfirmDialog(false);
      onRefresh();
    } catch (err: any) {
      console.error('Error saving role permissions:', err);
      onError(`Nepodařilo se uložit oprávnění: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ px: 3 }}>
      {/* Role selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <Box>
            <FormControl fullWidth>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Vyberte roli pro správu oprávnění:
              </Typography>
              <Select
                value={selectedRole}
                onChange={(e) => {
                  if (hasChanges) {
                    if (window.confirm('Máte neuložené změny. Opravdu chcete přepnout roli?')) {
                      setSelectedRole(e.target.value as UserRole);
                      setEditedPermissions({});
                      setHasChanges(false);
                    }
                  } else {
                    setSelectedRole(e.target.value as UserRole);
                  }
                }}
              >
                {allRoles.map((role) => (
                  <MenuItem key={role} value={role}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        label={getRoleLabel(role)}
                        color={getRoleColor(role)}
                        size="small"
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box>
            <Box display="flex" gap={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<UndoIcon />}
                onClick={handleReset}
                disabled={!hasChanges || saving}
              >
                Zrušit změny
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={() => setConfirmDialog(true)}
                disabled={!hasChanges || saving}
              >
                Uložit změny
              </Button>
            </Box>
          </Box>
        </Stack>

        {hasChanges && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Máte neuložené změny! Nezapomeňte je uložit.
          </Alert>
        )}
      </Paper>

      {/* Permissions by category */}
      {categories.map((category) => {
        const pages = getPagesByCategory(category);
        if (pages.length === 0) return null;

        const categoryLabel = {
          system: 'Systémové stránky',
          access: 'Správa přístupů',
          training: 'Tréninky',
          member: 'Členové',
        }[category];

        return (
          <Accordion key={category} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">{categoryLabel}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Stránka</strong></TableCell>
                      <TableCell><strong>Popis</strong></TableCell>
                      <TableCell width="200"><strong>Úroveň přístupu</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pages.map((page) => {
                      const currentLevel = getCurrentPermission(page.id);
                      const isChanged = editedPermissions[page.id] !== undefined;

                      return (
                        <TableRow
                          key={page.id}
                          sx={{
                            bgcolor: isChanged ? 'action.hover' : 'inherit',
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {page.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {page.path}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {page.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <FormControl fullWidth size="small">
                              <Select
                                value={currentLevel}
                                onChange={(e) =>
                                  handlePermissionChange(page.id, e.target.value as AccessLevel)
                                }
                              >
                                {Object.values(AccessLevel).map((level) => (
                                  <MenuItem key={level} value={level}>
                                    <Chip
                                      label={getAccessLevelLabel(level)}
                                      color={getAccessLevelColor(level)}
                                      size="small"
                                    />
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>Potvrdit změny oprávnění</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Opravdu chcete uložit změny oprávnění pro roli <strong>{getRoleLabel(selectedRole)}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Změny se okamžitě projeví u všech uživatelů s touto rolí.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)} disabled={saving}>
            Zrušit
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Ukládám...' : 'Uložit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RolePermissionsTab;

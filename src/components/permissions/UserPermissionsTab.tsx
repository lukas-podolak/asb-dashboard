import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
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
  IconButton,
  Checkbox,
  FormControlLabel,
  Alert,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { UserRole, UserProfile } from '../../types/user';
import { AccessLevel, PageId, UserPermission, RolePermission, EffectivePermission } from '../../types/permission';
import {
  PAGE_METADATA,
  getAccessLevelLabel,
  getAccessLevelColor,
  getRoleLabel,
  getRoleColor,
  calculateEffectivePermission,
} from '../../utils/permissionHelpers';
import {
  setUserPermission,
  deleteUserPermission,
} from '../../utils/permissionService';
import { getAllUsers } from '../../utils/userService';
import { useAuth } from '../../hooks/useAuth';

interface UserPermissionsTabProps {
  userPermissions: UserPermission[];
  rolePermissions: RolePermission[];
  onRefresh: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  currentUserId: string;
}

const UserPermissionsTab: React.FC<UserPermissionsTabProps> = ({
  userPermissions,
  rolePermissions,
  onRefresh,
  onSuccess,
  onError,
  currentUserId,
}) => {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; pageId: PageId } | null>(null);

  // Formulář pro editaci
  const [editPageId, setEditPageId] = useState<PageId>(PageId.DASHBOARD);
  const [editAccessLevel, setEditAccessLevel] = useState<AccessLevel>(AccessLevel.READ);
  const [editOverridesRole, setEditOverridesRole] = useState(false);
  const [saving, setSaving] = useState(false);

  // Načíst uživatele
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await getAllUsers();
        setUsers(allUsers);
        setFilteredUsers(allUsers);
      } catch (err: any) {
        console.error('Error loading users:', err);
        onError(`Nepodařilo se načíst uživatele: ${err.message}`);
      }
    };

    loadUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtrování uživatelů
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (u) =>
        u.email.toLowerCase().includes(query) ||
        u.displayName?.toLowerCase().includes(query) ||
        u.memberName?.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  // Získat oprávnění uživatele
  const getUserPermissionsForUser = (userId: string): UserPermission[] => {
    return userPermissions.filter((up) => up.userId === userId);
  };

  // Otevřít dialog pro přidání/editaci oprávnění
  const handleOpenEdit = (user: UserProfile, permission?: UserPermission) => {
    setSelectedUser(user);
    if (permission) {
      setEditPageId(permission.pageId);
      setEditAccessLevel(permission.accessLevel);
      setEditOverridesRole(permission.overridesRole);
    } else {
      setEditPageId(PageId.DASHBOARD);
      setEditAccessLevel(AccessLevel.READ);
      setEditOverridesRole(false);
    }
    setEditDialog(true);
  };

  // Uložit oprávnění
  const handleSave = async () => {
    if (!selectedUser || !userProfile) {
      onError('Nejste přihlášen');
      return;
    }

    // Kontrola - admin nemůže sám sobě odebrat admin oprávnění
    if (
      selectedUser.uid === currentUserId &&
      selectedUser.roles.includes(UserRole.ASB_ADMIN) &&
      editPageId === PageId.USER_MANAGEMENT &&
      editAccessLevel === AccessLevel.NONE
    ) {
      onError('Nemůžete sám sobě odebrat přístup ke správě uživatelů!');
      return;
    }

    setSaving(true);
    try {
      await setUserPermission(
        selectedUser.uid,
        editPageId,
        editAccessLevel,
        editOverridesRole,
        currentUserId,
        userProfile.email
      );

      onSuccess(`Oprávnění pro ${selectedUser.email} bylo uloženo`);
      setEditDialog(false);
      onRefresh();
    } catch (err: any) {
      console.error('Error saving user permission:', err);
      onError(`Nepodařilo se uložit oprávnění: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Smazat oprávnění
  const handleDelete = async () => {
    if (!deleteTarget || !userProfile) {
      onError('Nejste přihlášen');
      return;
    }

    // Kontrola - admin nemůže sám sobě odebrat admin oprávnění
    if (
      deleteTarget.userId === currentUserId &&
      deleteTarget.pageId === PageId.USER_MANAGEMENT
    ) {
      onError('Nemůžete sám sobě odebrat přístup ke správě uživatelů!');
      return;
    }

    setSaving(true);
    try {
      await deleteUserPermission(
        deleteTarget.userId,
        deleteTarget.pageId,
        currentUserId,
        userProfile.email
      );

      onSuccess('Oprávnění bylo odstraněno');
      setDeleteDialog(false);
      setDeleteTarget(null);
      onRefresh();
    } catch (err: any) {
      console.error('Error deleting user permission:', err);
      onError(`Nepodařilo se odstranit oprávnění: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Vypočítat efektivní oprávnění
  const getEffectivePermission = (user: UserProfile, pageId: PageId): EffectivePermission => {
    const userPerms = getUserPermissionsForUser(user.uid);
    return calculateEffectivePermission(pageId, user.roles, rolePermissions, userPerms);
  };

  return (
    <Box sx={{ px: 3 }}>
      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Hledat uživatele podle emailu nebo jména..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Users list */}
      {filteredUsers.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {searchQuery ? 'Žádní uživatelé nevyhovují vyhledávání' : 'Žádní uživatelé'}
          </Typography>
        </Paper>
      ) : (
        filteredUsers.map((user) => {
          const userPerms = getUserPermissionsForUser(user.uid);
          const isCurrentUser = user.uid === currentUserId;

          return (
            <Paper key={user.uid} sx={{ p: 2, mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                <Box>
                  <Typography variant="h6">
                    {user.displayName || user.email}
                    {isCurrentUser && (
                      <Chip label="Vy" color="primary" size="small" sx={{ ml: 1 }} />
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                  <Box display="flex" gap={0.5} mt={1}>
                    {user.roles.map((role) => (
                      <Chip
                        key={role}
                        label={getRoleLabel(role)}
                        color={getRoleColor(role)}
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleOpenEdit(user)}
                >
                  Přidat oprávnění
                </Button>
              </Box>

              {/* User's permissions */}
              {userPerms.length > 0 && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Stránka</strong></TableCell>
                        <TableCell><strong>Úroveň přístupu</strong></TableCell>
                        <TableCell><strong>Přebíjí role</strong></TableCell>
                        <TableCell><strong>Efektivní oprávnění</strong></TableCell>
                        <TableCell width="100"><strong>Akce</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {userPerms.map((perm) => {
                        const effective = getEffectivePermission(user, perm.pageId);
                        const pageName = PAGE_METADATA[perm.pageId]?.name || perm.pageId;

                        return (
                          <TableRow key={perm.id}>
                            <TableCell>{pageName}</TableCell>
                            <TableCell>
                              <Chip
                                label={getAccessLevelLabel(perm.accessLevel)}
                                color={getAccessLevelColor(perm.accessLevel)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {perm.overridesRole ? (
                                <Chip label="Ano" color="warning" size="small" />
                              ) : (
                                <Chip label="Ne" color="default" size="small" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Chip
                                  label={getAccessLevelLabel(effective.accessLevel)}
                                  color={getAccessLevelColor(effective.accessLevel)}
                                  size="small"
                                />
                                <Tooltip
                                  title={
                                    effective.source === 'USER'
                                      ? 'Použito uživatelské oprávnění'
                                      : effective.source === 'ROLE'
                                      ? 'Použito oprávnění z role'
                                      : 'Kombinace role a uživatelského oprávnění'
                                  }
                                >
                                  <InfoIcon fontSize="small" color="action" />
                                </Tooltip>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box display="flex" gap={0.5}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenEdit(user, perm)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setDeleteTarget({ userId: user.uid, pageId: perm.pageId });
                                    setDeleteDialog(true);
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {userPerms.length === 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Tento uživatel nemá žádná individuální oprávnění. Používají se pouze oprávnění z rolí.
                </Alert>
              )}
            </Paper>
          );
        })
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedUser && `Upravit oprávnění pro ${selectedUser.email}`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Stránka:
              </Typography>
              <Select
                value={editPageId}
                onChange={(e) => setEditPageId(e.target.value as PageId)}
              >
                {Object.values(PAGE_METADATA).map((page) => (
                  <MenuItem key={page.id} value={page.id}>
                    {page.name} ({page.path})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Úroveň přístupu:
              </Typography>
              <Select
                value={editAccessLevel}
                onChange={(e) => setEditAccessLevel(e.target.value as AccessLevel)}
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

            <FormControlLabel
              control={
                <Checkbox
                  checked={editOverridesRole}
                  onChange={(e) => setEditOverridesRole(e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Přebít oprávnění z rolí</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pokud je zaškrtnuto, toto oprávnění má přednost před oprávněními z rolí
                  </Typography>
                </Box>
              }
            />

            {selectedUser && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Aktuální efektivní oprávnění:</strong>
                </Typography>
                <Box display="flex" gap={1} mt={1}>
                  {selectedUser.roles.map((role) => {
                    const rolePerms = rolePermissions.filter(
                      (rp) => rp.roleId === role && rp.pageId === editPageId
                    );
                    return rolePerms.map((rp) => (
                      <Chip
                        key={`${role}-${rp.pageId}`}
                        label={`${getRoleLabel(role)}: ${getAccessLevelLabel(rp.accessLevel)}`}
                        size="small"
                      />
                    ));
                  })}
                </Box>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)} startIcon={<CloseIcon />}>
            Zrušit
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saving}
          >
            {saving ? 'Ukládám...' : 'Uložit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Odstranit oprávnění</DialogTitle>
        <DialogContent>
          <Typography>Opravdu chcete odstranit toto uživatelské oprávnění?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Uživatel bude používat pouze oprávnění z rolí.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Zrušit</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={saving}>
            {saving ? 'Odstraňuji...' : 'Odstranit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserPermissionsTab;

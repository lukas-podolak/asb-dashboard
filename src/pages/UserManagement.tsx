import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  Alert,
  Chip,
} from '@mui/material';
import { Edit, Delete, PersonAdd } from '@mui/icons-material';
import Layout from '../components/Layout';
import MemberAccountManager from '../components/MemberAccountManager';
import { useAuth } from '../hooks/useAuth';
import type { UserProfile, CreateUserData, UpdateUserData } from '../types/user';
import { UserRole } from '../types/user';
import { getRoleLabel, getRoleColor } from '../utils/roleHelpers';
import { 
  getAllUsers, 
  updateUserProfile, 
  deleteUserProfile,
  createUserProfile 
} from '../utils/userService';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  
  // Form states
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    password: '',
    displayName: '',
    roles: [],
  });

  const { currentUser, isAdmin } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (err) {
      setError('Nepodařilo se načíst uživatele');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    try {
      setError('');
      setSuccess('');
      
      // Vytvoření uživatele v Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      // Vytvoření profilu v Firestore
      await createUserProfile(
        userCredential.user.uid,
        formData.email,
        formData.displayName,
        formData.roles
      );
      
      setSuccess('Uživatel byl úspěšně vytvořen');
      setOpenAddDialog(false);
      resetForm();
      loadUsers();
    } catch (err: any) {
      setError(`Nepodařilo se vytvořit uživatele: ${err.message}`);
      console.error(err);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      setError('');
      setSuccess('');
      
      const updates: UpdateUserData = {
        displayName: formData.displayName,
        roles: formData.roles,
      };
      
      await updateUserProfile(selectedUser.uid, updates);
      
      setSuccess('Uživatel byl úspěšně aktualizován');
      setOpenEditDialog(false);
      resetForm();
      loadUsers();
    } catch (err: any) {
      setError(`Nepodařilo se aktualizovat uživatele: ${err.message}`);
      console.error(err);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    // Ochrana před smazáním sebe sama
    if (selectedUser.uid === currentUser?.uid) {
      setError('Nemůžete smazat svůj vlastní účet');
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      await deleteUserProfile(selectedUser.uid);
      
      setSuccess('Uživatel byl úspěšně smazán');
      setOpenDeleteDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      setError(`Nepodařilo se smazat uživatele: ${err.message}`);
      console.error(err);
    }
  };

  const openEditDialogForUser = (user: UserProfile) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '', // Heslo není editovatelné
      displayName: user.displayName || '',
      roles: user.roles,
    });
    setOpenEditDialog(true);
  };

  const openDeleteDialogForUser = (user: UserProfile) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      displayName: '',
      roles: [],
    });
    setSelectedUser(null);
  };

  const handleRoleToggle = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role],
    }));
  };

  return (
    <Layout>
      {/* Členské účty */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <MemberAccountManager />
      </Paper>

      {/* Administrátorské účty */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Správa administrátorských účtů</Typography>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => {
              resetForm();
              setOpenAddDialog(true);
            }}
          >
            Přidat uživatele
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Jméno</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Vytvořeno</TableCell>
                <TableCell align="right">Akce</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Načítání...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Žádní uživatelé
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.displayName || '-'}</TableCell>
                    <TableCell>
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <Chip 
                            key={role} 
                            label={getRoleLabel(role)} 
                            color={getRoleColor(role)}
                            size="small" 
                            sx={{ mr: 0.5, mb: 0.5 }} 
                          />
                        ))
                      ) : (
                        <Chip label="Žádné role" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>{user.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="primary"
                        onClick={() => openEditDialogForUser(user)}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => openDeleteDialogForUser(user)}
                        disabled={user.uid === currentUser?.uid}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add User Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Přidat nového uživatele</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Heslo"
            type="password"
            fullWidth
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            helperText="Minimálně 6 znaků"
          />
          <TextField
            margin="dense"
            label="Jméno"
            type="text"
            fullWidth
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          />
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Role
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.roles.includes(UserRole.ASB_ADMIN)}
                  onChange={() => handleRoleToggle(UserRole.ASB_ADMIN)}
                  disabled={!isAdmin}
                />
              }
              label="ASB_ADMIN - Administrátor"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.roles.includes(UserRole.ASB_FUNKCIONAR)}
                  onChange={() => handleRoleToggle(UserRole.ASB_FUNKCIONAR)}
                  disabled={!isAdmin}
                />
              }
              label="ASB_FUNKCIONAR - Funkcionář"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.roles.includes(UserRole.ASB_TRENER)}
                  onChange={() => handleRoleToggle(UserRole.ASB_TRENER)}
                  disabled={!isAdmin}
                />
              }
              label="ASB_TRENER - Trenér"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.roles.includes(UserRole.ASB_CLEN)}
                  onChange={() => handleRoleToggle(UserRole.ASB_CLEN)}
                  disabled={!isAdmin}
                />
              }
              label="ASB_CLEN - Člen"
            />
            {!isAdmin && (
              <Typography variant="caption" color="text.secondary" display="block">
                Pouze administrátoři mohou přiřazovat role
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>Zrušit</Button>
          <Button 
            onClick={handleAddUser} 
            variant="contained"
            disabled={!formData.email || !formData.password || formData.password.length < 6}
          >
            Přidat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upravit uživatele</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            disabled
            value={formData.email}
          />
          <TextField
            margin="dense"
            label="Jméno"
            type="text"
            fullWidth
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          />
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Role
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.roles.includes(UserRole.ASB_ADMIN)}
                  onChange={() => handleRoleToggle(UserRole.ASB_ADMIN)}
                  disabled={!isAdmin || selectedUser?.uid === currentUser?.uid}
                />
              }
              label="ASB_ADMIN - Administrátor"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.roles.includes(UserRole.ASB_FUNKCIONAR)}
                  onChange={() => handleRoleToggle(UserRole.ASB_FUNKCIONAR)}
                  disabled={!isAdmin || selectedUser?.uid === currentUser?.uid}
                />
              }
              label="ASB_FUNKCIONAR - Funkcionář"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.roles.includes(UserRole.ASB_TRENER)}
                  onChange={() => handleRoleToggle(UserRole.ASB_TRENER)}
                  disabled={!isAdmin || selectedUser?.uid === currentUser?.uid}
                />
              }
              label="ASB_TRENER - Trenér"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.roles.includes(UserRole.ASB_CLEN)}
                  onChange={() => handleRoleToggle(UserRole.ASB_CLEN)}
                  disabled={!isAdmin || selectedUser?.uid === currentUser?.uid}
                />
              }
              label="ASB_CLEN - Člen"
            />
            {selectedUser?.uid === currentUser?.uid && (
              <Typography variant="caption" color="text.secondary" display="block">
                Nemůžete změnit své vlastní role
              </Typography>
            )}
            {!isAdmin && selectedUser?.uid !== currentUser?.uid && (
              <Typography variant="caption" color="text.secondary" display="block">
                Pouze administrátoři mohou přiřazovat role
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Zrušit</Button>
          <Button onClick={handleEditUser} variant="contained">
            Uložit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Smazat uživatele</DialogTitle>
        <DialogContent>
          <Typography>
            Opravdu chcete smazat uživatele <strong>{selectedUser?.email}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            Tato akce je nevratná.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Zrušit</Button>
          <Button onClick={handleDeleteUser} variant="contained" color="error">
            Smazat
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default UserManagement;

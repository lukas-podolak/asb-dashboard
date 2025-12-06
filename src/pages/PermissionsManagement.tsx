import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/user';
import {
  RolePermission,
  UserPermission,
  PermissionAuditLog,
} from '../types/permission';
import {
  getAllRolePermissions,
  getAllUserPermissions,
  getPermissionAuditLog,
} from '../utils/permissionService';
import {
  RolePermissionsTab,
  UserPermissionsTab,
  AuditLogTab,
} from '../components/permissions';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const PermissionsManagement: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [auditLog, setAuditLog] = useState<PermissionAuditLog[]>([]);

  const [showWarningDialog, setShowWarningDialog] = useState(false);

  // Kontrola admin oprávnění
  useEffect(() => {
    if (userProfile && !userProfile.roles.includes(UserRole.ASB_ADMIN)) {
      setError('Nemáte oprávnění pro přístup k této stránce');
      setShowWarningDialog(true);
    }
  }, [userProfile]);

  // Načtení dat
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [rolePerms, userPerms, audit] = await Promise.all([
        getAllRolePermissions(),
        getAllUserPermissions(),
        getPermissionAuditLog(100),
      ]);

      setRolePermissions(rolePerms);
      setUserPermissions(userPerms);
      setAuditLog(audit);
    } catch (err: any) {
      console.error('Error loading permissions:', err);
      setError(`Nepodařilo se načíst oprávnění: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.roles.includes(UserRole.ASB_ADMIN)) {
      loadData();
    }
  }, [userProfile]);

  const handleRefresh = () => {
    loadData();
    setSuccess('Data byla obnovena');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Pokud není admin, zobrazit varování
  if (!userProfile?.roles.includes(UserRole.ASB_ADMIN)) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            Nemáte oprávnění pro přístup k této stránce. Pouze administrátoři mohou spravovat oprávnění.
          </Alert>
        </Box>
        <Dialog open={showWarningDialog} onClose={() => window.location.href = '/dashboard'}>
          <DialogTitle>Přístup odepřen</DialogTitle>
          <DialogContent>
            <Typography>
              Tato stránka je dostupná pouze pro administrátory systému.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => window.location.href = '/dashboard'} variant="contained">
              Zpět na Dashboard
            </Button>
          </DialogActions>
        </Dialog>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <SecurityIcon sx={{ fontSize: 40, color: 'error.main' }} />
              <Box>
                <Typography variant="h4" gutterBottom>
                  Správa oprávnění
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Centralizovaná správa přístupových práv pro uživatele a role
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
            >
              Obnovit
            </Button>
          </Box>
        </Paper>

        {/* Success/Error messages */}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab
              icon={<GroupIcon />}
              label="Oprávnění podle rolí"
              iconPosition="start"
            />
            <Tab
              icon={<PersonIcon />}
              label="Oprávnění podle uživatelů"
              iconPosition="start"
            />
            <Tab
              icon={<HistoryIcon />}
              label="Historie změn"
              iconPosition="start"
            />
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            <RolePermissionsTab
              rolePermissions={rolePermissions}
              onRefresh={loadData}
              onSuccess={(msg) => {
                setSuccess(msg);
                setTimeout(() => setSuccess(''), 3000);
              }}
              onError={setError}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <UserPermissionsTab
              userPermissions={userPermissions}
              rolePermissions={rolePermissions}
              onRefresh={loadData}
              onSuccess={(msg: string) => {
                setSuccess(msg);
                setTimeout(() => setSuccess(''), 3000);
              }}
              onError={setError}
              currentUserId={currentUser?.uid || ''}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <AuditLogTab auditLog={auditLog} onRefresh={loadData} />
          </TabPanel>
        </Paper>

        {/* Info box */}
        <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            ℹ️ Důležité informace
          </Typography>
          <Typography variant="body2">
            • Oprávnění na úrovni uživatele mohou přebít oprávnění z role pokud je zaškrtnuto "Přebít role"
            <br />
            • Pokud má uživatel více rolí, použije se nejvyšší úroveň přístupu
            <br />
            • Admin nemůže sám sobě odebrat admin oprávnění
            <br />• Všechny změny jsou zaznamenány v historii pro audit
          </Typography>
        </Paper>
      </Box>
    </Layout>
  );
};

export default PermissionsManagement;

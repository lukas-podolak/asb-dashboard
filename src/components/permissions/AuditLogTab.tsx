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
  Chip,
  TextField,
  InputAdornment,
  Alert,
  TablePagination,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { PermissionAuditLog } from '../../types/permission';
import {
  PAGE_METADATA,
  getAccessLevelLabel,
  getAccessLevelColor,
  getRoleLabel,
} from '../../utils/permissionHelpers';

interface AuditLogTabProps {
  auditLog: PermissionAuditLog[];
  onRefresh: () => void;
}

const AuditLogTab: React.FC<AuditLogTabProps> = ({ auditLog }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filtrování
  const filteredLog = auditLog.filter((log) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.adminEmail.toLowerCase().includes(query) ||
      log.targetId.toLowerCase().includes(query) ||
      log.pageId.toLowerCase().includes(query)
    );
  });

  // Paginace
  const paginatedLog = filteredLog.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Ikona akce
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <AddIcon fontSize="small" color="success" />;
      case 'UPDATE':
        return <EditIcon fontSize="small" color="primary" />;
      case 'DELETE':
        return <DeleteIcon fontSize="small" color="error" />;
      default:
        return null;
    }
  };

  // Label akce
  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'Vytvořeno';
      case 'UPDATE':
        return 'Upraveno';
      case 'DELETE':
        return 'Smazáno';
      default:
        return action;
    }
  };

  // Barva akce
  const getActionColor = (
    action: string
  ): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
    switch (action) {
      case 'CREATE':
        return 'success';
      case 'UPDATE':
        return 'primary';
      case 'DELETE':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ px: 3 }}>
      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Hledat v historii (admin, uživatel, stránka)..."
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

      {/* Info */}
      <Alert severity="info" sx={{ mb: 2 }}>
        Historie zobrazuje posledních 100 změn oprávnění. Zobrazeno: {filteredLog.length} záznamů
      </Alert>

      {/* Audit Log Table */}
      {filteredLog.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {searchQuery ? 'Žádné záznamy nevyhovují vyhledávání' : 'Žádné záznamy'}
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="180"><strong>Datum a čas</strong></TableCell>
                  <TableCell width="120"><strong>Akce</strong></TableCell>
                  <TableCell><strong>Administrátor</strong></TableCell>
                  <TableCell width="100"><strong>Typ</strong></TableCell>
                  <TableCell><strong>Cíl</strong></TableCell>
                  <TableCell><strong>Stránka</strong></TableCell>
                  <TableCell width="120"><strong>Předchozí</strong></TableCell>
                  <TableCell width="120"><strong>Nová</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedLog.map((log) => {
                  const pageName = PAGE_METADATA[log.pageId]?.name || log.pageId;
                  const targetLabel =
                    log.targetType === 'ROLE' ? getRoleLabel(log.targetId as any) : log.targetId;

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Typography variant="body2">
                          {log.timestamp.toLocaleDateString('cs-CZ')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {log.timestamp.toLocaleTimeString('cs-CZ')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {getActionIcon(log.action)}
                          <Chip
                            label={getActionLabel(log.action)}
                            color={getActionColor(log.action)}
                            size="small"
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{log.adminEmail}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.targetType === 'ROLE' ? 'Role' : 'Uživatel'}
                          color={log.targetType === 'ROLE' ? 'secondary' : 'primary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap title={targetLabel}>
                          {targetLabel}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{pageName}</Typography>
                      </TableCell>
                      <TableCell>
                        {log.oldAccessLevel && (
                          <Chip
                            label={getAccessLevelLabel(log.oldAccessLevel)}
                            color={getAccessLevelColor(log.oldAccessLevel)}
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getAccessLevelLabel(log.newAccessLevel)}
                          color={getAccessLevelColor(log.newAccessLevel)}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredLog.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Záznamů na stránku:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} z ${count}`}
          />
        </Paper>
      )}
    </Box>
  );
};

export default AuditLogTab;

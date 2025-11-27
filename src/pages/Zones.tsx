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
  Alert,
  Chip as MuiChip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Add, Edit, Delete, Circle } from '@mui/icons-material';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import type { Zone, UpsertZone } from '../types/access';
import {
  getAllZones,
  createZone,
  updateZone,
  deleteZone,
} from '../utils/accessService';

const PRESET_COLORS = [
  '#FF5252', // Red
  '#FF6E40', // Deep Orange
  '#FFD740', // Yellow
  '#69F0AE', // Green
  '#40C4FF', // Light Blue
  '#448AFF', // Blue
  '#E040FB', // Purple
  '#FF4081', // Pink
];

const Zones: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [openDialog, setOpenDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [formData, setFormData] = useState<UpsertZone>({
    name: '',
    description: '',
    color: PRESET_COLORS[0],
    isActive: true,
  });

  const { currentUser } = useAuth();

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAllZones();
      setZones(data);
    } catch (err: any) {
      setError(`Nepodařilo se načíst zóny: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (zone?: Zone) => {
    if (zone) {
      setEditingZone(zone);
      setFormData({
        name: zone.name,
        description: zone.description || '',
        color: zone.color,
        isActive: zone.isActive,
      });
    } else {
      setEditingZone(null);
      setFormData({
        name: '',
        description: '',
        color: PRESET_COLORS[0],
        isActive: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingZone(null);
  };

  const handleSave = async () => {
    if (!currentUser) return;

    if (!formData.name.trim()) {
      setError('Název zóny je povinný');
      return;
    }

    try {
      setError('');
      setSuccess('');

      if (editingZone) {
        await updateZone(editingZone.id, formData, currentUser.uid);
        setSuccess('Zóna byla úspěšně aktualizována');
      } else {
        await createZone(formData, currentUser.uid);
        setSuccess('Zóna byla úspěšně vytvořena');
      }

      handleCloseDialog();
      loadZones();
    } catch (err: any) {
      setError(`Chyba: ${err.message}`);
      console.error(err);
    }
  };

  const handleDelete = async (zone: Zone) => {
    if (!window.confirm(`Opravdu chcete smazat zónu "${zone.name}"?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await deleteZone(zone.id);
      setSuccess('Zóna byla úspěšně smazána');
      loadZones();
    } catch (err: any) {
      setError(`Chyba při mazání: ${err.message}`);
      console.error(err);
    }
  };

  return (
    <Layout>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Přístupové zóny</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Přidat zónu
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
                <TableCell>Barva</TableCell>
                <TableCell>Název</TableCell>
                <TableCell>Popis</TableCell>
                <TableCell>Stav</TableCell>
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
              ) : zones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Žádné zóny
                  </TableCell>
                </TableRow>
              ) : (
                zones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell>
                      <Circle sx={{ color: zone.color, fontSize: 32 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">
                        {zone.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{zone.description || '-'}</TableCell>
                    <TableCell>
                      {zone.isActive ? (
                        <MuiChip label="Aktivní" color="primary" size="small" />
                      ) : (
                        <MuiChip label="Neaktivní" variant="outlined" size="small" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenDialog(zone)}
                        size="small"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(zone)}
                        size="small"
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

      {/* Dialog pro přidání/úpravu zóny */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingZone ? 'Upravit zónu' : 'Přidat novou zónu'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Název zóny"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              helperText="Např. Posilovna, Šatna, Sklad"
            />
            <TextField
              margin="dense"
              label="Popis"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              helperText="Volitelný popis zóny"
            />

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Barva pro vizuální rozlišení
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {PRESET_COLORS.map((color) => (
                <IconButton
                  key={color}
                  onClick={() => setFormData({ ...formData, color })}
                  sx={{
                    border: formData.color === color ? '2px solid #000' : 'none',
                    p: 0.5,
                  }}
                >
                  <Circle sx={{ color, fontSize: 40 }} />
                </IconButton>
              ))}
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
              }
              label="Zóna je aktivní"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Zrušit</Button>
          <Button onClick={handleSave} variant="contained">
            {editingZone ? 'Uložit' : 'Přidat'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default Zones;

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
  Chip,
  Switch,
  FormControlLabel,
  InputAdornment,
} from '@mui/material';
import { Add, Edit, Delete, Search as SearchIcon, PersonOff } from '@mui/icons-material';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import type { ExternalPerson, UpsertExternalPerson } from '../types/access';
import {
  getAllExternalPersons,
  createExternalPerson,
  updateExternalPerson,
  deleteExternalPerson,
  getChipsByHolder,
} from '../utils/accessService';

const ExternalPersons: React.FC = () => {
  const [persons, setPersons] = useState<ExternalPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchText, setSearchText] = useState('');

  const [openDialog, setOpenDialog] = useState(false);
  const [editingPerson, setEditingPerson] = useState<ExternalPerson | null>(null);
  const [formData, setFormData] = useState<UpsertExternalPerson>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    organization: '',
    note: '',
    isActive: true,
  });

  const { currentUser } = useAuth();

  useEffect(() => {
    loadPersons();
  }, []);

  const loadPersons = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAllExternalPersons();
      setPersons(data);
    } catch (err: any) {
      setError(`Nepodařilo se načíst externí osoby: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (person?: ExternalPerson) => {
    if (person) {
      setEditingPerson(person);
      setFormData({
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email || '',
        phone: person.phone || '',
        organization: person.organization || '',
        note: person.note || '',
        isActive: person.isActive,
      });
    } else {
      setEditingPerson(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        organization: '',
        note: '',
        isActive: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPerson(null);
  };

  const handleSave = async () => {
    if (!currentUser) return;

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('Jméno a příjmení jsou povinné');
      return;
    }

    try {
      setError('');
      setSuccess('');

      if (editingPerson) {
        await updateExternalPerson(editingPerson.id, formData, currentUser.uid);
        setSuccess('Externí osoba byla úspěšně aktualizována');
      } else {
        await createExternalPerson(formData, currentUser.uid);
        setSuccess('Externí osoba byla úspěšně vytvořena');
      }

      handleCloseDialog();
      loadPersons();
    } catch (err: any) {
      setError(`Chyba: ${err.message}`);
      console.error(err);
    }
  };

  const handleDelete = async (person: ExternalPerson) => {
    if (!window.confirm(`Opravdu chcete smazat osobu "${person.firstName} ${person.lastName}"?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      // Kontrola, zda osoba nemá přiřazené čipy
      const chips = await getChipsByHolder('external', person.id);
      if (chips.length > 0) {
        setError('Nelze smazat osobu, která má přiřazené čipy. Nejprve smažte všechny čipy.');
        return;
      }

      await deleteExternalPerson(person.id);
      setSuccess('Externí osoba byla úspěšně smazána');
      loadPersons();
    } catch (err: any) {
      setError(`Chyba při mazání: ${err.message}`);
      console.error(err);
    }
  };

  const filteredPersons = persons.filter(person => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      person.firstName.toLowerCase().includes(search) ||
      person.lastName.toLowerCase().includes(search) ||
      (person.email || '').toLowerCase().includes(search) ||
      (person.phone || '').includes(search) ||
      (person.organization || '').toLowerCase().includes(search)
    );
  });

  return (
    <Layout>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4">Externí osoby</Typography>
            <Typography variant="body2" color="text.secondary">
              Správa nečlenů s přístupem do objektu
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <TextField
              placeholder="Hledat osobu..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 300 }}
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Přidat osobu
            </Button>
          </Box>
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
                <TableCell>Jméno</TableCell>
                <TableCell>Příjmení</TableCell>
                <TableCell>Organizace</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Telefon</TableCell>
                <TableCell>Stav</TableCell>
                <TableCell align="right">Akce</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Načítání...
                  </TableCell>
                </TableRow>
              ) : filteredPersons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    {searchText ? 'Žádné osoby nevyhovují filtru' : 'Žádné externí osoby'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPersons.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>{person.firstName}</TableCell>
                    <TableCell>{person.lastName}</TableCell>
                    <TableCell>{person.organization || '-'}</TableCell>
                    <TableCell>{person.email || '-'}</TableCell>
                    <TableCell>{person.phone || '-'}</TableCell>
                    <TableCell>
                      {person.isActive ? (
                        <Chip label="Aktivní" color="primary" size="small" />
                      ) : (
                        <Chip
                          icon={<PersonOff />}
                          label="Neaktivní"
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenDialog(person)}
                        size="small"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(person)}
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

      {/* Dialog pro přidání/úpravu externí osoby */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPerson ? 'Upravit externí osobu' : 'Přidat novou externí osobu'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Jméno"
              fullWidth
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Příjmení"
              fullWidth
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Organizace"
              fullWidth
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              helperText="Např. název firmy nebo instituce"
            />
            <TextField
              margin="dense"
              label="Email"
              type="email"
              fullWidth
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Telefon"
              type="tel"
              fullWidth
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Poznámka"
              multiline
              rows={3}
              fullWidth
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              helperText="Interní poznámky (důvod přístupu, platnost, atd.)"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
              }
              label="Osoba je aktivní"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Zrušit</Button>
          <Button onClick={handleSave} variant="contained">
            {editingPerson ? 'Uložit' : 'Přidat'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default ExternalPersons;

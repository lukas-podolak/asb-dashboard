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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
  OutlinedInput,
  SelectChangeEvent,
  Autocomplete,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Nfc,
  Circle,
  Search as SearchIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import type { ChipWithZones, UpsertChip, Zone, ExternalPerson } from '../types/access';
import type { MemberWithMetadata } from '../types/member';
import {
  getChipsWithZones,
  getAllZones,
  createChip,
  updateChip,
  deleteChip,
  getAllExternalPersons,
} from '../utils/accessService';
import { getMembersWithMetadata } from '../utils/memberService';

const Chips: React.FC = () => {
  const [chips, setChips] = useState<ChipWithZones[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [members, setMembers] = useState<MemberWithMetadata[]>([]);
  const [externalPersons, setExternalPersons] = useState<ExternalPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchText, setSearchText] = useState('');

  const [openDialog, setOpenDialog] = useState(false);
  const [editingChip, setEditingChip] = useState<ChipWithZones | null>(null);
  const [nfcReading, setNfcReading] = useState(false);
  
  const [formData, setFormData] = useState<UpsertChip>({
    chipId: '',
    chipType: 'NFC',
    holderType: 'member',
    holderId: 0,
    zones: [],
    isActive: true,
    note: '',
    expiresAt: undefined,
  });

  const { currentUser } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [chipsData, zonesData, membersData, externalData] = await Promise.all([
        getChipsWithZones(),
        getAllZones(),
        getMembersWithMetadata(),
        getAllExternalPersons(),
      ]);
      setChips(chipsData);
      setZones(zonesData);
      setMembers(membersData);
      setExternalPersons(externalData);
    } catch (err: any) {
      setError(`Nepodařilo se načíst data: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (chip?: ChipWithZones) => {
    if (chip) {
      setEditingChip(chip);
      setFormData({
        chipId: chip.chipId,
        chipType: chip.chipType,
        holderType: chip.holderType,
        holderId: chip.holderId,
        zones: chip.zones,
        isActive: chip.isActive,
        note: chip.note || '',
        expiresAt: chip.expiresAt,
      });
    } else {
      setEditingChip(null);
      setFormData({
        chipId: '',
        chipType: 'NFC',
        holderType: 'member',
        holderId: 0,
        zones: [],
        isActive: true,
        note: '',
        expiresAt: undefined,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingChip(null);
  };

  const readNFCChip = async () => {
    if (!('NDEFReader' in window)) {
      setError('NFC není podporováno ve vašem prohlížeči. Použijte Chrome na Androidu nebo zadejte ID ručně.');
      return;
    }

    try {
      setNfcReading(true);
      setError('');
      
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      
      setSuccess('Přiložte NFC čip k čtečce...');
      
      ndef.addEventListener('reading', ({ serialNumber }: any) => {
        setFormData({ ...formData, chipId: serialNumber });
        setSuccess(`Čip načten: ${serialNumber}`);
        setNfcReading(false);
      });
      
      ndef.addEventListener('readingerror', () => {
        setError('Chyba při čtení NFC čipu');
        setNfcReading(false);
      });
      
    } catch (err: any) {
      setError(`Chyba NFC: ${err.message}`);
      setNfcReading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;

    if (!formData.chipId.trim()) {
      setError('ID čipu je povinné');
      return;
    }

    if (!formData.holderId) {
      setError('Vyberte držitele čipu');
      return;
    }

    try {
      setError('');
      setSuccess('');

      // Najít jméno držitele
      let holderName = '';
      if (formData.holderType === 'member') {
        const member = members.find(m => m.Id === formData.holderId);
        holderName = member ? `${member.Jmeno} ${member.Prijmeni}` : 'Neznámý člen';
      } else {
        const person = externalPersons.find(p => p.id === formData.holderId);
        holderName = person ? `${person.firstName} ${person.lastName}` : 'Neznámá osoba';
      }

      if (editingChip) {
        await updateChip(editingChip.id, formData, holderName, currentUser.uid);
        setSuccess('Čip byl úspěšně aktualizován');
      } else {
        await createChip(formData, holderName, currentUser.uid);
        setSuccess('Čip byl úspěšně vytvořen');
      }

      handleCloseDialog();
      loadData();
    } catch (err: any) {
      setError(`Chyba: ${err.message}`);
      console.error(err);
    }
  };

  const handleDelete = async (chip: ChipWithZones) => {
    if (!window.confirm(`Opravdu chcete smazat čip ${chip.chipId}?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await deleteChip(chip.id);
      setSuccess('Čip byl úspěšně smazán');
      loadData();
    } catch (err: any) {
      setError(`Chyba při mazání: ${err.message}`);
      console.error(err);
    }
  };

  const handleZonesChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setFormData({
      ...formData,
      zones: typeof value === 'string' ? value.split(',') : value,
    });
  };

  const filteredChips = chips.filter(chip => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      chip.chipId.toLowerCase().includes(search) ||
      chip.holderName.toLowerCase().includes(search) ||
      chip.zoneDetails.some(z => z.name.toLowerCase().includes(search))
    );
  });

  const getHolderOptions = (): Array<{ id: number | string; label: string }> => {
    if (formData.holderType === 'member') {
      return members
        .filter(m => !m.AtletCinnostUkoncena)
        .map(m => ({
          id: m.Id as number | string,
          label: `${m.Jmeno} ${m.Prijmeni}`,
        }));
    } else {
      return externalPersons
        .filter(p => p.isActive)
        .map(p => ({
          id: p.id as number | string,
          label: `${p.firstName} ${p.lastName}`,
        }));
    }
  };

  return (
    <Layout>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Správa čipů</Typography>
          <Box display="flex" gap={2}>
            <TextField
              placeholder="Hledat čip..."
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
              Přidat čip
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
                <TableCell>ID čipu</TableCell>
                <TableCell>Typ</TableCell>
                <TableCell>Držitel</TableCell>
                <TableCell>Přístupové zóny</TableCell>
                <TableCell>Stav</TableCell>
                <TableCell>Expirace</TableCell>
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
              ) : filteredChips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    {searchText ? 'Žádné čipy nevyhovují filtru' : 'Žádné čipy'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredChips.map((chip) => (
                  <TableRow key={chip.id}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {chip.chipId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <MuiChip
                        icon={<Nfc />}
                        label={chip.chipType}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1">{chip.holderName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {chip.holderType === 'member' ? 'Člen' : 'Externí'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {chip.zoneDetails.map((zone) => (
                          <MuiChip
                            key={zone.id}
                            label={zone.name}
                            size="small"
                            icon={<Circle sx={{ color: zone.color + ' !important' }} />}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {chip.isActive ? (
                        <MuiChip label="Aktivní" color="primary" size="small" />
                      ) : (
                        <MuiChip label="Neaktivní" variant="outlined" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {chip.expiresAt ? (
                        <Typography variant="body2">
                          {new Date(chip.expiresAt).toLocaleDateString('cs-CZ')}
                        </Typography>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenDialog(chip)}
                        size="small"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(chip)}
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

      {/* Dialog pro přidání/úpravu čipu */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingChip ? 'Upravit čip' : 'Přidat nový čip'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* ID čipu s NFC čtečkou */}
            <Box display="flex" gap={1} mb={2}>
              <TextField
                label="ID čipu"
                fullWidth
                required
                value={formData.chipId}
                onChange={(e) => setFormData({ ...formData, chipId: e.target.value })}
                disabled={nfcReading || !!editingChip}
                helperText={editingChip ? 'ID čipu nelze měnit' : 'Načtěte čtečkou nebo zadejte ručně'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Nfc />
                    </InputAdornment>
                  ),
                }}
              />
              {!editingChip && (
                <Button
                  variant="outlined"
                  onClick={readNFCChip}
                  disabled={nfcReading}
                  sx={{ minWidth: 140 }}
                >
                  {nfcReading ? <CircularProgress size={24} /> : 'Načíst NFC'}
                </Button>
              )}
            </Box>

            {/* Typ čipu */}
            <FormControl fullWidth margin="dense">
              <InputLabel>Typ čipu</InputLabel>
              <Select
                value={formData.chipType}
                onChange={(e) =>
                  setFormData({ ...formData, chipType: e.target.value as 'NFC' | 'RFID' })
                }
                label="Typ čipu"
              >
                <MenuItem value="NFC">NFC</MenuItem>
                <MenuItem value="RFID">RFID</MenuItem>
              </Select>
            </FormControl>

            {/* Typ držitele */}
            <FormControl fullWidth margin="dense">
              <InputLabel>Typ držitele</InputLabel>
              <Select
                value={formData.holderType}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    holderType: e.target.value as 'member' | 'external',
                    holderId: 0,
                  });
                }}
                label="Typ držitele"
              >
                <MenuItem value="member">Člen oddílu</MenuItem>
                <MenuItem value="external">Externí osoba</MenuItem>
              </Select>
            </FormControl>

            {/* Držitel */}
            <Autocomplete
              options={getHolderOptions()}
              getOptionLabel={(option) => option.label}
              value={getHolderOptions().find(o => o.id === formData.holderId) || null}
              onChange={(_, newValue) => {
                setFormData({
                  ...formData,
                  holderId: newValue ? newValue.id : 0,
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  margin="dense"
                  label={formData.holderType === 'member' ? 'Člen' : 'Externí osoba'}
                  required
                  helperText="Vyberte osobu, které bude čip přiřazen"
                />
              )}
              sx={{ mt: 1 }}
            />

            {/* Přístupové zóny */}
            <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
              <InputLabel>Přístupové zóny</InputLabel>
              <Select
                multiple
                value={formData.zones}
                onChange={handleZonesChange}
                input={<OutlinedInput label="Přístupové zóny" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((zoneId) => {
                      const zone = zones.find(z => z.id === zoneId);
                      return zone ? (
                        <MuiChip
                          key={zoneId}
                          label={zone.name}
                          size="small"
                          icon={<Circle sx={{ color: zone.color + ' !important' }} />}
                        />
                      ) : null;
                    })}
                  </Box>
                )}
              >
                {zones.filter(z => z.isActive).map((zone) => (
                  <MenuItem key={zone.id} value={zone.id}>
                    <Checkbox checked={formData.zones.indexOf(zone.id) > -1} />
                    <Circle sx={{ color: zone.color, mr: 1, fontSize: 16 }} />
                    <ListItemText primary={zone.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Poznámka */}
            <TextField
              margin="dense"
              label="Poznámka"
              fullWidth
              multiline
              rows={2}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            />

            {/* Datum expirace */}
            <TextField
              margin="dense"
              label="Datum expirace"
              type="date"
              fullWidth
              value={formData.expiresAt ? new Date(formData.expiresAt).toISOString().split('T')[0] : ''}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  expiresAt: e.target.value ? new Date(e.target.value) : undefined,
                });
              }}
              InputLabelProps={{ shrink: true }}
              helperText="Nepovinné - datum, kdy čip přestane být platný"
            />

            {/* Aktivní stav */}
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
              }
              label="Čip je aktivní"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Zrušit</Button>
          <Button onClick={handleSave} variant="contained">
            {editingChip ? 'Uložit' : 'Přidat'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default Chips;

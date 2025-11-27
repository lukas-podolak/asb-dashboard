import React, { useState, useEffect } from 'react';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Chip,
  TablePagination,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import { Edit, Search as SearchIcon, Nfc } from '@mui/icons-material';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import type { MemberWithMetadata, UpdateMemberMetadata } from '../types/member';
import type { ChipWithZones } from '../types/access';
import { getMembersWithMetadata, saveMemberMetadata } from '../utils/memberService';
import { getChipsByHolder, getAllZones } from '../utils/accessService';

const Members: React.FC = () => {
  const [members, setMembers] = useState<MemberWithMetadata[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberWithMetadata[]>([]);
  const [memberChips, setMemberChips] = useState<Map<number, ChipWithZones[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog state
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithMetadata | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<UpdateMemberMetadata>({
    email: '',
    phone: '',
    notes: '',
  });

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Search filter
  const [searchText, setSearchText] = useState('');

  const { currentUser } = useAuth();

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError('');
      const [membersData, zones] = await Promise.all([
        getMembersWithMetadata(),
        getAllZones(),
      ]);
      
      setMembers(membersData);
      setFilteredMembers(membersData);
      
      // Načíst čipy pro všechny členy
      const chipsMap = new Map<number, ChipWithZones[]>();
      const zonesMap = new Map(zones.map(z => [z.id, z]));
      
      await Promise.all(
        membersData.map(async (member) => {
          const chips = await getChipsByHolder('member', member.Id);
          const chipsWithZones: ChipWithZones[] = chips.map(chip => ({
            ...chip,
            zoneDetails: chip.zones
              .map(zoneId => zonesMap.get(zoneId))
              .filter((z): z is any => z !== undefined),
          }));
          chipsMap.set(member.Id, chipsWithZones);
        })
      );
      
      setMemberChips(chipsMap);
    } catch (err: any) {
      setError(`Nepodařilo se načíst členy: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    if (!searchText.trim()) {
      setFilteredMembers(members);
      return;
    }

    const searchLower = searchText.toLowerCase();
    const filtered = members.filter((member) => {
      const fullName = `${member.Jmeno} ${member.Prijmeni}`.toLowerCase();
      const email = (member.metadata?.email || member.Email || '').toLowerCase();
      const phone = (member.metadata?.phone || member.Telefon || '').toLowerCase();
      const notes = (member.metadata?.notes || '').toLowerCase();
      const rodneCislo = (member.RodneCislo || '').toString();

      return (
        fullName.includes(searchLower) ||
        email.includes(searchLower) ||
        phone.includes(searchLower) ||
        notes.includes(searchLower) ||
        rodneCislo.includes(searchLower)
      );
    });

    setFilteredMembers(filtered);
    setPage(0);
  };

  useEffect(() => {
    filterMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, members]);

  const handleOpenEditDialog = (member: MemberWithMetadata) => {
    setSelectedMember(member);
    setFormData({
      email: member.metadata?.email || member.Email || '',
      phone: member.metadata?.phone || member.Telefon || '',
      notes: member.metadata?.notes || '',
    });
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setSelectedMember(null);
    setFormData({ email: '', phone: '', notes: '' });
  };

  const handleSaveMetadata = async () => {
    if (!selectedMember || !currentUser) return;

    try {
      setError('');
      setSuccess('');

      await saveMemberMetadata(selectedMember.Id, formData, currentUser.uid);

      setSuccess('Údaje byly úspěšně uloženy');
      handleCloseEditDialog();
      loadMembers();
    } catch (err: any) {
      setError(`Nepodařilo se uložit údaje: ${err.message}`);
      console.error(err);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('cs-CZ');
    } catch {
      return dateString;
    }
  };

  const getBirthYear = (dateString: string): number | null => {
    if (!dateString) return null;
    try {
      return new Date(dateString).getFullYear();
    } catch {
      return null;
    }
  };

  const getAgeCategory = (dateString: string): string => {
    const birthYear = getBirthYear(dateString);
    if (!birthYear) return '-';

    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;

    if (age < 11) return 'Přípravka';
    if (age >= 11 && age <= 13) return 'ML Žactvo';
    if (age === 14 || age === 15) return 'ST Žactvo';
    if (age === 16 || age === 17) return 'Dorost U18';
    if (age === 18 || age === 19) return 'Junioři U20';
    if (age >= 20 && age <= 22) return 'U23';
    if (age > 22) return 'Dospělý';
    return 'Senior';
  };

  return (
    <Layout>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Členové oddílu</Typography>
          <TextField
            placeholder="Hledat člena..."
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
                <TableCell>Ročník</TableCell>
                <TableCell>Kategorie</TableCell>
                <TableCell>Čipy</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Telefon</TableCell>
                <TableCell>Stav</TableCell>
                <TableCell align="right">Akce</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Načítání...
                  </TableCell>
                </TableRow>
              ) : filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    {searchText ? 'Žádní členové nevyhovují filtru' : 'Žádní členové'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((member) => {
                    const chips = memberChips.get(member.Id) || [];
                    return (
                    <TableRow key={member.Id}>
                      <TableCell>{member.Jmeno}</TableCell>
                      <TableCell>{member.Prijmeni}</TableCell>
                      <TableCell>{getBirthYear(member.DatumNarozeni) || '-'}</TableCell>
                      <TableCell>{getAgeCategory(member.DatumNarozeni)}</TableCell>
                      <TableCell>
                        {chips.length > 0 ? (
                          <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
                            {chips.map((chip) => (
                              <Tooltip
                                key={chip.id}
                                title={
                                  <Box>
                                    <Typography variant="caption" display="block">
                                      ID: {chip.chipId}
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                      Zóny: {chip.zoneDetails.map(z => z.name).join(', ')}
                                    </Typography>
                                  </Box>
                                }
                              >
                                <Chip
                                  icon={<Nfc />}
                                  label={chip.chipType}
                                  size="small"
                                  color={chip.isActive ? 'primary' : 'default'}
                                  variant="outlined"
                                />
                              </Tooltip>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {member.metadata?.email || member.Email || '-'}
                      </TableCell>
                      <TableCell>
                        {member.metadata?.phone || member.Telefon || '-'}
                      </TableCell>
                      <TableCell>
                        {!member.AtletCinnostUkoncena ? (
                          <Chip label="Aktivní" color="primary" size="small" />
                        ) : (
                          <Chip label="Neaktivní" variant="outlined" size="small" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenEditDialog(member)}
                          size="small"
                        >
                          <Edit />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredMembers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Řádků na stránku:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} z ${count}`}
        />
      </Paper>

      {/* Edit Member Metadata Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Upravit údaje - {selectedMember?.Jmeno} {selectedMember?.Prijmeni}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Datum narození: {selectedMember && formatDate(selectedMember.DatumNarozeni)}
            </Typography>
            {selectedMember?.RodneCislo && (
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                Rodné číslo: {selectedMember.RodneCislo}
              </Typography>
            )}

            <TextField
              margin="dense"
              label="Email"
              type="email"
              fullWidth
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              helperText="Email pro komunikaci s členem"
            />
            <TextField
              margin="dense"
              label="Telefon"
              type="tel"
              fullWidth
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              helperText="Telefonní číslo pro komunikaci"
            />
            <TextField
              margin="dense"
              label="Poznámky"
              multiline
              rows={4}
              fullWidth
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              helperText="Interní poznámky o členovi"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Zrušit</Button>
          <Button onClick={handleSaveMetadata} variant="contained">
            Uložit
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default Members;

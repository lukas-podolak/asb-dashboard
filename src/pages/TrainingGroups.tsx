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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Autocomplete,
  FormControlLabel,
  Switch,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Groups as GroupsIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import type { TrainingGroup, UpsertTrainingGroup, GroupMember, GroupTrainer, TrainingSpecialization } from '../types/trainingGroup';
import { TrainingSpecialization as TS, MemberType } from '../types/trainingGroup';
import {
  getAllTrainingGroups,
  createTrainingGroup,
  updateTrainingGroup,
  deleteTrainingGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  addTrainerToGroup,
  removeTrainerFromGroup,
  setPrimaryTrainer,
} from '../utils/trainingGroupService';
import { fetchMembersFromAPI } from '../utils/memberService';
import { getAllExternalPersons } from '../utils/accessService';
import { getAllUsers } from '../utils/userService';
import type { Member } from '../types/member';
import type { ExternalPerson } from '../types/access';
import type { UserProfile } from '../types/user';

const TrainingGroups: React.FC = () => {
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState<TrainingGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [externalPersons, setExternalPersons] = useState<ExternalPerson[]>([]);
  const [trainers, setTrainers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openMembersDialog, setOpenMembersDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<TrainingGroup | null>(null);
  const [memberDialogTab, setMemberDialogTab] = useState(0);

  // Form states
  const [formData, setFormData] = useState<UpsertTrainingGroup>({
    name: '',
    alias: '',
    specialization: TS.OBECNE,
    description: '',
    active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, membersData, externalsData, trainersData] = await Promise.all([
        getAllTrainingGroups(),
        fetchMembersFromAPI(),
        getAllExternalPersons(),
        getAllUsers(),
      ]);
      setGroups(groupsData);
      setMembers(membersData);
      setExternalPersons(externalsData);
      // Filtrovat pouze uživatele s trenérskou rolí (nebo admin/funkcionář)
      setTrainers(trainersData);
    } catch (err: any) {
      setError(`Nepodařilo se načíst data: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    try {
      setError('');
      if (!currentUser) return;

      await createTrainingGroup(formData, currentUser.uid);
      setSuccess('Skupina byla úspěšně vytvořena');
      setOpenCreateDialog(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateGroup = async () => {
    try {
      setError('');
      if (!currentUser || !selectedGroup) return;

      await updateTrainingGroup(selectedGroup.id, formData, currentUser.uid);
      setSuccess('Skupina byla úspěšně aktualizována');
      setOpenEditDialog(false);
      setSelectedGroup(null);
      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      setError('');
      if (!selectedGroup) return;

      await deleteTrainingGroup(selectedGroup.id);
      setSuccess('Skupina byla úspěšně smazána');
      setOpenDeleteDialog(false);
      setSelectedGroup(null);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddMember = async (memberId: number | string, memberType: MemberType) => {
    try {
      setError('');
      if (!currentUser || !selectedGroup) return;

      let memberName = '';
      if (memberType === MemberType.INTERNAL) {
        const member = members.find(m => m.Id === memberId);
        memberName = member ? member.CeleJmeno : 'Neznámý člen';
      } else {
        const external = externalPersons.find(e => e.id === memberId);
        memberName = external ? `${external.firstName} ${external.lastName}` : 'Neznámá osoba';
      }

      const newMember: GroupMember = {
        id: memberId,
        type: memberType,
        name: memberName,
        addedAt: new Date(),
        addedBy: currentUser.uid,
      };

      await addMemberToGroup(selectedGroup.id, newMember, currentUser.uid);
      setSuccess('Člen byl přidán do skupiny');
      await loadData();
      // Aktualizovat vybranou skupinu
      const updatedGroup = await getAllTrainingGroups();
      setSelectedGroup(updatedGroup.find(g => g.id === selectedGroup.id) || null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (memberId: number | string, memberType: string) => {
    try {
      setError('');
      if (!currentUser || !selectedGroup) return;

      await removeMemberFromGroup(selectedGroup.id, memberId, memberType, currentUser.uid);
      setSuccess('Člen byl odebrán ze skupiny');
      await loadData();
      const updatedGroup = await getAllTrainingGroups();
      setSelectedGroup(updatedGroup.find(g => g.id === selectedGroup.id) || null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddTrainer = async (trainerUid: string) => {
    try {
      setError('');
      if (!currentUser || !selectedGroup) return;

      const trainer = trainers.find(t => t.uid === trainerUid);
      if (!trainer) {
        setError('Trenér nenalezen');
        return;
      }

      const newTrainer: GroupTrainer = {
        uid: trainer.uid,
        name: trainer.displayName || trainer.email,
        addedAt: new Date(),
        isPrimary: selectedGroup.trainers.length === 0, // První trenér je automaticky hlavní
      };

      await addTrainerToGroup(selectedGroup.id, newTrainer, currentUser.uid);
      setSuccess('Trenér byl přidán do skupiny');
      await loadData();
      const updatedGroup = await getAllTrainingGroups();
      setSelectedGroup(updatedGroup.find(g => g.id === selectedGroup.id) || null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveTrainer = async (trainerUid: string) => {
    try {
      setError('');
      if (!currentUser || !selectedGroup) return;

      await removeTrainerFromGroup(selectedGroup.id, trainerUid, currentUser.uid);
      setSuccess('Trenér byl odebrán ze skupiny');
      await loadData();
      const updatedGroup = await getAllTrainingGroups();
      setSelectedGroup(updatedGroup.find(g => g.id === selectedGroup.id) || null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSetPrimaryTrainer = async (trainerUid: string) => {
    try {
      setError('');
      if (!currentUser || !selectedGroup) return;

      await setPrimaryTrainer(selectedGroup.id, trainerUid, currentUser.uid);
      setSuccess('Hlavní trenér byl nastaven');
      await loadData();
      const updatedGroup = await getAllTrainingGroups();
      setSelectedGroup(updatedGroup.find(g => g.id === selectedGroup.id) || null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditDialogForGroup = (group: TrainingGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      alias: group.alias || '',
      specialization: group.specialization,
      description: group.description || '',
      active: group.active,
    });
    setOpenEditDialog(true);
  };

  const openDeleteDialogForGroup = (group: TrainingGroup) => {
    setSelectedGroup(group);
    setOpenDeleteDialog(true);
  };

  const openMembersDialogForGroup = (group: TrainingGroup) => {
    setSelectedGroup(group);
    setOpenMembersDialog(true);
    setMemberDialogTab(0);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      alias: '',
      specialization: TS.OBECNE,
      description: '',
      active: true,
    });
  };

  const getSpecializationLabel = (spec: TrainingSpecialization): string => {
    return spec;
  };

  const getSpecializationColor = (spec: TrainingSpecialization): 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' => {
    switch (spec) {
      case TS.SPRINTY: return 'error';
      case TS.BEHY: return 'primary';
      case TS.SKOKY: return 'success';
      case TS.VRHY: return 'warning';
      case TS.VICESOJ: return 'secondary';
      case TS.VYKONNOSTNI: return 'info';
      default: return 'primary';
    }
  };

  // Filtrovat členy, kteří ještě nejsou ve skupině
  const getAvailableInternalMembers = () => {
    if (!selectedGroup) return members;
    const memberIds = selectedGroup.members
      .filter(m => m.type === MemberType.INTERNAL)
      .map(m => m.id);
    return members.filter(m => !memberIds.includes(m.Id));
  };

  const getAvailableExternalMembers = () => {
    if (!selectedGroup) return externalPersons;
    const memberIds = selectedGroup.members
      .filter(m => m.type === MemberType.EXTERNAL)
      .map(m => String(m.id));
    return externalPersons.filter(e => !memberIds.includes(e.id));
  };

  const getAvailableTrainers = () => {
    if (!selectedGroup) return trainers;
    const trainerUids = selectedGroup.trainers.map(t => t.uid);
    return trainers.filter(t => !trainerUids.includes(t.uid));
  };

  return (
    <Layout>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Tréninkové skupiny
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Správa tréninkových skupin, přiřazení členů a trenérů
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              resetForm();
              setOpenCreateDialog(true);
            }}
          >
            Nová skupina
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
                <TableCell>Název</TableCell>
                <TableCell>Alias</TableCell>
                <TableCell>Specializace</TableCell>
                <TableCell>Členové</TableCell>
                <TableCell>Trenéři</TableCell>
                <TableCell>Status</TableCell>
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
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Žádné skupiny
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <strong>{group.name}</strong>
                      {group.description && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {group.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{group.alias || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getSpecializationLabel(group.specialization)}
                        color={getSpecializationColor(group.specialization)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<GroupsIcon />}
                        label={group.members.length}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {group.trainers.map((trainer) => (
                        <Chip
                          key={trainer.uid}
                          label={trainer.name}
                          size="small"
                          icon={trainer.isPrimary ? <StarIcon /> : undefined}
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={group.active ? 'Aktivní' : 'Neaktivní'}
                        color={group.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Spravovat členy a trenéry">
                        <IconButton
                          color="primary"
                          onClick={() => openMembersDialogForGroup(group)}
                        >
                          <PersonAddIcon />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        color="primary"
                        onClick={() => openEditDialogForGroup(group)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => openDeleteDialogForGroup(group)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Group Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nová tréninková skupina</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Název skupiny *"
            type="text"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Alias (zkratka)"
            type="text"
            fullWidth
            value={formData.alias}
            onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Specializace *</InputLabel>
            <Select
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value as TrainingSpecialization })}
              label="Specializace *"
            >
              {Object.values(TS).map((spec) => (
                <MenuItem key={spec} value={spec}>
                  {getSpecializationLabel(spec)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Popis"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
            }
            label="Aktivní skupina"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Zrušit</Button>
          <Button
            onClick={handleCreateGroup}
            variant="contained"
            disabled={!formData.name.trim()}
          >
            Vytvořit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upravit skupinu</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Název skupiny *"
            type="text"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Alias (zkratka)"
            type="text"
            fullWidth
            value={formData.alias}
            onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Specializace *</InputLabel>
            <Select
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value as TrainingSpecialization })}
              label="Specializace *"
            >
              {Object.values(TS).map((spec) => (
                <MenuItem key={spec} value={spec}>
                  {getSpecializationLabel(spec)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Popis"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
            }
            label="Aktivní skupina"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Zrušit</Button>
          <Button
            onClick={handleUpdateGroup}
            variant="contained"
            disabled={!formData.name.trim()}
          >
            Uložit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Smazat skupinu</DialogTitle>
        <DialogContent>
          <Typography>
            Opravdu chcete smazat skupinu <strong>{selectedGroup?.name}</strong>?
          </Typography>
          {selectedGroup && selectedGroup.members.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Tato skupina obsahuje {selectedGroup.members.length} členů
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Zrušit</Button>
          <Button onClick={handleDeleteGroup} color="error" variant="contained">
            Smazat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Members and Trainers Management Dialog */}
      <Dialog
        open={openMembersDialog}
        onClose={() => setOpenMembersDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Správa členů a trenérů - {selectedGroup?.name}
        </DialogTitle>
        <DialogContent>
          <Tabs value={memberDialogTab} onChange={(_, v) => setMemberDialogTab(v)}>
            <Tab label={`Členové (${selectedGroup?.members.length || 0})`} />
            <Tab label={`Trenéři (${selectedGroup?.trainers.length || 0})`} />
          </Tabs>

          <Box sx={{ mt: 2 }}>
            {/* Tab 0: Members */}
            {memberDialogTab === 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Přidat člena
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                  <Autocomplete
                    options={getAvailableInternalMembers()}
                    getOptionLabel={(option) => option.CeleJmeno}
                    renderInput={(params) => <TextField {...params} label="Interní člen" size="small" />}
                    onChange={(_, value) => {
                      if (value) handleAddMember(value.Id, MemberType.INTERNAL);
                    }}
                    sx={{ flex: 1 }}
                  />
                  <Autocomplete
                    options={getAvailableExternalMembers()}
                    getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                    renderInput={(params) => <TextField {...params} label="Externí osoba" size="small" />}
                    onChange={(_, value) => {
                      if (value) handleAddMember(value.id, MemberType.EXTERNAL);
                    }}
                    sx={{ flex: 1 }}
                  />
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  Současní členové
                </Typography>
                <List>
                  {selectedGroup?.members.length === 0 ? (
                    <ListItem>
                      <ListItemText secondary="Žádní členové" />
                    </ListItem>
                  ) : (
                    selectedGroup?.members.map((member) => (
                      <ListItem key={`${member.type}-${member.id}`}>
                        <ListItemText
                          primary={member.name}
                          secondary={
                            <>
                              {member.type === MemberType.INTERNAL ? 'Interní člen' : 'Externí osoba'}
                              {' • '}
                              {member.addedAt.toLocaleDateString()}
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveMember(member.id, member.type)}
                          >
                            <PersonRemoveIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))
                  )}
                </List>
              </Box>
            )}

            {/* Tab 1: Trainers */}
            {memberDialogTab === 1 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Přidat trenéra
                </Typography>
                <Autocomplete
                  options={getAvailableTrainers()}
                  getOptionLabel={(option) => option.displayName || option.email}
                  renderInput={(params) => <TextField {...params} label="Vyberte trenéra" size="small" />}
                  onChange={(_, value) => {
                    if (value) handleAddTrainer(value.uid);
                  }}
                  sx={{ mb: 3 }}
                />

                <Typography variant="subtitle2" gutterBottom>
                  Současní trenéři
                </Typography>
                <List>
                  {selectedGroup?.trainers.length === 0 ? (
                    <ListItem>
                      <ListItemText secondary="Žádní trenéři" />
                    </ListItem>
                  ) : (
                    selectedGroup?.trainers.map((trainer) => (
                      <ListItem key={trainer.uid}>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              {trainer.name}
                              {trainer.isPrimary && (
                                <Chip label="Hlavní trenér" color="primary" size="small" />
                              )}
                            </Box>
                          }
                          secondary={trainer.addedAt.toLocaleDateString()}
                        />
                        <ListItemSecondaryAction>
                          {!trainer.isPrimary && (
                            <Tooltip title="Nastavit jako hlavního trenéra">
                              <IconButton
                                edge="end"
                                onClick={() => handleSetPrimaryTrainer(trainer.uid)}
                              >
                                <StarBorderIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveTrainer(trainer.uid)}
                            disabled={selectedGroup.trainers.length === 1}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))
                  )}
                </List>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMembersDialog(false)}>Zavřít</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default TrainingGroups;

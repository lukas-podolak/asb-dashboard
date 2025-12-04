import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
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
  Fab,
  ToggleButtonGroup,
  ToggleButton,
  useMediaQuery,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  CalendarToday as CalendarIcon,
  List as ListIcon,
  ContentCopy as CopyIcon,
  Notes as NotesIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Groups as AttendanceIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { cs } from 'date-fns/locale';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import type { TrainingPlan, UpsertTrainingPlan, TrainingType } from '../types/trainingPlan';
import { TrainingType as TT, TrainingStatus } from '../types/trainingPlan';
import type { TrainingGroup } from '../types/trainingGroup';
import {
  getUpcomingPlans,
  getHistoricalPlans,
  createTrainingPlan,
  updateTrainingPlan,
  updateExecutionNote,
  updateTrainingStatus,
  deleteTrainingPlan,
  duplicateTrainingPlan,
} from '../utils/trainingPlanService';
import { getGroupsByTrainer } from '../utils/trainingGroupService';
import AttendanceQuickRecord from '../components/AttendanceQuickRecord';
import AttendanceStats from '../components/AttendanceStats';
import { getTrainingAttendanceSummary } from '../utils/attendanceService';
import type { TrainingAttendanceSummary } from '../types/attendance';

const TrainingPlans: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [upcomingPlans, setUpcomingPlans] = useState<TrainingPlan[]>([]);
  const [historicalPlans, setHistoricalPlans] = useState<TrainingPlan[]>([]);
  const [myGroups, setMyGroups] = useState<TrainingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openNoteDialog, setOpenNoteDialog] = useState(false);
  const [openDayDetailDialog, setOpenDayDetailDialog] = useState(false);
  const [openAttendanceDialog, setOpenAttendanceDialog] = useState(false);
  const [openStatsDialog, setOpenStatsDialog] = useState(false);
  const [statsGroupId, setStatsGroupId] = useState<string | null>(null);
  const [attendancePlan, setAttendancePlan] = useState<TrainingPlan | null>(null);
  const [attendanceSummaries, setAttendanceSummaries] = useState<Map<string, TrainingAttendanceSummary>>(new Map());
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [selectedDayPlans, setSelectedDayPlans] = useState<TrainingPlan[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // View states
  const [showHistorical, setShowHistorical] = useState(false);
  const [historicalView, setHistoricalView] = useState<'calendar' | 'list'>('list');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [listStartDate, setListStartDate] = useState<Date | null>(null);
  const [listEndDate, setListEndDate] = useState<Date | null>(null);
  
  // Form states
  const [formData, setFormData] = useState<UpsertTrainingPlan>({
    name: '',
    description: '',
    type: TT.COMMON,
    date: new Date(),
    groupId: '',
  });
  const [noteText, setNoteText] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (!currentUser) return;
      
      const [groups, upcoming, historical] = await Promise.all([
        getGroupsByTrainer(currentUser.uid),
        getUpcomingPlans(currentUser.uid),
        getHistoricalPlans(currentUser.uid),
      ]);
      
      setMyGroups(groups);
      setUpcomingPlans(upcoming);
      setHistoricalPlans(historical);
      
      // Načíst statistiky docházky pro všechny plány
      const allPlans = [...upcoming, ...historical];
      const summaries = new Map<string, TrainingAttendanceSummary>();
      
      await Promise.all(
        allPlans.map(async (plan) => {
          try {
            // Najít skupinu a získat počet členů
            const group = groups.find(g => g.id === plan.groupId);
            const totalMembers = group?.members.length || 0;
            
            const summary = await getTrainingAttendanceSummary(plan.id, plan.name, plan.date, totalMembers);
            if (summary) {
              summaries.set(plan.id, summary);
            }
          } catch (err) {
            // Ignorovat chyby u jednotlivých tréninků
            console.warn(`Nepodařilo se načíst docházku pro trénink ${plan.id}:`, err);
          }
        })
      );
      
      setAttendanceSummaries(summaries);
      
      if (groups.length > 0) {
        setFormData(prev => {
          if (!prev.groupId) {
            return { ...prev, groupId: groups[0].id };
          }
          return prev;
        });
      }
    } catch (err: any) {
      setError(`Nepodařilo se načíst data: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePlan = async () => {
    try {
      setError('');
      if (!currentUser) return;
      
      await createTrainingPlan(formData, currentUser.uid);
      setSuccess('Trénink byl úspěšně vytvořen');
      setOpenCreateDialog(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdatePlan = async () => {
    try {
      setError('');
      if (!currentUser || !selectedPlan) return;
      
      await updateTrainingPlan(selectedPlan.id, formData, currentUser.uid);
      setSuccess('Trénink byl úspěšně aktualizován');
      setOpenEditDialog(false);
      setSelectedPlan(null);
      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeletePlan = async () => {
    try {
      setError('');
      if (!selectedPlan) return;
      
      await deleteTrainingPlan(selectedPlan.id);
      setSuccess('Trénink byl úspěšně smazán');
      setOpenDeleteDialog(false);
      setSelectedPlan(null);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveNote = async () => {
    try {
      setError('');
      if (!currentUser || !selectedPlan) return;
      
      await updateExecutionNote(selectedPlan.id, noteText, currentUser.uid);
      setSuccess('Poznámka byla uložena');
      setOpenNoteDialog(false);
      setSelectedPlan(null);
      setNoteText('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDuplicatePlan = async (plan: TrainingPlan) => {
    try {
      setError('');
      if (!currentUser) return;
      
      const newDate = new Date(plan.date);
      newDate.setDate(newDate.getDate() + 7); // Za týden
      
      await duplicateTrainingPlan(plan.id, newDate, currentUser.uid);
      setSuccess('Trénink byl duplikován');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleChangeStatus = async (planId: string, status: TrainingStatus) => {
    try {
      setError('');
      if (!currentUser) return;
      
      await updateTrainingStatus(planId, status, currentUser.uid);
      setSuccess(`Trénink byl označen jako ${status}`);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditDialogForPlan = (plan: TrainingPlan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      type: plan.type,
      date: plan.date,
      groupId: plan.groupId,
    });
    setOpenEditDialog(true);
  };

  const openNoteDialogForPlan = (plan: TrainingPlan) => {
    setSelectedPlan(plan);
    setNoteText(plan.executionNote || '');
    setOpenNoteDialog(true);
  };

  const openDayDetail = (date: Date, plans: TrainingPlan[]) => {
    setSelectedDate(date);
    setSelectedDayPlans(plans);
    setOpenDayDetailDialog(true);
  };

  const openAttendanceForPlan = (plan: TrainingPlan) => {
    setAttendancePlan(plan);
    setOpenAttendanceDialog(true);
  };

  const openStatsForGroup = (groupId: string) => {
    setStatsGroupId(groupId);
    setOpenStatsDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: TT.COMMON,
      date: new Date(),
      groupId: myGroups.length > 0 ? myGroups[0].id : '',
    });
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const planDate = new Date(date);
    planDate.setHours(0, 0, 0, 0);
    
    const diffTime = planDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Dnes';
    if (diffDays === 1) return 'Zítra';
    if (diffDays === -1) return 'Včera';
    
    return date.toLocaleDateString('cs-CZ', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const groupPlansByDate = (plans: TrainingPlan[]) => {
    const grouped = new Map<string, TrainingPlan[]>();
    
    plans.forEach(plan => {
      const dateKey = plan.date.toISOString().split('T')[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(plan);
    });
    
    return Array.from(grouped.entries()).map(([date, plans]) => ({
      date: new Date(date),
      plans: plans.sort((a, b) => a.date.getTime() - b.date.getTime()),
    }));
  };

  const filteredUpcoming = selectedGroup === 'all' 
    ? upcomingPlans 
    : upcomingPlans.filter(p => p.groupId === selectedGroup);
    
  let filteredHistorical = selectedGroup === 'all'
    ? historicalPlans
    : historicalPlans.filter(p => p.groupId === selectedGroup);

  // Filtrování podle data pro seznamové zobrazení
  if (historicalView === 'list') {
    if (listStartDate) {
      const startOfDay = new Date(listStartDate);
      startOfDay.setHours(0, 0, 0, 0);
      filteredHistorical = filteredHistorical.filter(p => p.date >= startOfDay);
    }
    if (listEndDate) {
      const endOfDay = new Date(listEndDate);
      endOfDay.setHours(23, 59, 59, 999);
      filteredHistorical = filteredHistorical.filter(p => p.date <= endOfDay);
    }
  }

  const groupedUpcoming = groupPlansByDate(filteredUpcoming);
  const groupedHistorical = groupPlansByDate(filteredHistorical);

  // Funkce pro generování kalendářní mřížky
  const generateCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Pondělí = 0
    startDate.setDate(startDate.getDate() - offset);
    
    const days: Date[] = [];
    const current = new Date(startDate);
    
    // Generovat 42 dní (6 týdnů)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const getPlansForDay = (date: Date): TrainingPlan[] => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredHistorical.filter(plan => {
      const planDateStr = plan.date.toISOString().split('T')[0];
      return planDateStr === dateStr;
    });
  };

  const isCurrentMonth = (date: Date, month: number): boolean => {
    return date.getMonth() === month;
  };

  const goToPreviousMonth = () => {
    setCalendarMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCalendarMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setCalendarMonth(new Date());
  };

  const calendarDays = generateCalendarDays(calendarMonth.getFullYear(), calendarMonth.getMonth());

  if (myGroups.length === 0 && !loading) {
    return (
      <Layout>
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nemáte přiřazeny žádné tréninkové skupiny
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            Pro plánování tréninků musíte být přiřazen k nějaké skupině
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/training-groups')}
          >
            Přejít na správu skupin
          </Button>
        </Box>
      </Layout>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={cs}>
      <Layout>
        <Box sx={{ pb: 10 }}> {/* Padding pro FAB */}
          {/* Header */}
          <Paper sx={{ p: 2, mb: 2, position: 'sticky', top: 0, zIndex: 10 }}>
            <Typography variant="h5" gutterBottom>
              Tréninkové plány
            </Typography>
            
            {/* Filter podle skupiny */}
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Skupina</InputLabel>
              <Select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                label="Skupina"
              >
                <MenuItem value="all">Všechny skupiny</MenuItem>
                {myGroups.map(group => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Tlačítko Statistiky docházky - zobrazit pouze pokud je vybrána konkrétní skupina */}
            {selectedGroup !== 'all' && (
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AttendanceIcon />}
                onClick={() => openStatsForGroup(selectedGroup)}
                sx={{ mt: 2 }}
              >
                Statistiky docházky
              </Button>
            )}
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 2, mx: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2, mx: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {/* Nadcházející tréninky */}
          <Box sx={{ px: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon /> Nadcházející tréninky
            </Typography>
            
            {groupedUpcoming.length === 0 ? (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  Žádné nadcházející tréninky
                </Typography>
              </Paper>
            ) : (
              groupedUpcoming.map(({ date, plans }) => (
                <Box key={date.toISOString()} sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {formatDate(date)}
                  </Typography>
                  
                  {plans.map(plan => (
                    <Card key={plan.id} sx={{ mb: 1.5 }}>
                      <CardContent sx={{ pb: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="start">
                          <Box flex={1}>
                            <Typography variant="h6" component="div">
                              {plan.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {plan.groupName}
                            </Typography>
                            <Box sx={{ mb: 1 }}>
                              <Chip 
                                label={plan.type} 
                                size="small" 
                                color={plan.type === TT.COMMON ? 'primary' : 'secondary'}
                                sx={{ mr: 1 }}
                              />
                              {plan.status === TrainingStatus.COMPLETED && (
                                <Chip 
                                  icon={<CheckCircleIcon />}
                                  label="Dokončeno" 
                                  size="small" 
                                  color="success"
                                  sx={{ mr: 1 }}
                                />
                              )}
                              {plan.status === TrainingStatus.CANCELLED && (
                                <Chip 
                                  label="Vynecháno" 
                                  size="small" 
                                  color="error"
                                  sx={{ mr: 1 }}
                                />
                              )}
                              {plan.executionNote && (
                                <Chip 
                                  icon={<NotesIcon />}
                                  label="S poznámkou" 
                                  size="small" 
                                  variant="outlined"
                                />
                              )}
                              {plan.memberNotes && plan.memberNotes.length > 0 && (
                                <Chip 
                                  label={`Poznámky: ${plan.memberNotes.length}`}
                                  size="small" 
                                  color="warning"
                                  sx={{ mr: 1 }}
                                />
                              )}
                            </Box>
                          </Box>
                        </Box>

                        {/* POZNÁMKY SVĚŘENCŮ - VŽDY NAHOŘE! */}
                        {plan.memberNotes && plan.memberNotes.length > 0 && (
                          <Box sx={{ mb: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1, border: '2px solid', borderColor: 'warning.main' }}>
                            <Typography variant="subtitle1" fontWeight="bold" color="warning.dark" gutterBottom>
                              📝 Poznámky svěřenců ({plan.memberNotes.length}):
                            </Typography>
                            <Box display="flex" flexDirection="column" gap={1}>
                              {plan.memberNotes.map((note, index) => (
                                <Paper 
                                  key={index}
                                  elevation={3}
                                  sx={{ 
                                    p: 1.5, 
                                    bgcolor: note.completed ? 'success.main' : 'background.paper',
                                    color: note.completed ? 'success.contrastText' : 'text.primary',
                                    border: '1px solid',
                                    borderColor: note.completed ? 'success.dark' : 'divider'
                                  }}
                                >
                                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={0.5}>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                      👤 {note.memberName}
                                    </Typography>
                                    {note.completed && (
                                      <Chip 
                                        label="✓ Dokončeno" 
                                        size="small" 
                                        color="success"
                                        sx={{ height: 20, fontWeight: 'bold' }}
                                      />
                                    )}
                                  </Box>
                                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                                    "{note.note}"
                                  </Typography>
                                </Paper>
                              ))}
                            </Box>
                          </Box>
                        )}
                        
                        <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                          {plan.description}
                        </Typography>
                      </CardContent>
                      
                      <CardActions sx={{ pt: 0, px: 2, pb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                        {/* Docházka tlačítko */}
                        <Button
                          size="small"
                          startIcon={<AttendanceIcon />}
                          color="primary"
                          onClick={() => openAttendanceForPlan(plan)}
                        >
                          Docházka
                        </Button>
                        
                        {plan.status === TrainingStatus.PLANNED && (
                          <>
                            <Button
                              size="small"
                              startIcon={<CheckCircleIcon />}
                              color="success"
                              onClick={() => handleChangeStatus(plan.id, TrainingStatus.COMPLETED)}
                            >
                              Dokončit
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => handleChangeStatus(plan.id, TrainingStatus.CANCELLED)}
                            >
                              Vynechat
                            </Button>
                          </>
                        )}
                        {plan.status !== TrainingStatus.PLANNED && (
                          <Button
                            size="small"
                            onClick={() => handleChangeStatus(plan.id, TrainingStatus.PLANNED)}
                          >
                            Vrátit do plánu
                          </Button>
                        )}
                        <Button
                          size="small"
                          startIcon={<NotesIcon />}
                          onClick={() => openNoteDialogForPlan(plan)}
                        >
                          Poznámka
                        </Button>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => openEditDialogForPlan(plan)}
                        >
                          Upravit
                        </Button>
                        <Button
                          size="small"
                          startIcon={<CopyIcon />}
                          onClick={() => handleDuplicatePlan(plan)}
                        >
                          Kopírovat
                        </Button>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setOpenDeleteDialog(true);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </CardActions>
                    </Card>
                  ))}
                </Box>
              ))
            )}
          </Box>

          {/* Historie */}
          <Box sx={{ px: 2 }}>
            <Accordion 
              expanded={showHistorical}
              onChange={() => setShowHistorical(!showHistorical)}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  Historie tréninků ({filteredHistorical.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 1 }}>
                {/* Přepínač zobrazení */}
                <Box display="flex" justifyContent="center" sx={{ mb: 2 }}>
                  <ToggleButtonGroup
                    value={historicalView}
                    exclusive
                    onChange={(_, val) => val && setHistoricalView(val)}
                    size="small"
                  >
                    <ToggleButton value="list">
                      <ListIcon sx={{ mr: 0.5 }} /> Seznam
                    </ToggleButton>
                    <ToggleButton value="calendar">
                      <CalendarIcon sx={{ mr: 0.5 }} /> Kalendář
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {/* Filtrování podle data - pouze pro seznamové zobrazení */}
                {historicalView === 'list' && (
                  <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <DatePicker
                      label="Od data"
                      value={listStartDate}
                      onChange={(date: Date | null) => setListStartDate(date)}
                      slotProps={{
                        textField: {
                          size: 'small',
                          sx: { flex: isMobile ? '1 1 100%' : '1 1 auto' },
                        },
                      }}
                    />
                    <DatePicker
                      label="Do data"
                      value={listEndDate}
                      onChange={(date: Date | null) => setListEndDate(date)}
                      slotProps={{
                        textField: {
                          size: 'small',
                          sx: { flex: isMobile ? '1 1 100%' : '1 1 auto' },
                        },
                      }}
                    />
                    {(listStartDate || listEndDate) && (
                      <Button 
                        size="small" 
                        onClick={() => {
                          setListStartDate(null);
                          setListEndDate(null);
                        }}
                      >
                        Zrušit filtr
                      </Button>
                    )}
                  </Box>
                )}

                {groupedHistorical.length === 0 ? (
                  <Typography color="text.secondary" textAlign="center">
                    Žádná historie
                  </Typography>
                ) : historicalView === 'list' ? (
                  groupedHistorical.map(({ date, plans }) => (
                    <Box key={date.toISOString()} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        {formatDate(date)}
                      </Typography>
                      
                      {plans.map(plan => (
                        <Card key={plan.id} sx={{ 
                          mb: 1, 
                          opacity: 0.9,
                          borderLeft: plan.status === TrainingStatus.COMPLETED ? '4px solid' : 
                                     plan.status === TrainingStatus.CANCELLED ? '4px solid' : 'none',
                          borderLeftColor: plan.status === TrainingStatus.COMPLETED ? 'success.main' : 
                                          plan.status === TrainingStatus.CANCELLED ? 'error.main' : 'transparent',
                        }}>
                          <CardContent sx={{ pb: 1 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="start">
                              <Typography variant="subtitle1">
                                {plan.name}
                              </Typography>
                              <Box>
                                {plan.status === TrainingStatus.COMPLETED && (
                                  <Chip label="Dokončeno" size="small" color="success" sx={{ mr: 0.5 }} />
                                )}
                                {plan.status === TrainingStatus.CANCELLED && (
                                  <Chip label="Vynecháno" size="small" color="error" sx={{ mr: 0.5 }} />
                                )}
                                {plan.memberNotes && plan.memberNotes.length > 0 && (
                                  <Chip 
                                    label={`Poznámky: ${plan.memberNotes.length}`}
                                    size="small" 
                                    color="warning"
                                  />
                                )}
                              </Box>
                            </Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                              {plan.groupName} • {plan.type}
                            </Typography>

                            {/* POZNÁMKY SVĚŘENCŮ - PRIORITA! */}
                            {plan.memberNotes && plan.memberNotes.length > 0 && (
                              <Paper elevation={3} sx={{ mb: 1, p: 1.5, bgcolor: 'warning.light', border: '2px solid', borderColor: 'warning.main' }}>
                                <Typography variant="subtitle2" fontWeight="bold" color="warning.dark" gutterBottom>
                                  📝 Poznámky svěřenců ({plan.memberNotes.length}):
                                </Typography>
                                <Box display="flex" flexDirection="column" gap={1}>
                                  {plan.memberNotes.map((note, index) => (
                                    <Paper 
                                      key={index}
                                      elevation={2}
                                      sx={{ 
                                        p: 1, 
                                        bgcolor: note.completed ? 'success.main' : 'background.paper',
                                        color: note.completed ? 'success.contrastText' : 'text.primary',
                                        border: '1px solid',
                                        borderColor: note.completed ? 'success.dark' : 'divider'
                                      }}
                                    >
                                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={0.5}>
                                        <Typography variant="body2" fontWeight="bold">
                                          👤 {note.memberName}
                                        </Typography>
                                        {note.completed && (
                                          <Chip 
                                            label="✓ Dokončeno" 
                                            size="small" 
                                            color="success"
                                            sx={{ height: 18, fontSize: '0.7rem', fontWeight: 'bold' }}
                                          />
                                        )}
                                      </Box>
                                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                                        "{note.note}"
                                      </Typography>
                                    </Paper>
                                  ))}
                                </Box>
                              </Paper>
                            )}
                            
                            {plan.executionNote && (
                              <Paper sx={{ mt: 1, p: 1, bgcolor: 'action.hover' }}>
                                <Typography variant="caption" display="block" fontWeight="bold">
                                  Poznámka trenéra:
                                </Typography>
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                  {plan.executionNote}
                                </Typography>
                              </Paper>
                            )}
                          </CardContent>
                          
                          <CardActions sx={{ pt: 0, px: 2, pb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                            {/* Docházka tlačítko */}
                            <Button
                              size="small"
                              startIcon={<AttendanceIcon />}
                              color="primary"
                              onClick={() => openAttendanceForPlan(plan)}
                            >
                              Docházka
                            </Button>
                            
                            {plan.status === TrainingStatus.PLANNED && (
                              <>
                                <Button
                                  size="small"
                                  startIcon={<CheckCircleIcon />}
                                  color="success"
                                  onClick={() => handleChangeStatus(plan.id, TrainingStatus.COMPLETED)}
                                >
                                  Dokončit
                                </Button>
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => handleChangeStatus(plan.id, TrainingStatus.CANCELLED)}
                                >
                                  Vynechat
                                </Button>
                              </>
                            )}
                            {plan.status !== TrainingStatus.PLANNED && (
                              <Button
                                size="small"
                                onClick={() => handleChangeStatus(plan.id, TrainingStatus.PLANNED)}
                              >
                                Vrátit do plánu
                              </Button>
                            )}
                            <Button
                              size="small"
                              startIcon={<NotesIcon />}
                              onClick={() => openNoteDialogForPlan(plan)}
                            >
                              {plan.executionNote ? 'Upravit poznámku' : 'Přidat poznámku'}
                            </Button>
                            <Button
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => openEditDialogForPlan(plan)}
                            >
                              Upravit
                            </Button>
                            <Button
                              size="small"
                              startIcon={<CopyIcon />}
                              onClick={() => handleDuplicatePlan(plan)}
                            >
                              Kopírovat
                            </Button>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setSelectedPlan(plan);
                                setOpenDeleteDialog(true);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </CardActions>
                        </Card>
                      ))}
                    </Box>
                  ))
                ) : (
                  <Box>
                    {/* Kalendářová navigace */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <IconButton onClick={goToPreviousMonth} size="small">
                        <ChevronLeftIcon />
                      </IconButton>
                      
                      <Box display="flex" gap={1} alignItems="center">
                        <Typography variant="h6">
                          {calendarMonth.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}
                        </Typography>
                        <Button size="small" onClick={goToToday}>
                          Dnes
                        </Button>
                      </Box>
                      
                      <IconButton onClick={goToNextMonth} size="small">
                        <ChevronRightIcon />
                      </IconButton>
                    </Box>

                    {/* Dny v týdnu */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
                      {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map(day => (
                        <Box key={day} sx={{ textAlign: 'center', py: 1 }}>
                          <Typography variant="caption" fontWeight="bold" color="text.secondary">
                            {day}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    {/* Kalendářová mřížka */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                      {calendarDays.map((day, idx) => {
                        const plansForDay = getPlansForDay(day);
                        const isToday = day.toDateString() === new Date().toDateString();
                        const inCurrentMonth = isCurrentMonth(day, calendarMonth.getMonth());
                        const hasCompleted = plansForDay.some(p => p.status === TrainingStatus.COMPLETED);
                        const hasCancelled = plansForDay.some(p => p.status === TrainingStatus.CANCELLED);
                        
                        return (
                          <Paper
                            key={idx}
                            sx={{
                              minHeight: 80,
                              p: 0.5,
                              cursor: plansForDay.length > 0 ? 'pointer' : 'default',
                              opacity: inCurrentMonth ? 1 : 0.3,
                              bgcolor: isToday ? 'primary.light' : 
                                       hasCompleted ? 'success.light' :
                                       hasCancelled ? 'error.light' :
                                       'background.paper',
                              border: isToday ? 2 : 0,
                              borderColor: 'primary.main',
                              '&:hover': plansForDay.length > 0 ? {
                                boxShadow: 2,
                              } : {},
                            }}
                            onClick={() => {
                              if (plansForDay.length > 0) {
                                openDayDetail(day, plansForDay);
                              }
                            }}
                          >
                            <Typography 
                              variant="caption" 
                              fontWeight={isToday ? 'bold' : 'normal'}
                              color={isToday ? 'primary' : 'text.secondary'}
                            >
                              {day.getDate()}
                            </Typography>
                            
                            {plansForDay.length > 0 && (
                              <Box sx={{ mt: 0.5 }}>
                                {plansForDay.slice(0, 2).map((plan, planIdx) => (
                                  <Box
                                    key={planIdx}
                                    sx={{
                                      fontSize: '0.65rem',
                                      p: 0.25,
                                      mb: 0.25,
                                      borderRadius: 0.5,
                                      bgcolor: plan.status === TrainingStatus.COMPLETED ? 'success.main' :
                                               plan.status === TrainingStatus.CANCELLED ? 'error.main' :
                                               'primary.main',
                                      color: 'white',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={`${plan.name}${plan.executionNote ? '\n\n' + plan.executionNote : ''}`}
                                  >
                                    {plan.name}
                                  </Box>
                                ))}
                                {plansForDay.length > 2 && (
                                  <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                                    +{plansForDay.length - 2} další
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </Paper>
                        );
                      })}
                    </Box>

                    {/* Legenda */}
                    <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Box sx={{ width: 16, height: 16, bgcolor: 'success.light', borderRadius: 0.5 }} />
                        <Typography variant="caption">Dokončeno</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Box sx={{ width: 16, height: 16, bgcolor: 'error.light', borderRadius: 0.5 }} />
                        <Typography variant="caption">Vynecháno</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Box sx={{ width: 16, height: 16, bgcolor: 'primary.light', borderRadius: 0.5, border: 2, borderColor: 'primary.main' }} />
                        <Typography variant="caption">Dnes</Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          </Box>

          {/* FAB pro přidání tréninku */}
          <Fab
            color="primary"
            aria-label="add"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={() => {
              resetForm();
              setOpenCreateDialog(true);
            }}
          >
            <AddIcon />
          </Fab>
        </Box>

        {/* Create Dialog */}
        <Dialog 
          open={openCreateDialog} 
          onClose={() => setOpenCreateDialog(false)} 
          fullScreen={isMobile}
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>Nový trénink</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Název tréninku *"
              type="text"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            
            <FormControl fullWidth margin="dense">
              <InputLabel>Skupina *</InputLabel>
              <Select
                value={formData.groupId}
                onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                label="Skupina *"
              >
                {myGroups.map(group => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="dense">
              <InputLabel>Typ *</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as TrainingType })}
                label="Typ *"
              >
                <MenuItem value={TT.COMMON}>Společný</MenuItem>
                <MenuItem value={TT.INDIVIDUAL}>Individuální</MenuItem>
              </Select>
            </FormControl>
            
            <DatePicker
              label="Datum *"
              value={formData.date}
              onChange={(date) => date && setFormData({ ...formData, date })}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'dense',
                },
              }}
            />
            
            <TextField
              margin="dense"
              label="Popis tréninku *"
              type="text"
              fullWidth
              multiline
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCreateDialog(false)}>Zrušit</Button>
            <Button
              onClick={handleCreatePlan}
              variant="contained"
              disabled={!formData.name.trim() || !formData.description.trim() || !formData.groupId}
            >
              Vytvořit
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog 
          open={openEditDialog} 
          onClose={() => setOpenEditDialog(false)}
          fullScreen={isMobile}
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>Upravit trénink</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Název tréninku *"
              type="text"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            
            <FormControl fullWidth margin="dense">
              <InputLabel>Skupina *</InputLabel>
              <Select
                value={formData.groupId}
                onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                label="Skupina *"
              >
                {myGroups.map(group => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="dense">
              <InputLabel>Typ *</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as TrainingType })}
                label="Typ *"
              >
                <MenuItem value={TT.COMMON}>Společný</MenuItem>
                <MenuItem value={TT.INDIVIDUAL}>Individuální</MenuItem>
              </Select>
            </FormControl>
            
            <DatePicker
              label="Datum *"
              value={formData.date}
              onChange={(date: Date | null) => date && setFormData({ ...formData, date })}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'dense',
                },
              }}
            />
            
            <TextField
              margin="dense"
              label="Popis tréninku *"
              type="text"
              fullWidth
              multiline
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)}>Zrušit</Button>
            <Button
              onClick={handleUpdatePlan}
              variant="contained"
              disabled={!formData.name.trim() || !formData.description.trim()}
            >
              Uložit
            </Button>
          </DialogActions>
        </Dialog>

        {/* Note Dialog */}
        <Dialog 
          open={openNoteDialog} 
          onClose={() => setOpenNoteDialog(false)}
          fullScreen={isMobile}
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>Poznámka k tréninku</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', height: isMobile ? '100%' : 'auto' }}>
            {selectedPlan && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">{selectedPlan.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(selectedPlan.date)} • {selectedPlan.groupName}
                </Typography>
              </Box>
            )}
            
            <TextField
              autoFocus
              label="Co se dělo na tréninku?"
              type="text"
              fullWidth
              multiline
              rows={isMobile ? undefined : 8}
              minRows={isMobile ? 15 : 8}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Popište průběh tréninku, co se podařilo, co je třeba zlepšit..."
              sx={isMobile ? { 
                flex: 1,
                '& .MuiInputBase-root': {
                  height: '100%',
                  alignItems: 'flex-start',
                },
              } : {}}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenNoteDialog(false)}>Zrušit</Button>
            <Button onClick={handleSaveNote} variant="contained">
              Uložit
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
          <DialogTitle>Smazat trénink</DialogTitle>
          <DialogContent>
            <Typography>
              Opravdu chcete smazat trénink <strong>{selectedPlan?.name}</strong>?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteDialog(false)}>Zrušit</Button>
            <Button onClick={handleDeletePlan} color="error" variant="contained">
              Smazat
            </Button>
          </DialogActions>
        </Dialog>

        {/* Day Detail Dialog */}
        <Dialog 
          open={openDayDetailDialog} 
          onClose={() => setOpenDayDetailDialog(false)}
          fullScreen={isMobile}
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>
            Tréninky - {selectedDate?.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </DialogTitle>
          <DialogContent>
            {selectedDayPlans.length === 0 ? (
              <Typography color="text.secondary">Žádné tréninky</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                {selectedDayPlans.map(plan => (
                  <Card key={plan.id} sx={{
                    borderLeft: plan.status === TrainingStatus.COMPLETED ? '4px solid' : 
                               plan.status === TrainingStatus.CANCELLED ? '4px solid' : 'none',
                    borderLeftColor: plan.status === TrainingStatus.COMPLETED ? 'success.main' : 
                                    plan.status === TrainingStatus.CANCELLED ? 'error.main' : 'transparent',
                  }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start" sx={{ mb: 1 }}>
                        <Typography variant="h6">
                          {plan.name}
                        </Typography>
                        <Box>
                          {plan.status === TrainingStatus.COMPLETED && (
                            <Chip label="Dokončeno" size="small" color="success" sx={{ mr: 0.5 }} />
                          )}
                          {plan.status === TrainingStatus.CANCELLED && (
                            <Chip label="Vynecháno" size="small" color="error" sx={{ mr: 0.5 }} />
                          )}
                          {plan.memberNotes && plan.memberNotes.length > 0 && (
                            <Chip 
                              label={`Poznámky: ${plan.memberNotes.length}`}
                              size="small" 
                              color="warning"
                            />
                          )}
                        </Box>
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {plan.groupName} • {plan.type}
                      </Typography>

                      {/* POZNÁMKY SVĚŘENCŮ - HLAVNÍ PRIORITA! */}
                      {plan.memberNotes && plan.memberNotes.length > 0 && (
                        <Paper elevation={4} sx={{ p: 2, mb: 2, bgcolor: 'warning.light', border: '3px solid', borderColor: 'warning.main' }}>
                          <Typography variant="h6" fontWeight="bold" color="warning.dark" sx={{ mb: 1 }}>
                            📝 Poznámky svěřenců ({plan.memberNotes.length}):
                          </Typography>
                          <Box display="flex" flexDirection="column" gap={1}>
                            {plan.memberNotes.map((note, index) => (
                              <Paper 
                                key={index}
                                elevation={3}
                                sx={{ 
                                  p: 1.5, 
                                  bgcolor: note.completed ? 'success.main' : 'background.paper',
                                  color: note.completed ? 'success.contrastText' : 'text.primary',
                                  border: '2px solid',
                                  borderColor: note.completed ? 'success.dark' : 'divider'
                                }}
                              >
                                <Box display="flex" justifyContent="space-between" alignItems="start" mb={0.5}>
                                  <Typography variant="subtitle1" fontWeight="bold">
                                    👤 {note.memberName}
                                  </Typography>
                                  {note.completed && (
                                    <Chip 
                                      label="✓ Dokončeno" 
                                      size="small" 
                                      color="success"
                                      sx={{ height: 22, fontWeight: 'bold' }}
                                    />
                                  )}
                                </Box>
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                                  "{note.note}"
                                </Typography>
                              </Paper>
                            ))}
                          </Box>
                        </Paper>
                      )}

                      <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                        {plan.description}
                      </Typography>

                      {plan.executionNote && (
                        <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
                          <Typography variant="caption" display="block" fontWeight="bold" sx={{ mb: 0.5 }}>
                            Poznámka trenéra:
                          </Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {plan.executionNote}
                          </Typography>
                        </Paper>
                      )}

                      {/* Docházka shrnutí */}
                      {attendanceSummaries.has(plan.id) && (
                        <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText', mt: 1 }}>
                          <Typography variant="caption" display="block" fontWeight="bold" sx={{ mb: 0.5 }}>
                            Docházka:
                          </Typography>
                          <Box display="flex" gap={1} flexWrap="wrap">
                            <Chip 
                              label={`Přítomno: ${attendanceSummaries.get(plan.id)!.present}`} 
                              size="small" 
                              sx={{ bgcolor: 'success.main', color: 'white' }}
                            />
                            {attendanceSummaries.get(plan.id)!.late > 0 && (
                              <Chip 
                                label={`Pozdě: ${attendanceSummaries.get(plan.id)!.late}`} 
                                size="small" 
                                sx={{ bgcolor: 'warning.main', color: 'white' }}
                              />
                            )}
                            {attendanceSummaries.get(plan.id)!.excused > 0 && (
                              <Chip 
                                label={`Omluven: ${attendanceSummaries.get(plan.id)!.excused}`} 
                                size="small" 
                                sx={{ bgcolor: 'info.main', color: 'white' }}
                              />
                            )}
                            {attendanceSummaries.get(plan.id)!.unexcused > 0 && (
                              <Chip 
                                label={`Neomluven: ${attendanceSummaries.get(plan.id)!.unexcused}`} 
                                size="small" 
                                sx={{ bgcolor: 'error.main', color: 'white' }}
                              />
                            )}
                          </Box>
                        </Paper>
                      )}
                    </CardContent>

                    <CardActions sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {/* Docházka tlačítko */}
                      <Button
                        size="small"
                        startIcon={<AttendanceIcon />}
                        color="primary"
                        variant={attendanceSummaries.has(plan.id) ? 'outlined' : 'contained'}
                        onClick={() => {
                          setOpenDayDetailDialog(false);
                          openAttendanceForPlan(plan);
                        }}
                      >
                        Docházka {attendanceSummaries.has(plan.id) && `(${attendanceSummaries.get(plan.id)!.present})`}
                      </Button>

                      {plan.status === TrainingStatus.PLANNED && (
                        <>
                          <Button
                            size="small"
                            startIcon={<CheckCircleIcon />}
                            color="success"
                            onClick={() => {
                              handleChangeStatus(plan.id, TrainingStatus.COMPLETED);
                              setOpenDayDetailDialog(false);
                            }}
                          >
                            Dokončit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => {
                              handleChangeStatus(plan.id, TrainingStatus.CANCELLED);
                              setOpenDayDetailDialog(false);
                            }}
                          >
                            Vynechat
                          </Button>
                        </>
                      )}
                      {plan.status !== TrainingStatus.PLANNED && (
                        <Button
                          size="small"
                          onClick={() => {
                            handleChangeStatus(plan.id, TrainingStatus.PLANNED);
                            setOpenDayDetailDialog(false);
                          }}
                        >
                          Vrátit do plánu
                        </Button>
                      )}
                      <Button
                        size="small"
                        startIcon={<NotesIcon />}
                        onClick={() => {
                          setOpenDayDetailDialog(false);
                          openNoteDialogForPlan(plan);
                        }}
                      >
                        Poznámka
                      </Button>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => {
                          setOpenDayDetailDialog(false);
                          openEditDialogForPlan(plan);
                        }}
                      >
                        Upravit
                      </Button>
                      <Button
                        size="small"
                        startIcon={<CopyIcon />}
                        onClick={() => {
                          handleDuplicatePlan(plan);
                          setOpenDayDetailDialog(false);
                        }}
                      >
                        Kopírovat
                      </Button>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setSelectedPlan(plan);
                          setOpenDayDetailDialog(false);
                          setOpenDeleteDialog(true);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </CardActions>
                  </Card>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDayDetailDialog(false)}>Zavřít</Button>
          </DialogActions>
        </Dialog>

        {/* Attendance Quick Record Dialog */}
        {attendancePlan && (
          <AttendanceQuickRecord
            open={openAttendanceDialog}
            onClose={() => {
              setOpenAttendanceDialog(false);
              setAttendancePlan(null);
            }}
            training={attendancePlan}
            members={myGroups.find(g => g.id === attendancePlan.groupId)?.members || []}
            currentUserId={currentUser?.uid || ''}
            onSaved={() => {
              loadData(); // Reload to update attendance summaries
            }}
          />
        )}

        {/* Attendance Stats Dialog */}
        <Dialog
          open={openStatsDialog}
          onClose={() => {
            setOpenStatsDialog(false);
            setStatsGroupId(null);
          }}
          maxWidth="lg"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>
            Statistiky docházky
            {statsGroupId && myGroups.find(g => g.id === statsGroupId) && (
              <Typography variant="body2" color="text.secondary">
                {myGroups.find(g => g.id === statsGroupId)?.name}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            {statsGroupId && (
              <AttendanceStats 
                groupId={statsGroupId}
                groupName={myGroups.find(g => g.id === statsGroupId)?.name || ''}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setOpenStatsDialog(false);
              setStatsGroupId(null);
            }}>
              Zavřít
            </Button>
          </DialogActions>
        </Dialog>
      </Layout>
    </LocalizationProvider>
  );
};

export default TrainingPlans;

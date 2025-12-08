import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Group as GroupIcon,
  NoteAdd as NoteAddIcon,
  ExpandMore as ExpandMoreIcon,
  Event as EventIcon,
  History as HistoryIcon,
  EmojiEvents as RaceIcon,
  Link as LinkIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  List as ListIcon,
  ViewModule as CalendarViewIcon,
} from '@mui/icons-material';
import { format, addDays, subDays, startOfDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import Layout from '../components/Layout';
import MemberTrainingNoteDialog from '../components/MemberTrainingNoteDialog';
import { useAuth } from '../hooks/useAuth';
import { getMemberByUserId } from '../utils/memberService';
import { getAllTrainingGroups } from '../utils/trainingGroupService';
import { getPlansByGroup } from '../utils/trainingPlanService';
import { TrainingType } from '../types/trainingPlan';
import type { TrainingGroup } from '../types/trainingGroup';
import type { TrainingPlan } from '../types/trainingPlan';

const MemberDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trainingGroups, setTrainingGroups] = useState<TrainingGroup[]>([]);
  const [todayTrainings, setTodayTrainings] = useState<(TrainingPlan & { groupName: string })[]>([]);
  const [upcomingTrainings, setUpcomingTrainings] = useState<(TrainingPlan & { groupName: string })[]>([]);
  const [pastTrainings, setPastTrainings] = useState<(TrainingPlan & { groupName: string })[]>([]);
  const [pastExpanded, setPastExpanded] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<TrainingPlan | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState<number | null>(null);
  
  // Kalendářové zobrazení
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [allTrainingsForCalendar, setAllTrainingsForCalendar] = useState<(TrainingPlan & { groupName: string })[]>([]);
  const [selectedDayPlans, setSelectedDayPlans] = useState<(TrainingPlan & { groupName: string })[]>([]);
  const [openDayDetailDialog, setOpenDayDetailDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const loadMemberData = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError('');

      // Načtení ID člena podle Firebase UID
      const memberIdFromDb = await getMemberByUserId(currentUser.uid);
      if (!memberIdFromDb) {
        setError('Váš účet není spojen se členským záznamem. Kontaktujte administrátora.');
        setLoading(false);
        return;
      }

      setCurrentMemberId(memberIdFromDb);

      // Načtení všech tréninkových skupin
      const allGroups = await getAllTrainingGroups();
      
      // Filtrování skupin, kde je člen členem
      const memberGroups = allGroups.filter((group: TrainingGroup) => 
        group.members?.some(member => member.id === memberIdFromDb)
      );
      setTrainingGroups(memberGroups);

      // Načtení tréninků pro tyto skupiny
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = new Date(todayStart);
      todayEnd.setHours(23, 59, 59, 999);
      const oneWeekAgo = subDays(todayStart, 7);
      const oneWeekLater = addDays(todayEnd, 7);
      
      const trainingPromises = memberGroups.map(async (group: TrainingGroup) => {
        const plans = await getPlansByGroup(group.id);
        return plans.map((plan: TrainingPlan) => ({
          ...plan,
          groupName: group.name,
        }));
      });

      const allTrainings = (await Promise.all(trainingPromises)).flat();
      
      // Rozdělení na dnešní, minulé a budoucí
      const today: (TrainingPlan & { groupName: string })[] = [];
      const past: (TrainingPlan & { groupName: string })[] = [];
      const upcoming: (TrainingPlan & { groupName: string })[] = [];
      
      allTrainings.forEach((training: TrainingPlan & { groupName: string }) => {
        const planDate = training.date instanceof Date ? training.date : new Date(training.date);
        
        // Dnešní tréninky
        if (planDate >= todayStart && planDate <= todayEnd) {
          today.push(training);
        }
        // Minulé tréninky (poslední týden, bez dnešních)
        else if (planDate >= oneWeekAgo && planDate < todayStart) {
          past.push(training);
        }
        // Budoucí tréninky (příští týden, bez dnešních)
        else if (planDate > todayEnd && planDate <= oneWeekLater) {
          upcoming.push(training);
        }
      });
      
      // Seřazení - dnešní a budoucí vzestupně, minulé sestupně (nejnovější první)
      today.sort((a: any, b: any) => {
        const aDate = a.date instanceof Date ? a.date : new Date(a.date);
        const bDate = b.date instanceof Date ? b.date : new Date(b.date);
        return aDate.getTime() - bDate.getTime();
      });
      
      past.sort((a: any, b: any) => {
        const aDate = a.date instanceof Date ? a.date : new Date(a.date);
        const bDate = b.date instanceof Date ? b.date : new Date(b.date);
        return bDate.getTime() - aDate.getTime(); // sestupně
      });
      
      upcoming.sort((a: any, b: any) => {
        const aDate = a.date instanceof Date ? a.date : new Date(a.date);
        const bDate = b.date instanceof Date ? b.date : new Date(b.date);
        return aDate.getTime() - bDate.getTime();
      });
      
      setTodayTrainings(today);
      setPastTrainings(past);
      setUpcomingTrainings(upcoming);
      setAllTrainingsForCalendar(allTrainings);

    } catch (err) {
      console.error('Chyba při načítání dat:', err);
      setError('Nepodařilo se načíst vaše tréninková data');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadMemberData();
  }, [loadMemberData]);

  // Kalendářové funkce
  const handlePrevMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDayClick = (date: Date, plans: (TrainingPlan & { groupName: string })[]) => {
    if (plans.length === 0) return;
    setSelectedDate(date);
    setSelectedDayPlans(plans);
    setOpenDayDetailDialog(true);
  };

  const getTrainingsForDate = (date: Date) => {
    return allTrainingsForCalendar.filter(training => {
      const trainingDate = training.date instanceof Date ? training.date : new Date(training.date);
      return isSameDay(trainingDate, date);
    });
  };

  const handleOpenNoteDialog = (training: TrainingPlan & { groupName: string }) => {
    setSelectedTraining(training);
    setNoteDialogOpen(true);
  };

  const handleCloseNoteDialog = () => {
    setNoteDialogOpen(false);
    setSelectedTraining(null);
  };

  const handleNoteSuccess = () => {
    loadMemberData(); // Znovu načte data
  };

  const canAddNote = (training: TrainingPlan & { groupName: string }) => {
    // Poznámky lze přidávat k individuálním tréningům, závodům
    // a společným tréningům s individuálním přístupem
    if (training.type === TrainingType.COMMON) {
      // Pro společné tréninky kontrolovat, zda má člen individuální přístup
      if (!currentMemberId) return false;
      if (!training.individualAccessMembers || !training.individualAccessMembers.includes(currentMemberId)) {
        return false;
      }
    }
    
    // Pouze tréninky dnes nebo v minulosti
    const trainingDate = training.date instanceof Date ? training.date : new Date(training.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    return trainingDate <= today;
  };

  // Určit, zda se trénink zobrazuje jako individuální pro aktuálního člena
  const isIndividualForMember = (training: TrainingPlan & { groupName: string }) => {
    if (training.type === TrainingType.INDIVIDUAL) return true;
    if (training.type === TrainingType.COMMON && currentMemberId) {
      return training.individualAccessMembers?.includes(currentMemberId) || false;
    }
    return false;
  };

  const getMemberNote = (training: TrainingPlan & { groupName: string }) => {
    if (!currentMemberId) return null;
    return training.memberNotes?.find(n => n.memberId === currentMemberId) || null;
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Alert severity="error">{error}</Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        <Typography variant="h4" gutterBottom>
          Můj tréninkový přehled
        </Typography>

        {/* Skupiny */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <GroupIcon color="primary" />
            <Typography variant="h6">
              Moje tréninkové skupiny
            </Typography>
          </Box>

          {trainingGroups.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nejste zařazen v žádné tréninkové skupině
            </Typography>
          ) : (
            <Box display="flex" flexWrap="wrap" gap={1}>
              {trainingGroups.map((group) => (
                <Chip
                  key={group.id}
                  label={group.name}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          )}
        </Paper>

        {/* Přepínač zobrazení */}
        <Box display="flex" justifyContent="center" mb={3}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            aria-label="režim zobrazení"
          >
            <ToggleButton value="list" aria-label="seznam">
              <ListIcon sx={{ mr: 1 }} />
              Seznam
            </ToggleButton>
            <ToggleButton value="calendar" aria-label="kalendář">
              <CalendarViewIcon sx={{ mr: 1 }} />
              Kalendář
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Kalendářové zobrazení */}
        {viewMode === 'calendar' ? (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <IconButton onClick={handlePrevMonth}>
                <ChevronLeftIcon />
              </IconButton>
              <Typography variant="h5">
                {format(calendarMonth, 'LLLL yyyy', { locale: cs })}
              </Typography>
              <IconButton onClick={handleNextMonth}>
                <ChevronRightIcon />
              </IconButton>
            </Box>

            {/* Kalendářová mřížka */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 1,
              }}
            >
              {/* Názvy dnů */}
              {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((day) => (
                <Box
                  key={day}
                  sx={{
                    p: 1,
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: 'text.secondary',
                  }}
                >
                  {day}
                </Box>
              ))}

              {/* Dny v měsíci */}
              {(() => {
                const monthStart = startOfMonth(calendarMonth);
                const monthEnd = endOfMonth(calendarMonth);
                const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
                
                // Přidat prázdné buňky na začátek (pondělí = 0)
                const startDay = getDay(monthStart);
                const emptyDays = startDay === 0 ? 6 : startDay - 1;
                
                return (
                  <>
                    {Array.from({ length: emptyDays }).map((_, i) => (
                      <Box key={`empty-${i}`} />
                    ))}
                    
                    {daysInMonth.map((day) => {
                      const trainingsOnDay = getTrainingsForDate(day);
                      const isToday = isSameDay(day, new Date());
                      const hasTrainings = trainingsOnDay.length > 0;
                      
                      return (
                        <Box
                          key={day.toISOString()}
                          onClick={() => handleDayClick(day, trainingsOnDay)}
                          sx={{
                            p: 1,
                            minHeight: 80,
                            border: '1px solid',
                            borderColor: isToday ? 'primary.main' : 'divider',
                            borderRadius: 1,
                            cursor: hasTrainings ? 'pointer' : 'default',
                            bgcolor: isToday ? 'primary.light' : hasTrainings ? 'action.hover' : 'background.paper',
                            '&:hover': hasTrainings ? {
                              bgcolor: 'action.selected',
                            } : {},
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={isToday ? 'bold' : 'normal'}
                            color={isToday ? 'primary.contrastText' : 'text.primary'}
                          >
                            {format(day, 'd')}
                          </Typography>
                          
                          {trainingsOnDay.map((training) => (
                            <Chip
                              key={training.id}
                              label={training.type === TrainingType.RACE ? '🏆' : training.name.substring(0, 10)}
                              size="small"
                              color={
                                training.type === TrainingType.RACE ? 'warning' :
                                training.type === TrainingType.INDIVIDUAL ? 'secondary' : 'primary'
                              }
                              sx={{ 
                                mt: 0.5, 
                                fontSize: '0.7rem',
                                height: 20,
                                width: '100%',
                                '.MuiChip-label': {
                                  px: 0.5,
                                }
                              }}
                            />
                          ))}
                        </Box>
                      );
                    })}
                  </>
                );
              })()}
            </Box>
          </Paper>
        ) : (
          <>
            {/* Seznam zobrazení - původní kód */}

        {/* Dnešní tréninky - hlavní sekce */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <EventIcon />
            <Typography variant="h5" fontWeight="bold">
              Dnešní tréninky
            </Typography>
          </Box>

          {todayTrainings.length === 0 ? (
            <Typography variant="body1">
              Dnes nejsou naplánovány žádné tréninky
            </Typography>
          ) : (
            <Box display="flex" flexDirection="column" gap={2}>
              {todayTrainings.map((training) => {
                const trainingDate = training.date instanceof Date ? training.date : new Date(training.date);
                const timeStr = format(trainingDate, 'HH:mm');
                const isIndividual = isIndividualForMember(training);
                const isRace = training.type === TrainingType.RACE;
                const canAddNoteToThis = canAddNote(training);
                const memberNote = getMemberNote(training);
                
                return (
                  <Card key={training.id} sx={{ bgcolor: 'background.paper' }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Box flex={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {isRace && <RaceIcon color="warning" />}
                            <Typography variant="h6" color="text.primary">
                              {training.name}
                            </Typography>
                            {isIndividual && (
                              <Chip
                                label="Individuální"
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            )}
                            {isRace && (
                              <Chip
                                icon={<RaceIcon />}
                                label="Závod"
                                size="small"
                                color="warning"
                              />
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {timeStr}
                          </Typography>
                        </Box>
                      </Box>

                      {isRace && training.raceProposalsUrl && (
                        <Box sx={{ mb: 1 }}>
                          <Button
                            startIcon={<LinkIcon />}
                            size="small"
                            variant="contained"
                            color="warning"
                            href={training.raceProposalsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Zobrazit propozice
                          </Button>
                        </Box>
                      )}

                      {training.description && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap' }}>
                            <strong>Program:</strong> {training.description}
                          </Typography>
                        </>
                      )}

                      {training.executionNote && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Paper sx={{ p: 1.5, bgcolor: 'info.light', border: '1px solid', borderColor: 'info.main' }}>
                            <Typography variant="caption" fontWeight="bold" display="block" mb={0.5} color="info.dark">
                              💬 Poznámka trenéra:
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {training.executionNote}
                            </Typography>
                          </Paper>
                        </>
                      )}

                      {memberNote && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Paper sx={{ p: 1.5, bgcolor: 'success.light', color: 'success.contrastText' }}>
                            <Typography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                              Vaše poznámka:
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {memberNote.note}
                            </Typography>
                            {memberNote.completed && (
                              <Chip 
                                label="Dokončeno" 
                                size="small" 
                                color="success" 
                                sx={{ mt: 1 }}
                              />
                            )}
                          </Paper>
                        </>
                      )}

                      {isIndividual && canAddNoteToThis && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Box display="flex" justifyContent="flex-end">
                            <Button
                              size="small"
                              startIcon={<NoteAddIcon />}
                              onClick={() => handleOpenNoteDialog(training)}
                              variant="contained"
                              color="secondary"
                            >
                              {memberNote ? 'Upravit poznámku' : 'Přidat poznámku'}
                            </Button>
                          </Box>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </Paper>

        {/* Naplánované tréninky */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <CalendarIcon color="primary" />
            <Typography variant="h6">
              Naplánované tréninky (7 dní)
            </Typography>
          </Box>

          {upcomingTrainings.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              V následujících 7 dnech nejsou naplánovány žádné tréninky
            </Typography>
          ) : (
            <Box display="flex" flexDirection="column" gap={2}>
              {upcomingTrainings.map((training) => {
                const trainingDate = training.date instanceof Date ? training.date : new Date(training.date);
                const dayName = format(trainingDate, 'EEEE', { locale: cs });
                const dateStr = format(trainingDate, 'd. MMMM yyyy', { locale: cs });
                const isIndividual = isIndividualForMember(training);
                const isRace = training.type === TrainingType.RACE;
                
                return (
                  <Card key={training.id} variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Box flex={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {isRace && <RaceIcon color="warning" />}
                            <Typography variant="h6">
                              {training.name}
                            </Typography>
                            {isIndividual && (
                              <Chip
                                label="Individuální"
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            )}
                            {isRace && (
                              <Chip
                                icon={<RaceIcon />}
                                label="Závod"
                                size="small"
                                color="warning"
                              />
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {dayName}, {dateStr}
                          </Typography>
                        </Box>
                      </Box>

                      {isRace && training.raceProposalsUrl && (
                        <Box sx={{ mb: 1 }}>
                          <Button
                            startIcon={<LinkIcon />}
                            size="small"
                            variant="outlined"
                            color="warning"
                            href={training.raceProposalsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Zobrazit propozice
                          </Button>
                        </Box>
                      )}

                      {training.description && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            <strong>Program:</strong> {training.description}
                          </Typography>
                        </>
                      )}

                      {training.executionNote && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Paper sx={{ p: 1.5, bgcolor: 'info.light', border: '1px solid', borderColor: 'info.main' }}>
                            <Typography variant="caption" fontWeight="bold" display="block" mb={0.5} color="info.dark">
                              💬 Poznámka trenéra:
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {training.executionNote}
                            </Typography>
                          </Paper>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </Paper>

        {/* Minulé tréninky - rozbalovací */}
        <Accordion 
          expanded={pastExpanded} 
          onChange={() => setPastExpanded(!pastExpanded)}
          sx={{ mb: 3 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={1}>
              <HistoryIcon color="action" />
              <Typography variant="h6">
                Minulé tréninky (7 dní)
              </Typography>
              {pastTrainings.length > 0 && (
                <Chip 
                  label={pastTrainings.length} 
                  size="small" 
                  color="default"
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {pastTrainings.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                V posledních 7 dnech neproběhly žádné tréninky
              </Typography>
            ) : (
              <Box display="flex" flexDirection="column" gap={2}>
                {pastTrainings.map((training) => {
                  const trainingDate = training.date instanceof Date ? training.date : new Date(training.date);
                  const dayName = format(trainingDate, 'EEEE', { locale: cs });
                  const dateStr = format(trainingDate, 'd. MMMM yyyy', { locale: cs });
                  const isIndividual = isIndividualForMember(training);
                  const isRace = training.type === TrainingType.RACE;
                  const canAddNoteToThis = canAddNote(training);
                  const memberNote = getMemberNote(training);
                  
                  return (
                    <Card key={training.id} variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                          <Box flex={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                              {isRace && <RaceIcon color="warning" />}
                              <Typography variant="h6">
                                {training.name}
                              </Typography>
                              {isIndividual && (
                                <Chip
                                  label="Individuální"
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                />
                              )}
                              {isRace && (
                                <Chip
                                  icon={<RaceIcon />}
                                  label="Závod"
                                  size="small"
                                  color="warning"
                                />
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {dayName}, {dateStr}
                            </Typography>
                          </Box>
                        </Box>

                        {isRace && training.raceProposalsUrl && (
                          <Box sx={{ mb: 1 }}>
                            <Button
                              startIcon={<LinkIcon />}
                              size="small"
                              variant="outlined"
                              color="warning"
                              href={training.raceProposalsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Zobrazit propozice
                            </Button>
                          </Box>
                        )}

                        {training.description && (
                          <>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              <strong>Program:</strong> {training.description}
                            </Typography>
                          </>
                        )}

                        {training.executionNote && (
                          <>
                            <Divider sx={{ my: 1 }} />
                            <Paper sx={{ p: 1.5, bgcolor: 'info.light', border: '1px solid', borderColor: 'info.main' }}>
                              <Typography variant="caption" fontWeight="bold" display="block" mb={0.5} color="info.dark">
                                💬 Poznámka trenéra:
                              </Typography>
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                {training.executionNote}
                              </Typography>
                            </Paper>
                          </>
                        )}

                        {memberNote && (
                          <>
                            <Divider sx={{ my: 1 }} />
                            <Paper sx={{ p: 1.5, bgcolor: 'info.light', color: 'info.contrastText' }}>
                              <Typography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                                Vaše poznámka:
                              </Typography>
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                {memberNote.note}
                              </Typography>
                              {memberNote.completed && (
                                <Chip 
                                  label="Dokončeno" 
                                  size="small" 
                                  color="success" 
                                  sx={{ mt: 1 }}
                                />
                              )}
                            </Paper>
                          </>
                        )}

                        {isIndividual && canAddNoteToThis && (
                          <>
                            <Divider sx={{ my: 1 }} />
                            <Box display="flex" justifyContent="flex-end">
                              <Button
                                size="small"
                                startIcon={<NoteAddIcon />}
                                onClick={() => handleOpenNoteDialog(training)}
                                variant="outlined"
                                color="secondary"
                              >
                                {memberNote ? 'Upravit poznámku' : 'Přidat poznámku'}
                              </Button>
                            </Box>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
          </>
        )}
      </Box>

      {/* Dialog pro detail dne v kalendáři */}
      <Dialog
        open={openDayDetailDialog}
        onClose={() => setOpenDayDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedDate && format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: cs })}
        </DialogTitle>
        <DialogContent>
          {selectedDayPlans.length === 0 ? (
            <Typography color="text.secondary">Žádné tréninky</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              {selectedDayPlans.map((plan) => {
                const isIndividual = isIndividualForMember(plan);
                const isRace = plan.type === TrainingType.RACE;
                
                return (
                  <Card key={plan.id}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                        <Box flex={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {isRace && <RaceIcon color="warning" />}
                            <Typography variant="h6">
                              {plan.name}
                            </Typography>
                            {isIndividual && (
                              <Chip
                                label="Individuální"
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            )}
                            {isRace && (
                              <Chip
                                icon={<RaceIcon />}
                                label="Závod"
                                size="small"
                                color="warning"
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {plan.groupName}
                      </Typography>

                      {isRace && plan.raceProposalsUrl && (
                        <Box sx={{ mb: 2 }}>
                          <Button
                            startIcon={<LinkIcon />}
                            size="medium"
                            variant="contained"
                            color="warning"
                            href={plan.raceProposalsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Zobrazit propozice závodu
                          </Button>
                        </Box>
                      )}

                      {plan.description && (
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                          {plan.description}
                        </Typography>
                      )}

                      {plan.executionNote && (
                        <Paper sx={{ p: 1.5, bgcolor: 'info.light', border: '1px solid', borderColor: 'info.main' }}>
                          <Typography variant="caption" fontWeight="bold" display="block" mb={0.5} color="info.dark">
                            💬 Poznámka trenéra:
                          </Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {plan.executionNote}
                          </Typography>
                        </Paper>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDayDetailDialog(false)}>Zavřít</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pro přidání poznámky */}
      <MemberTrainingNoteDialog
        open={noteDialogOpen}
        onClose={handleCloseNoteDialog}
        training={selectedTraining}
        onSuccess={handleNoteSuccess}
      />
    </Layout>
  );
};

export default MemberDashboard;

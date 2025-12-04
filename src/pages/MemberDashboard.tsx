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
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Group as GroupIcon,
  NoteAdd as NoteAddIcon,
  ExpandMore as ExpandMoreIcon,
  Event as EventIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { format, addDays, subDays, startOfDay } from 'date-fns';
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
    // Pouze individuální tréninky
    if (training.type !== TrainingType.INDIVIDUAL) return false;
    
    // Pouze tréninky dnes nebo v minulosti
    const trainingDate = training.date instanceof Date ? training.date : new Date(training.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    return trainingDate <= today;
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
                const isIndividual = training.type === TrainingType.INDIVIDUAL;
                const canAddNoteToThis = canAddNote(training);
                const memberNote = getMemberNote(training);
                
                return (
                  <Card key={training.id} sx={{ bgcolor: 'background.paper' }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Box flex={1}>
                          <Box display="flex" alignItems="center" gap={1}>
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
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {timeStr}
                          </Typography>
                        </Box>
                      </Box>

                      {training.description && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap' }}>
                            <strong>Program:</strong> {training.description}
                          </Typography>
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
                const isIndividual = training.type === TrainingType.INDIVIDUAL;
                
                return (
                  <Card key={training.id} variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Box flex={1}>
                          <Box display="flex" alignItems="center" gap={1}>
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
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {dayName}, {dateStr}
                          </Typography>
                        </Box>
                      </Box>

                      {training.description && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            <strong>Program:</strong> {training.description}
                          </Typography>
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
                  const isIndividual = training.type === TrainingType.INDIVIDUAL;
                  const canAddNoteToThis = canAddNote(training);
                  const memberNote = getMemberNote(training);
                  
                  return (
                    <Card key={training.id} variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                          <Box flex={1}>
                            <Box display="flex" alignItems="center" gap={1}>
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
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {dayName}, {dateStr}
                            </Typography>
                          </Box>
                        </Box>

                        {training.description && (
                          <>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              <strong>Program:</strong> {training.description}
                            </Typography>
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
      </Box>

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

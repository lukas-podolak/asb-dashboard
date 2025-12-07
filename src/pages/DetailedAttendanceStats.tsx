import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
} from '@mui/material';
import {
  CheckCircle as PresentIcon,
  Schedule as LateIcon,
  ExitToApp as LeftEarlyIcon,
  EventBusy as ExcusedIcon,
  Cancel as AbsentIcon,
  Help as UnknownIcon,
  ArrowBack as BackIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { cs } from 'date-fns/locale';
import { startOfWeek, endOfWeek, subWeeks, format, isWithinInterval } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import { getGroupAttendanceStats, getTrainingAttendance } from '../utils/attendanceService';
import { getTrainingGroup } from '../utils/trainingGroupService';
import { getHistoricalPlans, getUpcomingPlans } from '../utils/trainingPlanService';
import type { GroupAttendanceStats, MemberAttendanceStats, AttendanceRecord } from '../types/attendance';
import { AttendanceStatus as AS } from '../types/attendance';
import type { TrainingPlan } from '../types/trainingPlan';
import type { TrainingGroup } from '../types/trainingGroup';

interface TrainingWithAttendance extends TrainingPlan {
  attendance?: AttendanceRecord;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

const DetailedAttendanceStats: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const searchParams = new URLSearchParams(location.search);
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const periodParam = searchParams.get('period') || 'Toto období';
  
  const [tab, setTab] = useState(0);
  const [statsSubTab, setStatsSubTab] = useState(0);
  const [group, setGroup] = useState<TrainingGroup | null>(null);
  const [stats, setStats] = useState<GroupAttendanceStats | null>(null);
  const [trainings, setTrainings] = useState<TrainingPlan[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberAttendanceStats | null>(null);
  const [memberTrainings, setMemberTrainings] = useState<TrainingWithAttendance[]>([]);
  const [loadingMemberDetails, setLoadingMemberDetails] = useState(false);
  const [weeklyData, setWeeklyData] = useState<Array<{ week: string; attendance: number; trainings: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate] = useState<Date | null>(
    startDateParam ? new Date(startDateParam) : null
  );
  const [endDate] = useState<Date | null>(
    endDateParam ? new Date(endDateParam) : null
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        if (!groupId) {
          setError('ID skupiny není zadáno');
          return;
        }

        const groupData = await getTrainingGroup(groupId);
        if (!groupData) {
          setError('Skupina nenalezena');
          return;
        }
        setGroup(groupData);

        const groupStats = await getGroupAttendanceStats(
          groupId,
          startDate || undefined,
          endDate || undefined
        );
        setStats(groupStats);

        const [historical, upcoming] = await Promise.all([
          getHistoricalPlans(undefined, startDate || undefined, endDate || undefined),
          getUpcomingPlans(),
        ]);
        
        const allTrainings = [...historical, ...upcoming]
          .filter(t => {
            if (t.groupId !== groupId) return false;
            if (startDate && t.date < startDate) return false;
            if (endDate && t.date > endDate) return false;
            return true;
          })
          .sort((a, b) => b.date.getTime() - a.date.getTime());
        
        setTrainings(allTrainings);
      } catch (err: any) {
        setError(`Nepodařilo se načíst data: ${err.message}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [groupId, startDate, endDate]);

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return theme.palette.success.main;
    if (rate >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const handleMemberClick = async (member: MemberAttendanceStats) => {
    setSelectedMember(member);
    setLoadingMemberDetails(true);
    
    try {
      // Načíst docházku pro všechny tréninky
      const trainingsWithAttendance = await Promise.all(
        trainings.map(async (training) => {
          const attendanceRecords = await getTrainingAttendance(training.id);
          const memberAttendance = attendanceRecords.find(
            record => record.memberId === member.memberId
          );
          
          return {
            ...training,
            attendance: memberAttendance,
          } as TrainingWithAttendance;
        })
      );
      
      setMemberTrainings(trainingsWithAttendance);
      
      // Vypočítat týdenní data za posledních 10 týdnů
      const now = new Date();
      const weeksData: Array<{ week: string; attendance: number; trainings: number }> = [];
      
      for (let i = 9; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }); // Pondělí
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 }); // Neděle
        
        // Najít tréninky v tomto týdnu
        const weekTrainings = trainingsWithAttendance.filter(t => 
          isWithinInterval(t.date, { start: weekStart, end: weekEnd })
        );
        
        // Spočítat účast (present, late, leftEarly se počítají jako účast)
        const attendedCount = weekTrainings.filter(t => 
          t.attendance && 
          (t.attendance.status === AS.PRESENT || 
           t.attendance.status === AS.LATE || 
           t.attendance.status === AS.LEFT_EARLY)
        ).length;
        
        const attendanceRate = weekTrainings.length > 0 
          ? (attendedCount / weekTrainings.length) * 100 
          : 0;
        
        weeksData.push({
          week: format(weekStart, 'd.M.', { locale: cs }),
          attendance: Math.round(attendanceRate),
          trainings: weekTrainings.length,
        });
      }
      
      setWeeklyData(weeksData);
    } catch (err) {
      console.error('Chyba při načítání docházky člena:', err);
    } finally {
      setLoadingMemberDetails(false);
    }
  };

  const handleCloseMemberDialog = () => {
    setSelectedMember(null);
    setMemberTrainings([]);
    setWeeklyData([]);
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Layout>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={cs}>
      <Layout>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate(-1)} edge="start">
              <BackIcon />
            </IconButton>
            <Box flex={1}>
              <Typography variant="h5" gutterBottom>
                Podrobné statistiky docházky
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {group?.name} • {periodParam}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <CalendarIcon color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    Celkem tréninků
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {stats?.totalTrainings || 0}
                </Typography>
              </CardContent>
            </Card>
            
            <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <PersonIcon color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    Počet členů
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {stats?.memberStats.length || 0}
                </Typography>
              </CardContent>
            </Card>
            
            <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <TrendingUpIcon color="success" />
                  <Typography variant="body2" color="text.secondary">
                    Průměrná účast
                  </Typography>
                </Box>
                <Typography 
                  variant="h4"
                  sx={{ color: getAttendanceColor(stats?.averageAttendance || 0) }}
                >
                  {stats?.averageAttendance.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
            
            <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <PresentIcon color="success" />
                  <Typography variant="body2" color="text.secondary">
                    Celkem přítomných
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {stats?.memberStats.reduce((sum, m) => sum + m.present, 0) || 0}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Paper sx={{ mb: 3 }}>
            <Tabs 
              value={tab} 
              onChange={(_, newValue) => setTab(newValue)}
              variant={isMobile ? 'fullWidth' : 'standard'}
            >
              <Tab label="Přehled členů" />
              <Tab label="Trendy docházky" />
              <Tab label="Detailní analýza" />
            </Tabs>
          </Paper>

          <TabPanel value={tab} index={0}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={statsSubTab} onChange={(_, newValue) => setStatsSubTab(newValue)}>
                <Tab label="Tréninky" />
                <Tab label="Závody" />
              </Tabs>
            </Box>

            {/* Tabulka tréninků */}
            {statsSubTab === 0 && (
              <TableContainer component={Paper}>
                <Table size={isMobile ? 'small' : 'medium'}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Člen</TableCell>
                      {!isMobile && <TableCell align="center">Celkem</TableCell>}
                      <TableCell align="center">
                        <PresentIcon fontSize="small" color="success" />
                      </TableCell>
                      <TableCell align="center">
                        <LateIcon fontSize="small" color="warning" />
                      </TableCell>
                      {!isMobile && (
                        <TableCell align="center">
                          <LeftEarlyIcon fontSize="small" color="info" />
                        </TableCell>
                      )}
                      <TableCell align="center">
                        <ExcusedIcon fontSize="small" color="primary" />
                      </TableCell>
                      <TableCell align="center">
                        <AbsentIcon fontSize="small" color="error" />
                      </TableCell>
                      <TableCell align="center">Účast</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats?.memberStats.map((member) => (
                      <TableRow 
                        key={member.memberId}
                        onClick={() => handleMemberClick(member)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {member.memberName}
                          </Typography>
                          {member.memberEmail && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {member.memberEmail}
                            </Typography>
                          )}
                        </TableCell>
                        {!isMobile && (
                          <TableCell align="center">{member.totalTrainings}</TableCell>
                        )}
                        <TableCell align="center">
                          <Chip 
                            label={member.present} 
                            size="small" 
                            color="success"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={member.late} 
                            size="small" 
                            color="warning"
                            variant="outlined"
                          />
                        </TableCell>
                        {!isMobile && (
                          <TableCell align="center">
                            <Chip 
                              label={member.leftEarly} 
                              size="small" 
                              color="info"
                              variant="outlined"
                            />
                          </TableCell>
                        )}
                        <TableCell align="center">
                          <Chip 
                            label={member.excused} 
                            size="small" 
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={member.unexcused} 
                            size="small" 
                            color="error"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box>
                            <Typography 
                              variant="body2" 
                              fontWeight="bold"
                              sx={{ color: getAttendanceColor(member.attendanceRate) }}
                            >
                              {member.attendanceRate.toFixed(1)}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={member.attendanceRate}
                              sx={{
                                mt: 0.5,
                                height: 6,
                                borderRadius: 1,
                                bgcolor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: getAttendanceColor(member.attendanceRate),
                                },
                              }}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Tabulka závodů */}
            {statsSubTab === 1 && (
              <TableContainer component={Paper}>
                <Table size={isMobile ? 'small' : 'medium'}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Člen</TableCell>
                      <TableCell align="center">Celkem</TableCell>
                      <TableCell align="center">Účast</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats?.memberStats.map((member) => (
                      <TableRow 
                        key={member.memberId}
                        onClick={() => handleMemberClick(member)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {member.memberName}
                          </Typography>
                          {member.memberEmail && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {member.memberEmail}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={member.totalRaces} 
                            size="small"
                            variant="outlined"
                            color="warning"
                          />
                        </TableCell>
                        <TableCell align="center">
                          {member.totalRaces > 0 ? (
                            <Box>
                              <Typography 
                                variant="body2" 
                                fontWeight="bold"
                                sx={{ color: getAttendanceColor(member.racesRate) }}
                              >
                                {member.racesRate.toFixed(1)}%
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={member.racesRate}
                                sx={{
                                  mt: 0.5,
                                  height: 6,
                                  borderRadius: 1,
                                  bgcolor: 'grey.200',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: getAttendanceColor(member.racesRate),
                                  },
                                }}
                              />
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.disabled">-</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          <TabPanel value={tab} index={1}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Card sx={{ flex: '1 1 400px' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      🏆 Top 5 - Nejlepší účast
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {stats?.memberStats
                        .slice(0, 5)
                        .map((member) => (
                          <Box key={member.memberId} sx={{ mb: 2 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="start" mb={0.5}>
                              <Box flex={1}>
                                <Typography variant="body2" fontWeight="medium">
                                  {member.memberName}
                                </Typography>
                                {member.memberEmail && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {member.memberEmail}
                                  </Typography>
                                )}
                              </Box>
                              <Typography 
                                variant="body2" 
                                fontWeight="bold"
                                sx={{ color: getAttendanceColor(member.attendanceRate), ml: 1 }}
                              >
                                {member.attendanceRate.toFixed(1)}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={member.attendanceRate}
                              sx={{
                                height: 8,
                                borderRadius: 1,
                                bgcolor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: getAttendanceColor(member.attendanceRate),
                                },
                              }}
                            />
                          </Box>
                        ))}
                    </Box>
                  </CardContent>
                </Card>

                <Card sx={{ flex: '1 1 400px' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      ⚠️ Potřebují pozornost
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {stats?.memberStats
                        .slice(-5)
                        .reverse()
                        .map((member) => (
                          <Box key={member.memberId} sx={{ mb: 2 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="start" mb={0.5}>
                              <Box flex={1}>
                                <Typography variant="body2" fontWeight="medium">
                                  {member.memberName}
                                </Typography>
                                {member.memberEmail && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {member.memberEmail}
                                  </Typography>
                                )}
                              </Box>
                              <Typography 
                                variant="body2" 
                                fontWeight="bold"
                                sx={{ color: getAttendanceColor(member.attendanceRate), ml: 1 }}
                              >
                                {member.attendanceRate.toFixed(1)}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={member.attendanceRate}
                              sx={{
                                height: 8,
                                borderRadius: 1,
                                bgcolor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: getAttendanceColor(member.attendanceRate),
                                },
                              }}
                            />
                          </Box>
                        ))}
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Rozložení docházky
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2, justifyContent: 'space-around' }}>
                    <Box textAlign="center">
                      <PresentIcon fontSize="large" color="success" />
                      <Typography variant="h6">
                        {stats?.memberStats.reduce((sum, m) => sum + m.present, 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Přítomen
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <LateIcon fontSize="large" color="warning" />
                      <Typography variant="h6">
                        {stats?.memberStats.reduce((sum, m) => sum + m.late, 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Pozdě
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <LeftEarlyIcon fontSize="large" color="info" />
                      <Typography variant="h6">
                        {stats?.memberStats.reduce((sum, m) => sum + m.leftEarly, 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Odešel dříve
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <ExcusedIcon fontSize="large" color="primary" />
                      <Typography variant="h6">
                        {stats?.memberStats.reduce((sum, m) => sum + m.excused, 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Omluven
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <AbsentIcon fontSize="large" color="error" />
                      <Typography variant="h6">
                        {stats?.memberStats.reduce((sum, m) => sum + m.unexcused, 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Chybí
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <UnknownIcon fontSize="large" color="disabled" />
                      <Typography variant="h6">
                        {stats?.memberStats.reduce((sum, m) => sum + m.unknown, 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Nezadáno
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>

          <TabPanel value={tab} index={2}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Detailní statistiky jednotlivých členů
                  </Typography>
                  <TableContainer sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Člen</TableCell>
                          <TableCell align="center">Aktivita %</TableCell>
                          <TableCell align="center">Účast %</TableCell>
                          <TableCell align="center">Omluvená %</TableCell>
                          <TableCell align="center">Neomluvená %</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stats?.memberStats.map((member) => {
                          const excusedRate = member.totalTrainings > 0 
                            ? (member.excused / member.totalTrainings) * 100 
                            : 0;
                          const unexcusedRate = member.totalTrainings > 0 
                            ? (member.unexcused / member.totalTrainings) * 100 
                            : 0;
                          
                          return (
                            <TableRow key={member.memberId}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {member.memberName}
                                </Typography>
                                {member.memberEmail && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {member.memberEmail}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={`${member.activeRate.toFixed(1)}%`}
                                  size="small"
                                  sx={{ 
                                    bgcolor: getAttendanceColor(member.activeRate),
                                    color: 'white',
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={`${member.attendanceRate.toFixed(1)}%`}
                                  size="small"
                                  sx={{ 
                                    bgcolor: getAttendanceColor(member.attendanceRate),
                                    color: 'white',
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                {excusedRate.toFixed(1)}%
                              </TableCell>
                              <TableCell align="center">
                                <Typography
                                  variant="body2"
                                  sx={{ 
                                    color: unexcusedRate > 20 ? 'error.main' : 'text.primary',
                                    fontWeight: unexcusedRate > 20 ? 'bold' : 'normal',
                                  }}
                                >
                                  {unexcusedRate.toFixed(1)}%
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Seznam tréninků v období
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Celkem {trainings.length} tréninků
                  </Typography>
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {trainings.map((training) => (
                      <Box
                        key={training.id}
                        sx={{
                          p: 2,
                          mb: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="start">
                          <Box flex={1}>
                            <Typography variant="subtitle2">
                              {training.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {training.date.toLocaleDateString('cs-CZ', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </Typography>
                          </Box>
                          <Chip
                            label={training.status}
                            size="small"
                            color="default"
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>
        </Box>

        {/* Dialog pro detaily člena */}
        <Dialog
          open={!!selectedMember}
          onClose={handleCloseMemberDialog}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6">
                  {selectedMember?.memberName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Detailní statistiky docházky
                </Typography>
              </Box>
              <IconButton onClick={handleCloseMemberDialog} edge="end">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {loadingMemberDetails ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Souhrnné statistiky */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Celkové statistiky
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                    <Card sx={{ flex: '1 1 150px', minWidth: 150 }}>
                      <CardContent sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h5">
                          {selectedMember?.totalTrainings}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Celkem tréninků
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card sx={{ flex: '1 1 150px', minWidth: 150 }}>
                      <CardContent sx={{ textAlign: 'center', p: 2 }}>
                        <Typography 
                          variant="h5"
                          sx={{ color: getAttendanceColor(selectedMember?.attendanceRate || 0) }}
                        >
                          {selectedMember?.attendanceRate.toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Účast
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card sx={{ flex: '1 1 150px', minWidth: 150 }}>
                      <CardContent sx={{ textAlign: 'center', p: 2 }}>
                        <Typography 
                          variant="h5"
                          sx={{ color: getAttendanceColor(selectedMember?.activeRate || 0) }}
                        >
                          {selectedMember?.activeRate.toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Aktivita
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Graf docházky po týdnech */}
                {weeklyData.length > 0 && (
                  <>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Trend docházky za posledních 10 týdnů
                      </Typography>
                      <Box sx={{ width: '100%', height: 300, mt: 2 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={weeklyData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="week" 
                              label={{ value: 'Týden', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis 
                              label={{ value: 'Účast (%)', angle: -90, position: 'insideLeft' }}
                              domain={[0, 100]}
                            />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <Paper sx={{ p: 1.5 }}>
                                      <Typography variant="caption" display="block">
                                        <strong>Týden {data.week}</strong>
                                      </Typography>
                                      <Typography variant="caption" display="block" color="success.main">
                                        Účast: {data.attendance}%
                                      </Typography>
                                      <Typography variant="caption" display="block" color="text.secondary">
                                        Tréninků: {data.trainings}
                                      </Typography>
                                    </Paper>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="attendance" 
                              stroke={theme.palette.success.main}
                              strokeWidth={2}
                              name="Účast (%)"
                              dot={{ fill: theme.palette.success.main, r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <Chip 
                          size="small" 
                          label={`Průměrná účast: ${weeklyData.reduce((sum, w) => sum + w.attendance, 0) / weeklyData.length}%`}
                          sx={{ bgcolor: theme.palette.success.light, color: 'white' }}
                        />
                        <Chip 
                          size="small" 
                          label={`Celkem tréninků: ${weeklyData.reduce((sum, w) => sum + w.trainings, 0)}`}
                          color="primary"
                        />
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />
                  </>
                )}

                {/* Rozložení docházky */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Rozložení docházky
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, justifyContent: 'space-around' }}>
                    <Box textAlign="center">
                      <PresentIcon color="success" />
                      <Typography variant="h6">{selectedMember?.present}</Typography>
                      <Typography variant="caption">Přítomen</Typography>
                    </Box>
                    <Box textAlign="center">
                      <LateIcon color="warning" />
                      <Typography variant="h6">{selectedMember?.late}</Typography>
                      <Typography variant="caption">Pozdě</Typography>
                    </Box>
                    <Box textAlign="center">
                      <LeftEarlyIcon color="info" />
                      <Typography variant="h6">{selectedMember?.leftEarly}</Typography>
                      <Typography variant="caption">Odešel dříve</Typography>
                    </Box>
                    <Box textAlign="center">
                      <ExcusedIcon color="primary" />
                      <Typography variant="h6">{selectedMember?.excused}</Typography>
                      <Typography variant="caption">Omluven</Typography>
                    </Box>
                    <Box textAlign="center">
                      <AbsentIcon color="error" />
                      <Typography variant="h6">{selectedMember?.unexcused}</Typography>
                      <Typography variant="caption">Chybí</Typography>
                    </Box>
                    <Box textAlign="center">
                      <UnknownIcon color="disabled" />
                      <Typography variant="h6">{selectedMember?.unknown}</Typography>
                      <Typography variant="caption">Nezadáno</Typography>
                    </Box>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Seznam tréninků s docházkou */}
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Historie tréninků
                  </Typography>
                  <Box sx={{ mt: 2, maxHeight: 400, overflow: 'auto' }}>
                    {memberTrainings.map((training) => (
                      <Box
                        key={training.id}
                        sx={{
                          p: 2,
                          mb: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="start">
                          <Box flex={1}>
                            <Typography variant="subtitle2">
                              {training.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {training.date.toLocaleDateString('cs-CZ', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={1}>
                            {training.attendance ? (
                              <>
                                {training.attendance.status === AS.PRESENT && (
                                  <Chip
                                    icon={<PresentIcon />}
                                    label="Přítomen"
                                    size="small"
                                    color="success"
                                  />
                                )}
                                {training.attendance.status === AS.LATE && (
                                  <Chip
                                    icon={<LateIcon />}
                                    label="Pozdě"
                                    size="small"
                                    color="warning"
                                  />
                                )}
                                {training.attendance.status === AS.LEFT_EARLY && (
                                  <Chip
                                    icon={<LeftEarlyIcon />}
                                    label="Odešel dříve"
                                    size="small"
                                    color="info"
                                  />
                                )}
                                {training.attendance.status === AS.EXCUSED && (
                                  <Chip
                                    icon={<ExcusedIcon />}
                                    label="Omluven"
                                    size="small"
                                    color="primary"
                                  />
                                )}
                                {training.attendance.status === AS.UNEXCUSED && (
                                  <Chip
                                    icon={<AbsentIcon />}
                                    label="Chybí"
                                    size="small"
                                    color="error"
                                  />
                                )}
                                {training.attendance.note && (
                                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                    {training.attendance.note}
                                  </Typography>
                                )}
                              </>
                            ) : (
                              <Chip
                                icon={<UnknownIcon />}
                                label="Nezadáno"
                                size="small"
                                color="default"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseMemberDialog}>Zavřít</Button>
          </DialogActions>
        </Dialog>
      </Layout>
    </LocalizationProvider>
  );
};

export default DetailedAttendanceStats;

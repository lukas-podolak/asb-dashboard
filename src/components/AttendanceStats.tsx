import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Tooltip,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  Divider,
} from '@mui/material';
import {
  CheckCircle as PresentIcon,
  Schedule as LateIcon,
  ExitToApp as LeftEarlyIcon,
  EventBusy as ExcusedIcon,
  Cancel as AbsentIcon,
  Download as ExportIcon,
  CalendarToday as CalendarIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { cs } from 'date-fns/locale';
import { getGroupAttendanceStats } from '../utils/attendanceService';
import type { GroupAttendanceStats, MemberAttendanceStats } from '../types/attendance';
import { getHistoricalPlans, getUpcomingPlans } from '../utils/trainingPlanService';
import type { TrainingPlan } from '../types/trainingPlan';

interface AttendanceStatsProps {
  groupId: number | string;
  groupName: string;
}

type PeriodFilter = 'month' | '3months' | 'season' | 'custom';

const AttendanceStats: React.FC<AttendanceStatsProps> = ({ groupId, groupName }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [stats, setStats] = useState<GroupAttendanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openTrainingsDialog, setOpenTrainingsDialog] = useState(false);
  const [trainings, setTrainings] = useState<TrainingPlan[]>([]);
  const [loadingTrainings, setLoadingTrainings] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Vypočítat rozsah datumů
        const now = new Date();
        let start: Date;
        let end: Date;

        if (period === 'custom') {
          if (!customStartDate || !customEndDate) {
            setLoading(false);
            return;
          }
          start = customStartDate;
          end = customEndDate;
        } else {
          end = endOfMonth(now);
          
          switch (period) {
            case 'month':
              start = startOfMonth(now);
              break;
            case '3months':
              start = startOfMonth(subMonths(now, 2));
              break;
            case 'season': {
              const currentMonth = now.getMonth();
              if (currentMonth >= 8) {
                start = new Date(now.getFullYear(), 8, 1);
              } else {
                start = new Date(now.getFullYear() - 1, 8, 1);
              }
              break;
            }
            default:
              start = startOfMonth(now);
          }
        }
        
        const groupIdStr = typeof groupId === 'number' ? groupId.toString() : groupId;
        const groupStats = await getGroupAttendanceStats(groupIdStr, start, end);
        
        setStats(groupStats);
      } catch (err: any) {
        setError(`Nepodařilo se načíst statistiky: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [groupId, period, customStartDate, customEndDate]);

  const loadTrainings = async () => {
    try {
      setLoadingTrainings(true);
      const [historical, upcoming] = await Promise.all([
        getHistoricalPlans(undefined),
        getUpcomingPlans(undefined),
      ]);
      
      const groupIdStr = typeof groupId === 'number' ? groupId.toString() : groupId;
      const allTrainings = [...historical, ...upcoming]
        .filter(t => t.groupId === groupIdStr)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setTrainings(allTrainings);
    } catch (err: any) {
      setError(`Nepodařilo se načíst tréninky: ${err.message}`);
    } finally {
      setLoadingTrainings(false);
    }
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return theme.palette.success.main;
    if (rate >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getActiveColor = (rate: number) => {
    if (rate >= 80) return theme.palette.success.main;
    if (rate >= 60) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const handleExport = () => {
    if (!stats) return;

    const csv = [
      ['Jméno', 'Celkem tréninků', 'Přítomen', 'Pozdě', 'Odešel dříve', 'Omluven', 'Neomluven', 'Účast %', 'Aktivita %'].join(','),
      ...stats.memberStats.map(m => [
        m.memberName,
        m.totalTrainings,
        m.present,
        m.late,
        m.leftEarly,
        m.excused,
        m.unexcused,
        m.attendanceRate.toFixed(1),
        m.activeRate.toFixed(1),
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dochazka-${groupName}-${period}.csv`;
    link.click();
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'month': return 'Tento měsíc';
      case '3months': return 'Poslední 3 měsíce';
      case 'season': return 'Celá sezóna';
      case 'custom': 
        if (customStartDate && customEndDate) {
          return `${customStartDate.toLocaleDateString('cs-CZ')} - ${customEndDate.toLocaleDateString('cs-CZ')}`;
        }
        return 'Vlastní období';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" onClose={() => setError('')}>
        {error}
      </Alert>
    );
  }

  if (!stats) {
    return (
      <Alert severity="info">
        Nejsou k dispozici žádná data o docházce.
      </Alert>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={cs}>
      <Box>
        {/* Header s filtry */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6">
            Statistiky docházky - {groupName}
          </Typography>
          
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Období</InputLabel>
              <Select
                value={period}
                label="Období"
                onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
              >
                <MenuItem value="month">Tento měsíc</MenuItem>
                <MenuItem value="3months">Poslední 3 měsíce</MenuItem>
                <MenuItem value="season">Celá sezóna</MenuItem>
                <MenuItem value="custom">Vlastní období</MenuItem>
              </Select>
            </FormControl>
            
            {period === 'custom' && (
              <>
                <DatePicker
                  label="Od"
                  value={customStartDate}
                  onChange={(date) => setCustomStartDate(date)}
                  slotProps={{ textField: { size: 'small', sx: { minWidth: 140 } } }}
                />
                <DatePicker
                  label="Do"
                  value={customEndDate}
                  onChange={(date) => setCustomEndDate(date)}
                  slotProps={{ textField: { size: 'small', sx: { minWidth: 140 } } }}
                />
              </>
            )}
            
            <Button
              variant="outlined"
              startIcon={<CalendarIcon />}
              onClick={() => {
                loadTrainings();
                setOpenTrainingsDialog(true);
              }}
              size="small"
            >
              Tréninky
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={handleExport}
              size="small"
            >
              Export
            </Button>
            
            <Button
              variant="contained"
              startIcon={<AnalyticsIcon />}
              onClick={() => {
                const groupIdStr = typeof groupId === 'number' ? groupId.toString() : groupId;
                const params = new URLSearchParams();
                
                // Přidat datumové parametry
                if (period === 'custom' && customStartDate && customEndDate) {
                  params.set('startDate', customStartDate.toISOString());
                  params.set('endDate', customEndDate.toISOString());
                  params.set('period', getPeriodLabel());
                } else {
                  const now = new Date();
                  let start: Date;
                  const end: Date = endOfMonth(now);
                  
                  switch (period) {
                    case 'month':
                      start = startOfMonth(now);
                      break;
                    case '3months':
                      start = startOfMonth(subMonths(now, 2));
                      break;
                    case 'season': {
                      const currentMonth = now.getMonth();
                      start = currentMonth >= 8 
                        ? new Date(now.getFullYear(), 8, 1)
                        : new Date(now.getFullYear() - 1, 8, 1);
                      break;
                    }
                    default:
                      start = startOfMonth(now);
                  }
                  
                  params.set('startDate', start.toISOString());
                  params.set('endDate', end.toISOString());
                  params.set('period', getPeriodLabel());
                }
                
                navigate(`/attendance/stats/${groupIdStr}?${params.toString()}`);
              }}
              size="small"
            >
              Podrobné statistiky
            </Button>
          </Box>
        </Box>

        {/* Shrnutí skupiny */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {getPeriodLabel()}
            </Typography>
            <Box display="flex" gap={3} flexWrap="wrap" sx={{ mt: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                {stats.averageAttendance.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Průměrná účast
              </Typography>
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                {stats.memberStats.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Členů celkem
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabulka členů */}
      <TableContainer component={Paper}>
        <Table size={isMobile ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              <TableCell>Člen</TableCell>
              {!isMobile && <TableCell align="center">Celkem</TableCell>}
              <TableCell align="center">
                <Tooltip title="Přítomen">
                  <PresentIcon fontSize="small" color="success" />
                </Tooltip>
              </TableCell>
              {!isMobile && (
                <>
                  <TableCell align="center">
                    <Tooltip title="Pozdě">
                      <LateIcon fontSize="small" color="warning" />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Odešel dříve">
                      <LeftEarlyIcon fontSize="small" color="warning" />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Omluven">
                      <ExcusedIcon fontSize="small" color="info" />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Neomluven">
                      <AbsentIcon fontSize="small" color="error" />
                    </Tooltip>
                  </TableCell>
                </>
              )}
              <TableCell align="center">Účast</TableCell>
              <TableCell align="center">Aktivita</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stats.memberStats.map((member: MemberAttendanceStats) => (
              <TableRow key={member.memberId} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {member.memberName}
                  </Typography>
                </TableCell>
                
                {!isMobile && (
                  <TableCell align="center">
                    <Chip label={member.totalTrainings} size="small" />
                  </TableCell>
                )}
                
                <TableCell align="center">
                  <Chip 
                    label={member.present} 
                    size="small" 
                    color="success"
                    variant="outlined"
                  />
                </TableCell>
                
                {!isMobile && (
                  <>
                    <TableCell align="center">
                      {member.late > 0 ? (
                        <Chip label={member.late} size="small" color="warning" variant="outlined" />
                      ) : (
                        <Typography variant="body2" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                    
                    <TableCell align="center">
                      {member.leftEarly > 0 ? (
                        <Chip label={member.leftEarly} size="small" color="warning" variant="outlined" />
                      ) : (
                        <Typography variant="body2" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                    
                    <TableCell align="center">
                      {member.excused > 0 ? (
                        <Chip label={member.excused} size="small" color="info" variant="outlined" />
                      ) : (
                        <Typography variant="body2" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                    
                    <TableCell align="center">
                      {member.unexcused > 0 ? (
                        <Chip label={member.unexcused} size="small" color="error" variant="outlined" />
                      ) : (
                        <Typography variant="body2" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                  </>
                )}
                
                <TableCell align="center">
                  <Chip 
                    label={`${member.attendanceRate.toFixed(0)}%`}
                    size="small"
                    sx={{ 
                      backgroundColor: getAttendanceColor(member.attendanceRate),
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                </TableCell>
                
                <TableCell align="center">
                  <Chip 
                    label={`${member.activeRate.toFixed(0)}%`}
                    size="small"
                    sx={{ 
                      backgroundColor: getActiveColor(member.activeRate),
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Legenda */}
      <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" display="block" gutterBottom fontWeight="bold">
          Legenda:
        </Typography>
        <Box display="flex" gap={3} flexWrap="wrap">
          <Typography variant="caption">
            <strong>Účast:</strong> Podíl přítomných ze všech tréninků
          </Typography>
          <Typography variant="caption">
            <strong>Aktivita:</strong> Podíl aktivních účastí (přítomen + pozdě + odešel dříve)
          </Typography>
        </Box>
        <Box display="flex" gap={2} flexWrap="wrap" sx={{ mt: 1 }}>
          <Chip label="90%+ výborná" size="small" sx={{ backgroundColor: theme.palette.success.main, color: 'white' }} />
          <Chip label="70-90% dobrá" size="small" sx={{ backgroundColor: theme.palette.warning.main, color: 'white' }} />
          <Chip label="<70% slabá" size="small" sx={{ backgroundColor: theme.palette.error.main, color: 'white' }} />
        </Box>
      </Box>

      {/* Dialog s tréninky */}
      <Dialog
        open={openTrainingsDialog}
        onClose={() => setOpenTrainingsDialog(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          Docházka na trénincích - {groupName}
        </DialogTitle>
        <DialogContent>
          {loadingTrainings ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : trainings.length === 0 ? (
            <Alert severity="info">
              Žádné tréninky k dispozici
            </Alert>
          ) : (
            <List sx={{ p: 0 }}>
              {trainings.map((training, idx) => {
                const summary = stats?.memberStats.length || 0;
                
                return (
                  <React.Fragment key={training.id}>
                    <ListItem
                      sx={{
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        py: 2,
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="start" sx={{ mb: 1 }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {training.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {training.date.toLocaleDateString('cs-CZ', { 
                              weekday: 'long', 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </Typography>
                        </Box>
                        <Chip 
                          label={training.status} 
                          size="small"
                          color={training.status === 'dokončen' ? 'success' : training.status === 'vynechán' ? 'error' : 'default'}
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {training.description}
                      </Typography>
                      
                      {training.executionNote && (
                        <Paper sx={{ p: 1.5, bgcolor: 'action.hover', mb: 1 }}>
                          <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 0.5 }}>
                            Poznámka trenéra:
                          </Typography>
                          <Typography variant="body2">
                            {training.executionNote}
                          </Typography>
                        </Paper>
                      )}
                      
                      <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                        <Chip 
                          icon={<PresentIcon />}
                          label={`Přítomno: ${summary}`} 
                          size="small" 
                          color="success"
                          variant="outlined"
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                          Klikni na "Docházka" v plánech tréninků pro úpravu
                        </Typography>
                      </Box>
                    </ListItem>
                    {idx < trainings.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTrainingsDialog(false)}>
            Zavřít
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </LocalizationProvider>
  );
};

export default AttendanceStats;

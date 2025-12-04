import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  useMediaQuery,
  useTheme,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as PresentIcon,
  Cancel as AbsentIcon,
  Schedule as LateIcon,
  ExitToApp as LeftEarlyIcon,
  EventBusy as ExcusedIcon,
  HelpOutline as UnknownIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import type { TrainingPlan } from '../types/trainingPlan';
import type { GroupMember } from '../types/trainingGroup';
import { AttendanceStatus } from '../types/attendance';
import { recordBulkAttendance, getTrainingAttendance } from '../utils/attendanceService';

interface AttendanceQuickRecordProps {
  open: boolean;
  onClose: () => void;
  training: TrainingPlan;
  members: GroupMember[];
  currentUserId: string;
  onSaved?: () => void;
}

interface MemberAttendance {
  memberId: number;
  memberName: string;
  status: AttendanceStatus;
  note: string;
}

const AttendanceQuickRecord: React.FC<AttendanceQuickRecordProps> = ({
  open,
  onClose,
  training,
  members,
  currentUserId,
  onSaved,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [attendances, setAttendances] = useState<Map<number, MemberAttendance>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedMember, setSelectedMember] = useState<number | null>(null);

  const loadExistingAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const records = await getTrainingAttendance(training.id);
      
      const attendanceMap = new Map<number, MemberAttendance>();
      
      // Inicializovat všechny členy s UNKNOWN
      members.forEach(member => {
        // Konvertovat ID na number (pokud je string)
        const memberId = typeof member.id === 'string' ? parseInt(member.id, 10) : member.id;
        if (isNaN(memberId)) return; // Skip invalid IDs
        
        attendanceMap.set(memberId, {
          memberId: memberId,
          memberName: member.name,
          status: AttendanceStatus.UNKNOWN,
          note: '',
        });
      });
      
      // Přepsat existující záznamy
      records.forEach(record => {
        attendanceMap.set(record.memberId, {
          memberId: record.memberId,
          memberName: record.memberName,
          status: record.status,
          note: record.note || '',
        });
      });
      
      setAttendances(attendanceMap);
    } catch (err: any) {
      setError(`Nepodařilo se načíst docházku: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [training.id, members]);

  useEffect(() => {
    if (open) {
      loadExistingAttendance();
    }
  }, [open, loadExistingAttendance]);

  const handleStatusChange = (memberId: number, status: AttendanceStatus) => {
    const current = attendances.get(memberId);
    if (current) {
      setAttendances(new Map(attendances.set(memberId, { ...current, status })));
    }
  };

  const handleNoteChange = (memberId: number, note: string) => {
    const current = attendances.get(memberId);
    if (current) {
      setAttendances(new Map(attendances.set(memberId, { ...current, note })));
    }
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const newAttendances = new Map(attendances);
    Array.from(newAttendances.values()).forEach(att => {
      att.status = status;
    });
    setAttendances(new Map(newAttendances));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      const attendanceArray = Array.from(attendances.values());
      
      await recordBulkAttendance(
        {
          trainingPlanId: training.id,
          groupId: training.groupId,
          attendances: attendanceArray,
        },
        currentUserId
      );
      
      onSaved?.();
      onClose();
    } catch (err: any) {
      setError(`Nepodařilo se uložit docházku: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT: return <PresentIcon color="success" />;
      case AttendanceStatus.LATE: return <LateIcon color="warning" />;
      case AttendanceStatus.LEFT_EARLY: return <LeftEarlyIcon color="warning" />;
      case AttendanceStatus.EXCUSED: return <ExcusedIcon color="info" />;
      case AttendanceStatus.UNEXCUSED: return <AbsentIcon color="error" />;
      default: return <UnknownIcon color="disabled" />;
    }
  };

  const presentCount = Array.from(attendances.values()).filter(a => a.status === AttendanceStatus.PRESENT).length;
  const totalCount = members.length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box>
          <Typography variant="h6">Docházka - {training.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {training.date.toLocaleDateString('cs-CZ')} • {training.groupName}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Chip 
              label={`${presentCount}/${totalCount} přítomno`} 
              color="primary" 
              size="small" 
            />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Hromadné akce */}
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            startIcon={<PresentIcon />}
            onClick={() => handleMarkAll(AttendanceStatus.PRESENT)}
          >
            Všichni přítomni
          </Button>
          <Button
            size="small"
            startIcon={<ExcusedIcon />}
            onClick={() => handleMarkAll(AttendanceStatus.EXCUSED)}
          >
            Všichni omluveni
          </Button>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {members.map(member => {
              const memberId = typeof member.id === 'string' ? parseInt(member.id, 10) : member.id;
              if (isNaN(memberId)) return null;
              
              const attendance = attendances.get(memberId);
              if (!attendance) return null;

              return (
                <ListItem
                  key={member.id}
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    borderBottom: 1,
                    borderColor: 'divider',
                    py: 1.5,
                    px: { xs: 1, sm: 2 },
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(attendance.status)}
                      <Typography 
                        variant="body1" 
                        fontWeight={attendance.status === AttendanceStatus.PRESENT ? 'bold' : 'normal'}
                        sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}
                      >
                        {member.name}
                      </Typography>
                    </Box>
                    {selectedMember !== memberId && attendance.note && (
                      <Chip 
                        label="Poznámka" 
                        size="small" 
                        variant="outlined"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>

                  {/* Mobilní verze - 2 řádky tlačítek */}
                  <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 1 }}>
                    <Box display="flex" gap={1}>
                      <Button
                        fullWidth
                        variant={attendance.status === AttendanceStatus.PRESENT ? 'contained' : 'outlined'}
                        color="success"
                        onClick={() => handleStatusChange(memberId, AttendanceStatus.PRESENT)}
                        sx={{ py: 1.5 }}
                      >
                        <PresentIcon sx={{ mr: 0.5 }} /> Přítomen
                      </Button>
                      <Button
                        fullWidth
                        variant={attendance.status === AttendanceStatus.EXCUSED ? 'contained' : 'outlined'}
                        color="info"
                        onClick={() => handleStatusChange(memberId, AttendanceStatus.EXCUSED)}
                        sx={{ py: 1.5 }}
                      >
                        <ExcusedIcon sx={{ mr: 0.5 }} /> Omluven
                      </Button>
                    </Box>
                    <Box display="flex" gap={1}>
                      <Button
                        fullWidth
                        variant={attendance.status === AttendanceStatus.LATE ? 'contained' : 'outlined'}
                        color="warning"
                        onClick={() => handleStatusChange(memberId, AttendanceStatus.LATE)}
                        size="small"
                      >
                        <LateIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> Pozdě
                      </Button>
                      <Button
                        fullWidth
                        variant={attendance.status === AttendanceStatus.LEFT_EARLY ? 'contained' : 'outlined'}
                        color="warning"
                        onClick={() => handleStatusChange(memberId, AttendanceStatus.LEFT_EARLY)}
                        size="small"
                      >
                        <LeftEarlyIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> Odešel
                      </Button>
                      <Button
                        fullWidth
                        variant={attendance.status === AttendanceStatus.UNEXCUSED ? 'contained' : 'outlined'}
                        color="error"
                        onClick={() => handleStatusChange(memberId, AttendanceStatus.UNEXCUSED)}
                        size="small"
                      >
                        <AbsentIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> Chybí
                      </Button>
                    </Box>
                  </Box>

                  {/* Desktop verze - ToggleButtonGroup */}
                  <ToggleButtonGroup
                    value={attendance.status}
                    exclusive
                    onChange={(_, val) => val && handleStatusChange(memberId, val)}
                    size="small"
                    fullWidth
                    sx={{ 
                      display: { xs: 'none', sm: 'flex' },
                      mb: selectedMember === memberId ? 1 : 0 
                    }}
                  >
                    <ToggleButton value={AttendanceStatus.PRESENT} sx={{ fontSize: '0.75rem' }}>
                      ✓ Přítomen
                    </ToggleButton>
                    <ToggleButton value={AttendanceStatus.LATE} sx={{ fontSize: '0.75rem' }}>
                      ⏰ Pozdě
                    </ToggleButton>
                    <ToggleButton value={AttendanceStatus.LEFT_EARLY} sx={{ fontSize: '0.75rem' }}>
                      → Dříve
                    </ToggleButton>
                    <ToggleButton value={AttendanceStatus.EXCUSED} sx={{ fontSize: '0.75rem' }}>
                      ☑ Omluven
                    </ToggleButton>
                    <ToggleButton value={AttendanceStatus.UNEXCUSED} sx={{ fontSize: '0.75rem' }}>
                      ✗ Neomluven
                    </ToggleButton>
                  </ToggleButtonGroup>

                  {/* Poznámka - mobil s tlačítkem, desktop bez */}
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {attendance.note || selectedMember === memberId ? (
                      <TextField
                        size="small"
                        label="Poznámka"
                        multiline
                        rows={2}
                        value={attendance.note}
                        onChange={(e) => handleNoteChange(memberId, e.target.value)}
                        placeholder="Důvod absence, poznámka..."
                        fullWidth
                        sx={{ display: { xs: 'none', sm: 'block' } }}
                      />
                    ) : null}
                    
                    {/* Mobilní tlačítko pro poznámku */}
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      onClick={() => setSelectedMember(selectedMember === memberId ? null : memberId)}
                      sx={{ display: { xs: 'flex', sm: 'none' }, mt: 0.5 }}
                    >
                      <NotesIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                      {attendance.note ? 'Upravit poznámku' : 'Přidat poznámku'}
                    </Button>
                  </Box>
                  
                  {/* Mobilní textové pole pro poznámku */}
                  {selectedMember === memberId && (
                    <TextField
                      size="small"
                      label="Poznámka"
                      multiline
                      rows={3}
                      value={attendance.note}
                      onChange={(e) => handleNoteChange(memberId, e.target.value)}
                      placeholder="Důvod absence, poznámka..."
                      fullWidth
                      sx={{ display: { xs: 'block', sm: 'none' }, mt: 1 }}
                      autoFocus
                    />
                  )}
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
        <Button onClick={onClose} disabled={saving} size={isMobile ? 'large' : 'medium'}>
          Zrušit
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || loading}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
          size={isMobile ? 'large' : 'medium'}
          sx={{ minWidth: { xs: 140, sm: 120 } }}
        >
          {saving ? 'Ukládám...' : 'Uložit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AttendanceQuickRecord;

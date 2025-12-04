import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Chip,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import type { TrainingPlan, MemberTrainingNote } from '../types/trainingPlan';
import { getMemberNotesForTraining } from '../utils/memberTrainingService';

interface MemberNotesViewDialogProps {
  open: boolean;
  onClose: () => void;
  training: TrainingPlan | null;
}

const MemberNotesViewDialog: React.FC<MemberNotesViewDialogProps> = ({
  open,
  onClose,
  training,
}) => {
  const [notes, setNotes] = useState<MemberTrainingNote[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && training) {
      loadNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, training]);

  const loadNotes = async () => {
    if (!training) return;

    try {
      setLoading(true);
      const memberNotes = await getMemberNotesForTraining(training.id);
      setNotes(memberNotes);
    } catch (error) {
      console.error('Chyba při načítání poznámek:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!training) return null;

  const trainingDate = training.date instanceof Date ? training.date : new Date(training.date);
  const formattedDate = format(trainingDate, 'd. MMMM yyyy', { locale: cs });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Poznámky svěřenců</DialogTitle>
      <DialogContent>
        <Box mb={2}>
          <Typography variant="subtitle2" color="text.secondary">
            Trénink
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {training.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formattedDate} · {training.groupName}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : notes.length === 0 ? (
          <Box py={4} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Zatím nejsou žádné poznámky od svěřenců
            </Typography>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={2}>
            {notes.map((note, index) => {
              const noteDate = note.createdAt instanceof Date 
                ? note.createdAt 
                : new Date((note.createdAt as any).seconds * 1000);
              const formattedNoteDate = format(noteDate, 'd. M. yyyy HH:mm', { locale: cs });

              return (
                <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <PersonIcon fontSize="small" color="action" />
                      <Typography variant="subtitle2" fontWeight="medium">
                        {note.memberName}
                      </Typography>
                    </Box>
                    {note.completed && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Dokončeno"
                        size="small"
                        color="success"
                      />
                    )}
                  </Box>

                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                    {note.note}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    Přidáno: {formattedNoteDate}
                  </Typography>
                </Paper>
              );
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Zavřít</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MemberNotesViewDialog;

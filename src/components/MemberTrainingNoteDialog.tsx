import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Typography,
  Box,
} from '@mui/material';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import type { TrainingPlan } from '../types/trainingPlan';
import { addMemberNoteToTraining, canMemberAddNote } from '../utils/memberTrainingService';
import { useAuth } from '../hooks/useAuth';
import { getMemberByUserId, getMemberFullName } from '../utils/memberService';

interface MemberTrainingNoteDialogProps {
  open: boolean;
  onClose: () => void;
  training: TrainingPlan | null;
  onSuccess: () => void;
}

const MemberTrainingNoteDialog: React.FC<MemberTrainingNoteDialogProps> = ({
  open,
  onClose,
  training,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const [note, setNote] = useState('');
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [canAdd, setCanAdd] = useState(false);
  const [canAddReason, setCanAddReason] = useState('');
  const [memberId, setMemberId] = useState<number | null>(null);
  const [memberName, setMemberName] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (open && training && currentUser) {
      checkPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, training, currentUser]);

  const checkPermissions = async () => {
    if (!currentUser || !training) return;

    try {
      setChecking(true);
      setError('');

      // Získání členského ID
      const memberIdFromDb = await getMemberByUserId(currentUser.uid);
      if (!memberIdFromDb) {
        setCanAdd(false);
        setCanAddReason('Váš účet není spojen s členským záznamem');
        setChecking(false);
        return;
      }

      setMemberId(memberIdFromDb);

      // Načtení celého jména člena
      const fullName = await getMemberFullName(memberIdFromDb);
      if (fullName) {
        setMemberName(fullName);
      } else {
        setMemberName(currentUser.displayName || currentUser.email || 'Člen');
      }

      // Kontrola oprávnění a načtení existující poznámky
      const result = await canMemberAddNote(training.id, memberIdFromDb);
      setCanAdd(result.canAdd);
      if (!result.canAdd) {
        setCanAddReason(result.reason || 'Nelze přidat poznámku');
      } else if (result.existingNote) {
        // Načtení existující poznámky pro editaci
        setNote(result.existingNote.note);
        setCompleted(result.existingNote.completed);
        setIsEditing(true);
      }
    } catch (err: any) {
      console.error('Chyba při kontrole oprávnění:', err);
      setError('Nepodařilo se zkontrolovat oprávnění');
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!training || !currentUser || !memberId) return;

    if (!note.trim()) {
      setError('Vyplňte poznámku k tréninku');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await addMemberNoteToTraining(
        training.id,
        memberId,
        memberName || currentUser.displayName || currentUser.email || 'Člen',
        note.trim(),
        completed,
        currentUser.uid
      );

      setSuccess((isEditing ? 'Poznámka byla úspěšně upravena' : 'Poznámka byla úspěšně přidána') + (completed ? ' a trénink označen jako dokončený' : ''));
      
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error('Chyba při ukládání poznámky:', err);
      setError(err.message || 'Nepodařilo se uložit poznámku');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNote('');
    setCompleted(false);
    setError('');
    setSuccess('');
    setIsEditing(false);
    onClose();
  };

  if (!training) return null;

  const trainingDate = training.date instanceof Date ? training.date : new Date(training.date);
  const formattedDate = format(trainingDate, 'd. MMMM yyyy', { locale: cs });

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Upravit poznámku k tréninku' : 'Přidat poznámku k tréninku'}</DialogTitle>
      <DialogContent>
        {checking ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : !canAdd ? (
          <Alert severity="warning">
            {canAddReason}
          </Alert>
        ) : (
          <>
            <Box mb={2}>
              <Typography variant="subtitle2" color="text.secondary">
                Trénink
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {training.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formattedDate}
              </Typography>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Poznámka k tréninku *"
              placeholder="Popište jak trénink proběhl, co jste trénovali, jak se cítíte..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              margin="normal"
              disabled={loading}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={completed}
                  onChange={(e) => setCompleted(e.target.checked)}
                  disabled={loading}
                />
              }
              label="Označit trénink jako dokončený"
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {success}
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Zrušit
        </Button>
        {canAdd && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !note.trim() || !!success}
          >
            {loading ? 'Ukládání...' : (isEditing ? 'Uložit změny' : 'Přidat poznámku')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default MemberTrainingNoteDialog;

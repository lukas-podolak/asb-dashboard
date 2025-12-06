import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Key as KeyIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { UserRole } from '../types/user';
import { getMembersWithMetadata, linkUserToMember, isMemberLinked } from '../utils/memberService';
import { useAuth } from '../hooks/useAuth';

interface MemberAccount {
  memberId: number;
  firstName: string;
  lastName: string;
  email: string;
  hasAccount: boolean;
  uid?: string;
}

const MemberAccountManager: React.FC = () => {
  const { currentUser } = useAuth();
  const [members, setMembers] = useState<MemberAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberAccount | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const membersData = await getMembersWithMetadata();
      
      // Zkontrolujeme, kteří členové mají již účty
      const membersWithAccounts = await Promise.all(
        membersData.map(async (member) => ({
          memberId: member.Id,
          firstName: member.Jmeno,
          lastName: member.Prijmeni,
          email: member.metadata?.email || member.Email || '',
          hasAccount: await isMemberLinked(member.Id),
          uid: member.metadata?.email, // Using email as proxy for uid check
        }))
      );
      
      setMembers(membersWithAccounts);
    } catch (err) {
      console.error('Chyba při načítání členů:', err);
      setError('Nepodařilo se načíst seznam členů');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (member: MemberAccount) => {
    setSelectedMember(member);
    setEmail(member.email || `${member.firstName.toLowerCase()}.${member.lastName.toLowerCase()}@asb-dacice.cz`);
    setPassword(generatePassword());
    setError('');
    setSuccess('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedMember(null);
    setEmail('');
    setPassword('');
    setError('');
    setSuccess('');
  };

  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleCreateAccount = async () => {
    if (!selectedMember || !currentUser) return;
    
    setCreating(true);
    setError('');
    setSuccess('');

    // Uložit email aktuálně přihlášeného admina
    const adminEmail = currentUser.email;
    
    // Nechat uživatele zadat jeho heslo pro znovu přihlášení
    const adminPassword = window.prompt(
      'Pro vytvoření nového účtu zadejte vaše heslo (budete znovu přihlášen):',
      ''
    );
    
    if (!adminPassword) {
      setError('Musíte zadat vaše heslo pro pokračování');
      setCreating(false);
      return;
    }

    try {
      // Vytvoření uživatele přes Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Vytvoření profilu v Firestore s rolí ASB_CLEN
      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        displayName: `${selectedMember.firstName} ${selectedMember.lastName}`,
        roles: [UserRole.ASB_CLEN],
        createdAt: new Date(),
        createdBy: currentUser.uid,
        updatedAt: new Date(),
        updatedBy: currentUser.uid,
      });

      // Propojení s členem v Firestore
      await linkUserToMember(uid, selectedMember.memberId, currentUser.uid);

      // DŮLEŽITÉ: Znovu přihlásit původního admina
      if (adminEmail) {
        try {
          await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        } catch (reloginError) {
          console.error('Chyba při opětovném přihlášení:', reloginError);
          setError('Účet byl vytvořen, ale nepodařilo se vás znovu přihlásit. Přihlaste se prosím ručně.');
          setCreating(false);
          return;
        }
      }

      setSuccess(`Účet byl úspěšně vytvořen!\n\nEmail: ${email}\nDočasné heslo: ${password}\n\nPošlete tyto údaje členovi. Při prvním přihlášení by měl heslo změnit.`);
      
      // Aktualizace seznamu
      await loadMembers();
      
      // Zavření dialogu po 8 sekundách
      setTimeout(() => {
        handleCloseDialog();
      }, 8000);
    } catch (err: any) {
      console.error('Chyba při vytváření účtu:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email je již používán jiným účtem');
      } else if (err.code === 'auth/invalid-email') {
        setError('Neplatný formát emailu');
      } else if (err.code === 'auth/weak-password') {
        setError('Heslo je příliš slabé');
      } else if (err.code === 'auth/wrong-password') {
        setError('Nesprávné heslo admina - účet byl vytvořen, ale nemůžete se přihlásit zpět');
      } else {
        setError(`Chyba: ${err.message}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (member: MemberAccount) => {
    if (!member.email) {
      setError('Člen nemá nastaven email');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, member.email);
      setSuccess(`Email pro resetování hesla byl odeslán na ${member.email}`);
    } catch (err: any) {
      console.error('Chyba při resetování hesla:', err);
      setError(`Nepodařilo se odeslat email pro reset hesla: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const membersWithoutAccounts = members.filter(m => !m.hasAccount);
  const membersWithAccounts = members.filter(m => m.hasAccount);

  // Filtrování členů bez účtu podle vyhledávacího řetězce
  const filteredMembersWithoutAccounts = membersWithoutAccounts.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.firstName.toLowerCase().includes(searchLower) ||
      member.lastName.toLowerCase().includes(searchLower) ||
      (member.email && member.email.toLowerCase().includes(searchLower))
    );
  }).slice(0, 10); // Zobraz maximálně 10 členů

  const hasMoreMembers = membersWithoutAccounts.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.firstName.toLowerCase().includes(searchLower) ||
      member.lastName.toLowerCase().includes(searchLower) ||
      (member.email && member.email.toLowerCase().includes(searchLower))
    );
  }).length > 10;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Správa členských účtů
      </Typography>
      
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Členové bez účtu */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Členové bez uživatelského účtu ({membersWithoutAccounts.length})
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Vytvořte účty pro členy, aby mohli vidět své tréninkové plány
        </Typography>

        {/* Vyhledávací pole */}
        <TextField
          fullWidth
          size="small"
          placeholder="Vyhledat podle jména, příjmení nebo emailu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        
        {membersWithoutAccounts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Všichni členové mají vytvořené účty
          </Typography>
        ) : filteredMembersWithoutAccounts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Žádný člen nevyhovuje vyhledávání
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Jméno</TableCell>
                  <TableCell>Příjmení</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Akce</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMembersWithoutAccounts.map((member) => (
                  <TableRow key={member.memberId}>
                    <TableCell>{member.firstName}</TableCell>
                    <TableCell>{member.lastName}</TableCell>
                    <TableCell>
                      {member.email || (
                        <Typography variant="body2" color="text.secondary" fontSize="0.875rem">
                          Není nastaven
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog(member)}
                      >
                        Vytvořit účet
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Upozornění na více výsledků */}
        {hasMoreMembers && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Zobrazeno prvních 10 členů. Pro zobrazení konkrétního člena použijte vyhledávání.
          </Alert>
        )}
      </Paper>

      {/* Členové s účtem */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Členové s uživatelským účtem ({membersWithAccounts.length})
        </Typography>
        
        {membersWithAccounts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Zatím nejsou vytvořeny žádné členské účty
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Jméno</TableCell>
                  <TableCell>Příjmení</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Stav</TableCell>
                  <TableCell align="right">Akce</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {membersWithAccounts.map((member) => (
                  <TableRow key={member.memberId}>
                    <TableCell>{member.firstName}</TableCell>
                    <TableCell>{member.lastName}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Chip 
                        icon={<CheckCircleIcon />} 
                        label="Aktivní" 
                        color="success" 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Resetovat heslo">
                        <IconButton
                          size="small"
                          onClick={() => handleResetPassword(member)}
                          disabled={!member.email}
                        >
                          <KeyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Dialog pro vytvoření účtu */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Vytvořit účet pro člena
        </DialogTitle>
        <DialogContent>
          {selectedMember && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Vytváříte účet pro: <strong>{selectedMember.firstName} {selectedMember.lastName}</strong>
              </Typography>
              
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                helperText="Email bude použit pro přihlášení"
              />
              
              <TextField
                label="Dočasné heslo"
                type="text"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                helperText="Člen by měl heslo změnit při prvním přihlášení"
                InputProps={{
                  endAdornment: (
                    <Button size="small" onClick={() => setPassword(generatePassword())}>
                      Generovat nové
                    </Button>
                  ),
                }}
              />

              {success && (
                <Alert severity="success" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
                  {success}
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={creating}>
            Zrušit
          </Button>
          <Button 
            onClick={handleCreateAccount} 
            variant="contained" 
            disabled={creating || !email || !password || !!success}
            startIcon={creating && <CircularProgress size={20} />}
          >
            {creating ? 'Vytváření...' : 'Vytvořit účet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MemberAccountManager;

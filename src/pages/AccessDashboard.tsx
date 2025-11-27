import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
} from '@mui/material';
import {
  Nfc,
  LocationOn,
  People,
  PersonOff,
  Warning,
  Assessment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import type { AccessStats } from '../types/access';
import { getAccessStats } from '../utils/accessService';

const AccessDashboard: React.FC = () => {
  const [stats, setStats] = useState<AccessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAccessStats();
      setStats(data);
    } catch (err: any) {
      setError(`Nepodařilo se načíst statistiky: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
    actionText?: string;
    actionPath?: string;
  }> = ({ title, value, icon, color, actionText, actionPath }) => (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <Box
            sx={{
              bgcolor: color + '20',
              color: color,
              p: 1,
              borderRadius: 2,
              display: 'flex',
              mr: 2,
            }}
          >
            {icon}
          </Box>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Box>
        <Typography variant="h3" color={color} fontWeight="bold">
          {value}
        </Typography>
      </CardContent>
      {actionText && actionPath && (
        <CardActions>
          <Button size="small" onClick={() => navigate(actionPath)}>
            {actionText}
          </Button>
        </CardActions>
      )}
    </Card>
  );

  if (loading) {
    return (
      <Layout>
        <Paper sx={{ p: 3 }}>
          <Typography>Načítání statistik...</Typography>
        </Paper>
      </Layout>
    );
  }

  if (error || !stats) {
    return (
      <Layout>
        <Paper sx={{ p: 3 }}>
          <Typography color="error">{error || 'Nepodařilo se načíst statistiky'}</Typography>
        </Paper>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Přehled přístupového systému
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Centrální dashboard pro správu NFC/RFID čipů a přístupových zón
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: 3,
        }}
      >
        {/* Čipy celkem */}
        <StatCard
          title="Celkem čipů"
          value={stats.totalChips}
          icon={<Nfc sx={{ fontSize: 32 }} />}
          color="#2196F3"
          actionText="Spravovat čipy"
          actionPath="/access/chips"
        />

        {/* Aktivní čipy */}
        <StatCard
          title="Aktivní čipy"
          value={stats.activeChips}
          icon={<Nfc sx={{ fontSize: 32 }} />}
          color="#4CAF50"
        />

        {/* Expirující čipy */}
        <StatCard
          title="Expirují do 30 dnů"
          value={stats.expiringChips}
          icon={<Warning sx={{ fontSize: 32 }} />}
          color="#FF9800"
        />

        {/* Přístupové zóny */}
        <StatCard
          title="Přístupové zóny"
          value={stats.totalZones}
          icon={<LocationOn sx={{ fontSize: 32 }} />}
          color="#9C27B0"
          actionText="Spravovat zóny"
          actionPath="/access/zones"
        />

        {/* Čipy členů */}
        <StatCard
          title="Čipy členů"
          value={stats.memberChips}
          icon={<People sx={{ fontSize: 32 }} />}
          color="#00BCD4"
          actionText="Zobrazit členy"
          actionPath="/members"
        />

        {/* Externí čipy */}
        <StatCard
          title="Externí čipy"
          value={stats.externalChips}
          icon={<PersonOff sx={{ fontSize: 32 }} />}
          color="#FF5722"
          actionText="Externí osoby"
          actionPath="/access/external-persons"
        />
      </Box>

      {/* Rychlé akce */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Rychlé akce
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<Nfc />}
            onClick={() => navigate('/access/chips')}
          >
            Přidat nový čip
          </Button>
          <Button
            variant="outlined"
            startIcon={<LocationOn />}
            onClick={() => navigate('/access/zones')}
          >
            Přidat zónu
          </Button>
          <Button
            variant="outlined"
            startIcon={<PersonOff />}
            onClick={() => navigate('/access/external-persons')}
          >
            Přidat externí osobu
          </Button>
          <Button
            variant="outlined"
            startIcon={<Assessment />}
            disabled
          >
            Statistiky (brzy)
          </Button>
        </Box>
      </Paper>

      {/* Informace o systému */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: '#f5f5f5' }}>
        <Typography variant="h6" gutterBottom>
          O přístupovém systému
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Čipy:</strong> Systém podporuje NFC a RFID čipy pro fyzický přístup do objektu.
          Každý čip je přiřazen konkrétní osobě (členovi nebo externí osobě) a má definované
          přístupové práva do jednotlivých zón.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Zóny:</strong> Přístupové zóny definují různé části objektu (např. posilovna,
          šatna, sklad). Každá zóna má svou barvu pro snadné vizuální rozlišení.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>NFC čtečka:</strong> Pro přidání nového čipu můžete použít NFC čtečku v telefonu
          (podporováno v Chrome na Androidu). Systém automaticky načte ID čipu.
        </Typography>
        <Typography variant="body2">
          <strong>Bezpečnost:</strong> Všechny změny v systému jsou logovány a obsahují informaci
          o uživateli, který změnu provedl.
        </Typography>
      </Paper>
    </Layout>
  );
};

export default AccessDashboard;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
} from '@mui/material';
import {
  People,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';

const Dashboard: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <Layout>
      <Grid container spacing={3}>
          {/* Uvítací karta */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h4" gutterBottom>
                Vítejte v ASB Dashboard!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Úspěšně jste se přihlásili jako <strong>{currentUser?.email}</strong>
              </Typography>
            </Paper>
          </Grid>

          {/* Dashboard karty */}
          {isAdmin && (
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 200,
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 6 },
                }}
                onClick={() => navigate('/user-management')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <People color="primary" sx={{ fontSize: 40, mr: 2 }} />
                  <Typography variant="h6">Správa uživatelů</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Spravujte uživatelské účty a přiřazujte role
                </Typography>
                <Button 
                  variant="outlined" 
                  sx={{ mt: 'auto' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/user-management');
                  }}
                >
                  Otevřít
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
    </Layout>
  );
};

export default Dashboard;

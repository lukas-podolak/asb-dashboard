import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Grid,
} from '@mui/material';
import {
  AccountCircle,
  Dashboard as DashboardIcon,
  Assessment,
  Settings,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const Dashboard: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Chyba při odhlašování:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar position="static">
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ASB Dashboard
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {currentUser?.email}
          </Typography>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleClose}>Profil</MenuItem>
            <MenuItem onClick={handleClose}>Nastavení</MenuItem>
            <MenuItem onClick={handleLogout}>Odhlásit se</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Hlavní obsah */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
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
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DashboardIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                <Typography variant="h6">Přehled</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Zobrazte si přehled všech vašich dat a statistik
              </Typography>
            </Paper>
          </Grid>

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
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Assessment color="primary" sx={{ fontSize: 40, mr: 2 }} />
                <Typography variant="h6">Analýzy</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Prozkoumejte podrobné analýzy a reporty
              </Typography>
            </Paper>
          </Grid>

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
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Settings color="primary" sx={{ fontSize: 40, mr: 2 }} />
                <Typography variant="h6">Nastavení</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Upravte nastavení aplikace podle vašich potřeb
              </Typography>
            </Paper>
          </Grid>

          {/* Informační sekce */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Začínáme
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Toto je základní dashboard aplikace. Nyní můžete začít přidávat vlastní funkce:
              </Typography>
              <ul>
                <li>Přidat více stránek pomocí React Router</li>
                <li>Integrovat Firestore pro ukládání dat</li>
                <li>Vytvořit vlastní komponenty a layouts</li>
                <li>Přidat více metod autentizace (Google, GitHub, atd.)</li>
              </ul>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? theme.palette.grey[200]
              : theme.palette.grey[800],
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © 2025 ASB Dashboard. Všechna práva vyhrazena.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Dashboard;

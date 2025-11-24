import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  AccountCircle,
  Dashboard as DashboardIcon,
  People,
  Menu as MenuIcon,
  Logout,
  Brightness4,
  Brightness7,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { ColorModeContext } from '../contexts/ColorModeContext';
import { useTheme } from '@mui/material/styles';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const colorMode = React.useContext(ColorModeContext);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Chyba při odhlašování:', error);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        ASB Dashboard
      </Typography>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavigate('/dashboard')}>
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>
        {isAdmin && (
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigate('/user-management')}>
              <ListItemIcon>
                <People />
              </ListItemIcon>
              <ListItemText primary="Správa uživatelů" />
            </ListItemButton>
          </ListItem>
        )}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Odhlásit se" />
          </ListItemButton>
        </ListItem>
      </List>
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
          {userProfile?.displayName || currentUser?.email}
        </Typography>
        {userProfile?.displayName && (
          <Typography variant="caption" color="text.secondary">
            {currentUser?.email}
          </Typography>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: '100vw' }}>
      {/* AppBar */}
      <AppBar position="static">
        <Toolbar>
          {/* Mobilní hamburger menu */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <DashboardIcon sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ASB Dashboard
          </Typography>

          {/* Desktop navigační tlačítka */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}>
            <Button 
              color="inherit" 
              onClick={() => navigate('/dashboard')}
              startIcon={<DashboardIcon />}
            >
              Dashboard
            </Button>

            {isAdmin && (
              <Button 
                color="inherit" 
                onClick={() => navigate('/user-management')}
                startIcon={<People />}
                sx={{ display: { xs: 'none', md: 'flex' } }}
              >
                Správa uživatelů
              </Button>
            )}

            {isAdmin && (
              <IconButton
                color="inherit"
                onClick={() => navigate('/user-management')}
                sx={{ display: { xs: 'flex', md: 'none' } }}
                title="Správa uživatelů"
              >
                <People />
              </IconButton>
            )}

            <Typography variant="body2" sx={{ mx: 2, display: { xs: 'none', md: 'block' } }}>
              {userProfile?.displayName || currentUser?.email}
            </Typography>
            
            <IconButton onClick={colorMode.toggleColorMode} color="inherit">
              {theme.palette.mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
            
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
          </Box>

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
            <MenuItem onClick={handleLogout}>Odhlásit se</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Mobilní drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
        }}
      >
        {drawer}
      </Drawer>

      {/* Hlavní obsah */}
      <Box component="main" sx={{ flexGrow: 1, py: 4, px: 3 }}>
        {children}
      </Box>

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
        <Container maxWidth={false} sx={{ px: 3 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            © 2025 Atletika Stará Boleslav. Všechna práva vyhrazena. | Created by <a href="https://lukaspodolak.cz/" target="_blank" rel="noopener noreferrer">Lukáš Podolák</a>.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;

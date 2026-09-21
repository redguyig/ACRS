'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box, AppBar, Toolbar, Typography, IconButton, Menu, MenuItem,
  Avatar, Divider, ListItemIcon, Drawer, List, ListItem, ListItemText,
} from '@mui/material';
import { Menu as MenuIcon, Users, BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const navigation = [
  { name: 'Users', href: '/admin/users', icon: Users },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const drawer = (
    <Box onClick={handleMenuClose} sx={{ textAlign: 'center', p: 2 }}>
      <Avatar sx={{ mx: 'auto', mb: 2, width: 60, height: 60, bgcolor: 'error.main' }}>
        {user?.name?.charAt(0).toUpperCase()}
      </Avatar>
      <Typography variant="h6" gutterBottom>
        {user?.name}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {user?.email}
      </Typography>
      <Divider sx={{ my: 2 }} />
      <List>
        {navigation.map((item) => (
          <ListItem
            button
            key={item.name}
            component={Link}
            href={item.href}
            selected={pathname === item.href || pathname.startsWith(item.href + '/')}
            sx={{ justifyContent: 'flex-start', pl: 2 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <item.icon size={20} />
            </ListItemIcon>
            <ListItemText primary={item.name} />
          </ListItem>
        ))}
        <Divider />
        <ListItem button onClick={handleLogout} sx={{ justifyContent: 'flex-start', pl: 2 }}>
          <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
            <LogOut size={20} />
          </ListItemIcon>
          <ListItemText primary="Sign Out" primaryTypographyProps={{ color: 'error.main' }} />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="fixed" elevation={1} sx={{ zIndex: 1200, bgcolor: '#1e293b' }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 2, display: { md: 'none' } }}
            aria-label="menu"
          >
            <MenuIcon size={24} />
          </IconButton>
          <Typography variant="h6" noWrap component={Link} href="/admin/users" sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}>
            Code Review System — Admin
          </Typography>
          <IconButton
            onClick={handleProfileMenuOpen}
            sx={{ ml: 'auto' }}
            aria-label="account"
          >
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'error.main' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}>
        {drawer}
      </Drawer>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleLogout}>
          <LogOut size={18} style={{ marginRight: 8 }} /> Sign Out
        </MenuItem>
      </Menu>
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: '64px', minHeight: 'calc(100vh - 64px)' }}>
        {children}
      </Box>
    </Box>
  );
}

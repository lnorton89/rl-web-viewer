import { ReactNode } from 'react';
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, AppBar, Toolbar, Typography } from '@mui/material';
import { Videocam, Settings, PanTool } from '@mui/icons-material';

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'live', label: 'Live View', icon: <Videocam /> },
  { id: 'ptz', label: 'PTZ', icon: <PanTool /> },
  { id: 'settings', label: 'Settings', icon: <Settings /> },
];

const SIDEBAR_WIDTH = 200;

interface LayoutShellProps {
  children: ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function LayoutShell({ children, activeSection, onSectionChange }: LayoutShellProps) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          },
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap>
            Reolink
          </Typography>
        </Toolbar>
        <List>
          {NAV_ITEMS.map((item) => (
            <ListItemButton
              key={item.id}
              selected={activeSection === item.id}
              onClick={() => onSectionChange(item.id)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          overflow: 'auto',
          height: '100vh',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
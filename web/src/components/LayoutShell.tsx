import { ReactNode } from 'react';
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Tooltip, Typography } from '@mui/material';
import { Extension, Videocam, Settings } from '@mui/icons-material';

interface NavItem {
  id: string;
  label: string;
  tooltip: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'live', label: 'Live View', tooltip: 'View camera live feed', icon: <Videocam /> },
  { id: 'plugins', label: 'Plugins', tooltip: 'Manage plugins and streaming', icon: <Extension /> },
  { id: 'settings', label: 'Settings', tooltip: 'Configure camera settings', icon: <Settings /> },
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
          <Tooltip title="Reolink RLC-423S Camera Dashboard" placement="right">
            <Typography variant="h6" noWrap sx={{ cursor: 'default' }}>
              Reolink
            </Typography>
          </Tooltip>
        </Toolbar>
        <List>
          {NAV_ITEMS.map((item) => (
            <Tooltip key={item.id} title={item.tooltip} placement="right">
              <ListItemButton
                selected={activeSection === item.id}
                onClick={() => onSectionChange(item.id)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </Tooltip>
          ))}
        </List>
      </Drawer>

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

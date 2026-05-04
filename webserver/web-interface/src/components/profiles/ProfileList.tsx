import React from 'react';
import {
  List, ListItemButton, ListItemText, Typography, useTheme, Box,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { ProfileSummary } from '../../models/api';

interface ProfileListProps {
  profiles: ProfileSummary[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export default function ProfileList({ profiles, activeIndex, onSelect }: ProfileListProps) {
  const theme = useTheme();

  return (
    <Box sx={{ width: '100%', p: theme.spacing(1) }}>
      <Typography
        variant="overline"
        sx={{ pl: theme.spacing(1), color: theme.palette.text.secondary }}
      >
        Profiles
      </Typography>
      <List dense disablePadding>
        {profiles.map((profile) => {
          const isActive = profile.index === activeIndex;
          return (
            <ListItemButton
              key={profile.index}
              selected={isActive}
              onClick={() => onSelect(profile.index)}
              sx={{
                borderRadius: theme.shape.borderRadius,
                mb: 0.5,
                border: `1px solid ${isActive ? theme.palette.primary.main : 'transparent'}`,
                backgroundColor: isActive ? `${theme.palette.primary.main}1A` : 'transparent',
                '&.Mui-selected': {
                  backgroundColor: `${theme.palette.primary.main}1A`,
                },
                '&.Mui-selected:hover': {
                  backgroundColor: `${theme.palette.primary.main}33`,
                },
              }}
            >
              <ListItemText
                primary={profile.name}
                primaryTypographyProps={{
                  color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                  fontWeight: isActive ? 600 : 400,
                }}
              />
              {isActive && (
                <CheckCircleIcon
                  fontSize="small"
                  sx={{ color: theme.palette.primary.main, ml: 1 }}
                />
              )}
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}

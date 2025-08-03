import React from 'react';
import { Typography, List, ListItem, ListItemText, Paper, ListItemButton } from '@mui/material';
import { Subtitle } from '../types';
import { scrollbarStyle } from './sharedStyles';

interface SearchResultsProps {
  subtitles: Subtitle[];
  onResultClick: (subtitle: Subtitle) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ subtitles, onResultClick }) => {
  return (
    <Paper elevation={0} sx={{ mt: 2, backgroundColor: 'transparent' }}>
      <Typography variant="body2" sx={{ color: '#cccccc', mb: 1 }}>
        {subtitles.length} results
      </Typography>
      <List dense sx={{ p: 0, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', ...scrollbarStyle }}>
        {subtitles.map((subtitle) => (
          <ListItem key={subtitle.id} disablePadding>
            <ListItemButton
              onClick={() => onResultClick(subtitle)}
              sx={{
                '&:hover': {
                  backgroundColor: '#37373d',
                },
              }}
            >
              <ListItemText
                primary={subtitle.text}
                primaryTypographyProps={{
                  style: {
                    color: '#cccccc',
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default React.memo(SearchResults);
import React from 'react';
import { styled } from '@mui/material/styles';

const InsertedText = styled('ins')(({ theme }) => ({
  backgroundColor: theme.palette.success.light,
  color: theme.palette.success.contrastText,
  textDecoration: 'none',
  padding: '2px 4px',
  borderRadius: theme.shape.borderRadius,
}));

const DeletedText = styled('del')(({ theme }) => ({
  backgroundColor: theme.palette.error.light,
  color: theme.palette.error.contrastText,
  padding: '2px 4px',
  borderRadius: theme.shape.borderRadius,
}));

export interface DiffPart {
  type: 'added' | 'removed' | 'normal';
  value: string;
}

interface DiffHighlighterProps {
  diffs: DiffPart[];
}

const DiffHighlighter: React.FC<DiffHighlighterProps> = ({ diffs }) => {
  return (
    <p>
      {diffs.map((part, index) => {
        switch (part.type) {
          case 'added':
            return <InsertedText key={index}>{part.value}</InsertedText>;
          case 'removed':
            return <DeletedText key={index}>{part.value}</DeletedText>;
          default:
            return <span key={index}>{part.value}</span>;
        }
      })}
    </p>
  );
};

export default DiffHighlighter;
import React, { useState, useRef } from 'react';
import { TableCell, TextField } from '@mui/material';
import DiffHighlighter from './DiffHighlighter';
import { Subtitle } from '../types';
import { textCellStyle, textFieldStyle, textDisplayStyle } from './sharedStyles';

interface EditableSubtitleCellProps {
  row: Subtitle;
  editingId: number | null;
  onSubtitleChange: (id: number, newText: string) => void;
  setEditingId: (id: number | null) => void;
}

const EditableSubtitleCell: React.FC<EditableSubtitleCellProps> = ({
  row,
  editingId,
  onSubtitleChange,
  setEditingId,
}) => {
  const [editText, setEditText] = useState(row.text);
  const escapePressedRef = useRef(false);

  const isEditing = editingId === row.id;

  const handleDoubleClick = () => {
    setEditingId(row.id);
    setEditText(row.text);
    escapePressedRef.current = false;
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditText(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      onSubtitleChange(row.id, editText);
      setEditingId(null);
    } else if (event.key === 'Escape') {
      escapePressedRef.current = true;
      setEditingId(null);
      setEditText(row.text);
    }
  };

  const handleBlur = () => {
    if (escapePressedRef.current) {
      escapePressedRef.current = false;
      return;
    }
    if (editText !== row.text) {
      onSubtitleChange(row.id, editText);
    }
    setEditingId(null);
  };

  return (
    <TableCell component="div" sx={textCellStyle} onDoubleClick={handleDoubleClick}>
      {isEditing ? (
        <TextField
          value={editText}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoFocus
          fullWidth
          variant="outlined"
          sx={textFieldStyle}
        />
      ) : (
        <div style={textDisplayStyle}>
          <DiffHighlighter diffs={row.diffs || []} />
        </div>
      )}
    </TableCell>
  );
};

export default EditableSubtitleCell;
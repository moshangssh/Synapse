import React, { useState, useRef, useEffect, memo } from 'react';
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

  useEffect(() => {
    // Only update from prop if not currently editing that specific cell
    if (editingId !== row.id) {
      setEditText(row.text);
    }
  }, [row.text, editingId, row.id]);

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

const areEqual = (prevProps: EditableSubtitleCellProps, nextProps: EditableSubtitleCellProps) => {
  // Only re-render if the text, diffs, or editing status changes.
  return (
    prevProps.row.text === nextProps.row.text &&
    JSON.stringify(prevProps.row.diffs) === JSON.stringify(nextProps.row.diffs) &&
    prevProps.editingId === nextProps.editingId
  );
};

export default memo(EditableSubtitleCell, areEqual);
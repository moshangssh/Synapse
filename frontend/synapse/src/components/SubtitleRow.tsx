import React, { memo, useState } from 'react';
import { TableRow, TableCell, TextField } from '@mui/material';
import DiffHighlighter from './DiffHighlighter';
import type { DiffPart } from './DiffHighlighter';

// It's better to have a centralized types file, but for this task, we define it here.
export interface Subtitle {
  id: number;
  startTimecode: string;
  endTimecode: string;
  text: string;
  diffs?: DiffPart[];
}

interface SubtitleRowProps {
  row: Subtitle;
  style: React.CSSProperties;
  selectedRow: number | null;
  editingId: number | null;
  handleRowClick: (startTimecode: string, endTimecode: string, id: number) => void;
  onSubtitleChange: (id: number, newText: string) => void;
  setEditingId: (id: number | null) => void;
}

const tableRowStyle = {
  cursor: "pointer",
  "&:hover": {
    backgroundColor: "action.hover",
  },
  display: 'flex',
  width: '100%',
};

const idCellStyle = { width: '80px', flexShrink: 0 };
const timecodeCellStyle = { width: '150px', flexShrink: 0 };
const textCellStyle = { flexGrow: 1, padding: 0 };

const textFieldStyle = {
  height: '100%',
  '& .MuiOutlinedInput-root': {
    height: '100%',
    padding: 0,
    boxSizing: 'border-box',
    '& .MuiOutlinedInput-notchedOutline': {
      border: '1px solid #1976d2',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderWidth: '1px',
    },
  },
  '& .MuiInputBase-input': {
    padding: '16px',
    height: '100%',
    boxSizing: 'border-box',
  },
};

const textDisplayStyle: React.CSSProperties = {
  padding: '16px',
  height: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center'
};


const SubtitleRow = memo(({
  row,
  style,
  selectedRow,
  editingId,
  handleRowClick,
  onSubtitleChange,
  setEditingId,
}: SubtitleRowProps) => {
  const [editText, setEditText] = useState(row.text);
  const escapePressedRef = React.useRef(false);

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
    <TableRow
      style={style}
      key={row.id}
      onClick={() => handleRowClick(row.startTimecode, row.endTimecode, row.id)}
      sx={{
        ...tableRowStyle,
        ...(selectedRow === row.id && {
          backgroundColor: 'action.selected',
        }),
      }}
    >
      <TableCell align="center" component="th" scope="row" sx={idCellStyle}>
        {row.id}
      </TableCell>
      <TableCell align="center" sx={timecodeCellStyle}>{row.startTimecode}</TableCell>
      <TableCell align="center" sx={timecodeCellStyle}>{row.endTimecode}</TableCell>
      <TableCell sx={textCellStyle} onDoubleClick={handleDoubleClick}>
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
    </TableRow>
  );
});

export default SubtitleRow;
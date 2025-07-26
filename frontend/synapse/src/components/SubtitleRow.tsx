import React, { memo, forwardRef } from 'react';
import { TableRow, TableCell } from '@mui/material';
import { Subtitle } from '../types';
import {
  tableRowStyle,
  idCellStyle,
  timecodeCellStyle,
} from './sharedStyles';
import EditableSubtitleCell from './EditableSubtitleCell';

interface SubtitleRowProps {
  row: Subtitle;
  style: React.CSSProperties;
  selectedRow: number | null;
  editingId: number | null;
  handleRowClick: (startTimecode: string, endTimecode: string, id: number) => void;
  onSubtitleChange: (id: number, newText: string) => void;
  setEditingId: (id: number | null) => void;
}


const SubtitleRow = memo(forwardRef<HTMLDivElement, SubtitleRowProps>(({
  row,
  style,
  selectedRow,
  editingId,
  handleRowClick,
  onSubtitleChange,
  setEditingId,
}, ref) => {
  return (
    <TableRow
      ref={ref}
      component="div"
      style={style}
      key={row.id}
      onClick={() => handleRowClick(row.startTimecode, row.endTimecode, row.id)}
      sx={{
        ...tableRowStyle,
        ...(selectedRow === row.id && {
          backgroundColor: 'action.selected',
        }),
        display: 'flex', // Ensure flex layout to match header
        width: '100%',   // Ensure full width
      }}
    >
      <TableCell component="div" align="center" scope="row" sx={idCellStyle}>
        {row.id}
      </TableCell>
      <TableCell component="div" align="center" sx={timecodeCellStyle}>{row.startTimecode}</TableCell>
      <TableCell component="div" align="center" sx={timecodeCellStyle}>{row.endTimecode}</TableCell>
      <EditableSubtitleCell
        row={row}
        editingId={editingId}
        onSubtitleChange={onSubtitleChange}
        setEditingId={setEditingId}
      />
    </TableRow>
  );
}));

export default SubtitleRow;
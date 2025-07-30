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


const areEqual = (prevProps: SubtitleRowProps, nextProps: SubtitleRowProps) => {
  // Compare critical properties to prevent unnecessary re-renders.
  const rowChanged =
    prevProps.row.id !== nextProps.row.id ||
    prevProps.row.text !== nextProps.row.text ||
    prevProps.row.startTimecode !== nextProps.row.startTimecode ||
    prevProps.row.endTimecode !== nextProps.row.endTimecode ||
    JSON.stringify(prevProps.row.diffs) !== JSON.stringify(nextProps.row.diffs);

  if (rowChanged) {
    return false;
  }

  // Compare other props that affect rendering.
  return (
    prevProps.selectedRow === nextProps.selectedRow &&
    prevProps.editingId === nextProps.editingId &&
    // The style prop from react-window should be stable, but a shallow compare is safe.
    prevProps.style === nextProps.style
  );
};


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
}), areEqual);

export default SubtitleRow;
import { memo } from 'react';
import { Box } from '@mui/material';
import { Subtitle } from '../types';
import {
  idCellStyle,
  timecodeCellStyle,
} from './sharedStyles';
import EditableSubtitleCell from './EditableSubtitleCell';

interface SubtitleRowProps {
  row: Subtitle;
  selectedRow: number | null;
  editingId: number | null;
  handleRowClick: (startTimecode: string, endTimecode: string, id: number) => void;
  onSubtitleChange: (id: number, newText: string) => void;
  setEditingId: (id: number | null) => void;
}

const SubtitleRow: React.FC<SubtitleRowProps> = ({
  row,
  selectedRow,
  editingId,
  handleRowClick,
  onSubtitleChange,
  setEditingId,
}) => {
  const handleRowDoubleClick = () => {
    setEditingId(row.id);
  };

  return (
    <Box
      onClick={() => handleRowClick(row.startTimecode, row.endTimecode, row.id)}
      onDoubleClick={handleRowDoubleClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        height: '50px',
        borderBottom: 1,
        borderColor: 'divider',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
        ...(selectedRow === row.id && {
          backgroundColor: 'action.selected',
          '&:hover': {
            backgroundColor: 'action.selected',
          }
        }),
      }}
    >
      <Box component="div" sx={{ ...idCellStyle, textAlign: 'center' }}>
        {row.id}
      </Box>
      <Box component="div" sx={{ ...timecodeCellStyle, textAlign: 'center' }}>
        {row.startTimecode}
      </Box>
      <Box component="div" sx={{ ...timecodeCellStyle, textAlign: 'center' }}>
        {row.endTimecode}
      </Box>
      <EditableSubtitleCell
        row={row}
        editingId={editingId}
        onSubtitleChange={onSubtitleChange}
        setEditingId={setEditingId}
      />
    </Box>
  );
};

export default memo(SubtitleRow);
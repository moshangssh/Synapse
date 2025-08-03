import { memo, forwardRef } from 'react';
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

// 自定义比较函数，避免比较函数引用
const areEqual = (prevProps: SubtitleRowProps, nextProps: SubtitleRowProps) => {
  // 比较非函数属性
  return (
    prevProps.row.id === nextProps.row.id &&
    prevProps.row.startTimecode === nextProps.row.startTimecode &&
    prevProps.row.endTimecode === nextProps.row.endTimecode &&
    prevProps.row.text === nextProps.row.text &&
    prevProps.row.originalText === nextProps.row.originalText &&
    // 比较 diffs 数组
    prevProps.row.diffs === nextProps.row.diffs && // 在 JavaScript 中，对象引用比较是合理的，因为 diffs 应该是不可变的
    prevProps.selectedRow === nextProps.selectedRow &&
    prevProps.editingId === nextProps.editingId
  );
};

const SubtitleRow = memo(forwardRef<HTMLDivElement, SubtitleRowProps>(({
  row,
  selectedRow,
  editingId,
  handleRowClick,
  onSubtitleChange,
  setEditingId,
}, ref) => {
  // 直接使用从父组件传递过来的row数据
  const currentSubtitle = row;

  // 处理整行双击编辑
  const handleRowDoubleClick = () => {
    setEditingId(row.id);
  };

  return (
    <Box
      ref={ref}
      key={currentSubtitle.id}
      onClick={() => handleRowClick(currentSubtitle.startTimecode, currentSubtitle.endTimecode, currentSubtitle.id)}
      onDoubleClick={handleRowDoubleClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
        ...(selectedRow === currentSubtitle.id && {
          backgroundColor: 'action.selected',
        }),
      }}
    >
      <Box component="div" sx={{ ...idCellStyle, textAlign: 'center', py: 0.25 }}>
        {currentSubtitle.id}
      </Box>
      <Box component="div" sx={{ ...timecodeCellStyle, textAlign: 'center', py: 0.25 }}>
        {currentSubtitle.startTimecode}
      </Box>
      <Box component="div" sx={{ ...timecodeCellStyle, textAlign: 'center', py: 0.25 }}>
        {currentSubtitle.endTimecode}
      </Box>
      <EditableSubtitleCell
        row={currentSubtitle}
        editingId={editingId}
        onSubtitleChange={onSubtitleChange}
        setEditingId={setEditingId}
      />
    </Box>
  );
}));

export default memo(SubtitleRow, areEqual);
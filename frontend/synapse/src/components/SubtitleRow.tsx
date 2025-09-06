import { memo } from 'react';
import { Box } from '@mui/material';
import { Subtitle } from '../types';
import {
  idCellStyle,
  timecodeCellStyle,
} from './sharedStyles';
import EditableSubtitleCell from './EditableSubtitleCell';
// 导入新的转换函数和需要的 Store
import { convertFrameTcToMsTc } from '../utils/timecodeConverter';
import { useProjectStore } from '../stores/useProjectStore';

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
  // 从 Store 中获取帧率和当前字幕来源
  const frameRate = useProjectStore((state) => state.frameRate);
  const currentSubtitleSource = useProjectStore((state) => state.currentSubtitleSource);

  const handleRowDoubleClick = () => {
    setEditingId(row.id);
  };

  // 根据字幕来源决定是否转换时间码
  const displayStartTimecode = currentSubtitleSource === 'davinci' 
    ? convertFrameTcToMsTc(row.startTimecode, frameRate || 24) 
    : row.startTimecode;

  const displayEndTimecode = currentSubtitleSource === 'davinci' 
    ? convertFrameTcToMsTc(row.endTimecode, frameRate || 24) 
    : row.endTimecode;

  return (
    <Box
      onClick={() => handleRowClick(row.startTimecode, row.endTimecode, row.id)}
      onDoubleClick={handleRowDoubleClick}
      sx={{
        display: 'flex',
        alignItems: 'center', // 改为居中对齐
        minHeight: '36px', // 使用minHeight而不是固定高度，允许行高根据内容扩展
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
      <Box component="div" sx={{ ...idCellStyle, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {row.id}
      </Box>
      <Box component="div" sx={{ ...timecodeCellStyle, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* 使用转换后的时间码进行显示 */}
        {displayStartTimecode}
      </Box>
      <Box component="div" sx={{ ...timecodeCellStyle, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* 使用转换后的时间码进行显示 */}
        {displayEndTimecode}
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
import React, { useCallback, memo, useState, useRef, useEffect, useMemo } from 'react';
import { Box, styled } from '@mui/material';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import SubtitleRow from './SubtitleRow';
import { idCellStyle, timecodeCellStyle, textCellStyle, scrollbarStyle } from './sharedStyles';
import { useTimelineNavigation } from '../hooks/useTimelineNavigation';
import { useDataStore } from '../stores/useDataStore';
import { useUIStore } from '../stores/useUIStore';

interface SubtitleTableProps {
  jumpToSubtitleId: number | null;
  onRowClick: (id: number) => void;
}

// 自定义标记层组件，用于在滚动条上显示修改过的行
const ModifiedLinesOverlay = styled('div')({
  position: 'absolute',
  top: 0,
  right: 0,
  width: '10px', // 滚动条宽度
  height: '100%',
  pointerEvents: 'none', // 不拦截鼠标事件
  zIndex: 1000, // 确保在滚动条上方
});

// 修改标记组件
const ModifiedLineMarker = styled('div')(() => ({
  position: 'absolute',
  right: '2px', // 距离右边 2px
  width: '6px', // 宽度 6px
  height: '2px', // 高度 2px
  backgroundColor: '#FFCC00', // VSCode 中修改行的黄色标记
  borderRadius: '1px', // 轻微圆角
}));

const SubtitleTable: React.FC<SubtitleTableProps> = ({ jumpToSubtitleId, onRowClick }) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { setTimecode } = useTimelineNavigation();
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const subtitles = useDataStore((state) => state.subtitles);
  const updateSubtitleText = useDataStore((state) => state.updateSubtitleText);
  const jumpTo = useUIStore((state) => state.jumpTo);

  // 使用 useCallback 包装回调函数以稳定它们的引用
  const handleRowClick = useCallback(async (inPoint: string, outPoint: string, id: number) => {
    setSelectedRow(id);
    onRowClick(id);
    await setTimecode(inPoint, outPoint, jumpTo);
  }, [jumpTo, setTimecode, onRowClick]);

  const handleSubtitleChange = useCallback((id: number, newText: string) => {
    updateSubtitleText(id, newText);
  }, [updateSubtitleText]);

  const handleSetEditingId = useCallback((id: number | null) => {
    setEditingId(id);
  }, []);

  useEffect(() => {
    if (jumpToSubtitleId !== null) {
      const index = subtitles.findIndex(s => s.id === jumpToSubtitleId);
      if (index !== -1 && virtuosoRef.current) {
        virtuosoRef.current.scrollToIndex({
          index,
          align: 'center',
          behavior: 'smooth',
        });
        const sub = subtitles[index];
        handleRowClick(sub.startTimecode, sub.endTimecode, sub.id);
      }
    }
  }, [jumpToSubtitleId, subtitles, handleRowClick]);

  const rowContent = useCallback((_index: number, subtitle: (typeof subtitles)[number]) => {
    return (
      <div key={subtitle.id}>
        <SubtitleRow
          row={subtitle}
          selectedRow={selectedRow}
          editingId={editingId}
          handleRowClick={handleRowClick}
          onSubtitleChange={handleSubtitleChange}
          setEditingId={handleSetEditingId}
        />
      </div>
    );
  }, [subtitles, selectedRow, editingId, handleRowClick, handleSubtitleChange, handleSetEditingId]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', flexShrink: 0, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ ...idCellStyle, textAlign: 'center', py: 1 }}>序号</Box>
        <Box sx={{ ...timecodeCellStyle, textAlign: 'center', py: 1 }}>起始时间码</Box>
        <Box sx={{ ...timecodeCellStyle, textAlign: 'center', py: 1 }}>结束时间码</Box>
        <Box sx={{ ...textCellStyle, py: 1, pl: 2 }}>字幕内容</Box>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, ...scrollbarStyle, position: 'relative' }}>
        <Virtuoso
          ref={virtuosoRef}
          style={{ height: '100%' }}
          data={subtitles}
          itemContent={rowContent}
        />
        {/* 修改过的行标记层 */}
        <ModifiedLinesOverlay>
          {useMemo(() => {
            const totalLines = subtitles.length;
            return subtitles.map((subtitle, index) => {
              // 检查行是否被修改过
              const isModified = subtitle.originalText !== subtitle.text ||
                                subtitle.diffs.some(diff => diff.type !== 'normal');
              
              // 只为修改过的行显示标记
              if (isModified) {
                // 计算行在滚动条上的位置
                // 简化计算：假设每行高度相等
                const position = (index / totalLines) * 100;
                
                return (
                  <ModifiedLineMarker
                    key={subtitle.id}
                    style={{
                      top: `${position}%`,
                    }}
                  />
                );
              }
              return null;
            });
          }, [subtitles])}
        </ModifiedLinesOverlay>
      </Box>
    </Box>
  );
};

export default memo(SubtitleTable);
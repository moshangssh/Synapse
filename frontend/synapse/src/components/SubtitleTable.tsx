import React, { useCallback, memo, useState, useRef, useEffect, useMemo } from 'react';
import { Box, styled, ThemeProvider, CssBaseline } from '@mui/material';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import SubtitleRow from './SubtitleRow';
import { idCellStyle, timecodeCellStyle, textCellStyle, scrollbarStyle } from './sharedStyles';
import { useTimelineNavigation } from '../hooks/useTimelineNavigation';
import { useDataStore } from '../stores/useDataStore';
import { useUIStore } from '../stores/useUIStore';
import { darkTheme, lightTheme } from './layout/ThemeProvider';
import { useSettingsStore } from '../stores/useSettingsStore';

interface SubtitleTableProps {
  jumpToSubtitleId: number | null;
  onRowClick: (id: number) => void;
}

const ModifiedLinesOverlay = styled('div')({
  position: 'absolute',
  top: 0,
  right: 0,
  width: '10px',
  height: '100%',
  pointerEvents: 'none',
  zIndex: 1000,
});

const ModifiedLineMarker = styled('div')({
  position: 'absolute',
  right: '2px',
  width: '6px',
  backgroundColor: '#FFCC00',
  borderRadius: '1px',
});

const SubtitleTable: React.FC<SubtitleTableProps> = ({ jumpToSubtitleId, onRowClick }) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { setTimecode } = useTimelineNavigation();
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const subtitles = useDataStore((state) => state.subtitles);
  const updateSubtitleText = useDataStore((state) => state.updateSubtitleText);
  const modifiedIndices = useDataStore((state) => state.getModifiedSubtitleIndices());
  const jumpTo = useUIStore((state) => state.jumpTo);
  const themeMode = useSettingsStore((state) => state.theme);

  const handleRowClick = useCallback(async (inPoint: string, outPoint: string, id: number) => {
    setSelectedRow(id);
    onRowClick(id);
    await setTimecode(inPoint, outPoint, jumpTo);
  }, [jumpTo, onRowClick, setTimecode]);

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
  }, [jumpToSubtitleId, subtitles]);

  const rowContent = useCallback((_index: number, subtitle: (typeof subtitles)[number]) => (
    <SubtitleRow
      key={subtitle.id}
      row={subtitle}
      selectedRow={selectedRow}
      editingId={editingId}
      handleRowClick={handleRowClick}
      onSubtitleChange={handleSubtitleChange}
      setEditingId={handleSetEditingId}
    />
  ), [selectedRow, editingId, handleRowClick, handleSubtitleChange, handleSetEditingId]);

  const memoizedModifiedMarkers = useMemo(() => {
    const totalLines = subtitles.length;
    if (totalLines === 0) return null;

    const mergedMarkers: { top: number; height: number, key: number }[] = [];
    let lastMarker: { top: number; height: number, key: number } | null = null;

    modifiedIndices.forEach((index) => {
      const position = (index / totalLines) * 100;
      const height = (1 / totalLines) * 100;

      if (lastMarker && position <= lastMarker.top + lastMarker.height) {
        lastMarker.height = position + height - lastMarker.top;
      } else {
        lastMarker = { top: position, height, key: subtitles[index].id };
        mergedMarkers.push(lastMarker);
      }
    });

    return mergedMarkers.map((marker) => (
      <ModifiedLineMarker
        key={marker.key}
        style={{
          top: `${marker.top}%`,
          height: `${Math.max(marker.height, 0.1)}%`, // min height of 2px
        }}
      />
    ));
  }, [modifiedIndices, subtitles]);

  return (
    <ThemeProvider theme={themeMode === 'dark' ? darkTheme : lightTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default', color: 'text.primary' }}>
        <Box sx={{ display: 'flex', flexShrink: 0, borderBottom: 1, borderColor: 'divider', minHeight: '36px' }}>
          <Box sx={{ ...idCellStyle, textAlign: 'center', py: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>序号</Box>
          <Box sx={{ ...timecodeCellStyle, textAlign: 'center', py: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>起始时间码</Box>
          <Box sx={{ ...timecodeCellStyle, textAlign: 'center', py: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>结束时间码</Box>
          <Box sx={{ ...textCellStyle, py: 1, pl: 2, display: 'flex', alignItems: 'center' }}>字幕内容</Box>
        </Box>

        <Box sx={{ flex: 1, ...scrollbarStyle, position: 'relative' }}>
          <Virtuoso
            ref={virtuosoRef}
            style={{ height: '100%' }}
            data={subtitles}
            itemContent={rowContent}
          />
          <ModifiedLinesOverlay>
            {memoizedModifiedMarkers}
          </ModifiedLinesOverlay>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default memo(SubtitleTable);
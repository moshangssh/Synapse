import React, { useCallback, memo, useState, useMemo, useRef } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import SubtitleRow from './SubtitleRow';
import { Subtitle } from '../types';
import { idCellStyle, timecodeCellStyle, textCellStyle } from './sharedStyles';
import { useTimelineNavigation } from '../hooks/useTimelineNavigation';

interface SubtitleTableProps {
  subtitles: Subtitle[];
  jumpTo: "start" | "end" | "middle";
  onSubtitleChange: (id: number, newText: string) => void;
}

const SubtitleTable: React.FC<SubtitleTableProps> = ({ subtitles, jumpTo, onSubtitleChange }) => {
  const listRef = useRef<List>(null);
  const { setTimecode } = useTimelineNavigation();
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleRowClick = useCallback(async (inPoint: string, outPoint: string, id: number) => {
    setSelectedRow(id);
    await setTimecode(inPoint, outPoint, jumpTo);
  }, [jumpTo, setTimecode]);

  const itemData = useMemo(() => ({
    subtitles,
    selectedRow,
    editingId,
    handleRowClick,
    onSubtitleChange,
    setEditingId,
  }), [subtitles, selectedRow, editingId, handleRowClick, onSubtitleChange, setEditingId]);

  const Row = useCallback(({ data, index, style }: ListChildComponentProps) => (
    <SubtitleRow
      row={data.subtitles[index]}
      style={style}
      selectedRow={data.selectedRow}
      editingId={data.editingId}
      handleRowClick={data.handleRowClick}
      onSubtitleChange={data.onSubtitleChange}
      setEditingId={data.setEditingId}
    />
  ), []);

  return (
    <TableContainer component={Paper} sx={{ height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
      <Table
        stickyHeader
        component="div"
        sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        aria-label="virtualized table"
      >
        <TableHead component="div">
          <TableRow component="div" sx={{ display: 'flex', width: '100%' }}>
            <TableCell component="div" align="center" sx={idCellStyle}>序号</TableCell>
            <TableCell component="div" align="center" sx={timecodeCellStyle}>起始时间码</TableCell>
            <TableCell component="div" align="center" sx={timecodeCellStyle}>结束时间码</TableCell>
            <TableCell component="div" sx={textCellStyle}>字幕内容</TableCell>
          </TableRow>
        </TableHead>
        <TableBody component="div" sx={{ flex: 1 }}>
          <List
            ref={listRef}
            height={window.innerHeight - 257} // Adjust height to account for header
            itemCount={subtitles.length}
            itemSize={53}
            width="100%"
            itemData={itemData}
            itemKey={(index, data) => data.subtitles[index].id}
          >
            {Row}
          </List>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default memo(SubtitleTable);
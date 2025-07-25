import React, { useCallback, memo, useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField } from '@mui/material';
import { FixedSizeList as List } from 'react-window';
import useNotifier from '../hooks/useNotifier';
import SubtitleRow from './SubtitleRow';
import type { DiffPart } from './DiffHighlighter';

export interface Subtitle {
  id: number;
  startTimecode: string;
  endTimecode: string;
  text: string;
  diffs: DiffPart[];
}

interface SubtitleTableProps {
  subtitles: Subtitle[];
  jumpTo: "start" | "end" | "middle";
  onSubtitleChange: (id: number, newText: string) => void;
}


const SubtitleTable: React.FC<SubtitleTableProps> = ({ subtitles, jumpTo, onSubtitleChange }) => {
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const notify = useNotifier();

  const handleRowClick = useCallback(async (
    inPoint: string,
    outPoint: string,
    id: number
  ) => {
    setSelectedRow(id);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/timeline/timecode`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            in_point: inPoint,
            out_point: outPoint,
            jump_to: jumpTo,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('API call failed');
      }

      console.log(
        `Successfully set timecode. In: ${inPoint}, Out: ${outPoint}, Jump: ${jumpTo}`
      );
    } catch (error) {
      console.error("Error setting timecode:", error);
      notify.error(`跳转失败: ${error}`);
    }
  }, [jumpTo, notify]);


  const itemData = useMemo(() => ({
    subtitles,
    handleRowClick,
    selectedRow,
    onSubtitleChange,
    editingId,
    setEditingId,
  }), [subtitles, handleRowClick, selectedRow, onSubtitleChange, editingId, setEditingId]);

  return (
    <TableContainer
      component={Paper}
      sx={{
        height: 'calc(100vh - 200px)',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        msOverflowStyle: 'none',  // IE and Edge
        scrollbarWidth: 'none',  // Firefox
      }}
    >
      <Table sx={{ tableLayout: 'fixed', width: '100%' }} aria-label="simple table">
        <TableHead>
          <TableRow sx={{ display: 'flex', width: '100%' }}>
            <TableCell align="center" sx={{ width: '80px', flexShrink: 0 }}>序号</TableCell>
            <TableCell align="center" sx={{ width: '150px', flexShrink: 0 }}>起始时间码</TableCell>
            <TableCell align="center" sx={{ width: '150px', flexShrink: 0 }}>结束时间码</TableCell>
            <TableCell sx={{ flexGrow: 1 }}>字幕内容</TableCell>
          </TableRow>
        </TableHead>
      </Table>
      <List
        height={window.innerHeight - 250}
        itemCount={subtitles.length}
        itemSize={53}
        width="100%"
        itemData={itemData}
      >
        {({ data, index, style }) => {
          const row = data.subtitles[index];
          return (
            <SubtitleRow
              row={row}
              style={style}
              selectedRow={data.selectedRow}
              editingId={data.editingId}
              handleRowClick={data.handleRowClick}
              onSubtitleChange={data.onSubtitleChange}
              setEditingId={data.setEditingId}
            />
          );
        }}
      </List>
    </TableContainer>
  );
};

export default memo(SubtitleTable);
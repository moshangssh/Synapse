import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import useNotifier from '../hooks/useNotifier';

interface Subtitle {
  id: number;
  startTimecode: string;
  endTimecode: string;
  text: string;
}

interface SubtitleTableProps {
  subtitles: Subtitle[];
  jumpTo: "start" | "end" | "middle";
}

const SubtitleTable: React.FC<SubtitleTableProps> = ({ subtitles, jumpTo }) => {
  const [selectedRow, setSelectedRow] = React.useState<number | null>(null);
  const notify = useNotifier();

  const handleRowClick = async (
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
  };

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>序号</TableCell>
            <TableCell>起始时间码</TableCell>
            <TableCell>结束时间码</TableCell>
            <TableCell>字幕内容</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {subtitles.map((row) => (
            <TableRow
              key={row.id}
              onClick={() =>
                handleRowClick(row.startTimecode, row.endTimecode, row.id)
              }
              sx={{
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: "action.hover",
                },
                ...(selectedRow === row.id && {
                  backgroundColor: 'action.selected',
                }),
              }}
            >
              <TableCell component="th" scope="row">
                {row.id}
              </TableCell>
              <TableCell>{row.startTimecode}</TableCell>
              <TableCell>{row.endTimecode}</TableCell>
              <TableCell>{row.text}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SubtitleTable;
import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

interface Subtitle {
  id: number;
  startTimecode: string;
  endTimecode: string;
  text: string;
}

interface SubtitleTableProps {
  subtitles: Subtitle[];
}

const SubtitleTable: React.FC<SubtitleTableProps> = ({ subtitles }) => {
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
            <TableRow key={row.id}>
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
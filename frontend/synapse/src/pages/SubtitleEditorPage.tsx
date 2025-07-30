import { useState, useCallback } from "react";
import {
  Box,
  Button,
  Container,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from "@mui/material";
import SubtitleTable from "../components/SubtitleTable";
import useNotifier from "../hooks/useNotifier";
import { useDataStore } from "../stores/useDataStore";

type JumpTo = "start" | "end" | "middle";

interface SubtitleEditorPageProps {
  jumpToSubtitleId: number | null;
  onRowClick: (id: number) => void;
}

export function SubtitleEditorPage({
  jumpToSubtitleId,
  onRowClick: onRowClickProp,
}: SubtitleEditorPageProps) {
  const onRowClick = useCallback(onRowClickProp, [onRowClickProp]);
  const [jumpTo, setJumpTo] = useState<JumpTo>("start");
  const notify = useNotifier();
  const { subtitles, frameRate } = useDataStore();

  const handleJumpToChange = (event: SelectChangeEvent<JumpTo>) => {
    setJumpTo(event.target.value as JumpTo);
  };


  const handleExport = async () => {
    const subtitlesToExport = subtitles.map(({ id, startTimecode, endTimecode, diffs }) => ({
      id,
      startTimecode,
      endTimecode,
      diffs,
    }));

    const requestBody = {
      frameRate: frameRate,
      subtitles: subtitlesToExport,
    };

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/v1/export/srt",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error("导出失败");
      }

      const srtContent = await response.text();
      const blob = new Blob([srtContent], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "subtitles.srt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("导出错误:", error);
    }
  };

  const handleExportToDavinci = async () => {
    const subtitlesToExport = subtitles.map(({ id, startTimecode, endTimecode, diffs }) => ({
      id,
      startTimecode,
      endTimecode,
      diffs,
    }));

    const requestBody = {
      frameRate: frameRate,
      subtitles: subtitlesToExport,
    };

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/v1/export/davinci",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "导出至达芬奇失败");
      }

      notify.success("成功导出至达芬奇！");
    } catch (error: any) {
      console.error("导出至达芬奇错误:", error);
      notify.error(error.message || "导出至达芬奇时发生未知错误");
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
            <InputLabel id="jump-to-select-label">跳转模式</InputLabel>
            <Select
              labelId="jump-to-select-label"
              id="jump-to-select"
              value={jumpTo}
              label="跳转模式"
              onChange={handleJumpToChange}
            >
              <MenuItem value={"start"}>入点</MenuItem>
              <MenuItem value={"middle"}>中点</MenuItem>
              <MenuItem value={"end"}>出点</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            onClick={handleExport}
            disabled={subtitles.length === 0}
          >
            导出SRT
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleExportToDavinci}
            disabled={subtitles.length === 0}
          >
            导出至达芬奇
          </Button>
        </Box>
      </Box>
      <SubtitleTable
        jumpTo={jumpTo}
        jumpToSubtitleId={jumpToSubtitleId}
        onRowClick={onRowClick}
      />
    </Container>
  );
}
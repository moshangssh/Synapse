import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  CssBaseline,
  AppBar,
  Toolbar,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  TextField,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import SubtitleTable from "./components/SubtitleTable";
import ConnectionStatus from "./components/ConnectionStatus";
import FindReplace from "./components/FindReplace";
import { useFindReplace } from "./hooks/useFindReplace";
import { DiffPart } from "./components/DiffHighlighter";
import { diffChars } from "diff";
import { Subtitle } from "./types";

const lightTheme = createTheme({
  palette: {
    mode: "light",
  },
});

type Status = "connected" | "connecting" | "error" | "initial";
type JumpTo = "start" | "end" | "middle";

function App() {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<Status>("initial");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [jumpTo, setJumpTo] = useState<JumpTo>("start");
  const [frameRate, setFrameRate] = useState<number>(24);

  const {
    searchQuery,
    replaceQuery,
    showReplace,
    matchCase,
    matchWholeWord,
    useRegex,
    handleSearchChange,
    handleReplaceChange,
    toggleShowReplace,
    toggleMatchCase,
    toggleMatchWholeWord,
    toggleUseRegex,
    handleReplaceAll,
    filteredSubtitles,
  } = useFindReplace({ subtitles, setSubtitles });

  const handleJumpToChange = (event: SelectChangeEvent<JumpTo>) => {
    setJumpTo(event.target.value as JumpTo);
  };

  const fetchSubtitles = async () => {
    setLoading(true);
    setConnectionStatus("connecting");
    setErrorMessage("");
    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/subtitles");
      const data = await response.json();

      if (response.ok && data.status === "success") {
        const subtitlesWithDiffs = data.data.map((sub: any) => ({
          ...sub,
          originalText: sub.text,
          diffs: [{ type: "normal", value: sub.text }],
        }));
        setSubtitles(subtitlesWithDiffs);
        setFrameRate(data.frameRate);
        setConnectionStatus("connected");
      } else {
        throw new Error(data.message || "获取字幕失败");
      }
    } catch (error: any) {
      setConnectionStatus("error");
      setErrorMessage(
        error.message || "无法连接到后端服务，请检查服务是否正在运行。"
      );
      setSubtitles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubtitleChange = useCallback((id: number, newText: string) => {
    setSubtitles((prevSubtitles) =>
      prevSubtitles.map((sub) => {
        if (sub.id === id) {
          const diffResult = diffChars(sub.originalText, newText);
          const diffs: DiffPart[] = diffResult.map((part) => ({
            type: part.added ? "added" : part.removed ? "removed" : "normal",
            value: part.value,
          }));
          return { ...sub, text: newText, diffs };
        }
        return sub;
      })
    );
  }, []);

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

  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            DaVinci Resolve 字幕提取器
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <ConnectionStatus
            status={connectionStatus}
            message={errorMessage}
          />
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
              onClick={fetchSubtitles}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? "刷新中..." : "刷新"}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleExport}
              disabled={subtitles.length === 0}
            >
              导出SRT
            </Button>
          </Box>
        </Box>
        <Box sx={{ mb: 2 }}>
          <FindReplace
            searchQuery={searchQuery}
            replaceQuery={replaceQuery}
            showReplace={showReplace}
            matchCase={matchCase}
            matchWholeWord={matchWholeWord}
            useRegex={useRegex}
            onSearchChange={handleSearchChange}
            onReplaceChange={handleReplaceChange}
            onReplaceAll={handleReplaceAll}
            onToggleShowReplace={toggleShowReplace}
            onToggleMatchCase={toggleMatchCase}
            onToggleMatchWholeWord={toggleMatchWholeWord}
            onToggleUseRegex={toggleUseRegex}
          />
        </Box>
        <SubtitleTable
          subtitles={filteredSubtitles}
          jumpTo={jumpTo}
          onSubtitleChange={handleSubtitleChange}
        />
      </Container>
    </ThemeProvider>
  );
}

export default App;

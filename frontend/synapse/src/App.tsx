import { useState, useEffect } from "react";
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
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import SubtitleTable from "./components/SubtitleTable";
import ConnectionStatus from "./components/ConnectionStatus";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

interface Subtitle {
  id: number;
  startTimecode: string;
  endTimecode: string;
  text: string;
}

type Status = "connected" | "connecting" | "error" | "initial";
type JumpTo = "start" | "end" | "middle";

function App() {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<Status>("initial");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [jumpTo, setJumpTo] = useState<JumpTo>("start");

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
        setSubtitles(data.data);
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


  return (
    <ThemeProvider theme={darkTheme}>
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
          <Box sx={{ display: "flex", gap: 2 }}>
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
          </Box>
        </Box>
        <SubtitleTable subtitles={subtitles} jumpTo={jumpTo} />
      </Container>
    </ThemeProvider>
  );
}

export default App;

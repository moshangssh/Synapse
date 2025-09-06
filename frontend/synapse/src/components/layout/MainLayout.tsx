import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Paper, Typography, Button, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { Download, Send } from 'lucide-react';
import { darkTheme, lightTheme } from './ThemeProvider';
import { ActivityBar } from './ActivityBar';
import { FileExplorer } from './FileExplorer';
import { OptimizerSidebar } from './OptimizerSidebar';
import { SubtitleEditorPage } from '../../pages/SubtitleEditorPage';
import { StatusBar } from './StatusBar';
import { TitleBar } from './TitleBar';
import FindReplace from '../FindReplace';
import SearchResults from '../SearchResults';
import { useFindReplace } from '../../hooks/useFindReplace';
import { Subtitle } from '../../types';
import { useUIStore } from '../../stores/useUIStore';
import { useSubtitleStore } from '../../stores/useSubtitleStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useConnectionStore } from '../../stores/useConnectionStore';
import useNotifier from '../../hooks/useNotifier';
import { useExport } from '../../hooks/useExport';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { fetchSubtitles as fetchSubtitlesService, fetchProjectInfo as fetchProjectInfoService, fetchSubtitleTracks as fetchSubtitleTracksService } from '../../services/resolveService';
export function MainLayout() {
  const notify = useNotifier();
  const themeMode = useSettingsStore((state) => state.theme);
  const {
    activeView,
    sidebarWidth,
    isSidebarOpen,
    setSidebarWidth,
    activeTrackIndex,
    setActiveTrackIndex,
    setSelectedSubtitleId,
  } = useUIStore();

  const setSubtitles = useSubtitleStore((state) => state.setSubtitles);
  const subtitles = useSubtitleStore((state) => state.subtitles);
  
  const setFrameRate = useProjectStore((state) => state.setFrameRate);
  const setProjectInfo = useProjectStore((state) => state.setProjectInfo);
  const setSubtitleTracks = useProjectStore((state) => state.setSubtitleTracks);
  const setCurrentSubtitleSource = useProjectStore((state) => state.setCurrentSubtitleSource);
  const setCurrentImportedFileName = useProjectStore((state) => state.setCurrentImportedFileName);
  
  const setConnectionStatus = useConnectionStore((state) => state.setConnectionStatus);
  const setErrorMessage = useConnectionStore((state) => state.setErrorMessage);
  const currentErrorMessage = useConnectionStore((state) => state.errorMessage);
  const { exportToSrt, exportToDavinci } = useExport();

  const [loading, setLoading] = useState(false);
  const [jumpToSubtitleId, setJumpToSubtitleId] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSubtitles = useCallback(async (trackIndex: number = 1) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setConnectionStatus("connecting");
    setErrorMessage(null);
    try {
      const subtitlesWithDiffs = await fetchSubtitlesService(trackIndex);
      setSubtitles(subtitlesWithDiffs);
      // Note: setFrameRate needs to be called with the frame rate from the response
      // This will be handled in the service layer in a future update
      setConnectionStatus("connected");
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted');
        return;
      }
      setConnectionStatus("error");
      if (!currentErrorMessage) {
        setErrorMessage({
          message: error.message || "无法连接到后端服务，请检查服务是否正在运行。",
        });
      }
      setSubtitles([]);
    } finally {
      setLoading(false);
    }
  }, [setSubtitles, setConnectionStatus, setErrorMessage, currentErrorMessage]);

  const fetchProjectInfo = useCallback(async () => {
    try {
      const projectInfo = await fetchProjectInfoService();
      setProjectInfo(projectInfo);
    } catch (error) {
      console.error('Failed to fetch project info:', error);
      setProjectInfo({ projectName: 'N/A', timelineName: 'N/A' });
    }
  }, [setProjectInfo]);

  const fetchSubtitleTracks = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    setConnectionStatus("connecting");
    try {
      const tracks = await fetchSubtitleTracksService();
      setSubtitleTracks(tracks);
      if (tracks.length > 0) {
        const firstTrackIndex = tracks[0].track_index;
        setActiveTrackIndex(firstTrackIndex);
        // 设置字幕来源为 davinci，确保时间码正确转换
        setCurrentSubtitleSource('davinci');
        setCurrentImportedFileName(null);
        // The useEffect hook will trigger fetchSubtitles when activeTrackIndex is set.
        // We only need to fetch non-critical project info here.
        await fetchProjectInfo();
      } else {
        // No tracks, but still connected
        setConnectionStatus("connected");
        setSubtitles([]);
        setActiveTrackIndex(null);
        // 重置字幕来源状态
        setCurrentSubtitleSource(null);
        setCurrentImportedFileName(null);
      }
    } catch (error: any) {
      if (!currentErrorMessage) {
        setErrorMessage({ message: error.message || "无法获取字幕轨道" });
      }
      setConnectionStatus("error");
      setSubtitles([]);
      setActiveTrackIndex(null);
      // 重置字幕来源状态
      setCurrentSubtitleSource(null);
      setCurrentImportedFileName(null);
    } finally {
      setLoading(false);
    }
  }, [setErrorMessage, setConnectionStatus, setSubtitleTracks, setActiveTrackIndex, fetchProjectInfo, setSubtitles, currentErrorMessage]);

  useEffect(() => {
    if (activeTrackIndex !== null) {
      fetchSubtitles(activeTrackIndex);
    }
    // We don't include fetchSubtitles in the dependency array because
    // it's a stable function from useCallback, but including it
    // satisfies the exhaustive-deps lint rule and is good practice.
  }, [activeTrackIndex, fetchSubtitles]);

  const handleTrackSelect = useCallback((trackIndex: number) => {
    setActiveTrackIndex(trackIndex);
    setCurrentSubtitleSource('davinci');
    setCurrentImportedFileName(null);
  }, [setCurrentSubtitleSource, setCurrentImportedFileName]);

  const handleResultClick = (subtitle: Subtitle) => {
    setJumpToSubtitleId(subtitle.id);
    // Reset after a short delay to allow for re-clicking the same item
    setTimeout(() => setJumpToSubtitleId(null), 50);
  };

  const handleRowClick = useCallback((id: number) => {
    setSelectedSubtitleId(id);
  }, [setSelectedSubtitleId]);

  const {
    searchQuery,
    replaceQuery,
    showReplace,
    handleSearchChange,
    handleReplaceChange,
    toggleShowReplace,
    handleReplaceAll,
    filteredSubtitles,
  } = useFindReplace();
  const isResizing = useRef(false);
  const dragStartInfo = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    dragStartInfo.current = {
      startX: e.clientX,
      startWidth: sidebarWidth,
    };
  }, [sidebarWidth]);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    dragStartInfo.current = null;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing.current && dragStartInfo.current) {
      const deltaX = e.clientX - dragStartInfo.current.startX;
      const newWidth = dragStartInfo.current.startWidth + deltaX;

      if (newWidth > 200 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const onExportSRT = async () => {
    const result = await exportToSrt();
    if (result.success) {
      const blob = new Blob([result.data!], {
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
      notify.success(result.message);
    } else {
      // Error message is handled by the hook, but we can still show a generic message if needed
      // notify.error(result.message);
    }
  };

  const onExportToDavinci = async () => {
    const result = await exportToDavinci();
    if (result.success) {
      notify.success(result.message);
    } else {
      // Error message is handled by the hook, but we can still show a generic message if needed
      // notify.error(result.message);
    }
  };

  const renderSidebar = () => {
    const commonPaperStyles = {
          width: '100%',
          height: '100%',
          backgroundColor: '#1E1E1E',
          borderRadius: 0,
          borderRight: '1px solid #3c3c3c',
        };

    switch (activeView) {
      case 'explorer':
        return (
          <FileExplorer
            fetchSubtitleTracks={fetchSubtitleTracks}
            loading={loading}
            onTrackSelect={handleTrackSelect}
          />
        );
      case 'search':
        return (
          <Paper sx={commonPaperStyles}>
            <Box sx={{ p: 1.5 }}>
              <Typography variant="subtitle1" sx={{ color: '#cccccc', fontWeight: 500 }}>
                Search
              </Typography>
            </Box>
            <Box sx={{ p: 1.5 }}>
              <FindReplace
                searchQuery={searchQuery}
                replaceQuery={replaceQuery}
                showReplace={showReplace}
                onSearchChange={handleSearchChange}
                onReplaceChange={handleReplaceChange}
                onReplaceAll={handleReplaceAll}
                onToggleShowReplace={toggleShowReplace}
              />
              {searchQuery && (
                <SearchResults
                  subtitles={filteredSubtitles}
                  onResultClick={handleResultClick}
                />
              )}
            </Box>
          </Paper>
        );
      case 'optimizer':
        return <OptimizerSidebar />;
      case 'git':
        return (
          <Paper sx={commonPaperStyles}>
            <Box sx={{ p: 1.5 }}>
              <Typography variant="subtitle1" sx={{ color: '#cccccc', fontWeight: 500 }}>
                Source Control
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={onExportSRT}
                disabled={subtitles.length === 0}
                startIcon={<Download size={16} />}
              >
                导出SRT
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={onExportToDavinci}
                disabled={subtitles.length === 0}
                startIcon={<Send size={16} />}
              >
                导出至达芬奇
              </Button>
            </Box>
          </Paper>
        );
      default:
        return null;
    }
  };

  return (
    <MuiThemeProvider theme={themeMode === 'dark' ? darkTheme : lightTheme}>
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#1e1e1e',
          color: '#cccccc',
        }}
      >
        {/* Title Bar */}
        <TitleBar />
        {/* Main Content Area */}
        <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Activity Bar */}
          <ActivityBar />
          
          {/* Sidebar */}
          <Box
            sx={{
              width: isSidebarOpen ? sidebarWidth : 0,
              height: '100%',
              transition: 'width 0.3s ease-in-out',
              overflow: 'hidden',
            }}
          >
            {renderSidebar()}
          </Box>

          {/* Resizer */}
          {isSidebarOpen && (
            <Box
              onMouseDown={handleMouseDown}
              sx={{
                width: '1px',
                cursor: 'col-resize',
                backgroundColor: 'transparent',
                height: '100%',
                transition: 'background-color 0.2s ease-in-out, width 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: '#007acc',
                  width: '3px',
                  transform: 'translateX(-1px)'
                },
              }}
            />
          )}
          
          {/* Editor Area */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <SubtitleEditorPage
              jumpToSubtitleId={jumpToSubtitleId}
              onRowClick={handleRowClick}
            />
          </Box>
        </Box>

        {/* Status Bar */}
        <StatusBar />
      </Box>
    </MuiThemeProvider>
  );
}
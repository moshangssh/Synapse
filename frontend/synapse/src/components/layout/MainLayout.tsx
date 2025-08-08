import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { Download, Send } from 'lucide-react';
import { ThemeProvider } from './ThemeProvider';
import { ActivityBar } from './ActivityBar';
import { FileExplorer } from './FileExplorer';
import { SubtitleEditorPage } from '../../pages/SubtitleEditorPage';
import { StatusBar } from './StatusBar';
import { TitleBar } from './TitleBar';
import FindReplace from '../FindReplace';
import SearchResults from '../SearchResults';
import { useFindReplace } from '../../hooks/useFindReplace';
import { Subtitle } from '../../types';
import { useUIStore } from '../../stores/useUIStore';
import { useDataStore } from '../../stores/useDataStore';
import useNotifier from '../../hooks/useNotifier';

export function MainLayout() {
  const notify = useNotifier();
  const {
    activeView,
    setActiveView,
    sidebarWidth,
    isSidebarOpen,
    setSidebarWidth,
    activeTrackIndex,
    setActiveTrackIndex,
    setSelectedSubtitleId,
  } = useUIStore();
  const {
    setSubtitles,
    setFrameRate,
    setConnectionStatus,
    setErrorMessage,
    setProjectInfo,
    setSubtitleTracks,
    handleExport,
    handleExportToDavinci,
    subtitles,
    errorMessage: currentErrorMessage,
  } = useDataStore();

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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/subtitles?track_index=${trackIndex}`, { signal });
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
        const errorPayload = {
          message: data.message || "获取字幕失败",
          code: data.code,
        };
        setErrorMessage(errorPayload);
        throw new Error(errorPayload.message);
      }
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
  }, [setSubtitles, setFrameRate, setConnectionStatus, setErrorMessage]);

  const fetchProjectInfo = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/project-info`);
      const result = await response.json();

      if (response.ok && result.status === 'success') {
        setProjectInfo(result.data);
      } else {
        // Don't throw an error, just log it, as this is non-critical info
        console.error(result.message || '获取项目信息失败');
        setProjectInfo({ projectName: 'N/A', timelineName: 'N/A' });
      }
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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/timeline/subtitle_tracks`);
      const data = await response.json();
      if (response.ok && data.status === "success") {
        setSubtitleTracks(data.data);
        if (data.data.length > 0) {
          const firstTrackIndex = data.data[0].track_index;
          setActiveTrackIndex(firstTrackIndex);
          // The useEffect hook will trigger fetchSubtitles when activeTrackIndex is set.
          // We only need to fetch non-critical project info here.
          await fetchProjectInfo();
        } else {
          // No tracks, but still connected
          setConnectionStatus("connected");
          setSubtitles([]);
          setActiveTrackIndex(null);
        }
      } else {
        const errorPayload = {
          message: data.message || "获取字幕轨道失败",
          code: data.code,
        };
        setErrorMessage(errorPayload);
        throw new Error(errorPayload.message);
      }
    } catch (error: any) {
      if (!currentErrorMessage) {
        setErrorMessage({ message: error.message || "无法获取字幕轨道" });
      }
      setConnectionStatus("error");
      setSubtitles([]);
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
  }, []);

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
    try {
      const srtContent = await handleExport();
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
      notify.success('SRT导出成功！');
    } catch (error: any) {
      notify.error(error.message || '导出SRT时发生未知错误');
    }
  };

  const onExportToDavinci = async () => {
    const result = await handleExportToDavinci();
    if (result.success) {
      notify.success(result.message);
    } else {
      notify.error(result.message);
    }
  };

  const renderSidebar = () => {
    const commonPaperStyles = {
      width: '100%',
      height: '100%',
      backgroundColor: '#252526',
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
            <Box sx={{ p: 1.5, borderBottom: '1px solid #3c3c3c' }}>
              <Typography variant="h6" sx={{ color: '#cccccc' }}>
                Search
              </Typography>
            </Box>
            <Box sx={{ p: 1.5 }}>
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
              {searchQuery && (
                <SearchResults
                  subtitles={filteredSubtitles}
                  onResultClick={handleResultClick}
                />
              )}
            </Box>
          </Paper>
        );
      case 'git':
        return (
          <Paper sx={commonPaperStyles}>
            <Box sx={{ p: 1.5, borderBottom: '1px solid #3c3c3c' }}>
              <Typography variant="h6" sx={{ color: '#cccccc' }}>
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
    <ThemeProvider>
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
    </ThemeProvider>
  );
}
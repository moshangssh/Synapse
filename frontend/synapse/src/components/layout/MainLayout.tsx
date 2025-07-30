import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { ThemeProvider } from './ThemeProvider';
import { ActivityBar } from './ActivityBar';
import { FileExplorer } from './FileExplorer';
import { SubtitleEditorPage } from '../../pages/SubtitleEditorPage';
import { StatusBar } from './StatusBar';
import FindReplace from '../FindReplace';
import SearchResults from '../SearchResults';
import { useFindReplace } from '../../hooks/useFindReplace';
import { Subtitle } from '../../types';
import { useUIStore } from '../../stores/useUIStore';
import { useDataStore } from '../../stores/useDataStore';

export function MainLayout() {
  const {
    activeView,
    setActiveView,
    sidebarWidth,
    setSidebarWidth,
    activeTrackIndex,
    setActiveTrackIndex,
    selectedSubtitleId,
    setSelectedSubtitleId,
  } = useUIStore();
  const {
    setSubtitles,
    setFrameRate,
    setConnectionStatus,
    setErrorMessage,
    setProjectInfo,
    setSubtitleTracks,
  } = useDataStore();

  const [loading, setLoading] = useState(false);
  const [jumpToSubtitleId, setJumpToSubtitleId] = useState<number | null>(null);

  const fetchSubtitles = useCallback(async (trackIndex: number = 1) => {
    setLoading(true);
    setConnectionStatus("connecting");
    setErrorMessage("");
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/subtitles?track_index=${trackIndex}`);
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
  }, []);

  const fetchProjectInfo = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/project-info');
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
  };

  const fetchSubtitleTracks = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    setConnectionStatus("connecting");
    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/timeline/subtitle_tracks");
      const data = await response.json();
      if (response.ok && data.status === "success") {
        setSubtitleTracks(data.data);
        if (data.data.length > 0) {
          const firstTrackIndex = data.data[0].track_index;
          setActiveTrackIndex(firstTrackIndex);
          // Fetch subtitles for the first track AND project info
          await Promise.all([
            fetchSubtitles(firstTrackIndex),
            fetchProjectInfo()
          ]);
        } else {
          // No tracks, but still connected
          setConnectionStatus("connected");
          setSubtitles([]);
          setActiveTrackIndex(null);
          setActiveTrackIndex(null);
        }
      } else {
        throw new Error(data.message || "获取字幕轨道失败");
      }
    } catch (error: any) {
      setErrorMessage(error.message || "无法获取字幕轨道");
      setConnectionStatus("error");
      setSubtitles([]);
    } finally {
      setLoading(false);
    }
  }, [fetchSubtitles]);

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
            <Box sx={{ p: 1.5 }}>
              <Typography variant="body2" sx={{ color: '#969696', fontSize: '0.75rem' }}>
                No changes detected
              </Typography>
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
        {/* Main Content Area */}
        <Box sx={{ flex: 1, display: 'flex' }}>
          {/* Activity Bar */}
          <ActivityBar activeView={activeView} onViewChange={setActiveView} />
          
          {/* Sidebar */}
          <Box sx={{ width: sidebarWidth, height: '100%' }}>
            {renderSidebar()}
          </Box>

          {/* Resizer */}
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
          
          {/* Editor Area */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <SubtitleEditorPage
              jumpToSubtitleId={jumpToSubtitleId}
              onRowClick={(id) => setSelectedSubtitleId(id)}
            />
          </Box>
        </Box>

        {/* Status Bar */}
        <StatusBar />
      </Box>
    </ThemeProvider>
  );
}
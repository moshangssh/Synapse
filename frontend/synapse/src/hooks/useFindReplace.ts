import { useState, useCallback, useMemo } from 'react';
import { useSubtitleStore } from '../stores/useSubtitleStore';
import { filterSubtitles } from '../utils/filter';
import { replaceAllSubtitles } from '../services/subtitleService';

export const useFindReplace = () => {
  const subtitles = useSubtitleStore((state) => state.subtitles);
  const setSubtitles = useSubtitleStore((state) => state.setSubtitles);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  const handleReplaceChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setReplaceQuery(event.target.value);
  }, []);

  const toggleShowReplace = useCallback(() => {
    setShowReplace(prev => !prev);
  }, []);


  const filteredSubtitles = useMemo(() => {
    return filterSubtitles(subtitles, searchQuery);
  }, [subtitles, searchQuery]);

  const handleReplaceAll = useCallback(async () => {
    if (!searchQuery.trim()) {
      alert('搜索查询不能为空');
      return;
    }

    setIsLoading(true);

    try {
      const result = await replaceAllSubtitles(subtitles, searchQuery, replaceQuery);
      
      // 一次性更新所有字幕
      const updatedSubtitles = subtitles.map(sub => {
        const modifiedSubtitle = result.find(item => item.id === sub.id);
        if (modifiedSubtitle) {
          return {
            ...sub,
            text: modifiedSubtitle.text,
            diffs: modifiedSubtitle.diffs, // 直接使用后端返回的diffs
            isModified: modifiedSubtitle.text !== (sub.originalText ?? sub.text),
          };
        }
        return sub;
      });

      setSubtitles(updatedSubtitles);

      // 清空搜索和替换输入
      setSearchQuery('');
      setReplaceQuery('');
      
    } catch (error) {
      console.error('替换操作失败:', error);
      alert(error instanceof Error ? error.message : '替换操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [subtitles, searchQuery, replaceQuery, setSubtitles]);

  return {
    searchQuery,
    replaceQuery,
    showReplace,
    isLoading,
    handleSearchChange,
    handleReplaceChange,
    toggleShowReplace,
    handleReplaceAll,
    filteredSubtitles,
  };
};
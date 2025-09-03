import { useState, useCallback, useMemo } from 'react';
import { calculateDiffApi } from '../integration/diffApi';
import { useDataStore } from '../stores/useDataStore';
import { buildRegex, filterSubtitles } from '../utils/filter';

interface ReplaceAllRequest {
  subtitles: Array<{
    id: number;
    startTimecode: string;
    endTimecode: string;
    text: string;
  }>;
  searchQuery: string;
  replaceQuery: string;
}

interface ReplaceAllResponse {
  status: string;
  data: Array<{
    id: number;
    text: string;
  }>;
}

export const useFindReplace = () => {
  const subtitles = useDataStore((state) => state.subtitles);
  const setSubtitles = useDataStore((state) => state.setSubtitles);
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

    const requestBody: ReplaceAllRequest = {
      subtitles: subtitles.map(sub => ({
        id: sub.id,
        startTimecode: sub.startTimecode,
        endTimecode: sub.endTimecode,
        text: sub.diffs && sub.diffs.length > 0
          ? sub.diffs.filter(p => p.type !== 'removed').map(p => p.value).join('')
          : sub.text
      })),
      searchQuery,
      replaceQuery
    };

    try {
      const response = await fetch('http://localhost:8000/api/v1/subtitles/replace-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail?.message || '替换操作失败');
      }

      const result: ReplaceAllResponse = await response.json();
      
      // 更新字幕状态，先使用占位符差异
      const updatedSubtitles = subtitles.map(sub => {
        const modifiedSubtitle = result.data.find(item => item.id === sub.id);
        if (modifiedSubtitle) {
          return {
            ...sub,
            text: modifiedSubtitle.text,
            diffs: [{ type: 'normal' as const, value: modifiedSubtitle.text }], // 临时占位符
            isModified: modifiedSubtitle.text !== sub.originalText,
          };
        }
        return sub;
      });

      setSubtitles(updatedSubtitles);

      // 异步计算所有修改字幕的差异
      const updateAllDiffs = async () => {
        const modifiedSubtitles = updatedSubtitles.filter(sub => 
          result.data.some(item => item.id === sub.id)
        );

        for (const sub of modifiedSubtitles) {
          const modifiedData = result.data.find(item => item.id === sub.id);
          if (!modifiedData) continue;

          try {
            const diffs = await calculateDiffApi(sub.originalText, modifiedData.text);
            
            // 更新单个字幕的差异数据
            setSubtitles((currentSubtitles: Subtitle[]) => 
              currentSubtitles.map((s: Subtitle) => 
                s.id === sub.id 
                  ? { ...s, diffs }
                  : s
              )
            );
          } catch (error) {
            console.error(`计算字幕 ${sub.id} 的差异失败:`, error);
            // 保持占位符差异但添加错误状态
            setSubtitles((currentSubtitles: Subtitle[]) => 
              currentSubtitles.map((s: Subtitle) => 
                s.id === sub.id 
                  ? { ...s, diffError: true }
                  : s
              )
            );
          }
        }
      };

      updateAllDiffs();

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
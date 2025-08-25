import { useState, useCallback, useMemo } from 'react';
import { calculateDiff } from '../utils/diff';
import { useDataStore } from '../stores/useDataStore';
import { buildRegex, filterSubtitles } from '../utils/filter';

export const useFindReplace = () => {
  const subtitles = useDataStore((state) => state.subtitles);
  const setSubtitles = useDataStore((state) => state.setSubtitles);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showReplace, setShowReplace] = useState(false);

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

  const handleReplaceAll = useCallback(() => {
    const regex = buildRegex(searchQuery);
    if (!regex) return;

    const currentSubtitles = subtitles;
    const updatedSubtitles = currentSubtitles.map(sub => {
      const currentText = sub.diffs && sub.diffs.length > 0
        ? sub.diffs.filter(p => p.type !== 'removed').map(p => p.value).join('')
        : sub.text;
      
      regex.lastIndex = 0;
      if (!regex.test(currentText)) {
        return sub;
      }

      regex.lastIndex = 0;
      const newText = currentText.replace(regex, replaceQuery);
      const finalDiffs = calculateDiff(sub.originalText, newText);

      return {
        ...sub,
        text: newText,
        diffs: finalDiffs,
      };
    });
    setSubtitles(updatedSubtitles);

    setSearchQuery('');
    setReplaceQuery('');
  }, [setSubtitles, searchQuery, replaceQuery, subtitles]);

  return {
    searchQuery,
    replaceQuery,
    showReplace,
    handleSearchChange,
    handleReplaceChange,
    toggleShowReplace,
    handleReplaceAll,
    filteredSubtitles,
  };
};
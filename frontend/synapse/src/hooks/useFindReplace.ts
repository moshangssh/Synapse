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
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  const handleReplaceChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setReplaceQuery(event.target.value);
  }, []);

  const toggleShowReplace = useCallback(() => {
    setShowReplace(prev => !prev);
  }, []);

  const toggleMatchCase = useCallback(() => setMatchCase(prev => !prev), []);
  const toggleMatchWholeWord = useCallback(() => setMatchWholeWord(prev => !prev), []);
  const toggleUseRegex = useCallback(() => setUseRegex(prev => !prev), []);

  const filteredSubtitles = useMemo(() => {
    return filterSubtitles(subtitles, { searchQuery, useRegex, matchCase, matchWholeWord });
  }, [subtitles, searchQuery, matchCase, matchWholeWord, useRegex]);

  const handleReplaceAll = useCallback(() => {
    const regex = buildRegex(searchQuery, useRegex, matchCase, matchWholeWord);
    if (!regex) return;

    const currentSubtitles = subtitles;
    const updatedSubtitles = currentSubtitles.map(sub => {
      const currentText = sub.diffs
        .filter(p => p.type !== 'removed')
        .map(p => p.value)
        .join('');
      
      regex.lastIndex = 0;
      if (!regex.test(currentText)) {
        return sub;
      }

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
  }, [setSubtitles, searchQuery, replaceQuery, matchCase, matchWholeWord, useRegex, subtitles]);

  return {
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
  };
};
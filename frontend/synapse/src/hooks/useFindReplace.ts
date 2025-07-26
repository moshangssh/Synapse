import { useState, useCallback, useMemo } from 'react';
import { Subtitle } from '../types';
import { calculateDiff } from '../utils/diff';

interface UseFindReplaceProps {
  subtitles: Subtitle[];
  setSubtitles: React.Dispatch<React.SetStateAction<Subtitle[]>>;
}

export const useFindReplace = ({ subtitles, setSubtitles }: UseFindReplaceProps) => {
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
    if (!searchQuery) {
      return subtitles;
    }

    let regex: RegExp;
    try {
      const pattern = useRegex ? searchQuery : searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const flags = matchCase ? 'g' : 'gi';
      const finalPattern = matchWholeWord ? `\\b${pattern}\\b` : pattern;
      regex = new RegExp(finalPattern, flags);
    } catch (error) {
      console.error("Invalid Regex:", error);
      return subtitles;
    }

    return subtitles.filter(sub => {
      regex.lastIndex = 0; // Reset for stateful global regex
      return regex.test(sub.text);
    });
  }, [subtitles, searchQuery, matchCase, matchWholeWord, useRegex]);

  const handleReplaceAll = useCallback(() => {
    if (!searchQuery) return;

    let regex: RegExp;
    try {
      const pattern = useRegex ? searchQuery : searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const flags = matchCase ? 'g' : 'gi';
      const finalPattern = matchWholeWord ? `\\b${pattern}\\b` : pattern;
      regex = new RegExp(finalPattern, flags);
    } catch (error) {
      console.error("Invalid Regex:", error);
      return; // Or handle invalid regex case appropriately
    }

    const updatedSubtitles = subtitles.map(sub => {
      // The 'g' flag makes the regex stateful. Reset lastIndex before each test.
      regex.lastIndex = 0;
      if (regex.test(sub.text)) {
        const newText = sub.text.replace(regex, replaceQuery);
        const diffs = calculateDiff(sub.originalText, newText);
        return { ...sub, text: newText, diffs };
      }
      return sub;
    });

    setSubtitles(updatedSubtitles);
    setSearchQuery('');
    setReplaceQuery('');
  }, [subtitles, setSubtitles, searchQuery, replaceQuery, matchCase, matchWholeWord, useRegex]);

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
import { diffChars } from 'diff';
import { DiffPart } from '../components/DiffHighlighter';

export const calculateDiff = (originalText: string, newText: string): DiffPart[] => {
  const diffResult = diffChars(originalText, newText);
  return diffResult.map((part) => ({
    type: part.added ? "added" : part.removed ? "removed" : "normal",
    value: part.value,
  }));
};
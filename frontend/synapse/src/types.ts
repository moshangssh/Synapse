import { DiffPart } from "./components/DiffHighlighter";

export interface Subtitle {
  id: number;
  startTimecode: string;
  endTimecode: string;
  text: string;
  originalText: string;
  diffs: DiffPart[];
  isMatch?: boolean;
}
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

export interface SubtitleTrack {
 track_index: number;
 track_name: string;
}
export interface ProjectInfo {
  projectName: string | null;
  timelineName: string | null;
}
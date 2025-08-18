import { describe, it, expect, beforeEach } from 'vitest';
import { useDataStore } from './useDataStore';
import { Subtitle, ImportedSubtitleFile } from '../types';

// Helper function to create a mock subtitle
const createMockSubtitle = (id: number, text: string, originalText?: string): Subtitle => ({
  id,
  startTimecode: '00:00:00.000',
  endTimecode: '00:00:01.000',
  text,
  originalText: originalText ?? text,
  diffs: [],
});

// Helper function to create a mock imported subtitle file
const createMockImportedFile = (fileName: string): ImportedSubtitleFile => ({
  fileName,
  subtitles: [],
  metadata: {
    importedAt: new Date().toISOString(),
    format: 'srt'
  }
});

describe('useDataStore', () => {
  // Reset the store before each test
  beforeEach(() => {
    // Get the current state to preserve functions
    const currentState = useDataStore.getState();
    
    useDataStore.setState({
      subtitles: [],
      subtitleTracks: [],
      projectInfo: null,
      frameRate: 24,
      connectionStatus: 'disconnected',
      errorMessage: null,
      userInfo: null,
      importedSubtitleFiles: [],
      // Preserve functions
      setSubtitles: currentState.setSubtitles,
      setSubtitleTracks: currentState.setSubtitleTracks,
      setProjectInfo: currentState.setProjectInfo,
      setFrameRate: currentState.setFrameRate,
      setConnectionStatus: currentState.setConnectionStatus,
      setErrorMessage: currentState.setErrorMessage,
      updateSubtitleText: currentState.updateSubtitleText,
      setUserInfo: currentState.setUserInfo,
      setImportedSubtitleFiles: currentState.setImportedSubtitleFiles,
      addImportedSubtitleFile: currentState.addImportedSubtitleFile,
      removeImportedSubtitleFile: currentState.removeImportedSubtitleFile,
      updateImportedSubtitleFile: currentState.updateImportedSubtitleFile,
      clearImportedSubtitleFiles: currentState.clearImportedSubtitleFiles,
      getModifiedSubtitleIndices: currentState.getModifiedSubtitleIndices,
    });
  });

  describe('setSubtitles', () => {
    it('should set subtitles correctly', () => {
      const subtitles = [
        createMockSubtitle(1, 'Subtitle 1'),
        createMockSubtitle(2, 'Subtitle 2')
      ];
      
      useDataStore.getState().setSubtitles(subtitles);
      
      expect(useDataStore.getState().subtitles).toEqual(subtitles);
    });
  });

  describe('updateSubtitleText', () => {
    it('should update subtitle text correctly', () => {
      const subtitles = [
        createMockSubtitle(1, 'Original text', 'Original text'),
        createMockSubtitle(2, 'Another subtitle', 'Another subtitle')
      ];
      
      useDataStore.getState().setSubtitles(subtitles);
      useDataStore.getState().updateSubtitleText(1, 'Updated text');
      
      const updatedSubtitles = useDataStore.getState().subtitles;
      expect(updatedSubtitles[0].text).toBe('Updated text');
      expect(updatedSubtitles[0].isModified).toBe(true);
      expect(updatedSubtitles[1]).toEqual(subtitles[1]); // Other subtitles should remain unchanged
    });

    it('should not update if subtitle ID is not found', () => {
      const subtitles = [createMockSubtitle(1, 'Original text')];
      
      useDataStore.getState().setSubtitles(subtitles);
      useDataStore.getState().updateSubtitleText(999, 'New text');
      
      expect(useDataStore.getState().subtitles).toEqual(subtitles);
    });

    it('should not update if text is the same', () => {
      const subtitles = [createMockSubtitle(1, 'Original text')];
      
      useDataStore.getState().setSubtitles(subtitles);
      useDataStore.getState().updateSubtitleText(1, 'Original text');
      
      expect(useDataStore.getState().subtitles).toEqual(subtitles);
    });
  });

  describe('importedSubtitleFiles actions', () => {
    it('should add a new imported subtitle file', () => {
      const file = createMockImportedFile('test.srt');
      
      useDataStore.getState().addImportedSubtitleFile(file);
      
      expect(useDataStore.getState().importedSubtitleFiles).toHaveLength(1);
      expect(useDataStore.getState().importedSubtitleFiles[0]).toEqual(file);
    });

    it('should update an existing imported subtitle file', () => {
      const file1 = createMockImportedFile('test1.srt');
      const file2 = createMockImportedFile('test2.srt');
      const updatedFile1 = { ...file1, subtitles: [createMockSubtitle(1, 'New subtitle')] };
      
      useDataStore.getState().setImportedSubtitleFiles([file1, file2]);
      useDataStore.getState().updateImportedSubtitleFile('test1.srt', updatedFile1);
      
      const files = useDataStore.getState().importedSubtitleFiles;
      expect(files).toHaveLength(2);
      expect(files[0]).toEqual(updatedFile1);
      expect(files[1]).toEqual(file2);
    });

    it('should remove an imported subtitle file', () => {
      const file1 = createMockImportedFile('test1.srt');
      const file2 = createMockImportedFile('test2.srt');
      
      useDataStore.getState().setImportedSubtitleFiles([file1, file2]);
      useDataStore.getState().removeImportedSubtitleFile('test1.srt');
      
      const files = useDataStore.getState().importedSubtitleFiles;
      expect(files).toHaveLength(1);
      expect(files[0]).toEqual(file2);
    });

    it('should clear all imported subtitle files', () => {
      const file1 = createMockImportedFile('test1.srt');
      const file2 = createMockImportedFile('test2.srt');
      
      useDataStore.getState().setImportedSubtitleFiles([file1, file2]);
      useDataStore.getState().clearImportedSubtitleFiles();
      
      expect(useDataStore.getState().importedSubtitleFiles).toHaveLength(0);
    });
  });

  describe('getModifiedSubtitleIndices', () => {
    it('should return indices of modified subtitles', () => {
      const subtitles = [
        createMockSubtitle(1, 'Modified text', 'Original text'), // Modified
        createMockSubtitle(2, 'Unchanged text'), // Not modified
        createMockSubtitle(3, 'Another modified text', 'Original text 3'), // Modified
      ];
      
      // Manually set isModified flag since our helper doesn't do it
      subtitles[0].isModified = true;
      subtitles[2].isModified = true;
      
      useDataStore.getState().setSubtitles(subtitles);
      
      const modifiedIndices = useDataStore.getState().getModifiedSubtitleIndices();
      expect(modifiedIndices).toEqual([0, 2]);
    });

    it('should return empty array if no subtitles are modified', () => {
      const subtitles = [
        createMockSubtitle(1, 'Unchanged text'),
        createMockSubtitle(2, 'Another unchanged text')
      ];
      
      useDataStore.getState().setSubtitles(subtitles);
      
      const modifiedIndices = useDataStore.getState().getModifiedSubtitleIndices();
      expect(modifiedIndices).toEqual([]);
    });
  });
});
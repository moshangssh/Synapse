import { renderHook, act } from '@testing-library/react';
import { useProjectStore } from '../useProjectStore';

// Mock types for testing
interface MockProjectInfo {
  name: string;
  timelineName: string;
  frameRate: number;
}

interface MockSubtitleTrack {
  trackIndex: number;
  trackName: string;
}

interface MockImportedSubtitleFile {
  fileName: string;
  subtitles: any[];
  frameRate: number;
}

describe('useProjectStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useProjectStore());
    act(() => {
      result.current.setProjectInfo(null);
      result.current.setSubtitleTracks([]);
      result.current.setFrameRate(24);
      result.current.setImportedSubtitleFiles([]);
      result.current.setCurrentSubtitleSource(null);
      result.current.setCurrentImportedFileName(null);
    });
  });

  describe('initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useProjectStore());
      
      expect(result.current.projectInfo).toBeNull();
      expect(result.current.subtitleTracks).toEqual([]);
      expect(result.current.frameRate).toBe(24);
      expect(result.current.importedSubtitleFiles).toEqual([]);
      expect(result.current.currentSubtitleSource).toBeNull();
      expect(result.current.currentImportedFileName).toBeNull();
    });
  });

  describe('projectInfo', () => {
    it('should set project info correctly', () => {
      const { result } = renderHook(() => useProjectStore());
      const mockProjectInfo: MockProjectInfo = {
        name: 'Test Project',
        timelineName: 'Timeline 1',
        frameRate: 30,
      };
      
      act(() => {
        result.current.setProjectInfo(mockProjectInfo);
      });

      expect(result.current.projectInfo).toEqual(mockProjectInfo);
    });

    it('should clear project info when set to null', () => {
      const { result } = renderHook(() => useProjectStore());
      const mockProjectInfo: MockProjectInfo = {
        name: 'Test Project',
        timelineName: 'Timeline 1',
        frameRate: 30,
      };
      
      // First set project info
      act(() => {
        result.current.setProjectInfo(mockProjectInfo);
      });

      expect(result.current.projectInfo).toEqual(mockProjectInfo);

      // Then clear it
      act(() => {
        result.current.setProjectInfo(null);
      });

      expect(result.current.projectInfo).toBeNull();
    });
  });

  describe('subtitleTracks', () => {
    it('should set subtitle tracks correctly', () => {
      const { result } = renderHook(() => useProjectStore());
      const mockTracks = [
        { track_index: 1, track_name: 'Track 1' },
        { track_index: 2, track_name: 'Track 2' },
      ];
      
      act(() => {
        result.current.setSubtitleTracks(mockTracks as any);
      });

      expect(result.current.subtitleTracks).toEqual([
        { trackIndex: 1, trackName: 'Track 1' },
        { trackIndex: 2, trackName: 'Track 2' },
      ]);
    });

    it('should handle empty tracks array', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setSubtitleTracks([]);
      });

      expect(result.current.subtitleTracks).toEqual([]);
    });
  });

  describe('frameRate', () => {
    it('should set frame rate correctly', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setFrameRate(30);
      });

      expect(result.current.frameRate).toBe(30);
    });

    it('should handle different frame rates', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setFrameRate(25);
      });

      expect(result.current.frameRate).toBe(25);

      act(() => {
        result.current.setFrameRate(60);
      });

      expect(result.current.frameRate).toBe(60);
    });
  });

  describe('importedSubtitleFiles', () => {
    const mockFile1: MockImportedSubtitleFile = {
      fileName: 'test1.srt',
      subtitles: [{ id: 1, text: 'Test' }],
      frameRate: 24,
    };

    const mockFile2: MockImportedSubtitleFile = {
      fileName: 'test2.srt',
      subtitles: [{ id: 1, text: 'Test 2' }],
      frameRate: 30,
    };

    it('should set imported subtitle files correctly', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setImportedSubtitleFiles([mockFile1, mockFile2]);
      });

      expect(result.current.importedSubtitleFiles).toEqual([mockFile1, mockFile2]);
    });

    it('should add new subtitle file', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.addImportedSubtitleFile(mockFile1);
      });

      expect(result.current.importedSubtitleFiles).toEqual([mockFile1]);

      act(() => {
        result.current.addImportedSubtitleFile(mockFile2);
      });

      expect(result.current.importedSubtitleFiles).toEqual([mockFile1, mockFile2]);
    });

    it('should update existing subtitle file when adding with same fileName', () => {
      const { result } = renderHook(() => useProjectStore());
      const updatedFile1 = {
        ...mockFile1,
        subtitles: [{ id: 1, text: 'Updated Test' }],
      };
      
      act(() => {
        result.current.addImportedSubtitleFile(mockFile1);
      });

      expect(result.current.importedSubtitleFiles[0].subtitles).toEqual([{ id: 1, text: 'Test' }]);

      act(() => {
        result.current.addImportedSubtitleFile(updatedFile1);
      });

      expect(result.current.importedSubtitleFiles).toHaveLength(1);
      expect(result.current.importedSubtitleFiles[0].subtitles).toEqual([{ id: 1, text: 'Updated Test' }]);
    });

    it('should remove subtitle file by fileName', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setImportedSubtitleFiles([mockFile1, mockFile2]);
      });

      expect(result.current.importedSubtitleFiles).toHaveLength(2);

      act(() => {
        result.current.removeImportedSubtitleFile('test1.srt');
      });

      expect(result.current.importedSubtitleFiles).toEqual([mockFile2]);
    });

    it('should handle removing non-existent file', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setImportedSubtitleFiles([mockFile1]);
      });

      act(() => {
        result.current.removeImportedSubtitleFile('non-existent.srt');
      });

      expect(result.current.importedSubtitleFiles).toEqual([mockFile1]);
    });

    it('should update subtitle file by fileName', () => {
      const { result } = renderHook(() => useProjectStore());
      const updatedFile = {
        ...mockFile1,
        frameRate: 60,
      };
      
      act(() => {
        result.current.setImportedSubtitleFiles([mockFile1, mockFile2]);
      });

      act(() => {
        result.current.updateImportedSubtitleFile('test1.srt', updatedFile);
      });

      expect(result.current.importedSubtitleFiles[0].frameRate).toBe(60);
      expect(result.current.importedSubtitleFiles[1]).toEqual(mockFile2); // unchanged
    });

    it('should handle updating non-existent file', () => {
      const { result } = renderHook(() => useProjectStore());
      const updatedFile = {
        ...mockFile1,
        frameRate: 60,
      };
      
      act(() => {
        result.current.setImportedSubtitleFiles([mockFile1]);
      });

      act(() => {
        result.current.updateImportedSubtitleFile('non-existent.srt', updatedFile);
      });

      expect(result.current.importedSubtitleFiles).toEqual([mockFile1]);
    });

    it('should clear all imported subtitle files', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setImportedSubtitleFiles([mockFile1, mockFile2]);
      });

      expect(result.current.importedSubtitleFiles).toHaveLength(2);

      act(() => {
        result.current.clearImportedSubtitleFiles();
      });

      expect(result.current.importedSubtitleFiles).toEqual([]);
    });
  });

  describe('currentSubtitleSource', () => {
    it('should set subtitle source correctly', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setCurrentSubtitleSource('davinci');
      });

      expect(result.current.currentSubtitleSource).toBe('davinci');

      act(() => {
        result.current.setCurrentSubtitleSource('imported');
      });

      expect(result.current.currentSubtitleSource).toBe('imported');
    });

    it('should set subtitle source to null', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setCurrentSubtitleSource('davinci');
      });

      expect(result.current.currentSubtitleSource).toBe('davinci');

      act(() => {
        result.current.setCurrentSubtitleSource(null);
      });

      expect(result.current.currentSubtitleSource).toBeNull();
    });
  });

  describe('currentImportedFileName', () => {
    it('should set current imported file name correctly', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setCurrentImportedFileName('test.srt');
      });

      expect(result.current.currentImportedFileName).toBe('test.srt');
    });

    it('should set current imported file name to null', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setCurrentImportedFileName('test.srt');
      });

      expect(result.current.currentImportedFileName).toBe('test.srt');

      act(() => {
        result.current.setCurrentImportedFileName(null);
      });

      expect(result.current.currentImportedFileName).toBeNull();
    });
  });

  describe('integration scenarios', () => {
    const mockFile1: MockImportedSubtitleFile = {
      fileName: 'test1.srt',
      subtitles: [{ id: 1, text: 'Test' }],
      frameRate: 24,
    };

    const mockFile2: MockImportedSubtitleFile = {
      fileName: 'test2.srt',
      subtitles: [{ id: 1, text: 'Test 2' }],
      frameRate: 30,
    };

    it('should manage complete project state consistently', () => {
      const { result } = renderHook(() => useProjectStore());
      const mockProjectInfo: MockProjectInfo = {
        name: 'Test Project',
        timelineName: 'Timeline 1',
        frameRate: 30,
      };
      const mockTracks = [{ track_index: 1, track_name: 'Main Track' }];
      
      act(() => {
        result.current.setProjectInfo(mockProjectInfo);
        result.current.setSubtitleTracks(mockTracks as any);
        result.current.setFrameRate(30);
        result.current.setCurrentSubtitleSource('davinci');
        result.current.setCurrentImportedFileName('project.srt');
      });

      expect(result.current.projectInfo).toEqual(mockProjectInfo);
      expect(result.current.subtitleTracks).toEqual([{ trackIndex: 1, trackName: 'Main Track' }]);
      expect(result.current.frameRate).toBe(30);
      expect(result.current.currentSubtitleSource).toBe('davinci');
      expect(result.current.currentImportedFileName).toBe('project.srt');
    });

    it('should handle multiple imported files with different operations', () => {
      const { result } = renderHook(() => useProjectStore());
      const mockFiles = [mockFile1, mockFile2].map(f => ({ ...f }));
      
      act(() => {
        result.current.setImportedSubtitleFiles(mockFiles);
      });

      expect(result.current.importedSubtitleFiles).toHaveLength(2);

      // Remove one file
      act(() => {
        result.current.removeImportedSubtitleFile('test1.srt');
      });

      expect(result.current.importedSubtitleFiles).toHaveLength(1);
      expect(result.current.importedSubtitleFiles[0].fileName).toBe('test2.srt');

      // Add new file
      const mockFile3: MockImportedSubtitleFile = {
        fileName: 'test3.srt',
        subtitles: [{ id: 1, text: 'Test 3' }],
        frameRate: 25,
      };

      act(() => {
        result.current.addImportedSubtitleFile(mockFile3);
      });

      expect(result.current.importedSubtitleFiles).toHaveLength(2);
      expect(result.current.importedSubtitleFiles[1].fileName).toBe('test3.srt');
    });
  });

  describe('edge cases', () => {
    it('should handle empty and null values gracefully', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setProjectInfo(null);
        result.current.setSubtitleTracks([]);
        result.current.setImportedSubtitleFiles([]);
        result.current.setCurrentSubtitleSource(null);
        result.current.setCurrentImportedFileName(null);
      });

      expect(result.current.projectInfo).toBeNull();
      expect(result.current.subtitleTracks).toEqual([]);
      expect(result.current.importedSubtitleFiles).toEqual([]);
      expect(result.current.currentSubtitleSource).toBeNull();
      expect(result.current.currentImportedFileName).toBeNull();
    });

    it('should handle special characters in file names', () => {
      const { result } = renderHook(() => useProjectStore());
      const specialFileName = '测试文件-中文.srt';
      const specialFile: MockImportedSubtitleFile = {
        fileName: specialFileName,
        subtitles: [{ id: 1, text: 'Test' }],
        frameRate: 24,
      };
      
      act(() => {
        result.current.setImportedSubtitleFiles([specialFile]);
      });

      expect(result.current.importedSubtitleFiles[0].fileName).toBe(specialFileName);

      act(() => {
        result.current.removeImportedSubtitleFile(specialFileName);
      });

      expect(result.current.importedSubtitleFiles).toEqual([]);
    });
  });
});
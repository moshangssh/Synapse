import { renderHook, act } from '@testing-library/react';
import { useSubtitleStore } from '../useSubtitleStore';
import { useProjectStore } from '../useProjectStore';
import { useConnectionStore } from '../useConnectionStore';

// Performance benchmark tests for the new store architecture
describe('Store Performance Benchmarks', () => {
  describe('useSubtitleStore performance', () => {
    it('should handle large subtitle arrays efficiently', () => {
      const { result } = renderHook(() => useSubtitleStore());
      
      // Create large subtitle array (10,000 items)
      const largeSubtitleArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        startTimecode: `00:00:${Math.floor(i/60).toString().padStart(2, '0')}:${(i%60).toString().padStart(2, '0')}:00`,
        endTimecode: `00:00:${Math.floor((i+5)/60).toString().padStart(2, '0')}:${((i+5)%60).toString().padStart(2, '0')}:00`,
        text: `Subtitle ${i + 1}`,
        originalText: `Subtitle ${i + 1}`,
        isModified: false,
        diffs: [{ type: 'normal', value: `Subtitle ${i + 1}` }],
      }));
      
      const startTime = performance.now();
      
      act(() => {
        result.current.setSubtitles(largeSubtitleArray);
      });
      
      const endTime = performance.now();
      const setDuration = endTime - startTime;
      
      expect(setDuration).toBeLessThan(100); // Should complete within 100ms
      expect(result.current.subtitles).toHaveLength(10000);
    });

    it('should update single subtitle efficiently in large array', () => {
      const { result } = renderHook(() => useSubtitleStore());
      
      // Setup large subtitle array
      const largeSubtitleArray = Array.from({ length: 5000 }, (_, i) => ({
        id: i + 1,
        startTimecode: '00:00:01:00',
        endTimecode: '00:00:03:00',
        text: `Subtitle ${i + 1}`,
        originalText: `Subtitle ${i + 1}`,
        isModified: false,
        diffs: [{ type: 'normal', value: `Subtitle ${i + 1}` }],
      }));
      
      act(() => {
        result.current.setSubtitles(largeSubtitleArray);
      });
      
      const startTime = performance.now();
      
      act(() => {
        result.current.updateSubtitleText(2500, 'Updated Subtitle 2500');
      });
      
      const endTime = performance.now();
      const updateDuration = endTime - startTime;
      
      expect(updateDuration).toBeLessThan(50); // Should complete within 50ms
      expect(result.current.subtitles[2499].text).toBe('Updated Subtitle 2500');
      expect(result.current.subtitles[2499].isModified).toBe(true);
    });

    it('should get modified indices efficiently', () => {
      const { result } = renderHook(() => useSubtitleStore());
      
      // Setup subtitle array with every 10th item modified
      const testSubtitles = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        startTimecode: '00:00:01:00',
        endTimecode: '00:00:03:00',
        text: `Subtitle ${i + 1}`,
        originalText: `Subtitle ${i + 1}`,
        isModified: i % 10 === 0, // Every 10th item is modified
        diffs: [{ type: 'normal', value: `Subtitle ${i + 1}` }],
      }));
      
      act(() => {
        result.current.setSubtitles(testSubtitles);
      });
      
      const startTime = performance.now();
      
      // Call multiple times to test caching
      const firstCall = result.current.getModifiedSubtitleIndices();
      const secondCall = result.current.getModifiedSubtitleIndices();
      const thirdCall = result.current.getModifiedSubtitleIndices();
      
      const endTime = performance.now();
      const getDuration = endTime - startTime;
      
      expect(getDuration).toBeLessThan(10); // Should complete within 10ms
      expect(firstCall).toHaveLength(100); // 1000 items, every 10th modified
      expect(firstCall).toBe(secondCall); // Same reference (cached)
      expect(firstCall).toBe(thirdCall); // Same reference (cached)
    });
  });

  describe('useProjectStore performance', () => {
    it('should handle multiple imported files efficiently', () => {
      const { result } = renderHook(() => useProjectStore());
      
      // Create multiple large imported files
      const importedFiles = Array.from({ length: 50 }, (_, i) => ({
        fileName: `test_${i + 1}.srt`,
        subtitles: Array.from({ length: 100 }, (_, j) => ({
          id: j + 1,
          text: `File ${i + 1} Subtitle ${j + 1}`,
        })),
        frameRate: 24 + (i % 6), // Different frame rates
      }));
      
      const startTime = performance.now();
      
      act(() => {
        result.current.setImportedSubtitleFiles(importedFiles);
      });
      
      const endTime = performance.now();
      const setDuration = endTime - startTime;
      
      expect(setDuration).toBeLessThan(50); // Should complete within 50ms
      expect(result.current.importedSubtitleFiles).toHaveLength(50);
      expect(result.current.importedSubtitleFiles[0].subtitles).toHaveLength(100);
    });

    it('should add and remove files efficiently', () => {
      const { result } = renderHook(() => useProjectStore());
      
      // Clear store first
      act(() => {
        result.current.setImportedSubtitleFiles([]);
      });
      
      const testFile = {
        fileName: 'performance_test.srt',
        subtitles: Array.from({ length: 200 }, (_, i) => ({
          id: i + 1,
          text: `Performance test subtitle ${i + 1}`,
        })),
        frameRate: 30,
      };
      
      // Test adding
      const addStartTime = performance.now();
      act(() => {
        result.current.addImportedSubtitleFile(testFile);
      });
      const addEndTime = performance.now();
      const addDuration = addEndTime - addStartTime;
      
      expect(addDuration).toBeLessThan(20); // Should complete within 20ms
      expect(result.current.importedSubtitleFiles).toHaveLength(1);
      
      // Test removing
      const removeStartTime = performance.now();
      act(() => {
        result.current.removeImportedSubtitleFile('performance_test.srt');
      });
      const removeEndTime = performance.now();
      const removeDuration = removeEndTime - removeStartTime;
      
      expect(removeDuration).toBeLessThan(10); // Should complete within 10ms
      expect(result.current.importedSubtitleFiles).toHaveLength(0);
    });
  });

  describe('useConnectionStore performance', () => {
    it('should handle rapid state changes efficiently', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      const testUser = {
        name: 'Performance Test User',
        email: 'perf@test.com',
        avatar: 'https://example.com/avatar.jpg',
      };
      
      const testError = {
        message: 'Test error message',
        code: 'PERF_TEST',
        details: { test: true },
      };
      
      const startTime = performance.now();
      
      // Rapid state changes
      const statusChanges = ['connecting', 'connected', 'error', 'disconnected', 'standalone'];
      statusChanges.forEach((status) => {
        act(() => {
          result.current.setConnectionStatus(status);
        });
      });
      
      act(() => {
        result.current.setUserInfo(testUser);
      });
      
      act(() => {
        result.current.setErrorMessage(testError);
      });
      
      act(() => {
        result.current.setUserInfo(null);
      });
      
      act(() => {
        result.current.setErrorMessage(null);
      });
      
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      
      expect(totalDuration).toBeLessThan(50); // Should complete within 50ms
      expect(result.current.connectionStatus).toBe('standalone');
      expect(result.current.userInfo).toBeNull();
      expect(result.current.errorMessage).toBeNull();
    });
  });

  describe('cross-store performance', () => {
    it('should handle concurrent store operations efficiently', () => {
      const subtitleResult = renderHook(() => useSubtitleStore()).result;
      const projectResult = renderHook(() => useProjectStore()).result;
      const connectionResult = renderHook(() => useConnectionStore()).result;
      
      const startTime = performance.now();
      
      // Concurrent operations on all stores
      act(() => {
        // Update subtitle store
        const testSubtitles = Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          startTimecode: '00:00:01:00',
          endTimecode: '00:00:03:00',
          text: `Concurrent test ${i + 1}`,
          originalText: `Concurrent test ${i + 1}`,
          isModified: false,
          diffs: [{ type: 'normal', value: `Concurrent test ${i + 1}` }],
        }));
        subtitleResult.current.setSubtitles(testSubtitles);
        
        // Update project store
        const importedFiles = Array.from({ length: 5 }, (_, i) => ({
          fileName: `concurrent_${i + 1}.srt`,
          subtitles: [{ id: 1, text: `File ${i + 1} subtitle` }],
          frameRate: 24 + i,
        }));
        projectResult.current.setImportedSubtitleFiles(importedFiles);
        
        // Update connection store
        connectionResult.current.setConnectionStatus('connected');
        connectionResult.current.setUserInfo({
          name: 'Concurrent User',
          email: 'concurrent@test.com',
          avatar: 'https://example.com/avatar.jpg',
        });
      });
      
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      
      expect(totalDuration).toBeLessThan(100); // Should complete within 100ms
      
      // Verify all states are correct
      expect(subtitleResult.current.subtitles).toHaveLength(100);
      expect(projectResult.current.importedSubtitleFiles).toHaveLength(5);
      expect(connectionResult.current.connectionStatus).toBe('connected');
      expect(connectionResult.current.userInfo).toBeDefined();
    });
  });

  describe('memory efficiency', () => {
    it('should not leak memory with repeated operations', () => {
      const { result } = renderHook(() => useSubtitleStore());
      
      // Perform many operations
      const iterations = 100;
      const startMemory = performance.memory?.usedJSHeapSize || 0;
      
      for (let i = 0; i < iterations; i++) {
        act(() => {
          result.current.setSubtitles([{
            id: i + 1,
            startTimecode: '00:00:01:00',
            endTimecode: '00:00:03:00',
            text: `Memory test ${i + 1}`,
            originalText: `Memory test ${i + 1}`,
            isModified: false,
            diffs: [{ type: 'normal', value: `Memory test ${i + 1}` }],
          }]);
          
          result.current.updateSubtitleText(i + 1, `Updated memory test ${i + 1}`);
        });
      }
      
      const endMemory = performance.memory?.usedJSHeapSize || startMemory;
      const memoryIncrease = endMemory - startMemory;
      
      // This is a rough check - memory should not increase dramatically
      // In a real browser environment, this would be more meaningful
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
      
      // Clear the store
      act(() => {
        result.current.setSubtitles([]);
      });
      
      expect(result.current.subtitles).toHaveLength(0);
    });
  });
});
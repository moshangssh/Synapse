import { renderHook, act } from '@testing-library/react';
import { useTimelineNavigation } from '../useTimelineNavigation';
import { useConnectionStore } from '../../stores/useConnectionStore';
import { useProjectStore } from '../../stores/useProjectStore';

// Mock dependencies
vi.mock('../../stores/useConnectionStore');
vi.mock('../../stores/useProjectStore');
vi.mock('../useNotifier');

describe('useTimelineNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useNotifier
    const mockNotify = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    };
    
    // Mock useConnectionStore to return standalone mode
    (useConnectionStore as any).mockImplementation((selector) => {
      if (selector.toString().includes('connectionStatus')) {
        return 'standalone';
      }
      return vi.fn();
    });
    
    // Mock useProjectStore to return null source
    (useProjectStore as any).mockImplementation((selector) => {
      if (selector.toString().includes('currentSubtitleSource')) {
        return null;
      }
      return vi.fn();
    });
  });

  describe('setTimecode in standalone mode', () => {
    it('should skip API call when in standalone mode', async () => {
      // Mock fetch to spy on it
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);
      
      const { result } = renderHook(() => useTimelineNavigation());
      
      // Mock console.log to verify the message
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await act(async () => {
        await result.current.setTimecode('00:00:01:00', '00:00:03:00', 'start');
      });

      // Verify that console.log was called with standalone mode message
      expect(consoleSpy).toHaveBeenCalledWith(
        'Skipping timeline sync. Connection: standalone, Source: null. In: 00:00:01:00, Out: 00:00:03:00, Jump: start'
      );
      
      // Verify that no fetch was made
      expect(mockFetch).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      vi.unstubAllGlobals();
    });
  });

  describe('setTimecode with imported subtitles', () => {
    it('should skip API call when current source is imported subtitles', async () => {
      // Mock connected mode but imported source
      (useConnectionStore as any).mockImplementation((selector) => {
        if (selector.toString().includes('connectionStatus')) {
          return 'connected';
        }
        return vi.fn();
      });
      
      (useProjectStore as any).mockImplementation((selector) => {
        if (selector.toString().includes('currentSubtitleSource')) {
          return 'imported';
        }
        return vi.fn();
      });

      // Mock fetch to spy on it
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);
      
      const { result } = renderHook(() => useTimelineNavigation());
      
      // Mock console.log to verify message
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await act(async () => {
        await result.current.setTimecode('00:00:01:00', '00:00:03:00', 'start');
      });

      // Verify that console.log was called with skip message
      expect(consoleSpy).toHaveBeenCalledWith(
        'Skipping timeline sync. Connection: connected, Source: imported. In: 00:00:01:00, Out: 00:00:03:00, Jump: start'
      );
      
      // Verify that no fetch was made
      expect(mockFetch).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      vi.unstubAllGlobals();
    });
  });

  describe('setTimecode in connected mode', () => {
    it('should make API call when not in standalone mode', async () => {
      // Mock connected mode with davinci source
      (useConnectionStore as any).mockImplementation((selector) => {
        if (selector.toString().includes('connectionStatus')) {
          return 'connected';
        }
        return vi.fn();
      });
      
      (useProjectStore as any).mockImplementation((selector) => {
        if (selector.toString().includes('currentSubtitleSource')) {
          return 'davinci';
        }
        return vi.fn();
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
      });
      
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useTimelineNavigation());
      
      await act(async () => {
        await result.current.setTimecode('00:00:01:00', '00:00:03:00', 'start');
      });

      // Verify that fetch was called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            in_point: '00:00:01:00',
            out_point: '00:00:03:00',
            jump_to: 'start',
          }),
        })
      );
      
      vi.unstubAllGlobals();
    });
  });
});
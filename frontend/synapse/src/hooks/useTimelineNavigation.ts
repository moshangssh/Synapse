import { useCallback } from 'react';
import useNotifier from './useNotifier';
import { useDataStore } from '../stores/useDataStore';

type JumpTo = "start" | "end" | "middle";

export const useTimelineNavigation = () => {
  const notify = useNotifier();
  const connectionStatus = useDataStore((state) => state.connectionStatus);
  const currentSubtitleSource = useDataStore((state) => state.currentSubtitleSource);

  const setTimecode = useCallback(async (
    inPoint: string,
    outPoint: string,
    jumpTo: JumpTo
  ) => {
    // 在独立模式下，或者当前显示的是导入的字幕时，跳过达芬奇同步
    if (connectionStatus === 'standalone' || currentSubtitleSource === 'imported') {
      console.log(
        `Skipping timeline sync. Connection: ${connectionStatus}, Source: ${currentSubtitleSource}. In: ${inPoint}, Out: ${outPoint}, Jump: ${jumpTo}`
      );
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/v1/timeline/timecode`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            in_point: inPoint,
            out_point: outPoint,
            jump_to: jumpTo,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('API call failed');
      }

      console.log(
        `Successfully set timecode. In: ${inPoint}, Out: ${outPoint}, Jump: ${jumpTo}`
      );
    } catch (error) {
      console.error("Error setting timecode:", error);
      notify.error(`跳转失败: ${error}`);
    }
  }, [notify, connectionStatus, currentSubtitleSource]);

  return { setTimecode };
};
import { useCallback } from 'react';
import useNotifier from './useNotifier';
import { useConnectionStore } from '../stores/useConnectionStore';
import { useProjectStore } from '../stores/useProjectStore';
import { setTimecode as setTimecodeService } from '../services/timelineService';

type JumpTo = "start" | "end" | "middle";

export const useTimelineNavigation = () => {
  const notify = useNotifier();
  const connectionStatus = useConnectionStore((state) => state.connectionStatus);
  const currentSubtitleSource = useProjectStore((state) => state.currentSubtitleSource);

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
      await setTimecodeService(inPoint, outPoint, jumpTo);
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
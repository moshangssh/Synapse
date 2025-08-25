import { useCallback } from 'react';
import useNotifier from './useNotifier';

type JumpTo = "start" | "end" | "middle";

export const useTimelineNavigation = () => {
  const notify = useNotifier();

  const setTimecode = useCallback(async (
    inPoint: string,
    outPoint: string,
    jumpTo: JumpTo
  ) => {
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
  }, [notify]);

  return { setTimecode };
};
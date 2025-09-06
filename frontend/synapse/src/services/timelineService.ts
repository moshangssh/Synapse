import { API_BASE_URL, API_ENDPOINTS, handleApiError, handleNetworkError } from './apiConfig';

type JumpTo = "start" | "end" | "middle";

/**
 * 设置时间码
 * @param inPoint 入点时间码
 * @param outPoint 出点时间码
 * @param jumpTo 跳转位置
 * @returns Promise<void>
 */
export const setTimecode = async (
  inPoint: string,
  outPoint: string,
  jumpTo: JumpTo
): Promise<void> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.SET_TIMECODE}`,
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
      await handleApiError(response, '设置时间码失败');
    }

    console.log(
      `Successfully set timecode. In: ${inPoint}, Out: ${outPoint}, Jump: ${jumpTo}`
    );
  } catch (error) {
    console.error("Error setting timecode:", error);
    throw handleNetworkError(error, '设置时间码');
  }
};
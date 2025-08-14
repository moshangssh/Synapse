from schemas import SubtitleExportRequest
from timecode_utils import timecode_to_frames, frames_to_srt_timecode

def generate_srt_content(request: SubtitleExportRequest, base_frames: int = 0) -> str:
    """
    Generates a string in SRT format from a list of subtitle objects.
    """
    srt_blocks = []
    frame_rate = request.frameRate

    for index, subtitle in enumerate(request.subtitles, start=1):
        # 1. Reconstruct clean text from diffs
        clean_text = "".join([part.value for part in subtitle.diffs if part.type != 'removed'])

        # 2. Convert timecodes to relative frames
        start_frames = timecode_to_frames(subtitle.startTimecode, frame_rate) - base_frames
        end_frames = timecode_to_frames(subtitle.endTimecode, frame_rate) - base_frames

        # 3. Format frames back to SRT timecode
        start_srt_time = frames_to_srt_timecode(max(0, start_frames), frame_rate)
        end_srt_time = frames_to_srt_timecode(max(0, end_frames), frame_rate)

        # 4. Assemble the SRT block
        srt_block = f"{index}\n{start_srt_time} --> {end_srt_time}\n{clean_text}"
        srt_blocks.append(srt_block)

    # 5. Join all blocks with double newlines
    return "\n\n".join(srt_blocks)
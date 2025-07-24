# DaVinci Resolve Scripting API 核心功能研究报告

**日期:** 2025-07-23
**研究员:** 你的专属AI助手

## 1. 概述
本报告旨在阐明如何使用 DaVinci Resolve 的 Python Scripting API 来与软件进行交互，核心围绕连接实例、访问项目、时间线以及提取字幕数据等关键操作。所有信息均基于对 `/thesleepingsage/davinci-resolve-scripting-api` 文档的分析。

---

## 2. 关键问题解答

### 2.1 如何连接到 DaVinci Resolve 实例？
通过 `DaVinciResolveScript` 模块可以轻松连接到正在运行的 Resolve 实例。

- **核心函数:** `DaVinciResolveScript.scriptapp("Resolve")`
- **说明:** 此函数会返回 Resolve 的主应用程序对象。如果 Resolve 未运行或脚本无法连接，该对象将为 `None`。这是所有后续操作的入口点。

### 2.2 如何获取当前项目和活动时间线？
项目和时间线的访问是分层级的：`ProjectManager -> Project -> Timeline`。

- **步骤:**
    1.  **获取 ProjectManager:** `resolve.GetProjectManager()`
    2.  **获取当前 Project:** `projectManager.GetCurrentProject()`
    3.  **获取当前 Timeline:** `project.GetCurrentTimeline()`

### 2.3 如何访问时间线上的字幕轨道？
可以通过 `Timeline` 对象的方法来定位和查询字幕轨道。

- **步骤:**
    1.  **检查字幕轨道数量:** 使用 `timeline.GetTrackCount("subtitle")` 获取字幕轨道的总数。如果返回 `0`，则表示没有字幕轨道。
    2.  **获取轨道内容:** 使用 `timeline.GetItemListInTrack("subtitle", trackIndex)` 来获取指定索引（从1开始）的字幕轨道上的所有片段 (`TimelineItem`) 列表。

### 2.4 如何遍历字幕条目并提取信息？
遍历从字幕轨道获取的 `TimelineItem` 列表，并从每个 `item` 中提取所需数据。

- **数据提取方法:**
    - **开始/结束时间:**
        - `item.GetStart()`: 返回片段在时间线上的起始**帧号**。
        - `item.GetEnd()`: 返回片段在时间线上的结束**帧号**。
        - **注意:** API不直接返回格式化的时间码。需要获取时间线的帧率（`timeline.GetSetting('timelineFrameRate')`)，然后手动将帧数转换为 `HH:MM:SS:FF` 格式。
    - **字幕文本内容:**
        - API 没有直接提供 `GetText()` 之类的方法。最可靠的方式是通过 `item.GetProperty()`。
        - 调用 `item.GetProperty()` 会返回一个包含该片段所有属性的字典。字幕文本内容很可能存储在键如 `'Text'` 或 `'StyledText'` 的条目中。在实际应用中需要检查这个字典以确定准确的键名。

---

## 3. 综合代码示例
以下 Python 代码段整合了上述所有步骤，演示了如何连接 Resolve、获取数据并打印出字幕信息。

```python
import DaVinciResolveScript as dvr_script
import sys

def format_timecode(frame, frame_rate):
    """将帧数转换为 HH:MM:SS:FF 格式的时间码"""
    if frame_rate == 0:
        return "00:00:00:00"

    # Drop-frame timecode is complex, this is a simplified conversion for non-drop-frame
    # For full accuracy, a more robust library might be needed.
    fps_int = int(round(frame_rate))
    
    total_seconds = frame / frame_rate
    
    hours = int(total_seconds / 3600)
    minutes = int((total_seconds % 3600) / 60)
    seconds = int(total_seconds % 60)
    frames = int(frame % fps_int)

    return f"{hours:02d}:{minutes:02d}:{seconds:02d}:{frames:02d}"

def get_resolve_subtitles():
    """
    连接到 DaVinci Resolve 并提取当前时间线的字幕信息。
    """
    # 1. 连接到 DaVinci Resolve
    resolve = dvr_script.scriptapp("Resolve")
    if not resolve:
        print("错误：无法连接到 DaVinci Resolve。请确保 Resolve 正在运行。")
        sys.exit(1)

    # 2. 获取项目和时间线
    projectManager = resolve.GetProjectManager()
    project = projectManager.GetCurrentProject()
    if not project:
        print("错误：未找到当前打开的项目。")
        sys.exit(1)

    timeline = project.GetCurrentTimeline()
    if not timeline:
        print("错误：项目中没有活动的（当前）时间线。")
        sys.exit(1)
        
    print(f"成功连接到项目: '{project.GetName()}'")
    print(f"正在处理时间线: '{timeline.GetName()}'")

    # 获取帧率用于时间码转换
    try:
        frame_rate_str = timeline.GetSetting('timelineFrameRate')
        frame_rate = float(frame_rate_str.split()[0]) # '24 DF' -> '24'
    except (ValueError, IndexError):
        print("警告: 无法获取时间线帧率，时间码将以帧数显示。")
        frame_rate = 0

    # 3. 访问字幕轨道
    subtitle_track_count = timeline.GetTrackCount("subtitle")
    if subtitle_track_count == 0:
        print("信息：当前时间线上没有发现字幕轨道。")
        return []

    print(f"发现 {subtitle_track_count} 个字幕轨道。将从第一个轨道提取。")

    # 假设我们总是从第一个字幕轨道提取
    subtitle_items = timeline.GetItemListInTrack("subtitle", 1)
    if not subtitle_items:
        print("信息：字幕轨道1为空。")
        return []

    # 4. 遍历字幕条目并提取信息
    extracted_data = []
    print("\n--- 字幕提取结果 ---")
    for index, item in enumerate(subtitle_items):
        start_frame = item.GetStart()
        end_frame = item.GetEnd()
        
        # 尝试获取文本内容
        properties = item.GetProperty()
        # 文本内容通常在 'Text' 或 'StyledText' 键中
        text_content = properties.get('Text', '（未找到文本）')

        start_timecode = format_timecode(start_frame, frame_rate)
        end_timecode = format_timecode(end_frame, frame_rate)

        subtitle_entry = {
            "id": index + 1,
            "startTimecode": start_timecode,
            "endTimecode": end_timecode,
            "text": text_content,
            "startFrame": start_frame,
            "endFrame": end_frame
        }
        extracted_data.append(subtitle_entry)
        
        print(f"条目 {subtitle_entry['id']}:")
        print(f"  时间码: {start_timecode} -> {end_timecode}")
        print(f"  文本: {text_content}")

    return extracted_data

if __name__ == "__main__":
    get_resolve_subtitles()

---
**Topic:** DaVinci Resolve Scripting API Connection
**Date:** 2025-07-23
**Key takeaway:** The `DaVinciResolveScript.py` file provided in the official scripting SDK is a dynamic loader, not the direct API implementation. The actual API, including the crucial `scriptapp` object, is located within the `fusionscript` module (`fusionscript.dll` on Windows, `fusionscript.so` on macOS/Linux).

**Correct Usage:**

To reliably connect to DaVinci Resolve, you should bypass the `DaVinciResolveScript.py` loader and import `fusionscript` directly.

**Example:**

```python
try:
    import fusionscript as dvr_script
    resolve = dvr_script.scriptapp("Resolve")
except ImportError:
    # Handle cases where fusionscript is not in the Python path
    print("fusionscript module not found.")
```

**Note:** The official `README.txt` provides a misleading example that suggests `scriptapp` is an attribute of `DaVinciResolveScript`. This is incorrect for the standard installation. Always rely on importing `fusionscript` for a stable connection.

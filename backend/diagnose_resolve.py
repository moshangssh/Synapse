import sys
import os
import logging
import pprint
import json

# 将 backend 目录添加到 sys.path 以便导入 resolve_utils
# This allows the script to be run directly from the backend directory or the root directory.
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Now we can import from resolve_utils
try:
    from resolve_utils import _get_resolve_bmd
except ImportError:
    print("Error: Could not import from 'resolve_utils'. Make sure the file exists and is in the correct path.")
    sys.exit(1)

def diagnose_subtitle_properties():
    """
    Connects to DaVinci Resolve, retrieves the full property dictionary of the
    first subtitle item on the timeline, and prints it.
    """
    logging.info("Starting subtitle diagnosis...")

    dvr_script = _get_resolve_bmd()
    if not dvr_script:
        logging.error("DaVinci Resolve Scripting API module could not be loaded. Diagnosis cannot continue.")
        print("错误: 无法加载 DaVinci Resolve 脚本模块。请检查 Resolve 安装是否正确。")
        return

    # --- Connection Logic (reused from resolve_utils.py) ---
    try:
        resolve = dvr_script.scriptapp("Resolve")
        if not resolve:
            logging.error("Failed to connect to DaVinci Resolve. Is it running?")
            print("错误: 无法连接到 DaVinci Resolve。请确保 Resolve 正在运行。")
            return
        logging.info("Successfully connected to DaVinci Resolve.")
    except Exception as e:
        logging.error(f"An unknown error occurred while connecting to Resolve: {e}", exc_info=True)
        print(f"错误: 连接到 DaVinci Resolve 时发生未知错误: {e}")
        return

    # --- Project and Timeline Logic ---
    projectManager = resolve.GetProjectManager()
    project = projectManager.GetCurrentProject()
    if not project:
        logging.warning("No project is currently open in DaVinci Resolve.")
        print("提示: DaVinci Resolve 中没有打开的项目。")
        return

    timeline = project.GetCurrentTimeline()
    if not timeline:
        logging.warning(f"Project '{project.GetName()}' has no active timeline.")
        print(f"提示: 项目 '{project.GetName()}' 中没有活动的（当前）时间线。")
        return

    logging.info(f"Successfully accessed Project: '{project.GetName()}' and Timeline: '{timeline.GetName()}'")

    # --- Subtitle Track and Item Logic ---
    subtitle_track_count = timeline.GetTrackCount("subtitle")
    if subtitle_track_count == 0:
        logging.info("The current timeline does not contain any subtitle tracks.")
        print("提示: 当前时间线上没有字幕轨道。")
        return

    logging.info(f"Found {subtitle_track_count} subtitle track(s). Checking the first one.")

    # Get items from the first subtitle track (index 1)
    subtitle_items = timeline.GetItemListInTrack("subtitle", 1)
    if not subtitle_items:
        logging.info("Subtitle track 1 is empty.")
        print("提示: 第一个字幕轨道是空的，没有字幕内容。")
        return

    logging.info(f"Found {len(subtitle_items)} items in the first subtitle track.")

    # --- Get and Print Properties of the First Item ---
    # Get the first item from the list
    first_item = subtitle_items
    if not first_item:
        logging.warning("The first subtitle item is invalid or None.")
        print("提示: 字幕列表中的第一个项目无效。")
        return

    logging.info(f"Retrieving properties for the first subtitle item...")

    try:
        # Now, GetProperty is called on a single item object
        properties = first_item.GetProperty()

        if not properties or not isinstance(properties, dict):
            logging.warning("GetProperty() returned an empty or invalid dictionary.")
            print("提示: 第一个字幕条目的属性为空或无效。")
            return

        print("\n" + "="*50)
        print("第一个字幕项的完整属性字典:")
        print("="*50)
        
        # Use pprint for readable dictionary output
        pprint.pprint(properties)

        # Also print as JSON for easy parsing if needed
        print("\n" + "="*50)
        print("JSON 格式的属性 (用于程序解析):")
        print("="*50)
        try:
            print(json.dumps(properties, indent=4, ensure_ascii=False))
        except TypeError as e:
            print(f"无法将属性序列化为JSON: {e}")
            print("部分属性可能不是JSON兼容的类型。")


        logging.info("Successfully retrieved and printed subtitle properties.")

    except Exception as e:
        logging.error(f"An error occurred while calling GetProperty(): {e}", exc_info=True)
        print(f"错误: 在获取字幕属性时发生错误: {e}")


if __name__ == "__main__":
    # Configure basic logging for the diagnosis script
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(module)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    diagnose_subtitle_properties()
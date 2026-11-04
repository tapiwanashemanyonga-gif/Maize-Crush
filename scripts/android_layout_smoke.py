#!/usr/bin/env python3
"""Exercise the real WebView crop board on Android emulators using ADB/UIAutomator."""

from __future__ import annotations

import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"
PACKAGE = "com.maizecrush.zimbabweharvest"
ACTIVITY = PACKAGE + "/.MainActivity"
REMOTE_XML = "/sdcard/maize-crush-uiautomator.xml"
REMOTE_PNG = "/sdcard/maize-crush-screen.png"
CELL_RE = re.compile(r"\brow\s+([1-8]),\s*column\s+([1-8])\b", re.I)
BOUNDS_RE = re.compile(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]")
SIZE_RE = re.compile(r"(\d+)x(\d+)")


@dataclass(frozen=True)
class Cell:
    crop: str
    bounds: tuple[int, int, int, int]


def run_adb(*args: str, timeout: int = 45) -> str:
    result = subprocess.run(
        ["adb", *map(str, args)],
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if result.returncode:
        raise RuntimeError(
            "adb " + " ".join(map(str, args)) + " failed: "
            + (result.stderr.strip() or result.stdout.strip())
        )
    return result.stdout.strip()


def parse_bounds(value: str) -> Optional[tuple[int, int, int, int]]:
    match = BOUNDS_RE.fullmatch((value or "").strip())
    return tuple(map(int, match.groups())) if match else None


def parse_hierarchy(xml_text: str):
    root = ET.fromstring(xml_text)
    cells: dict[tuple[int, int], Cell] = {}
    texts: set[str] = set()
    for node in root.iter():
        text = node.attrib.get("text", "").strip()
        description = node.attrib.get("content-desc", "").strip()
        if text:
            texts.add(text)
        if description:
            texts.add(description)
        label = description if CELL_RE.search(description) else text
        match = CELL_RE.search(label)
        if not match:
            continue
        row, column = map(int, match.groups())
        crop = label[:match.start()].strip(" ,") or "unknown crop"
        bounds = parse_bounds(node.attrib.get("bounds", ""))
        if bounds:
            cells[(row, column)] = Cell(crop, bounds)
    return root, cells, texts


def is_visible(cell: Cell, width: int, height: int) -> bool:
    x1, y1, x2, y2 = cell.bounds
    return (
        x1 >= 0 and y1 >= 0 and x2 <= width and y2 <= height
        and x2 > x1 and y2 > y1 and x1 < width and y1 < height
    )


def visible_cells(cells: dict[tuple[int, int], Cell], width: int, height: int):
    return {key: cell for key, cell in cells.items() if is_visible(cell, width, height)}


def fully_visible_cells(
    cells: dict[tuple[int, int], Cell], width: int, height: int
):
    """Exclude cells whose accessibility bounds are clipped by the viewport."""
    result = {}
    for key, cell in cells.items():
        x1, y1, x2, y2 = cell.bounds
        if x1 > 0 and y1 > 0 and x2 < width and y2 < height:
            result[key] = cell
    return result


def find_diagonal_chain(
    cells: dict[tuple[int, int], Cell], width: int, height: int
):
    visible = visible_cells(cells, width, height)
    for row in range(1, 7):
        for column in range(1, 9):
            for delta in (-1, 1):
                path = [
                    (row, column),
                    (row + 1, column + delta),
                    (row + 2, column + 2 * delta),
                ]
                if not all(1 <= key[1] <= 8 and key in visible for key in path):
                    continue
                crops = [visible[key].crop for key in path]
                if crops[0] and crops[0] == crops[1] == crops[2]:
                    return path
    return None


def find_mismatch_pair(
    cells: dict[tuple[int, int], Cell], width: int, height: int
) -> Optional[tuple[tuple[int, int], tuple[int, int]]]:
    visible = visible_cells(cells, width, height)
    for row in range(1, 9):
        for column in range(1, 9):
            first = (row, column)
            if first not in visible:
                continue
            for second in ((row, column + 1), (row + 1, column)):
                if second in visible and visible[first].crop != visible[second].crop:
                    return first, second
    return None


def validate_visible_geometry(
    cells: dict[tuple[int, int], Cell], width: int, height: int
) -> int:
    visible = visible_cells(cells, width, height)
    if len(visible) < 8:
        raise AssertionError(
            f"Only {len(visible)} crop tiles are visible in the accessibility tree."
        )
    # UIAutomator clips partially off-screen nodes to the viewport edge. Those
    # truncated bounds are not the real tile dimensions, so validate shape only
    # on cells fully visible in this particular scroll position.
    fully_visible = fully_visible_cells(cells, width, height)
    if len(fully_visible) < 8:
        raise AssertionError(
            f"Only {len(fully_visible)} fully visible crop tiles are available "
            "for geometry checks; scroll the board into view."
        )
    for cell in fully_visible.values():
        x1, y1, x2, y2 = cell.bounds
        tile_width, tile_height = x2 - x1, y2 - y1
        if tile_width <= 0 or tile_height <= 0:
            raise AssertionError("A crop tile has empty screen bounds.")
        ratio = tile_width / tile_height
        if not 0.70 <= ratio <= 1.30:
            raise AssertionError(f"Crop tile is not approximately square: {ratio:.2f}.")

    for row in range(1, 9):
        row_cells = [(column, fully_visible[(row, column)]) for column in range(1, 9)
                     if (row, column) in fully_visible]
        row_cells.sort(key=lambda item: item[0])
        centers = [(cell.bounds[0] + cell.bounds[2]) / 2 for _, cell in row_cells]
        if any(left >= right for left, right in zip(centers, centers[1:])):
            raise AssertionError(f"Crop columns are out of order in row {row}.")

    for column in range(1, 9):
        column_cells = [(row, fully_visible[(row, column)]) for row in range(1, 9)
                        if (row, column) in fully_visible]
        column_cells.sort(key=lambda item: item[0])
        centers = [(cell.bounds[1] + cell.bounds[3]) / 2 for _, cell in column_cells]
        if any(top >= bottom for top, bottom in zip(centers, centers[1:])):
            raise AssertionError(f"Crop rows are out of order in column {column}.")
    return len(visible)


def normalized(value: str) -> str:
    return (value or "").replace("’", "'").replace("‘", "'").strip().casefold()


def button_center(root, needle: str, width: int, height: int):
    needle = normalized(needle)
    for node in root.iter():
        text = node.attrib.get("text", "").strip()
        description = node.attrib.get("content-desc", "").strip()
        label = normalized(text or description)
        bounds = parse_bounds(node.attrib.get("bounds", ""))
        clickable = node.attrib.get("clickable", "").lower() == "true"
        class_name = node.attrib.get("class", "").lower()
        if needle in label and bounds and (clickable or "button" in class_name):
            if is_visible(Cell(label, bounds), width, height):
                x1, y1, x2, y2 = bounds
                return (x1 + x2) // 2, (y1 + y2) // 2
    return None


def screen_size() -> tuple[int, int]:
    output = run_adb("shell", "wm", "size")
    sizes = SIZE_RE.findall(output)
    if not sizes:
        raise RuntimeError("Could not read emulator display size: " + output)
    return tuple(map(int, sizes[-1]))


def dump_hierarchy():
    ARTIFACTS.mkdir(exist_ok=True)
    run_adb("shell", "rm", "-f", REMOTE_XML, timeout=10)
    last_output = ""
    hierarchy_ready = False
    for attempt in range(4):
        try:
            last_output = run_adb(
                "shell", "uiautomator", "dump", "--compressed", REMOTE_XML, timeout=30
            )
        except RuntimeError as error:
            last_output = str(error)
        try:
            run_adb("shell", "test", "-s", REMOTE_XML, timeout=10)
            hierarchy_ready = True
            break
        except RuntimeError as error:
            last_output += " | remote-file check: " + str(error)
        print(
            f"UIAutomator dump attempt {attempt + 1}/4 did not create a readable "
            f"hierarchy file. Output: {last_output or '(no output)'}"
        )
        time.sleep(1.5)
    if not hierarchy_ready:
        raise RuntimeError(
            "UIAutomator did not create a readable hierarchy file after four "
            f"attempts. Last output: {last_output or '(no output)'}"
        )
    local = ARTIFACTS / "uiautomator-latest.xml"
    run_adb("pull", REMOTE_XML, str(local), timeout=30)
    return parse_hierarchy(local.read_text(encoding="utf-8"))


def save_screenshot(name: str) -> bool:
    """Capture a diagnostic image without failing valid gameplay checks if ADB flakes."""
    ARTIFACTS.mkdir(exist_ok=True)
    for attempt in range(2):
        try:
            run_adb("wait-for-device", timeout=15)
            run_adb("shell", "screencap", "-p", REMOTE_PNG, timeout=20)
            run_adb("pull", REMOTE_PNG, str(ARTIFACTS / name), timeout=20)
            return True
        except (RuntimeError, subprocess.TimeoutExpired) as error:
            print(
                f"Screenshot {name} unavailable (attempt {attempt + 1}/2): {error}",
                file=sys.stderr,
            )
            time.sleep(1)
    print(f"Continuing without optional screenshot: {name}", file=sys.stderr)
    return False


def assert_running() -> None:
    if not run_adb("shell", "pidof", PACKAGE):
        raise AssertionError("Maize Crush process is not running.")
    activities = run_adb("shell", "dumpsys", "activity", "activities")
    if ACTIVITY not in activities:
        raise AssertionError("Maize Crush MainActivity is not the resumed activity.")


def tap(point: tuple[int, int]) -> None:
    run_adb("shell", "input", "tap", str(point[0]), str(point[1]))
    time.sleep(0.45)


def dismiss_tutorial(width: int, height: int) -> None:
    deadline = time.time() + 30
    last_texts: set[str] = set()
    while time.time() < deadline:
        root, cells, texts = dump_hierarchy()
        last_texts = texts
        tutorial_visible = any(
            "how to harvest" in normalized(text) for text in texts
        )
        if tutorial_visible:
            point = button_center(root, "let's harvest", width, height)
            if point:
                tap(point)
                time.sleep(0.8)
                _, next_cells, next_texts = dump_hierarchy()
                if not any(
                    "how to harvest" in normalized(text) for text in next_texts
                ):
                    print("Dismissed first-run tutorial using its accessible button.")
                    return
                print("Tutorial remains visible after the first tap; retrying its start button.")
            else:
                print("Tutorial is visible; waiting for its start button to enter the accessibility tree.")
        elif (
            any("level 1" in normalized(text) for text in texts)
            or len(cells) >= 8
        ):
            print("Game board is accessible; no first-run tutorial is open.")
            return
        time.sleep(0.5)
    summary = ", ".join(sorted(last_texts)[:12]) or "(no accessible text)"
    raise AssertionError(
        "Android UI did not expose the first-run tutorial or Level 1 board "
        f"within 30 seconds. Last accessible text: {summary}"
    )


def scroll_gutter_x(width: int) -> int:
    # Stay clear of both Android edge-gesture zones and the crop tiles.
    return max(24, width - 24)


def scroll_forward(width: int, height: int) -> None:
    # Swipe in the outer right gutter, outside the board and Android edge zone.
    x = scroll_gutter_x(width)
    run_adb(
        "shell", "input", "swipe", str(x), str(int(height * 0.78)),
        str(x), str(int(height * 0.22)), "350"
    )
    time.sleep(0.25)


def scroll_backward(width: int, height: int) -> None:
    x = scroll_gutter_x(width)
    run_adb(
        "shell", "input", "swipe", str(x), str(int(height * 0.22)),
        str(x), str(int(height * 0.78)), "350"
    )
    time.sleep(0.25)


def reset_scroll_top(width: int, height: int) -> None:
    for _ in range(8):
        scroll_backward(width, height)


def collect_board(width: int, height: int):
    reset_scroll_top(width, height)
    snapshots = []
    all_cells: dict[tuple[int, int], Cell] = {}
    all_texts: set[str] = set()
    last_index = 0
    for index in range(14):
        root, cells, texts = dump_hierarchy()
        snapshots.append((index, root, cells, texts))
        all_cells.update(cells)
        all_texts.update(texts)
        last_index = index
        has_level = any("level 1" in normalized(text) for text in all_texts)
        has_objective = any("harvest score" in normalized(text) for text in all_texts)
        if len(all_cells) == 64 and has_level and has_objective:
            break
        scroll_forward(width, height)
    if len(all_cells) != 64:
        raise AssertionError(
            f"Expected 64 accessible crop cells; found {len(all_cells)} unique cells."
        )
    if not any("level 1" in normalized(text) for text in all_texts):
        raise AssertionError("The current level label is missing from the UI.")
    if not any("harvest score" in normalized(text) for text in all_texts):
        raise AssertionError("The Level 1 objective card is missing from the UI.")
    best = max(
        snapshots,
        key=lambda item: (
            len(fully_visible_cells(item[2], width, height)),
            len(visible_cells(item[2], width, height)),
        ),
    )
    visible_count = validate_visible_geometry(best[2], width, height)
    print(
        f"Rendered board verified: 64 unique crop cells; "
        f"{visible_count} visible in one viewport; Level 1 objective is present."
    )
    return snapshots, all_cells, all_texts, last_index


def has_moves_value(root, expected: int) -> bool:
    nodes = list(root.iter())
    parent_map = {child: parent for parent in nodes for child in list(parent)}
    expected_text = str(expected)
    for node in nodes:
        label = normalized(
            node.attrib.get("text", "") + " " + node.attrib.get("content-desc", "")
        )
        if "moves left" not in label:
            continue
        scope = parent_map.get(node, root)
        for child in scope.iter():
            if (
                child.attrib.get("text", "").strip() == expected_text
                or child.attrib.get("content-desc", "").strip() == expected_text
            ):
                return True
    texts = {
        value.strip()
        for node in nodes
        for value in (node.attrib.get("text", ""), node.attrib.get("content-desc", ""))
        if value.strip()
    }
    return "moves left" in {normalized(value) for value in texts} and expected_text in texts


def find_path_snapshot(snapshots, width: int, height: int):
    for index, root, cells, texts in snapshots:
        path = find_diagonal_chain(cells, width, height)
        if path:
            return index, path
    return None


def tap_button_anywhere(needle: str, width: int, height: int) -> bool:
    reset_scroll_top(width, height)
    for _ in range(12):
        root, _, _ = dump_hierarchy()
        point = button_center(root, needle, width, height)
        if point:
            tap(point)
            return True
        scroll_forward(width, height)
    return False


def ensure_diagonal_path(width: int, height: int):
    for attempt in range(6):
        snapshots, _, _, last_index = collect_board(width, height)
        path_snapshot = find_path_snapshot(snapshots, width, height)
        if path_snapshot:
            snapshot_index, _ = path_snapshot
            for _ in range(max(0, last_index - snapshot_index)):
                scroll_backward(width, height)
            root, cells, _ = dump_hierarchy()
            path = find_diagonal_chain(cells, width, height)
            if path:
                return root, cells, path
        if attempt == 5 or not tap_button_anywhere("fresh field", width, height):
            break
        print(f"No straight diagonal triple on field {attempt + 1}; generating a fresh field.")
    raise AssertionError("Could not find a visible three-crop diagonal connection after six fields.")


def cell_center(cell: Cell) -> tuple[int, int]:
    x1, y1, x2, y2 = cell.bounds
    return (x1 + x2) // 2, (y1 + y2) // 2


def swipe_cells(cells: dict[tuple[int, int], Cell], path, duration: int = 650) -> None:
    start = cell_center(cells[path[0]])
    end = cell_center(cells[path[-1]])
    run_adb(
        "shell", "input", "swipe",
        str(start[0]), str(start[1]), str(end[0]), str(end[1]), str(duration)
    )


def find_mismatch_snapshot(snapshots, width: int, height: int):
    for index, root, cells, texts in snapshots:
        pair = find_mismatch_pair(cells, width, height)
        if pair:
            return index, pair
    return None


def verify_gestures(width: int, height: int) -> None:
    root, cells, path = ensure_diagonal_path(width, height)
    crops = [cells[key].crop for key in path]
    if not (crops[0] == crops[1] == crops[2]):
        raise AssertionError("The selected diagonal gesture is not a matching-crop path.")
    swipe_cells(cells, path)
    time.sleep(2.5)

    for _ in range(8):
        scroll_backward(width, height)
    snapshots, board_after_match, _, last_index = collect_board(width, height)
    if not any(has_moves_value(item[1], 19) for item in snapshots):
        raise AssertionError("A valid diagonal connect did not reduce moves from 20 to 19.")
    print("Diagonal connect gesture accepted: the move counter decreased from 20 to 19.")
    save_screenshot("after-diagonal-connect.png")

    mismatch_snapshot = find_mismatch_snapshot(snapshots, width, height)
    if not mismatch_snapshot:
        raise AssertionError("Could not find two visible neighbouring crops of different types.")
    snapshot_index, _ = mismatch_snapshot
    for _ in range(max(0, last_index - snapshot_index)):
        scroll_backward(width, height)
    _, cells_before, _ = dump_hierarchy()
    pair = find_mismatch_pair(cells_before, width, height)
    if not pair:
        raise AssertionError("The mismatched neighbouring pair moved out of view.")
    first, second = pair
    before = (cells_before[first].crop, cells_before[second].crop)
    swipe_cells(cells_before, [first, second], duration=400)
    time.sleep(0.8)

    for _ in range(8):
        scroll_backward(width, height)
    after_snapshots, board_after_invalid, _, _ = collect_board(width, height)
    if not any(has_moves_value(item[1], 19) for item in after_snapshots):
        raise AssertionError("A mismatched two-crop drag incorrectly consumed a move.")
    after_first = board_after_invalid.get(first)
    after_second = board_after_invalid.get(second)
    if not after_first or not after_second:
        raise AssertionError("The two tested crop cells disappeared from the board.")
    after = (after_first.crop, after_second.crop)
    if before != after:
        raise AssertionError(
            "A mismatched drag changed crop positions; tile swapping is not allowed."
        )
    print("No-swap rule verified: mismatched drag consumed no move and changed no crop.")
    save_screenshot("after-no-swap-check.png")


def assert_layout_phase(name: str) -> None:
    width, height = screen_size()
    snapshots, all_cells, all_texts, _ = collect_board(width, height)
    if len(all_cells) != 64:
        raise AssertionError(f"{name}: expected 64 crop cells, found {len(all_cells)}.")
    best = max(
        snapshots,
        key=lambda item: len(visible_cells(item[2], width, height))
    )
    visible_count = validate_visible_geometry(best[2], width, height)
    if not any("level 1" in normalized(text) for text in all_texts):
        raise AssertionError(f"{name}: level label is not accessible.")
    if not any("harvest score" in normalized(text) for text in all_texts):
        raise AssertionError(f"{name}: objective card is not accessible.")
    print(
        f"{name}: 64 crop cells, {visible_count} visible, square tile bounds "
        f"and ordered 8×8 grid verified at {width}×{height}."
    )
    save_screenshot(name + ".png")


def set_orientation(rotation: int, name: str) -> None:
    run_adb("shell", "settings", "put", "system", "accelerometer_rotation", "0")
    run_adb("shell", "settings", "put", "system", "user_rotation", str(rotation))
    time.sleep(1.5)
    assert_running()
    assert_layout_phase(name)


def check_crashes() -> None:
    logs = run_adb("logcat", "-d", "-t", "3000")
    if "FATAL EXCEPTION" in logs and PACKAGE in logs:
        raise AssertionError("Android logcat contains an app-specific fatal exception.")


def main() -> int:
    ARTIFACTS.mkdir(exist_ok=True)
    width, height = screen_size()
    run_adb("shell", "settings", "put", "system", "accelerometer_rotation", "0")
    run_adb("shell", "settings", "put", "system", "user_rotation", "0")
    time.sleep(1.0)
    assert_running()
    dismiss_tutorial(width, height)
    snapshots, _, _, _ = collect_board(width, height)
    if not any(has_moves_value(item[1], 20) for item in snapshots):
        raise AssertionError("A fresh Level 1 round should begin with 20 moves.")
    save_screenshot("initial-board.png")
    verify_gestures(width, height)
    set_orientation(1, "landscape")
    set_orientation(0, "portrait")
    run_adb("shell", "input", "keyevent", "KEYCODE_HOME")
    time.sleep(1.0)
    run_adb("shell", "am", "start", "-W", "-n", ACTIVITY)
    time.sleep(1.0)
    assert_running()
    assert_layout_phase("resume")
    check_crashes()
    print(
        "PASS: rendered 8×8 board and objective, diagonal matching drag, "
        "no-swap mismatch, landscape/portrait layout, and app resume."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print("ANDROID UI SMOKE FAILURE: " + str(error), file=sys.stderr)
        try:
            save_screenshot("failure.png")
        except Exception as capture_error:
            print("Could not capture failure screenshot: " + str(capture_error), file=sys.stderr)
        raise

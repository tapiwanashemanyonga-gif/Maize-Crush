import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch

from scripts import android_layout_smoke as smoke

from scripts.android_layout_smoke import (
    button_center,
    dismiss_tutorial,
    fully_visible_cells,
    dump_hierarchy,
    find_diagonal_chain,
    find_mismatch_pair,
    has_moves_value,
    parse_hierarchy,
    validate_visible_geometry,
)


def fixture_xml(crop_overrides=None):
    crop_overrides = crop_overrides or {}
    nodes = []
    for row in range(1, 9):
        for column in range(1, 9):
            crop = crop_overrides.get((row, column), "Crop" + str(row) + "_" + str(column))
            x1 = 10 + (column - 1) * 40
            y1 = 100 + (row - 1) * 40
            nodes.append(
                '<node text="" content-desc="'
                + crop
                + ', row '
                + str(row)
                + ', column '
                + str(column)
                + '" bounds="['
                + str(x1)
                + ","
                + str(y1)
                + "]["
                + str(x1 + 36)
                + ","
                + str(y1 + 36)
                + ']" />'
            )
    return "<hierarchy>" + "".join(nodes) + "</hierarchy>"


class AndroidLayoutSmokeTests(unittest.TestCase):
    def test_parser_finds_all_64_accessible_crop_cells(self):
        overrides = {(1, 1): "Maize", (2, 2): "Maize", (3, 3): "Maize"}
        _, cells, _ = parse_hierarchy(fixture_xml(overrides))
        self.assertEqual(len(cells), 64)
        self.assertEqual(cells[(1, 1)].crop, "Maize")
        self.assertEqual(cells[(3, 3)].crop, "Maize")

    def test_diagonal_chain_requires_three_matching_visible_cells(self):
        overrides = {(1, 1): "Maize", (2, 2): "Maize", (3, 3): "Maize"}
        _, cells, _ = parse_hierarchy(fixture_xml(overrides))
        self.assertEqual(
            find_diagonal_chain(cells, 400, 500),
            [(1, 1), (2, 2), (3, 3)],
        )

    def test_diagonal_chain_rejects_a_mixed_crop_path(self):
        overrides = {(1, 1): "Maize", (2, 2): "Tomato", (3, 3): "Maize"}
        _, cells, _ = parse_hierarchy(fixture_xml(overrides))
        self.assertIsNone(find_diagonal_chain(cells, 400, 500))

    def test_mismatch_pair_uses_adjacent_different_crops(self):
        overrides = {(1, 1): "Maize", (1, 2): "Tomato"}
        _, cells, _ = parse_hierarchy(fixture_xml(overrides))
        self.assertEqual(find_mismatch_pair(cells, 400, 500), ((1, 1), (1, 2)))

    def test_visible_grid_geometry_accepts_square_ordered_tiles(self):
        _, cells, _ = parse_hierarchy(fixture_xml())
        self.assertEqual(validate_visible_geometry(cells, 400, 500), 64)

    def test_fully_visible_cells_excludes_viewport_clipped_accessibility_bounds(self):
        _, cells, _ = parse_hierarchy(fixture_xml())
        clipped = cells[(1, 1)]
        cells[(1, 1)] = smoke.Cell(
            clipped.crop, (clipped.bounds[0], clipped.bounds[1],
                           clipped.bounds[2], 500)
        )
        full = fully_visible_cells(cells, 400, 500)
        self.assertNotIn((1, 1), full)
        self.assertEqual(len(full), 63)

    def test_geometry_validation_ignores_only_partially_visible_tile_bounds(self):
        _, cells, _ = parse_hierarchy(fixture_xml())
        clipped = cells[(1, 1)]
        cells[(1, 1)] = smoke.Cell(
            clipped.crop, (clipped.bounds[0], clipped.bounds[1],
                           clipped.bounds[2], 500)
        )
        self.assertEqual(validate_visible_geometry(cells, 400, 500), 64)

    def test_moves_counter_is_read_from_the_moves_left_stat(self):
        xml = (
            '<hierarchy><node text="MOVES LEFT">'
            '<node text="20" bounds="[0,0][20,20]" />'
            '</node></hierarchy>'
        )
        root, _, _ = parse_hierarchy(xml)
        self.assertTrue(has_moves_value(root, 20))
        self.assertFalse(has_moves_value(root, 19))

    def test_tutorial_button_is_located_by_accessible_text_and_bounds(self):
        xml = (
            '<hierarchy><node class="android.widget.Button" clickable="true" '
            'text="Let’s harvest →" bounds="[100,200][300,260]" /></hierarchy>'
        )
        root, _, _ = parse_hierarchy(xml)
        self.assertEqual(button_center(root, "let's harvest", 400, 800), (200, 230))


    def test_hierarchy_dump_retries_when_android_has_not_written_the_xml_yet(self):
        outputs = iter([
            "",
            "missing",
            "UI hierarchy dumped to: /sdcard/maize-crush-uiautomator.xml",
            "ready",
        ])

        def fake_run_adb(*args, timeout=45):
            if args[:3] == ("shell", "rm", "-f"):
                return ""
            if args[:3] == ("shell", "uiautomator", "dump"):
                return next(outputs)
            if args[:2] == ("shell", "test"):
                result = next(outputs)
                if result == "missing":
                    raise RuntimeError("remote hierarchy file not found")
                return ""
            if args[0] == "pull":
                Path(args[-1]).write_text("<hierarchy />", encoding="utf-8")
                return ""
            raise AssertionError("Unexpected adb command: " + repr(args))

        with tempfile.TemporaryDirectory() as directory:
            with patch.object(smoke, "ARTIFACTS", Path(directory)):
                with patch.object(smoke, "run_adb", side_effect=fake_run_adb):
                    with patch.object(smoke.time, "sleep"):
                        root, cells, texts = dump_hierarchy()
        self.assertEqual(root.tag, "hierarchy")
        self.assertEqual(cells, {})
        self.assertEqual(texts, set())


    def test_tutorial_waits_for_webview_accessibility_before_tapping_start(self):
        empty = parse_hierarchy("<hierarchy />")
        tutorial = parse_hierarchy(
            '<hierarchy><node text="How to harvest" />'
            '<node class="android.widget.Button" clickable="true" '
            'text="Let’s harvest →" bounds="[100,200][300,260]" /></hierarchy>'
        )
        board = parse_hierarchy(
            '<hierarchy><node text="Level 1 · Maize Fields" /></hierarchy>'
        )
        with patch.object(smoke, "dump_hierarchy", side_effect=[
            empty, tutorial, board
        ]):
            with patch.object(smoke, "tap") as tap:
                with patch.object(smoke.time, "sleep"):
                    dismiss_tutorial(400, 800)
        tap.assert_called_once_with((200, 230))

    def test_tutorial_wait_fails_clearly_when_no_game_ui_becomes_accessible(self):
        empty = parse_hierarchy("<hierarchy />")
        with patch.object(smoke, "dump_hierarchy", return_value=empty):
            with patch.object(smoke.time, "time", side_effect=[0, 31]):
                with patch.object(smoke.time, "sleep"):
                    with self.assertRaisesRegex(AssertionError, "did not expose"):
                        dismiss_tutorial(400, 800)


if __name__ == "__main__":
    unittest.main()

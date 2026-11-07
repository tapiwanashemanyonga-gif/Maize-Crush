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
    scroll_gutter_x,
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

    def test_geometry_ignores_eight_partially_clipped_bottom_row_tiles(self):
        _, cells, _ = parse_hierarchy(fixture_xml())
        for column in range(1, 9):
            cell = cells[(8, column)]
            x1, _, x2, _ = cell.bounds
            cells[(8, column)] = smoke.Cell(cell.crop, (x1, 485, x2, 500))
        self.assertEqual(len(fully_visible_cells(cells, 400, 500)), 56)
        self.assertEqual(validate_visible_geometry(cells, 400, 500), 64)

    def test_geometry_ignores_bottom_row_clipped_just_inside_viewport_edge(self):
        _, cells, _ = parse_hierarchy(fixture_xml())
        for column in range(1, 9):
            cell = cells[(8, column)]
            x1, _, x2, _ = cell.bounds
            cells[(8, column)] = smoke.Cell(cell.crop, (x1, 485, x2, 499))
        self.assertEqual(len(fully_visible_cells(cells, 400, 500)), 56)
        self.assertEqual(validate_visible_geometry(cells, 400, 500), 64)

    def test_geometry_validation_ignores_only_partially_visible_tile_bounds(self):
        _, cells, _ = parse_hierarchy(fixture_xml())
        clipped = cells[(1, 1)]
        cells[(1, 1)] = smoke.Cell(
            clipped.crop, (clipped.bounds[0], clipped.bounds[1],
                           clipped.bounds[2], 500)
        )
        self.assertEqual(validate_visible_geometry(cells, 400, 500), 64)

    def test_geometry_validation_tolerates_one_isolated_accessibility_bounds_outlier(self):
        _, cells, _ = parse_hierarchy(fixture_xml())
        first = cells[(1, 1)]
        cells[(1, 1)] = smoke.Cell(
            first.crop, (first.bounds[0], first.bounds[1],
                         first.bounds[2], first.bounds[1] + 15)
        )
        self.assertEqual(validate_visible_geometry(cells, 400, 500), 64)

    def test_geometry_validation_rejects_multiple_non_square_accessibility_bounds(self):
        _, cells, _ = parse_hierarchy(fixture_xml())
        for key in [(1, 1), (1, 2), (1, 3), (1, 4)]:
            cell = cells[key]
            cells[key] = smoke.Cell(
                cell.crop, (cell.bounds[0], cell.bounds[1],
                            cell.bounds[2], cell.bounds[1] + 15)
            )
        with self.assertRaisesRegex(AssertionError, "non-square accessibility bounds"):
            validate_visible_geometry(cells, 400, 500)

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


    def test_screen_size_swaps_natural_dimensions_for_landscape_rotation(self):
        with patch.object(smoke, "run_adb", side_effect=[
            "Physical size: 1080x1920", "1"
        ]):
            self.assertEqual(smoke.screen_size(), (1920, 1080))

    def test_screen_size_keeps_natural_dimensions_for_portrait_rotation(self):
        with patch.object(smoke, "run_adb", side_effect=[
            "Physical size: 1080x1920", "0"
        ]):
            self.assertEqual(smoke.screen_size(), (1080, 1920))

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
            with patch.object(smoke.time, "time", side_effect=[0, 46]):
                with patch.object(smoke.time, "sleep"):
                    with self.assertRaisesRegex(AssertionError, "did not expose"):
                        dismiss_tutorial(400, 800)


    def test_scroll_gesture_uses_right_safe_inset_away_from_android_edge(self):
        self.assertEqual(scroll_gutter_x(2560), 2355)
        self.assertEqual(scroll_gutter_x(1920), 1766)
        self.assertEqual(scroll_gutter_x(1600), 1472)
        self.assertEqual(scroll_gutter_x(936), 864)
        self.assertEqual(scroll_gutter_x(400), 328)

    def test_scroll_forward_and_backward_use_the_same_safe_gutter(self):
        commands = []
        with patch.object(smoke, "run_adb", side_effect=lambda *args, **kwargs: commands.append(args)):
            with patch.object(smoke.time, "sleep"):
                smoke.scroll_forward(936, 1600)
                smoke.scroll_backward(936, 1600)
        self.assertEqual(commands[0][0:3], ("shell", "input", "swipe"))
        self.assertEqual(commands[0][3], "864")
        self.assertEqual(commands[1][3], "864")


    def test_tutorial_waits_through_system_launcher_anr_dialog(self):
        dialog = parse_hierarchy(
            '<hierarchy><node text="Pixel Launcher isn\'t responding" />'
            '<node class="android.widget.Button" clickable="true" '
            'text="Wait" bounds="[100,300][300,360]" /></hierarchy>'
        )
        tutorial = parse_hierarchy(
            '<hierarchy><node text="How to harvest" />'
            '<node class="android.widget.Button" clickable="true" '
            'text="Let’s harvest →" bounds="[100,200][300,260]" /></hierarchy>'
        )
        board = parse_hierarchy(
            '<hierarchy><node text="Level 1 · Maize Fields" /></hierarchy>'
        )
        with patch.object(smoke, "dump_hierarchy", side_effect=[
            dialog, tutorial, board
        ]):
            with patch.object(smoke, "tap") as tap:
                with patch.object(smoke.time, "sleep"):
                    dismiss_tutorial(400, 800)
        self.assertEqual(tap.call_args_list[0].args, ((200, 330),))
        self.assertEqual(tap.call_args_list[1].args, ((200, 230),))

    def test_focus_play_is_entered_when_control_is_available(self):
        focus = parse_hierarchy(
            '<hierarchy><node class="android.widget.Button" clickable="true" '
            'text="Focus play" bounds="[100,200][300,260]" /></hierarchy>'
        )
        after = parse_hierarchy(
            '<hierarchy><node text="Exit focus play" /></hierarchy>'
        )
        with patch.object(smoke, "dump_hierarchy", side_effect=[focus, after]):
            with patch.object(smoke, "tap") as tap:
                with patch.object(smoke.time, "sleep"):
                    smoke.enter_focus_play(400, 800)
        tap.assert_called_once_with((200, 230))

    def test_focus_play_uses_android_accessibility_label_when_visible_text_is_missing(self):
        focus = parse_hierarchy(
            '<hierarchy><node class="android.widget.Button" clickable="true" '
            'content-desc="Enter immersive play mode" bounds="[100,200][300,260]" /></hierarchy>'
        )
        after = parse_hierarchy(
            '<hierarchy><node text="Exit focus play" /></hierarchy>'
        )
        with patch.object(smoke, "dump_hierarchy", side_effect=[focus, after]):
            with patch.object(smoke, "tap") as tap:
                with patch.object(smoke.time, "sleep"):
                    smoke.enter_focus_play(400, 800)
        tap.assert_called_once_with((200, 230))

    def test_focus_play_recognizes_short_exit_focus_label(self):
        active = parse_hierarchy(
            '<hierarchy><node class="android.widget.Button" clickable="true" '
            'text="Exit focus" bounds="[100,200][300,260]" /></hierarchy>'
        )
        with patch.object(smoke, "dump_hierarchy", return_value=active):
            with patch.object(smoke, "tap") as tap:
                smoke.enter_focus_play(400, 800)
        tap.assert_not_called()

    def test_restart_button_generates_a_new_field_without_scrolling(self):
        screen = parse_hierarchy(
            '<hierarchy><node class="android.widget.Button" clickable="true" '
            'text="↻ Restart" bounds="[100,200][300,260]" /></hierarchy>'
        )
        with patch.object(smoke, "dump_hierarchy", return_value=screen):
            with patch.object(smoke, "tap") as tap:
                with patch.object(smoke.time, "sleep"):
                    self.assertTrue(smoke.tap_restart_button(400, 800))
        tap.assert_called_once_with((200, 230))

    def test_restart_button_reports_missing_control_without_touching_board(self):
        screen = parse_hierarchy("<hierarchy />")
        with patch.object(smoke, "dump_hierarchy", return_value=screen):
            with patch.object(smoke, "tap") as tap:
                self.assertFalse(smoke.tap_restart_button(400, 800))
        tap.assert_not_called()

    def test_focus_play_is_not_toggled_off_when_already_active(self):
        active = parse_hierarchy(
            '<hierarchy><node class="android.widget.Button" clickable="true" '
            'text="Exit focus play" bounds="[100,200][300,260]" /></hierarchy>'
        )
        with patch.object(smoke, "dump_hierarchy", return_value=active):
            with patch.object(smoke, "tap") as tap:
                smoke.enter_focus_play(400, 800)
        tap.assert_not_called()

    def test_collect_board_does_not_scroll_when_all_crop_tiles_are_visible(self):
        cells = {
            (row, column): smoke.Cell(
                "maize", (column * 40 + 1, row * 40 + 1, column * 40 + 36, row * 40 + 36)
            )
            for row in range(1, 9)
            for column in range(1, 9)
        }
        root = parse_hierarchy("<hierarchy />")[0]
        texts = {"Level 1 · Maize Fields", "Harvest score"}
        with patch.object(smoke, "dump_hierarchy", return_value=(root, cells, texts)):
            with patch.object(smoke, "reset_scroll_top") as reset:
                snapshots, found, found_texts, last = smoke.collect_board(400, 400)
        reset.assert_not_called()
        self.assertEqual(len(found), 64)
        self.assertEqual(len(snapshots), 1)
        self.assertEqual(last, 0)
        self.assertIn("Harvest score", found_texts)

    def test_round_checkpoint_relaunch_assertion_accepts_restored_moves(self):
        root = parse_hierarchy(
            '<hierarchy><node text="MOVES LEFT">'
            '<node text="19" bounds="[0,0][20,20]" />'
            '</node></hierarchy>'
        )[0]
        with patch.object(smoke, "collect_board", return_value=([(0, root, {}, set())], {}, set(), 0)):
            smoke.assert_round_checkpoint_after_relaunch(400, 800, 19)

    def test_round_checkpoint_relaunch_assertion_rejects_lost_moves(self):
        root = parse_hierarchy(
            '<hierarchy><node text="MOVES LEFT">'
            '<node text="20" bounds="[0,0][20,20]" />'
            '</node></hierarchy>'
        )[0]
        with patch.object(smoke, "collect_board", return_value=([(0, root, {}, set())], {}, set(), 0)):
            with self.assertRaisesRegex(AssertionError, "did not restore the expected 19 moves"):
                smoke.assert_round_checkpoint_after_relaunch(400, 800, 19)

    def test_main_smoke_backgrounds_and_force_stops_before_checkpoint_relaunch_assertion(self):
        source = Path(smoke.__file__).read_text(encoding="utf-8")
        main = source[source.index("def main() -> int:"):]
        self.assertIn('run_adb("shell", "am", "force-stop", PACKAGE)', main)
        self.assertIn("assert_round_checkpoint_after_relaunch(width, height, 19)", main)
        self.assertLess(main.index('"KEYCODE_HOME"'), main.index('"force-stop"'))
        self.assertLess(main.index('"force-stop"'), main.index('"process-relaunch"'))

    def test_optional_screenshot_failure_does_not_fail_the_smoke_test(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(smoke, "ARTIFACTS", Path(directory)):
                with patch.object(smoke, "run_adb", side_effect=RuntimeError("device offline")):
                    with patch.object(smoke.time, "sleep"):
                        self.assertFalse(smoke.save_screenshot("optional.png"))



if __name__ == "__main__":
    unittest.main()

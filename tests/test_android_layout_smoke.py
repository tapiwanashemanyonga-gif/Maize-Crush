import unittest

from scripts.android_layout_smoke import (
    button_center,
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
            crop = crop_overrides.get((row, column), "Crop" + str((row + column) % 6))
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


if __name__ == "__main__":
    unittest.main()

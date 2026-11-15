import json
import struct
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read_glb(path):
    raw = path.read_bytes()
    if len(raw) < 20:
        raise AssertionError(f"GLB is truncated: {path}")
    magic, version, total_length = struct.unpack_from("<4sII", raw, 0)
    if magic != b"glTF" or version != 2 or total_length != len(raw):
        raise AssertionError(f"Invalid GLB header: {path}")
    json_length, json_type = struct.unpack_from("<I4s", raw, 12)
    if json_type != b"JSON":
        raise AssertionError(f"GLB JSON chunk is missing: {path}")
    return json.loads(raw[20:20 + json_length])


def position_bounds(document):
    minimum = [float("inf")] * 3
    maximum = [float("-inf")] * 3
    for mesh in document.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            accessor_index = primitive.get("attributes", {}).get("POSITION")
            if accessor_index is None:
                continue
            accessor = document["accessors"][accessor_index]
            for axis in range(3):
                minimum[axis] = min(minimum[axis], accessor["min"][axis])
                maximum[axis] = max(maximum[axis], accessor["max"][axis])
    return minimum, maximum


class HarvestWorldGlbTests(unittest.TestCase):
    def test_terrain_is_y_up_and_road_runs_along_world_z(self):
        document = read_glb(ROOT / "assets" / "harvest-world-terrain.glb")
        minimum, maximum = position_bounds(document)
        self.assertGreater(len(document.get("meshes", [])), 0)
        self.assertLessEqual(len(document["meshes"]), 12, "terrain draw-call budget exceeded")
        self.assertLessEqual(minimum[0], -47)
        self.assertGreaterEqual(maximum[0], 47)
        self.assertGreater(minimum[1], -8, "terrain vertical axis is incorrectly carrying road distance")
        self.assertLess(maximum[1], 8, "terrain vertical axis is incorrectly carrying road distance")
        self.assertLessEqual(minimum[2], -17, "road must extend behind the first level")
        self.assertGreaterEqual(maximum[2], 169, "road must extend beyond the final visible gate")
        self.assertGreater(maximum[2] - minimum[2], 185)

    def test_authored_models_fit_draw_call_budgets_and_match_android(self):
        budgets = {"harvest-world-farmstead.glb": 12, "harvest-world-settlement.glb": 12}
        for filename, budget in budgets.items():
            web_path = ROOT / "assets" / filename
            android_path = ROOT / "android" / "app" / "src" / "main" / "assets" / "assets" / filename
            document = read_glb(web_path)
            self.assertGreater(len(document.get("meshes", [])), 0, filename)
            self.assertLessEqual(len(document["meshes"]), budget, filename + " draw-call budget exceeded")
            self.assertEqual(web_path.read_bytes(), android_path.read_bytes(), filename + " web/Android mismatch")

    def test_terrain_asset_matches_android(self):
        web_path = ROOT / "assets" / "harvest-world-terrain.glb"
        android_path = ROOT / "android" / "app" / "src" / "main" / "assets" / "assets" / "harvest-world-terrain.glb"
        self.assertEqual(web_path.read_bytes(), android_path.read_bytes())


if __name__ == "__main__":
    unittest.main()

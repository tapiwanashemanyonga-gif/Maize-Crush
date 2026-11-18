"""Deterministic, offline, mobile-friendly surface textures for Harvest World GLBs.

Textures are generated locally in Blender, packed into the exported GLB, and shared
by material so the browser and Android builds remain byte-identical and offline.
"""
import math
import bpy


TEXTURE_PROFILES = {
    "plaster": ((0.62, 0.49, 0.32), 0.20, 0.22),
    "brick": ((0.48, 0.19, 0.10), 0.24, 0.32),
    "roof": ((0.28, 0.31, 0.30), 0.28, 0.30),
    "iron": ((0.35, 0.39, 0.38), 0.20, 0.24),
    "asphalt": ((0.105, 0.12, 0.13), 0.17, 0.28),
    "soil": ((0.39, 0.19, 0.09), 0.28, 0.38),
    "grass": ((0.36, 0.48, 0.20), 0.25, 0.30),
    "foliage": ((0.18, 0.34, 0.13), 0.23, 0.18),
    "stone": ((0.40, 0.38, 0.33), 0.22, 0.36),
    "wood": ((0.24, 0.15, 0.08), 0.25, 0.30),
    "metal": ((0.43, 0.49, 0.49), 0.15, 0.20),
    "thatch": ((0.48, 0.34, 0.16), 0.30, 0.38),
    "crop": ((0.42, 0.48, 0.15), 0.24, 0.20),
    "concrete": ((0.39, 0.39, 0.34), 0.20, 0.30),
}


def _profile_for(material):
    name = material.name.lower()
    if any(k in name for k in ("plaster", "lime")):
        return "plaster"
    if "brick" in name:
        return "brick"
    if any(k in name for k in ("roof", "corrugated", "terracotta", "oxidised", "rust")):
        return "roof"
    if any(k in name for k in ("asphalt", "road")):
        return "asphalt"
    if any(k in name for k in ("soil", "earth", "dust", "shoulder")):
        return "soil"
    if any(k in name for k in ("grass", "savanna")):
        return "grass"
    if any(k in name for k in ("foliage", "leaf", "leaves", "msasa", "vegetable")):
        return "foliage"
    if any(k in name for k in ("granite", "stone", "rock")):
        return "stone"
    if any(k in name for k in ("wood", "timber", "bark", "eucalyptus")):
        return "wood"
    if any(k in name for k in ("metal", "steel", "galvanised", "galvanized", "tank")):
        return "metal"
    if any(k in name for k in ("thatch", "maize", "crop")):
        return "thatch" if "thatch" in name else "crop"
    if any(k in name for k in ("concrete", "cement", "plinth")):
        return "concrete"
    return None


def _noise(x, y, seed):
    broad = math.sin((x * 5.7 + seed) * 2.1) * math.cos((y * 4.9 - seed) * 1.7)
    fine = math.sin((x * 31.0 + y * 17.0 + seed) * 1.3) * math.cos((y * 27.0 - x * 13.0) * 1.1)
    grain = math.sin((x * 83.0 + seed * 3.0) * 0.7) * math.cos((y * 71.0 - seed) * 0.8)
    return max(-1.0, min(1.0, broad * .52 + fine * .31 + grain * .17))


def _make_image(name, profile, base, strength, height=False):
    size = 128
    image = bpy.data.images.new(name, width=size, height=size, alpha=True)
    pixels = []
    seed = sum(ord(ch) for ch in profile) * .017
    for y in range(size):
        for x in range(size):
            u, v = x / float(size), y / float(size)
            n = _noise(u, v, seed)
            if height:
                step = 1.0 / size
                dx = (_noise(u + step, v, seed) - _noise(u - step, v, seed)) * 2.8
                dy = (_noise(u, v + step, seed) - _noise(u, v - step, seed)) * 2.8
                nx, ny, nz = -dx, -dy, 1.0
                length = math.sqrt(nx * nx + ny * ny + nz * nz)
                pixels.extend((.5 + .5 * nx / length, .5 + .5 * ny / length, .5 + .5 * nz / length, 1.0))
            else:
                grain = n * strength
                pixels.extend((
                    max(0.0, min(1.0, base[0] * (1.0 + grain))),
                    max(0.0, min(1.0, base[1] * (1.0 + grain * .88))),
                    max(0.0, min(1.0, base[2] * (1.0 + grain * .72))),
                    1.0,
                ))
    image.pixels.foreach_set(pixels)
    image.pack()
    return image


def apply_harvest_textures():
    """UV unwrap authored meshes and attach packed colour/height maps by material."""
    profile_images = {}
    for material in bpy.data.materials:
        profile = _profile_for(material)
        if not profile or not material.use_nodes:
            continue
        _profile_base, colour_strength, bump_strength = TEXTURE_PROFILES[profile]
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        shader = nodes.get("Principled BSDF")
        if not shader:
            continue
        # Use each authored material's own tint (e.g. red iron vs. grey zinc).
        base = tuple(shader.inputs["Base Color"].default_value[:3])
        image_key = material.name
        if image_key not in profile_images:
            colour = _make_image("Harvest " + material.name + " colour", profile + material.name, base, colour_strength)
            height = _make_image("Harvest " + material.name + " normal", profile + material.name, base, colour_strength, True)
            height.colorspace_settings.name = "Non-Color"
            profile_images[image_key] = (colour, height)
        colour, height = profile_images[image_key]
        # Retain the authored base tint while adding subtle, deterministic texture.
        tex = nodes.new("ShaderNodeTexImage")
        tex.name = "Packed " + profile + " surface colour"
        tex.label = "Offline " + profile + " texture"
        tex.image = colour
        tex.interpolation = "Linear"
        links.new(tex.outputs["Color"], shader.inputs["Base Color"])
        bump_tex = nodes.new("ShaderNodeTexImage")
        bump_tex.name = "Packed " + profile + " micro relief"
        bump_tex.image = height
        bump_tex.image.colorspace_settings.name = "Non-Color"
        bump_tex.interpolation = "Linear"
        normal_map = nodes.new("ShaderNodeNormalMap")
        normal_map.name = "Subtle " + profile + " surface relief"
        normal_map.inputs["Strength"].default_value = bump_strength
        links.new(bump_tex.outputs["Color"], normal_map.inputs["Color"])
        links.new(normal_map.outputs["Normal"], shader.inputs["Normal"])
        rough = nodes.new("ShaderNodeValue")
        rough.outputs[0].default_value = .82 if profile not in ("metal", "roof") else .58
        links.new(rough.outputs[0], shader.inputs["Roughness"])

    # Smart UV islands preserve detail across the many differently shaped props.
    for obj in [item for item in bpy.context.scene.objects if item.type == "MESH"]:
        if not obj.data.uv_layers:
            obj.data.uv_layers.new(name="HarvestUV")
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(island_margin=.018, area_weight=0.0, correct_aspect=True)
        bpy.ops.object.mode_set(mode="OBJECT")

    print("Applied packed offline Harvest World textures to %d materials" % len(profile_images))

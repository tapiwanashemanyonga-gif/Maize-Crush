import bpy, math, os, shutil, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if os.path.dirname(__file__) not in sys.path:
    sys.path.insert(0, os.path.dirname(__file__))
from harvest_world_textures import apply_harvest_textures
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "assets", "harvest-world-terrain.glb")
ANDROID_OUT = os.path.join(ROOT, "android", "app", "src", "main", "assets", "assets", "harvest-world-terrain.glb")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
os.makedirs(os.path.dirname(ANDROID_OUT), exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def material(name, color, roughness=.9):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (*color, 1)
    bs.inputs["Roughness"].default_value = roughness
    return m

grass = material("Dry season savanna grass", (.36, .48, .20))
grass_light = material("Sunlit grass", (.53, .58, .25))
red_soil = material("Zimbabwe red earth", (.39, .19, .09))
asphalt = material("Road asphalt", (.105, .12, .13), .95)
shoulder = material("Compacted road shoulder", (.58, .37, .20))
road_line = material("Warm road markings", (.94, .84, .61), .7)
rock = material("Granite kopje", (.39, .37, .32))
rock_light = material("Granite sun face", (.53, .49, .41))
bark = material("Msasa bark", (.20, .12, .07))
foliage = material("Msasa canopy", (.18, .34, .13))
foliage_light = material("Young msasa leaves", (.36, .47, .18))
field_gold = material("Golden maize field", (.65, .48, .15))



def apply_surface_variation(obj, surface):
    """Bake subtle, mobile-cheap colour breakup into GLB vertex colours."""
    colors = obj.data.color_attributes.new(name="Color", type="BYTE_COLOR", domain="POINT")
    for index, vertex in enumerate(obj.data.vertices):
        x, y, _height = vertex.co
        z = -y
        broad = math.sin(x * .115 + z * .071) * math.cos(z * .093 - x * .047)
        fine = math.sin(x * .31 - z * .27) * math.cos(z * .22 + x * .19)
        if surface == "grass":
            dry_patch = max(0.0, broad * .5 + fine * .16)
            rgba = (0.82 + dry_patch * .18, 0.86 + broad * .09, 0.72 + broad * .06, 1.0)
        elif surface == "asphalt":
            wear = broad * .055 + fine * .018
            rgba = (0.91 + wear, 0.92 + wear, 0.91 + wear, 1.0)
        elif surface == "shoulder":
            dust = broad * .10 + fine * .025
            rgba = (0.91 + dust, 0.86 + dust * .72, 0.76 + dust * .48, 1.0)
        else:
            rgba = (1.0, 1.0, 1.0, 1.0)
        colors.data[index].color = rgba

def mesh_object(name, verts, faces, mat):
    mesh = bpy.data.meshes.new(name + " mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj

# Sculpted rolling ground: a real triangulated terrain mesh with broad low hills.
verts, faces = [], []
nx, nz = 65, 95
for j in range(nz):
    z = -18 + j * 2.0
    for i in range(nx):
        x = -64 + i * 2.0
        broad = 1.1 * math.sin(z * .035 + x * .018) + .65 * math.cos(x * .055 - z * .021)
        undulation = .22 * math.sin(x * .19 + z * .11) * math.cos(z * .16)
        verts.append((x, -z, broad + undulation - .5))
for j in range(nz - 1):
    for i in range(nx - 1):
        a = j * nx + i
        faces.append((a, a + nx, a + nx + 1, a + 1))
terrain = mesh_object("Sculpted Zimbabwe countryside terrain", verts, faces, grass)
apply_surface_variation(terrain, "grass")
for p in terrain.data.polygons:
    p.use_smooth = True

def road_x(z):
    return 9.5 * math.sin((z + 8) * .043) + 2.2 * math.sin(z * .095)

def terrain_height(x, z):
    return 1.1 * math.sin(z * .035 + x * .018) + .65 * math.cos(x * .055 - z * .021) + .22 * math.sin(x * .19 + z * .11) * math.cos(z * .16) - .5

def road_mesh(name, half_width, y_offset, mat):
    verts, faces = [], []
    steps = 180
    for j in range(steps + 1):
        z = -12 + j * 1.0
        x = road_x(z)
        dx = road_x(min(168, z + .2)) - road_x(max(-12, z - .2))
        length = math.sqrt(dx * dx + .4 * .4)
        nxv, nzv = .4 / length, -dx / length
        for side in (-1, 1):
            verts.append((x + nxv * half_width * side, -(z + nzv * half_width * side), terrain_height(x, z) + .22 + y_offset))
    for j in range(steps):
        a = j * 2
        faces.append((a, a + 2, a + 3, a + 1))
    obj = mesh_object(name, verts, faces, mat)
    if name == "Continuous asphalt road surface":
        apply_surface_variation(obj, "asphalt")
    elif name == "Continuous winding red-earth road verge":
        apply_surface_variation(obj, "shoulder")
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj

# Shoulder underlay, asphalt ribbon and drainage channels follow the winding road.
road_mesh("Continuous winding red-earth road verge", 6.15, -.02, shoulder)
road_mesh("Continuous asphalt road surface", 4.25, .04, asphalt)

# Shallow V-shaped storm-water ditches stop the road from looking like a flat ribbon.
for side in (-1, 1):
    ditch_verts, ditch_faces = [], []
    steps = 180
    for j in range(steps + 1):
        z = -12 + j
        x = road_x(z)
        dx = road_x(min(168, z + .2)) - road_x(max(-12, z - .2))
        length = math.sqrt(dx * dx + .4 * .4)
        nxv, nzv = .4 / length, -dx / length
        for offset, depth in ((6.35, -.03), (7.25, -.34), (8.15, -.03)):
            px = x + nxv * offset * side
            pz = z + nzv * offset * side
            ditch_verts.append((px, -pz, terrain_height(px, pz) + depth))
    for j in range(steps):
        a = j * 3
        ditch_faces.extend(((a, a + 3, a + 4, a + 1), (a + 1, a + 4, a + 5, a + 2)))
    ditch = mesh_object("Winding rural storm-water drainage ditch", ditch_verts, ditch_faces, red_soil)
    for polygon in ditch.data.polygons:
        polygon.use_smooth = True

# Faded white edge lines add a clear, believable road boundary without a city-highway look.
for side in (-1, 1):
    curve = bpy.data.curves.new("Faded asphalt edge line curve", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = .035
    curve.bevel_resolution = 1
    spline = curve.splines.new("POLY")
    spline.points.add(180)
    for j, point in enumerate(spline.points):
        z = -12 + j
        x = road_x(z)
        dx = road_x(min(168, z + .2)) - road_x(max(-12, z - .2))
        length = math.sqrt(dx * dx + .4 * .4)
        nxv, nzv = .4 / length, -dx / length
        px = x + nxv * 4.02 * side
        pz = z + nzv * 4.02 * side
        point.co = (px, -pz, terrain_height(px, pz) + .305, 1)
    edge = bpy.data.objects.new("Faded rural asphalt edge marking", curve)
    bpy.context.collection.objects.link(edge)
    edge.data.materials.append(road_line)
for z in range(-8, 166, 7):
    x = road_x(z)
    curve = bpy.data.curves.new("Centre line dash curve", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = .075
    curve.bevel_resolution = 2
    spline = curve.splines.new("POLY")
    spline.points.add(1)
    for point, zz in zip(spline.points, (z, z + 3.1)):
        point.co = (road_x(zz), -zz, terrain_height(road_x(zz), zz) + .38, 1)
    obj = bpy.data.objects.new("Raised road centre marking", curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(road_line)

# Granite kopjes and rounded rock outcrops, clustered away from the road.
for idx, (x, z, sx, sy, sz) in enumerate([
    (-29, 18, 9, 5, 8), (31, 47, 11, 6, 10), (-34, 91, 8, 4, 7),
    (34, 128, 10, 5, 9), (-25, 145, 7, 4, 6)
]):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=(x, -z, terrain_height(x, z) + sy * .55))
    obj = bpy.context.object
    obj.name = "Zimbabwe granite kopje %02d" % idx
    obj.scale = (sx, sz, sy)
    # Break the perfect sphere silhouette into weathered granite shoulders.
    for vertex in obj.data.vertices:
        co = vertex.co
        ridge = math.sin(co.x * 5.1 + idx) * math.cos(co.y * 4.3 - idx * .7)
        weathering = math.sin(co.z * 7.0 + co.x * 2.2) * .035
        factor = 1.0 + ridge * .075 + weathering
        co *= factor
    obj.data.materials.append(rock if idx % 2 == 0 else rock_light)
    for poly in obj.data.polygons:
        poly.use_smooth = True

# Distant granite kopjes sit beyond the homesteads and the final gate, not directly
# behind the village. Their lower, longer profiles read as a far horizon rather
# than a foreground wall that hides the settlement on compact phone screens.
# Both ridges reuse the existing lighter granite material and remain batched.
ridge_depths = (0.0, 4.0, 8.0, 13.0)
for ridge_index, (ridge_name, ridge_start) in enumerate((
    ("Western distant Zimbabwe kopje ridgeline", 142.0),
    ("Eastern distant Zimbabwe kopje ridgeline", 154.0),
)):
    ridge_verts, ridge_faces = [], []
    ridge_steps = 33
    for step in range(ridge_steps):
        x = -32 + step * 2.0
        broad_peak = 4.8 + 1.3 * math.sin(x * .13 + ridge_index * .8) + .75 * math.cos(x * .27 - ridge_index)
        for section, depth in enumerate(ridge_depths):
            z = ridge_start + depth
            ground = terrain_height(x, z)
            irregularity = .55 * math.sin(x * .31 + ridge_index * 1.7) + .25 * math.cos(x * .18 - ridge_index)
            if section == 0:
                height = ground + .15
            elif section == 1:
                height = ground + broad_peak * .40 + irregularity * .20
            elif section == 2:
                height = ground + broad_peak + irregularity
            else:
                height = ground + .7 + irregularity * .10
            ridge_verts.append((x, -z, height))
    for step in range(ridge_steps - 1):
        for section in range(len(ridge_depths) - 1):
            a = step * len(ridge_depths) + section
            ridge_faces.append((a, a + 1, a + len(ridge_depths) + 1, a + len(ridge_depths)))
    ridge = mesh_object(ridge_name, ridge_verts, ridge_faces, rock_light)
    for polygon in ridge.data.polygons:
        polygon.use_smooth = True

# Mature msasa trees: tapered trunks, visible limbs and asymmetrical multi-lobed crowns.
# Deterministic placement and shared materials keep the GLB offline and mobile-friendly.
for idx in range(28):
    z = -4 + (idx * 6.15) % 166
    side = -1 if idx % 2 == 0 else 1
    x = road_x(z) + side * (12 + (idx % 4) * 4)
    ground = terrain_height(x, z)
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=.39, radius2=.20, depth=4.8, location=(x, -z, ground + 2.4))
    trunk = bpy.context.object
    trunk.name = "Tapered mature msasa trunk"
    trunk.data.materials.append(bark)
    # Three limbs emerge at staggered heights and angle into the canopy.
    for limb in range(3):
        angle = idx * .71 + limb * (math.tau / 3)
        start = Vector((x, -z, ground + 1.65 + limb * .48))
        end = Vector((x + math.cos(angle) * (1.25 + limb * .16),
                      -z + math.sin(angle) * (1.05 + limb * .12),
                      ground + 3.35 + limb * .34))
        direction = end - start
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=.145, radius2=.052,
                                        depth=direction.length, location=(start + end) / 2)
        branch = bpy.context.object
        branch.name = "Forked msasa tree limb"
        branch.rotation_mode = "QUATERNION"
        branch.rotation_quaternion = direction.to_track_quat("Z", "Y")
        branch.data.materials.append(bark)
    # Four broad side crowns and a smaller crown at the top break the repeated ball-tree silhouette.
    crown_specs = [
        (-1.18, -.18, 4.15, 1.62, 1.30, 1.05),
        (1.12, .16, 4.28, 1.72, 1.34, 1.12),
        (-.42, -.92, 4.72, 1.35, 1.28, 1.08),
        (.38, .88, 4.66, 1.42, 1.30, 1.10),
        (.08, -.04, 5.55, 1.28, 1.18, .98),
    ]
    for cluster, spec in enumerate(crown_specs):
        ox, oy, height, sx, sy, sz = spec
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=2, radius=1,
            location=(x + ox, -z + oy, ground + height + math.sin(idx + cluster) * .13)
        )
        crown = bpy.context.object
        crown.name = "Natural irregular msasa canopy"
        crown.scale = (sx * (1 + math.sin(idx * .7 + cluster) * .08),
                       sy * (1 + math.cos(idx * .5 + cluster) * .07), sz)
        for vertex in crown.data.vertices:
            co = vertex.co
            breakup = (math.sin(co.x * 6.0 + idx) * math.cos(co.y * 5.0 + cluster)
                       + math.sin(co.z * 7.0 + idx * .3) * .35)
            co *= 1.0 + breakup * .095
        crown.data.materials.append(foliage if cluster % 3 else foliage_light)
        for poly in crown.data.polygons:
            poly.use_smooth = True

# Low indigenous scrub and dry-season grass clumps soften the hard edge between
# the road verge, fields and open savanna. All foliage reuses the same materials.
for idx in range(54):
    z = -5 + (idx * 3.17) % 168
    side = -1 if idx % 2 == 0 else 1
    x = road_x(z) + side * (7.6 + (idx % 4) * 1.15)
    ground = terrain_height(x, z)
    for cluster in range(3):
        offset_x = (cluster - 1) * (.38 + (idx % 3) * .08)
        offset_z = (cluster - 1) * .24
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=(x + offset_x, -(z + offset_z), ground + .34 + (cluster % 2) * .08))
        shrub = bpy.context.object
        shrub.name = "Zimbabwe roadside scrub cluster"
        shrub.scale = (.58 + (idx % 4) * .10, .48 + (cluster % 2) * .10, .42 + (idx % 3) * .07)
        for vertex in shrub.data.vertices:
            co = vertex.co
            co *= 1.0 + math.sin(co.x * 4.0 + idx + cluster) * .055
        shrub.data.materials.append(foliage if (idx + cluster) % 3 else foliage_light)

# Rural roadside infrastructure: timber power poles, crossarms, insulators and sagging overhead lines.
# All props reuse existing materials so the exported GLB stays inside the 12-mesh draw-call budget.
power_poles = []
for idx, z in enumerate(range(4, 161, 22)):
    side = -1 if idx % 2 == 0 else 1
    x = road_x(z) + side * 8.5
    ground = terrain_height(x, z)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=.19, depth=6.2, location=(x, -z, ground + 3.1))
    pole = bpy.context.object
    pole.name = "Rural timber electricity pole"
    pole.data.materials.append(bark)
    # A simple timber crossarm and three insulator pegs create a recognisable silhouette.
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, -z, ground + 5.45))
    arm = bpy.context.object
    arm.name = "Power pole crossarm"
    arm.dimensions = (2.2, .16, .16)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    arm.data.materials.append(bark)
    for offset in (-.82, 0, .82):
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=.09, depth=.34, location=(x + offset, -z, ground + 5.68))
        insulator = bpy.context.object
        insulator.name = "Timber crossarm insulator"
        insulator.data.materials.append(rock_light)
    power_poles.append((x, -z, ground + 5.85))
# Sag each wire gently between poles; curves are converted and batched by material at export.
for idx in range(len(power_poles) - 1):
    a, b = power_poles[idx], power_poles[idx + 1]
    curve = bpy.data.curves.new("Overhead rural power line", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = .022
    curve.bevel_resolution = 1
    spline = curve.splines.new("POLY")
    spline.points.add(2)
    for point, co in zip(spline.points, (a, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, min(a[2], b[2]) - 1.0), b)):
        point.co = (*co, 1)
    wire = bpy.data.objects.new("Sagging overhead rural power cable", curve)
    bpy.context.collection.objects.link(wire)
    wire.data.materials.append(bark)

# Weathered post-and-rail fencing follows the edge of two cultivated plots.
for side, start_z, end_z in [(-1, 18, 62), (1, 86, 130)]:
    fence_points = []
    for z in range(start_z, end_z + 1, 5):
        x = road_x(z) + side * 15.5
        ground = terrain_height(x, z)
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=.11, depth=1.45, location=(x, -z, ground + .72))
        post = bpy.context.object
        post.name = "Weathered rural fence post"
        post.data.materials.append(bark)
        fence_points.append((x, -z, ground + .72))
    for idx in range(len(fence_points) - 1):
        a, b = fence_points[idx], fence_points[idx + 1]
        for height in (-.22, .25):
            start = Vector((a[0], a[1], a[2] + height))
            end = Vector((b[0], b[1], b[2] + height))
            direction = end - start
            bpy.ops.mesh.primitive_cube_add(size=1, location=(start + end) / 2)
            rail = bpy.context.object
            rail.name = "Rural timber fence rail"
            rail.dimensions = (.09, .09, direction.length)
            rail.rotation_mode = "QUATERNION"
            rail.rotation_quaternion = direction.to_track_quat("Z", "Y")
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            rail.data.materials.append(bark)

# Cultivated fields form visible geometric plots alongside the route.
for idx in range(9):
    z = 8 + idx * 17
    side = 1 if idx % 2 else -1
    x = road_x(z) + side * 22
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, -z, terrain_height(x, z) + .12))
    plot = bpy.context.object
    plot.name = "Zimbabwe cultivated field plot"
    plot.dimensions = (17, 11, .18)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    plot.data.materials.append(field_gold if idx % 2 else red_soil)
    # Parallel raised crop rows, deliberately sparse and shared-material.
    for row in range(5):
        row_curve = bpy.data.curves.new("Crop row curve", "CURVE")
        row_curve.dimensions = "3D"
        row_curve.bevel_depth = .045
        row_curve.bevel_resolution = 1
        spline = row_curve.splines.new("POLY")
        spline.points.add(1)
        for point, zz in zip(spline.points, (z - 4.5, z + 4.5)):
            point.co = (x - 7 + row * 3.5, -zz, terrain_height(x - 7 + row * 3.5, zz) + .28, 1)
        obj = bpy.data.objects.new("Raised maize planting row", row_curve)
        bpy.context.collection.objects.link(obj)
        obj.data.materials.append(foliage)

# Blender is Z-up; the GLB exporter converts Z-up to Babylon's Y-up.
# Road distance uses Blender -Y so it becomes positive Babylon world Z.
MAX_TERRAIN_MESHES = 12

def merge_meshes_by_material():
    for obj in list(bpy.context.scene.objects):
        if obj.type == "CURVE":
            bpy.ops.object.select_all(action="DESELECT")
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.convert(target="MESH")
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    for obj in mesh_objects:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        for modifier in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    groups = {}
    for obj in mesh_objects:
        materials = [slot.material for slot in obj.material_slots if slot.material]
        if len(materials) != 1:
            raise RuntimeError("Terrain mesh must have exactly one material: " + obj.name)
        groups.setdefault(materials[0].name, []).append(obj)
    for material_name, objects in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        bpy.context.object.name = "Terrain | " + material_name
    final_meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(final_meshes) > MAX_TERRAIN_MESHES:
        raise RuntimeError("Terrain draw-call budget exceeded: %d > %d" % (len(final_meshes), MAX_TERRAIN_MESHES))
    return len(final_meshes)

# Add packed, offline surface maps and UVs before material batching.
apply_harvest_textures()
mesh_count = merge_meshes_by_material()
print("Batched Zimbabwe countryside into %d material-batched meshes" % mesh_count)
# Export the terrain, road and countryside dressing as one offline GLB.
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_apply=True)
shutil.copy2(OUT, ANDROID_OUT)
print("Exported Blender-authored Harvest World terrain:", OUT, os.path.getsize(OUT))

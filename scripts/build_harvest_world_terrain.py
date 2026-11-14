import bpy, math, os, shutil
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
nx, nz = 49, 81
for j in range(nz):
    z = -18 + j * 2.0
    for i in range(nx):
        x = -48 + i * 2.0
        broad = 1.1 * math.sin(z * .035 + x * .018) + .65 * math.cos(x * .055 - z * .021)
        undulation = .22 * math.sin(x * .19 + z * .11) * math.cos(z * .16)
        verts.append((x, broad + undulation - .5, z))
for j in range(nz - 1):
    for i in range(nx - 1):
        a = j * nx + i
        faces.append((a, a + 1, a + nx + 1, a + nx))
terrain = mesh_object("Sculpted Zimbabwe countryside terrain", verts, faces, grass)
for p in terrain.data.polygons:
    p.use_smooth = True

def road_x(z):
    return 9.5 * math.sin((z + 8) * .043) + 2.2 * math.sin(z * .095)

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
            verts.append((x + nxv * half_width * side, .13 + y_offset, z + nzv * half_width * side))
    for j in range(steps):
        a = j * 2
        faces.append((a, a + 1, a + 3, a + 2))
    obj = mesh_object(name, verts, faces, mat)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj

# Shoulder underlay, asphalt ribbon and dashed centre line are all 3D meshes.
road_mesh("Continuous winding red-earth road verge", 5.7, -.02, shoulder)
road_mesh("Continuous asphalt road surface", 4.25, .04, asphalt)
for z in range(-8, 166, 7):
    x = road_x(z)
    curve = bpy.data.curves.new("Centre line dash curve", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = .075
    curve.bevel_resolution = 2
    spline = curve.splines.new("POLY")
    spline.points.add(1)
    for point, zz in zip(spline.points, (z, z + 3.1)):
        point.co = (road_x(zz), .23, zz, 1)
    obj = bpy.data.objects.new("Raised road centre marking", curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(road_line)

# Granite kopjes and rounded rock outcrops, clustered away from the road.
for idx, (x, z, sx, sy, sz) in enumerate([
    (-29, 18, 9, 5, 8), (31, 47, 11, 6, 10), (-34, 91, 8, 4, 7),
    (34, 128, 10, 5, 9), (-25, 145, 7, 4, 6)
]):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=(x, sy * .2, z))
    obj = bpy.context.object
    obj.name = "Zimbabwe granite kopje %02d" % idx
    obj.scale = (sx, sy, sz)
    obj.data.materials.append(rock if idx % 2 == 0 else rock_light)
    for poly in obj.data.polygons:
        poly.use_smooth = True

# Msasa trees with clustered canopies. Shared low-poly geometry keeps draw cost modest.
for idx in range(34):
    z = -4 + (idx * 5.1) % 166
    side = -1 if idx % 2 == 0 else 1
    x = road_x(z) + side * (12 + (idx % 4) * 4)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=.34, depth=3.8, location=(x, 1.7, z))
    trunk = bpy.context.object
    trunk.name = "Msasa tree trunk"
    trunk.data.materials.append(bark)
    for cluster in range(3):
        offset_x = (cluster - 1) * 1.05
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=(x + offset_x, 4.0 + (cluster % 2) * .35, z + (cluster - 1) * .65))
        crown = bpy.context.object
        crown.name = "Layered msasa canopy"
        crown.scale = (1.7, 1.25, 1.65)
        crown.data.materials.append(foliage if cluster != 1 else foliage_light)

# Cultivated fields form visible geometric plots alongside the route.
for idx in range(9):
    z = 8 + idx * 17
    side = 1 if idx % 2 else -1
    x = road_x(z) + side * 22
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, .18, z))
    plot = bpy.context.object
    plot.name = "Zimbabwe cultivated field plot"
    plot.dimensions = (17, .18, 11)
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
        for point, xx in zip(spline.points, (x - 7 + row * 3.5, x - 7 + row * 3.5)):
            point.co = (xx, .32, z - 4.5, 1)
        obj = bpy.data.objects.new("Raised maize planting row", row_curve)
        bpy.context.collection.objects.link(obj)
        obj.data.materials.append(foliage)

# Export the terrain, road and countryside dressing as one offline GLB.
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_apply=True)
shutil.copy2(OUT, ANDROID_OUT)
print("Exported Blender-authored Harvest World terrain:", OUT, os.path.getsize(OUT))

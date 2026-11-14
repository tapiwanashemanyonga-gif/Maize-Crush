import bpy, math, os, shutil
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "assets", "harvest-world-farmstead.glb")
ANDROID_OUT = os.path.join(ROOT, "android", "app", "src", "main", "assets", "assets", "harvest-world-farmstead.glb")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
os.makedirs(os.path.dirname(ANDROID_OUT), exist_ok=True)
bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)

def material(name, color, metallic=0.0, roughness=.8):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    bs=m.node_tree.nodes.get("Principled BSDF"); bs.inputs["Base Color"].default_value=(*color,1)
    bs.inputs["Metallic"].default_value=metallic; bs.inputs["Roughness"].default_value=roughness
    return m
cream=material("Sun-baked plaster",(0.78,.68,.49)); red=material("Terracotta roof",(0.42,.12,.065)); roofdark=material("Roof shadow",(0.22,.09,.055))
wood=material("Dark hardwood",(.19,.105,.055)); blue=material("Window glass",(.12,.35,.42),.25,.22)
white=material("Window frames",(.9,.84,.67)); concrete=material("Concrete",(.38,.37,.32)); metal=material("Galvanised tank",(.42,.52,.54),.72,.35)
green=material("Msasa foliage",(.13,.32,.12)); leaf2=material("Young foliage",(.31,.45,.16)); soil=material("Red Zimbabwe soil",(.36,.17,.085)); maize=material("Maize leaves",(.37,.47,.12))
def cube(name, loc, scale, mat, bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object; o.name=name; o.dimensions=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.data.materials.append(mat)
    if bevel:
        mod=o.modifiers.new("Soft hand-finished edges","BEVEL"); mod.width=bevel; mod.segments=2
        o.modifiers.new("Weighted corner normals","WEIGHTED_NORMAL")
    return o
def cylinder(name, loc, radius, depth, mat, vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc); o=bpy.context.object; o.name=name; o.data.materials.append(mat
    ); return o
def beam(name,a,b,width,mat):
    mid=(Vector(a)+Vector(b))/2; vec=Vector(b)-Vector(a)
    o=cube(name,mid,(width,width,vec.length),mat,.025); o.rotation_mode="QUATERNION"; o.rotation_quaternion=vec.to_track_quat("Z","Y"); return o

# House plinth and warm plaster walls
cube("Raised stone foundation",(0,0,.28),(8.5,6.3,.55),concrete,.1)
cube("Main farmhouse walls",(0,0,2.15),(8,5.8,3.5),cream,.08)
# Gable end profiles, roof planes and ridge cap
for x in [-3.98,3.98]:
    verts=[(x,-2.9,3.85),(x,2.9,3.85),(x,0,6.15)]
    mesh=bpy.data.meshes.new("Gable profile"); mesh.from_pydata(verts,[],[(0,1,2)]); mesh.materials.append(cream)
    ob=bpy.data.objects.new("Plaster gable",mesh); bpy.context.collection.objects.link(ob)
# roof slabs run along house length; pitch from ridge to eaves
for side in [-1,1]:
    a=Vector((0,0,6.25)); b=Vector((0,side*3.35,3.8)); mid=(a+b)/2
    vec=b-a; o=cube("Deep corrugated roof plane",mid,(8.9,vec.length,.18),red,.035)
    o.rotation_euler[0]=math.atan2(vec.z,vec.y)
    # fine raised seams suggest corrugated metal roofing
    for x in [i*.42 for i in range(-9,10)]:
        start=Vector((x,0,6.35)); end=Vector((x,side*3.32,3.86)); beam("Roof raised seam",start,end,.035,roofdark)
cube("Roof ridge cap",(0,0,6.32),(9.1,.22,.22),roofdark,.05)
# front veranda and posts
cube("Veranda slab",(0,-3.8,.35),(9.1,1.7,.28),concrete,.06)
for x in [-3.7,-1.25,1.25,3.7]:
    cube("Veranda timber post",(x,-4.35,1.9),(.16,.16,3.1),wood,.025)
beam("Veranda front beam",(-3.8,-4.35,3.42),(3.8,-4.35,3.42),.16,wood)
# door and two detailed windows
cube("Front door",(0,-2.94,1.55),(1.2,.13,2.35),wood,.035)
cube("Door inset",(0,-3.02,1.55),(.88,.035,1.95),roofdark,.02)
cylinder("Door handle",(.42,-3.08,1.48),.055,.06,metal,12).rotation_euler[0]=math.pi/2
for x in [-2.55,2.55]:
    cube("Window frame",(x,-2.98,2.15),(1.35,.16,1.25),white,.035)
    cube("Blue glass",(x,-3.075,2.15),(1.08,.035,.98),blue,.02)
    cube("Window crossbar",(x,-3.11,2.15),(.07,.05,.98),wood,.01)
    cube("Window sill",(x,-3.13,1.49),(1.55,.28,.12),wood,.02)
# Chimney and cap
cube("Chimney",(2.7,1.35,5.65),(.65,.65,2.1),concrete,.04)
cube("Chimney cap",(2.7,1.35,6.75),(.85,.85,.18),roofdark,.025)
# Water tank on four-legged stand
for x in [6.2,7.5]:
    for y in [1.4,2.7]:
        beam("Tank stand leg",(x,y,.35),(x,y,3.5),.13,wood)
cylinder("Water tank",(6.85,2.05,4.15),.95,1.5,metal,32)
cylinder("Tank top",(6.85,2.05,4.93),.91,.12,concrete,32)
# Round grain storage hut with conical thatch-style cap
cylinder("Grain store walls",(-6.4,1.5,1.25),1.15,2.4,cream,32)
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=1.42, radius2=0, depth=1.35, location=(-6.4,1.5,3.12))
bpy.context.object.name="Grain store thatched roof"; bpy.context.object.data.materials.append(red)
cube("Grain store door",(-6.4,.34,1.05),(.62,.08,1.35),wood,.025)
# Fenced vegetable and maize plots
cube("Garden red earth",(0,8,.08),(12,7,.16),soil,.02)
for x in [-5.8,5.8]:
    for y in [5,8,11]:
        cube("Garden fence post",(x,y,.8),(.14,.14,1.6),wood,.02)
for z in [.45,1.05]:
    beam("Garden fence rail",(-5.8,5,z),(5.8,5,z),.09,wood)
    beam("Garden fence rail",(-5.8,11,z),(5.8,11,z),.09,wood)
for x in [-4,-2,0,2,4]:
    for y in [6.5,9.5]:
        for dx in [-.18,.18]:
            beam("Maize stalk",(x+dx,y,.15),(x+dx*.7,y,1.1),.045,maize)
        beam("Maize leaf",(x-.5,y,.65),(x+.42,y,1.0),.045,leaf2)
# Msasa tree with layered canopy
cylinder("Msasa trunk",(-10,-1,2.2),.3,4.4,wood,16)
for loc,scale in [((-10,-1,4.6),(2.2,2.1,1.7)),((-10.9,-.8,4.15),(1.7,1.8,1.35)),((-9.1,-1.2,4.2),(1.8,1.7,1.4))]:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=loc); o=bpy.context.object; o.name="Msasa tree crown"; o.scale=scale; o.data.materials.append(green if loc[0]==-10 else leaf2)
# Path and stone stepping slabs
for i in range(5):
    cube("Veranda stepping stone",(0,-5.4-i*.85,.12),(1.15,.62,.18),concrete,.08)
MAX_FARMSTEAD_MESHES = 12

def merge_meshes_by_material():
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
            raise RuntimeError("Farmstead mesh must have exactly one material: " + obj.name)
        groups.setdefault(materials[0].name, []).append(obj)
    for material_name, objects in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        bpy.context.object.name = "Farmstead | " + material_name
    final_meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(final_meshes) > MAX_FARMSTEAD_MESHES:
        raise RuntimeError("Farmstead draw-call budget exceeded: %d > %d" % (len(final_meshes), MAX_FARMSTEAD_MESHES))
    return len(final_meshes)

mesh_count = merge_meshes_by_material()
print("Batched Zimbabwe farmstead into %d material-batched meshes" % mesh_count)
# Export only this authored scene
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_apply=True)
shutil.copy2(OUT,ANDROID_OUT)
print("Exported Blender-authored Harvest World farmstead:",OUT,os.path.getsize(OUT))

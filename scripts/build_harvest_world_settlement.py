import bpy, math, os, shutil
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "assets", "harvest-world-settlement.glb")
ANDROID_OUT = os.path.join(ROOT, "android", "app", "src", "main", "assets", "assets", "harvest-world-settlement.glb")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
os.makedirs(os.path.dirname(ANDROID_OUT), exist_ok=True)
bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)

def mat(name, color, metallic=0.0, roughness=.82):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    bs=m.node_tree.nodes.get("Principled BSDF"); bs.inputs["Base Color"].default_value=(*color,1)
    bs.inputs["Metallic"].default_value=metallic; bs.inputs["Roughness"].default_value=roughness
    return m

plaster=mat("Warm Zimbabwe lime plaster",(.78,.66,.46))
brick=mat("Fired red brick",(.48,.19,.10))
roof=mat("Weathered corrugated iron",(.18,.24,.25),.45,.48)
roof_rust=mat("Oxidised roof edge",(.40,.17,.09),.25,.65)
wood=mat("Dark eucalyptus timber",(.20,.12,.065))
wood_light=mat("Sunlit timber",(.39,.25,.12))
glass=mat("Blue window glass",(.12,.34,.40),.3,.22)
concrete=mat("Grey cement",(.39,.39,.34))
metal=mat("Galvanised steel",(.48,.55,.56),.72,.32)
soil=mat("Red earth yard",(.37,.18,.085))
thatch=mat("Dry thatch",(.48,.34,.16))
green=mat("Vegetable leaves",(.28,.43,.12))
white=mat("Window frames",(.87,.81,.65))

def cube(name, loc, dims, material, bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object; o.name=name; o.dimensions=dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.data.materials.append(material)
    if bevel:
        b=o.modifiers.new("Soft worn edges","BEVEL"); b.width=bevel; b.segments=2
        o.modifiers.new("Weighted normals","WEIGHTED_NORMAL")
    return o

def beam(name, a, b, width, material):
    va,vb=Vector(a),Vector(b); d=vb-va
    o=cube(name,(va+vb)/2,(width,width,d.length),material,.018)
    o.rotation_mode="QUATERNION"; o.rotation_quaternion=d.to_track_quat("Z","Y")
    return o

def cylinder(name, loc, radius, depth, material, vertices=20):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc)
    o=bpy.context.object; o.name=name; o.data.materials.append(material); return o

def rural_home(cx, cy, width, depth, wall_height, roof_material, prefix):
    cube(prefix+" stone plinth",(cx,cy,.22),(width+.28,depth+.28,.42),concrete,.07)
    cube(prefix+" plaster walls",(cx,cy, .42+wall_height/2),(width,depth,wall_height),plaster,.05)
    eave=.42+wall_height
    ridge=eave+width*.29
    for side in [-1,1]:
        a=Vector((cx,cy,eave+.08)); b=Vector((cx,cy+side*(depth/2+.34),eave+width*.29))
        vec=b-a
        slab=cube(prefix+" pitched roof",(cx,(a.y+b.y)/2,(a.z+b.z)/2),(width+.65,vec.length,.16),roof_material,.025)
        slab.rotation_euler[0]=math.atan2(vec.z,vec.y)
        for xoff in [i*(width/10) for i in range(-4,5)]:
            beam(prefix+" roof seam",(cx+xoff,cy,eave+.14),(cx+xoff,cy+side*(depth/2+.32),ridge+.04),.025,roof_rust)
    cube(prefix+" ridge cap",(cx,cy,ridge+.04),(width+.8,.16,.13),roof_rust,.025)
    # Front door, glazed windows, lintels and sills
    front=cy-depth/2-.065
    cube(prefix+" timber door",(cx,front,1.48),(1.0,.12,2.05),wood,.025)
    cube(prefix+" door inset",(cx,front-.07,1.48),(.72,.035,1.72),wood_light,.015)
    cylinder(prefix+" door handle",(cx+.34,front-.11,1.45),.045,.05,metal,12).rotation_euler[0]=math.pi/2
    for dx in [-width*.29,width*.29]:
        cube(prefix+" window surround",(cx+dx,front,2.05),(1.18,.14,1.05),white,.025)
        cube(prefix+" blue window",(cx+dx,front-.08,2.05),(.94,.035,.82),glass,.015)
        cube(prefix+" window crossbar",(cx+dx,front-.11,2.05),(.045,.04,.82),wood,.008)
        cube(prefix+" window sill",(cx+dx,front-.12,1.48),(1.34,.22,.09),wood,.015)
    # Veranda roof and two timber supports
    cube(prefix+" veranda slab",(cx,front-.85,.28),(width+.6,1.65,.2),concrete,.04)
    for dx in [-width*.42,width*.42]:
        cube(prefix+" veranda post",(cx+dx,front-1.55,1.55),(.13,.13,2.55),wood,.02)
    beam(prefix+" veranda beam",(cx-width*.48,front-1.55,2.85),(cx+width*.48,front-1.55,2.85),.14,wood)

# Two distinctly scaled dwellings in a small rural homestead.
rural_home(-3.8,1.8,7.2,5.3,3.0,roof,"Main homestead")
rural_home(6.0,5.7,4.8,4.2,2.65,roof_rust,"Second dwelling")
# Red-earth yard apron
cube("Compacted red-earth homestead yard",(0,2,.025),(22,17,.08),soil,.02)
# Traditional round grain store with thatched roof and timber door
cylinder("Round grain store plaster wall",(-9,7,1.25),1.35,2.45,plaster,32)
bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=1.65,radius2=.08,depth=1.55,location=(-9,7,3.22))
bpy.context.object.name="Traditional thatched grain-store roof"; bpy.context.object.data.materials.append(thatch)
cube("Grain store timber door",(-9,5.66,1.05),(.72,.1,1.45),wood,.025)
# Elevated steel water tank, stand, ladder and pipe
for x in [8.8,10.4]:
    for y in [8.4,10.0]:
        beam("Water tank support leg",(x,y,.2),(x,y,4.15),.13,wood)
for z in [1.0,2.3,3.8]:
    beam("Water tank stand brace",(8.8,8.4,z),(10.4,10,z),.09,wood)
cylinder("Elevated galvanized water tank",(9.6,9.2,4.75),1.18,1.35,metal,32)
cylinder("Water tank lid",(9.6,9.2,5.45),1.12,.12,concrete,32)
beam("Tank inlet pipe",(9.6,9.2,5.55),(9.6,9.2,6.0),.09,metal)
# Community borehole and hand pump
cylinder("Borehole concrete apron",(8.6,-3,.17),1.15,.28,concrete,24)
cylinder("Borehole pump column",(8.6,-3,1.1),.12,1.65,metal,12)
beam("Borehole pump handle",(8.6,-3,1.8),(9.65,-3,2.05),.10,wood)
beam("Borehole spout",(8.6,-3,1.2),(9.25,-3,1.2),.08,metal)
# Timber kraal / yard fencing with gate
for x in [-10.8,-6,-1,4,9,11]:
    for y in [-7,11]:
        cube("Homestead fence post",(x,y,.8),(.16,.16,1.6),wood,.02)
for y in [-7,11]:
    for z in [.45,1.12]:
        beam("Homestead fence rail",(-10.8,y,z),(11,y,z),.09,wood_light)
for x in [-10.8,11]:
    for z in [.45,1.12]:
        beam("Homestead side fence",(x,-7,z),(x,11,z),.09,wood_light)
# Small kitchen garden rows beside the dwelling
for row in range(4):
    y=-5.5+row*.8
    beam("Kitchen garden raised bed",(-2,y,.16),(4.5,y,.16),.10,wood)
    for plant in range(8):
        x=-1.7+plant*.8
        beam("Vegetable plant stem",(x,y,.2),(x,y,.55),.035,green)
        beam("Vegetable leaf",(x-.22,y,.42),(x+.22,y,.52),.035,green)
# Firewood stack and washing line posts add lived-in detail
for layer in range(3):
    beam("Stacked firewood",(-8,-3+layer*.12,.35+layer*.18),(-5.2,-3+layer*.12,.35+layer*.18),.12,wood_light)
for x in [-4,3]:
    cube("Washing line post",(x,-7,1.65),(.12,.12,3.3),wood,.02)
beam("Washing line",(-4,-7,3),(3,-7,3),.035,metal)
# Batch the authored architecture by material before export. This keeps the
# two imported homesteads to a predictable, low draw-call budget on Android.
MAX_SETTLEMENT_MESHES = 12

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
            raise RuntimeError("Settlement mesh must have exactly one material: " + obj.name)
        groups.setdefault(materials[0].name, []).append(obj)

    for material_name, objects in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        bpy.context.object.name = "Settlement | " + material_name

    final_meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(final_meshes) > MAX_SETTLEMENT_MESHES:
        raise RuntimeError(
            "Settlement draw-call budget exceeded: %d > %d"
            % (len(final_meshes), MAX_SETTLEMENT_MESHES)
        )
    return len(final_meshes)

mesh_count = merge_meshes_by_material()
print("Batched Zimbabwe rural settlement into %d material-batched meshes" % mesh_count)
# Export the low-draw-call offline GLB.
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=OUT,export_format="GLB",use_selection=True,export_apply=True)
shutil.copy2(OUT,ANDROID_OUT)
print("Exported Blender-authored Zimbabwe rural settlement:",OUT,os.path.getsize(OUT))

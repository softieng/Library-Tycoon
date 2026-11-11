"""Developer preview: re-imports an exported GLB and renders a few stills with Cycles (CPU).
Usage: python3 tools/blender/preview_glb.py <file.glb> <out.png> [clip:frame ...]"""
import bpy, sys, math, os
from mathutils import Vector
src, out = sys.argv[1], sys.argv[2]; shots = sys.argv[3:] or ['-:0']
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.samples = 24; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = False
sc.render.resolution_x = 560; sc.render.resolution_y = 520; sc.render.film_transparent = False
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.82, 0.8, 0.76, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.9
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.0; sun.rotation_euler = (math.radians(50), 0, math.radians(-35)); sc.collection.objects.link(sun)
bpy.ops.mesh.primitive_plane_add(size=20)
objs = [o for o in bpy.data.objects if o.type == 'MESH' and o.name != 'Plane']
mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
for o in objs:
    for c in o.bound_box:
        p = o.matrix_world @ Vector(c); mn = Vector(map(min, mn, p)); mx = Vector(map(max, mx, p))
ctr = (mn + mx) / 2; size = max(mx - mn)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 60
arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
paths = []
for i, shot in enumerate(shots):
    parts = shot.split(':'); clip, frame = parts[0], int(parts[1]); az = float(parts[2]) if len(parts) > 2 else -32; el = float(parts[3]) if len(parts) > 3 else 18
    if arm and clip != '-':
        arm.animation_data_create()
        for tr in arm.animation_data.nla_tracks: tr.mute = True
        arm.animation_data.action = bpy.data.actions.get(clip) or next(a for a in bpy.data.actions if a.name.startswith(clip))
    sc.frame_set(frame)
    d = size * 1.45; a = math.radians(az); e = math.radians(el)
    cam.location = ctr + Vector((math.sin(a) * math.cos(e) * d, -math.cos(a) * math.cos(e) * d, math.sin(e) * d))
    cam.rotation_euler = (ctr - cam.location).to_track_quat('-Z', 'Y').to_euler()
    p = f'{out}.{i}.png'; sc.render.filepath = p; bpy.ops.render.render(write_still=True); paths.append(p)
from PIL import Image
ims = [Image.open(p) for p in paths]; cols = min(4, len(ims)); rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * 560, rows * 520))
for i, im in enumerate(ims): sheet.paste(im, ((i % cols) * 560, (i // cols) * 520))
sheet.save(out); [os.remove(p) for p in paths]
print('PREVIEW', out, [a.name for a in bpy.data.actions])

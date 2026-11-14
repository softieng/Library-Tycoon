"""
Library Tycoon V3 character kit v2 — stylised adults with natural proportions (about 5.9 heads tall),
rigged and animated procedurally. Original geometry authored in code: no third-party mesh or texture.
Replaces the blocky Kenney mini-figures for gameplay while leaving the old GLBs in place as a fallback.

  pip install bpy ; python3 tools/blender/build_characters.py [--preview out_dir]

Rig (all bones share one rest orientation so a world-axis rotation maps to the same local axis everywhere):
  root > torso > head, arm-left/right > forearm-left/right ; root > leg-left/right > shin-left/right
Character faces -Y in Blender (= +Z in glTF), left side is +X. Height = 1.585 m before the engine rescales.
Clips: idle walk sit pick-up interact-right emote-yes emote-no holding-right holding-both jump
Faces (eyes, brows, mouth) are NOT baked: the engine adds them so they can blink and change expression.
"""
import bpy, bmesh, math, os, sys, json
from mathutils import Vector, Matrix, Euler, Quaternion

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
OUT = os.path.join(ROOT, 'public/assets/models/people'); os.makedirs(OUT, exist_ok=True)
HEAD_C = Vector((0, -0.005, 1.45)); HEAD_R = Vector((0.112, 0.12, 0.135))  # mirrored in src/characters/face.ts

def lin(h):  # hex -> rgba. The Col layer is a byte layer (sRGB-encoded); the glTF exporter linearises it.
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1,)

SKIN = {'a': '#f0c3a0', 'b': '#d9a07a', 'c': '#b97a55', 'd': '#8d5a3b', 'e': '#e6b48f'}
# name: (skin, hair colour, hair style, top, top2 (sleeve) , trousers, shoes, extras, hijab colour)
STUDENTS = {
    'female-a': ('b', '#2a1a12', 'long',  '#c8d6e8', None, '#2f3f63', '#f2efe6', ['bag'], None),
    'female-b': ('a', '#6b3b1f', 'bun',   '#e9d8a6', None, '#4a5a78', '#2a2d3a', ['glasses'], None),
    'female-c': ('c', '#17120f', 'long',  '#a9446b', None, '#2a2d3a', '#d6c9a8', [], None),
    'female-d': ('b', '#2a1a12', 'none',  '#d7e3d0', None, '#394a6b', '#2a2d3a', ['bag'], '#6d3f8a'),
    'female-e': ('e', '#a7612a', 'curly', '#e58a4d', None, '#3a3f58', '#f2efe6', [], None),
    'female-f': ('c', '#17120f', 'none',  '#f1ece0', None, '#2c3a5f', '#2a2d3a', ['bag'], '#2e5f6e'),
    'male-a':   ('b', '#1a120d', 'short', '#6c8caf', None, '#3d4558', '#d8d2c4', ['bag'], None),
    'male-b':   ('d', '#120d0b', 'short', '#d9a441', None, '#2a2d3a', '#f2efe6', [], None),
    'male-c':   ('a', '#3a2418', 'short', '#4e7d63', None, '#4a5068', '#2a2d3a', ['glasses', 'bag'], None),
    'male-d':   ('c', '#1a120d', 'beard', '#b9524a', None, '#33405c', '#f2efe6', [], None),
    'male-e':   ('e', '#5a3a22', 'short', '#8aa1c4', None, '#2a2d3a', '#d8d2c4', ['bag'], None),
    'male-f':   ('b', '#15100d', 'beard', '#e8e1d0', None, '#3b4a6b', '#2a2d3a', ['glasses'], None),
}
STAFF = {  # same faces as the matching student model but in the institutional uniform
    'female-a': ('b', '#2a1a12', 'bun',   '#14264f', '#f2efe6', '#14264f', '#1b1b22', ['badge'], None),   # borrowing desk
    'male-a':   ('b', '#1a120d', 'short', '#14264f', '#f2efe6', '#1c2540', '#1b1b22', ['badge', 'tie'], None),  # digital lab
    'male-e':   ('e', '#5a3a22', 'short', '#2f7f86', '#2f7f86', '#2a3a4a', '#1b1b22', ['badge'], None),  # cleaner
    'female-d': ('b', '#2a1a12', 'none',  '#14264f', '#f2efe6', '#14264f', '#1b1b22', ['badge', 'glasses'], '#14264f'),  # research desk (navy scarf)
    'female-f': ('c', '#17120f', 'long',  '#14264f', '#f2efe6', '#14264f', '#1b1b22', ['badge', 'glasses'], None),  # supervisor
}

class Builder:
    def __init__(self):
        self.bm = bmesh.new(); self.col = self.bm.loops.layers.color.new('Col'); self.dv = self.bm.verts.layers.deform.verify(); self.groups = {}
    def group(self, name):
        return self.groups.setdefault(name, len(self.groups))
    def blob(self, c, r, color, bone, rot=None, seg=(18, 12), cut=None, bend=None):
        """Ellipsoid centred at c with radii r. cut(vert_world)->True deletes that vertex (openings)."""
        m = bmesh.ops.create_uvsphere(self.bm, u_segments=seg[0], v_segments=seg[1], radius=1.0)
        vs = m['verts']
        mat = Matrix.Translation(c) @ (rot.to_matrix().to_4x4() if rot else Matrix.Identity(4)) @ Matrix.Diagonal((r[0], r[1], r[2], 1))
        bmesh.ops.transform(self.bm, matrix=mat, verts=vs)
        if cut:
            kill = [v for v in vs if cut(v.co)]
            bmesh.ops.delete(self.bm, geom=kill, context='VERTS'); vs = [v for v in vs if v.is_valid]
        gi = self.group(bone); rgba = lin(color) if isinstance(color, str) else color
        for v in vs:
            v[self.dv][gi] = 1.0
            for l in v.link_loops: l[self.col] = rgba
        return vs
    def limb(self, a, b, ra, rb, color, bone, bulge=1.0):
        a, b = Vector(a), Vector(b); d = b - a; L = d.length; mid = (a + b) / 2
        rot = Vector((0, 0, 1)).rotation_difference(d.normalized())
        return self.blob(mid, (max(ra, rb) * bulge, max(ra, rb) * bulge, L / 2 + min(ra, rb) * 0.6), color, bone, rot, (14, 10))

def hair(B, style, col):
    hc = HEAD_C
    front_cut = lambda v: (v.y < -0.045 and v.z < 1.525) or (v.y < -0.02 and v.z < 1.47)
    if style in ('short', 'beard', 'long', 'bun', 'curly'):
        B.blob(hc + Vector((0, 0.012, 0.045)), (0.121, 0.13, 0.108), col, 'head', cut=front_cut, seg=(24, 14))
    if style == 'long':
        B.blob((0, 0.075, 1.33), (0.125, 0.06, 0.2), col, 'head')
    if style == 'bun':
        B.blob((0, 0.07, 1.6), (0.055, 0.055, 0.05), col, 'head')
    if style == 'curly':
        for i in range(9):
            a = i / 9 * math.tau; B.blob((math.cos(a) * 0.1, 0.02 + math.sin(a) * 0.09, 1.54 + 0.02 * (i % 3)), (0.05, 0.05, 0.045), col, 'head', seg=(10, 8))
        B.blob((0, 0.05, 1.6), (0.09, 0.09, 0.05), col, 'head')
    if style == 'beard':
        B.blob((0, -0.06, 1.365), (0.082, 0.062, 0.058), col, 'head', cut=lambda v: v.z > 1.4 or (v.y < -0.095 and v.z > 1.385))
        B.blob((0, -0.112, 1.402), (0.04, 0.012, 0.01), col, 'head', seg=(10, 6))  # moustache

def build_person(name, spec, staff):
    skin_k, hair_c, style, top, sleeve, pants, shoes, extras, hijab = spec
    skin = SKIN[skin_k]; B = Builder()
    panel = sleeve or top; sleeve = top  # sleeves always match the jacket/top; `panel` is the shirt showing at the chest
    long_sleeve = staff or name in ('female-d', 'female-f', 'male-f', 'female-a', 'male-c', 'male-e')
    # --- torso, pelvis, neck
    B.blob((0, 0, 0.86), (0.158, 0.105, 0.1), pants, 'torso')
    B.blob((0, 0, 1.15), (0.162, 0.1, 0.14), top, 'torso', seg=(22, 14))
    B.blob((0, 0, 0.99), (0.14, 0.092, 0.15), top, 'torso', seg=(20, 12))
    if staff and top != '#2f7f86' or 'tie' in extras:  # open blazer over a pale shirt
        B.blob((0, -0.093, 1.12), (0.05, 0.03, 0.14), panel, 'torso', seg=(10, 8))
    B.blob((0, 0, 1.345), (0.05, 0.052, 0.07), skin, 'head', seg=(12, 8))
    # --- head, ears, nose
    B.blob(HEAD_C, HEAD_R, skin, 'head', seg=(32, 20))
    for s in (1, -1): B.blob((s * 0.116, 0.004, 1.448), (0.016, 0.02, 0.03), skin, 'head', seg=(8, 6))
    B.blob((0, -0.118, 1.425), (0.017, 0.02, 0.022), skin, 'head', seg=(10, 8))
    if hijab:
        op = lambda v: v.y < -0.045 and abs(v.x) < 0.082 and 1.375 < v.z < 1.535
        B.blob(HEAD_C + Vector((0, 0.01, 0.01)), (0.127, 0.132, 0.147), hijab, 'head', cut=op, seg=(32, 20))
        B.blob((0, 0.0, 1.29), (0.15, 0.1, 0.13), hijab, 'torso', cut=lambda v: v.y < -0.03 and abs(v.x) < 0.085 and v.z > 1.28, seg=(22, 12))
    else:
        hair(B, style, hair_c)
    if 'glasses' in extras:
        for s in (1, -1):
            B.blob((s * 0.047, -0.121, 1.448), (0.034, 0.008, 0.028), '#1b1b22', 'head', seg=(14, 8), cut=lambda v, s=s: abs(v.x - s * 0.047) < 0.026 and abs(v.z - 1.448) < 0.02 and v.y < -0.121)
        B.blob((0, -0.122, 1.452), (0.014, 0.006, 0.005), '#1b1b22', 'head', seg=(8, 6))
    # --- arms (A-pose), sleeves, hands
    for s, side in ((1, 'left'), (-1, 'right')):
        sh, el, wr = (s * 0.185, 0, 1.255), (s * 0.228, 0, 1.0), (s * 0.262, 0, 0.775)
        B.blob((s * 0.185, 0, 1.25), (0.049, 0.05, 0.05), sleeve if not 'tie' in extras else sleeve, 'arm-' + side, seg=(12, 8))
        B.limb(sh, el, 0.046, 0.04, sleeve, 'arm-' + side)
        B.limb(el, wr, 0.04, 0.034, sleeve if long_sleeve else skin, 'forearm-' + side)
        B.blob((s * 0.268, 0, 0.735), (0.032, 0.024, 0.048), skin, 'forearm-' + side, seg=(10, 8))
    # --- legs and shoes
    for s, side in ((1, 'left'), (-1, 'right')):
        B.limb((s * 0.085, 0, 0.84), (s * 0.09, 0, 0.445), 0.066, 0.056, pants, 'leg-' + side)
        B.blob((s * 0.09, 0, 0.445), (0.058, 0.058, 0.058), pants, 'leg-' + side, seg=(12, 8))
        B.limb((s * 0.09, 0, 0.445), (s * 0.09, 0, 0.1), 0.056, 0.046, pants, 'shin-' + side)
        B.blob((s * 0.09, -0.04, 0.05), (0.052, 0.105, 0.05), shoes, 'shin-' + side, seg=(14, 8))
    # --- accessories
    if 'bag' in extras and not staff:
        B.blob((0, 0.13, 1.06), (0.125, 0.06, 0.17), '#7a5a3a' if name.startswith('male') else '#3d5a80', 'torso', seg=(14, 10))
        for s in (1, -1): B.limb((s * 0.09, 0.07, 1.26), (s * 0.1, -0.02, 0.95), 0.012, 0.012, '#2a2d3a', 'torso')
    if 'badge' in extras:
        B.blob((0.07, -0.1, 1.13), (0.03, 0.01, 0.042), '#d2a441', 'torso', seg=(10, 8))
        B.limb((0.04, -0.09, 1.28), (0.07, -0.1, 1.17), 0.006, 0.006, '#d2a441', 'torso')
    if 'tie' in extras:
        B.limb((0, -0.105, 1.26), (0, -0.108, 1.0), 0.016, 0.022, '#d2a441', 'torso')
    me = bpy.data.meshes.new('body_' + name); B.bm.to_mesh(me); B.bm.free()
    for ca in [c for c in me.color_attributes if c.name != 'Col']: me.color_attributes.remove(ca)
    me.color_attributes.active_color = me.color_attributes['Col']; me.color_attributes.render_color_index = 0
    ob = bpy.data.objects.new('body', me); bpy.context.collection.objects.link(ob)
    for gname, gi in sorted(B.groups.items(), key=lambda kv: kv[1]): ob.vertex_groups.new(name=gname)
    for p in me.polygons: p.use_smooth = True
    mat = bpy.data.materials.new('char_vertex'); mat.use_nodes = True
    n = mat.node_tree.nodes; bsdf = n.get('Principled BSDF'); attr = n.new('ShaderNodeVertexColor'); attr.layer_name = 'Col'
    mat.node_tree.links.new(attr.outputs['Color'], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = 0.8
    me.materials.append(mat)
    return ob

BONES = {  # name: (head, parent)
    'root': ((0, 0, 0), None), 'torso': ((0, 0, 0.86), 'root'), 'head': ((0, 0, 1.33), 'torso'),
    'arm-left': ((0.19, 0, 1.255), 'torso'), 'forearm-left': ((0.228, 0, 1.0), 'arm-left'),
    'arm-right': ((-0.19, 0, 1.255), 'torso'), 'forearm-right': ((-0.228, 0, 1.0), 'arm-right'),
    'leg-left': ((0.085, 0, 0.84), 'root'), 'shin-left': ((0.09, 0, 0.445), 'leg-left'),
    'leg-right': ((-0.085, 0, 0.84), 'root'), 'shin-right': ((-0.09, 0, 0.445), 'leg-right'),
}
FPS = 30

def make_rig():
    ad = bpy.data.armatures.new('rig'); arm = bpy.data.objects.new('rig', ad); bpy.context.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
    for n, (h, p) in BONES.items():
        eb = ad.edit_bones.new(n); eb.head = h; eb.tail = (h[0], h[1], h[2] + 0.1); eb.roll = 0
        if p: eb.parent = ad.edit_bones[p]
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'
    return arm

def rig_actions(arm):
    """Author the clips with world-axis rotations (rx,ry,rz) per bone. -rx swings a hanging limb forward (-Y)."""
    B = arm.data.bones['root'].matrix_local.to_3x3()
    def q(rx=0, ry=0, rz=0):
        R = Euler((rx, ry, rz), 'XYZ').to_matrix()
        return (B.inverted() @ R @ B).to_quaternion()
    def clip(name, frames, fn, loop=True):
        act = bpy.data.actions.new(name); arm.animation_data_create(); arm.animation_data.action = act
        for f in range(frames + 1):
            ph = (f / frames) * math.tau
            for pb in arm.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
            fn(ph, {n: arm.pose.bones[n] for n in BONES}, q)
            for pb in arm.pose.bones:
                pb.keyframe_insert('rotation_quaternion', frame=f + 1); pb.keyframe_insert('location', frame=f + 1)
        tr = arm.animation_data.nla_tracks.new(); tr.name = name; st = tr.strips.new(name, 1, act); st.name = name
        arm.animation_data.action = None
        return act
    def loc(pb, wx=0, wy=0, wz=0):  # world offset -> bone local (local x=wx, local y=wz, local z=-wy)
        pb.location = (wx, wz, -wy)
    def sw(b, side, tx, y=0, z=0): b[side].rotation_quaternion = q(tx, y, z)
    S = ('left', 'right')
    def idle(ph, b, q):
        br = math.sin(ph)
        b['torso'].rotation_quaternion = q(-0.015 * br); b['head'].rotation_quaternion = q(0.012 * br, 0.03 * math.sin(ph * 2) * 0, 0)
        for s, k in (('left', 1), ('right', -1)):
            b['arm-' + s].rotation_quaternion = q(0.02 * br, 0, -k * 0.03); b['forearm-' + s].rotation_quaternion = q(-0.12 - 0.02 * br)
        loc(b['root'], wz=0.003 * br)
    def walk(ph, b, q):
        s = math.sin(ph)
        for side, sg in (('left', 1), ('right', -1)):
            p = ph + (0 if sg == 1 else math.pi); sp = math.sin(p)
            b['leg-' + side].rotation_quaternion = q(-0.55 * sp)
            b['shin-' + side].rotation_quaternion = q(0.15 + 0.75 * max(0, math.cos(p + 0.4)) ** 1.5 * (1 if True else 0))
            b['arm-' + side].rotation_quaternion = q(0.38 * sp, 0, -sg * 0.04)
            b['forearm-' + side].rotation_quaternion = q(-0.28 - 0.18 * max(0, -sp))
        b['torso'].rotation_quaternion = q(-0.04, 0, 0.0); b['head'].rotation_quaternion = q(0.03)
        b['torso'].rotation_quaternion = q(-0.05, 0.0, 0.06 * s)
        loc(b['root'], wz=-0.012 + 0.024 * abs(math.cos(ph * 1)) * -1 + 0.012)
    def sit(ph, b, q):
        loc(b['root'], wy=0.05, wz=-0.375)
        for side in S:
            b['leg-' + side].rotation_quaternion = q(-1.5); b['shin-' + side].rotation_quaternion = q(1.45)
            b['arm-' + side].rotation_quaternion = q(-0.5, 0, 0.0); b['forearm-' + side].rotation_quaternion = q(-0.55)
        b['torso'].rotation_quaternion = q(-0.08); b['head'].rotation_quaternion = q(0.3 + 0.01 * math.sin(ph))
    def pickup(ph, b, q):
        k = 0.5 - 0.5 * math.cos(ph)
        b['torso'].rotation_quaternion = q(-0.9 * k); loc(b['root'], wy=-0.12 * k, wz=-0.2 * k)
        for side in S:
            b['leg-' + side].rotation_quaternion = q(-0.7 * k); b['shin-' + side].rotation_quaternion = q(0.9 * k)
            b['arm-' + side].rotation_quaternion = q(-0.2 * k); b['forearm-' + side].rotation_quaternion = q(-0.3 * k)
        b['head'].rotation_quaternion = q(0.35 * k)
    def interact(ph, b, q):
        k = 0.5 - 0.5 * math.cos(ph)
        b['arm-right'].rotation_quaternion = q(-1.35 - 0.1 * k, 0, 0.1); b['forearm-right'].rotation_quaternion = q(-0.5 - 0.25 * k)
        b['arm-left'].rotation_quaternion = q(0.05, 0, -0.04); b['forearm-left'].rotation_quaternion = q(-0.2)
        b['torso'].rotation_quaternion = q(-0.06, 0, -0.08 * math.sin(ph)); b['head'].rotation_quaternion = q(-0.12 + 0.05 * math.sin(ph), 0.1 * math.sin(ph))
    def yes(ph, b, q):
        b['head'].rotation_quaternion = q(0.2 * math.sin(ph * 2)); b['torso'].rotation_quaternion = q(-0.03)
        for s, k in (('left', 1), ('right', -1)): b['arm-' + s].rotation_quaternion = q(0, 0, -k * 0.05); b['forearm-' + s].rotation_quaternion = q(-0.15)
        loc(b['root'], wz=0.012 * abs(math.sin(ph * 2)))
    def no(ph, b, q):
        b['head'].rotation_quaternion = q(0.04, 0, 0.42 * math.sin(ph * 2)); b['arm-right'].rotation_quaternion = q(-0.2)
    def hold_r(ph, b, q):
        b['arm-right'].rotation_quaternion = q(-0.9, 0, 0.12); b['forearm-right'].rotation_quaternion = q(-1.25); b['arm-left'].rotation_quaternion = q(0.04, 0, -0.04)
        b['forearm-left'].rotation_quaternion = q(-0.12); b['head'].rotation_quaternion = q(0.1 + 0.01 * math.sin(ph)); loc(b['root'], wz=0.003 * math.sin(ph))
    def hold_b(ph, b, q):
        for s, k in (('left', 1), ('right', -1)):
            b['arm-' + s].rotation_quaternion = q(-0.8, 0, -k * 0.1 + 0.0); b['forearm-' + s].rotation_quaternion = q(-1.2)
        b['head'].rotation_quaternion = q(0.12); loc(b['root'], wz=0.003 * math.sin(ph))
    def jump(ph, b, q):
        k = max(0, math.sin(ph)); c = max(0, -math.sin(ph))
        loc(b['root'], wz=0.18 * k - 0.1 * c)
        for side in S:
            b['leg-' + side].rotation_quaternion = q(-0.5 * c + 0.2 * k); b['shin-' + side].rotation_quaternion = q(0.9 * c + 0.3 * k)
        for s, kk in (('left', 1), ('right', -1)): b['arm-' + s].rotation_quaternion = q(-2.3 * k + 0.3 * c, 0, -kk * 0.35 * k); b['forearm-' + s].rotation_quaternion = q(-0.3)
    clip('idle', 90, idle); clip('walk', 36, walk); clip('sit', 60, sit); clip('pick-up', 60, pickup); clip('interact-right', 60, interact)
    clip('emote-yes', 45, yes); clip('emote-no', 45, no); clip('holding-right', 60, hold_r); clip('holding-both', 60, hold_b); clip('jump', 45, jump)

def export(name, spec, staff):
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    for a in list(bpy.data.actions): bpy.data.actions.remove(a)
    ob = build_person(name, spec, staff); arm = make_rig()
    ob.parent = arm; ob.modifiers.new('Armature', 'ARMATURE').object = arm
    rig_actions(arm)
    arm.name = 'person-' + name + ('-staff' if staff else '')
    path = os.path.join(OUT, arm.name + '.glb')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='NLA_TRACKS',
                              export_force_sampling=True, export_frame_step=1, export_skins=True, export_yup=True, export_apply=False,
                              export_vertex_color='ACTIVE', export_optimize_animation_size=True, export_extras=False)
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    print('OK', arm.name, os.path.getsize(path), 'bytes', tris, 'tris')
    return arm, ob

if __name__ == '__main__':
    only = [a for a in sys.argv if a.startswith('--only=')]
    for n, sp in STUDENTS.items():
        if only and n not in only[0][7:]: continue
        export(n, sp, False)
    for n, sp in STAFF.items():
        if only and n not in only[0][7:]: continue
        export(n, sp, True)

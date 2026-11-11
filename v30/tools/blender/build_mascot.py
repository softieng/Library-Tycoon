"""
Builds the Central Library mascot ("الحارس الصغير") as a rigged, animated GLB.

Reference: assets-src/branding/mascot.original.jpg (owner-approved master, never modified).
Identity contract enforced here and re-checked by tests/unit/mascot.test.ts on the exported file:
  * brown plush pseudoscorpion — EXACTLY 8 walking legs + 2 pedipalps with claws
  * NO tail, NO stinger
  * navy graduation cap with gold tassel, navy sash with the approved Arabic/English inscriptions,
    gold chain with a pendant carrying the official library logo (اقرأ … 1975)
Run:  python3 tools/blender/build_mascot.py        (uses the `bpy` module, Blender 5.x)
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix, Quaternion, Euler

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
TEX = os.path.join(ROOT, 'assets-src/textures')
OUT = os.path.join(ROOT, 'public/assets/models/mascot.glb')
FPS = 24

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = FPS

# --------------------------------------------------------------------------- materials
def image(name):
    img = bpy.data.images.load(os.path.join(TEX, name)); img.pack(); return img

def material(name, color=(1, 1, 1), rough=0.8, metal=0.0, tex=None, normal=None, normal_strength=1.0, sheen=0.0, sheen_tint=(1, 1, 1), emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if tex:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = image(tex); nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    if normal:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = image(normal); t.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = normal_strength
        nt.links.new(t.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    if sheen:
        b.inputs['Sheen Weight'].default_value = sheen; b.inputs['Sheen Roughness'].default_value = 0.45
        b.inputs['Sheen Tint'].default_value = (*sheen_tint, 1)
    return m

M_PLUSH = material('plush_brown', tex='plush_albedo.png', normal='plush_normal.png', normal_strength=1.4, rough=0.95, sheen=1.0, sheen_tint=(0.95, 0.72, 0.5))
M_DARK = material('plush_stitch', color=(0.10, 0.055, 0.035), rough=0.9)
M_WHITE = material('eye_white', color=(0.93, 0.91, 0.86), rough=0.75, normal='felt_normal.png', normal_strength=0.5)
M_BLACK = material('eye_black', color=(0.012, 0.012, 0.016), rough=0.28)
M_NAVY = material('cap_navy_felt', color=(0.035, 0.065, 0.19), rough=0.92, normal='felt_normal.png', sheen=0.6, sheen_tint=(0.4, 0.5, 0.9))
M_GOLD = material('gold_thread', color=(0.83, 0.62, 0.16), rough=0.38, metal=0.85)
M_SASH = material('sash_inscribed', tex='mascot_sash.png', rough=0.8, normal='felt_normal.png', normal_strength=0.6, sheen=0.4, sheen_tint=(0.5, 0.6, 1.0))
M_PENDANT = material('pendant_logo', tex='mascot_pendant.png', rough=0.35)
M_PAPER = material('book_pages', color=(0.93, 0.9, 0.82), rough=0.7)

# --------------------------------------------------------------------------- mesh helpers
PARTS = []  # (object, bone name)

def finish(bm, name, mat, bone, uv_scale=3.2, smooth=True, box_uv=True):
    me = bpy.data.meshes.new(name)
    if box_uv:
        uv = bm.loops.layers.uv.verify()
        for f in bm.faces:
            n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
            for l in f.loops:
                c = l.vert.co
                l[uv].uv = ((c.y, c.z) if ax == 0 else (c.x, c.z) if ax == 1 else (c.x, c.y))
                l[uv].uv = (l[uv].uv[0] * uv_scale, l[uv].uv[1] * uv_scale)
    bm.normal_update(); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = smooth
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    me.materials.append(mat)
    PARTS.append((ob, bone))
    return ob

def ellipsoid(name, center, radii, mat, bone, rot=None, seg=28, rings=18, ribs=0, rib_depth=0.0, rib_axis=1, **kw):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    R = rot.to_matrix() if rot else Matrix.Identity(3)
    for v in bm.verts:
        p = v.co.copy()
        if ribs:  # plush segment ridges along one axis
            t = p[rib_axis]
            k = 1.0 - rib_depth * (0.5 - 0.5 * math.cos(t * math.pi * ribs)) ** 3
            for i in range(3):
                if i != rib_axis: p[i] *= k
        p = Vector((p.x * radii[0], p.y * radii[1], p.z * radii[2]))
        v.co = R @ p + Vector(center)
    return finish(bm, name, mat, bone, **kw)

def tube(name, pts, radii, mat, bone, seg=14, cap=True, **kw):
    """Smooth tube through points with a radius per point; rounded caps."""
    pts = [Vector(p) for p in pts]
    if cap:  # add hemispherical end caps by extending the profile
        def capped(p0, p1, r, steps=4):
            d = (p0 - p1).normalized(); out = []
            for i in range(steps, 0, -1):
                a = (i / steps) * math.pi / 2
                out.append((p0 + d * r * math.sin(a), max(r * math.cos(a), 1e-4)))
            return out
        head = capped(pts[0], pts[1], radii[0]); tail = capped(pts[-1], pts[-2], radii[-1])[::-1]
        prof = head + list(zip(pts, radii)) + tail
    else:
        prof = list(zip(pts, radii))
    bm = bmesh.new(); rings = []
    up_prev = None
    for i, (p, r) in enumerate(prof):
        a = prof[max(0, i - 1)][0]; b = prof[min(len(prof) - 1, i + 1)][0]
        t = (b - a).normalized()
        ref = up_prev if up_prev is not None else (Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0)))
        n = (ref - t * ref.dot(t)).normalized(); up_prev = n
        bn = t.cross(n)
        rings.append([bm.verts.new(p + (n * math.cos(2 * math.pi * k / seg) + bn * math.sin(2 * math.pi * k / seg)) * r) for k in range(seg)])
    for i in range(len(rings) - 1):
        for k in range(seg):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    return finish(bm, name, mat, bone, **kw)

def box(name, center, size, mat, bone, rot=None, bevel=0.004, **kw):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    if bevel: bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=2, affect='EDGES')
    R = rot.to_matrix() if rot else Matrix.Identity(3)
    for v in bm.verts: v.co = R @ v.co + Vector(center)
    return finish(bm, name, mat, bone, smooth=False, **kw)

def disc_on(name, center, normal, radius, thick, mat, bone, seg=28, squash=(1, 1), **kw):
    """Slightly domed embroidered disc lying on a surface."""
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=10, radius=1.0)
    n = Vector(normal).normalized(); q = Vector((0, 0, 1)).rotation_difference(n).to_matrix()
    for v in bm.verts:
        v.co = q @ Vector((v.co.x * radius * squash[0], v.co.y * radius * squash[1], v.co.z * thick)) + Vector(center)
    return finish(bm, name, mat, bone, **kw)

def arc(center, radius, a0, a1, n, plane_x, plane_y):
    return [Vector(center) + (Vector(plane_x) * math.cos(a0 + (a1 - a0) * i / (n - 1)) + Vector(plane_y) * math.sin(a0 + (a1 - a0) * i / (n - 1))) * radius for i in range(n)]

# --------------------------------------------------------------------------- anatomy (metres, Z up, facing -Y)
CHEST_C, CHEST_R = Vector((0, 0.0, 0.305)), Vector((0.215, 0.20, 0.195))
ABDO_C, ABDO_R = Vector((0, 0.385, 0.315)), Vector((0.265, 0.30, 0.245))
HEAD_C, HEAD_R = Vector((0, -0.085, 0.615)), 0.218

ellipsoid('chest', CHEST_C, CHEST_R, M_PLUSH, 'body')
ellipsoid('neck', (0, -0.04, 0.46), (0.13, 0.12, 0.08), M_PLUSH, 'body')
# Rounded, ribbed plush abdomen — the body simply ends here: there is no tail and no stinger.
ellipsoid('abdomen', ABDO_C, ABDO_R, M_PLUSH, 'abdomen', ribs=5, rib_depth=0.11, rib_axis=1, seg=36, rings=40)
ellipsoid('head', HEAD_C, (HEAD_R, HEAD_R * 0.98, HEAD_R * 0.94), M_PLUSH, 'head', seg=36, rings=24)
# centre head seam (plush stitching)
tube('head_seam', arc(HEAD_C, HEAD_R * 0.975, math.radians(18), math.radians(128), 20, (0, -1, 0), (0, 0, 1)), [0.0035] * 20, M_DARK, 'head', seg=6)

def on_head(yaw, pitch, lift=0.0):
    d = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch)))
    return HEAD_C + Vector((d.x * HEAD_R, d.y * HEAD_R * 0.98, d.z * HEAD_R * 0.94)) + d * lift, d

EYE_PIVOT = {}
for side, sx in (('L', 1), ('R', -1)):  # character's left is +X
    c, n = on_head(sx * math.radians(27), math.radians(6))
    EYE_PIVOT[side] = (c, n)
    disc_on(f'eye_white.{side}', c, n, 0.077, 0.016, M_WHITE, f'eye.{side}')
    disc_on(f'eye_pupil.{side}', c + n * 0.008, n, 0.058, 0.014, M_BLACK, f'eye.{side}')
    hl = c + n * 0.021 + Vector((sx * -0.012 + 0.016, 0, 0.024))
    disc_on(f'eye_glint.{side}', hl, n, 0.017, 0.006, M_WHITE, f'eye.{side}', seg=14)
# stitched smile
MOUTH_C, MOUTH_N = on_head(0, math.radians(-27))
smile = []
for i in range(13):
    a = math.radians(-34 + 68 * i / 12)
    p, n = on_head(a * 0.62, math.radians(-25) - math.cos(a * 2.6) * math.radians(4.2), 0.002)
    smile.append(p)
tube('mouth', smile, [0.0048] * 13, M_DARK, 'mouth', seg=6)

# ---- graduation cap + tassel ----
CAP_TILT = Euler((math.radians(-7), math.radians(4), 0))
cap_base = HEAD_C + Vector((0, 0.012, HEAD_R * 0.78))
def cap_pt(x, y, z): return cap_base + CAP_TILT.to_matrix() @ Vector((x, y, z))
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=28, radius1=0.150, radius2=0.136, depth=0.105)
for v in bm.verts: v.co = cap_pt(v.co.x, v.co.y, v.co.z + 0.045)
finish(bm, 'cap_skull', M_NAVY, 'head', uv_scale=6)
box('cap_board', cap_pt(0, 0, 0.106), (0.40, 0.40, 0.020), M_NAVY, 'head', rot=Euler((CAP_TILT.x, CAP_TILT.y, math.radians(45))), bevel=0.004, uv_scale=6)
ellipsoid('cap_button', cap_pt(0, 0, 0.120), (0.020, 0.020, 0.010), M_GOLD, 'head', seg=14, rings=8)
T_EDGE = cap_pt(0.205, -0.035, 0.112)  # cord runs from the button to the board edge (character's left)
tube('tassel_cord_top', [cap_pt(0, 0, 0.122), cap_pt(0.10, -0.018, 0.121), T_EDGE], [0.0042] * 3, M_GOLD, 'head', seg=8)
T_KNOT = T_EDGE + Vector((0.006, 0, -0.10))
tube('tassel_cord', [T_EDGE, T_EDGE + Vector((0.004, 0, -0.04)), T_KNOT], [0.0042] * 3, M_GOLD, 'tassel', seg=8)
ellipsoid('tassel_knot', T_KNOT, (0.017, 0.017, 0.02), M_GOLD, 'tassel', seg=12, rings=8)
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=0.030, radius2=0.015, depth=0.15)
for v in bm.verts:  # fringe flutes
    ang = math.atan2(v.co.y, v.co.x); k = 1 + 0.10 * math.sin(ang * 10)
    v.co = Vector((v.co.x * k, v.co.y * k, v.co.z)) + T_KNOT + Vector((0, 0, -0.09))
finish(bm, 'tassel_fringe', M_GOLD, 'tassel', uv_scale=8)

# ---- sash: two navy bands with gold edging, lying on the chest, crossing in a V ----
def chest_surface(p, lift=0.012):
    d = Vector(((p.x - CHEST_C.x) / CHEST_R.x, (p.y - CHEST_C.y) / CHEST_R.y, (p.z - CHEST_C.z) / CHEST_R.z))
    l = max(d.length, 1e-6); d /= l
    s = CHEST_C + Vector((d.x * CHEST_R.x, d.y * CHEST_R.y, d.z * CHEST_R.z))
    n = Vector((d.x / CHEST_R.x, d.y / CHEST_R.y, d.z / CHEST_R.z)).normalized()
    return s + n * lift, n

def sash_band(side, sx, v0, v1):
    ctrl = [Vector((sx * 0.105, 0.150, 0.455)), Vector((sx * 0.150, 0.020, 0.492)), Vector((sx * 0.165, -0.110, 0.440)),
            Vector((sx * 0.135, -0.200, 0.330)), Vector((sx * 0.080, -0.215, 0.215)), Vector((sx * 0.040, -0.190, 0.130))]
    N = 26; width = 0.128
    def path(t):
        f = t * (len(ctrl) - 1); i = min(int(f), len(ctrl) - 2); u = f - i
        p0, p1, p2, p3 = ctrl[max(i - 1, 0)], ctrl[i], ctrl[i + 1], ctrl[min(i + 2, len(ctrl) - 1)]
        return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3)
    bm = bmesh.new(); uv = bm.loops.layers.uv.verify(); rows = []
    for i in range(N):
        t = i / (N - 1); p, n = chest_surface(path(t)); p2, _ = chest_surface(path(min(1, t + 0.02)))
        tan = (p2 - p).normalized() if t < 0.99 else (p - chest_surface(path(t - 0.02))[0]).normalized()
        side_v = tan.cross(n).normalized()
        w = width * (1.0 if t < 0.86 else max(0.04, (1 - t) / 0.14))  # pointed tip
        l, _ = chest_surface(p - side_v * w / 2); r, _ = chest_surface(p + side_v * w / 2)
        rows.append((bm.verts.new(l), bm.verts.new(p + n * 0.004), bm.verts.new(r), t))
    for i in range(N - 1):
        a, b = rows[i], rows[i + 1]
        for j in (0, 1):
            f = bm.faces.new((a[j], a[j + 1], b[j + 1], b[j]))
            for l in f.loops:
                row = a if l.vert in a[:3] else b; col = row.index(l.vert)
                # texture: text runs along the band; each band uses one half of the sheet
                along = row[3] * 1.0
                u_ = 0.04 + along * 0.92; v_ = v0 + (v1 - v0) * (col / 2)
                l[uv].uv = (u_ if sx > 0 else 1 - u_, v_ if sx > 0 else v0 + v1 - v_)
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.006)
    return finish(bm, f'sash.{side}', M_SASH, 'body', box_uv=False)

# Wearer's right shoulder (−X, viewer's left) reads "المكتبة المركزية / CENTRAL LIBRARY" (top half of the sheet),
# wearer's left shoulder (+X) reads "الجامعة التكنولوجية / UNIVERSITY OF TECHNOLOGY" — as on the approved master.
sash_band('R', -1, 1.0, 0.5)
sash_band('L', 1, 0.5, 0.0)

# ---- gold chain + pendant with the official logo ----
chain = []
for i in range(21):
    t = i / 20; a = math.radians(-70 + 140 * t)
    p = Vector((math.sin(a) * 0.118, -0.03 - math.cos(a) * 0.150, 0.455 - 0.105 * math.cos(a) ** 2))
    chain.append(chest_surface(p, 0.020)[0] if p.z < 0.44 else p)
tube('chain', chain, [0.0038] * 21, M_GOLD, 'body', seg=6, cap=False)
PEND_C = chest_surface(Vector((0, -0.25, 0.30)), 0.024)[0]
pend_rot = Euler((math.radians(-14), 0, 0))
box('pendant_frame', PEND_C, (0.070, 0.008, 0.112), M_GOLD, 'pendant', rot=pend_rot, bevel=0.003)
bm = bmesh.new(); uv = bm.loops.layers.uv.verify()
R = pend_rot.to_matrix(); w, h = 0.060, 0.102
vs = [bm.verts.new(PEND_C + R @ Vector((x, -0.0052, z))) for x, z in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))]
f = bm.faces.new(vs)
for l, t in zip(f.loops, ((1, 0), (0, 0), (0, 1), (1, 1))): l[uv].uv = t  # viewed from the front (−Y)
finish(bm, 'pendant_face', M_PENDANT, 'pendant', box_uv=False, smooth=False)
tube('pendant_ring', [PEND_C + R @ Vector((0, 0, h / 2 + 0.004)), PEND_C + R @ Vector((0, 0, h / 2 + 0.022))], [0.006, 0.006], M_GOLD, 'pendant', seg=8)

# ---- two pedipalps (arms ending in claws) ----
PALP = {}
for side, sx in (('L', 1), ('R', -1)):
    sh = Vector((sx * 0.185, -0.075, 0.345)); el = Vector((sx * 0.335, -0.200, 0.300)); wr = Vector((sx * 0.345, -0.365, 0.315))
    tip = wr + Vector((sx * -0.012, -0.165, 0.012))
    PALP[side] = (sh, el, wr, tip)
    tube(f'palp_upper.{side}', [sh, (sh + el) / 2 + Vector((0, 0, 0.012)), el], [0.070, 0.066, 0.062], M_PLUSH, f'palp_upper.{side}')
    tube(f'palp_lower.{side}', [el, (el + wr) / 2, wr], [0.062, 0.064, 0.068], M_PLUSH, f'palp_lower.{side}')
    # claw: plump "hand" + fixed finger + movable thumb forming a pincer
    ellipsoid(f'claw_palm.{side}', wr + Vector((0, -0.045, 0.004)), (0.082, 0.092, 0.074), M_PLUSH, f'claw.{side}')
    tube(f'claw_finger.{side}', [wr + Vector((sx * 0.030, -0.085, 0.006)), wr + Vector((sx * 0.040, -0.150, 0.008)), wr + Vector((sx * 0.018, -0.200, 0.008))], [0.048, 0.042, 0.030], M_PLUSH, f'claw.{side}')
    tube(f'claw_thumb.{side}', [wr + Vector((sx * -0.045, -0.070, 0.004)), wr + Vector((sx * -0.070, -0.125, 0.006)), wr + Vector((sx * -0.050, -0.175, 0.008))], [0.040, 0.036, 0.026], M_PLUSH, f'thumb.{side}')

# ---- EXACTLY eight walking legs: four per side, two segments each ----
LEG_COUNT_PER_SIDE = 4
LEG_FAN = [-34, -8, 20, 46]  # degrees from straight sideways: negative = toward the front
LEGS = {}
for side, sx in (('L', 1), ('R', -1)):
    for i in range(LEG_COUNT_PER_SIDE):
        a = math.radians(LEG_FAN[i]); out = Vector((sx * math.cos(a), math.sin(a), 0))
        hip = Vector((sx * 0.150, 0.015 + i * 0.082, 0.235)) + out * 0.02
        knee = hip + out * 0.175 + Vector((0, 0, 0.055))
        foot = knee + out * 0.095 + Vector((0, 0, -0.285))
        foot.z = 0.058
        LEGS[(side, i)] = (hip, knee, foot)
        tube(f'leg{i + 1}_upper.{side}', [hip, (hip + knee) / 2 + Vector((0, 0, 0.012)), knee], [0.070, 0.068, 0.066], M_PLUSH, f'leg{i + 1}_upper.{side}')
        mid = (knee + foot) / 2 + out * 0.012
        tube(f'leg{i + 1}_lower.{side}', [knee, mid, foot], [0.066, 0.064, 0.062], M_PLUSH, f'leg{i + 1}_lower.{side}')
assert len(LEGS) == 8, 'the mascot must have exactly eight walking legs'

# ---- small book prop (only visible in the "read" clip) ----
BOOK_C = Vector((0, -0.42, 0.34))
box('book_cover', BOOK_C, (0.20, 0.15, 0.022), M_NAVY, 'prop_book', rot=Euler((math.radians(-55), 0, 0)), bevel=0.003)
box('book_pages', BOOK_C + Euler((math.radians(-55), 0, 0)).to_matrix() @ Vector((0, 0, 0.013)), (0.185, 0.138, 0.012), M_PAPER, 'prop_book', rot=Euler((math.radians(-55), 0, 0)), bevel=0.002)

# --------------------------------------------------------------------------- armature
arm_data = bpy.data.armatures.new('MascotRig'); arm = bpy.data.objects.new('Mascot', arm_data)
scene.collection.objects.link(arm); bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
EB = arm_data.edit_bones
def bone(name, head, tail, parent=None):
    b = EB.new(name); b.head = Vector(head); b.tail = Vector(tail); b.roll = 0
    if parent: b.parent = EB[parent]
    return b
bone('root', (0, 0, 0), (0, 0, 0.12))
bone('body', (0, 0.06, 0.26), (0, 0.0, 0.44), 'root')
bone('abdomen', (0, 0.14, 0.30), (0, 0.50, 0.32), 'body')
bone('head', (0, -0.04, 0.46), (0, -0.07, 0.70), 'body')
bone('tassel', T_EDGE, T_EDGE + Vector((0, 0, -0.16)), 'head')
bone('mouth', MOUTH_C, MOUTH_C + MOUTH_N * 0.05, 'head')
bone('pendant', PEND_C + Vector((0, 0, 0.07)), PEND_C + Vector((0, 0, -0.05)), 'body')
bone('prop_book', BOOK_C, BOOK_C + Vector((0, 0, 0.08)), 'body')
for side in ('L', 'R'):
    c, n = EYE_PIVOT[side]; bone(f'eye.{side}', c, c + n * 0.04, 'head')
    sh, el, wr, tip = PALP[side]
    bone(f'palp_upper.{side}', sh, el, 'body'); bone(f'palp_lower.{side}', el, wr, f'palp_upper.{side}')
    bone(f'claw.{side}', wr, tip, f'palp_lower.{side}')
    sx = 1 if side == 'L' else -1
    bone(f'thumb.{side}', wr + Vector((sx * -0.045, -0.06, 0.004)), wr + Vector((sx * -0.05, -0.175, 0.008)), f'claw.{side}')
    for i in range(LEG_COUNT_PER_SIDE):
        hip, knee, foot = LEGS[(side, i)]
        bone(f'leg{i + 1}_upper.{side}', hip, knee, 'body'); bone(f'leg{i + 1}_lower.{side}', knee, foot, f'leg{i + 1}_upper.{side}')
bpy.ops.object.mode_set(mode='OBJECT')

# rigid plush skinning: every part follows exactly one bone (toy-like seams at the joints)
for ob, bname in PARTS:
    assert bname in arm_data.bones, bname
    vg = ob.vertex_groups.new(name=bname); vg.add(range(len(ob.data.vertices)), 1.0, 'REPLACE')
bpy.ops.object.select_all(action='DESELECT')
for ob, _ in PARTS: ob.select_set(True)
bpy.context.view_layer.objects.active = PARTS[0][0]
bpy.ops.object.join()
body = bpy.context.view_layer.objects.active; body.name = 'MascotMesh'; body.data.name = 'MascotMesh'
body.parent = arm
mod = body.modifiers.new('Armature', 'ARMATURE'); mod.object = arm

# --------------------------------------------------------------------------- animation
bpy.context.view_layer.objects.active = arm
arm.animation_data_create()
REST = {b.name: b.matrix_local.to_3x3() for b in arm_data.bones}
for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'

class Clip:
    """Keyframes are authored as armature-space ("world") rotations/offsets and converted to bone space."""
    def __init__(self, name, frames, loop=True):
        self.name, self.frames, self.loop = name, frames, loop
        self.action = bpy.data.actions.new(name); arm.animation_data.action = self.action
        self.touched = set()
    def rot(self, bone, frame, x=0.0, y=0.0, z=0.0):
        """Rotate `bone` away from rest by Euler degrees about armature X (pitch), Y (roll), Z (yaw)."""
        pb = arm.pose.bones[bone]; R = REST[bone]
        q = Euler((math.radians(x), math.radians(y), math.radians(z)), 'XYZ').to_matrix()
        pb.rotation_quaternion = (R.inverted() @ q @ R).to_quaternion()
        pb.keyframe_insert('rotation_quaternion', frame=frame); self.touched.add(bone)
    def loc(self, bone, frame, x=0.0, y=0.0, z=0.0):
        pb = arm.pose.bones[bone]; pb.location = REST[bone].inverted() @ Vector((x, y, z))
        pb.keyframe_insert('location', frame=frame); self.touched.add(bone)
    def scale(self, bone, frame, s):
        pb = arm.pose.bones[bone]; pb.scale = (s, s, s) if isinstance(s, (int, float)) else s
        pb.keyframe_insert('scale', frame=frame); self.touched.add(bone)
    def done(self):
        # make sure quaternions take the short way round, then park the action on its own NLA track
        for fc in self.action.fcurves if hasattr(self.action, 'fcurves') else []: pass
        tr = arm.animation_data.nla_tracks.new(); tr.name = self.name
        st = tr.strips.new(self.name, 0, self.action); st.name = self.name
        arm.animation_data.action = None
        for pb in arm.pose.bones:
            pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)

SIDES = (('L', 1), ('R', -1))
def leg_pose(c, f, side, sx, i, swing=0.0, lift=0.0, spread=0.0):
    """swing>0 moves the foot forward; lift>0 raises the foot; spread>0 moves it outward."""
    c.rot(f'leg{i + 1}_upper.{side}', f, y=-sx * (lift * 0.55 + spread), z=sx * swing)
    c.rot(f'leg{i + 1}_lower.{side}', f, y=-sx * (lift * 0.75 - spread * 0.6))
def rest_extras(c, f, book=False):
    c.scale('prop_book', f, 1.0 if book else 0.0001)
def blink(c, f):
    for s, _ in SIDES:
        c.scale(f'eye.{s}', f - 2, (1, 1, 1)); c.scale(f'eye.{s}', f, (1, 1, 0.12)); c.scale(f'eye.{s}', f + 3, (1, 1, 1))
def palps(c, f, L=(0, 0, 0), R=(0, 0, 0), lowL=(0, 0, 0), lowR=(0, 0, 0), clawL=0.0, clawR=0.0):
    """Pedipalp pose. Tuples are (pitch up, roll, yaw-inward) in degrees, mirrored automatically."""
    for side, sx, up, low, claw in (('L', 1, L, lowL, clawL), ('R', -1, R, lowR, clawR)):
        c.rot(f'palp_upper.{side}', f, x=-up[0], y=sx * up[1], z=-sx * up[2])
        c.rot(f'palp_lower.{side}', f, x=-low[0], y=sx * low[1], z=-sx * low[2])
        c.rot(f'thumb.{side}', f, z=-sx * claw)

# Alternating tetrapod gait: legs L1 R2 L3 R4 move together, R1 L2 R3 L4 are half a cycle behind.
def gait_phase(side, i): return 0.0 if (i % 2 == 0) == (side == 'L') else 0.5

def make_walk(name, frames, swing_amp, lift_amp, turn=False, bob=0.012):
    c = Clip(name, frames)
    for f in range(0, frames + 1, 2):
        t = f / frames
        for side, sx in SIDES:
            for i in range(4):
                ph = 2 * math.pi * (t + gait_phase(side, i))
                direction = (sx if turn else 1)  # when turning on the spot the two sides step in opposite directions
                swing = math.cos(ph) * swing_amp * direction
                lift = max(0.0, math.sin(ph)) * lift_amp  # foot is in the air only while it travels forward
                leg_pose(c, f, side, sx, i, swing=swing, lift=lift)
        w = 2 * math.pi * t
        c.loc('body', f, z=math.sin(2 * w) * bob)
        c.rot('body', f, y=math.sin(w) * 2.2, z=(math.sin(w) * 5 if turn else math.sin(w) * 1.6))
        c.rot('abdomen', f, x=math.sin(2 * w + 1.0) * 3.0, z=-math.sin(w) * 4.5)
        c.rot('head', f, x=math.sin(2 * w + 0.6) * 2.5, y=-math.sin(w) * 2.0)
        c.rot('tassel', f, x=math.sin(2 * w + 2.0) * 9, y=math.sin(w + 1.0) * 12)
        c.rot('pendant', f, x=math.sin(2 * w + 1.4) * 7)
        palps(c, f, L=(6 + math.sin(w) * 7, 0, 4), R=(6 - math.sin(w) * 7, 0, 4), lowL=(math.sin(w) * 5, 0, 0), lowR=(-math.sin(w) * 5, 0, 0))
        rest_extras(c, f)
    c.done()

make_walk('walk', 24, swing_amp=17, lift_amp=24)
make_walk('turn', 24, swing_amp=11, lift_amp=20, turn=True, bob=0.008)

def breathing(c, f, frames, amount=1.0, head=(0, 0, 0)):
    w = 2 * math.pi * f / frames
    c.loc('body', f, z=math.sin(w) * 0.006 * amount)
    c.rot('abdomen', f, x=math.sin(w) * 2.0 * amount)
    c.rot('head', f, x=head[0] + math.sin(w + 0.8) * 1.5 * amount, y=head[1], z=head[2])
    c.rot('tassel', f, y=math.sin(w) * 4 * amount, x=math.cos(w) * 3 * amount)
    c.rot('pendant', f, x=math.sin(w + 1) * 2 * amount)

def legs_still(c, f, lift=0.0, spread=0.0):
    for side, sx in SIDES:
        for i in range(4): leg_pose(c, f, side, sx, i, lift=lift, spread=spread)

# idle: breathing, a blink, tiny pedipalp sway
c = Clip('idle', 96)
for f in range(0, 97, 8):
    w = 2 * math.pi * f / 96
    breathing(c, f, 96, head=(0, math.sin(w) * 2.0, math.sin(w * 2) * 3.0))
    palps(c, f, L=(math.sin(w) * 4, 0, 2), R=(math.sin(w + 1) * 4, 0, 2), clawL=6 + math.sin(w * 2) * 6, clawR=6 + math.cos(w * 2) * 6)
    legs_still(c, f); rest_extras(c, f); c.rot('mouth', f)
blink(c, 40); blink(c, 82)
c.done()

# wave: right pedipalp raised and waving (as on the owner reference photo)
c = Clip('wave', 56)
for f, a in ((0, 0), (10, 1), (18, -1), (26, 1), (34, -1), (42, 1), (56, 0)):
    k = 0 if f in (0, 56) else 1
    breathing(c, f, 56, head=(-4 * k, -5 * k, 0))
    palps(c, f, R=(78 * k, -18 * k + a * 16 * k, -22 * k), lowR=(28 * k, a * 24 * k, 0), L=(4, 0, 2), clawR=18 * k)
    legs_still(c, f); rest_extras(c, f)
blink(c, 30)
c.done()

# welcome: both pedipalps open wide, small bow
c = Clip('welcome', 64)
for f, k, bow in ((0, 0, 0), (12, 1, 0), (26, 1, 1), (40, 1, 0.2), (52, 0.8, 0), (64, 0, 0)):
    breathing(c, f, 64, head=(10 * bow, 0, 0))
    c.rot('body', f, x=8 * bow)
    palps(c, f, L=(38 * k, 0, -46 * k), R=(38 * k, 0, -46 * k), lowL=(10 * k, 0, -24 * k), lowR=(10 * k, 0, -24 * k), clawL=22 * k, clawR=22 * k)
    legs_still(c, f, spread=2 * bow); rest_extras(c, f)
c.done()

# guide: beckoning "follow me" loop with the left pedipalp while looking back
c = Clip('guide', 48)
for f in range(0, 49, 6):
    w = 2 * math.pi * f / 48
    breathing(c, f, 48, head=(-3, 0, 16))
    palps(c, f, L=(46 + math.sin(w * 2) * 14, 0, -10), lowL=(24 + math.sin(w * 2 + 1) * 26, 0, 12), R=(6, 0, 2), clawL=10)
    legs_still(c, f); rest_extras(c, f)
c.done()

# point: one-shot, right pedipalp extends forward
c = Clip('point', 44, loop=False)
for f, k in ((0, 0), (10, 1), (30, 1), (44, 0)):
    breathing(c, f, 44, head=(-3 * k, 0, -8 * k))
    c.rot('body', f, x=5 * k)
    palps(c, f, R=(34 * k, 0, 20 * k), lowR=(-6 * k, 0, 18 * k), L=(4, 0, 2), clawR=2)
    legs_still(c, f); rest_extras(c, f)
c.done()

# search: body low, head sweeping, pedipalps probing the shelf
c = Clip('search', 64)
for f in range(0, 65, 8):
    w = 2 * math.pi * f / 64
    c.loc('body', f, z=-0.022 + math.sin(w * 2) * 0.004)
    c.rot('body', f, x=7)
    c.rot('head', f, x=-8 + math.sin(w * 2) * 4, z=math.sin(w) * 26)
    c.rot('abdomen', f, x=-4, z=-math.sin(w) * 5)
    c.rot('tassel', f, y=-math.sin(w) * 14)
    palps(c, f, L=(40 + math.sin(w * 2) * 16, 0, 8), R=(40 - math.sin(w * 2) * 16, 0, 8), lowL=(10 + math.sin(w * 2) * 10, 0, 6), lowR=(10 - math.sin(w * 2) * 10, 0, 6), clawL=14 + math.sin(w * 4) * 12, clawR=14 - math.sin(w * 4) * 12)
    legs_still(c, f, spread=3); rest_extras(c, f)
c.done()

# think: claw to chin, head tilted, slow tap
c = Clip('think', 60)
for f in range(0, 61, 10):
    w = 2 * math.pi * f / 60
    breathing(c, f, 60, head=(-6, 9, 10))
    palps(c, f, R=(52, 0, 44), lowR=(62 + math.sin(w * 2) * 5, 0, 30), L=(4, 0, 6), clawR=4)
    legs_still(c, f); rest_extras(c, f)
    c.scale('mouth', f, (0.62, 1, 1))
blink(c, 34)
c.done()

# celebrate: two hops with both pedipalps up; all eight legs push off and spread
c = Clip('celebrate', 48)
for f, h in ((0, 0), (6, -0.02), (13, 0.13), (20, 0), (24, -0.02), (31, 0.13), (38, 0), (48, 0)):
    air = 1 if h > 0.05 else 0; crouch = 1 if h < 0 else 0
    c.loc('body', f, z=h)
    c.rot('body', f, x=-6 * air)
    c.rot('head', f, x=-8 * air + 5 * crouch)
    c.rot('abdomen', f, x=10 * air - 4 * crouch)
    c.rot('tassel', f, x=-26 * air + 10 * crouch, y=10 * air)
    c.rot('pendant', f, x=22 * air)
    up = 0.25 if f in (0, 48) else 1
    palps(c, f, L=(72 * up + 12 * air, 0, -24 * up), R=(72 * up + 12 * air, 0, -24 * up), lowL=(18 * up, 0, -8), lowR=(18 * up, 0, -8), clawL=24 * air, clawR=24 * air)
    legs_still(c, f, lift=-16 * air + 9 * crouch, spread=7 * air - 4 * crouch); rest_extras(c, f)
c.done()

# sad: head and pedipalps droop, the smile turns upside down
c = Clip('sad', 72)
for f, k in ((0, 0), (16, 1), (36, 0.92), (56, 1), (72, 0)):
    c.loc('body', f, z=-0.015 * k)
    c.rot('body', f, x=6 * k)
    c.rot('head', f, x=20 * k, y=4 * k)
    c.rot('abdomen', f, x=-5 * k)
    c.rot('tassel', f, x=18 * k)
    palps(c, f, L=(-16 * k, 0, 12 * k), R=(-16 * k, 0, 12 * k), lowL=(-10 * k, 0, 10 * k), lowR=(-10 * k, 0, 10 * k))
    legs_still(c, f, spread=-2 * k); rest_extras(c, f)
    c.rot('mouth', f, y=180 * k)  # flips the stitched smile into a frown
    for s, _ in SIDES: c.scale(f'eye.{s}', f, (1, 1, 1 - 0.28 * k))
c.done()

# read: holds a small book in both claws, head follows the lines
c = Clip('read', 96)
for f in range(0, 97, 8):
    w = 2 * math.pi * f / 96
    breathing(c, f, 96, head=(17, 0, math.sin(w * 2) * 7))
    palps(c, f, L=(24, 0, 34), R=(24, 0, 34), lowL=(20, 0, 30), lowR=(20, 0, 30), clawL=4, clawR=4)
    legs_still(c, f); rest_extras(c, f, book=True)
blink(c, 50)
c.done()

CLIPS = [t.name for t in arm.animation_data.nla_tracks]
assert CLIPS == ['walk', 'turn', 'idle', 'wave', 'welcome', 'guide', 'point', 'search', 'think', 'celebrate', 'sad', 'read'], CLIPS

# --------------------------------------------------------------------------- export
os.makedirs(os.path.dirname(OUT), exist_ok=True)
body['mascot_identity'] = 'UOT Central Library mascot - pseudoscorpion - 8 legs - 2 pedipalps - no tail'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_animations=True,
                          export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_step=2,
                          export_skins=True, export_yup=True, export_apply=False, export_image_format='AUTO',
                          export_optimize_animation_size=True, export_extras=True)
print('MASCOT_OK', OUT, os.path.getsize(OUT), 'bytes; bones', len(arm_data.bones), 'tris', sum(len(p.vertices) - 2 for p in body.data.polygons))
if '--preview' in sys.argv:
    blend = os.path.join(os.path.dirname(OUT), '../../../assets-src/mascot.blend')
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(blend))

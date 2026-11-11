"""
Builds the custom library furniture kit and normalises the CC0 Kenney props into one coherent set.

Normalisation rules applied to EVERY exported model (custom or third-party):
  * metres, Z-up in Blender / Y-up in glTF, origin at the centre of the footprint on the floor
  * front of the object faces -Y in Blender (south in the game layout)
  * materials are reduced to the shared palette names below; the engine binds one shared PBR
    material per name, so every model has the same wood, navy, brass, ivory … response
  * no embedded textures (the palette materials are textured once, in the engine)
Run:  python3 tools/blender/build_furniture.py
"""
import bpy, bmesh, math, os, random, json, hashlib
from mathutils import Vector, Matrix, Euler

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
OUT = os.path.join(ROOT, 'public/assets/models'); SRC = os.path.join(ROOT, 'assets-src/kenney')
os.makedirs(OUT, exist_ok=True)

PALETTE = {  # name: (base colour sRGB 0-1, roughness, metallic)
    'wood': ((0.42, 0.26, 0.15), 0.55, 0), 'wood_dark': ((0.24, 0.14, 0.08), 0.5, 0), 'wood_light': ((0.66, 0.50, 0.33), 0.6, 0),
    'navy': ((0.07, 0.12, 0.27), 0.55, 0), 'navy_fabric': ((0.09, 0.15, 0.33), 0.95, 0), 'brass': ((0.80, 0.60, 0.22), 0.3, 1),
    'ivory': ((0.92, 0.89, 0.81), 0.6, 0), 'marble': ((0.90, 0.88, 0.82), 0.25, 0), 'dark': ((0.06, 0.065, 0.08), 0.45, 0.3),
    'steel': ((0.55, 0.57, 0.60), 0.35, 0.9), 'leaf': ((0.17, 0.42, 0.22), 0.8, 0), 'terracotta': ((0.74, 0.70, 0.62), 0.7, 0),
    'screen': ((0.10, 0.22, 0.40), 0.2, 0), 'lamp_glow': ((1.0, 0.86, 0.6), 0.5, 0), 'paper': ((0.95, 0.93, 0.86), 0.8, 0),
    'books': ((1, 1, 1), 0.75, 0), 'rope': ((0.10, 0.16, 0.36), 0.9, 0), 'gold_leaf': ((0.86, 0.68, 0.28), 0.35, 1),
}
KENNEY_MAT = {'wood': 'wood', 'woodDark': 'wood_dark', 'carpet': 'navy_fabric', 'carpetBlue': 'navy_fabric', 'carpetDarker': 'navy', 'carpetWhite': 'ivory',
              'metal': 'ivory', 'metalDark': 'dark', 'metalMedium': 'steel', 'plant': 'leaf', 'grass': 'leaf', 'lamp': 'lamp_glow', '_defaultMat': 'ivory',
              'leafsGreen': 'leaf', 'woodBark': 'wood_dark', 'colorYellow': 'brass'}

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name):
    m = bpy.data.materials.get(name)
    if m: return m
    col, rough, metal = PALETTE[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    lin = [((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92 for c in col]
    b.inputs['Base Color'].default_value = (*lin, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if name == 'books':
        vc = m.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'
        m.node_tree.links.new(vc.outputs['Color'], b.inputs['Base Color'])
    return m

class Model:
    """Accumulates geometry per palette material, then exports one GLB."""
    def __init__(self, name): reset(); self.name = name; self.bms = {}; self.rng = random.Random(hash(name) % 9973)
    def bm(self, m):
        if m not in self.bms:
            b = bmesh.new(); b.loops.layers.color.new('Col'); self.bms[m] = b
        return self.bms[m]
    def box(self, m, c, s, bevel=0.012, rot=None, color=None):
        b = self.bm(m); geo = bmesh.ops.create_cube(b, size=1.0); vs = geo['verts']
        for v in vs: v.co = Vector((v.co.x * s[0], v.co.y * s[1], v.co.z * s[2]))
        if bevel and min(s) > bevel * 2.5:
            es = list({e for v in vs for e in v.link_edges})
            r = bmesh.ops.bevel(b, geom=es, offset=bevel, segments=1 if m == 'books' else 2, affect='EDGES', clamp_overlap=True)
            vs = list({v for f in r['faces'] for v in f.verts} | {v for v in vs if v.is_valid})
        R = (rot.to_matrix() if rot else Matrix.Identity(3))
        faces = {f for v in vs for f in v.link_faces}
        for v in vs: v.co = R @ v.co + Vector(c)
        if color:
            lay = b.loops.layers.color['Col']
            for f in faces:
                for l in f.loops: l[lay] = (*color, 1)
        return vs
    def cyl(self, m, c, r, h, seg=20, r2=None, rot=None, color=None):
        b = self.bm(m); geo = bmesh.ops.create_cone(b, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
        R = (rot.to_matrix() if rot else Matrix.Identity(3))
        for v in geo['verts']: v.co = R @ v.co + Vector(c)
    def sphere(self, m, c, r, scale=(1, 1, 1)):
        b = self.bm(m); geo = bmesh.ops.create_uvsphere(b, u_segments=16, v_segments=10, radius=r)
        for v in geo['verts']: v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2])) + Vector(c)
    def books_row(self, x0, x1, y, z, depth, hmax, fill=1.0, lean=True):
        """A row of individual books with varied width, height and cloth colour (vertex colours)."""
        hues = [(0.12, 0.19, 0.40), (0.50, 0.14, 0.13), (0.14, 0.33, 0.25), (0.62, 0.47, 0.20), (0.33, 0.20, 0.12), (0.80, 0.76, 0.66), (0.20, 0.30, 0.45), (0.45, 0.25, 0.33), (0.10, 0.12, 0.18), (0.55, 0.32, 0.14)]
        x = x0 + 0.01; r = self.rng
        while x < x1 - 0.03:
            if r.random() > fill: x += r.uniform(0.05, 0.16); continue
            w = r.uniform(0.028, 0.062); h = hmax * r.uniform(0.72, 0.98); d = depth * r.uniform(0.82, 0.98)
            if x + w > x1 - 0.005: break
            col = hues[r.randrange(len(hues))]; k = r.uniform(0.85, 1.12); col = tuple(min(1, c * k) for c in col)
            tilt = Euler((0, r.uniform(-0.16, 0.16) if (lean and r.random() < 0.07) else 0, 0))
            self.box('books', (x + w / 2, y, z + h / 2), (w * 0.94, d, h), bevel=0.004, rot=None if tilt.y == 0 else tilt, color=col)
            if r.random() < 0.55:  # gold title band on the spine
                self.box('gold_leaf', (x + w / 2, y - d / 2 - 0.0012, z + h * r.uniform(0.62, 0.8)), (w * 0.7, 0.002, h * 0.05), bevel=0)
            x += w + 0.002
    def export(self):
        obs = []
        for m, b in self.bms.items():
            me = bpy.data.meshes.new(f'{self.name}_{m}'); bmesh.ops.recalc_face_normals(b, faces=b.faces[:]); b.to_mesh(me); b.free()
            if m != 'books': me.color_attributes.remove(me.color_attributes['Col'])
            for p in me.polygons: p.use_smooth = False
            ob = bpy.data.objects.new(f'{self.name}_{m}', me); bpy.context.scene.collection.objects.link(ob); me.materials.append(mat(m)); obs.append(ob)
        return export_selected(self.name, obs)

def export_selected(name, obs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs: o.select_set(True)
    path = os.path.join(OUT, name + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_animations=False, export_yup=True, export_apply=True,
                              export_vertex_color='MATERIAL', export_all_vertex_colors=False, export_extras=False)
    tris = sum(len(p.vertices) - 2 for o in obs for p in o.data.polygons)
    print(f'  {name}: {os.path.getsize(path)} bytes, {tris} tris')
    return path

# =========================================================================== custom library furniture
def shelf():
    m = Model('shelf'); W, D, H = 2.0, 0.5, 2.35; t = 0.045
    m.box('wood', (0, 0, 0.06), (W, D, 0.12), bevel=0.01)                      # plinth
    m.box('wood', (-W / 2 + t / 2, 0, H / 2), (t, D, H)); m.box('wood', (W / 2 - t / 2, 0, H / 2), (t, D, H))
    m.box('wood', (0, 0, H / 2 + 0.06), (t, D * 0.96, H - 0.12))                # centre upright
    m.box('wood_dark', (0, D / 2 - 0.012, H / 2), (W - t, 0.02, H - 0.1), bevel=0)  # back panel
    m.box('wood', (0, -0.01, H + 0.035), (W + 0.10, D + 0.08, 0.07), bevel=0.02)   # cornice
    m.box('brass', (0, -D / 2 - 0.035, H - 0.005), (W + 0.06, 0.012, 0.014), bevel=0)
    levels = [0.14, 0.56, 0.98, 1.40, 1.82]
    for i, z in enumerate(levels):
        m.box('wood', (0, 0, z - 0.018), (W - t * 2, D * 0.96, 0.036), bevel=0.006)
        top = (levels[i + 1] if i + 1 < len(levels) else H) - z - 0.07
        for x0, x1 in ((-W / 2 + t, -t / 2), (t / 2, W / 2 - t)):
            m.books_row(x0, x1, -0.03, z, 0.30, top, fill=0.93)
            m.box('brass', ((x0 + x1) / 2, -D / 2 + 0.006, z - 0.018), (0.16, 0.006, 0.026), bevel=0)  # shelf label holder
    return m.export()

def lowshelf():
    m = Model('lowshelf'); W, D, H = 2.4, 0.8, 1.12; t = 0.04
    m.box('wood', (0, 0, 0.05), (W, D, 0.10), bevel=0.01)
    for x in (-W / 2 + t / 2, 0, W / 2 - t / 2): m.box('wood', (x, 0, H / 2), (t, D, H - 0.02))
    m.box('wood_dark', (0, 0, H / 2), (W - t, 0.02, H - 0.1), bevel=0)
    m.box('wood', (0, 0, H + 0.02), (W + 0.06, D + 0.06, 0.05), bevel=0.016)
    for z in (0.10, 0.60):
        m.box('wood', (0, 0, z - 0.015), (W - t * 2, D * 0.97, 0.03), bevel=0.005)
        for sy in (-1, 1):
            for x0, x1 in ((-W / 2 + t, -t / 2), (t / 2, W / 2 - t)):
                r = Model.books_row
                # both faces of the double-sided shelf hold books
                m.books_row(x0, x1, sy * 0.21, z, 0.28, 0.40, fill=0.9)
    # display stands on top
    for x in (-0.75, 0.0, 0.75):
        m.box('books', (x, 0, H + 0.19), (0.26, 0.035, 0.34), bevel=0.004, rot=Euler((math.radians(-12), 0, 0)), color=m.rng.choice([(0.12, 0.19, 0.4), (0.5, 0.14, 0.13), (0.14, 0.33, 0.25)]))
        m.box('brass', (x, 0.03, H + 0.06), (0.2, 0.12, 0.012), bevel=0)
    return m.export()

def table():
    m = Model('table'); W, D, H = 2.2, 1.1, 0.76
    m.box('wood', (0, 0, H - 0.025), (W, D, 0.05), bevel=0.016)
    m.box('wood_dark', (0, 0, H - 0.085), (W - 0.2, D - 0.2, 0.07), bevel=0.006)
    for sx in (-1, 1):
        for sy in (-1, 1):
            m.box('wood_dark', (sx * (W / 2 - 0.12), sy * (D / 2 - 0.12), (H - 0.05) / 2), (0.075, 0.075, H - 0.05), bevel=0.012)
            m.box('brass', (sx * (W / 2 - 0.12), sy * (D / 2 - 0.12), 0.03), (0.085, 0.085, 0.06), bevel=0.006)
    m.box('wood_dark', (0, 0, 0.16), (W - 0.3, 0.05, 0.04), bevel=0.006)
    # low centre divider with a brass rail and two green-shade style reading lamps (navy shade, brass stem)
    m.box('wood', (0, 0, H + 0.05), (W - 0.5, 0.035, 0.10), bevel=0.008)
    m.box('brass', (0, 0, H + 0.105), (W - 0.46, 0.02, 0.012), bevel=0)
    for x in (-0.55, 0.55):
        m.cyl('brass', (x, 0, H + 0.12), 0.05, 0.02); m.cyl('brass', (x, 0, H + 0.24), 0.011, 0.24, seg=10)
        m.box('navy', (x, 0, H + 0.385), (0.36, 0.17, 0.07), bevel=0.03)
        m.box('lamp_glow', (x, 0, H + 0.348), (0.31, 0.13, 0.012), bevel=0)
    return m.export()

def desk_block(m, W, D, H, panels):
    m.box('wood_dark', (0, 0, 0.05), (W - 0.04, D - 0.06, 0.10), bevel=0.006)             # recessed plinth
    m.box('wood', (0, 0.04, (H - 0.1) / 2 + 0.1), (W, D - 0.12, H - 0.14), bevel=0.012)   # body
    m.box('marble', (0, 0.0, H - 0.02), (W + 0.08, D, 0.045), bevel=0.014)                 # stone top
    m.box('brass', (0, -D / 2 + 0.075, 0.125), (W - 0.02, 0.012, 0.03), bevel=0)           # kick rail
    pw = (W - 0.16) / panels
    for i in range(panels):  # navy inset panels with brass frames on the public face
        x = -W / 2 + 0.08 + pw * (i + 0.5)
        m.box('brass', (x, -D / 2 + 0.058, H / 2 + 0.03), (pw - 0.07, 0.012, H - 0.36), bevel=0)
        m.box('navy', (x, -D / 2 + 0.052, H / 2 + 0.03), (pw - 0.10, 0.016, H - 0.39), bevel=0.004)

def counter():
    m = Model('counter'); W, D, H = 5.0, 0.9, 1.06
    desk_block(m, W, D, H, 6)
    m.box('wood', (0, -D / 2 + 0.14, H + 0.07), (W + 0.04, 0.26, 0.05), bevel=0.014)       # raised customer ledge
    m.box('brass', (0, -D / 2 + 0.01, H + 0.07), (W, 0.012, 0.02), bevel=0)
    for x in (-1.9, 0, 1.9): m.box('wood_dark', (x, -D / 2 + 0.14, H + 0.02), (0.06, 0.2, 0.06), bevel=0.006)
    # book-return slot + two neat stacks waiting to be processed
    m.box('dark', (1.3, -D / 2 + 0.05, 0.62), (0.5, 0.02, 0.07), bevel=0); m.box('brass', (1.3, -D / 2 + 0.046, 0.72), (0.5, 0.008, 0.05), bevel=0)
    for x, n in ((-1.55, 4), (2.1, 3), (0.55, 2)):
        for k in range(n):
            m.box('books', (x + m.rng.uniform(-0.01, 0.01), 0.16, H + 0.02 + 0.045 * k + 0.02), (0.26, 0.19, 0.04), bevel=0.004, rot=Euler((0, 0, m.rng.uniform(-0.25, 0.25))), color=m.rng.choice([(0.12, 0.19, 0.4), (0.5, 0.14, 0.13), (0.14, 0.33, 0.25), (0.62, 0.47, 0.2)]))
    return m.export()

def refdesk():
    m = Model('refdesk'); W, D, H = 2.6, 0.9, 1.0
    desk_block(m, W, D, H, 3)
    m.box('wood', (0, -D / 2 + 0.14, H + 0.06), (W + 0.04, 0.24, 0.045), bevel=0.012)
    for k in range(3): m.box('books', (-0.85, 0.15, H + 0.02 + 0.05 * k + 0.02), (0.3, 0.22, 0.045), bevel=0.004, rot=Euler((0, 0, 0.1 * k)), color=[(0.33, 0.2, 0.12), (0.12, 0.19, 0.4), (0.5, 0.14, 0.13)][k])
    return m.export()

def digitaldesk():
    m = Model('digitaldesk'); desk_block(m, 2.2, 0.8, 0.98, 3); return m.export()

def pcdesk():
    m = Model('pcdesk'); W, D, H = 1.5, 0.8, 0.76
    m.box('wood', (0, 0, H - 0.022), (W, D, 0.044), bevel=0.012)
    for sx in (-1, 1): m.box('wood', (sx * (W / 2 - 0.02), 0.0, (H + 0.42) / 2), (0.04, D, H + 0.42), bevel=0.012)   # privacy sides
    m.box('wood_dark', (0, D / 2 - 0.02, (H + 0.42) / 2 + 0.2), (W - 0.04, 0.03, H + 0.02), bevel=0.006)
    m.box('navy', (0, D / 2 - 0.04, H + 0.22), (W - 0.12, 0.012, 0.34), bevel=0.004)                              # pin-board
    m.box('brass', (0, -D / 2 + 0.01, H - 0.022), (W - 0.1, 0.008, 0.02), bevel=0)
    m.box('dark', (0.5, 0.05, 0.25), (0.2, 0.45, 0.42), bevel=0.015)                                              # tower PC
    m.box('lamp_glow', (0.5, -0.18, 0.4), (0.02, 0.004, 0.02), bevel=0)
    return m.export()

def printer():
    m = Model('printer')
    m.box('wood', (0, 0, 0.36), (0.8, 0.8, 0.72), bevel=0.012); m.box('wood_dark', (0, -0.395, 0.36), (0.66, 0.012, 0.56), bevel=0.004)
    m.box('brass', (0, -0.41, 0.52), (0.14, 0.012, 0.02), bevel=0)
    m.box('ivory', (0, 0, 0.92), (0.66, 0.6, 0.38), bevel=0.03); m.box('dark', (0, -0.02, 1.13), (0.6, 0.52, 0.05), bevel=0.012)
    m.box('dark', (0, -0.305, 0.86), (0.5, 0.012, 0.06), bevel=0); m.box('paper', (0, -0.40, 0.845), (0.42, 0.24, 0.012), bevel=0)
    m.box('ivory', (0, -0.36, 0.83), (0.48, 0.22, 0.015), bevel=0.004)
    m.box('screen', (0.2, -0.26, 1.165), (0.16, 0.1, 0.012), bevel=0, rot=Euler((math.radians(25), 0, 0)))
    return m.export()

def podium():
    m = Model('podium')
    m.box('wood_dark', (0, 0, 0.04), (0.6, 0.5, 0.08), bevel=0.008); m.box('wood', (0, 0, 0.56), (0.5, 0.4, 1.0), bevel=0.014)
    m.box('navy', (0, -0.204, 0.6), (0.36, 0.012, 0.7), bevel=0.004); m.box('brass', (0, -0.21, 0.6), (0.2, 0.008, 0.2), bevel=0.02)
    m.box('wood', (0, -0.02, 1.1), (0.7, 0.56, 0.05), bevel=0.014, rot=Euler((math.radians(12), 0, 0)))
    m.box('paper', (0, -0.04, 1.135), (0.4, 0.3, 0.012), bevel=0, rot=Euler((math.radians(12), 0, 0)))
    return m.export()

def cart():
    m = Model('cart'); W, D = 0.7, 1.1   # returned-books trolley (Dewey mini-game object)
    for sx in (-1, 1):
        for sy in (-1, 1):
            m.cyl('steel', (sx * 0.29, sy * 0.46, 0.55), 0.018, 1.0, seg=10); m.cyl('dark', (sx * 0.29, sy * 0.46, 0.05), 0.05, 0.04, rot=Euler((0, math.radians(90), 0)))
    for z in (0.16, 0.56, 0.96):
        m.box('wood', (0, 0, z), (W - 0.06, D - 0.1, 0.03), bevel=0.008); m.box('brass', (0, -D / 2 + 0.05, z + 0.04), (W - 0.1, 0.012, 0.05), bevel=0)
        r = m.rng; y = -0.42
        while y < 0.4:
            w = r.uniform(0.035, 0.06); h = r.uniform(0.2, 0.3)
            if r.random() < 0.85: m.box('books', (r.uniform(-0.05, 0.05), y + w / 2, z + 0.015 + h / 2), (0.24, w * 0.94, h), bevel=0.004, color=r.choice([(0.12, 0.19, 0.4), (0.5, 0.14, 0.13), (0.14, 0.33, 0.25), (0.62, 0.47, 0.2), (0.33, 0.2, 0.12), (0.8, 0.76, 0.66)]))
            y += w + 0.004
    m.cyl('steel', (0, 0.5, 1.08), 0.016, 0.62, seg=10, rot=Euler((0, math.radians(90), 0)))
    return m.export()

def cleancart():
    m = Model('cleancart')
    m.box('navy', (0, 0, 0.42), (0.6, 0.9, 0.6), bevel=0.03); m.box('steel', (0, 0, 0.1), (0.56, 0.86, 0.04), bevel=0.01)
    for sx in (-1, 1):
        for sy in (-1, 1): m.cyl('dark', (sx * 0.24, sy * 0.36, 0.05), 0.05, 0.04, rot=Euler((0, math.radians(90), 0)))
    m.box('brass', (0, -0.455, 0.5), (0.3, 0.008, 0.14), bevel=0.01)
    m.cyl('ivory', (-0.12, 0.2, 0.86), 0.13, 0.28, r2=0.15); m.cyl('steel', (0.16, 0.3, 1.1), 0.012, 0.9, seg=8)
    m.box('ivory', (0.16, 0.3, 0.7), (0.2, 0.06, 0.12), bevel=0.02); m.cyl('steel', (0, 0.46, 1.0), 0.014, 0.56, seg=8, rot=Euler((0, math.radians(90), 0)))
    for sx in (-1, 1): m.cyl('steel', (sx * 0.27, 0.46, 0.86), 0.012, 0.3, seg=8)
    return m.export()

def bench():
    m = Model('bench'); W, D = 1.7, 0.6
    m.box('wood', (0, 0, 0.36), (W, D, 0.07), bevel=0.02); m.box('navy_fabric', (0, 0, 0.43), (W - 0.08, D - 0.08, 0.09), bevel=0.035)
    for sx in (-1, 1):
        m.box('wood_dark', (sx * (W / 2 - 0.12), 0, 0.17), (0.08, D - 0.1, 0.34), bevel=0.012); m.box('brass', (sx * (W / 2 - 0.12), 0, 0.02), (0.09, D - 0.09, 0.04), bevel=0.006)
    return m.export()

def totem():
    m = Model('totem')   # information pylon; its face texture (official logo + guidance text) is applied in the engine
    m.box('wood_dark', (0, 0, 0.05), (0.96, 0.44, 0.10), bevel=0.01); m.box('navy', (0, 0, 1.05), (0.86, 0.14, 1.9), bevel=0.02)
    m.box('brass', (0, 0, 2.03), (0.92, 0.18, 0.05), bevel=0.01); m.box('brass', (0, 0, 0.12), (0.9, 0.17, 0.04), bevel=0.008)
    return m.export()

def backshelf():
    m = Model('backshelf'); W, D, H = 4.4, 0.5, 1.0
    m.box('wood', (0, 0, 0.05), (W, D, 0.1), bevel=0.01); m.box('wood', (0, 0, H), (W + 0.04, D + 0.04, 0.05), bevel=0.014)
    m.box('wood_dark', (0, D / 2 - 0.012, H / 2), (W - 0.05, 0.02, H - 0.1), bevel=0)
    n = 5
    for i in range(n + 1): m.box('wood', (-W / 2 + 0.02 + (W - 0.04) * i / n, 0, H / 2), (0.04, D, H - 0.05))
    for z in (0.1, 0.54):
        m.box('wood', (0, 0, z - 0.015), (W - 0.06, D * 0.96, 0.03), bevel=0.005)
        for i in range(n):
            x0 = -W / 2 + 0.04 + (W - 0.04) * i / n; x1 = x0 + (W - 0.04) / n - 0.04
            m.books_row(x0, x1, -0.02, z, 0.3, 0.36, fill=0.75)
    return m.export()

def stanchion():
    m = Model('stanchion')
    m.cyl('brass', (0, 0, 0.02), 0.16, 0.04, seg=24); m.cyl('brass', (0, 0, 0.5), 0.022, 0.94, seg=12); m.sphere('brass', (0, 0, 0.99), 0.045)
    return m.export()

def book_closed():
    m = Model('book_closed')
    m.box('books', (0, 0, 0.02), (0.20, 0.27, 0.04), bevel=0.005, color=(1, 1, 1)); m.box('paper', (0.006, 0, 0.02), (0.19, 0.25, 0.03), bevel=0)
    return m.export()

def book_open():
    m = Model('book_open')
    for sx in (-1, 1):
        m.box('books', (sx * 0.1, 0, 0.008), (0.2, 0.27, 0.012), bevel=0.003, rot=Euler((0, sx * math.radians(-6), 0)), color=(1, 1, 1))
        m.box('paper', (sx * 0.097, 0, 0.022), (0.185, 0.25, 0.016), bevel=0.004, rot=Euler((0, sx * math.radians(-7), 0)))
    return m.export()

def display():
    m = Model('display')   # round "new arrivals" island
    m.cyl('wood_dark', (0, 0, 0.05), 0.62, 0.10, seg=32); m.cyl('wood', (0, 0, 0.45), 0.55, 0.72, seg=32); m.cyl('brass', (0, 0, 0.12), 0.565, 0.03, seg=32)
    m.cyl('marble', (0, 0, 0.83), 0.82, 0.05, seg=40); m.cyl('wood', (0, 0, 1.0), 0.34, 0.3, seg=28); m.cyl('marble', (0, 0, 1.17), 0.4, 0.04, seg=32)
    cols = [(0.12, 0.19, 0.4), (0.5, 0.14, 0.13), (0.14, 0.33, 0.25), (0.62, 0.47, 0.2), (0.33, 0.2, 0.12), (0.45, 0.25, 0.33), (0.2, 0.3, 0.45), (0.55, 0.32, 0.14)]
    for i in range(8):
        a = i * math.pi / 4; x, y = math.cos(a) * 0.6, math.sin(a) * 0.6
        m.box('books', (x, y, 0.98), (0.2, 0.035, 0.27), bevel=0.004, rot=Euler((math.radians(-14), 0, a + math.pi / 2)), color=cols[i])
        m.box('brass', (x * 0.93, y * 0.93, 0.862), (0.16, 0.1, 0.012), bevel=0, rot=Euler((0, 0, a + math.pi / 2)))
    for i in range(3):
        m.box('books', (0, 0, 1.21 + 0.045 * i), (0.26, 0.19, 0.04), bevel=0.004, rot=Euler((0, 0, 0.5 * i)), color=cols[i + 2])
    return m.export()

def kiosk():
    m = Model('kiosk')     # self-service catalogue terminal
    m.box('wood_dark', (0, 0, 0.04), (0.6, 0.5, 0.08), bevel=0.008); m.box('navy', (0, 0.03, 0.6), (0.46, 0.2, 1.1), bevel=0.02)
    m.box('brass', (0, -0.075, 0.6), (0.3, 0.008, 0.7), bevel=0); m.box('navy', (0, -0.08, 0.6), (0.27, 0.01, 0.67), bevel=0)
    m.box('dark', (0, -0.06, 1.3), (0.56, 0.06, 0.42), bevel=0.012, rot=Euler((math.radians(-18), 0, 0)))
    m.box('screen', (0, -0.095, 1.31), (0.5, 0.008, 0.36), bevel=0, rot=Euler((math.radians(-18), 0, 0)))
    m.box('brass', (0, 0.03, 1.16), (0.5, 0.22, 0.02), bevel=0.004)
    return m.export()

def planter():
    m = Model('planter')
    m.cyl('terracotta', (0, 0, 0.26), 0.2, 0.52, seg=24, r2=0.27); m.cyl('brass', (0, 0, 0.52), 0.275, 0.03, seg=24); m.cyl('wood_dark', (0, 0, 0.5), 0.24, 0.02, seg=24)
    return m.export()

def dirt_decal():
    m = Model('spill'); r = m.rng
    for i in range(7):
        a = r.uniform(0, 6.28); d = r.uniform(0, 0.22); m.cyl('dark', (math.cos(a) * d, math.sin(a) * d, 0.006), r.uniform(0.08, 0.2), 0.008, seg=14)
    return m.export()

# =========================================================================== Kenney normalisation
KENNEY = {  # out name: (source, target height in metres, yaw degrees so that the front faces -Y)
    'chair_read': ('chaircushion', 0.95, 0), 'chair_pc': ('chairdesk', 1.02, 0), 'monitor': ('computerscreen', 0.46, 0), 'keyboard': ('computerkeyboard', 0.03, 0),
    'mouse': ('computermouse', 0.03, 0), 'laptop': ('laptop', 0.24, 0), 'plant_tall': ('pottedplant', 1.55, 0), 'plant_small': ('plantsmall2', 0.34, 0),
    'plant_small_b': ('plantsmall1', 0.34, 0), 'lamp_table': ('lamproundtable', 0.5, 0), 'lamp_floor': ('lamproundfloor', 1.7, 0), 'sofa': ('loungesofa', 0.95, 0),
    'coffeetable': ('tablecoffee', 0.42, 0), 'armchair': ('loungechair', 0.95, 0), 'trashcan': ('trashcan', 0.62, 0), 'book_stack': ('books', 0.2, 0),
}
def normalise(out, src, height, yaw):
    reset(); bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, src + '.glb'))
    obs = [o for o in bpy.data.objects if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    if len(obs) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = ob.data
    for v in me.vertices: v.co = Matrix.Rotation(math.radians(yaw), 3, 'Z') @ v.co
    xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
    s = height / (max(zs) - min(zs)); cx, cy, z0 = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs)
    for v in me.vertices: v.co = Vector(((v.co.x - cx) * s, (v.co.y - cy) * s, (v.co.z - z0) * s))
    for i, slot in enumerate(ob.material_slots):  # palette remap
        ob.material_slots[i].material = mat(KENNEY_MAT.get(slot.material.name, 'ivory'))
    for o in list(bpy.data.objects):
        if o != ob: bpy.data.objects.remove(o)
    ob.name = out; me.name = out
    return export_selected(out, [ob])

if __name__ == '__main__':
    print('custom furniture:')
    built = [f() for f in (shelf, lowshelf, table, counter, refdesk, digitaldesk, pcdesk, printer, podium, cart, cleancart, bench, totem, backshelf, stanchion, book_closed, book_open, planter, dirt_decal, display, kiosk)]
    print('normalised Kenney props:')
    for out, (src, h, yaw) in KENNEY.items(): normalise(out, src, h, yaw)
    print('FURNITURE_OK')

"""Procedural textures (no third-party images): plush fibre, marble, wood, carpet, plus the pendant
texture, which is a plain resample of the official logo (content unmodified)."""
import numpy as np, sys, os
from PIL import Image, ImageFilter
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
out = os.path.join(root, 'assets-src/textures'); pub = os.path.join(root, 'public/assets/textures'); os.makedirs(pub, exist_ok=True)
rng = np.random.default_rng(1975)

def tile_noise(n, octaves, seed, persistence=0.5, stretch=(1.0, 1.0)):
    """Periodic fractal noise via spectral filtering (inherently tileable, no seams)."""
    r = np.random.default_rng(seed)
    f = np.fft.fft2(r.standard_normal((n, n)))
    fy = np.fft.fftfreq(n)[:, None] * n * stretch[0]; fx = np.fft.fftfreq(n)[None, :] * n * stretch[1]
    k = np.sqrt(fx**2 + fy**2); k[0, 0] = 1
    beta = 1.0 + (1 - persistence) * 2.2
    lo = 2.0; hi = lo * 2 ** octaves
    filt = (1 / k**beta) * (k >= lo * 0.5) * np.exp(-(k / hi) ** 2)
    a = np.real(np.fft.ifft2(f * filt))
    a = (a - a.min()) / (np.ptp(a) + 1e-12)
    return a

def normal_from_height(h, strength):
    dx = np.roll(h, -1, 1) - np.roll(h, 1, 1); dy = np.roll(h, -1, 0) - np.roll(h, 1, 0)
    nx, ny, nz = -dx * strength, -dy * strength, np.ones_like(h)
    l = np.sqrt(nx**2 + ny**2 + nz**2)
    return np.dstack([(nx / l + 1) / 2, (ny / l + 1) / 2, nz / l]) * 255

def save(arr, name, where=out, q=None):
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    p = os.path.join(where, name)
    im.save(p, quality=q) if q else im.save(p, optimize=True)
    print('wrote', os.path.relpath(p, root), os.path.getsize(p))

# ---- plush fibre (albedo + normal): short directional fibres like teddy fleece ----
n = 512
fib = np.zeros((n, n))
for i in range(26000):
    x, y = rng.integers(0, n, 2); L = rng.integers(3, 9); a = rng.normal(1.2, 0.9); v = rng.uniform(0.35, 1.0)
    for t in range(L):
        fib[int(y + np.sin(a) * t) % n, int(x + np.cos(a) * t) % n] += v * (1 - t / L)
fib = np.asarray(Image.fromarray(np.clip(fib * 90, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)), dtype=float) / 255
clump = tile_noise(n, 5, 3, 0.6)
h = np.clip(fib * 0.8 + clump * 0.35, 0, 1)
base = np.array([146, 92, 58], float); dark = np.array([86, 50, 30], float); light = np.array([188, 132, 90], float)
t = (h - h.min()) / (np.ptp(h) + 1e-9)
alb = dark + (base - dark) * np.clip(t * 2, 0, 1)[..., None] + (light - base) * np.clip(t * 2 - 1, 0, 1)[..., None]
save(alb, 'plush_albedo.png'); save(normal_from_height(h, 5.0), 'plush_normal.png')

# ---- felt (cap / sash cloth normal) ----
felt = tile_noise(256, 5, 9, 0.7)
save(normal_from_height(felt, 2.2), 'felt_normal.png')

# ---- polished ivory marble with soft warm veins (tileable) ----
n = 1024
a = tile_noise(n, 5, 21); b = tile_noise(n, 6, 22, 0.6)
vein = np.abs(np.sin((a * 5.5 + b * 2.2) * np.pi)); vein = np.clip(1 - vein * 3.2, 0, 1) ** 2
cloud = tile_noise(n, 3, 23)
col = np.array([236, 229, 214], float) - cloud[..., None] * np.array([14, 15, 18]) - vein[..., None] * np.array([58, 62, 70]) * (0.4 + 0.6 * b[..., None])
save(col, 'marble_albedo.jpg', pub, q=88)
rough = 60 + vein * 50 + cloud * 25
save(np.dstack([rough] * 3), 'marble_rough.jpg', pub, q=85)

# ---- floor: 2×2 marble tiles (ivory / warm beige checker) with joints and small navy+brass cabochons ----
half = n // 2
tile = np.zeros((n, n, 3))
soft = col * 0.45 + col.mean(axis=(0, 1)) * 0.55
warm = soft * np.array([0.955, 0.925, 0.86]) ; cool = soft * np.array([1.0, 0.99, 0.965])
for ty in range(2):
    for tx in range(2):
        src = warm if (tx + ty) % 2 else cool
        sy, sx = (ty * 311) % half, (tx * 173) % half
        tile[ty * half:(ty + 1) * half, tx * half:(tx + 1) * half] = np.roll(np.roll(src, sy, 0), sx, 1)[:half, :half]
jy, jx = np.mgrid[0:n, 0:n]
joint = (np.minimum(jx % half, half - jx % half) < 2) | (np.minimum(jy % half, half - jy % half) < 2)
tile[joint] = np.array([176, 163, 138])
for cy in (0, half):
    for cx in (0, half):
        d = np.abs(((jx - cx + half // 2) % n) - half // 2) + np.abs(((jy - cy + half // 2) % n) - half // 2)
        tile[d < 30] = np.array([201, 162, 58]); tile[d < 24] = np.array([28, 44, 86])
save(tile, 'floor_tiles.jpg', pub, q=90)
frough = np.full((n, n), 52.0) + (cloud - 0.5) * 30; frough[joint] = 190
save(np.dstack([frough] * 3), 'floor_rough.jpg', pub, q=85)

# ---- walnut wood grain (tileable): long straight fibres with gentle figure ----
u = np.linspace(0, 1, n, endpoint=False); X, Y = np.meshgrid(u, u)
warp = tile_noise(n, 3, 31, 0.4, stretch=(6.0, 1.0))
g = np.sin((X * 9 + warp * 1.6) * 2 * np.pi) * 0.5 + 0.5
fine = tile_noise(n, 7, 33, 0.85, stretch=(14.0, 0.6))
gg = np.clip(g * 0.42 + fine * 0.58, 0, 1)
wood = np.array([96, 58, 34], float) + gg[..., None] * np.array([62, 42, 26])
save(wood, 'wood_albedo.jpg', pub, q=88)
save(normal_from_height(gg, 1.2), 'wood_normal.jpg', pub, q=88)

# ---- navy carpet with a subtle woven pattern ----
n = 512
w = tile_noise(n, 6, 41, 0.75)
yy, xx = np.mgrid[0:n, 0:n]
weave = (np.sin(xx * np.pi / 4) * np.sin(yy * np.pi / 4)) * 0.5 + 0.5
c = np.array([27, 44, 86], float) + (w[..., None] - 0.5) * 26 + weave[..., None] * 10
save(c, 'carpet_albedo.jpg', pub, q=88)
save(normal_from_height(w * 0.6 + weave * 0.4, 3.0), 'carpet_normal.jpg', pub, q=88)

# ---- pendant: official logo, cropped to its bounding box and resampled. Artwork is not edited. ----
logo = Image.open(os.path.join(root, 'assets-src/branding/central-library-logo.original.png')).convert('RGBA')
logo = logo.crop(logo.getbbox())
W, H = 256, 448
canvas = Image.new('RGBA', (W, H), (252, 250, 244, 255))
s = min((W - 16) / logo.width, (H - 16) / logo.height)
lg = logo.resize((round(logo.width * s), round(logo.height * s)), Image.LANCZOS)
canvas.alpha_composite(lg, ((W - lg.width) // 2, (H - lg.height) // 2))
canvas.convert('RGB').save(os.path.join(out, 'mascot_pendant.png'), optimize=True); print('wrote mascot_pendant.png')

# ---- character palettes (Kenney Mini Characters share one 8×4 swatch sheet) ----
# Students: same sheet, gently muted so clothing sits inside the navy / gold / ivory / wood scheme.
# Staff: every clothing swatch becomes the navy uniform with ivory shirt accents; skin and hair untouched.
import colorsys
sheet = np.asarray(Image.open(os.path.join(root, 'assets-src/kenney/colormap.extracted.png')).convert('RGB'), dtype=float)
def swatch(cx, cy): return (slice(cy * 128, cy * 128 + 128), slice(cx * 64, cx * 64 + 64))
stu = sheet.copy()
for cx in range(1, 8):
    blk = stu[swatch(cx, 2)]; grey = blk.mean(axis=2, keepdims=True)
    stu[swatch(cx, 2)] = (grey + (blk - grey) * 0.62) * 0.90 + np.array([14, 11, 6])
save(stu, 'char_students.png', pub)
def grad(top, bottom):
    t = np.linspace(0, 1, 128)[:, None, None]
    return np.broadcast_to(np.array(top, float) * (1 - t) + np.array(bottom, float) * t, (128, 64, 3))
staff = sheet.copy()
NAVY = ((38, 60, 116), (22, 36, 78)); DEEP = ((27, 42, 86), (15, 25, 56)); IVORY = ((240, 232, 212), (214, 204, 180)); GOLD = ((214, 170, 70), (176, 132, 40))
for cx, tone in ((1, NAVY), (2, IVORY), (3, NAVY), (4, DEEP), (5, NAVY), (6, NAVY), (7, DEEP)): staff[swatch(cx, 2)] = grad(*tone)
staff[swatch(1, 3)] = grad(*DEEP); staff[swatch(3, 3)] = grad(*NAVY); staff[swatch(4, 3)] = grad(*IVORY); staff[swatch(0, 1)] = grad(*GOLD)
save(staff, 'char_staff.png', pub)

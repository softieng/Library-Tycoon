/* Fallback original procedural indoor plants for Babylon.js, not a substitute
   for licensed high-quality glTF vegetation assets. Zero third-party meshes. */
(function (root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  root.LibraryTycoonVegetation = exported;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function rng(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let z = t;
      z = Math.imul(z ^ (z >>> 15), z | 1);
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
  }
  function createPlanter(B, scene, opts = {}) {
    if (!B || !scene || !B.MeshBuilder || !B.VertexData) throw new Error('Babylon.js scene required');
    const name = opts.name || 'library_broadleaf_planter';
    const random = rng(opts.seed === undefined ? 73 : opts.seed);
    const root = new B.TransformNode(name, scene);
    root.position.set(opts.x || 0, opts.y || 0, opts.z || 0);
    const height = Math.max(0.5, opts.height || 1.75);
    const potH = height * 0.29, potR = height * 0.155;
    const pot = B.MeshBuilder.CreateCylinder(name + '_ceramic', { height: potH, diameterTop: potR * 2.05, diameterBottom: potR * 1.78, tessellation: 14 }, scene);
    pot.position.y = potH / 2;
    pot.parent = root;
    const mat = B.PBRMaterial ? new B.PBRMaterial(name + '_pot_mat', scene) : new B.StandardMaterial(name + '_pot_mat', scene);
    if ('albedoColor' in mat) mat.albedoColor = new B.Color3(0.75, 0.72, 0.65);
    else mat.diffuseColor = new B.Color3(0.75, 0.72, 0.65);
    if ('roughness' in mat) mat.roughness = 0.78;
    pot.material = mat;
    const soil = B.MeshBuilder.CreateCylinder(name + '_soil', { height: 0.015, diameter: potR * 1.94, tessellation: 14 }, scene);
    soil.position.y = potH;
    soil.parent = root;
    const soilMat = B.PBRMaterial ? new B.PBRMaterial(name + '_soil_mat', scene) : new B.StandardMaterial(name + '_soil_mat', scene);
    if ('albedoColor' in soilMat) soilMat.albedoColor = new B.Color3(0.19, 0.16, 0.13);
    else soilMat.diffuseColor = new B.Color3(0.19, 0.16, 0.13);
    soil.material = soilMat;
    const verts = [], colors = [], idx = [];
    const numStems = Math.min(14, Math.max(5, opts.stems || 9));
    const leafMat = B.PBRMaterial ? new B.PBRMaterial(name + '_leaf_mat', scene) : new B.StandardMaterial(name + '_leaf_mat', scene);
    if ('albedoColor' in leafMat) leafMat.albedoColor = new B.Color3(1, 1, 1);
    else leafMat.diffuseColor = new B.Color3(1, 1, 1);
    if ('roughness' in leafMat) leafMat.roughness = 0.82;
    leafMat.backFaceCulling = false;
    leafMat.twoSidedLighting = true;
    const baseY = potH;
    for (let j = 0; j < numStems; j++) {
      const angle = (j / numStems) * Math.PI * 2 + random() * 0.34;
      const spread = 0.20 + random() * 0.26;
      const stalkH = height * (0.45 + random() * 0.25);
      const baseX = Math.cos(angle) * potR * 0.18;
      const baseZ = Math.sin(angle) * potR * 0.18;
      const endX = baseX + Math.cos(angle) * spread;
      const endZ = baseZ + Math.sin(angle) * spread;
      const stem = B.MeshBuilder.CreateTube(name + '_stem_' + j, {
        path: [new B.Vector3(baseX, baseY, baseZ), new B.Vector3(endX * 0.58, baseY + stalkH * 0.6, endZ * 0.58), new B.Vector3(endX, baseY + stalkH, endZ)],
        radius: 0.008, tessellation: 5, cap: 0,
      }, scene);
      stem.parent = root;
      const sm = B.PBRMaterial ? new B.PBRMaterial(name + '_stem_mat_' + j, scene) : new B.StandardMaterial(name + '_stem_mat_' + j, scene);
      if ('albedoColor' in sm) sm.albedoColor = new B.Color3(0.17, 0.29, 0.15);
      else sm.diffuseColor = new B.Color3(0.17, 0.29, 0.15);
      stem.material = sm;
      const numLeaves = 4 + Math.floor(random() * 3);
      for (let k = 0; k < numLeaves; k++) {
        const positionT = (k + 0.65) / (numLeaves + 0.2);
        const ox = baseX + (endX - baseX) * positionT;
        const oz = baseZ + (endZ - baseZ) * positionT;
        const oy = baseY + stalkH * positionT;
        const theta = angle + (k % 2 ? 1.0 : -1.0) + (random() - 0.5) * 0.5;
        const length = height * (0.15 + random() * 0.11);
        const width = length * (0.26 + random() * 0.06);
        const baseIndex = verts.length / 3;
        for (let seg = 0; seg <= 6; seg++) {
          const t = seg / 6;
          const midX = ox + Math.cos(theta) * length * t;
          const midZ = oz + Math.sin(theta) * length * t;
          const midY = oy + Math.sin(Math.PI * t) * length * 0.20 + length * t * 0.05;
          const half = width * Math.pow(Math.sin(Math.PI * t), 0.78);
          const nx = -Math.sin(theta) * half;
          const nz = Math.cos(theta) * half;
          verts.push(midX - nx, midY + half * 0.08, midZ - nz);
          verts.push(midX + nx, midY - half * 0.08, midZ + nz);
          const tone = 0.78 + random() * 0.20;
          colors.push(0.13 * tone, 0.34 * tone, 0.13 * tone, 1, 0.19 * tone, 0.45 * tone, 0.16 * tone, 1);
        }
        for (let seg = 0; seg < 6; seg++) {
          const v = baseIndex + seg * 2;
          idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
        }
      }
    }
    const mesh = new B.Mesh(name + '_combined_leaves', scene);
    const vertexData = new B.VertexData();
    vertexData.positions = verts;
    vertexData.indices = idx;
    vertexData.colors = colors;
    const normals = [];
    B.VertexData.ComputeNormals(verts, idx, normals);
    vertexData.normals = normals;
    vertexData.applyToMesh(mesh);
    mesh.parent = root;
    mesh.material = leafMat;
    return { root, meshes: [pot, soil, mesh], leafCount: (verts.length / 3) / 14, dispose() { root.dispose(false, true); } };
  }
  return { createPlanter, rng };
});

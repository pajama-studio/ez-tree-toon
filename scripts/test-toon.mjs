import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  ToonNormalMode,
  Tree,
  bakeToonNormals,
  createToonGradientMap,
} from '../build/ez-tree-toon.es.js';

const gradient = createToonGradientMap(5, 0.2);
assert.equal(gradient.image.width, 5);
assert.equal(gradient.minFilter, THREE.NearestFilter);
assert.equal(gradient.magFilter, THREE.NearestFilter);

const indexed = new THREE.BoxGeometry(2, 2, 2, 1, 1, 1);
const triangleCount = indexed.index.count / 3;
const faceted = bakeToonNormals(indexed, {
  mode: ToonNormalMode.Faceted,
  quantization: 4,
});
assert.equal(faceted.index, null);
assert.equal(faceted.getAttribute('position').count / 3, triangleCount);
assert.equal(faceted.userData.toonNormalBake.mode, ToonNormalMode.Faceted);

const sphere = new THREE.SphereGeometry(1, 8, 6);
const rounded = bakeToonNormals(sphere, {
  mode: ToonNormalMode.Rounded,
  blend: 1,
  quantization: 6,
  target: 'sphere',
});
const normal = new THREE.Vector3();
const normals = rounded.getAttribute('normal');
for (let i = 0; i < normals.count; i++) {
  normal.fromBufferAttribute(normals, i);
  assert.ok(Math.abs(normal.length() - 1) < 1e-5);
}

const tree = new Tree();
tree.options.seed = 7;
tree.options.branch.levels = 1;
tree.options.branch.children[0] = 2;
tree.options.toon.normalMode = ToonNormalMode.Rounded;
tree.generate();
assert.equal(tree.branchesMesh.material.isMeshToonMaterial, true);
assert.equal(tree.leavesMesh.material.isMeshToonMaterial, true);
assert.equal(
  tree.leavesMesh.geometry.userData.toonNormalBake.mode,
  ToonNormalMode.Rounded,
);

console.log('Toon material and normal-baking checks passed.');

# EZ Tree Toon

EZ Tree Toon is Pajama Studio's toon-focused adaptation of Daniel Greenheck's [EZ-Tree](https://github.com/dgreenheck/ez-tree). It keeps the procedural tree generator, presets, wind animation, LODs, PNG export and GLB export, and adds a complete Three.js cel-rendering workflow.

The editor now uses one shared toon art direction across trees, grass, flowers, rocks, ground, sky, fog and lighting. Stylized normals are written into each `BufferGeometry`, so exported GLBs carry the authored normals instead of depending on an editor-only shader.

## Features

- `THREE.MeshToonMaterial` lighting with editable 2–8 step ramps
- Export-safe object-space vertex-normal baking
- Surface, rounded-canopy, faceted and upright normal modes
- Optional spherical normal quantization for deliberately chunky shading
- Adjustable rim light, ink outline, key light and hemisphere fill
- Posterized sky, sun and clouds
- Built-in `Hyrule Toon` preset with clustered foliage normals and painterly bark
- Wind animation on toon leaves, grass and flowers
- Full-detail and zipped LOD GLB export with toon metadata in glTF `extras`
- Transparent PNG export using the toon post-processing stack

## Run the editor

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. For a production build:

```bash
npm run build:lib
npm run build:app
```

## Library usage

```js
import * as THREE from 'three';
import {
  Tree,
  ToonNormalMode,
  bakeToonNormals,
  createToonGradientMap,
} from '@pajama-studio/ez-tree-toon';

const tree = new Tree();
tree.loadPreset('Ash Medium');
tree.options.toon.steps = 4;
tree.options.toon.normalMode = ToonNormalMode.Rounded;
tree.options.toon.normalBlend = 0.55;
tree.options.toon.normalQuantization = 0;
tree.generate();
scene.add(tree);

// The normal baker also works on arbitrary BufferGeometry.
const bakedGeometry = bakeToonNormals(sourceGeometry, {
  mode: ToonNormalMode.Faceted,
  quantization: 5,
});

const gradientMap = createToonGradientMap(4, 0.16);
const material = new THREE.MeshToonMaterial({ gradientMap });
```

`bakeToonNormals()` returns the input geometry except in faceted mode, where an indexed geometry is converted to a non-indexed replacement so every triangle can own a true face normal. Always use the returned value.

## Toon options

`tree.options.toon` is serializable with a tree preset:

```js
{
  enabled: true,
  steps: 4,
  shadowLift: 0.25,
  normalMode: 'rounded',
  normalBlend: 0.78,
  normalQuantization: 0,
  rimStrength: 0.08,
  rimPower: 3,
  rimColor: 0xfff2c7,
  barkColor: 0x8a5f3d,
  leafColor: 0x68a34b,
  leafVariation: 0.16,
  useBarkTextures: false,
  useLeafTextureColor: false,
}
```

The standalone editor adds scene-only outline and lighting values to the same JSON block. GLB exports include the current configuration as `toonShading` metadata and include per-mesh `toonNormalBake` metadata.

## LODs

The original LOD workflow remains available. Every generated level receives the same toon material and its own baked normal attributes:

```js
const tree = new Tree();
tree.loadPreset('Oak Large');
tree.generateLODs();
scene.add(tree);
```

## Tests

```bash
npm test
```

The checks cover toon gradient construction, normalized baked normals, faceted topology preservation and tree material integration.

## Credits and license

The procedural generator and original application are by Daniel Greenheck. The toon material system, normal baker, cel scene, toon controls and toon export metadata are the Pajama Studio adaptation.

This project retains the original MIT license. Texture-specific attribution remains in `src/app/public/textures/LICENSE.md`.

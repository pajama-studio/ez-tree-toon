import * as THREE from 'three';
import {
  configureToonMaterial,
  defaultToonOptions,
  updateToonMaterial,
} from '@pajama-studio/ez-tree-toon';

export function createSceneToonOptions() {
  return {
    ...defaultToonOptions,
    outlineEnabled: true,
    outlineThickness: 0.65,
    outlineStrength: 1.35,
    outlineColor: 0x273229,
    keyLightIntensity: 3.2,
    fillLightIntensity: 1.35,
  };
}

/** Creates a shared-look MeshToonMaterial for environment objects. */
export function createSceneToonMaterial(parameters, toonOptions, extendShader) {
  return configureToonMaterial(
    new THREE.MeshToonMaterial(parameters),
    toonOptions,
    extendShader,
  );
}

/** Converts a loaded glTF material to the editor's maintained toon material. */
export function toonifyMaterial(source, toonOptions, overrides = {}) {
  const material = createSceneToonMaterial(
    {
      name: `${source?.name || 'material'}_toon`,
      color: source?.color?.clone() ?? new THREE.Color(0xffffff),
      map: source?.map ?? null,
      normalMap: source?.normalMap ?? null,
      aoMap: source?.aoMap ?? null,
      alphaMap: source?.alphaMap ?? null,
      transparent: source?.transparent ?? false,
      opacity: source?.opacity ?? 1,
      alphaTest: source?.alphaTest ?? 0,
      side: source?.side ?? THREE.FrontSide,
      vertexColors: source?.vertexColors ?? false,
      ...overrides,
    },
    toonOptions,
  );
  return material;
}

/** Refreshes band ramps and live rim uniforms on every toon mesh below root. */
export function refreshSceneToonMaterials(root, toonOptions) {
  root.traverse((object) => {
    const materials = Array.isArray(object.material)
      ? object.material
      : object.material
        ? [object.material]
        : [];
    materials.forEach((material) => updateToonMaterial(material, toonOptions));
  });
}

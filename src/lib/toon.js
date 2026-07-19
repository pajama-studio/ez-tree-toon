import * as THREE from 'three';

/** Normal targets supported by the stylized vertex-normal baker. */
export const ToonNormalMode = Object.freeze({
  Surface: 'surface',
  Rounded: 'rounded',
  Faceted: 'faceted',
  Upright: 'upright',
});

/**
 * Default toon look used by the library and the standalone editor.
 * These values are plain JSON so they can travel with tree presets.
 */
export const defaultToonOptions = Object.freeze({
  enabled: true,
  steps: 4,
  shadowLift: 0.25,
  normalMode: ToonNormalMode.Rounded,
  normalBlend: 0.78,
  normalQuantization: 0,
  rimStrength: 0.08,
  rimPower: 3.0,
  rimColor: 0xfff2c7,
  barkColor: 0x8a5f3d,
  leafColor: 0x68a34b,
  leafVariation: 0.16,
  useBarkTextures: false,
  useLeafTextureColor: false,
});

const gradientCache = new Map();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Creates the nearest-filtered lookup texture expected by MeshToonMaterial.
 * The darkest band is lifted above black so bark and leaf color remains
 * readable in shadow.
 *
 * @param {number} steps Number of light bands
 * @param {number} shadowLift Brightness of the darkest band (0..0.8)
 * @returns {THREE.DataTexture}
 */
export function createToonGradientMap(steps = 4, shadowLift = 0.16) {
  const bandCount = clamp(Math.round(steps), 2, 12);
  const lift = clamp(shadowLift, 0, 0.8);
  const key = `${bandCount}:${lift.toFixed(3)}`;
  if (gradientCache.has(key)) return gradientCache.get(key);

  const data = new Uint8Array(bandCount * 4);
  for (let i = 0; i < bandCount; i++) {
    const t = i / (bandCount - 1);
    // A slight ease-out gives the lit side more room than the shadow bands.
    const value = Math.round(255 * (lift + (1 - lift) * Math.pow(t, 0.82)));
    data.set([value, value, value, 255], i * 4);
  }

  const texture = new THREE.DataTexture(
    data,
    bandCount,
    1,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.name = `ToonGradient_${bandCount}`;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  gradientCache.set(key, texture);
  return texture;
}

/**
 * Adds a controllable rim-light term without replacing Three.js' maintained
 * toon-lighting chunks. Can be called from a material's onBeforeCompile hook.
 *
 * @param {THREE.WebGLProgramParametersWithUniforms} shader
 * @param {object} options Toon options
 */
export function injectToonRim(shader, options = defaultToonOptions) {
  shader.uniforms.uToonRimColor = {
    value: new THREE.Color(options.rimColor ?? defaultToonOptions.rimColor),
  };
  shader.uniforms.uToonRimStrength = {
    value: options.rimStrength ?? defaultToonOptions.rimStrength,
  };
  shader.uniforms.uToonRimPower = {
    value: options.rimPower ?? defaultToonOptions.rimPower,
  };

  shader.fragmentShader =
    `
    uniform vec3 uToonRimColor;
    uniform float uToonRimStrength;
    uniform float uToonRimPower;
  ` + shader.fragmentShader;

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <opaque_fragment>',
    `
      float toonRim = pow(
        1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0),
        uToonRimPower
      );
      outgoingLight += uToonRimColor * (uToonRimStrength * toonRim);
      #include <opaque_fragment>
    `,
  );
}

/**
 * Configures an existing MeshToonMaterial with the shared band ramp and rim.
 * `extendShader` is useful for wind or other project-specific shader patches.
 *
 * @param {THREE.MeshToonMaterial} material
 * @param {object} options
 * @param {(shader: object) => void} [extendShader]
 * @returns {THREE.MeshToonMaterial}
 */
export function configureToonMaterial(
  material,
  options = defaultToonOptions,
  extendShader,
) {
  material.gradientMap = createToonGradientMap(
    options.steps,
    options.shadowLift,
  );
  material.userData.toon = {
    steps: clamp(Math.round(options.steps ?? defaultToonOptions.steps), 2, 12),
    shadowLift: options.shadowLift ?? defaultToonOptions.shadowLift,
    rimStrength: options.rimStrength ?? defaultToonOptions.rimStrength,
    rimPower: options.rimPower ?? defaultToonOptions.rimPower,
    rimColor: options.rimColor ?? defaultToonOptions.rimColor,
  };
  material.onBeforeCompile = (shader) => {
    injectToonRim(shader, options);
    extendShader?.(shader);
    Object.defineProperty(material.userData, 'toonShader', {
      value: shader,
      configurable: true,
      enumerable: false,
      writable: true,
    });
  };
  material.customProgramCacheKey = () => JSON.stringify(material.userData.toon);
  material.needsUpdate = true;
  return material;
}

/** Updates a configured toon material without rebuilding its geometry. */
export function updateToonMaterial(material, options = defaultToonOptions) {
  if (!material?.isMeshToonMaterial) return material;
  material.gradientMap = createToonGradientMap(
    options.steps,
    options.shadowLift,
  );
  material.userData.toon = {
    steps: clamp(Math.round(options.steps ?? defaultToonOptions.steps), 2, 12),
    shadowLift: options.shadowLift ?? defaultToonOptions.shadowLift,
    rimStrength: options.rimStrength ?? defaultToonOptions.rimStrength,
    rimPower: options.rimPower ?? defaultToonOptions.rimPower,
    rimColor: options.rimColor ?? defaultToonOptions.rimColor,
  };

  const shader = material.userData.toonShader;
  if (shader) {
    shader.uniforms.uToonRimColor.value.set(
      options.rimColor ?? defaultToonOptions.rimColor,
    );
    shader.uniforms.uToonRimStrength.value =
      options.rimStrength ?? defaultToonOptions.rimStrength;
    shader.uniforms.uToonRimPower.value =
      options.rimPower ?? defaultToonOptions.rimPower;
  }
  material.needsUpdate = true;
  return material;
}

function quantizeNormal(normal, levels) {
  const count = Math.max(2, Math.round(levels));
  const azimuthStep = (Math.PI * 2) / count;
  const elevationStep = Math.PI / count;
  const azimuth =
    Math.round(Math.atan2(normal.z, normal.x) / azimuthStep) * azimuthStep;
  const elevation =
    Math.round(Math.asin(clamp(normal.y, -1, 1)) / elevationStep) *
    elevationStep;
  const radius = Math.cos(elevation);
  normal
    .set(
      radius * Math.cos(azimuth),
      Math.sin(elevation),
      radius * Math.sin(azimuth),
    )
    .normalize();
}

/**
 * Bakes stylized normals directly into a BufferGeometry's `normal` attribute.
 * The returned geometry may be a non-indexed replacement in faceted mode.
 * Because this is geometry data (not only a runtime shader trick), GLB export
 * and other engines receive the same authored normals.
 *
 * @param {THREE.BufferGeometry} source
 * @param {object} [options]
 * @param {'surface'|'rounded'|'faceted'|'upright'} [options.mode]
 * @param {number} [options.blend] Blend from surface to stylized target (0..1)
 * @param {number} [options.quantization] Spherical normal steps; 0 disables
 * @param {'sphere'|'cylinder'} [options.target] Rounded target shape
 * @param {THREE.Vector3|{x:number,y:number,z:number}} [options.center]
 * @param {string} [options.centerAttribute] Per-vertex cluster-center attribute
 * @returns {THREE.BufferGeometry}
 */
export function bakeToonNormals(source, options = {}) {
  const mode = options.mode ?? ToonNormalMode.Surface;
  const blend = clamp(options.blend ?? 0, 0, 1);
  const quantization = Math.max(0, Math.round(options.quantization ?? 0));

  let geometry = source;
  if (mode === ToonNormalMode.Faceted && source.index) {
    geometry = source.toNonIndexed();
    source.dispose();
  }

  if (mode === ToonNormalMode.Faceted || !geometry.getAttribute('normal')) {
    geometry.computeVertexNormals();
  }

  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const centers = options.centerAttribute
    ? geometry.getAttribute(options.centerAttribute)
    : null;
  if (!positions || !normals) return geometry;

  geometry.computeBoundingBox();
  const center = options.center
    ? new THREE.Vector3(options.center.x, options.center.y, options.center.z)
    : geometry.boundingBox.getCenter(new THREE.Vector3());
  const normal = new THREE.Vector3();
  const target = new THREE.Vector3();
  const position = new THREE.Vector3();

  for (let i = 0; i < positions.count; i++) {
    normal.fromBufferAttribute(normals, i).normalize();
    position.fromBufferAttribute(positions, i);

    if (mode === ToonNormalMode.Rounded) {
      if (centers) {
        target.fromBufferAttribute(centers, i);
        target.subVectors(position, target);
      } else {
        target.copy(position).sub(center);
      }
      if (options.target === 'cylinder') target.y = 0;
      if (target.lengthSq() > 1e-8)
        normal.lerp(target.normalize(), blend).normalize();
    } else if (mode === ToonNormalMode.Upright) {
      target.set(normal.x, Math.max(normal.y, 0.65), normal.z).normalize();
      normal.lerp(target, blend).normalize();
    }

    if (quantization > 1) quantizeNormal(normal, quantization);
    normals.setXYZ(i, normal.x, normal.y, normal.z);
  }

  normals.needsUpdate = true;
  geometry.normalizeNormals();
  if (centers) geometry.deleteAttribute(options.centerAttribute);
  geometry.userData.toonNormalBake = {
    mode,
    blend,
    quantization,
    target: options.target ?? 'surface',
  };
  return geometry;
}

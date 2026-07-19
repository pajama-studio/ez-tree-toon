import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { setupUI } from './ui';
import { createScene } from './scene';

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('app');

  // User needs to interact with the page before audio will play
  container.addEventListener('click', toggleAudio);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor(0);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.25;
  container.appendChild(renderer.domElement);

  const { scene, environment, tree, camera, controls, toonStyle } =
    await createScene(renderer);

  const composer = new EffectComposer(renderer);

  composer.addPass(new RenderPass(scene, camera));

  const outlinePass = new OutlinePass(
    new THREE.Vector2(container.clientWidth, container.clientHeight),
    scene,
    camera,
  );
  outlinePass.selectedObjects = [
    tree,
    environment,
    scene.getObjectByName('Forest'),
  ];
  outlinePass.edgeStrength = toonStyle.outlineStrength;
  outlinePass.edgeThickness = toonStyle.outlineThickness;
  outlinePass.visibleEdgeColor.set(toonStyle.outlineColor);
  outlinePass.hiddenEdgeColor.set(toonStyle.outlineColor);
  outlinePass.enabled = toonStyle.outlineEnabled;
  composer.addPass(outlinePass);

  const smaaPass = new SMAAPass(
    container.clientWidth * renderer.getPixelRatio(),
    container.clientHeight * renderer.getPixelRatio(),
  );
  composer.addPass(smaaPass);

  composer.addPass(new OutputPass());

  const clock = new THREE.Clock();
  function animate() {
    // Update time for wind sway shaders
    const t = clock.getElapsedTime();
    tree.update(t);
    scene.getObjectByName('Forest').children.forEach((o) => o.update(t));
    environment.update(t);

    controls.update();
    composer.render();
    requestAnimationFrame(animate);
  }

  function resize() {
    renderer.setSize(container.clientWidth, container.clientHeight);
    smaaPass.setSize(container.clientWidth, container.clientHeight);
    outlinePass.setSize(container.clientWidth, container.clientHeight);
    composer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize);

  setupUI(tree, environment, renderer, scene, camera, controls, 'Hyrule Toon', {
    toonStyle,
    outlinePass,
    composer,
  });
  animate();
  resize();

  document.getElementById('audio-status').style.display = 'block';
});

window.toggleAudio = function () {
  document.getElementById('app').removeEventListener('click', toggleAudio);

  if (window.isAudioPlaying) {
    window.isAudioPlaying = false;
    document.getElementById('audio-status').src = '/icons/icon_muted.png';
    document.getElementById('background-audio').pause();
  } else {
    window.isAudioPlaying = true;
    document.getElementById('audio-status').src = '/icons/icon_playing.png';
    document.getElementById('background-audio').play();
  }
};

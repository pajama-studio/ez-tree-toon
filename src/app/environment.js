import * as THREE from 'three';
import { Skybox } from './skybox';
import { Ground } from './ground';
import { Grass } from './grass';
import { Rocks } from './rocks';
import { Clouds } from './clouds';

export class Environment extends THREE.Object3D {
  constructor(toonOptions) {
    super();
    this.toonOptions = toonOptions;

    this.ground = new Ground(undefined, toonOptions);
    this.add(this.ground);

    this.grass = new Grass(undefined, toonOptions);
    this.add(this.grass);

    this.skybox = new Skybox(undefined, toonOptions);
    this.add(this.skybox);

    this.rocks = new Rocks(undefined, toonOptions);
    this.add(this.rocks);

    this.clouds = new Clouds();
    this.clouds.position.set(0, 200, 0);
    this.clouds.rotation.x = Math.PI / 2;
    this.add(this.clouds);
  }

  update(elapsedTime) {
    this.grass.update(elapsedTime);
    this.clouds.update(elapsedTime);
  }
}

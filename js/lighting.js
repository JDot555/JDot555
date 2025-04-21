import * as THREE from 'three';

let directionalLight, ambientLight, torch;

export function initLighting(scene, camera) {
  directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  ambientLight = new THREE.AmbientLight(0x404040, 0.6);
  scene.add(ambientLight);

  torch = new THREE.PointLight(0xffaa33, 0, 10);
  camera.add(torch);
  scene.add(camera);
}

export function updateDayNight(elapsed) {
  const isNight = Math.sin(elapsed * 0.1) < 0;
  torch.intensity = isNight ? 1 : 0;
  ambientLight.intensity = isNight ? 0.2 : 0.6;
  directionalLight.intensity = isNight ? 0.1 : 1;
}
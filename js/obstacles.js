import * as THREE from 'three';

export const obstacles = [];

export function initObstacles(scene) {
  const obstacleMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
  for (let i = 0; i < 20; i++) {
    const obs = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), obstacleMat);
    obs.position.set(Math.random() * 80 - 40, 1, Math.random() * 80 - 40);
    scene.add(obs);
    obstacles.push(obs);
  }
}

export function checkObstacleCollision() {
  const player = window.controls?.getObject();
  if (!player) return;
  for (let obs of obstacles) {
    const dist = player.position.distanceTo(obs.position);
    if (dist < 2.5) {
      const pushBack = new THREE.Vector3().subVectors(player.position, obs.position).normalize();
      player.position.add(pushBack.multiplyScalar(0.2));
    }
  }
}
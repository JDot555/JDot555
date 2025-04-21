import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { updateHearts } from './ui.js';

export const enemies = [];
let playerObject;

export function initEnemies(scene) {
  const loader = new GLTFLoader();
  playerObject = window.controls?.getObject();

  loader.load('../public/zombie.glb', gltf => {
    for (let i = 0; i < 3; i++) {
      const zombie = gltf.scene.clone();
      zombie.position.set(Math.random() * 80 - 40, 0, Math.random() * 80 - 40);
      scene.add(zombie);
      enemies.push(zombie);
    }
  }, undefined, error => {
    console.error('Error loading zombie model:', error);
  });

  window.addEventListener('click', () => {
    const raycaster = new THREE.Raycaster();
    const camera = window.controls.getObject().children[0];
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);

    const intersects = raycaster.intersectObjects(enemies, true);
    if (intersects.length > 0) {
      const enemyRoot = intersects[0].object.parent;
      enemyRoot.visible = false;
      const index = enemies.indexOf(enemyRoot);
      if (index !== -1) enemies.splice(index, 1);
    }
  });
}

export function updateEnemies(delta) {
  if (!playerObject) return;
  for (const enemy of enemies) {
    const dir = new THREE.Vector3().subVectors(playerObject.position, enemy.position).normalize();
    enemy.position.add(dir.multiplyScalar(delta * 2));
  }
}

export function checkEnemyCollision() {
  if (!playerObject) return;
  for (const enemy of enemies) {
    const dist = enemy.position.distanceTo(playerObject.position);
    if (dist < 2) {
      window.hearts--;
      updateHearts();
      if (window.hearts <= 0) {
        document.getElementById('gameOverScreen').style.display = 'flex';
        window.controls.unlock();
      }
    }
  }
}
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import * as THREE from 'three';

const move = { forward: false, backward: false, left: false, right: false };
const velocity = new THREE.Vector3();
let canJump = false;

export function initControls(camera, domElement) {
  const controls = new PointerLockControls(camera, domElement);

  domElement.addEventListener('click', () => {
    controls.lock();
    document.getElementById('startScreen').style.display = 'none';
  });

  document.addEventListener('keydown', e => {
    switch (e.code) {
      case 'KeyW': move.forward = true; break;
      case 'KeyS': move.backward = true; break;
      case 'KeyA': move.left = true; break;
      case 'KeyD': move.right = true; break;
      case 'Space':
        if (canJump) {
          velocity.y += 5;
          canJump = false;
        }
        break;
    }
  });

  document.addEventListener('keyup', e => {
    switch (e.code) {
      case 'KeyW': move.forward = false; break;
      case 'KeyS': move.backward = false; break;
      case 'KeyA': move.left = false; break;
      case 'KeyD': move.right = false; break;
    }
  });

  return controls;
}

export function updateControls(delta) {
  const controls = window.controls;
  const speed = 10;

  const direction = new THREE.Vector3();
  direction.z = Number(move.forward) - Number(move.backward);
  direction.x = Number(move.right) - Number(move.left);
  direction.normalize();

  velocity.x = direction.x * speed;
  velocity.z = direction.z * speed;
  velocity.y -= 9.8 * delta;

  const player = controls.getObject();
  if (player.position.y <= 2) {
    velocity.y = 0;
    canJump = true;
    player.position.y = 2;
  }

  controls.moveRight(velocity.x * delta);
  controls.moveForward(velocity.z * delta);
  player.position.y += velocity.y * delta;
}

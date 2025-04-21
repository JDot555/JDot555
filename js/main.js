import { initScene } from './scene.js';
import { initControls, updateControls } from './controls.js';
import { initUI, updateHearts } from './ui.js';
import { initEnemies, updateEnemies, checkEnemyCollision } from './enemies.js';
import { initTreasures } from './treasures.js';
import { initObstacles, checkObstacleCollision } from './obstacles.js';
import { initLighting, updateDayNight } from './lighting.js';

import * as THREE from 'three';

let scene, camera, renderer, controls;
const clock = new THREE.Clock();
window.hearts = 7;

function animate() {
  window.animationId = requestAnimationFrame(animate);
  const delta = clock.getDelta();

  updateControls(delta);
  checkObstacleCollision();
  updateEnemies(delta);
  checkEnemyCollision();
  updateDayNight(clock.elapsedTime);
  renderer.render(scene, camera);
}

function resumeGame() {
  window.isPaused = false;
  controls.lock();
  document.getElementById('pauseScreen').style.display = 'none';
  animate();
}
function pauseGame() {
  window.isPaused = true;
  cancelAnimationFrame(window.animationId);
  controls.unlock();
  document.getElementById('pauseScreen').style.display = 'flex';
}
window.resumeGame = resumeGame;

document.addEventListener('keydown', e => {
  if (e.code === 'Escape') window.isPaused ? resumeGame() : pauseGame();
});

({ scene, camera, renderer } = initScene());
controls = initControls(camera, document.body);
window.controls = controls;

initLighting(scene, camera);
initUI();
initTreasures(scene);
initObstacles(scene);
initEnemies(scene);
animate();

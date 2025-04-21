import * as THREE from 'three';

export const treasures = [];
let treasureCount = 0;
const totalTreasures = 5;

export function initTreasures(scene) {
  const treasureMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
  for (let i = 0; i < totalTreasures; i++) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), treasureMat);
    box.position.set(Math.random() * 80 - 40, 0.5, Math.random() * 80 - 40);
    scene.add(box);
    treasures.push(box);
  }

  window.addEventListener('click', () => {
    const raycaster = new THREE.Raycaster();
    const camera = window.controls.getObject().children[0];
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const found = raycaster.intersectObjects(treasures);
    if (found.length > 0) {
      const obj = found[0].object;
      obj.visible = false;
      treasures.splice(treasures.indexOf(obj), 1);
      treasureCount++;
      document.getElementById('treasureCount').textContent = `Treasures: ${treasureCount} / ${totalTreasures}`;
      if (treasureCount === totalTreasures) {
        document.getElementById('winScreen').style.display = 'flex';
        cancelAnimationFrame(window.animationId);
        window.controls.unlock();
      }
    }
  });
}
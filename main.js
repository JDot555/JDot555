import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

let scene, camera, renderer, controls;
let player = new THREE.Object3D();
let playerModel;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let onGround = false;
let currentView = 1; // 1 = first, 2 = third-back, 3 = third-front
const chunkSize = 16; // Size of one chunk in world units
const renderDistance = 1; // How many chunks to render in each direction
let currentChunk = { x: 0, y:-10, z: 0 };
let loadedChunks = new Map();

let grassMesh = null; // Loaded once, used many times
let groundTiles = []; // Used for checking if player is on ground

let cameraMode = 0; // 0: First Person, 1: Back View, 2: Front View
let rotationY = 0; // Controls the direction player is looking

let isMouseDown = false;
let mouseStartX = 0;
let isTouching = false;
let touchStartX = 0;

const move = { forward: false, backward: false, left: false, right: false };
window.velocity = new THREE.Vector3();
let canJump = false;

window.addEventListener("touchstart", (e) => {
  isTouching = true;
  touchStartX = e.touches[0].clientX;
});

window.addEventListener("touchmove", (e) => {
  if (isTouching && currentView !== 1) {
    const deltaX = e.touches[0].clientX - touchStartX;
    rotationY -= deltaX * 0.002;
    touchStartX = e.touches[0].clientX;
  }
});

window.addEventListener("touchend", () => {
  isTouching = false;
});

window.addEventListener("mousedown", (e) => {
  isMouseDown = true;
  mouseStartX = e.clientX;
});

window.addEventListener("mousemove", (e) => {
  if (isMouseDown && currentView !== 1) {
    const deltaX = e.clientX - mouseStartX;
    rotationY -= deltaX * 0.002;
    mouseStartX = e.clientX;
  }
});

window.addEventListener("mouseup", () => {
  isMouseDown = false;
});

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false
};

init();
animate();

function init() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!context) {
    alert('WebGL not supported');
    return;
  }

  renderer = new THREE.WebGLRenderer({ canvas, context });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0d0ff);
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 20, 10);
  scene.add(light, new THREE.AmbientLight(0xffffff, 0.5));

  controls = new PointerLockControls(camera, document.body);
  document.body.addEventListener('click', () => { controls.lock(); });
  controls.addEventListener('lock', () => { console.log('Pointer locked'); });

  loadGrassTileModel(() => {
    // Now grassMesh is ready!
    for (let dx = -renderDistance; dx <= renderDistance; dx++) {
      for (let dy = -renderDistance; dy <= renderDistance; dy++) {
        for (let dz = -renderDistance; dz <= renderDistance; dz++) {
          loadChunk(dx, dy, dz);
        }
      }
    }
  });  

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onWindowResize);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP') {
      currentView = (currentView % 3) + 1;
    }
  });
  controls = new PointerLockControls(camera, document.body);
  scene.add(controls.getObject()); // Add this line

  loadPlayer(); 
  loadCoins();
  loadObstacles();
  isPlayerOnGround();
}


function loadGrassTileModel(callback) {
  const loader = new GLTFLoader();
  loader.load(
    'Models/World/grass.glb',
    (gltf) => {
      grassMesh = gltf.scene;
      callback();
    },
    undefined,
    (error) => {
      console.error("Failed to load grass.glb!", error);
    }
  );
}

function chunkKey(cx, cz) {
  return `${cx},${cz}`;
}

function loadChunk(cx, cz) {
  const tileSpacing = 1; // Base spacing between tiles
  const tileSize = 2; // Desired final size (e.g., 2 = 2x bigger in all directions)

  const key = chunkKey(cx, cz);
  if (loadedChunks.has(key)) return;

  const tiles = [];

  // First measure original size of your grassMesh
  const originalBox = new THREE.Box3().setFromObject(grassMesh);
  const originalSize = {
    width: originalBox.max.x - originalBox.min.x,
    height: originalBox.max.y - originalBox.min.y,
    depth: originalBox.max.z - originalBox.min.z
  };

  // Calculate required scale factor to reach desired tileSize
  const scaleFactor = tileSize / Math.max(originalSize.width, originalSize.depth);

  for (let x = 0; x < chunkSize; x += tileSpacing) {
    for (let z = 0; z < chunkSize; z += tileSpacing) {
      const tile = grassMesh.clone();
      
      // Calculate position accounting for scaled size
      const posX = cx * (chunkSize * tileSize) + (x * tileSize);
      const posZ = cz * (chunkSize * tileSize) + (z * tileSize);
      
      tile.position.set(
        posX,
        0, // Ground level
        posZ
      );
      
      // Apply uniform scaling
      tile.scale.set(scaleFactor, scaleFactor, scaleFactor);
      
      scene.add(tile);
      tiles.push(tile);

      // Update collision bounds
      const box = new THREE.Box3().setFromObject(tile);
      groundTiles.push({
        xMin: box.min.x,
        xMax: box.max.x,
        yMin: box.min.y,
        yMax: box.max.y,
        zMin: box.min.z,
        zMax: box.max.z
      });
    }
  }

  loadedChunks.set(key, tiles);
}

function unloadFarChunks(px, pz) {
  const playerChunkX = Math.floor(px / chunkSize);
  const playerChunkZ = Math.floor(pz / chunkSize);

  for (const [key, tiles] of loadedChunks.entries()) {
    const [cx, cz] = key.split(',').map(Number);

    if (Math.abs(cx - playerChunkX) > renderDistance ||
        Math.abs(cz - playerChunkZ) > renderDistance) {
      // Remove all tiles in this chunk
      tiles.forEach(tile => scene.remove(tile));
      loadedChunks.delete(key);

      // Remove collision boxes (if used)
      groundTiles = groundTiles.filter(tile => 
        !(tile.xMin >= cx * chunkSize && 
          tile.xMax <= (cx + 1) * chunkSize &&
          tile.zMin >= cz * chunkSize && 
          tile.zMax <= (cz + 1) * chunkSize)
      );
    }
  }
}

function updateChunksAroundPlayer() {
  if (!grassMesh) return; // Ensure model is loaded

  const px = player.position.x;
  const pz = player.position.z;

  const chunkX = Math.floor(px / chunkSize);
  const chunkZ = Math.floor(pz / chunkSize);

  if (chunkX !== currentChunk.x || chunkZ !== currentChunk.z) {
    currentChunk = { x: chunkX, z: chunkZ };

    // Load surrounding chunks
    for (let dx = -renderDistance; dx <= renderDistance; dx++) {
      for (let dz = -renderDistance; dz <= renderDistance; dz++) {
        loadChunk(chunkX + dx, chunkZ + dz);
      }
    }

    unloadFarChunks(px, pz);
  }
}

function isPlayerOnGround() {
  const px = player.position.x;
  const py = player.position.y;
  const pz = player.position.z;

  for (const tile of groundTiles) {
    if (
      px >= tile.xMin && px <= tile.xMax &&
      pz >= tile.zMin && pz <= tile.zMax &&
      Math.abs(py - tile.y) < 2 // vertical margin
    ) {
      return true;
    }
  }
  return false;
}

function loadPlayer() {
  const loader = new GLTFLoader();

  loader.load('Models/player/scene.gltf', (gltf) => {
    playerModel = gltf.scene;
    playerModel.scale.set(0.5, 0.5, 0.5);
    playerModel.position.set(0, 0, 0);
    playerModel.rotation.y = Math.PI; // Rotate 180 degrees to face camera
    scene.add(playerModel);

    player = new THREE.Object3D(); // We'll move this around
    player.add(playerModel);
    scene.add(player);

    // Optionally lift the model out of the ground
    playerModel.position.y = 8;
  });
} 

function loadObstacles() {
  // Create red block material and larger geometry
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red color
  const geometry = new THREE.BoxGeometry(5, 5, 5); // Larger size (5x5x5)

  // Generate 10 random red blocks
  for (let i = 0; i < 10; i++) {
    const redBlock = new THREE.Mesh(geometry, material);
    
    // Random position within a 50x50 area (adjust as needed)
    const x = Math.random() * 50 - 25; // -25 to 25
    const z = Math.random() * 50 - 25; // -25 to 25
    
    // Make sure blocks are on the ground (y = height/2)
    redBlock.position.set(x, 2.5, z);
    
    // Add to scene
    scene.add(redBlock);
    
    // Optional: Add name for debugging
    redBlock.name = "redBlock";
    
    // Optional: Add shadows
    redBlock.castShadow = true;
    redBlock.receiveShadow = true;
  }
}

function loadCoins() {
  const loader = new GLTFLoader();
  loader.load('Models/coin.glb', (gltf) => {
    // Generate 15 random coins
    for (let i = 0; i < 15; i++) {
      const coin = gltf.scene.clone();
      
      // Random position within a 50x50 area (same as obstacles)
      const x = Math.random() * 50 - 25;
      const z = Math.random() * 50 - 25;
      
      // Slightly above ground (y = 1)
      coin.position.set(x, 1, z);
      coin.scale.set(0.5, 0.5, 0.5);
      
      // Add to scene
      scene.add(coin);
      
      // Optional: Add name for collision detection
      coin.name = "coin";
      
      // Optional: Add simple rotation animation
      coin.userData = { spinSpeed: Math.random() * 0.02 + 0.01 };
      
      // Optional: Add shadows
      coin.traverse(function(child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  });
}

// Optional: Add this to your animation loop to make coins spin
function animateCoins() {
  scene.children.forEach(object => {
    if (object.name === "coin") {
      object.rotation.y += object.userData.spinSpeed || 0.01;
    }
  });
}

function onKeyDown(event) {
  switch (event.code) {
    case 'KeyW': keys.forward = true; break;
    case 'KeyS': keys.backward = true; break;
    case 'KeyA': keys.left = true; break;
    case 'KeyD': keys.right = true; break;
    case 'Space': keys.jump = true; break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case 'KeyW': keys.forward = false; break;
    case 'KeyS': keys.backward = false; break;
    case 'KeyA': keys.left = false; break;
    case 'KeyD': keys.right = false; break;
    case 'Space': keys.jump = false; break;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function getTileUnderPlayer() {
  const px = player.position.x;
  const py = player.position.y;
  const pz = player.position.z;

  for (const tile of groundTiles) {
    if (
      px >= tile.xMin && px <= tile.xMax &&
      pz >= tile.zMin && pz <= tile.zMax &&
      py >= tile.yMin - 1 && py <= tile.yMax + 5
    ) {
      return tile;
    }
  }
  
  return null;
}

function animate() {
  requestAnimationFrame(animate);
  updateChunksAroundPlayer();
  animateCoins()

  const speed = 0.9;
  direction.set(0, 0, 0);

  if (keys.backward) direction.z -= 1;
  if (keys.forward) direction.z += 1;
  if (keys.right) direction.x -= 1;
  if (keys.left) direction.x += 1;

  direction.normalize();
  direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
  player.position.addScaledVector(direction, speed);

  velocity.y -= 0.01; // gravity
  player.position.y += velocity.y;

  const groundTile = getTileUnderPlayer();

  if (groundTile && player.position.y <= groundTile.yMax + 0.1) {
    player.position.y = groundTile.yMax + 0.1;
    velocity.y = 0;
    onGround = true;
  } else {
    onGround = false;
  }

  if (keys.jump && onGround) {
    velocity.y = 0.25;
    onGround = false;
  }

  updateCamera();

  renderer.render(scene, camera);
}

function updateCamera() {
  if (!playerModel) return;

  playerModel.visible = currentView !== 1;

  const headHeight = new THREE.Vector3(0, 10, 0);
  const cameraOffsetBack = new THREE.Vector3(0, 2, 70);
  const cameraOffsetFront = new THREE.Vector3(0, 2, -70); // Negative Z for front view

  const playerPosition = player.position.clone();

  if (currentView === 1) {
    // First-person: camera follows head, player looks where camera looks.
    controls.getObject().position.copy(playerPosition.clone().add(headHeight));
    
    // Keep player rotation synced with camera in first-person
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    const targetRotation = Math.atan2(cameraDirection.x, cameraDirection.z);
    player.rotation.y = targetRotation;

  } else {
    // Third-person: position camera relative to player's current facing direction
    const playerForward = new THREE.Vector3(0, 0, 1).applyQuaternion(player.quaternion);
    
    if (currentView === 2) {
      // Front view - camera faces player's front
      const offset = playerForward.clone().multiplyScalar(-1).multiplyScalar(70);
      offset.y = 2;
      camera.position.copy(playerPosition.clone().add(offset));
      camera.lookAt(playerPosition.clone().add(new THREE.Vector3(0, 10, 0)));
      
    } else if (currentView === 3) {
      // Back view - camera faces player's back
      const offset = playerForward.clone().multiplyScalar(70);
      offset.y = 2;
      camera.position.copy(playerPosition.clone().add(offset));
      camera.lookAt(playerPosition.clone().add(new THREE.Vector3(0, 10, 0)));
    }
  }
}


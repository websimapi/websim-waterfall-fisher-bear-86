import * as THREE from 'three';
import { scene } from '../scene.js';
import { camera } from '../scene.js';
import { BEAR_Z_MIN, BEAR_Z_MAX } from '../entities/bear.js';
import { lastBearZ, setLastBearZ } from './gameState.js';

const CAM_OFFSET = new THREE.Vector3(0, 12, 9);
const CAM_LERP = 0.08;

export function snapCameraToBear(bear) {
  camera.position.set(0, CAM_OFFSET.y, bear.position.z + CAM_OFFSET.z);
  camera.lookAt(0, 2, bear.position.z);
}

export function updateCameraAndLog(bear) {
  const dz = bear.position.z - lastBearZ; setLastBearZ(bear.position.z);
  const log = scene.getObjectByName('log');
  if (log) {
    log.rotation.x += -dz * 0.35;
    const targetZ = THREE.MathUtils.clamp(bear.position.z + 0.2, BEAR_Z_MIN + 0.2, BEAR_Z_MAX + 0.2);
    log.position.z = THREE.MathUtils.lerp(log.position.z, targetZ, 0.05);
  }
  const desired = { x: 0, y: CAM_OFFSET.y, z: bear.position.z + CAM_OFFSET.z };
  camera.position.x += (desired.x - camera.position.x) * CAM_LERP;
  camera.position.y += (desired.y - camera.position.y) * CAM_LERP;
  camera.position.z += (desired.z - camera.position.z) * CAM_LERP;
  camera.lookAt(0, 2, bear.position.z);
}


import * as THREE from 'three';
import * as TWEEN from 'tween';
import { scene } from '../scene.js';
import { updateFish } from '../entities/fish.js';
import { initAudio } from './audio.js';
import { bindUI, updateUIValues, showHUD, showStart, populateUnlocks } from './ui.js';
import { BEARS, FISH, getPlayerProgress, savePlayerProgress } from '../unlocks.js';
import { updateSpawner, resetSpawner } from './fishSpawner.js';
import { addLocalScore } from './leaderboard.js';
import { startRecording, stopRecording } from './recorder.js';
import { renderer } from '../scene.js';
import { camera } from '../scene.js';
import { createBear, updateBear, getHandAnchor, BEAR_Z_MIN, BEAR_Z_MAX } from '../entities/bear.js';
import { setupStartScreen, startGame, startGameWithTurnaround, gameOver } from './flow.js';
import { updateCameraAndLog } from './cameraLogFollow.js';
import { grabAndThrow, computeFishScore } from './catchThrow.js';
import { bear, setBear, activeFishes, setActiveFishes, gameState, setGameState, lastBearZ, setLastBearZ, isFirstLoad, __startingSequence } from './gameState.js';

const Z_DRIFT_PER_TICK = 0.0008;
const gravity = new THREE.Vector3(0, -0.05, 0);

export function initGame() {
  setupStartScreen();
  const { startButton } = bindUI();
  startButton.addEventListener('click', startGameWithTurnaround);
  import('./audio.js').then(({ wireAudioUnlock }) => {
    wireAudioUnlock(() => { initAudio(); import('./audio.js').then(m => m.startWaterfall?.()); });
  });
}

export function updateGame() {
  if (gameState.current === 'PLAYING') {
    if (!bear) return;
    if (typeof bear.userData.zTarget === 'number') {
      bear.userData.zTarget = Math.min(bear.userData.zTarget + Z_DRIFT_PER_TICK, BEAR_Z_MAX);
    }
    updateBear(bear, 0);
    updateCameraAndLog(bear);
    updateSpawner(scene, activeFishes, gameState.score, getPlayerProgress());
    const catchZ = bear.position.z - 0.9, failZ = bear.position.z - 0.6;
    for (let i = activeFishes.length - 1; i >= 0; i--) {
      const f = activeFishes[i];
      updateFish(f);
      if (f.userData?.thrown) {
        if (f.position.y < -10 || Math.abs(f.position.x) > 30 || f.position.z > 20) { scene.remove(f); activeFishes.splice(i,1); }
        continue;
      }
      if (f.userData?.caught) continue;
      if (f.position.z >= catchZ) {
        const half = (bear.userData.netWidth || 1) / 2, buffer = 0.35;
        const dx = Math.abs(f.position.x - bear.position.x);
        const withinX = dx <= half + buffer;
        if (withinX) {
          const { playSFX, sounds } = await import('./audio.js'); playSFX(sounds.catch);
          gameState.score += computeFishScore(f, gameState.streak);
          gameState.streak++;
          updateUIValues({ score: gameState.score, streak: gameState.streak });
          grabAndThrow(bear, f);
        } else if (f.position.z > failZ && dx > half + buffer + 0.25) {
          gameState.streak = 1;
          updateUIValues({ score: gameState.score, streak: gameState.streak });
          scene.remove(f); activeFishes.splice(i,1);
          gameOver(); break;
        }
      }
    }
    const z = bear.position.z;
    if (z >= BEAR_Z_MAX || z <= BEAR_Z_MIN) {
      gameState.streak = 1;
      updateUIValues({ score: gameState.score, streak: gameState.streak });
      gameOver(); return;
    }
  } else if (gameState.current === 'GAME_OVER') {
    if (bear && bear.position.y > -10) {
      bear.position.add(gravity);
      bear.rotation.z += 0.05;
    }
  } else {
    gameState.idleAnimTimer += 0.05;
  }
}

export function setScoreLive(newScore) {
  setGameState({ ...gameState, score: Math.max(0, Math.floor(newScore)||0) });
  updateUIValues({ score: gameState.score, streak: gameState.streak });
}

// re-exports for compatibility
export { bear, gameState };
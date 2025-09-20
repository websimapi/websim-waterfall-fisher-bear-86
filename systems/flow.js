import * as TWEEN from 'tween';
import * as THREE from 'three';
import { scene } from '../scene.js';
import { camera, renderer } from '../scene.js';
import { createBear, BEAR_Z_MIN, BEAR_Z_MAX } from '../entities/bear.js';
import { updateFish } from '../entities/fish.js';
import { initAudio, playSFX, sounds } from './audio.js';
import { bindUI, updateUIValues, showGameOver, showHUD, showStart, populateUnlocks } from './ui.js';
import { BEARS, FISH, getPlayerProgress, savePlayerProgress } from '../unlocks.js';
import { updateSpawner, resetSpawner } from './fishSpawner.js';
import { addLocalScore } from './leaderboard.js';
import { startRecording, stopRecording } from './recorder.js';
import { createOrUpdateShowcase, throwShowcaseFish } from './showcase.js';
import { snapCameraToBear } from './cameraLogFollow.js';
import { showcaseBear, showcaseFish, setShowcaseFish, bear, setBear, activeFishes, setActiveFishes, gameState, setGameState, isFirstLoad, setFirstLoad, __startingSequence, setStartingSequence } from './gameState.js';

const gravity = new THREE.Vector3(0, -0.05, 0);
const { startButton } = bindUI();
let playerProgress = getPlayerProgress();

export function setupStartScreen() {
  setGameState({ current: 'IDLE', score: 0, streak: 1, idleAnimTimer: 0 });
  scene.children.forEach(child => {
    if ((child.name === 'bear' || child.name === 'fish') && !child.userData?.isShowcase) { child.visible = false; }
  });
  activeFishes.forEach(f => scene.remove(f)); setActiveFishes([]);
  if (bear) { scene.remove(bear); setBear(null); }
  populateUnlocks(playerProgress, (type, id) => {
    if (type === 'bear') playerProgress.selectedBear = id;
    if (type === 'fish') playerProgress.selectedFish = id;
    savePlayerProgress(playerProgress);
    const qB = document.querySelector('#choose-bear span'); const qBi = document.querySelector('#choose-bear img');
    const qF = document.querySelector('#choose-fish span'); const qFi = document.querySelector('#choose-fish img');
    const selB = BEARS.find(b => b.id === playerProgress.selectedBear);
    const selF = FISH.find(f => f.id === playerProgress.selectedFish);
    if(qB) qB.textContent = selB.name; if(qBi) qBi.src = selB.asset;
    if(qF) qF.textContent = selF.name; if(qFi) qFi.src = selF.asset;
    createOrUpdateShowcase();
  });
  animateLogReset(()=>{
    createOrUpdateShowcase();
    if (showcaseBear) {
      const fromRight = Math.random() < 0.5;
      showcaseBear.position.set(fromRight ? 12 : -12, 4.65, 0.8);
      showcaseBear.visible = true; showcaseBear.rotation.y = fromRight ? -Math.PI/2 : Math.PI/2;
      const startX = showcaseBear.position.x, endX = 0, baseY = 4.65;
      const walkTw = new TWEEN.Tween(showcaseBear.position).to({ x: endX }, 2400).easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(()=>{
        const total = Math.max(0.0001, Math.abs(startX - endX));
        const progress = 1 - (Math.abs(showcaseBear.position.x - endX) / total);
        const phase = progress * Math.PI * 6;
        showcaseBear.rotation.z = Math.sin(phase) * 0.18 * (fromRight ? -1 : 1);
        showcaseBear.position.y = baseY + Math.abs(Math.sin(phase)) * 0.12;
      }).onComplete(()=>{
        showcaseBear.rotation.z = 0; showcaseBear.position.y = baseY;
        const dur2 = 800, easeRot = TWEEN.Easing?.Cubic?.InOut || ((k)=>k), easeWob = TWEEN.Easing?.Sine?.InOut || ((k)=>k);
        new TWEEN.Tween(showcaseBear.rotation).to({ y: 0 }, dur2).easing(easeRot).start();
        const wob = { t: 0 };
        new TWEEN.Tween(wob).to({ t: 1 }, dur2).easing(easeWob).onUpdate(()=>{ const ph = wob.t * Math.PI * 4; showcaseBear.rotation.z = Math.sin(ph) * 0.12; showcaseBear.position.y = baseY + Math.abs(Math.sin(ph)) * 0.08; }).onComplete(()=>{ showcaseBear.rotation.z = 0; showcaseBear.position.y = baseY; }).start();
      }).start();
    }
  });
  showStart(isFirstLoad); setFirstLoad(false);
  startButton.innerText = 'START';
}

export function startGame() {
  setGameState({ current: 'PLAYING', score: 0, streak: 1 });
  TWEEN.removeAll();
  if (showcaseBear) showcaseBear.visible = false;
  if (bear) scene.remove(bear);
  const pb = createBear(playerProgress.selectedBear); scene.add(pb); setBear(pb);
  snapCameraToBear(pb);
  pb.position.x = 0;
  updateUIValues({ score: 0, streak: 1 }); showHUD();
  try { initAudio(); } catch {}
  try { startRecording(renderer.domElement); } catch {}
  activeFishes.forEach(f => scene.remove(f)); setActiveFishes([]); resetSpawner();
}

export function startGameWithTurnaround() {
  if (__startingSequence) return;
  setStartingSequence(true);
  const proceed = () => {
    if (showcaseBear && showcaseBear.visible) {
      const baseY = 4.65, dur = 900;
      const easeRot = TWEEN.Easing?.Cubic?.InOut || ((k)=>k);
      const easeWob = TWEEN.Easing?.Sine?.InOut || ((k)=>k);
      new TWEEN.Tween(showcaseBear.rotation).to({ y: Math.PI }, dur).easing(easeRot).start();
      const wob = { t: 0 };
      new TWEEN.Tween(wob).to({ t: 1 }, dur).easing(easeWob)
        .onUpdate(()=>{ const phase = wob.t * Math.PI * 4; showcaseBear.rotation.z = Math.sin(phase) * 0.15; showcaseBear.position.y = baseY + Math.abs(Math.sin(phase)) * 0.10; })
        .onComplete(()=>{ showcaseBear.rotation.z = 0; showcaseBear.position.y = baseY; throwShowcaseFish(()=>{ startGame(); setStartingSequence(false); }); })
        .start();
    } else { startGame(); setStartingSequence(false); }
  };
  proceed();
}

export function gameOver() {
  setGameState({ ...gameState, current: 'GAME_OVER' });
  document.getElementById('final-score').innerText = gameState.score;
  if (gameState.score > playerProgress.highScore) { playerProgress.highScore = gameState.score; }
  let newUnlock = false;
  BEARS.forEach(b => {
    if (!playerProgress.unlockedBears.includes(b.id) && b.unlockCondition.type === 'score' && playerProgress.highScore >= b.unlockCondition.value) {
      playerProgress.unlockedBears.push(b.id); newUnlock = true;
    }
  });
  FISH.forEach(f => {
    if (!playerProgress.unlockedFish.includes(f.id) && f.unlockCondition.type === 'score' && playerProgress.highScore >= f.unlockCondition.value) {
      playerProgress.unlockedFish.push(f.id); newUnlock = true;
    }
  });
  savePlayerProgress(playerProgress);
  showGameOver(); playSFX(sounds.splash);
  activeFishes.forEach(f => scene.remove(f)); setActiveFishes([]);
  (async () => {
    try {
      await new Promise(r=>setTimeout(r, 1000));
      const blob = await stopRecording();
      if (blob && window.websim?.upload) {
        const file = new File([blob], `replay_${Date.now()}.webm`, { type: blob.type || 'video/webm' });
        window.__replayUploadPromise = window.websim.upload(file).then((url)=>{ window.__lastReplayUrl = url; return url; });
        const url = await window.__replayUploadPromise;
        addLocalScore(gameState.score, url);
      } else { addLocalScore(gameState.score, null); }
    } catch (e) { console.warn('Replay upload failed:', e); addLocalScore(gameState.score, null); }
  })();
  const skipBtn = document.getElementById('skip-submit-btn');
  skipBtn?.addEventListener('click', proceedToStart, { once: true });
  window.addEventListener('leaderboard:closed', proceedToStart, { once: true });
}

export function proceedToStart() {
  const goScreen = document.getElementById('game-over-screen');
  if (!goScreen || gameState.current !== 'GAME_OVER') return;
  goScreen.classList.add('fade-out');
  const onFadeOut = () => {
    goScreen.removeEventListener('animationend', onFadeOut);
    setupStartScreen();
    const startButton = document.getElementById('start-button');
    if (startButton) startButton.innerText = 'RETRY';
  };
  goScreen.addEventListener('animationend', onFadeOut);
}

export function animateLogReset(done) {
  const log = scene.getObjectByName('log'); if (!log) { done?.(); return; }
  const camOffsetZ = camera.position.z - log.position.z;
  new TWEEN.Tween(log.position).to({ z: 1 }, 900).easing(TWEEN.Easing.Cubic.Out)
    .onUpdate(()=>{ camera.position.x = 0; camera.position.y = 12; camera.position.z = log.position.z + camOffsetZ; camera.lookAt(0, 2, log.position.z); })
    .start();
  new TWEEN.Tween(log.rotation).to({ x: 0 }, 900).easing(TWEEN.Easing.Cubic.Out).onComplete(()=>{ try{done?.();}catch(e){console.warn('animateLogReset done error',e);} }).start();
}
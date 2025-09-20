import * as THREE from 'three';
import * as TWEEN from 'tween';
import { scene } from '../scene.js';
import { createBear, getHandAnchor } from '../entities/bear.js';
import { createFish } from '../entities/fish.js';
import { initAudio, playSFX, sounds } from './audio.js';
import { getPlayerProgress } from '../unlocks.js';
import { showcaseBear, showcaseFish, setShowcaseBear, setShowcaseFish } from './gameState.js';

export function createOrUpdateShowcase() {
  const progress = getPlayerProgress();
  if (showcaseBear) { scene.remove(showcaseBear); setShowcaseBear(null); setShowcaseFish(null); }
  const sb = createBear(progress.selectedBear);
  sb.name = 'showcase-bear'; sb.userData.isShowcase = true; sb.userData.bearType = progress.selectedBear;
  sb.position.set(0, 4.65, 0.8); sb.rotation.x = 0; sb.rotation.z = 0; scene.add(sb); setShowcaseBear(sb);
  const rightAnchor = getHandAnchor(sb, 'right');
  const sf = createFish(scene, 0, progress.selectedFish, {}, false);
  sf.name = 'showcase-fish'; sf.userData.fishType = progress.selectedFish;
  if (sf.parent) sf.parent.remove(sf);
  if (rightAnchor) {
    rightAnchor.add(sf); sf.position.set(0.12, -0.35, 0.35);
    sf.rotation.set(-Math.PI/6, Math.PI/2, Math.PI); sf.scale.set(0.5,0.5,0.5); sf.visible = true;
    sf.traverse((o)=>{ if (o.isMesh||o.isGroup) o.frustumCulled=false; });
  }
  setShowcaseFish(sf);
  setupShowcaseAnimation();
}

export function setupShowcaseAnimation() {
  if (!showcaseBear) return;
  const easingInOut = TWEEN.Easing?.Sine?.InOut || ((k)=>k);
  TWEEN.removeAll();
  const arm = showcaseBear.getObjectByName('rightArm');
  if (arm?.rotation) new TWEEN.Tween(arm.rotation).to({ x: -0.35 }, 900).easing(easingInOut).yoyo(true).repeat(Infinity).start();
  if (showcaseFish) {
    const wiggle = { t: 0 };
    const tw = new TWEEN.Tween(wiggle).to({ t: Math.PI*2 }, 1200).easing(easingInOut).onUpdate(()=>{
      if (!showcaseFish) { try{tw.stop();}catch{} return; }
      const ud = showcaseFish.userData||{}; const tailSwing = Math.sin(wiggle.t)*0.14;
      if (ud.tailV) ud.tailV.rotation.y = tailSwing;
      if (ud.tailH) ud.tailH.rotation.y = tailSwing;
      if (ud.segments) {
        for (const s of ud.segments) {
          const ramp = Math.min(1, Math.max(0, (s.phase - 0.55) / 0.4));
          const amp = (ud.wiggleRotAmp ? ud.wiggleRotAmp * 0.45 : 0.14) * ramp;
          s.mesh.rotation.y = (s.baseRotY || 0) + Math.sin(wiggle.t + s.phase * Math.PI) * amp;
        }
      }
    }).repeat(Infinity).yoyo(true).start();
  }
}

export function throwShowcaseFish(done) {
  if (!showcaseBear || !showcaseFish) return done?.();
  const hand = getHandAnchor(showcaseBear, 'right');
  const arm = showcaseBear.getObjectByName('rightArm');
  if (!hand || !arm) return done?.();
  const easeInOut = TWEEN.Easing?.Sine?.InOut || ((k)=>k);
  const easeOut = TWEEN.Easing?.Sine?.Out || ((k)=>k);
  const bend1 = new TWEEN.Tween(showcaseBear.rotation).to({ x: -0.28 }, 140).easing(easeInOut);
  const prep  = new TWEEN.Tween(arm.rotation).to({ x: -0.6 }, 140).easing(easeInOut);
  const throwTw = new TWEEN.Tween(arm.rotation).to({ x: 1.25 }, 180).easing(easeOut).onStart(()=>{
    hand.updateMatrixWorld(true); showcaseFish.updateMatrixWorld(true);
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion();
    showcaseFish.getWorldPosition(wp); showcaseFish.getWorldQuaternion(wq);
    if (showcaseFish.parent) hand.remove(showcaseFish), scene.add(showcaseFish);
    showcaseFish.position.copy(wp); showcaseFish.quaternion.copy(wq);
    showcaseFish.userData.thrown = true;
    showcaseFish.userData.velocity = new THREE.Vector3(-0.22, 0.36, 0.06);
    showcaseFish.userData.angularVel = new THREE.Vector3((Math.random()*0.8-0.4),(Math.random()*1.6-0.8),(Math.random()*1.0-0.5));
    (async ()=>{ try{await initAudio();}catch{} playSFX(sounds.whoosh); })();
    setTimeout(()=>{ try{ scene.remove(showcaseFish); }catch{} setShowcaseFish(null); done?.(); }, 650);
  });
  const recover = new TWEEN.Tween(showcaseBear.rotation).to({ x: 0 }, 220).easing(easeOut);
  bend1.start(); prep.start(); bend1.chain(recover); prep.chain(throwTw);
}


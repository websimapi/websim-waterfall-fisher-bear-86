export let bear = null;
export let showcaseBear = null;
export let showcaseFish = null;
export let activeFishes = [];
export let gameState = { current: 'IDLE', score: 0, streak: 1, idleAnimTimer: 0 };
export let lastBearZ = 0;
export let isFirstLoad = true;
export let __startingSequence = false;

export function setBear(b) { bear = b; }
export function setShowcaseBear(b) { showcaseBear = b; }
export function setShowcaseFish(f) { showcaseFish = f; }
export function setActiveFishes(arr) { activeFishes = arr; }
export function setGameState(s) { gameState = s; }
export function setLastBearZ(v) { lastBearZ = v; }
export function setFirstLoad(v) { isFirstLoad = v; }
export function setStartingSequence(v) { __startingSequence = v; }


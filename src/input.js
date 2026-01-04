export function createInput() {
  const keys = new Set();
  let touchLeft = false, touchRight = false;

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (['arrowleft','arrowright','a','d',' ','p'].includes(k) || e.key === ' ') e.preventDefault();
    keys.add(k === ' ' ? 'space' : k);
  }
  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    keys.delete(k === ' ' ? 'space' : k);
  }

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);

  function bindHold(btn, on, off) {
    let down = false;
    const start = (e) => { e.preventDefault(); down = true; on(); };
    const end   = (e) => { e.preventDefault(); if (!down) return; down = false; off(); };
    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
    btn.addEventListener('pointerleave', end);
  }

  function attachTouchButtons(leftBtn, rightBtn) {
    if (!leftBtn || !rightBtn) return;
    bindHold(leftBtn,  () => touchLeft  = true, () => touchLeft  = false);
    bindHold(rightBtn, () => touchRight = true, () => touchRight = false);
  }

  return {
    keys,
    get left()  { return keys.has('arrowleft') || keys.has('a') || touchLeft; },
    get right() { return keys.has('arrowright') || keys.has('d') || touchRight; },
    get boost() { return keys.has('space'); },
    has(key) { return keys.has(key); },
    clear() { keys.clear(); touchLeft = false; touchRight = false; },
    attachTouchButtons,
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    }
  };
}

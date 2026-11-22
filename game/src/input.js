// Unified keyboard and mouse input controller with Chrome-safe Tab/Space/Arrow preventDefault,
// canvas right-click Smoke Veil support, and canvas-to-world coordinate projection.

export function bindKeyboardAndMouse(canvas, input, getViewport, onImmediateAction) {
  const preventCodes = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab',
  ]);

  function onKeyDown(e) {
    if (preventCodes.has(e.code) || e.key === 'Tab' || e.key === ' ') {
      e.preventDefault();
    }
    if (!input.keys[e.code]) {
      input.press(e.code);
      if (onImmediateAction) onImmediateAction('key', e.code);
    }
    input.keys[e.code] = true;
  }

  function onKeyUp(e) {
    if (preventCodes.has(e.code) || e.key === 'Tab') e.preventDefault();
    input.keys[e.code] = false;
  }

  function onBlur() {
    for (const k of Object.keys(input.keys)) input.keys[k] = false;
  }

  function updatePointer(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    input.mouseCanvas.x = x;
    input.mouseCanvas.y = y;
    input.mouseInCanvas = true;
    const vp = getViewport();
    if (vp) {
      const world = screenToWorldCoords(x, y, vp);
      input.mouseWorld.x = world.x;
      input.mouseWorld.y = world.y;
    }
  }

  function onMouseDown(e) {
    updatePointer(e);
    const payload = {
      canvasX: input.mouseCanvas.x,
      canvasY: input.mouseCanvas.y,
      worldX: input.mouseWorld.x,
      worldY: input.mouseWorld.y,
    };
    if (e.button === 2) {
      e.preventDefault();
      if (onImmediateAction) onImmediateAction('rightclick', payload);
      return;
    }
    if (e.button !== 0) return;
    input.pendingClick = payload;
    if (onImmediateAction) onImmediateAction('click', payload);
  }

  function onContextMenu(e) {
    e.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', updatePointer);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('contextmenu', onContextMenu);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    canvas.removeEventListener('mousemove', updatePointer);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('contextmenu', onContextMenu);
  };
}

export function createInputState() {
  const pressed = new Set();
  return {
    keys: Object.create(null),
    mouseCanvas: { x: 640, y: 400 },
    mouseWorld: { x: 560, y: 330 },
    mouseInCanvas: false,
    pendingClick: null,
    press(code) {
      pressed.add(code);
    },
    consumePressed(code) {
      if (pressed.has(code)) {
        pressed.delete(code);
        return true;
      }
      return false;
    },
    clearFrame() {
      pressed.clear();
      this.pendingClick = null;
    },
  };
}

export function screenToWorldCoords(canvasX, canvasY, viewport) {
  return {
    x: (canvasX - viewport.offsetX) / viewport.scale,
    y: (canvasY - viewport.offsetY) / viewport.scale,
  };
}

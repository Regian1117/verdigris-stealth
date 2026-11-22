// Unified keyboard and mouse input controller with canvas-to-world coordinate projection.

export function bindKeyboardAndMouse(canvas, input, getViewport, onImmediateAction) {
  const preventKeys = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab',
  ]);

  function onKeyDown(e) {
    if (preventKeys.has(e.code)) e.preventDefault();
    if (!input.keys[e.code]) {
      input.press(e.code);
      if (onImmediateAction) onImmediateAction('key', e.code);
    }
    input.keys[e.code] = true;
  }

  function onKeyUp(e) {
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
    if (e.button !== 0) return;
    updatePointer(e);
    input.pendingClick = {
      canvasX: input.mouseCanvas.x,
      canvasY: input.mouseCanvas.y,
      worldX: input.mouseWorld.x,
      worldY: input.mouseWorld.y,
    };
    if (onImmediateAction) onImmediateAction('click', input.pendingClick);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', updatePointer);
  canvas.addEventListener('mousedown', onMouseDown);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    canvas.removeEventListener('mousemove', updatePointer);
    canvas.removeEventListener('mousedown', onMouseDown);
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

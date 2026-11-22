// Coarse-grid A* pathfinding for VERDIGRIS wardens navigating cleanly around cover corners.

export function buildWalkableGrid(geometry, cellSize = 40) {
  const cols = Math.ceil(geometry.width / cellSize);
  const rows = Math.ceil(geometry.height / cellSize);
  const blocked = new Uint8Array(cols * rows);
  const pad = 14;

  for (let r = 0; r < rows; r++) {
    const cy = r * cellSize + cellSize * 0.5;
    for (let c = 0; c < cols; c++) {
      const cx = c * cellSize + cellSize * 0.5;
      for (const obs of geometry.obstacles) {
        if (cx >= obs.x - pad && cx <= obs.x + obs.w + pad && cy >= obs.y - pad && cy <= obs.y + obs.h + pad) {
          blocked[r * cols + c] = 1;
          break;
        }
      }
    }
  }
  return { cols, rows, cellSize, blocked };
}

export function computeAStarPath(grid, sx, sy, tx, ty) {
  if (!grid) return [{ x: tx, y: ty }];
  const { cols, rows, cellSize, blocked } = grid;
  const start = nearestWalkable(grid, Math.floor(sx / cellSize), Math.floor(sy / cellSize));
  const goal = nearestWalkable(grid, Math.floor(tx / cellSize), Math.floor(ty / cellSize));
  if (start === goal) return [{ x: tx, y: ty }];

  const total = cols * rows;
  const gScore = new Float32Array(total).fill(Infinity);
  const fScore = new Float32Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const open = [start];
  const gr = (goal / cols) | 0;
  const gc = goal % cols;

  gScore[start] = 0;
  fScore[start] = Math.hypot((start % cols) - gc, ((start / cols) | 0) - gr);

  while (open.length > 0) {
    let bestI = 0;
    for (let i = 1; i < open.length; i++) {
      if (fScore[open[i]] < fScore[open[bestI]]) bestI = i;
    }
    const cur = open.splice(bestI, 1)[0];
    if (cur === goal) {
      const pts = [];
      for (let n = cur; n !== -1 && n !== start; n = cameFrom[n]) {
        pts.push({ x: (n % cols) * cellSize + cellSize * 0.5, y: ((n / cols) | 0) * cellSize + cellSize * 0.5 });
      }
      pts.reverse();
      if (pts.length > 0) pts[pts.length - 1] = { x: tx, y: ty };
      else pts.push({ x: tx, y: ty });
      return pts;
    }
    closed[cur] = 1;
    const cr = (cur / cols) | 0;
    const cc = cur % cols;

    for (const [dc, dr, cost] of DIRS) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const ni = nr * cols + nc;
      if (blocked[ni] || closed[ni]) continue;
      if (dc !== 0 && dr !== 0 && (blocked[cr * cols + nc] || blocked[nr * cols + cc])) continue;
      const tg = gScore[cur] + cost;
      if (tg < gScore[ni]) {
        cameFrom[ni] = cur;
        gScore[ni] = tg;
        fScore[ni] = tg + Math.hypot(nc - gc, nr - gr);
        if (!open.includes(ni)) open.push(ni);
      }
    }
  }
  return [{ x: tx, y: ty }];
}

const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, 1.414], [-1, 1, 1.414], [1, -1, 1.414], [-1, -1, 1.414],
];

function nearestWalkable(grid, c0, r0) {
  const { cols, rows, blocked } = grid;
  const cc = Math.max(0, Math.min(cols - 1, c0));
  const cr = Math.max(0, Math.min(rows - 1, r0));
  if (!blocked[cr * cols + cc]) return cr * cols + cc;
  for (let rad = 1; rad <= 3; rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        const nc = cc + dc;
        const nr = cr + dr;
        if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && !blocked[nr * cols + nc]) {
          return nr * cols + nc;
        }
      }
    }
  }
  return cr * cols + cc;
}

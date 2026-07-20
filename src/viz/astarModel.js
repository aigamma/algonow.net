// A* grid engine for the live visualizations. Deterministic given a seed;
// stepped one heap-pop at a time so the animation IS the algorithm, not a
// recording of it. `hWeight` 0 gives Dijkstra, 1 admissible A*, >1 greedy.

import { mulberry32 } from './useCanvasLoop.js';

function heapPush(heap, item) {
  heap.push(item);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heap[p][0] <= heap[i][0]) break;
    [heap[p], heap[i]] = [heap[i], heap[p]];
    i = p;
  }
}

function heapPop(heap) {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length) {
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
      if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i], heap[m]];
      i = m;
    }
  }
  return top;
}

function solvable(walls, cols, rows, start, goal) {
  const seen = new Uint8Array(cols * rows);
  const q = [start];
  seen[start] = 1;
  while (q.length) {
    const c = q.pop();
    if (c === goal) return true;
    const x = c % cols;
    const y = (c / cols) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const n = ny * cols + nx;
      if (!walls[n] && !seen[n]) {
        seen[n] = 1;
        q.push(n);
      }
    }
  }
  return false;
}

export function makeGrid(cols, rows, seed) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const rng = mulberry32(seed + attempt * 7919);
    const walls = new Uint8Array(cols * rows);
    for (let i = 0; i < walls.length; i += 1) walls[i] = rng() < 0.3 ? 1 : 0;
    // A couple of longer wall segments force real detours, so the closed set
    // visibly blooms where the heuristic gets deceived.
    for (let s = 0; s < 3; s += 1) {
      const vx = 4 + Math.floor(rng() * (cols - 8));
      const vy = 2 + Math.floor(rng() * Math.max(1, rows - 10));
      const len = 4 + Math.floor(rng() * Math.min(9, rows - 4));
      for (let k = 0; k < len; k += 1) {
        const y = vy + k;
        if (y < rows) walls[y * cols + vx] = 1;
      }
    }
    const start = Math.floor(rows / 2) * cols + 1;
    const goal = Math.floor(rows / 2) * cols + (cols - 2);
    walls[start] = 0;
    walls[goal] = 0;
    if (solvable(walls, cols, rows, start, goal)) return { cols, rows, walls, start, goal };
  }
  // Guaranteed fallback: an empty grid.
  const walls = new Uint8Array(cols * rows);
  const start = Math.floor(rows / 2) * cols + 1;
  const goal = Math.floor(rows / 2) * cols + (cols - 2);
  return { cols, rows, walls, start, goal };
}

export function makeSearch(grid, hWeight) {
  const { cols, rows, walls, start, goal } = grid;
  const n = cols * rows;
  const g = new Float64Array(n).fill(Infinity);
  const closed = new Uint8Array(n);
  const inOpen = new Uint8Array(n);
  const parent = new Int32Array(n).fill(-1);
  const gx = goal % cols;
  const gy = (goal / cols) | 0;
  const h = (c) => (Math.abs((c % cols) - gx) + Math.abs(((c / cols) | 0) - gy)) * hWeight;
  const heap = [];
  g[start] = 0;
  heapPush(heap, [h(start), start]);
  inOpen[start] = 1;

  return {
    grid,
    hWeight,
    heap,
    g,
    closed,
    inOpen,
    parent,
    explored: 0,
    current: -1,
    path: null,
    done: false,
    // Pops one node and relaxes its neighbors. Returns 'found' | 'step' | 'exhausted'.
    step() {
      if (this.done) return 'found';
      for (;;) {
        if (!heap.length) {
          this.done = true;
          return 'exhausted';
        }
        const [, c] = heapPop(heap);
        if (closed[c]) continue;
        closed[c] = 1;
        inOpen[c] = 0;
        this.current = c;
        this.explored += 1;
        if (c === goal) {
          const path = [];
          let at = c;
          while (at !== -1) {
            path.push(at);
            at = parent[at];
          }
          this.path = path.reverse();
          this.done = true;
          return 'found';
        }
        const x = c % cols;
        const y = (c / cols) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const nb = ny * cols + nx;
          if (walls[nb] || closed[nb]) continue;
          const tentative = g[c] + 1;
          if (tentative < g[nb]) {
            g[nb] = tentative;
            parent[nb] = c;
            heapPush(heap, [tentative + h(nb), nb]);
            inOpen[nb] = 1;
          }
        }
        return 'step';
      }
    },
  };
}

// Shared paint. `revealed` limits how much of the found path is drawn so the
// finish can animate; pass Infinity for all of it.
export function drawSearch(ctx, search, cell, revealed) {
  const { cols, rows, walls, start, goal } = search.grid;
  const w = cols * cell;
  const hpx = rows * cell;
  ctx.fillStyle = '#0d1119';
  ctx.fillRect(0, 0, w, hpx);

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const c = y * cols + x;
      if (walls[c]) {
        ctx.fillStyle = '#1c2436';
        ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      } else if (search.closed[c]) {
        ctx.fillStyle = 'rgba(43, 95, 168, 0.5)';
        ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      } else if (search.inOpen[c]) {
        ctx.strokeStyle = 'rgba(240, 185, 75, 0.75)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * cell + 1.5, y * cell + 1.5, cell - 3, cell - 3);
      }
    }
  }

  if (search.path) {
    ctx.strokeStyle = '#62d98a';
    ctx.lineWidth = Math.max(2, cell * 0.28);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const upto = Math.min(search.path.length, revealed);
    for (let i = 0; i < upto; i += 1) {
      const c = search.path[i];
      const px = (c % cols) * cell + cell / 2;
      const py = ((c / cols) | 0) * cell + cell / 2;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  } else if (search.current >= 0) {
    const c = search.current;
    ctx.fillStyle = '#5da2ff';
    ctx.fillRect((c % cols) * cell + 1, (((c / cols) | 0)) * cell + 1, cell - 2, cell - 2);
  }

  const mark = (c, color, ring) => {
    const px = (c % cols) * cell + cell / 2;
    const py = ((c / cols) | 0) * cell + cell / 2;
    ctx.beginPath();
    ctx.arc(px, py, cell * 0.32, 0, Math.PI * 2);
    if (ring) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fill();
    }
  };
  mark(start, '#5da2ff', false);
  mark(goal, '#f0b94b', true);
}

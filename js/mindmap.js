// ============================================
// MINDMAP.JS v5 — big fonts, draggable nodes
// ============================================

const MM_COLORS = [
  '#ff9500', '#00e676', '#40c4ff', '#ff4081',
  '#ffe040', '#ff6e6e', '#b388ff', '#64ffda'
];

// Canvas: smaller = fonts appear bigger on screen
const MM_W = 1000, MM_H = 680;

// ============================================
// COLOR — walk up to depth-1 ancestor
// ============================================
function mmNodeColor(node, allNodes) {
  let n = node;
  while (n.parentId) {
    const p = allNodes.find(x => x.id === n.parentId);
    if (!p) break;
    n = p;
  }
  const roots = allNodes.filter(x => !x.parentId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const idx = roots.findIndex(x => x.id === n.id);
  return n.color || MM_COLORS[idx % MM_COLORS.length];
}

// ============================================
// AUTO LAYOUT — recursive, any depth
// ============================================
function mmAutoLayout(nodes) {
  const cx = MM_W / 2, cy = MM_H / 2;
  const result = nodes.map(n => ({ ...n }));
  const byId = {};
  result.forEach(n => byId[n.id] = n);

  const childrenOf = pid => result
    .filter(n => pid === null ? !n.parentId : n.parentId === pid)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Radii per depth: depth-1 far, deeper closer
  const RADII = [210, 170, 140, 115, 95];

  function place(parentId, outAngle, depth) {
    const kids = childrenOf(parentId);
    if (!kids.length) return;
    const pn = parentId ? byId[parentId] : { x: cx, y: cy };
    const R = RADII[Math.min(depth, RADII.length - 1)];

    kids.forEach((kid, i) => {
      if (kid.x == null || kid.y == null) {
        if (depth === 0) {
          const a = (i / kids.length) * 2 * Math.PI - Math.PI / 2;
          kid.x = Math.round(cx + R * Math.cos(a));
          kid.y = Math.round(cy + R * Math.sin(a));
        } else {
          const spread = kids.length > 1
            ? (i - (kids.length - 1) / 2) * 0.68 : 0;
          kid.x = Math.round(pn.x + R * Math.cos(outAngle + spread));
          kid.y = Math.round(pn.y + R * Math.sin(outAngle + spread));
        }
      }
      // Clamp to canvas — leave margin for node width
      kid.x = Math.max(110, Math.min(MM_W - 110, kid.x));
      kid.y = Math.max(50,  Math.min(MM_H - 50,  kid.y));

      const childAngle = depth === 0
        ? Math.atan2(kid.y - cy, kid.x - cx)
        : Math.atan2(kid.y - pn.y, kid.x - pn.x);
      place(kid.id, childAngle, depth + 1);
    });
  }

  place(null, 0, 0);
  return result;
}

// ============================================
// DRAW: CONNECTION CURVE
// ============================================
function mmCurve(x1, y1, x2, y2, color, active) {
  const dx = (x2 - x1) * 0.5;
  const op = active ? 0.95 : 0.22;
  const fw = active ? 'filter="url(#mmGS)"' : '';
  return `<path d="M${x1},${y1} C${x1+dx},${y1} ${x2-dx},${y2} ${x2},${y2}"
    fill="none" stroke="${color}" stroke-width="3" opacity="${op}"
    stroke-linecap="round" ${fw}/>`;
}

// ============================================
// DRAW: NODE — large readable text
// depth: 0=root, 1=branch, 2+=child
// dragHandler: function name for onmousedown/ontouchstart (admin only)
// ============================================
function mmNode(cx, cy, label, color, depth, nid, done, clickable, hasDesc, clickHandler, dragHandler) {
  let W, H, rx, fs;
  if (depth === 0)      { W=170; H=72; rx=36; fs=22; }
  else if (depth === 1) { W=185; H=62; rx=31; fs=18; }
  else                  { W=172; H=52; rx=12; fs=16; }

  const x = cx - W/2, y = cy - H/2;

  let fill, stroke, tc, sw;
  if (done) {
    fill = color; stroke = color; tc = '#000'; sw = 2;
  } else if (depth === 0) {
    fill = '#001800'; stroke = color; tc = color; sw = 3;
  } else if (depth === 1) {
    fill = '#060606'; stroke = color; tc = color; sw = 2.5;
  } else {
    fill = '#050505'; stroke = color + 'aa'; tc = color; sw = 2;
  }

  const glow = done ? 'filter="url(#mmG)"' : depth <= 1 ? 'filter="url(#mmGS)"' : '';
  const op = depth === 0 ? 1 : 0.93;

  // Split label into max 2 lines
  const maxCh = depth === 0 ? 10 : 14;
  const words = label.split(' ');
  let lines = [''], li = 0;
  for (const w of words) {
    if ((lines[li] + ' ' + w).trim().length <= maxCh) {
      lines[li] = (lines[li] + ' ' + w).trim();
    } else if (li === 0) {
      li = 1; lines[1] = w;
    } else {
      lines[1] = lines[1].substring(0, maxCh - 1) + '…'; break;
    }
  }
  lines = lines.filter(Boolean);

  let txt;
  const lh = fs + 4;
  if (lines.length > 1) {
    txt = `<text text-anchor="middle" fill="${tc}" font-size="${fs}"
      font-family="'Courier New',monospace" font-weight="bold" pointer-events="none">
      <tspan x="${cx}" y="${cy - lh*0.5 + fs*0.35}">${lines[0]}</tspan>
      <tspan x="${cx}" dy="${lh}">${lines[1]}</tspan>
    </text>`;
  } else {
    txt = `<text x="${cx}" y="${cy + fs*0.38}" text-anchor="middle"
      fill="${tc}" font-size="${fs}" font-family="'Courier New',monospace"
      font-weight="bold" pointer-events="none">${lines[0]}</text>`;
  }

  const check = done
    ? `<circle cx="${x+W-8}" cy="${y+8}" r="12" fill="${color}" stroke="#000" stroke-width="1.5"/>
       <text x="${x+W-8}" y="${y+12}" text-anchor="middle" fill="#000" font-size="13"
         font-weight="bold" pointer-events="none">✓</text>`
    : '';

  const dot = hasDesc && !done
    ? `<circle cx="${x+W-7}" cy="${y+7}" r="5" fill="${color}" opacity="0.65"/>`
    : '';

  const fn = clickHandler || 'mmNodeClick';
  const oc = clickable && nid ? `onclick="${fn}('${nid}',event)"` : '';
  const od = dragHandler && nid
    ? `onmousedown="${dragHandler}('${nid}',event)" ontouchstart="${dragHandler}('${nid}',event)"`
    : '';
  const cur = dragHandler && nid ? 'grab' : (clickable && nid ? 'pointer' : 'default');

  return `<g style="cursor:${cur}" ${oc} ${od} ${glow} opacity="${op}">
    <rect x="${x}" y="${y}" width="${W}" height="${H}" rx="${rx}" ry="${rx}"
      fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
    ${done ? `<rect x="${x+2}" y="${y+2}" width="${W-4}" height="${H-4}"
      rx="${rx-1}" ry="${rx-1}" fill="none" stroke="#00000030" stroke-width="1"/>` : ''}
    ${txt}${check}${dot}
  </g>`;
}

// ============================================
// SHARED DEFS
// ============================================
const MM_DEFS = `<defs>
  <filter id="mmG" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="7" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="mmGS" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="3" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>`;

function mmDepth(node, byId) {
  let d = 0, n = node;
  while (n.parentId && byId[n.parentId]) { d++; n = byId[n.parentId]; }
  return d;
}

// ============================================
// BUILD SVG — assistant view
// ============================================
function mmBuildSVG(nodes, doneSet, clickable) {
  const cx = MM_W/2, cy = MM_H/2;
  const laidOut = mmAutoLayout(nodes);
  const byId = {};
  laidOut.forEach(n => byId[n.id] = n);

  let curves = '', nodeEls = '';

  laidOut.forEach(n => {
    const col = mmNodeColor(n, laidOut);
    const p = n.parentId ? byId[n.parentId] : { x: cx, y: cy };
    curves += mmCurve(p.x, p.y, n.x, n.y, col, doneSet.has(n.id));
  });

  nodeEls += mmNode(cx, cy, 'DAILY WORK', '#00e676', 0, null, false, false, false);

  laidOut.forEach(n => {
    const col = mmNodeColor(n, laidOut);
    const lbl = (n.tag || n.emoji ? (n.tag || n.emoji) + ' ' : '') + n.label;
    const depth = mmDepth(n, byId) + 1;
    nodeEls += mmNode(n.x, n.y, lbl, col, depth, n.id,
      doneSet.has(n.id), !!clickable, !!n.description);
  });

  return `${MM_DEFS}${curves}${nodeEls}`;
}

// ============================================
// BUILD SVG — admin canvas
// ============================================
function mmBuildSVGAdmin(nodes, selectedId) {
  const cx = MM_W/2, cy = MM_H/2;
  const laidOut = mmAutoLayout(nodes);
  const byId = {};
  laidOut.forEach(n => byId[n.id] = n);

  let curves = '', nodeEls = '';

  laidOut.forEach(n => {
    const col = mmNodeColor(n, laidOut);
    const p = n.parentId ? byId[n.parentId] : { x: cx, y: cy };
    curves += mmCurve(p.x, p.y, n.x, n.y, col, false);
  });

  // Root — clickable to add first node
  const hasNodes = laidOut.length > 0;
  nodeEls += `<g style="cursor:pointer" onclick="mmAdminClickRoot && mmAdminClickRoot(event)" filter="url(#mmGS)">
    <rect x="${cx-85}" y="${cy-36}" width="170" height="72" rx="36" ry="36"
      fill="#001800" stroke="#00e676" stroke-width="3"/>
    <text x="${cx}" y="${cy+8}" text-anchor="middle"
      fill="#00e676" font-size="22" font-family="'Courier New',monospace"
      font-weight="bold" pointer-events="none">DAILY WORK</text>
    ${!hasNodes ? `<text x="${cx}" y="${cy+54}" text-anchor="middle"
      fill="#00e67655" font-size="14" font-family="'Courier New',monospace"
      pointer-events="none">tap to add</text>` : ''}
  </g>`;

  laidOut.forEach(n => {
    const col = mmNodeColor(n, laidOut);
    const lbl = (n.tag || n.emoji ? (n.tag || n.emoji) + ' ' : '') + n.label;
    const depth = mmDepth(n, byId) + 1;
    const isSelected = n.id === selectedId;

    if (isSelected) {
      const W = depth === 1 ? 185 : 172;
      const H = depth === 1 ? 62 : 52;
      const rx = depth === 1 ? 31 : 12;
      nodeEls += `<rect x="${n.x - W/2 - 6}" y="${n.y - H/2 - 6}"
        width="${W+12}" height="${H+12}" rx="${rx+5}" ry="${rx+5}"
        fill="none" stroke="${col}" stroke-width="3" opacity="0.85"
        filter="url(#mmGS)" stroke-dasharray="8 4"/>`;
    }

    nodeEls += mmNode(n.x, n.y, lbl, col, depth, n.id, false,
      true, !!n.description, 'mmAdminClickNode', 'mmAdminNodeDragStart');
  });

  return `${MM_DEFS}${curves}${nodeEls}`;
}

// ============================================
// ADMIN RENDER
// ============================================
function mmRenderAdmin(containerId, nodes, selectedId) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;

  let svg = wrap.querySelector('svg');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${MM_W} ${MM_H}`);
    svg.style.cssText = 'background:#000;display:block;touch-action:none';
    wrap.innerHTML = '';
    wrap.appendChild(svg);
    mmPanZoomInit(wrap);
    svg.addEventListener('click', e => {
      if (e.target === svg && typeof mmAdminDeselect === 'function') mmAdminDeselect();
    });
  }

  svg.innerHTML = mmBuildSVGAdmin(nodes || [], selectedId);
}

// ============================================
// ASSISTANT RENDER
// ============================================
function mmRender(containerId, nodes, doneSet, clickable) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;

  let svg = wrap.querySelector('svg');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', `mmSvg_${containerId}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${MM_W} ${MM_H}`);
    svg.style.cssText = 'background:#000;display:block;touch-action:none';
    wrap.innerHTML = '';
    wrap.appendChild(svg);
    mmPanZoomInit(wrap);
  }

  svg.innerHTML = (!nodes || nodes.length === 0)
    ? `<text x="${MM_W/2}" y="${MM_H/2}" text-anchor="middle" fill="#333"
        font-size="22" font-family="'Courier New',monospace">
        Mindmap je prázdná
      </text>`
    : mmBuildSVG(nodes, doneSet, clickable);
}

// ============================================
// PAN & ZOOM — viewBox manipulation
// ============================================
function mmPanZoomInit(wrap) {
  const svg = wrap.querySelector('svg');
  if (!svg) return;

  let vx = 0, vy = 0, vw = MM_W, vh = MM_H;
  let panning = false, px = 0, py = 0;
  let lastTouches = [];

  function setVB() {
    svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
  }

  function fit() {
    vx = 0; vy = 0; vw = MM_W; vh = MM_H;
    setVB();
  }

  function toSVG(clientX, clientY) {
    const r = svg.getBoundingClientRect();
    return {
      x: vx + (clientX - r.left) / r.width * vw,
      y: vy + (clientY - r.top) / r.height * vh
    };
  }

  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const f = e.deltaY > 0 ? 1.1 : 0.91;
    const m = toSVG(e.clientX, e.clientY);
    vw *= f; vh *= f;
    const r = svg.getBoundingClientRect();
    vx = m.x - (e.clientX - r.left) / r.width * vw;
    vy = m.y - (e.clientY - r.top) / r.height * vh;
    vw = Math.max(150, Math.min(MM_W * 4, vw));
    vh = Math.max(100, Math.min(MM_H * 4, vh));
    setVB();
  }, { passive: false });

  svg.addEventListener('mousedown', e => {
    // Only pan when clicking empty SVG background
    if (e.target !== svg && e.target.tagName.toLowerCase() !== 'svg') return;
    panning = true;
    px = e.clientX; py = e.clientY;
    svg.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!panning) return;
    const r = svg.getBoundingClientRect();
    vx -= (e.clientX - px) / r.width * vw;
    vy -= (e.clientY - py) / r.height * vh;
    px = e.clientX; py = e.clientY;
    setVB();
  });

  document.addEventListener('mouseup', () => {
    if (panning) { panning = false; svg.style.cursor = 'grab'; }
  });

  svg.addEventListener('touchstart', e => {
    lastTouches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
  }, { passive: true });

  svg.addEventListener('touchmove', e => {
    // Skip if a node drag is in progress (handled in admin.js)
    if (typeof mmDragNodeId !== 'undefined' && mmDragNodeId) return;
    const cur = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    const r = svg.getBoundingClientRect();
    if (cur.length === 1 && lastTouches.length >= 1) {
      vx -= (cur[0].x - lastTouches[0].x) / r.width * vw;
      vy -= (cur[0].y - lastTouches[0].y) / r.height * vh;
      setVB();
    } else if (cur.length === 2 && lastTouches.length === 2) {
      const d1 = Math.hypot(lastTouches[1].x-lastTouches[0].x, lastTouches[1].y-lastTouches[0].y);
      const d2 = Math.hypot(cur[1].x-cur[0].x, cur[1].y-cur[0].y);
      const f = d1 / Math.max(d2, 1);
      const mc = { x: (cur[0].x+cur[1].x)/2, y: (cur[0].y+cur[1].y)/2 };
      const m = toSVG(mc.x, mc.y);
      vw *= f; vh *= f;
      vw = Math.max(150, Math.min(MM_W*4, vw));
      vh = Math.max(100, Math.min(MM_H*4, vh));
      vx = m.x - (mc.x-r.left) / r.width * vw;
      vy = m.y - (mc.y-r.top) / r.height * vh;
      setVB();
    }
    lastTouches = cur;
  }, { passive: true });

  svg.style.cursor = 'grab';
  wrap._mmFit = fit;
  return { fit };
}

/************************************************
 * CONFIG
 ************************************************/
const H_SPACING = 300;
const V_SPACING = 350;
const NODE_WIDTH = 240;
const NODE_HEIGHT = 356;
const IMAGE_BASE = "assets/images/";

const START_NODE_ID = "ironman1"; // your first node

const PHASE_UNLOCKERS = {
  2: "avengers1",
  3: "ageofultron",
  4: "endgame",
  5: "loki1",
  6: "loki2"
};

/************************************************
 * STATE / STORAGE
 ************************************************/
const saved = JSON.parse(localStorage.getItem("watchProgress") || "{}");

// Fast lookup by id
const byId = Object.fromEntries(projects.map(p => [p.id, p]));

// Initialize watched status
projects.forEach(p => {
  p.watched = saved[p.id] === true;
});

/************************************************
 * PRECOMPUTE UNLOCK CHAINS
 ************************************************/
projects.forEach(p => {
  p.unlocks = projects
    .filter(c => c.prerequisites?.includes(p.id))
    .map(c => c.id);
});

/************************************************
 * PHASE HELPERS
 ************************************************/
function getPhaseNumber(project) {
  if (typeof project.phase === "number") return project.phase;
  const match = String(project.phase).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function isPhaseUnlocked(project) {
  const phase = getPhaseNumber(project);
  if (phase === 1) return true;
  const unlocker = PHASE_UNLOCKERS[phase];
  return unlocker && byId[unlocker]?.watched === true;
}

/************************************************
 * VISIBILITY & INTERACTION
 ************************************************/
function isUnlocked(project) {
  if (getPhaseNumber(project) === 1) return true;
  if (!isPhaseUnlocked(project)) return false;
  return (project.prerequisites || []).every(id => byId[id]?.watched);
}

function isVisible(project) {
  if (project.id === START_NODE_ID) return true;
  if (project.watched) return true;
  return (project.prerequisites || []).every(id => byId[id]?.watched);
}

/************************************************
 * STORAGE FUNCTIONS
 ************************************************/
function saveProgress() {
  localStorage.setItem(
    "watchProgress",
    JSON.stringify(Object.fromEntries(projects.map(p => [p.id, p.watched])))
  );
}

function clearProgress() {
  localStorage.removeItem("watchProgress");
  projects.forEach(p => (p.watched = false));
  renderAll();
}

/************************************************
 * CONTAINER SIZE & GRID → PIXEL
 ************************************************/
function getVisibleBounds() {
  const visible = projects.filter(isVisible);
  if (!visible.length) return null;

  return {
    minX: Math.min(...visible.map(p => p.gridX)),
    maxX: Math.max(...visible.map(p => p.gridX)),
    minY: Math.min(...visible.map(p => p.gridY)),
    maxY: Math.max(...visible.map(p => p.gridY))
  };
}

// Convert grid coordinates to pixel coordinates relative to top-left = 0,0
function gridToPixel(project, bounds) {
  return {
    x: (project.gridX - bounds.minX) * H_SPACING,
    y: (project.gridY - bounds.minY) * V_SPACING
  };
}

function resizeContainer(bounds) {
  const container = document.getElementById("map-container");
  if (!container || !bounds) return;

  container.style.width =
    (bounds.maxX - bounds.minX + 1) * H_SPACING + NODE_WIDTH + "px";

  container.style.height =
    (bounds.maxY - bounds.minY + 1) * V_SPACING + NODE_HEIGHT + "px";
}

/************************************************
 * SVG ARROWS
 ************************************************/
const svg = document.getElementById("connections");
const arrows = [];

// Create arrowhead once
if (!svg.querySelector("#arrowhead")) {
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  marker.setAttribute("id", "arrowhead");
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "7");
  marker.setAttribute("refX", "10");
  marker.setAttribute("refY", "3.5");
  marker.setAttribute("orient", "auto");

  const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arrowPath.setAttribute("d", "M0,0 L0,7 L10,3.5 Z");
  arrowPath.setAttribute("fill", "#ef4444");

  marker.appendChild(arrowPath);
  defs.appendChild(marker);
  svg.appendChild(defs);
}

function drawArrow(fromNode, toNode) {
  const containerRect = document.getElementById("map-container").getBoundingClientRect();

  const a = fromNode.getBoundingClientRect();
  const b = toNode.getBoundingClientRect();

  const fromX = a.left + a.width / 2 - containerRect.left;
  const fromY = a.top + a.height / 2 - containerRect.top;
  const toX = b.left + b.width / 2 - containerRect.left;
  const toY = b.top + b.height / 2 - containerRect.top;

  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy);

  const ux = dx / len;
  const uy = dy / len;

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", fromX + ux * (a.width / 2));
  line.setAttribute("y1", fromY + uy * (a.height / 2));
  line.setAttribute("x2", toX - ux * (b.width / 2));
  line.setAttribute("y2", toY - uy * (b.height / 2));
  line.setAttribute("stroke", "#ef4444");
  line.setAttribute("stroke-width", 4);
  line.setAttribute("marker-end", "url(#arrowhead)");

  svg.appendChild(line);
  return line;
}

/************************************************
 * POPUP
 ************************************************/
function showChoicePopup(project) {
  const popup = document.createElement("div");
  Object.assign(popup.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "#1e293b",
    borderRadius: "12px",
    boxShadow: "0 0 20px rgba(0,0,0,0.6)",
    zIndex: 1000,
    width: "90vw",
    maxWidth: "1000px",
    padding: "32px",
    boxSizing: "border-box"
  });

  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "✕";
  Object.assign(closeBtn.style, {
    position: "absolute",
    top: "12px",
    right: "16px",
    background: "transparent",
    border: "none",
    color: "#fff",
    fontSize: "28px",
    cursor: "pointer"
  });
  closeBtn.onclick = () => popup.remove();

  const text = document.createElement("p");
  text.textContent = `Choose an action for "${project.title}"`;
  Object.assign(text.style, {
    color: "#fff",
    fontSize: "32px",
    marginBottom: "20px",
    textAlign: "center"
  });

  const btn = document.createElement("button");
  btn.textContent = "Mark as watched";
  Object.assign(btn.style, {
    width: "100%",
    padding: "14px",
    fontSize: "32px",
    borderRadius: "8px",
    cursor: "pointer"
  });
  btn.onclick = () => {
    project.watched = true;
    saveProgress();
    popup.remove();
    renderAll();
  };

  popup.append(closeBtn, text, btn);
  document.body.appendChild(popup);
}

/************************************************
 * RENDERING
 ************************************************/
function renderNodes(bounds) {
  const nodesContainer = document.getElementById("nodes");
  nodesContainer.innerHTML = "";
  svg.querySelectorAll("line").forEach(l => l.remove());
  arrows.length = 0;

  projects.forEach(p => {
    if (!isVisible(p)) return;

    const node = document.createElement("div");
    node.className = "node";
    node.dataset.id = p.id;

    if (p.watched) node.classList.add("watched");
    else if (!isUnlocked(p)) node.classList.add("locked");

    const pos = gridToPixel(p, bounds);
    node.style.left = pos.x + "px";
    node.style.top = pos.y + "px";

    if (p.image) {
      const img = document.createElement("img");
      img.src = IMAGE_BASE + p.image;
      img.onerror = () => img.remove();
      node.appendChild(img);
    }

    const check = document.createElement("span");
    check.className = "checkmark";
    check.textContent = "✔";
    check.style.display = p.watched ? "block" : "none";
    node.appendChild(check);

    if (isUnlocked(p) && !p.watched) node.onclick = () => showChoicePopup(p);

    nodesContainer.appendChild(node);
  });

  // Draw arrows
  projects.forEach(parent => {
    const from = document.querySelector(`.node[data-id="${parent.id}"]`);
    parent.unlocks.forEach(childId => {
      const to = document.querySelector(`.node[data-id="${childId}"]`);
      if (from && to) arrows.push(drawArrow(from, to));
    });
  });
}

/************************************************
 * MAIN FUNCTIONS
 ************************************************/
function renderAll() {
  const bounds = getVisibleBounds();
  resizeContainer(bounds);
  renderNodes(bounds);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("markAllWatchedBtn")?.addEventListener("click", () => {
    projects.forEach(p => p.watched = true);
    saveProgress();
    renderAll();
  });

  document.getElementById("clear-progress")?.addEventListener("click", clearProgress);

  renderAll();
});

window.addEventListener("resize", renderAll);

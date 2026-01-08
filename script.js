/************************************************
 * CONFIG
 ************************************************/
const H_SPACING = 300;
const V_SPACING = 350;
const NODE_WIDTH = 240;
const NODE_HEIGHT = 356;
const IMAGE_BASE = "assets/images/";
const START_NODE_ID = "ironman1";
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

projects.forEach(p => {
  p.watched = saved[p.id] === true;
});

/************************************************
 * PRECOMPUTE UNLOCK CHAINS
 ************************************************/
projects.forEach(p => {
  p.unlocks = projects
    .filter(c => c.prerequisites.includes(p.id))
    .map(c => c.id);
});

function getPhaseNumber(project) {
  // Handles: 1, "1", "Phase 1", "phase 1"
  if (typeof project.phase === "number") return project.phase;

  const match = String(project.phase).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function isPhaseUnlocked(project) {
  const phaseNum = getPhaseNumber(project);

  // First phase is ALWAYS unlocked
  if (phaseNum === 1) return true;

  const unlockerId = PHASE_UNLOCKERS[phaseNum];
  if (!unlockerId) return false;

  return projects.find(p => p.id === unlockerId)?.watched === true;
}

/************************************************
 * FINAL UNLOCK CHECK
 ************************************************/
function isUnlocked(project) {
  const phaseNum = getPhaseNumber(project);

  // Phase 1 always clickable
  if (phaseNum === 1) return true;

  if (!isPhaseUnlocked(project)) return false;

  return (project.prerequisites || []).every(id =>
    projects.find(p => p.id === id)?.watched
  );
}

function isVisible(project) {
  // Always show the starting node
  if (project.id === START_NODE_ID) return true;

  // Show if already watched
  if (project.watched) return true;

  // Show if all prerequisites are met
  return (project.prerequisites || []).every(id =>
    projects.find(p => p.id === id)?.watched
  );
}

/************************************************
 * GRID → PIXEL
 ************************************************/
function gridToPixelX(x) {
  const minX = Math.min(...projects.map(p => p.gridX));
  return (x - minX) * H_SPACING;
}

function gridToPixelY(project) {
  const maxY = Math.max(...projects.map(p => p.gridY));
  return (maxY - project.gridY) * V_SPACING;
}

/************************************************
 * STORAGE
 ************************************************/
function saveProgress() {
  const data = {};
  projects.forEach(p => data[p.id] = p.watched);
  localStorage.setItem("watchProgress", JSON.stringify(data));
}

function clearProgress() {
  localStorage.removeItem("watchProgress");
  projects.forEach(p => p.watched = false);
  renderAll();
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
    padding: "32px"
  });

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

  popup.append(text, btn);
  document.body.appendChild(popup);
}

/************************************************
 * CONTAINER SIZE
 ************************************************/
function resizeContainer() {
  const container = document.getElementById("map-container");
  if (!container) return;

  const minX = Math.min(...projects.map(p => p.gridX));
  const maxX = Math.max(...projects.map(p => p.gridX));
  const minY = Math.min(...projects.map(p => p.gridY));
  const maxY = Math.max(...projects.map(p => p.gridY));

  container.style.width =
    (maxX - minX + 1) * H_SPACING + NODE_WIDTH + "px";
  container.style.height =
    (maxY - minY + 1) * V_SPACING + NODE_HEIGHT + "px";
}

/************************************************
 * SVG ARROWS (FIXED)
 ************************************************/
const arrows = [];
const svg = document.getElementById("connections");

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

function drawArrow(fromNode, toNode) {
  const containerRect =
    document.getElementById("map-container").getBoundingClientRect();

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
  line.style.display = "none";

  svg.appendChild(line);
  return line;
}

function updateArrows() {
  arrows.forEach(({ line, childId }) => {
    const child = projects.find(p => p.id === childId);
    line.style.display = child && isUnlocked(child) ? "block" : "none";
  });
}

/************************************************
 * RENDER
 ************************************************/
function renderNodes() {
  const container = document.getElementById("nodes");
  container.innerHTML = "";
  svg.querySelectorAll("line").forEach(l => l.remove());
  arrows.length = 0;

  projects.forEach(project => {
    if (!isVisible(project)) return;

    const unlocked = isUnlocked(project);

    const node = document.createElement("div");
    node.className = "node";
    node.dataset.id = project.id;

    if (!unlocked && !project.watched) node.classList.add("locked");
    if (project.watched) node.classList.add("watched");

    node.style.left = gridToPixelX(project.gridX) + "px";
    node.style.top = gridToPixelY(project) + "px";

    if (project.image) {
      const img = document.createElement("img");
      img.src = IMAGE_BASE + project.image;
      img.onerror = () => img.remove();
      node.appendChild(img);
    }

    const check = document.createElement("span");
    check.className = "checkmark";
    check.textContent = "✔";
    check.style.display = project.watched ? "block" : "none";
    node.appendChild(check);

    if (unlocked && !project.watched) {
      node.onclick = () => showChoicePopup(project);
    }

    container.appendChild(node);
  });

  projects.forEach(parent => {
    const from = document.querySelector(`.node[data-id="${parent.id}"]`);
    parent.unlocks.forEach(childId => {
      const to = document.querySelector(`.node[data-id="${childId}"]`);
      if (from && to) {
        arrows.push({ line: drawArrow(from, to), childId });
      }
    });
  });

  updateArrows();
}

/************************************************
 * MAIN + BUTTONS
 ************************************************/
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("markAllWatchedBtn")
    ?.addEventListener("click", () => {
      projects.forEach(p => p.watched = true);
      saveProgress();
      renderAll();
    });

  document
    .getElementById("clear-progress")
    ?.addEventListener("click", clearProgress);

  renderAll();
});

function renderAll() {
  resizeContainer();
  renderNodes();
}

window.addEventListener("resize", renderAll);

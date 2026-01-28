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

// Fast lookup by id
const byId = Object.fromEntries(projects.map(p => [p.id, p]));
projects.forEach(p => {
  p.watched = !!saved[p.id];
  p.phaseNum = typeof p.phase === "number" ? p.phase : +(String(p.phase).match(/\d+/)?.[0] || 1);
  p.unlocks = projects.filter(c => c.prerequisites?.includes(p.id)).map(c => c.id);
});

/************************************************
 * HELPERS
 ************************************************/
const setStyles = (el, styles) => Object.assign(el.style, styles);

const isPhaseUnlocked = p => p.phaseNum === 1 || (PHASE_UNLOCKERS[p.phaseNum] && byId[PHASE_UNLOCKERS[p.phaseNum]]?.watched);

const isUnlocked = p => p.phaseNum === 1 ? true : isPhaseUnlocked(p) && (p.prerequisites || []).every(id => byId[id]?.watched);

const isVisible = p => p.id === START_NODE_ID || p.watched || (p.prerequisites || []).every(id => byId[id]?.watched);

const getHighestUnlockedPhase = () => Math.max(1, ...projects.filter(isPhaseUnlocked).map(p => p.phaseNum));

const saveProgress = () => localStorage.setItem("watchProgress", JSON.stringify(Object.fromEntries(projects.map(p => [p.id, p.watched]))));

const clearProgress = () => {
  projects.forEach(p => p.watched = false);
  localStorage.removeItem("watchProgress");
  renderAll();
};

const getVisibleBounds = () => {
  const visible = projects.filter(isVisible);
  if (!visible.length) return null;
  const xs = visible.map(p => p.gridX), ys = visible.map(p => p.gridY);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
};

const gridToPixel = (p, bounds) => ({
  x: (p.gridX - bounds.minX) * H_SPACING,
  y: (p.gridY - bounds.minY) * V_SPACING
});

const resizeContainer = bounds => {
  const container = document.getElementById("map-container");
  if (!container || !bounds) return;
  setStyles(container, {
    width: (bounds.maxX - bounds.minX + 1) * H_SPACING + NODE_WIDTH + "px",
    height: (bounds.maxY - bounds.minY + 1) * V_SPACING + NODE_HEIGHT + "px"
  });
};

/************************************************
 * SVG ARROWS
 ************************************************/
const svg = document.getElementById("connections");
const arrows = [];

const createArrowhead = () => {
  if (svg.querySelector("#arrowhead")) return;
  const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  marker.id = "arrowhead";
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "7");
  marker.setAttribute("refX", "10");
  marker.setAttribute("refY", "3.5");
  marker.setAttribute("orient", "auto");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M0,0 L0,7 L10,3.5 Z");
  path.setAttribute("fill", "#222e22");
  marker.appendChild(path);

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.appendChild(marker);
  svg.appendChild(defs);
};

const drawArrow = (fromNode, toNode) => {
  const containerRect = svg.parentElement.getBoundingClientRect();
  const a = fromNode.getBoundingClientRect();
  const b = toNode.getBoundingClientRect();

  const fx = a.left + a.width / 2 - containerRect.left;
  const fy = a.top + a.height / 2 - containerRect.top;
  const tx = b.left + b.width / 2 - containerRect.left;
  const ty = b.top + b.height / 2 - containerRect.top;

  const dx = tx - fx, dy = ty - fy;
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", fx + ux * (a.width / 2));
  line.setAttribute("y1", fy + uy * (a.height / 2));
  line.setAttribute("x2", tx - ux * (b.width / 2));
  line.setAttribute("y2", ty - uy * (b.height / 2));
  line.setAttribute("stroke", "#222e22");
  line.setAttribute("stroke-width", 4);
  line.setAttribute("marker-end", "url(#arrowhead)");

  svg.appendChild(line);
  return line;
};

/************************************************
 * POPUP
 ************************************************/
const showChoicePopup = p => {
  // Remove any existing popup first
  document.querySelector(".node-popup")?.remove();

  const popup = document.createElement("div");
  popup.className = "node-popup"; // Add a class to identify it
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
  text.textContent = `Choose an action for "${p.title}"`;
  Object.assign(text.style, {
    color: "#fff",
    fontSize: "32px",
    marginBottom: "20px",
    textAlign: "center"
  });

  const btn = document.createElement("button");
  btn.textContent = p.watched ? "Mark as unwatched" : "Mark as watched";
  Object.assign(btn.style, {
    width: "100%",
    padding: "14px",
    fontSize: "32px",
    borderRadius: "8px",
    cursor: "pointer"
  });
  btn.onclick = () => {
    p.watched = !p.watched; // toggle watched
    saveProgress();
    popup.remove();
    renderAll();
  };

  popup.append(closeBtn, text, btn);
  document.body.appendChild(popup);
};

/************************************************
 * RENDERING
 ************************************************/
const renderNodes = bounds => {
  const nodesContainer = document.getElementById("nodes");
  nodesContainer.innerHTML = "";
  svg.querySelectorAll("line").forEach(l => l.remove());
  arrows.length = 0;

  const visibleProjects = projects.filter(isVisible);
  const nodeMap = {};

  visibleProjects.forEach(p => {
    const node = document.createElement("div");
    node.className = "node";
    node.dataset.id = p.id;
    if (p.watched) node.classList.add("watched");
    else if (!isUnlocked(p)) node.classList.add("locked");

    const pos = gridToPixel(p, bounds);
    setStyles(node, { left: pos.x + "px", top: pos.y + "px" });

    if (p.image) {
      const img = document.createElement("img");
      img.src = IMAGE_BASE + p.image;
      img.onerror = () => img.remove();
      node.appendChild(img);
    }

    const check = document.createElement("span");
    check.className = "checkmark";
    check.textContent = "✔";
    setStyles(check, { display: p.watched ? "block" : "none" });
    node.appendChild(check);

    if (isUnlocked(p)) node.onclick = () => showChoicePopup(p);

    nodesContainer.appendChild(node);
    nodeMap[p.id] = node;
  });

  visibleProjects.forEach(parent => {
    parent.unlocks.forEach(childId => {
      if (nodeMap[parent.id] && nodeMap[childId]) arrows.push(drawArrow(nodeMap[parent.id], nodeMap[childId]));
    });
  });
};

/************************************************
 * MAIN
 ************************************************/
const renderAll = () => {
  const bounds = getVisibleBounds();
  if (!bounds) return;

  resizeContainer(bounds);
  createArrowhead();
  renderNodes(bounds);

  const container = document.getElementById("map-container");
  container.dataset.phase = getHighestUnlockedPhase();

  const lastWatched = projects.filter(p => p.watched).pop();
  const targetId = lastWatched ? lastWatched.id : START_NODE_ID;
  const node = document.querySelector(`.node[data-id='${targetId}']`);
  node?.scrollIntoView({ behavior: "smooth", block: "center" });
};

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

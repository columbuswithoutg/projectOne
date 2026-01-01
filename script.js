/************************************************
 * CONFIG
 ************************************************/
const H_SPACING = 600;
const V_SPACING = 700;
const NODE_WIDTH = 240;
const NODE_HEIGHT = 356;
const IMAGE_BASE = "assets/images/";

/************************************************
 * STATE / STORAGE
 ************************************************/
const saved = JSON.parse(localStorage.getItem("watchProgress") || "{}");
projects.forEach(p => {
  if (saved[p.id] !== undefined) p.watched = saved[p.id];
});

// Precompute which projects unlock which
projects.forEach(p => {
  p.unlocks = projects
    .filter(c => c.prerequisites.includes(p.id))
    .map(c => c.id);
});

/************************************************
 * PHASE INDEX
 ************************************************/
const phaseIndex = {};
[...new Set(projects.map(p => p.phase))].forEach((p, i) => phaseIndex[p] = i);

/************************************************
 * HELPERS
 ************************************************/
function isUnlocked(project) {
  return project.prerequisites.every(
    id => projects.find(p => p.id === id)?.watched
  );
}

function gridToPixelX(x) {
  const minX = Math.min(...projects.map(p => p.gridX));
  return (x - minX) * H_SPACING;
}

function gridToPixelY(project) {
  return (Math.max(...projects.map(p => p.gridY)) - project.gridY) * V_SPACING;
}

/************************************************
 * STORAGE FUNCTIONS
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

  popup.style.position = "fixed";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.background = "#1e293b";
  popup.style.borderRadius = "12px";
  popup.style.boxShadow = "0 0 20px rgba(0,0,0,0.6)";
  popup.style.zIndex = "1000";

  /* ✅ RESPONSIVE SIZE */
  popup.style.width = "90vw";       // mobile friendly
  popup.style.maxWidth = "1000px";   // desktop limit
  popup.style.padding = "32px";     // bigger content spacing

  const text = document.createElement("p");
  text.style.color = "#fff";
  text.style.fontSize = "32px";
  text.style.marginBottom = "20px";
  text.style.textAlign = "center";
  text.textContent = `Choose an action for "${project.title}"`;
  popup.appendChild(text);

  const markBtn = document.createElement("button");
  markBtn.textContent = "Marked as watched";
  markBtn.style.width = "100%";
  markBtn.style.padding = "14px";
  markBtn.style.fontSize = "32px";
  markBtn.style.borderRadius = "8px";
  markBtn.style.cursor = "pointer";


  markBtn.onclick = () => {
    project.watched = true;
    saveProgress();
    document.body.removeChild(popup);
    renderAll();
  };

  popup.appendChild(markBtn);
  document.body.appendChild(popup);
}

/************************************************
 * RESIZE CONTAINER
 ************************************************/
function resizeContainer() {
  const container = document.getElementById("map-container");
  if (!projects || projects.length === 0) return;

  const minX = Math.min(...projects.map(p => p.gridX));
  const maxX = Math.max(...projects.map(p => p.gridX));
  const minY = Math.min(...projects.map(p => p.gridY));
  const maxY = Math.max(...projects.map(p => p.gridY));

  const width = (maxX - minX + 1) * H_SPACING + NODE_WIDTH;
  const height = (maxY - minY + 1) * V_SPACING + NODE_HEIGHT;

  container.style.width = width + "px";
  container.style.height = height + "px";
}

/************************************************
 * SVG ARROWS
 ************************************************/
const arrows = [];
const svg = document.getElementById("connections");

// Add arrowhead defs once
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
  const containerRect = document
    .getElementById("map-container")
    .getBoundingClientRect();

  const fromRect = fromNode.getBoundingClientRect();
  const toRect = toNode.getBoundingClientRect();

  // Center points
  const fromX = fromRect.left + fromRect.width / 2 - containerRect.left;
  const fromY = fromRect.top + fromRect.height / 2 - containerRect.top;
  const toX   = toRect.left + toRect.width / 2 - containerRect.left;
  const toY   = toRect.top + toRect.height / 2 - containerRect.top;

  // Direction vector
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.hypot(dx, dy);

  // Normalize direction
  const ux = dx / length;
  const uy = dy / length;

  // Offset distances (half node size)
  const fromOffset = Math.min(fromRect.width, fromRect.height) / 2;
  const toOffset   = Math.min(toRect.width, toRect.height) / 2;

  // Final edge points
  const startX = fromX + ux * fromOffset;
  const startY = fromY + uy * fromOffset;
  const endX   = toX - ux * toOffset;
  const endY   = toY - uy * toOffset;

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", startX);
  line.setAttribute("y1", startY);
  line.setAttribute("x2", endX);
  line.setAttribute("y2", endY);
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
    line.style.display = (child && isUnlocked(child)) ? "block" : "none";
  });
}

/************************************************
 * RENDER NODES + ARROWS
 ************************************************/
function renderNodes() {
  const nodeContainer = document.getElementById("nodes");
  nodeContainer.innerHTML = "";
  svg.querySelectorAll("line").forEach(l => l.remove());
  arrows.length = 0;

  projects.forEach(project => {
    const unlocked = isUnlocked(project);
    const node = document.createElement("div");
    node.className = "node";
    node.dataset.id = project.id;

    if (!unlocked && !project.watched) node.classList.add("locked");
    if (project.watched) node.classList.add("watched");

    node.style.left = `${gridToPixelX(project.gridX)}px`;
    node.style.top = `${gridToPixelY(project)}px`;

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

    nodeContainer.appendChild(node);
  });

  // Draw arrows
  projects.forEach(parent => {
    const parentNode = document.querySelector(`.node[data-id='${parent.id}']`);
    parent.unlocks.forEach(childId => {
      const childNode = document.querySelector(`.node[data-id='${childId}']`);
      if (parentNode && childNode) {
        const line = drawArrow(parentNode, childNode);
        arrows.push({ line, childId });
      }
    });
  });

  updateArrows();
}

/************************************************
 * CLEAR BUTTON
 ************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const clearBtn = document.getElementById("clear-progress");
  clearBtn.addEventListener("click", clearProgress);
});

/************************************************
 * MAIN
 ************************************************/
function renderAll() {
  resizeContainer();
  renderNodes();
  renderClearButton?.();
}

renderAll();
window.onresize = () => renderAll();

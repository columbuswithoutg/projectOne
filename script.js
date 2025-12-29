/************************************************
 * CONFIG
 ************************************************/
const H_SPACING = 150;
const V_SPACING = 250;
const NODE_WIDTH = 120;
const NODE_HEIGHT = 178;
const IMAGE_BASE = "assets/images/";

/************************************************
 * STATE / STORAGE
 ************************************************/
const saved = JSON.parse(localStorage.getItem("watchProgress") || "{}");
projects.forEach(p => {
  if (saved[p.id] !== undefined) p.watched = saved[p.id];
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
 * RENDER FUNCTIONS
 ************************************************/
function resizeContainer() {
  const container = document.getElementById("map-container");

  if (!projects || projects.length === 0) return;

  const minX = Math.min(...projects.map(p => p.gridX));
  const maxX = Math.max(...projects.map(p => p.gridX));
  const minY = Math.min(...projects.map(p => p.gridY));
  const maxY = Math.max(...projects.map(p => p.gridY));

  // total width and height based on spacing and node positions
  const width = (maxX - minX + 1) * H_SPACING;  // extra NODE_WIDTH to fully fit rightmost node
  const height = (maxY - minY + 1) * V_SPACING; // extra NODE_HEIGHT for bottom node

  // set the container to the max dimensions needed
  container.style.width = width + "px";
  container.style.height = height + "px";
}

function renderNodes() {
  const nodeContainer = document.getElementById("nodes");
  nodeContainer.innerHTML = "";

  projects.forEach(project => {
    const unlocked = isUnlocked(project);

    const node = document.createElement("div");
    node.className = "node";

    if (!unlocked && !project.watched) node.classList.add("locked");
    if (project.watched) node.classList.add("watched");

    node.style.left = `${gridToPixelX(project.gridX)}px`;
    node.style.top = `${gridToPixelY(project)}px`;

    // IMAGE
    if (project.image) {
      const img = document.createElement("img");
      img.src = IMAGE_BASE + project.image;
      img.onerror = () => img.remove(); // safe fallback
      node.appendChild(img);
    }

    const check = document.createElement("span");
    check.className = "checkmark";
    check.textContent = "✔"; // or use ✅ emoji
    if (project.watched) check.style.display = "block";
    else check.style.display = "none";

    node.appendChild(check);

    if (unlocked && !project.watched) {
      node.onclick = () => showChoicePopup(project);
    }

    // ✅ APPEND NODE (THIS WAS MISSING)
    nodeContainer.appendChild(node);
  });
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
  popup.style.position = "fixed";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.background = "#1e293b";
  popup.style.padding = "20px";
  popup.style.borderRadius = "8px";
  popup.style.boxShadow = "0 0 10px #000";
  popup.style.zIndex = "1000";

  const text = document.createElement("p");
  text.style.color = "#fff";
  text.textContent = `Choose an action for "${project.title}"`;
  popup.appendChild(text);

  const markBtn = document.createElement("button");
  markBtn.textContent = "Marked as watched";
  markBtn.style.marginTop = "10px";
  markBtn.style.padding = "6px 12px";
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
  renderClearButton();
}

renderAll();
window.onresize = () => {
  renderAll();   // automatically recalculates container
};

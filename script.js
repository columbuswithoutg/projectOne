/************************************************
 * CONFIG
 ************************************************/
const H_SPACING = 220;
const V_SPACING = 140;
const NODE_WIDTH = 120;
const NODE_HEIGHT = 80;

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
  return project.prerequisites.every(id => projects.find(p => p.id === id)?.watched);
}

function gridToPixelX(x) {
  const container = document.getElementById("map-container");
  return container.clientWidth / 2 + x * H_SPACING - NODE_WIDTH / 2;
}

function gridToPixelY(project) {
  const container = document.getElementById("map-container");
  const height = container.clientHeight || 800;
  const offset = phaseIndex[project.phase] * V_SPACING * 8;
  return height - (project.gridY * V_SPACING + offset);
}

/************************************************
 * RENDER FUNCTIONS
 ************************************************/
function renderPhases() {
  const container = document.getElementById("phase-labels");
  container.innerHTML = "";
  [...new Set(projects.map(p => p.phase))].forEach(phase => {
    const div = document.createElement("div");
    div.className = "phase";
    div.textContent = phase;
    container.appendChild(div);
  });
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

    node.textContent = project.title;

    if (unlocked && !project.watched) {
      node.onclick = () => showChoicePopup(project);
    }

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

  popup.onclick = (e) => { if(e.target === popup) document.body.removeChild(popup); };
  document.body.appendChild(popup);
}

/************************************************
 * CLEAR BUTTON
 ************************************************/
function renderClearButton() {
  let container = document.getElementById("clear-button-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "clear-button-container";
    container.style.margin = "10px";
    document.body.insertBefore(container, document.getElementById("map-container"));
  }
  container.innerHTML = "";

  const btn = document.createElement("button");
  btn.textContent = "Clear Progress";
  btn.style.padding = "8px 16px";
  btn.style.border = "none";
  btn.style.borderRadius = "6px";
  btn.style.background = "#ef4444";
  btn.style.color = "#fff";
  btn.style.cursor = "pointer";
  btn.onclick = clearProgress;

  container.appendChild(btn);
}

/************************************************
 * MAIN
 ************************************************/
function renderAll() {
  renderPhases();
  renderNodes();
  renderClearButton();
}

// Initialize app
renderAll();
window.onresize = renderAll;

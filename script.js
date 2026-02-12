/************************************************
 * CONFIGURATION (Mobile proportions for all)
 ************************************************/
const CONFIG = {
  H_SPACING: 160,
  V_SPACING: 220,
  NODE_WIDTH: 120,
  NODE_HEIGHT: 180,
  IMAGE_BASE: "assets/images/",
  START_NODE_ID: "ironman1",
  STORAGE_KEY: "watchProgress_v2"
};

const PHASE_UNLOCKERS = {
  2: "avengers1",
  3: "ageofultron", 
  4: "endgame",
  5: "loki1",
  6: "loki2"
};

/************************************************
 * STATE MANAGEMENT
 ************************************************/
class WatchState {
  constructor() {
    this.data = new Map();
    this.byId = new Map();
    this.listeners = new Set();
    this.load();
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || "{}");
      Object.entries(saved).forEach(([id, watched]) => this.data.set(id, watched));
    } catch (e) {
      console.warn("Failed to load progress:", e);
    }
  }

  save() {
    const obj = Object.fromEntries(this.data);
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(obj));
    this.listeners.forEach(fn => fn(this.data));
  }

  isWatched(id) {
    return !!this.data.get(id);
  }

  toggle(id) {
    const current = this.isWatched(id);
    this.data.set(id, !current);
    this.save();
    return !current;
  }

  setWatched(id, value) {
    this.data.set(id, value);
    this.save();
  }

  clear() {
    this.data.clear();
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    this.listeners.forEach(fn => fn(this.data));
  }

  getLastWatchedId() {
    const watched = [];
    for (const [id, isWatched] of this.data) {
      if (isWatched) watched.push(id);
    }
    return watched.length ? watched[watched.length - 1] : CONFIG.START_NODE_ID;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  initProjects(projects) {
    this.byId = new Map(projects.map(p => [p.id, p]));
    projects.forEach(p => {
      p.watched = this.isWatched(p.id);
      p.phaseNum = this.parsePhase(p.phase);
      p.unlocks = projects
        .filter(c => c.prerequisites?.includes(p.id))
        .map(c => c.id);
    });
  }

  parsePhase(phase) {
    if (typeof phase === "number") return phase;
    const match = String(phase).match(/\d+/);
    return match ? +match[0] : 1;
  }
}

const state = new WatchState();

/************************************************
 * UTILITY FUNCTIONS
 ************************************************/
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/************************************************
 * VISIBILITY & UNLOCK LOGIC
 ************************************************/
const isPhaseUnlocked = (p) => {
  if (p.phaseNum === 1) return true;
  const unlockerId = PHASE_UNLOCKERS[p.phaseNum];
  return unlockerId && state.isWatched(unlockerId);
};

const isUnlocked = (p) => {
  if (p.phaseNum === 1) return true;
  if (!isPhaseUnlocked(p)) return false;
  return (p.prerequisites || []).every(id => state.isWatched(id));
};

const isVisible = (p) => {
  if (p.id === CONFIG.START_NODE_ID) return true;
  if (state.isWatched(p.id)) return true;
  return (p.prerequisites || []).every(id => state.isWatched(id));
};

const getHighestUnlockedPhase = () => {
  const unlocked = projects.filter(isPhaseUnlocked);
  return unlocked.length ? Math.max(...unlocked.map(p => p.phaseNum)) : 1;
};

/************************************************
 * COORDINATE SYSTEM (Fixed - uniform for both sides)
 ************************************************/
const getBounds = () => {
  const visible = projects.filter(isVisible);
  if (!visible.length) return null;
  
  const xs = visible.map(p => p.gridX);
  const ys = visible.map(p => p.gridY);
  
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
};

// Convert grid coordinates to pixel positions
// Both leftmost and rightmost nodes get the same treatment
const toPixel = (gridX, gridY, bounds) => ({
  x: (gridX - bounds.minX) * CONFIG.H_SPACING,
  y: (gridY - bounds.minY) * CONFIG.V_SPACING
});

/************************************************
 * RENDERER
 ************************************************/
class MapRenderer {
  constructor() {
    this.container = $("#map-wrapper");
    this.mapContainer = $("#map-container");
    this.nodesContainer = $("#nodes");
    this.svg = $("#connections");
    this.nodeElements = new Map();
    this.arrowElements = [];
    this.pendingCenterTarget = null;
  }

  init() {
    this.setupEventDelegation();
    state.subscribe(() => this.render());
  }

  setupEventDelegation() {
    this.nodesContainer.addEventListener("click", (e) => {
      const node = e.target.closest(".node");
      if (!node) return;
      
      const id = node.dataset.id;
      const project = state.byId.get(id);
      if (!project || !isUnlocked(project)) return;
      
      this.showPopup(project);
    });
  }

  render() {
    const bounds = getBounds();
    if (!bounds) return;

    this.updateContainerSize(bounds);
    this.renderNodes(bounds);
    this.updatePhaseIndicator();
    
    requestAnimationFrame(() => {
      this.renderArrows();
      this.centerOnTarget();
    });
  }

  // FIXED: Uniform sizing logic for both left and right sides
  updateContainerSize(bounds) {
    // Calculate based on actual node positions, not grid range + arbitrary padding
    // Width = (distance between leftmost and rightmost grid positions) * spacing + node width
    // This treats left and right edges identically
    const gridWidth = bounds.maxX - bounds.minX;
    const gridHeight = bounds.maxY - bounds.minY;
    
    // Width: space between nodes + one node width (same logic as left side positioning)
    const width = gridWidth * CONFIG.H_SPACING + CONFIG.NODE_WIDTH;
    const height = gridHeight * CONFIG.V_SPACING + CONFIG.NODE_HEIGHT;
    
    this.mapContainer.style.width = `${width}px`;
    this.mapContainer.style.height = `${height}px`;
  }

  renderNodes(bounds) {
    const visible = projects.filter(isVisible);
    const fragment = document.createDocumentFragment();
    
    const existingIds = new Set(this.nodeElements.keys());
    const newIds = new Set(visible.map(p => p.id));
    
    existingIds.forEach(id => {
      if (!newIds.has(id)) {
        this.nodeElements.get(id)?.remove();
        this.nodeElements.delete(id);
      }
    });

    visible.forEach(p => {
      let node = this.nodeElements.get(p.id);
      const pos = toPixel(p.gridX, p.gridY, bounds);
      
      if (!node) {
        node = this.createNodeElement(p, pos);
        fragment.appendChild(node);
        this.nodeElements.set(p.id, node);
      } else {
        node.style.left = `${pos.x}px`;
        node.style.top = `${pos.y}px`;
        this.updateNodeState(node, p);
      }
    });

    if (fragment.childNodes.length) {
      this.nodesContainer.appendChild(fragment);
    }
  }

  createNodeElement(project, pos) {
    const node = document.createElement("div");
    node.className = "node";
    node.dataset.id = project.id;
    node.style.left = `${pos.x}px`;
    node.style.top = `${pos.y}px`;
    
    if (project.image) {
      const img = document.createElement("img");
      img.src = CONFIG.IMAGE_BASE + project.image;
      img.loading = "lazy";
      img.onerror = () => img.remove();
      node.appendChild(img);
    }
    
    const check = document.createElement("span");
    check.className = "checkmark";
    check.textContent = "✔";
    node.appendChild(check);
    
    this.updateNodeState(node, project);
    return node;
  }

  updateNodeState(node, project) {
    const isWatched = state.isWatched(project.id);
    const locked = !isUnlocked(project);
    
    node.classList.toggle("watched", isWatched);
    node.classList.toggle("locked", locked);
  }

  renderArrows() {
    this.arrowElements.forEach(el => el.remove());
    this.arrowElements = [];
    
    if (!this.svg.querySelector("#arrowhead")) {
      this.createArrowhead();
    }

    const containerRect = this.mapContainer.getBoundingClientRect();
    
    projects.forEach(parent => {
      if (!isVisible(parent)) return;
      
      const fromNode = this.nodeElements.get(parent.id);
      if (!fromNode) return;
      
      parent.unlocks.forEach(childId => {
        const child = state.byId.get(childId);
        if (!child || !isVisible(child)) return;
        
        const toNode = this.nodeElements.get(childId);
        if (toNode) {
          const arrow = this.createArrow(fromNode, toNode, containerRect);
          this.svg.appendChild(arrow);
          this.arrowElements.push(arrow);
        }
      });
    });
  }

  createArrowhead() {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    
    marker.id = "arrowhead";
    marker.setAttribute("markerWidth", "8");
    marker.setAttribute("markerHeight", "6");
    marker.setAttribute("refX", "7");
    marker.setAttribute("refY", "3");
    marker.setAttribute("orient", "auto");
    
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M0,0 L0,6 L7,3 Z");
    path.setAttribute("fill", "rgba(46, 255, 81, 0.6)");
    
    marker.appendChild(path);
    defs.appendChild(marker);
    this.svg.appendChild(defs);
  }

  createArrow(fromNode, toNode, containerRect) {
    const a = fromNode.getBoundingClientRect();
    const b = toNode.getBoundingClientRect();
    
    const fx = a.left + a.width / 2 - containerRect.left;
    const fy = a.top + a.height / 2 - containerRect.top;
    const tx = b.left + b.width / 2 - containerRect.left;
    const ty = b.top + b.height / 2 - containerRect.top;
    
    const dx = tx - fx;
    const dy = ty - fy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    
    const offsetX = ux * (a.width / 2 + 6);
    const offsetY = uy * (a.height / 2 + 6);
    const endOffsetX = ux * (b.width / 2 + 8);
    const endOffsetY = uy * (b.height / 2 + 8);
    
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", fx + offsetX);
    line.setAttribute("y1", fy + offsetY);
    line.setAttribute("x2", tx - endOffsetX);
    line.setAttribute("y2", ty - endOffsetY);
    line.setAttribute("stroke", "rgba(46, 255, 81, 0.35)");
    line.setAttribute("stroke-width", "2");
    
    return line;
  }

  updatePhaseIndicator() {
    this.mapContainer.dataset.phase = getHighestUnlockedPhase();
  }

  setCenterTarget(id) {
    this.pendingCenterTarget = id;
  }

  centerOnTarget() {
    const targetId = this.pendingCenterTarget || state.getLastWatchedId();
    this.pendingCenterTarget = null;
    
    const node = this.nodeElements.get(targetId);
    if (!node) return;
    
    const wrapperRect = this.container.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    
    const scrollLeft = this.container.scrollLeft + (nodeRect.left - wrapperRect.left) - (wrapperRect.width / 2) + (nodeRect.width / 2);
    const scrollTop = this.container.scrollTop + (nodeRect.top - wrapperRect.top) - (wrapperRect.height / 2) + (nodeRect.height / 2);
    
    this.container.scrollTo({
      left: Math.max(0, scrollLeft),
      top: Math.max(0, scrollTop),
      behavior: "smooth"
    });
  }

  showPopup(project) {
    $(".node-popup")?.remove();
    
    const isWatched = state.isWatched(project.id);
    const popup = document.createElement("div");
    popup.className = "node-popup";
    popup.innerHTML = `
      <button class="popup-close">✕</button>
      <h3>${project.title}</h3>
      <button class="popup-action ${isWatched ? 'unwatch' : ''}">
        ${isWatched ? "Mark as unwatched" : "Mark as watched"}
      </button>
    `;
    
    popup.querySelector(".popup-close").onclick = () => popup.remove();
    
    popup.querySelector(".popup-action").onclick = () => {
      state.toggle(project.id);
      this.setCenterTarget(project.id);
      popup.remove();
    };
    
    popup.addEventListener("click", (e) => {
      if (e.target === popup) popup.remove();
    });
    
    document.body.appendChild(popup);
  }

  markAllWatched() {
    projects.forEach(p => state.setWatched(p.id, true));
  }
}

/************************************************
 * INITIALIZATION
 ************************************************/
const renderer = new MapRenderer();

document.addEventListener("DOMContentLoaded", () => {
  state.initProjects(projects);
  renderer.init();
  
  $("#markAllWatchedBtn")?.addEventListener("click", () => renderer.markAllWatched());
  $("#clear-progress")?.addEventListener("click", () => {
    state.clear();
    renderer.setCenterTarget(CONFIG.START_NODE_ID);
  });
  
  renderer.setCenterTarget(state.getLastWatchedId());
  renderer.render();
});
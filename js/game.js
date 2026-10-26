const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const worldId = params.get("world_id") || params.get("id");
const storageKey = `civiclens-game:${worldId || "demo"}`;
const baseStats = {
  housing: 64,
  jobs: 58,
  education: 71,
  mobility: 53,
  environment: 67,
  safety: 61,
  trust: 60,
};
const statNames = {
  housing: "Housing access",
  jobs: "Jobs & opportunity",
  education: "Education access",
  mobility: "Mobility",
  environment: "Environment",
  safety: "Safety & wellbeing",
  trust: "Public trust",
};

const initial = {
  turn: 1,
  year: 1,
  budget: 12,
  stats: { ...baseStats },
  actionsUsed: 0,
  pending: [],
  history: [],
  customProblems: [],
  selectedProblem: "housing",
  worldName: "Community Challenge",
  locationName: "Your selected community",
  mode: "Real Life Mode",
};

const problems = {
  housing: {
    id: "housing",
    title: "Housing is out of reach",
    category: "PEOPLE & HOUSING",
    group: "people",
    icon: "⌂",
    severity: "High priority",
    description:
      "Too many residents are spending too much of their income on housing. Balance immediate relief with lasting supply.",
    evidence:
      "Housing pressure can affect health, stability, and access to work.",
    success: "More affordable homes without exhausting the city budget.",
    stat: "housing",
  },

  mobility: {
    id: "mobility",
    title: "Getting around is hard",
    category: "SYSTEMS & MOBILITY",
    group: "systems",
    icon: "⇄",
    severity: "High priority",
    description:
      "People struggle to reach jobs, schools, healthcare, and essential services. Improve connections while keeping projects affordable.",
    evidence:
      "Poor connections can limit access to jobs, school, healthcare, and everyday needs.",
    success: "More residents can reach essential services safely and reliably.",
    stat: "mobility",
  },
  education: {
    id: "education",
    title: "Opportunity starts too late",
    category: "PEOPLE & EDUCATION",
    group: "people",
    icon: "✳",
    severity: "Needs attention",
    description:
      "Students need better access to learning support, devices, and career pathways. Think beyond one-time fixes.",
    evidence:
      "Access to learning resources can shape future choices and economic opportunity.",
    success: "More students can access sustained learning and career support.",
    stat: "education",
  },
  environment: {
    id: "environment",
    title: "Neighborhoods need to breathe",
    category: "PLANET & ENVIRONMENT",
    group: "planet",
    icon: "✺",
    severity: "Needs attention",
    description:
      "Pollution and limited green space can affect health and comfort. Consider who benefits and who is left out.",
    evidence:
      "Environmental quality can affect health, comfort, and resilience.",
    success: "Healthier public spaces and stronger environmental resilience.",
    stat: "environment",
  },
  safety: {
    id: "safety",
    title: "People don't feel supported",
    category: "PEOPLE & WELLBEING",
    group: "people",
    icon: "♡",
    severity: "Needs attention",
    description:
      "Residents need stronger access to safety resources and community services. Trust matters alongside service coverage.",
    evidence: "Accessible, trusted services can support community wellbeing.",
    success: "Residents can reach support and feel heard in local decisions.",
    stat: "safety",
  },
};
const actions = {
  housing: {
    title: "Build affordable homes",
    icon: "⌂",
    color: "yellow",
    cost: 4,
    duration: 2,
    description:
      "Add affordable housing capacity. This helps housing access but creates additional demand for transit and utilities.",
    effects: { housing: 10, mobility: -2, trust: 2 },
    why: "Adds long-term housing capacity, with new infrastructure pressure.",
  },
  renovate: {
    title: "Renovate vacant properties",
    icon: "↻",
    color: "pink",
    cost: 1.8,
    duration: 1,
    description:
      "Bring existing vacant properties back into use. It costs less than new construction, though available buildings may be limited.",
    effects: { housing: 6, jobs: 2, trust: 1 },
    why: "Reuses existing buildings and can support local jobs.",
  },
  transit: {
    title: "Improve transit connections",
    icon: "⇄",
    color: "blue",
    cost: 2.5,
    duration: 2,
    description:
      "Improve access to jobs, schools, and services. Benefits arrive over time and depend on where connections are added.",
    effects: { mobility: 11, jobs: 4, environment: 2 },
    why: "Makes essential destinations more reachable and can reduce car dependence.",
  },
  learning: {
    title: "Fund learning hubs",
    icon: "✳",
    color: "purple",
    cost: 1.2,
    duration: 2,
    description:
      "Create supported spaces for tutoring, digital access, and career exploration. Full benefits take time to emerge.",
    effects: { education: 10, jobs: 3, trust: 2 },
    why: "Improves access to learning and future career pathways.",
  },
  green: {
    title: "Plant green corridors",
    icon: "❋",
    color: "green",
    cost: 0.9,
    duration: 1,
    description:
      "Invest in connected trees and green spaces. Benefits depend on placement, maintenance, and who can access them.",
    effects: { environment: 9, safety: 2, trust: 1 },
    why: "Improves green-space access and environmental comfort in this simplified model.",
  },
  services: {
    title: "Expand community services",
    icon: "♡",
    color: "orange",
    cost: 1,
    duration: 1,
    description:
      "Expand community-based support, outreach, and service access. Results depend on staffing and community trust.",
    effects: { safety: 7, trust: 5, education: 1 },
    why: "Strengthens access to services and resident confidence.",
  },
};
let state = JSON.parse(JSON.stringify(initial)),
  pendingAction = null,
  toastTimer;
const clamp = (n) => Math.max(0, Math.min(100, n));
const money = (n) => `$${Number(n).toFixed(1)}M`;

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function loadLocal() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved)
      state = { ...state, ...saved, stats: { ...baseStats, ...saved.stats } };
  } catch (e) {
    console.warn(e);
  }
}

function saveLocal() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (e) { }
}

function scores() {
  const s = state.stats;
  const wellbeing = Math.round(
    (s.housing + s.jobs + s.education + s.mobility + s.environment + s.safety) /
    6,
  );
  const budget = Math.round(clamp((state.budget / 12) * 100));
  const fairness = Math.round(
    (s.housing + s.education + s.mobility + s.trust) / 4,
  );
  const longterm = Math.round(
    (s.education + s.environment + s.jobs + s.trust) / 4,
  );
  return {
    wellbeing,
    budget,
    fairness,
    longterm,
    total: Math.round(
      clamp(wellbeing * 0.4 + budget * 0.2 + fairness * 0.2 + longterm * 0.2),
    ),
  };
}

function renderStats() {
  ["housing", "jobs", "education", "mobility"].forEach((k) => {
    const n = Math.round(state.stats[k]);
    $(k + "-stat").innerHTML = `${n}<span>/100</span>`;
    $(k + "-bar").style.width = clamp(n) + "%";
    const diff = Math.round(state.stats[k] - baseStats[k]);
    const t = $(k + "-trend");
    t.textContent =
      diff === 0 ? "Baseline" : `${diff > 0 ? "+" : ""}${diff} since start`;
    t.classList.toggle("positive", diff > 0);
    t.classList.toggle("negative", diff < 0);
  });

  $("environment-stat").textContent =
    `${Math.round(state.stats.environment)} / 100`;
  $("safety-stat").textContent = `${Math.round(state.stats.safety)} / 100`;
  $("trust-stat").textContent = `${Math.round(state.stats.trust)} / 100`;
  $("budget-stat").textContent = money(state.budget);
  $("remaining-budget").textContent = money(state.budget) + " left";
  $("action-count").textContent = state.actionsUsed + " used";
  $("turn-label").textContent = `Year ${state.year} · Turn ${state.turn}`;
  renderScore();
}
function renderScore() {
  const s = scores();
  $("community-score").textContent = s.total;
  $("score-ring").style.setProperty("--score", s.total);
  $("review-score").textContent = s.total;
  $("review-meter-fill").style.width = s.total + "%";
  $("review-wellbeing").textContent = s.wellbeing;
  $("review-budget").textContent = s.budget;
  $("review-fairness").textContent = s.fairness;
  $("review-longterm").textContent = s.longterm;
  let verdict, sub, status;
  if (s.total >= 85) {
    verdict = "Strong community plan";
    sub = "Your strategy balances impact, fairness, and resources.";
    status = "Thriving";
  } else if (s.total >= 70) {
    verdict = "Good momentum";
    sub = "Your choices are moving the community in a positive direction.";
    status = "Making progress";
  } else if (s.total >= 50) {
    verdict = "Promising start";
    sub = "Make a few smart moves to build momentum.";
    status = "Room to grow";
  } else {
    verdict = "Needs a rethink";
    sub = "Review trade-offs and protect your remaining resources.";
    status = "Needs attention";
  }
  $("review-verdict").textContent = verdict;
  $("review-subtitle").textContent = sub;
  $("score-status").textContent = status;
}
function activity(title, detail, impacts = []) {
  state.history.unshift({ title, detail, impacts, turn: state.turn });
  state.history = state.history.slice(0, 8);
  renderActivity();
}
function renderActivity() {
  const list = $("activity-list");
  list.replaceChildren();
  if (!state.history.length) {
    list.innerHTML =
      '<div class="empty-activity">✧ <p>Your choices and their effects will show up here.</p></div>';
    return;
  }
  state.history.forEach((item) => {
    const row = document.createElement("div");
    row.className = "activity-item";
    const marker = document.createElement("span");
    marker.className = "activity-marker";
    marker.textContent = "↗";
    const content = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.title;
    const detail = document.createElement("small");
    detail.textContent = item.detail;
    content.append(title, detail);
    if (item.impacts?.length) {
      const impacts = document.createElement("small");
      impacts.className = "impact-line";
      impacts.textContent = item.impacts.join(" · ");
      content.append(impacts);
    }
    row.append(marker, content);
    list.append(row);
  });
}
function renderProblems() {
  const grid = $("problem-grid");
  grid.replaceChildren();
  const filter =
    document.querySelector("[data-filter].active")?.dataset.filter || "all";
  [...Object.values(problems), ...state.customProblems]
    .filter((p) => filter === "all" || p.group === filter)
    .forEach((p) => {
      const card = document.createElement("article");
      card.className =
        "problem-card" + (state.selectedProblem === p.id ? " selected" : "");
      const top = document.createElement("div");
      top.className = "problem-card-top";
      const icon = document.createElement("span");
      icon.className = "problem-emoji";
      icon.textContent = p.icon || "✦";
      const severity = document.createElement("span");
      severity.className =
        "severity " + (p.severity === "High priority" ? "high" : "medium");
      severity.textContent = p.severity || "Community added";
      top.append(icon, severity);
      const cat = document.createElement("span");
      cat.className = "problem-category";
      cat.textContent = p.category || "COMMUNITY CREATED";
      const title = document.createElement("h3");
      title.textContent = p.title;
      const desc = document.createElement("p");
      desc.textContent = p.description;
      const metrics = document.createElement("div");
      metrics.className = "problem-metrics";
      const stat = document.createElement("span");
      stat.textContent = "↗ " + (statNames[p.stat] || "Community impact");
      const term = document.createElement("span");
      term.textContent = p.custom
        ? "Player-created"
        : "◷ " +
        (["housing", "education"].includes(p.id)
          ? "Long-term"
          : "Medium-term");
      metrics.append(stat, term);
      const btn = document.createElement("button");
      btn.className = "problem-open";
      btn.innerHTML = "Explore challenge <span>→</span>";
      card.append(top, cat, title, desc, metrics, btn);
      card.addEventListener("click", () => selectProblem(p.id));
      grid.append(card);
    });
  const custom = document.createElement("article");
  custom.className = "problem-card custom-problem-card";
  custom.innerHTML =
    '<div class="custom-plus">＋</div><span class="problem-category">YOUR COMMUNITY</span><h3>Bring your own issue</h3><p>Spot a problem and add it to your strategy.</p><button class="problem-open">Create a challenge <span>→</span></button>';
  custom
    .querySelector("button")
    .addEventListener("click", () => showModal("custom-modal"));
  grid.append(custom);
}
function selectProblem(id) {
  const p = problems[id] || state.customProblems.find((x) => x.id === id);
  if (!p) return;
  state.selectedProblem = id;
  $("selected-category").textContent = p.category || "COMMUNITY CREATED";
  $("selected-title").textContent = p.title;
  $("selected-description").textContent = p.description;
  $("selected-evidence").textContent =
    p.evidence ||
    "Player-created issue: add local evidence before treating it as verified.";
  $("selected-success").textContent =
    p.success ||
    "Choose a measurable outcome and gather feedback from affected residents.";
  $("selected-illustration").querySelector("span").textContent = p.icon || "✦";
  $("selected-illustration").style.background =
    {
      housing: "#ffe9b5",
      mobility: "#d9efff",
      education: "#e2dcff",
      environment: "#dff5e8",
      safety: "#ffe1ed",
    }[id] || "#f0ecff";
  renderProblems();
  saveLocal();
}
function renderActions() {
  const list = $("action-list");
  list.replaceChildren();
  Object.entries(actions).forEach(([id, a]) => {
    const btn = document.createElement("button");
    btn.className = "action-option";
    btn.dataset.action = id;
    const symbol = document.createElement("span");
    symbol.className = "action-symbol " + a.color;
    symbol.textContent = a.icon;
    const copy = document.createElement("span");
    copy.className = "action-copy";
    const title = document.createElement("strong");
    title.textContent = a.title;
    const effect = document.createElement("small");
    effect.textContent = Object.entries(a.effects)
      .map(([k, v]) => `${statNames[k]} ${v > 0 ? "+" : ""}${v}`)
      .join(" · ");
    const cost = document.createElement("em");
    cost.textContent = `${money(a.cost)} · ${a.duration} turn${a.duration === 1 ? "" : "s"}`;
    copy.append(title, effect, cost);
    const arrow = document.createElement("span");
    arrow.className = "action-arrow";
    arrow.textContent = "→";
    btn.append(symbol, copy, arrow);
    btn.addEventListener("click", () => openAction(id));
    list.append(btn);
  });
}
function showModal(id) {
  $(id).hidden = false;
  document.body.style.overflow = "hidden";
}
function closeModal(id) {
  $(id).hidden = true;
  if (![...document.querySelectorAll(".modal-backdrop")].some((x) => !x.hidden))
    document.body.style.overflow = "";
}
function openAction(id) {
  const a = actions[id];
  pendingAction = id;
  $("action-modal-title").textContent = a.title;
  $("action-modal-description").textContent = a.description;
  $("modal-action-icon").textContent = a.icon;
  $("modal-action-cost").textContent = money(a.cost);
  const preview = $("impact-preview");
  preview.replaceChildren();
  Object.entries(a.effects).forEach(([key, val]) => {
    const row = document.createElement("div");
    row.className = "impact-row";
    const label = document.createElement("span");
    label.textContent = statNames[key] || key;
    const amount = document.createElement("strong");
    amount.className =
      "impact-value " + (val > 0 ? "up" : val < 0 ? "down" : "");
    amount.textContent = (val > 0 ? "+" : "") + val;
    row.append(label, amount);
    preview.append(row);
  });
  const warning = $("modal-warning");
  warning.hidden = state.budget >= a.cost;
  warning.textContent = `This project costs ${money(a.cost)}, but only ${money(state.budget)} remains. Choose a lower-cost action.`;
  $("confirm-action").disabled = state.budget < a.cost;
  $("confirm-action").style.opacity = state.budget < a.cost ? ".45" : "1";
  showModal("action-modal");
}
function commitAction() {
  const a = actions[pendingAction];
  if (!a) return;
  if (state.budget < a.cost) {
    toast("Not enough budget for this project.");
    return;
  }
  state.budget = +(state.budget - a.cost).toFixed(1);
  const impact = [];
  Object.entries(a.effects).forEach(([key, val]) => {
    if (a.duration > 1) {
      const immediate = Math.round(val * 0.25);
      state.stats[key] = clamp(state.stats[key] + immediate);
      state.pending.push({
        key,
        value: val,
        immediate,
        dueTurn: state.turn + a.duration - 1,
        title: a.title,
      });
      if (immediate)
        impact.push(`${key} ${immediate > 0 ? "+" : ""}${immediate} now`);
    } else {
      state.stats[key] = clamp(state.stats[key] + val);
      impact.push(`${key} ${val > 0 ? "+" : ""}${val}`);
    }
  });
  state.actionsUsed++;
  activity(
    a.title,
    `${money(a.cost)} invested · ${a.duration > 1 ? "remaining effects arrive over time" : "effects applied"}.`,
    impact,
  );
  closeModal("action-modal");
  renderStats();
  saveAndSync();
  toast(`${a.title} committed. Community stats updated.`);
  pendingAction = null;
}
function advanceTurn() {
  state.turn++;
  if ((state.turn - 1) % 4 === 0 && state.turn > 1) state.year++;
  const delivered = [];
  state.pending = state.pending.filter((p) => {
    if (p.dueTurn <= state.turn) {
      const rest = p.value - p.immediate;
      state.stats[p.key] = clamp(state.stats[p.key] + rest);
      delivered.push(`${statNames[p.key]} ${rest > 0 ? "+" : ""}${rest}`);
      return false;
    }
    return true;
  });
  if (state.actionsUsed)
    state.budget = Math.max(0, +(state.budget - 0.15).toFixed(2));
  activity(
    delivered.length ? "Long-term effects arrived" : "Turn advanced",
    delivered.length
      ? delivered.join(", ")
      : `Year ${state.year}, turn ${state.turn}. Operating costs are included.`,
    delivered,
  );
  renderStats();
  saveAndSync();
  toast("Time advanced. Your community has been updated.");
}
function evaluate() {
  const s = scores();
  let advice =
    "Your strategy is balanced so far. Advance a turn to see delayed effects.";
  if (s.budget < 35)
    advice = "Your budget is under pressure. Prioritize lower-cost actions.";
  else if (s.fairness < 55)
    advice =
      "Consider who is still being left out. Improve housing, education, and mobility access.";
  else if (s.wellbeing < 60)
    advice =
      "Focus on the community's lowest indicators before taking on more projects.";
  else if (s.longterm < 65)
    advice = "Invest in durable opportunity and environmental resilience.";
  $("review-subtitle").textContent = advice;
  activity(
    "Strategy reviewed",
    `CivicLens score: ${s.total}/100. ${advice}`,
    [],
  );
  saveAndSync();
  toast(`Strategy reviewed: ${s.total}/100.`);
}
function addCustom(event) {
  event.preventDefault();
  const title = $("custom-title").value.trim(),
    description = $("custom-description").value.trim(),
    group = $("custom-category").value;
  if (!title || !description) return;
  const p = {
    id: "custom-" + Date.now(),
    title,
    description,
    category: group.toUpperCase() + " · COMMUNITY ADDED",
    group,
    icon: "✦",
    severity: "Community added",
    evidence:
      "This issue was added by a player. Gather local evidence before treating it as verified.",
    success:
      "Set a measurable outcome and ask affected residents for feedback.",
    custom: true,
  };
  state.customProblems.push(p);
  $("custom-form").reset();
  closeModal("custom-modal");
  renderProblems();
  selectProblem(p.id);
  activity(
    "Challenge added",
    title + " · player-created, not verified public data.",
    [],
  );
  saveAndSync();
  toast("Challenge added to your community.");
}
async function loadWorld() {
  if (!supabase || !worldId || !supabase.from) return;
  try {
    const { data, error } = await supabase
      .from("worlds")
      .select("*")
      .eq("id", worldId)
      .single();
    if (error) throw error;
    if (!data) return;
    state.worldName = data.world_name || state.worldName;
    state.mode = data.game_mode || state.mode;
    $("world-name").textContent = state.worldName;
    $("mode-label").textContent = state.mode;
    if (data.location_id) {
      try {
        const res = await supabase
          .from("locations")
          .select("*")
          .eq("id", data.location_id)
          .single();
        const loc = res.data;
        if (loc) {
          state.locationName =
            [
              loc.name || loc.location_name || loc.city || loc.community_name,
              loc.state || loc.state_name || loc.region,
            ]
              .filter(Boolean)
              .join(", ") || state.locationName;
        }
      } catch (_) { }
    }
    state.locationName =
      data.location_name || data.community_name || state.locationName;
    $("world-location").textContent = state.locationName;
    const saved = data.statistics;
    if (
      saved &&
      typeof saved === "object" &&
      Object.keys(baseStats).some((k) => k in saved)
    ) {
      state.stats = { ...state.stats, ...saved };
      state.budget = Number(saved.budget ?? state.budget);
      const g = saved.civiclens_game;
      if (g) {
        state.turn = g.turn || state.turn;
        state.year = g.year || state.year;
        state.actionsUsed = g.actionsUsed || 0;
        state.pending = g.pending || [];
        state.history = g.history || [];
        state.customProblems = g.customProblems || [];
        state.selectedProblem = g.selectedProblem || state.selectedProblem;
      }
      $("data-status").textContent = "Saved world stats loaded";
    }
    renderStats();
    renderActivity();
    renderProblems();
    selectProblem(state.selectedProblem);
  } catch (e) {
    console.warn("World load failed; local state remains available.", e);
    $("data-status").textContent = "Local game state";
  }
}
async function saveAndSync() {
  saveLocal();
  if (!supabase || !worldId || !supabase.from) return;
  try {
    const statistics = {
      ...state.stats,
      budget: state.budget,
      civiclens_game: {
        turn: state.turn,
        year: state.year,
        actionsUsed: state.actionsUsed,
        pending: state.pending,
        history: state.history,
        customProblems: state.customProblems,
        selectedProblem: state.selectedProblem,
      },
    };
    const { error } = await supabase
      .from("worlds")
      .update({ statistics })
      .eq("id", worldId);
    if (error) throw error;
    $("data-status").textContent = "Saved to this world";
  } catch (e) {
    console.warn("Supabase sync failed; saved locally instead.", e);
    $("data-status").textContent = "Saved on this device";
  }
}
function bind() {
  document.querySelectorAll("[data-filter]").forEach((btn) =>
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("[data-filter]")
        .forEach((b) => b.classList.toggle("active", b === btn));
      renderProblems();
    }),
  );
  $("confirm-action").addEventListener("click", commitAction);
  $("evaluate-button").addEventListener("click", evaluate);
  $("advance-turn").addEventListener("click", advanceTurn);
  $("jump-actions").addEventListener("click", () =>
    $("action-card").scrollIntoView({ behavior: "smooth", block: "start" }),
  );
  $("help-button").addEventListener("click", () => showModal("help-modal"));
  $("custom-form").addEventListener("submit", addCustom);
  $("clear-activity").addEventListener("click", () => {
    state.history = [];
    renderActivity();
    saveAndSync();
  });
  document
    .querySelectorAll("[data-close]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        closeModal(b.closest(".modal-backdrop").id),
      ),
    );
  document.querySelectorAll(".modal-backdrop").forEach((m) =>
    m.addEventListener("click", (e) => {
      if (e.target === m) closeModal(m.id);
    }),
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape")
      document
        .querySelectorAll(".modal-backdrop:not([hidden])")
        .forEach((m) => closeModal(m.id));
  });
}
function init() {
  loadLocal();
  $("world-name").textContent = state.worldName;
  $("world-location").textContent = state.locationName;
  $("mode-label").textContent = state.mode;
  bind();
  renderActions();
  renderStats();
  renderProblems();
  renderActivity();
  selectProblem(state.selectedProblem);
  loadWorld().then(saveLocal);
}
init();



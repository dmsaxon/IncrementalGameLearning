const STORAGE_KEY = "incremental-clicker-state-v1";
const AUTOCLICK_TICK_MS = 100;
const AUTOCLICK_BASE_DELAY_SECONDS = 10;
const AUTOCLICK_FLASH_MS = 140;

const ITEMS = Array.from({ length: 10 }, (_, index) => {
  const baseIncome = Number((0.1 * Math.pow(1.8, index)).toFixed(2));
  const baseCost = index === 0 ? 1.5 : Number((5 * Math.pow(2.2, index - 1)).toFixed(2));

  return {
    id: index,
    name: `Click ${index + 1}`,
    baseIncome,
    baseCost,
    costGrowth: 1.7,
    baseManagerCost: Number((Math.max(25, baseCost * 6)).toFixed(2)),
    managerCostGrowth: 1.9,
  };
});

const state = {
  money: 0,
  levels: ITEMS.map((_, index) => (index === 0 ? 1 : 0)),
  managers: ITEMS.map(() => 0),
  managerProgress: ITEMS.map(() => 0),
  managerFlashUntil: ITEMS.map(() => 0),
};

const balanceEl = document.getElementById("balance");
const itemsEl = document.getElementById("items");

function formatDollars(value) {
  return `$${value.toFixed(2)}`;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);

    if (typeof parsed.money === "number" && Number.isFinite(parsed.money)) {
      state.money = parsed.money;
    }

    if (Array.isArray(parsed.levels) && parsed.levels.length === ITEMS.length) {
      state.levels = parsed.levels.map((level) => {
        if (typeof level !== "number" || !Number.isFinite(level)) {
          return 0;
        }

        return Math.max(0, Math.floor(level));
      });
      state.levels[0] = Math.max(1, state.levels[0]);
    } else if (Array.isArray(parsed.owned) && parsed.owned.length === ITEMS.length) {
      state.levels = parsed.owned.map((owned) => (owned ? 1 : 0));
      state.levels[0] = 1;
    }

    if (Array.isArray(parsed.managers) && parsed.managers.length === ITEMS.length) {
      state.managers = parsed.managers.map((managerValue) => {
        if (typeof managerValue === "boolean") {
          return managerValue ? 1 : 0;
        }

        if (typeof managerValue !== "number" || !Number.isFinite(managerValue)) {
          return 0;
        }

        return Math.max(0, Math.floor(managerValue));
      });
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function getClickValue(itemId) {
  const item = ITEMS[itemId];
  return Number((item.baseIncome * state.levels[itemId]).toFixed(2));
}

function getNextCost(itemId) {
  const item = ITEMS[itemId];
  return Number((item.baseCost * Math.pow(item.costGrowth, state.levels[itemId])).toFixed(2));
}

function getNextManagerCost(itemId) {
  const item = ITEMS[itemId];
  return Number(
    (item.baseManagerCost * Math.pow(item.managerCostGrowth, state.managers[itemId])).toFixed(2),
  );
}

function getManagerDelaySeconds(itemId) {
  const managerCount = state.managers[itemId];
  if (managerCount <= 0) {
    return Infinity;
  }

  return AUTOCLICK_BASE_DELAY_SECONDS / managerCount;
}

function isUnlocked(itemId) {
  return state.levels[itemId] > 0;
}

function clickItem(itemId) {
  if (!isUnlocked(itemId)) {
    return;
  }

  state.money = Number((state.money + getClickValue(itemId)).toFixed(2));
  saveState();
  render();
}

function buyItem(itemId) {
  const nextCost = getNextCost(itemId);
  if (state.money < nextCost) {
    return;
  }

  state.money = Number((state.money - nextCost).toFixed(2));
  state.levels[itemId] += 1;
  saveState();
  render();
}

function buyManager(itemId) {
  if (!isUnlocked(itemId)) {
    return;
  }

  const managerCost = getNextManagerCost(itemId);
  if (state.money < managerCost) {
    return;
  }

  state.money = Number((state.money - managerCost).toFixed(2));
  state.managers[itemId] += 1;
  saveState();
  render();
}

function runAutoclickTick() {
  let totalEarned = 0;
  let hasActiveManagers = false;
  const tickSeconds = AUTOCLICK_TICK_MS / 1000;
  const now = Date.now();

  ITEMS.forEach((item) => {
    const managerCount = state.managers[item.id];
    if (managerCount <= 0 || !isUnlocked(item.id)) {
      state.managerProgress[item.id] = 0;
      return;
    }

    hasActiveManagers = true;
    const managerDelay = getManagerDelaySeconds(item.id);
    state.managerProgress[item.id] += tickSeconds;

    while (state.managerProgress[item.id] >= managerDelay) {
      state.managerProgress[item.id] -= managerDelay;
      totalEarned += getClickValue(item.id);
      state.managerFlashUntil[item.id] = now + AUTOCLICK_FLASH_MS;
    }
  });

  if (totalEarned > 0) {
    state.money = Number((state.money + totalEarned).toFixed(2));
    saveState();
  }

  if (hasActiveManagers || totalEarned > 0) {
    render();
  }
}

function renderItem(item) {
  const level = state.levels[item.id];
  const unlocked = level > 0;
  const currentValue = getClickValue(item.id);
  const nextCost = getNextCost(item.id);
  const canAfford = state.money >= nextCost;
  const managerCount = state.managers[item.id];
  const nextManagerCost = getNextManagerCost(item.id);
  const canAffordManager = unlocked && state.money >= nextManagerCost;

  const card = document.createElement("article");
  card.className = "item-card";

  const circle = document.createElement("button");
  circle.className = "circle";
  circle.type = "button";
  circle.disabled = !unlocked;
  circle.textContent = unlocked ? "Click" : "Locked";
  if (unlocked && managerCount > 0) {
    const managerDelay = getManagerDelaySeconds(item.id);
    const progress = Math.min(1, state.managerProgress[item.id] / managerDelay);
    const isFlashing = Date.now() < state.managerFlashUntil[item.id];
    const fillPercent = isFlashing ? "100%" : `${(progress * 100).toFixed(1)}%`;
    circle.style.setProperty("--fill-level", fillPercent);
  } else {
    circle.style.setProperty("--fill-level", "0%");
  }
  circle.addEventListener("click", () => clickItem(item.id));

  const name = document.createElement("p");
  name.className = "item-name";
  name.textContent = item.name;

  const income = document.createElement("p");
  income.className = "item-detail";
  income.textContent = `${formatDollars(currentValue)} per click`;

  const status = document.createElement("p");
  status.className = "item-status";
  status.textContent = `Level: ${level}`;

  const managerStatus = document.createElement("p");
  managerStatus.className = "item-status";
  managerStatus.textContent = managerCount > 0
    ? `Managers: ${managerCount} (autoclick every ${getManagerDelaySeconds(item.id).toFixed(2)}s)`
    : "Managers: 0";

  card.append(circle, name, income, status, managerStatus);

  const buyButton = document.createElement("button");
  buyButton.className = "buy-button";
  buyButton.type = "button";
  buyButton.disabled = !canAfford;
  buyButton.textContent = canAfford
    ? `Buy +1 for ${formatDollars(nextCost)}`
    : `Need ${formatDollars(nextCost)}`;
  buyButton.addEventListener("click", () => buyItem(item.id));
  card.append(buyButton);

  const managerButton = document.createElement("button");
  managerButton.className = "buy-button";
  managerButton.type = "button";
  managerButton.disabled = !canAffordManager;
  managerButton.textContent = !unlocked
    ? "Unlock item first to hire managers"
    : canAffordManager
      ? `Hire manager +1 for ${formatDollars(nextManagerCost)}`
      : `Need ${formatDollars(nextManagerCost)} for manager`;
  managerButton.addEventListener("click", () => buyManager(item.id));
  card.append(managerButton);

  return card;
}

function render() {
  balanceEl.textContent = formatDollars(state.money);
  itemsEl.innerHTML = "";

  ITEMS.forEach((item) => {
    itemsEl.append(renderItem(item));
  });
}

loadState();
render();
setInterval(runAutoclickTick, AUTOCLICK_TICK_MS);

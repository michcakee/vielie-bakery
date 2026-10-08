/* ============================================================
   Pokémon Clicker - game logic
   ------------------------------------------------------------
   The file is organized into numbered sections. Each section is
   one "feature column" so two partners can work in parallel and
   merge without stepping on each other. See TEAM_SPLIT.md.
   ============================================================ */

// ============================================================
// SECTION 1: GAME STATE
// All the numbers the game tracks live in one object so saving,
// loading and rendering can all look in the same place.
// ============================================================

const state = {
  pokemon: 0,          // Pokémon you currently have (spendable)
  totalCaught: 0,      // lifetime catches (used for achievements)
  gymBadges: 0,        // secondary currency
  totalBadges: 0,      // lifetime badges earned (for achievements)

  basePerClick: 1,     // raised by Pokéball upgrades
  basePerSecond: 0,    // raised by trainers

  clickMultiplier: 1,  // raised by Badge Shop items
  autoMultiplier: 1,   // raised by Badge Shop items

  wonGamble: false,    // for the "Shiny Hunter" achievement
  totalClicks: 0
};

const GYM_COST = 50;       // Pokémon traded for one Gym Badge
const WILD_INTERVAL = 45;  // seconds between wild encounters
const WILD_DURATION = 15;  // seconds an encounter stays on screen

// Helper: how many Pokémon one click is worth right now
function getPerClick() {
  return Math.floor(state.basePerClick * state.clickMultiplier);
}

// Helper: how many Pokémon the trainers catch per second right now
function getPerSecond() {
  return Math.floor(state.basePerSecond * state.autoMultiplier);
}

// ============================================================
// SECTION 2: SHOP DATA
// Every upgrade is an object in an array. The shop UI is built
// from these arrays, so adding a new item = adding one object.
// ============================================================

// Productivity upgrades: more Pokémon per click. Repeatable, cost grows each time.
const upgrades = [
  { id: "great",  name: "Great Ball",  desc: "+1 per click",  baseCost: 15,   owned: 0, effect: 1 },
  { id: "ultra",  name: "Ultra Ball",  desc: "+5 per click",  baseCost: 120,  owned: 0, effect: 5 },
  { id: "quick",  name: "Quick Ball",  desc: "+25 per click", baseCost: 900,  owned: 0, effect: 25 },
  { id: "master", name: "Master Ball", desc: "+150 per click", baseCost: 7000, owned: 0, effect: 150 }
];

// Time-based upgrades: trainers catch Pokémon for you every second.
const trainers = [
  { id: "youngster", name: "Youngster",   desc: "+1 per second",   baseCost: 25,    owned: 0, effect: 1 },
  { id: "bug",       name: "Bug Catcher", desc: "+5 per second",   baseCost: 200,   owned: 0, effect: 5 },
  { id: "ace",       name: "Ace Trainer", desc: "+20 per second",  baseCost: 1200,  owned: 0, effect: 20 },
  { id: "leader",    name: "Gym Leader",  desc: "+100 per second", baseCost: 8000,  owned: 0, effect: 100 }
];

// Badge Shop: spent with Gym Badges (the secondary currency). One-time purchases.
const badgeShop = [
  { id: "candy",  name: "Rare Candy",     desc: "Trainers catch 50% more",  cost: 3,  owned: false,
    apply: () => { state.autoMultiplier += 0.5; } },
  { id: "exp",    name: "Exp. Share",     desc: "Clicks are worth 50% more", cost: 3,  owned: false,
    apply: () => { state.clickMultiplier += 0.5; } },
  { id: "bike",   name: "Bicycle",        desc: "Trainers catch 2x more",    cost: 8,  owned: false,
    apply: () => { state.autoMultiplier *= 2; } },
  { id: "elite",  name: "Elite Four Trophy", desc: "Everything x2",          cost: 20, owned: false,
    apply: () => { state.clickMultiplier *= 2; state.autoMultiplier *= 2; } }
];

// Cost rises 15% per copy owned so the game keeps getting harder.
function getCost(item) {
  return Math.floor(item.baseCost * Math.pow(1.15, item.owned));
}

// ============================================================
// SECTION 3: DOM REFERENCES
// Grab every element once so we don't query the page over and over.
// ============================================================

const el = {
  pokemonCount:   document.getElementById("pokemon-count"),
  totalCaught:    document.getElementById("total-caught"),
  perClick:       document.getElementById("per-click"),
  perSecond:      document.getElementById("per-second"),
  gymBadgeCount:  document.getElementById("gym-badge-count"),
  gymCost:        document.getElementById("gym-cost"),
  message:        document.getElementById("message"),

  catchButton:    document.getElementById("catch-button"),
  gymButton:      document.getElementById("gym-button"),

  upgradeList:    document.getElementById("upgrade-list"),
  trainerList:    document.getElementById("trainer-list"),
  badgeShopList:  document.getElementById("badge-shop-list"),
  achievementList: document.getElementById("achievement-list"),

  wildBox:        document.getElementById("wild-box"),
  wildText:       document.getElementById("wild-text"),
  wildSafe:       document.getElementById("wild-safe"),
  wildGamble:     document.getElementById("wild-gamble"),
  wildSeconds:    document.getElementById("wild-seconds"),
  wildIdle:       document.getElementById("wild-idle"),
  wildInterval:   document.getElementById("wild-interval"),

  saveButton:     document.getElementById("save-button"),
  resetButton:    document.getElementById("reset-button")
};

// ============================================================
// SECTION 4: CORE CLICK LOOP
// The one thing every clicker game needs: click -> number goes up.
// ============================================================

function catchPokemon(event) {
  const amount = getPerClick();
  addPokemon(amount);
  state.totalClicks += 1;
  showFloatingText("+" + formatNumber(amount), event);
  render();
}

// Central place where Pokémon are added so achievements always get checked.
function addPokemon(amount) {
  state.pokemon += amount;
  state.totalCaught += amount;
  checkAchievements();
}

el.catchButton.addEventListener("click", catchPokemon);

// Little "+5" text that floats up from where you clicked.
function showFloatingText(text, event) {
  const float = document.createElement("span");
  float.className = "float-text";
  float.textContent = text;
  float.style.left = event.clientX + "px";
  float.style.top = (event.clientY - 20) + "px";
  document.body.appendChild(float);
  setTimeout(() => float.remove(), 800);
}

// ============================================================
// SECTION 5: PRODUCTIVITY UPGRADES (better Pokéballs)
// ============================================================

function buyUpgrade(item) {
  const cost = getCost(item);
  if (state.pokemon < cost) {
    setMessage("Not enough Pokémon for a " + item.name + "!");
    return;
  }
  state.pokemon -= cost;
  item.owned += 1;
  state.basePerClick += item.effect;
  setMessage("You bought a " + item.name + ". Each throw now catches " + formatNumber(getPerClick()) + "!");
  if (item.id === "master") el.catchButton.classList.add("master");
  render();
}

// ============================================================
// SECTION 6: TIME-BASED UPGRADES (trainers + the game tick)
// ============================================================

function buyTrainer(item) {
  const cost = getCost(item);
  if (state.pokemon < cost) {
    setMessage("Not enough Pokémon to recruit a " + item.name + "!");
    return;
  }
  state.pokemon -= cost;
  item.owned += 1;
  state.basePerSecond += item.effect;
  setMessage("A " + item.name + " joined your team! +" + item.effect + " per second.");
  render();
}

// The game "tick": runs 10 times per second so the counter feels smooth.
// Each tick adds one tenth of the per-second income.
const TICKS_PER_SECOND = 10;
setInterval(() => {
  const perSecond = getPerSecond();
  if (perSecond > 0) {
    addPokemon(perSecond / TICKS_PER_SECOND);
    render();
  }
}, 1000 / TICKS_PER_SECOND);

// ============================================================
// SECTION 7: SECONDARY CURRENCY (Gym Badges + Badge Shop)
// Trade Pokémon for badges, spend badges on permanent multipliers.
// ============================================================

function challengeGym() {
  if (state.pokemon < GYM_COST) {
    setMessage("You need " + GYM_COST + " Pokémon to challenge a gym.");
    return;
  }
  state.pokemon -= GYM_COST;
  state.gymBadges += 1;
  state.totalBadges += 1;
  setMessage("You won a Gym Badge! 🏅 Spend it in the Badge Shop.");
  checkAchievements();
  render();
}

el.gymButton.addEventListener("click", challengeGym);

function buyBadgeItem(item) {
  if (item.owned) return;
  if (state.gymBadges < item.cost) {
    setMessage("You need " + item.cost + " Gym Badges for " + item.name + ".");
    return;
  }
  state.gymBadges -= item.cost;
  item.owned = true;
  item.apply();
  setMessage(item.name + " purchased! " + item.desc + ".");
  render();
}

// ============================================================
// SECTION 8: ACHIEVEMENTS (badge / milestone unlocks)
// Each achievement has a condition function. checkAchievements()
// runs it and flips the CSS class on the matching element.
// ============================================================

const achievements = [
  { id: "first",    icon: "🐛", name: "First Catch",    check: () => state.totalCaught >= 1 },
  { id: "hundred",  icon: "🐦", name: "100 Caught",     check: () => state.totalCaught >= 100 },
  { id: "thousand", icon: "🦎", name: "1,000 Caught",   check: () => state.totalCaught >= 1000 },
  { id: "tenk",     icon: "🐉", name: "10,000 Caught",  check: () => state.totalCaught >= 10000 },
  { id: "team",     icon: "🧢", name: "Team of 5",      check: () => trainers.reduce((sum, t) => sum + t.owned, 0) >= 5 },
  { id: "badges",   icon: "🏅", name: "8 Gym Badges",   check: () => state.totalBadges >= 8 },
  { id: "clicks",   icon: "👆", name: "500 Throws",     check: () => state.totalClicks >= 500 },
  { id: "shiny",    icon: "✨", name: "Shiny Hunter",   check: () => state.wonGamble },
  { id: "champion", icon: "👑", name: "Champion",       check: () => badgeShop.every(b => b.owned) }
];

function checkAchievements() {
  for (const a of achievements) {
    if (!a.unlocked && a.check()) {
      a.unlocked = true;
      const card = document.getElementById("achievement-" + a.id);
      if (card) card.classList.add("unlocked");
      setMessage("🏆 Achievement unlocked: " + a.name + "!");
    }
  }
}

// ============================================================
// SECTION 9: CHANCE / GAMBLING (Wild Encounter)
// Every WILD_INTERVAL seconds a wild Pokémon appears. The player
// can take a safe bonus or gamble: Math.random() decides.
// ============================================================

let wildOffer = null;        // the current offer, or null when nothing is on screen
let wildCountdown = null;    // the interval that counts the offer down

const wildNames = ["Pidgey", "Rattata", "Zubat", "Magikarp", "Caterpie", "Geodude"];
const rareNames = ["Dragonite", "Snorlax", "Lapras", "Gyarados", "Charizard"];

function startWildEncounter() {
  if (wildOffer) return; // one at a time

  // The safe reward scales with how far along you are.
  const safeAmount = Math.max(10, getPerSecond() * 10 + getPerClick() * 5);
  const wager = Math.max(5, Math.floor(state.pokemon * 0.25));

  wildOffer = {
    name: wildNames[Math.floor(Math.random() * wildNames.length)],
    rare: rareNames[Math.floor(Math.random() * rareNames.length)],
    safeAmount: safeAmount,
    wager: wager,
    secondsLeft: WILD_DURATION
  };

  el.wildText.textContent = "A wild " + wildOffer.name + " appeared! Catch it, or chase the "
    + wildOffer.rare + " you spotted behind it?";
  el.wildSafe.textContent = "Catch " + wildOffer.name + " (+" + formatNumber(safeAmount) + ")";
  el.wildGamble.textContent = "Chase " + wildOffer.rare + " (risk " + formatNumber(wager) + " for 50% chance of x3)";
  el.wildSeconds.textContent = WILD_DURATION;
  el.wildBox.classList.remove("hidden");
  el.wildIdle.classList.add("hidden");

  wildCountdown = setInterval(() => {
    wildOffer.secondsLeft -= 1;
    el.wildSeconds.textContent = wildOffer.secondsLeft;
    if (wildOffer.secondsLeft <= 0) {
      setMessage("The wild " + wildOffer.name + " ran away...");
      endWildEncounter();
    }
  }, 1000);
}

function takeSafeReward() {
  if (!wildOffer) return;
  addPokemon(wildOffer.safeAmount);
  setMessage("You caught " + wildOffer.name + "! +" + formatNumber(wildOffer.safeAmount));
  endWildEncounter();
  render();
}

function takeGamble() {
  if (!wildOffer) return;
  const wager = Math.min(wildOffer.wager, state.pokemon);
  if (Math.random() < 0.5) {
    const winnings = wager * 3;
    addPokemon(winnings);
    state.wonGamble = true;
    setMessage("✨ You caught " + wildOffer.rare + "! +" + formatNumber(winnings) + " Pokémon!");
  } else {
    state.pokemon -= wager;
    setMessage(wildOffer.rare + " fled and scattered your team. -" + formatNumber(wager) + " Pokémon.");
  }
  checkAchievements();
  endWildEncounter();
  render();
}

function endWildEncounter() {
  clearInterval(wildCountdown);
  wildOffer = null;
  el.wildBox.classList.add("hidden");
  el.wildIdle.classList.remove("hidden");
}

el.wildSafe.addEventListener("click", takeSafeReward);
el.wildGamble.addEventListener("click", takeGamble);
el.wildInterval.textContent = WILD_INTERVAL;
setInterval(startWildEncounter, WILD_INTERVAL * 1000);

// ============================================================
// SECTION 10: RENDERING (DOM manipulation)
// One render() function redraws everything from state. Call it
// after any change so the page always matches the numbers.
// ============================================================

function formatNumber(n) {
  n = Math.floor(n);
  if (n >= 1000000) return (n / 1000000).toFixed(2) + "M";
  if (n >= 10000) return (n / 1000).toFixed(1) + "k";
  return n.toLocaleString();
}

function setMessage(text) {
  el.message.textContent = text;
}

// Builds the shop cards once. Later renders only update text and disabled state.
function buildShop(container, items, onBuy, buttonClass) {
  container.innerHTML = "";
  for (const item of items) {
    const card = document.createElement("div");
    card.className = "shop-item";
    card.id = "shop-" + item.id;
    card.innerHTML =
      '<div class="info">' +
        '<div class="name">' + item.name + '</div>' +
        '<div class="desc">' + item.desc + '</div>' +
        '<div class="owned"></div>' +
      '</div>' +
      '<button class="buy-button ' + buttonClass + '"></button>';
    card.querySelector("button").addEventListener("click", () => onBuy(item));
    container.appendChild(card);
  }
}

function buildAchievements() {
  el.achievementList.innerHTML = "";
  for (const a of achievements) {
    const card = document.createElement("div");
    card.className = "achievement" + (a.unlocked ? " unlocked" : "");
    card.id = "achievement-" + a.id;
    card.innerHTML = '<span class="icon">' + a.icon + '</span>' + a.name;
    el.achievementList.appendChild(card);
  }
}

function render() {
  // Top counters
  el.pokemonCount.textContent = formatNumber(state.pokemon);
  el.totalCaught.textContent = formatNumber(state.totalCaught);
  el.perClick.textContent = formatNumber(getPerClick());
  el.perSecond.textContent = formatNumber(getPerSecond());
  el.gymBadgeCount.textContent = state.gymBadges;
  el.gymCost.textContent = GYM_COST;
  el.gymButton.disabled = state.pokemon < GYM_COST;

  // Pokémon-priced shops
  for (const item of upgrades.concat(trainers)) {
    const card = document.getElementById("shop-" + item.id);
    const cost = getCost(item);
    card.querySelector(".owned").textContent = "Owned: " + item.owned;
    const button = card.querySelector("button");
    button.textContent = formatNumber(cost) + " 🔴";
    button.disabled = state.pokemon < cost;
  }

  // Badge-priced shop
  for (const item of badgeShop) {
    const card = document.getElementById("shop-" + item.id);
    const button = card.querySelector("button");
    card.querySelector(".owned").textContent = item.owned ? "Owned ✔" : "";
    button.textContent = item.owned ? "Bought" : item.cost + " 🏅";
    button.disabled = item.owned || state.gymBadges < item.cost;
  }
}

// ============================================================
// SECTION 11: SAVE / LOAD (localStorage) and start-up
// ============================================================

const SAVE_KEY = "pokemon-clicker-save";

function saveGame(showMessage = true) {
  const data = {
    state: state,
    upgrades: upgrades.map(u => u.owned),
    trainers: trainers.map(t => t.owned),
    badgeShop: badgeShop.map(b => b.owned),
    achievements: achievements.map(a => !!a.unlocked)
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  if (showMessage === true) setMessage("Game saved.");
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    Object.assign(state, data.state);
    upgrades.forEach((u, i) => u.owned = data.upgrades[i] || 0);
    trainers.forEach((t, i) => t.owned = data.trainers[i] || 0);
    badgeShop.forEach((b, i) => b.owned = data.badgeShop[i] || false);
    achievements.forEach((a, i) => a.unlocked = data.achievements[i] || false);
    if (upgrades.find(u => u.id === "master").owned > 0) el.catchButton.classList.add("master");
    setMessage("Welcome back, trainer!");
  } catch (e) {
    console.error("Could not load save:", e);
  }
}

function resetGame() {
  if (!confirm("Release all your Pokémon and start over?")) return;
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

el.saveButton.addEventListener("click", () => saveGame(true));
el.resetButton.addEventListener("click", resetGame);
setInterval(() => saveGame(false), 30000); // silent autosave every 30 seconds

// Start-up: build the page, load any save, draw everything.
buildShop(el.upgradeList, upgrades, buyUpgrade, "");
buildShop(el.trainerList, trainers, buyTrainer, "");
buildShop(el.badgeShopList, badgeShop, buyBadgeItem, "badge-cost");
loadGame();
buildAchievements();
render();

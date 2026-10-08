// ================================================================
// POKEMON CLICKER
// ================================================================


// ================================================================
// PART 1: VARIABLES (the game state)
// ================================================================

// main resource
var pokemon = 0;        // how many Pokemon you have right now (you spend these)
var totalCaught = 0;    // how many you have caught in total (for achievements)

// how much you earn
var perClick = 1;       // Pokemon per click
var perSecond = 0;      // Pokemon per second from trainers

// Badge Shop multipliers (start at 1 = normal, 2 = double)
var clickMultiplier = 1;
var autoMultiplier = 1;

// secondary currency
var gymBadges = 0;
var totalBadgesEver = 0;

// Pokeball upgrades (more per click)
var greatBallCost = 15;
var greatBallOwned = 0;

var ultraBallCost = 100;
var ultraBallOwned = 0;

var masterBallCost = 800;
var masterBallOwned = 0;

// Trainers (more per second)
var youngsterCost = 25;
var youngsterOwned = 0;

var bugCatcherCost = 200;
var bugCatcherOwned = 0;

var gymLeaderCost = 1500;
var gymLeaderOwned = 0;

// Badge Shop items (true = already bought)
var hasRareCandy = false;
var hasExpShare = false;
var hasTrophy = false;

// Wild encounter stuff
var wildActive = false;     // is a wild Pokemon on screen right now?
var wildSafeReward = 0;     // how much you get for the safe choice
var wildWager = 0;          // how much you risk for the gamble
var wildSecondsLeft = 0;    // countdown until it runs away
var wonAGamble = false;     // for the Shiny Hunter achievement


// ================================================================
// PART 2: THE MAIN CLICK
// ================================================================

function catchPokemon() {
  var amount = perClick * clickMultiplier;
  pokemon = pokemon + amount;
  totalCaught = totalCaught + amount;
  updateScreen();
}

document.getElementById("catchButton").addEventListener("click", catchPokemon);


// ================================================================
// PART 3: POKEBALL UPGRADES (productivity - more per click)
// ================================================================

function buyGreatBall() {
  if (pokemon >= greatBallCost) {
    pokemon = pokemon - greatBallCost;
    greatBallOwned = greatBallOwned + 1;
    perClick = perClick + 1;
    greatBallCost = Math.floor(greatBallCost * 1.5);   // gets more expensive each time
    showMessage("You bought a Great Ball!");
  } else {
    showMessage("Not enough Pokemon for a Great Ball!");
  }
  updateScreen();
}

function buyUltraBall() {
  if (pokemon >= ultraBallCost) {
    pokemon = pokemon - ultraBallCost;
    ultraBallOwned = ultraBallOwned + 1;
    perClick = perClick + 5;
    ultraBallCost = Math.floor(ultraBallCost * 1.5);
    showMessage("You bought an Ultra Ball!");
  } else {
    showMessage("Not enough Pokemon for an Ultra Ball!");
  }
  updateScreen();
}

function buyMasterBall() {
  if (pokemon >= masterBallCost) {
    pokemon = pokemon - masterBallCost;
    masterBallOwned = masterBallOwned + 1;
    perClick = perClick + 25;
    masterBallCost = Math.floor(masterBallCost * 1.5);
    showMessage("You bought a Master Ball! Your Pokeball turned purple!");
    // change the look of the big Pokeball
    document.getElementById("catchButton").classList.add("masterBall");
  } else {
    showMessage("Not enough Pokemon for a Master Ball!");
  }
  updateScreen();
}

document.getElementById("greatBallButton").addEventListener("click", buyGreatBall);
document.getElementById("ultraBallButton").addEventListener("click", buyUltraBall);
document.getElementById("masterBallButton").addEventListener("click", buyMasterBall);


// ================================================================
// PART 4: TRAINERS (time based - automatic catching with setInterval)
// ================================================================

function buyYoungster() {
  if (pokemon >= youngsterCost) {
    pokemon = pokemon - youngsterCost;
    youngsterOwned = youngsterOwned + 1;
    perSecond = perSecond + 1;
    youngsterCost = Math.floor(youngsterCost * 1.5);
    showMessage("A Youngster joined your team!");
  } else {
    showMessage("Not enough Pokemon to recruit a Youngster!");
  }
  updateScreen();
}

function buyBugCatcher() {
  if (pokemon >= bugCatcherCost) {
    pokemon = pokemon - bugCatcherCost;
    bugCatcherOwned = bugCatcherOwned + 1;
    perSecond = perSecond + 5;
    bugCatcherCost = Math.floor(bugCatcherCost * 1.5);
    showMessage("A Bug Catcher joined your team!");
  } else {
    showMessage("Not enough Pokemon to recruit a Bug Catcher!");
  }
  updateScreen();
}

function buyGymLeader() {
  if (pokemon >= gymLeaderCost) {
    pokemon = pokemon - gymLeaderCost;
    gymLeaderOwned = gymLeaderOwned + 1;
    perSecond = perSecond + 25;
    gymLeaderCost = Math.floor(gymLeaderCost * 1.5);
    showMessage("A Gym Leader joined your team!");
  } else {
    showMessage("Not enough Pokemon to recruit a Gym Leader!");
  }
  updateScreen();
}

document.getElementById("youngsterButton").addEventListener("click", buyYoungster);
document.getElementById("bugCatcherButton").addEventListener("click", buyBugCatcher);
document.getElementById("gymLeaderButton").addEventListener("click", buyGymLeader);

// This runs every 1000 milliseconds (1 second) forever.
// It adds whatever your trainers catch per second.
function autoCatch() {
  var amount = perSecond * autoMultiplier;
  if (amount > 0) {
    pokemon = pokemon + amount;
    totalCaught = totalCaught + amount;
    updateScreen();
  }
}

setInterval(autoCatch, 1000);


// ================================================================
// PART 5: GYM BADGES (secondary currency) and the BADGE SHOP
// ================================================================

function challengeGym() {
  if (pokemon >= 50) {
    pokemon = pokemon - 50;
    gymBadges = gymBadges + 1;
    totalBadgesEver = totalBadgesEver + 1;
    showMessage("You beat the gym and earned a Gym Badge!");
  } else {
    showMessage("You need 50 Pokemon to challenge a gym!");
  }
  updateScreen();
}

document.getElementById("gymButton").addEventListener("click", challengeGym);

function buyRareCandy() {
  if (hasRareCandy == true) {
    showMessage("You already have Rare Candy!");
  } else if (gymBadges >= 3) {
    gymBadges = gymBadges - 3;
    hasRareCandy = true;
    autoMultiplier = autoMultiplier * 2;
    showMessage("Rare Candy! Your trainers catch twice as much!");
    document.getElementById("rareCandyButton").classList.add("soldOut");
  } else {
    showMessage("You need 3 Gym Badges for Rare Candy!");
  }
  updateScreen();
}

function buyExpShare() {
  if (hasExpShare == true) {
    showMessage("You already have the Exp. Share!");
  } else if (gymBadges >= 3) {
    gymBadges = gymBadges - 3;
    hasExpShare = true;
    clickMultiplier = clickMultiplier * 2;
    showMessage("Exp. Share! Your clicks are worth twice as much!");
    document.getElementById("expShareButton").classList.add("soldOut");
  } else {
    showMessage("You need 3 Gym Badges for the Exp. Share!");
  }
  updateScreen();
}

function buyTrophy() {
  if (hasTrophy == true) {
    showMessage("You already have the Elite Four Trophy!");
  } else if (gymBadges >= 10) {
    gymBadges = gymBadges - 10;
    hasTrophy = true;
    clickMultiplier = clickMultiplier * 2;
    autoMultiplier = autoMultiplier * 2;
    showMessage("You beat the Elite Four! EVERYTHING is doubled!");
    document.getElementById("trophyButton").classList.add("soldOut");
  } else {
    showMessage("You need 10 Gym Badges for the Elite Four Trophy!");
  }
  updateScreen();
}

document.getElementById("rareCandyButton").addEventListener("click", buyRareCandy);
document.getElementById("expShareButton").addEventListener("click", buyExpShare);
document.getElementById("trophyButton").addEventListener("click", buyTrophy);


// ================================================================
// PART 6: ACHIEVEMENTS (badge unlocks with if statements)
// ================================================================

function checkAchievements() {
  var totalTrainers = youngsterOwned + bugCatcherOwned + gymLeaderOwned;

  if (totalCaught >= 1) {
    document.getElementById("ach1").classList.add("unlocked");
  }
  if (totalCaught >= 100) {
    document.getElementById("ach2").classList.add("unlocked");
  }
  if (totalCaught >= 1000) {
    document.getElementById("ach3").classList.add("unlocked");
  }
  if (totalTrainers >= 5) {
    document.getElementById("ach4").classList.add("unlocked");
  }
  if (totalBadgesEver >= 8) {
    document.getElementById("ach5").classList.add("unlocked");
  }
  if (wonAGamble == true) {
    document.getElementById("ach6").classList.add("unlocked");
  }
}


// ================================================================
// PART 7: WILD ENCOUNTER (chance / gambling with Math.random)
// ================================================================

var wildNames = ["Pidgey", "Rattata", "Zubat", "Magikarp", "Caterpie"];
var rareNames = ["Dragonite", "Snorlax", "Charizard", "Gyarados", "Mewtwo"];

var wildName = "";
var rareName = "";

// This runs every 45 seconds
function startWildEncounter() {
  if (wildActive == true) {
    return;   // one at a time
  }

  wildActive = true;

  // pick random names from the lists
  var randomIndex1 = Math.floor(Math.random() * wildNames.length);
  var randomIndex2 = Math.floor(Math.random() * rareNames.length);
  wildName = wildNames[randomIndex1];
  rareName = rareNames[randomIndex2];

  // safe reward is bigger when you are further in the game
  wildSafeReward = 10 + (perSecond * 10) + (perClick * 5);

  // the gamble risks a quarter of what you have (minimum 5)
  wildWager = Math.floor(pokemon / 4);
  if (wildWager < 5) {
    wildWager = 5;
  }

  wildSecondsLeft = 15;

  // put the text on screen
  document.getElementById("wildText").textContent = "A wild " + wildName + " appeared! But you also see a " + rareName + " behind it...";
  document.getElementById("safeButton").textContent = "Catch " + wildName + " (get +" + wildSafeReward + ")";
  document.getElementById("gambleButton").textContent = "Chase " + rareName + " (risk " + wildWager + ", 50% chance to win " + (wildWager * 3) + ")";
  document.getElementById("wildTimer").textContent = wildSecondsLeft;

  // show the box, hide the "waiting" text
  document.getElementById("wildBox").classList.remove("hidden");
  document.getElementById("wildIdle").classList.add("hidden");
}

function takeSafeChoice() {
  if (wildActive == false) {
    return;
  }
  pokemon = pokemon + wildSafeReward;
  totalCaught = totalCaught + wildSafeReward;
  showMessage("You caught " + wildName + "! +" + wildSafeReward + " Pokemon");
  endWildEncounter();
  updateScreen();
}

function takeGamble() {
  if (wildActive == false) {
    return;
  }

  // you can't risk more than you have
  if (wildWager > pokemon) {
    wildWager = pokemon;
  }

  // Math.random() gives a number between 0 and 1, so < 0.5 is a 50% chance
  var roll = Math.random();
  if (roll < 0.5) {
    var winnings = wildWager * 3;
    pokemon = pokemon + winnings;
    totalCaught = totalCaught + winnings;
    wonAGamble = true;
    showMessage("YOU CAUGHT " + rareName + "! +" + winnings + " Pokemon!!!");
  } else {
    pokemon = pokemon - wildWager;
    showMessage(rareName + " got away and you lost " + wildWager + " Pokemon...");
  }

  endWildEncounter();
  updateScreen();
}

function endWildEncounter() {
  wildActive = false;
  document.getElementById("wildBox").classList.add("hidden");
  document.getElementById("wildIdle").classList.remove("hidden");
}

// counts down the timer once per second while a wild Pokemon is showing
function wildCountdown() {
  if (wildActive == true) {
    wildSecondsLeft = wildSecondsLeft - 1;
    document.getElementById("wildTimer").textContent = wildSecondsLeft;
    if (wildSecondsLeft <= 0) {
      showMessage("The wild " + wildName + " ran away...");
      endWildEncounter();
    }
  }
}

document.getElementById("safeButton").addEventListener("click", takeSafeChoice);
document.getElementById("gambleButton").addEventListener("click", takeGamble);

setInterval(startWildEncounter, 45000);   // 45 seconds
setInterval(wildCountdown, 1000);         // 1 second


// ================================================================
// PART 8: UPDATING THE SCREEN (DOM manipulation)
// ================================================================

function showMessage(text) {
  document.getElementById("message").textContent = text;
}

function updateScreen() {
  // main numbers
  document.getElementById("pokemonCount").textContent = Math.floor(pokemon);
  document.getElementById("totalCaught").textContent = Math.floor(totalCaught);
  document.getElementById("perClick").textContent = perClick * clickMultiplier;
  document.getElementById("perSecond").textContent = perSecond * autoMultiplier;
  document.getElementById("badgeCount").textContent = gymBadges;

  // Pokeball shop
  document.getElementById("greatBallCost").textContent = greatBallCost;
  document.getElementById("greatBallOwned").textContent = greatBallOwned;
  document.getElementById("ultraBallCost").textContent = ultraBallCost;
  document.getElementById("ultraBallOwned").textContent = ultraBallOwned;
  document.getElementById("masterBallCost").textContent = masterBallCost;
  document.getElementById("masterBallOwned").textContent = masterBallOwned;

  // trainer shop
  document.getElementById("youngsterCost").textContent = youngsterCost;
  document.getElementById("youngsterOwned").textContent = youngsterOwned;
  document.getElementById("bugCatcherCost").textContent = bugCatcherCost;
  document.getElementById("bugCatcherOwned").textContent = bugCatcherOwned;
  document.getElementById("gymLeaderCost").textContent = gymLeaderCost;
  document.getElementById("gymLeaderOwned").textContent = gymLeaderOwned;

  // every time the numbers change, see if a new achievement got unlocked
  checkAchievements();
}

// draw everything once when the page loads
updateScreen();

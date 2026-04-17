import { useEffect, useMemo, useRef, useState } from "react";

const TITLE_IMAGE = "/TFIL_Logo.png";

const BASE_TIME_MS = 2200;
const MIN_TIME_MS = 850;

const EXTRA_LIFE_COST = 8;
const FREEZE_COST = 6;

const START_LIVES = 3;
const SHOP_MESSAGE_DURATION = 1500;
const GAME_OVER_FLASH_MS = 350;

const STORAGE_KEYS = {
  highScore: "floor_is_lava_high_score",
  bestLevel: "floor_is_lava_best_level",
  bankCoins: "floor_is_lava_bank_coins",
  totalCoinsEarned: "floor_is_lava_total_coins_earned",
  upgrades: "floor_is_lava_upgrades",
  ownedThemes: "floor_is_lava_owned_themes",
  activeTheme: "floor_is_lava_active_theme",
};

const MIN_UPGRADE_LEVEL = 1;
const MAX_UPGRADE_LEVEL = 4;

const DEFAULT_UPGRADES = {
  life: 1,
  freeze: 1,
  timer: 1,
  coin: 1,
};

const UPGRADE_COSTS = {
  life: [20, 35, 55],
  freeze: [18, 30, 45],
  timer: [15, 28, 42],
  coin: [25, 40, 60],
};

const THEMES = {
  lava: {
    name: "Lava Classic",
    cost: 0,
    tile: "#5b6472",
    tileBorder: "#1f2937",
    lava: "#dc2626",
    lavaBorder: "#7f1d1d",
    exit: "#16a34a",
    exitBorder: "#86efac",
    coin: "#facc15",
    coinBorder: "#ca8a04",
    start: "#f97316",
    startBorder: "#fdba74",
    player: "#2563eb",
    playerBorder: "#93c5fd",
    playerGlow: "0 0 14px rgba(147,197,253,0.9)",
    adjacentGlow: "0 0 10px rgba(249,115,22,0.35)",
  },
  ice: {
    name: "Ice World",
    cost: 150,
    tile: "#a5f3fc",
    tileBorder: "#155e75",
    lava: "#0ea5e9",
    lavaBorder: "#164e63",
    exit: "#22c55e",
    exitBorder: "#bbf7d0",
    coin: "#fde68a",
    coinBorder: "#ca8a04",
    start: "#38bdf8",
    startBorder: "#e0f2fe",
    player: "#1d4ed8",
    playerBorder: "#dbeafe",
    playerGlow: "0 0 14px rgba(191,219,254,0.95)",
    adjacentGlow: "0 0 10px rgba(34,211,238,0.45)",
  },
  jungle: {
    name: "Jungle",
    cost: 200,
    tile: "#4d7c0f",
    tileBorder: "#365314",
    lava: "#b45309",
    lavaBorder: "#78350f",
    exit: "#16a34a",
    exitBorder: "#bbf7d0",
    coin: "#fde047",
    coinBorder: "#a16207",
    start: "#84cc16",
    startBorder: "#d9f99d",
    player: "#0f766e",
    playerBorder: "#99f6e4",
    playerGlow: "0 0 14px rgba(153,246,228,0.85)",
    adjacentGlow: "0 0 10px rgba(132,204,22,0.4)",
  },
  neon: {
    name: "Neon Grid",
    cost: 300,
    tile: "#111827",
    tileBorder: "#a21caf",
    lava: "#ff00aa",
    lavaBorder: "#f0abfc",
    exit: "#00ff88",
    exitBorder: "#bbf7d0",
    coin: "#ffff00",
    coinBorder: "#fde047",
    start: "#ff8800",
    startBorder: "#fdba74",
    player: "#00ccff",
    playerBorder: "#bae6fd",
    playerGlow: "0 0 16px rgba(0,204,255,0.95)",
    adjacentGlow: "0 0 12px rgba(255,0,170,0.5)",
  },
  dungeon: {
    name: "Dungeon Stone",
    cost: 250,
    tile: "#6b7280",
    tileBorder: "#374151",
    lava: "#991b1b",
    lavaBorder: "#fca5a5",
    exit: "#65a30d",
    exitBorder: "#d9f99d",
    coin: "#eab308",
    coinBorder: "#854d0e",
    start: "#9a3412",
    startBorder: "#fdba74",
    player: "#4338ca",
    playerBorder: "#c7d2fe",
    playerGlow: "0 0 14px rgba(199,210,254,0.85)",
    adjacentGlow: "0 0 10px rgba(234,179,8,0.35)",
  },
};

function getStoredThemes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ownedThemes);
    if (!raw) return ["lava"];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return ["lava"];
    const valid = parsed.filter((t) => THEMES[t]);
    return valid.includes("lava") ? valid : ["lava", ...valid];
  } catch {
    return ["lava"];
  }
}

function getStoredTheme() {
  const raw = localStorage.getItem(STORAGE_KEYS.activeTheme);
  return THEMES[raw] ? raw : "lava";
}

function keyOf(r, c) {
  return `${r}-${c}`;
}

function getGridSize(level) {
  if (level <= 2) return 3;
  if (level <= 4) return 4;
  if (level <= 7) return 5;
  if (level <= 10) return 6;
  return 7;
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function randomPos(size) {
  return { r: randomInt(size), c: randomInt(size) };
}

function positionsEqual(a, b) {
  return a.r === b.r && a.c === b.c;
}

function getStoredNumber(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampUpgradeLevel(value) {
  if (!Number.isFinite(value)) return MIN_UPGRADE_LEVEL;
  return Math.max(MIN_UPGRADE_LEVEL, Math.min(MAX_UPGRADE_LEVEL, Math.floor(value)));
}

function getStoredUpgrades() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.upgrades);
    if (!raw) return DEFAULT_UPGRADES;
    const parsed = JSON.parse(raw);

    return {
      life: clampUpgradeLevel(parsed.life),
      freeze: clampUpgradeLevel(parsed.freeze),
      timer: clampUpgradeLevel(parsed.timer),
      coin: clampUpgradeLevel(parsed.coin),
    };
  } catch {
    return DEFAULT_UPGRADES;
  }
}

function getLifeBonus(level) {
  return level;
}

function getFreezeBonus(level) {
  return level;
}

function getTimerBonusMs(level) {
  return level * 180;
}

function getCoinBonus(level) {
  return level;
}

function getMoveTime(level, upgrades) {
  return Math.max(MIN_TIME_MS, BASE_TIME_MS - (level - 1) * 120 + getTimerBonusMs(upgrades.timer));
}

function getStartingLives(upgrades) {
  return START_LIVES + getLifeBonus(upgrades.life);
}

function getStartingFreezeCharges(upgrades) {
  return getFreezeBonus(upgrades.freeze);
}

function getCoinsPerPickup(upgrades) {
  return 1 + getCoinBonus(upgrades.coin);
}

function getUpgradeCost(type, currentLevel) {
  if (currentLevel >= MAX_UPGRADE_LEVEL) return null;
  return UPGRADE_COSTS[type][currentLevel - MIN_UPGRADE_LEVEL] ?? null;
}

function generateCoins(size, start, exit, level) {
  const coinCount = Math.min(
    Math.max(2, Math.floor(size * size * 0.18) + Math.floor(level / 2)),
    Math.floor(size * size * 0.35)
  );

  const coins = new Set();

  while (coins.size < coinCount) {
    const pos = randomPos(size);
    const key = keyOf(pos.r, pos.c);

    if (key !== keyOf(start.r, start.c) && key !== keyOf(exit.r, exit.c)) {
      coins.add(key);
    }
  }

  return coins;
}

function generateLevel(level) {
  const size = getGridSize(level);
  const start = { r: 0, c: 0 };

  let exit = randomPos(size);
  while (positionsEqual(exit, start)) {
    exit = randomPos(size);
  }

  return {
    size,
    start,
    exit,
    coins: generateCoins(size, start, exit, level),
    lava: new Set(),
  };
}

export default function FloorIsLavaMobileGame() {
  const [phase, setPhase] = useState("menu");
  const [showInstructions, setShowInstructions] = useState(false);

  const [upgrades, setUpgrades] = useState(() => getStoredUpgrades());
  const [ownedThemes, setOwnedThemes] = useState(() => getStoredThemes());
  const [activeTheme, setActiveTheme] = useState(() => getStoredTheme());

  const [level, setLevel] = useState(1);
  const [levelData, setLevelData] = useState(() => generateLevel(1));
  const [player, setPlayer] = useState({ r: 0, c: 0 });

  const [score, setScore] = useState(0);
  const [bankCoins, setBankCoins] = useState(() =>
    getStoredNumber(STORAGE_KEYS.bankCoins, 0)
  );
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(() =>
    getStoredNumber(STORAGE_KEYS.totalCoinsEarned, 0)
  );
  const [runCoins, setRunCoins] = useState(0);
  const [lives, setLives] = useState(() => getStartingLives(getStoredUpgrades()));

  const [highScore, setHighScore] = useState(() =>
    getStoredNumber(STORAGE_KEYS.highScore, 0)
  );
  const [bestLevel, setBestLevel] = useState(() =>
    getStoredNumber(STORAGE_KEYS.bestLevel, 1)
  );

  const [timer, setTimer] = useState(BASE_TIME_MS);
  const [message, setMessage] = useState(
    "Reach the green exit before the floor drops away."
  );
  const [freezeCharges, setFreezeCharges] = useState(() =>
    getStartingFreezeCharges(getStoredUpgrades())
  );
  const [freezeActive, setFreezeActive] = useState(false);
  const [shopMessage, setShopMessage] = useState("");
  const [pendingRestart, setPendingRestart] = useState(false);
  const [flashGameOver, setFlashGameOver] = useState(false);

  const deathInProgressRef = useRef(false);

  const moveTime = useMemo(() => getMoveTime(level, upgrades), [level, upgrades]);
  const timerPercent = Math.max(0, Math.min(100, (timer / moveTime) * 100));
  const colors = THEMES[activeTheme] || THEMES.lava;

  function resetDeathGuard() {
    deathInProgressRef.current = false;
  }

  function loadLevel(targetLevel) {
    const next = generateLevel(targetLevel);
    setLevelData(next);
    setPlayer({ ...next.start });
    setRunCoins(0);
    setTimer(getMoveTime(targetLevel, upgrades));
    setFreezeActive(false);
    setShopMessage("");
    setMessage(`Level ${targetLevel}: move fast or fall.`);
    resetDeathGuard();
  }

  function startGame() {
    const first = generateLevel(1);

    setShowInstructions(false);
    setPhase("playing");
    setLevel(1);
    setLevelData(first);
    setPlayer({ ...first.start });

    setScore(0);
    setRunCoins(0);
    setLives(getStartingLives(upgrades));
    setFreezeCharges(getStartingFreezeCharges(upgrades));
    setFreezeActive(false);
    setShopMessage("");
    setPendingRestart(false);
    setFlashGameOver(false);

    setTimer(getMoveTime(1, upgrades));
    setMessage("Level 1: orange is start, green is exit.");
    resetDeathGuard();
  }

  function returnToMenu() {
    setPhase("menu");
    setShowInstructions(false);
    setShopMessage("");
    setPendingRestart(false);
    setFlashGameOver(false);
    setMessage("Reach the green exit before the floor drops away.");
    resetDeathGuard();
  }

  function quitGame() {
    setPhase("menu");
    setShowInstructions(false);
    setPendingRestart(false);
    setFlashGameOver(false);
    setShopMessage("");
    setFreezeActive(false);
    setRunCoins(0);
    setMessage("Game quit. Your coins, themes, and upgrades were saved.");
    resetDeathGuard();
  }

  function endGame() {
    setShopMessage("");
    setPendingRestart(false);
    setMessage("The lava got you.");
    setFlashGameOver(true);

    setTimeout(() => {
      setFlashGameOver(false);
      setPhase("gameover");
    }, GAME_OVER_FLASH_MS);
  }

  function loseLife(reasonText = "You fell into the lava.") {
    if (deathInProgressRef.current) return;
    deathInProgressRef.current = true;

    setLives((prev) => {
      const nextLives = prev - 1;

      if (nextLives <= 0) {
        endGame();
        return 0;
      }

      setPhase("lifeLost");
      setPendingRestart(true);
      setMessage(reasonText);
      return nextLives;
    });
  }

  function continueAfterLifeLost() {
    if (pendingRestart) {
      loadLevel(level);
      setPendingRestart(false);
    }

    setPhase("playing");
    setMessage(`Level ${level}: move fast or fall.`);
    resetDeathGuard();
  }

  function clearLevelWithCoinCount(clearedRunCoins) {
    const levelBonus = 25 + level * 10;
    const coinBonus = clearedRunCoins * 2;

    setScore((prev) => prev + levelBonus + coinBonus);

    const clearedLevel = level;
    if (clearedLevel > bestLevel) {
      setBestLevel(clearedLevel);
      localStorage.setItem(STORAGE_KEYS.bestLevel, String(clearedLevel));
    }

    setShopMessage("");
    setPendingRestart(false);
    setPhase("shop");
    setMessage(`Level ${level} clear. Visit the shop or continue.`);
    resetDeathGuard();
  }

  function movePlayer(dr, dc) {
    if (phase !== "playing") return;

    const nr = Math.max(0, Math.min(levelData.size - 1, player.r + dr));
    const nc = Math.max(0, Math.min(levelData.size - 1, player.c + dc));

    if (nr === player.r && nc === player.c) return;

    const targetKey = keyOf(nr, nc);
    if (levelData.lava.has(targetKey)) {
      setMessage("That tile is already lava.");
      return;
    }

    const currentKey = keyOf(player.r, player.c);
    const nextLava = new Set(levelData.lava);
    nextLava.add(currentKey);

    const nextCoins = new Set(levelData.coins);
    let gotCoin = false;
    let updatedRunCoins = runCoins;

    if (nextCoins.has(targetKey)) {
      nextCoins.delete(targetKey);
      gotCoin = true;
      updatedRunCoins = runCoins + getCoinsPerPickup(upgrades);
    }

    setLevelData((prev) => ({
      ...prev,
      lava: nextLava,
      coins: nextCoins,
    }));

    setPlayer({ r: nr, c: nc });
    setTimer(moveTime);
    setFreezeActive(false);

    if (gotCoin) {
      const pickupCoins = getCoinsPerPickup(upgrades);
      setRunCoins(updatedRunCoins);
      setBankCoins((prev) => prev + pickupCoins);
      setTotalCoinsEarned((prev) => prev + pickupCoins);
      setScore((prev) => prev + 12);
      setMessage(`Coin collected. +${pickupCoins} coin${pickupCoins > 1 ? "s" : ""}`);
    } else {
      setScore((prev) => prev + 2);
      setMessage("Keep moving.");
    }

    if (nr === levelData.exit.r && nc === levelData.exit.c) {
      clearLevelWithCoinCount(updatedRunCoins);
    }
  }

  function handleTileTap(r, c) {
    if (phase !== "playing") return;

    const dr = r - player.r;
    const dc = c - player.c;

    const isAdjacent =
      (Math.abs(dr) === 1 && dc === 0) ||
      (Math.abs(dc) === 1 && dr === 0);

    if (!isAdjacent) return;

    movePlayer(dr, dc);
  }

  function nextLevel() {
    const target = level + 1;
    setLevel(target);
    setPhase("playing");
    loadLevel(target);
    resetDeathGuard();
  }

  function buyLife() {
    if (bankCoins < EXTRA_LIFE_COST) return;
    setBankCoins((prev) => prev - EXTRA_LIFE_COST);
    setLives((prev) => prev + 1);
    setShopMessage("Extra life purchased!");
    setMessage("Extra life purchased.");
  }

  function buyFreeze() {
    if (bankCoins < FREEZE_COST) return;
    setBankCoins((prev) => prev - FREEZE_COST);
    setFreezeCharges((prev) => prev + 1);
    setShopMessage("Freeze charge purchased!");
    setMessage("Freeze charge purchased.");
  }

  function buyPermanentUpgrade(type) {
    const currentLevel = upgrades[type];
    if (currentLevel >= MAX_UPGRADE_LEVEL) return;

    const cost = getUpgradeCost(type, currentLevel);
    if (cost === null) return;
    if (bankCoins < cost) return;

    const nextUpgrades = {
      ...upgrades,
      [type]: currentLevel + 1,
    };

    setBankCoins((prev) => prev - cost);
    setUpgrades(nextUpgrades);

    if (type === "life") {
      setLives((prev) => prev + 1);
    }

    if (type === "freeze") {
      setFreezeCharges((prev) => prev + 1);
    }

    if (type === "timer") {
      setTimer((prev) => Math.min(getMoveTime(level, nextUpgrades), prev + 180));
    }

    setShopMessage("Permanent upgrade purchased!");
  }

  function buyOrEquipTheme(themeKey) {
    const theme = THEMES[themeKey];
    if (!theme) return;

    if (ownedThemes.includes(themeKey)) {
      setActiveTheme(themeKey);
      setShopMessage(`${theme.name} equipped!`);
      return;
    }

    if (bankCoins < theme.cost) return;

    setBankCoins((prev) => prev - theme.cost);
    setOwnedThemes((prev) => [...prev, themeKey]);
    setActiveTheme(themeKey);
    setShopMessage(`${theme.name} unlocked!`);
  }

  function useFreeze() {
    if (phase !== "playing") return;
    if (freezeCharges <= 0) {
      setMessage("No freeze charges left.");
      return;
    }
    if (freezeActive) {
      setMessage("Freeze already active.");
      return;
    }

    setFreezeCharges((prev) => prev - 1);
    setFreezeActive(true);
    setTimer((prev) => Math.min(moveTime, prev + 1200));
    setMessage("Timer extended.");
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.bankCoins, String(bankCoins));
  }, [bankCoins]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.totalCoinsEarned, String(totalCoinsEarned));
  }, [totalCoinsEarned]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.upgrades, JSON.stringify(upgrades));
  }, [upgrades]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ownedThemes, JSON.stringify(ownedThemes));
  }, [ownedThemes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.activeTheme, activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem(STORAGE_KEYS.highScore, String(score));
    }
  }, [score, highScore]);

  useEffect(() => {
    if (!shopMessage) return;
    const timeout = setTimeout(() => setShopMessage(""), SHOP_MESSAGE_DURATION);
    return () => clearTimeout(timeout);
  }, [shopMessage]);

  useEffect(() => {
    if (phase !== "playing") return;

    const tick = setInterval(() => {
      setTimer((prev) => {
        if (freezeActive) return prev;

        const next = prev - 100;
        if (next <= 0) {
          setTimeout(
            () => loseLife("The collapse timer ran out — you fell into the lava!"),
            0
          );
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(tick);
  }, [phase, freezeActive, level, upgrades]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (phase === "playing") {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") movePlayer(-1, 0);
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") movePlayer(1, 0);
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") movePlayer(0, -1);
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") movePlayer(0, 1);

        if (e.key === " " || e.code === "Space") {
          e.preventDefault();
          useFreeze();
        }
      }

      if (phase === "menu" && !showInstructions && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        startGame();
      }

      if (showInstructions && e.key === "Escape") {
        setShowInstructions(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, player, levelData, runCoins, freezeCharges, freezeActive, moveTime, showInstructions]);

  const tiles = [];
  for (let r = 0; r < levelData.size; r++) {
    for (let c = 0; c < levelData.size; c++) {
      const key = keyOf(r, c);
      const isPlayer = player.r === r && player.c === c;
      const isExit = levelData.exit.r === r && levelData.exit.c === c;
      const isStart = levelData.start.r === r && levelData.start.c === c;
      const isCoin = levelData.coins.has(key);
      const isLava = levelData.lava.has(key);

      const dr = r - player.r;
      const dc = c - player.c;
      const isAdjacent =
        (Math.abs(dr) === 1 && dc === 0) ||
        (Math.abs(dc) === 1 && dr === 0);
      const isTappable = phase === "playing" && isAdjacent && !isLava;

      let background = colors.tile;
      let content = "";
      let border = `2px solid ${colors.tileBorder}`;
      let boxShadow = "none";

      if (isLava) {
        background = colors.lava;
        content = "🔥";
        border = `2px solid ${colors.lavaBorder}`;
      } else if (isPlayer) {
        background = colors.player;
        content = "🧍";
        border = `2px solid ${colors.playerBorder}`;
        boxShadow = colors.playerGlow;
      } else if (isExit) {
        background = colors.exit;
        content = "↗";
        border = `2px solid ${colors.exitBorder}`;
      } else if (isCoin) {
        background = colors.coin;
        content = "🪙";
        border = `2px solid ${colors.coinBorder}`;
      } else if (isStart) {
        background = colors.start;
        content = "➜";
        border = `2px solid ${colors.startBorder}`;
      }

      if (isTappable) {
        boxShadow = colors.adjacentGlow;
      }

      tiles.push(
        <button
          key={key}
          onClick={() => handleTileTap(r, c)}
          disabled={phase !== "playing" || isLava}
          aria-label={`Tile ${r + 1}, ${c + 1}`}
          style={{
            aspectRatio: "1 / 1",
            width: "100%",
            borderRadius: 12,
            background,
            border,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: levelData.size >= 6 ? 18 : 24,
            fontWeight: "bold",
            boxSizing: "border-box",
            boxShadow,
            transition: "transform 0.08s ease, background 0.15s ease, box-shadow 0.15s ease",
            padding: 0,
            cursor: isTappable ? "pointer" : "default",
            touchAction: "manipulation",
            outline: "none",
            appearance: "none",
            WebkitAppearance: "none",
            color: isPlayer || isLava || isExit || isStart ? "#fff" : "#111",
          }}
        >
          {content}
        </button>
      );
    }
  }

  const shopMessageIsError = shopMessage === "Not enough coins!";

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg, #120909 0%, #2a1111 35%, #3f0d0d 65%, #1f2937 100%)",
        color: "#ffe8d6",
        padding: 12,
        fontFamily: "Arial, sans-serif",
        boxSizing: "border-box",
        overflowX: "hidden",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          maxWidth: 460,
          margin: "0 auto",
          minHeight: "calc(100dvh - 24px)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: phase === "menu" ? "center" : "flex-start",
        }}
      >
        {phase === "playing" ? (
          <>
            <div
              style={{
                background: "rgba(34,12,12,0.9)",
                border: "1px solid #7c2d12",
                borderRadius: 16,
                padding: 10,
                marginBottom: 12,
                boxShadow: "0 0 18px rgba(249,115,22,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#fec89a",
                  marginBottom: 4,
                }}
              >
                <span>Collapse timer</span>
                <span>{(timer / 1000).toFixed(1)}s</span>
              </div>

              <div
                style={{
                  width: "100%",
                  height: 12,
                  borderRadius: 999,
                  overflow: "hidden",
                  background: "#3f1d1d",
                  border: "1px solid #7c2d12",
                }}
              >
                <div
                  style={{
                    width: `${timerPercent}%`,
                    height: "100%",
                    background:
                      timerPercent > 60 ? "#f97316" : timerPercent > 30 ? "#f59e0b" : "#ef4444",
                    transition: "width 0.1s linear",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                background: "rgba(34,12,12,0.9)",
                border: "1px solid #7c2d12",
                borderRadius: 16,
                padding: 12,
                marginBottom: 12,
                position: "relative",
                boxShadow: "0 0 18px rgba(249,115,22,0.08)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 380,
                  margin: "0 auto",
                  display: "grid",
                  gridTemplateColumns: `repeat(${levelData.size}, minmax(0, 1fr))`,
                  gap: 6,
                }}
              >
                {tiles}
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "#fec89a",
                }}
              >
                <Legend swatch={colors.start} label="Start" icon="➜" />
                <Legend swatch={colors.exit} label="Exit" icon="↗" />
                <Legend swatch={colors.coin} label="Coin" icon="🪙" />
                <Legend swatch={colors.lava} label="Lava" icon="🔥" />
              </div>
            </div>

            <div
              style={{
                background: "rgba(18, 36, 54, 0.92)",
                border: "1px solid #67e8f9",
                borderRadius: 18,
                padding: 12,
                boxShadow: "0 0 18px rgba(103,232,249,0.2), inset 0 0 18px rgba(255,255,255,0.03)",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              <button style={freezeButtonStyle} onClick={useFreeze}>
                ❄ Freeze ({freezeCharges})
              </button>
            </div>
          </>
        ) : null}

        {phase === "menu" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 30,
              background: "#120909",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: 12,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div style={{ width: "100%", maxWidth: 460, margin: "0 auto" }}>
              <div
                style={{
                  borderRadius: 20,
                  overflow: "hidden",
                  background: "#000",
                  boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                  border: "1px solid #7c2d12",
                }}
              >
                <img
                  src={TITLE_IMAGE}
                  alt="The Floor Is Lava title screen"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "auto",
                    maxHeight: "48dvh",
                    objectFit: "contain",
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: 12,
                  background: "rgba(34,12,12,0.95)",
                  border: "1px solid #7c2d12",
                  borderRadius: 16,
                  padding: 12,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <button style={mainButtonStyle} onClick={startGame}>
                    Start Game
                  </button>
                  <button style={secondaryButtonStyle} onClick={() => setShowInstructions(true)}>
                    Instructions
                  </button>
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "#ffe8d6",
                    lineHeight: 1.5,
                    marginBottom: 12,
                  }}
                >
                  Dash across collapsing tiles, grab coins, and reach the exit before the floor drops into lava.
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <Stat label="High Score" value={highScore} />
                  <Stat label="Best Level" value={bestLevel} />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <Stat label="Bank Coins" value={bankCoins} />
                  <Stat label="Theme" value={THEMES[activeTheme].name} />
                </div>

                <div
                  style={{
                    background: "#1f1111",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 4,
                    fontSize: 13,
                    color: "#ffe8d6",
                    lineHeight: 1.45,
                    textAlign: "left",
                    border: "1px solid #5b1c1c",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      marginBottom: 6,
                      textAlign: "center",
                      color: "#ffd6a5",
                    }}
                  >
                    Theme Shop Added
                  </div>
                  <div>• Unlock new board color themes</div>
                  <div>• Equip owned themes anytime in the shop</div>
                  <div>• Shop buttons disable when you cannot afford them</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showInstructions && phase === "menu" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 40,
              background: "rgba(18,9,9,0.94)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 12,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 430,
                background: "rgba(34,12,12,0.98)",
                border: "1px solid #7c2d12",
                borderRadius: 18,
                padding: 16,
                boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
                margin: "auto 0",
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  marginBottom: 10,
                  textAlign: "center",
                  color: "#ffd6a5",
                  textShadow: "0 0 10px rgba(249,115,22,0.35)",
                }}
              >
                How to Play
              </div>

              <div
                style={{
                  background: "#1f1111",
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 14,
                  color: "#ffe8d6",
                  lineHeight: 1.55,
                  textAlign: "left",
                  border: "1px solid #5b1c1c",
                  marginBottom: 14,
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  1. Your goal is to <strong>reach the green exit</strong> before the floor gives way.
                </div>
                <div style={{ marginBottom: 8 }}>
                  2. Move by <strong>clicking an adjacent tile</strong> next to your character.
                </div>
                <div style={{ marginBottom: 8 }}>
                  3. Collect <strong>coins</strong> to buy <strong>Freeze charges</strong>, <strong>extra lives</strong>, <strong>permanent upgrades</strong>, and <strong>themes</strong>.
                </div>
                <div style={{ marginBottom: 8 }}>
                  4. Use <strong>Freeze</strong> when you need extra time and the collapse timer is getting low.
                </div>
                <div>
                  5. If the <strong>collapse timer runs out</strong>, you <strong>lose a life</strong> and fall into the lava.
                </div>
                <div>
                  6. If you run out of lives, it's <strong>game over</strong>! Good luck!
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <button style={secondaryButtonStyle} onClick={() => setShowInstructions(false)}>
                  Back
                </button>
                <button style={mainButtonStyle} onClick={startGame}>
                  Start Game
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === "shop" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 20,
              background: "rgba(18,9,9,0.78)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 12,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 430,
                background: "rgba(34,12,12,0.98)",
                border: "1px solid #7c2d12",
                borderRadius: 18,
                padding: 14,
                boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
                margin: "auto 0",
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  marginBottom: 8,
                  textAlign: "center",
                  color: "#ffd6a5",
                  textShadow: "0 0 10px rgba(249,115,22,0.35)",
                }}
              >
                Shop
              </div>

              <div
                style={{
                  textAlign: "center",
                  color: "#ffe8d6",
                  fontSize: 16,
                  fontWeight: "bold",
                  marginBottom: 8,
                }}
              >
                You made it to the next level!
              </div>

              <div
                style={{
                  textAlign: "center",
                  color: "#fec89a",
                  fontSize: 14,
                  marginBottom: 12,
                }}
              >
                Spend your coins now, then continue to the next level.
              </div>

              <div
                style={{
                  background: "linear-gradient(180deg, #facc15 0%, #ca8a04 100%)",
                  border: "2px solid #fde68a",
                  borderRadius: 16,
                  padding: 12,
                  marginBottom: 10,
                  textAlign: "center",
                  boxShadow: "0 0 18px rgba(250,204,21,0.28)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: "bold", color: "#5b2c00", marginBottom: 4 }}>
                  CURRENT BANK COINS
                </div>
                <div style={{ fontSize: 30, fontWeight: "bold", color: "#3b1d00" }}>
                  {bankCoins}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <Stat label="Level" value={level} />
                <Stat label="Score" value={score} />
                <Stat label="High" value={highScore} />
                <Stat label="Lives" value={lives} />
                <Stat label="Run Coins" value={runCoins} />
                <Stat label="Freeze" value={freezeCharges} />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <CoinStat label="Current Coins" value={bankCoins} />
                <CoinStat label="Total Coins Earned" value={totalCoinsEarned} />
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8, paddingBottom: 12,
                }}
              >
                <button style={secondaryButtonStyle} onClick={quitGame}>
                  Quit Game
                </button>
                <button style={mainButtonStyle} onClick={nextLevel}>
                  Next Level
                </button>
              </div>

              {shopMessage && (
                <div
                  style={{
                    background: shopMessageIsError ? "#7f1d1d" : "#14532d",
                    color: "#fff7ed",
                    borderRadius: 10,
                    padding: "10px 12px",
                    textAlign: "center",
                    fontWeight: "bold",
                    marginBottom: 12,
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  {shopMessage}
                </div>
              )}

              <div
                style={{
                  background: "#1f1111",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                  border: "1px solid #5b1c1c",
                }}
              >
                <div
                  style={{
                    fontWeight: "bold",
                    color: "#ffd6a5",
                    marginBottom: 8,
                    textAlign: "center",
                  }}
                >
                  Run Boosts
                </div>

                <ShopRow
                  title="Extra Life"
                  desc={`${EXTRA_LIFE_COST} coins`}
                  buttonText="Buy"
                  onClick={buyLife}
                  disabled={bankCoins < EXTRA_LIFE_COST}
                />

                <ShopRow
                  title="Freeze Charge"
                  desc={`${FREEZE_COST} coins`}
                  buttonText="Buy"
                  onClick={buyFreeze}
                  disabled={bankCoins < FREEZE_COST}
                />
              </div>

              <div
                style={{
                  background: "#1f1111",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                  border: "1px solid #5b1c1c",
                }}
              >
                <div
                  style={{
                    fontWeight: "bold",
                    color: "#ffd6a5",
                    marginBottom: 8,
                    textAlign: "center",
                  }}
                >
                  Permanent Upgrades
                </div>

                <UpgradeRow
                  title="Starting Lives"
                  desc={`Start each run with +${getLifeBonus(upgrades.life)} bonus life${getLifeBonus(upgrades.life) === 1 ? "" : "s"}`}
                  level={upgrades.life}
                  maxLevel={MAX_UPGRADE_LEVEL}
                  cost={getUpgradeCost("life", upgrades.life)}
                  onClick={() => buyPermanentUpgrade("life")}
                  disabled={
                    upgrades.life >= MAX_UPGRADE_LEVEL ||
                    bankCoins < (getUpgradeCost("life", upgrades.life) ?? Infinity)
                  }
                />

                <UpgradeRow
                  title="Starting Freeze"
                  desc={`Start each run with +${getFreezeBonus(upgrades.freeze)} freeze charge${getFreezeBonus(upgrades.freeze) === 1 ? "" : "s"}`}
                  level={upgrades.freeze}
                  maxLevel={MAX_UPGRADE_LEVEL}
                  cost={getUpgradeCost("freeze", upgrades.freeze)}
                  onClick={() => buyPermanentUpgrade("freeze")}
                  disabled={
                    upgrades.freeze >= MAX_UPGRADE_LEVEL ||
                    bankCoins < (getUpgradeCost("freeze", upgrades.freeze) ?? Infinity)
                  }
                />

                <UpgradeRow
                  title="Timer Boost"
                  desc={`Adds +${(getTimerBonusMs(upgrades.timer) / 1000).toFixed(2)}s to your move timer`}
                  level={upgrades.timer}
                  maxLevel={MAX_UPGRADE_LEVEL}
                  cost={getUpgradeCost("timer", upgrades.timer)}
                  onClick={() => buyPermanentUpgrade("timer")}
                  disabled={
                    upgrades.timer >= MAX_UPGRADE_LEVEL ||
                    bankCoins < (getUpgradeCost("timer", upgrades.timer) ?? Infinity)
                  }
                />

                <UpgradeRow
                  title="Coin Boost"
                  desc={`Each coin pickup gives +${getCoinsPerPickup(upgrades)} coins`}
                  level={upgrades.coin}
                  maxLevel={MAX_UPGRADE_LEVEL}
                  cost={getUpgradeCost("coin", upgrades.coin)}
                  onClick={() => buyPermanentUpgrade("coin")}
                  disabled={
                    upgrades.coin >= MAX_UPGRADE_LEVEL ||
                    bankCoins < (getUpgradeCost("coin", upgrades.coin) ?? Infinity)
                  }
                />
              </div>

              <div
                style={{
                  background: "#1f1111",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                  border: "1px solid #5b1c1c",
                }}
              >
                <div
                  style={{
                    fontWeight: "bold",
                    color: "#ffd6a5",
                    marginBottom: 8,
                    textAlign: "center",
                  }}
                >
                  Themes
                </div>

                {Object.entries(THEMES).map(([key, theme]) => (
                  <ThemeRow
                    key={key}
                    title={theme.name}
                    owned={ownedThemes.includes(key)}
                    active={activeTheme === key}
                    cost={theme.cost}
                    previewColor={theme.tile}
                    accentColor={theme.lava}
                    onClick={() => buyOrEquipTheme(key)}
                    disabled={!ownedThemes.includes(key) && bankCoins < theme.cost}
                  />
                ))}
              </div>
              
            </div>
          </div>
        )}

        {phase === "lifeLost" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 26,
              background: "rgba(18,9,9,0.88)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 12,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 420,
                background: "rgba(34,12,12,0.98)",
                border: "2px solid #ef4444",
                borderRadius: 18,
                padding: 16,
                textAlign: "center",
                boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                margin: "auto 0",
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  fontWeight: "bold",
                  color: "#ffb4a2",
                  marginBottom: 8,
                  textShadow: "0 0 10px rgba(239,68,68,0.35)",
                }}
              >
                You Fell!
              </div>

              <div style={{ color: "#ffe8d6", marginBottom: 10 }}>{message}</div>

              <div style={{ fontSize: 18, marginBottom: 14, color: "#ffd6a5" }}>
                Lives Remaining: <strong>{lives}</strong>
              </div>

              <button style={mainButtonStyle} onClick={continueAfterLifeLost}>
                Continue
              </button>
            </div>
          </div>
        )}

        {flashGameOver && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 27,
              background: "rgba(239,68,68,0.5)",
              boxShadow: "inset 0 0 120px rgba(255,0,0,0.45)",
              pointerEvents: "none",
            }}
          />
        )}

        {phase === "gameover" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 25,
              background: "rgba(18,9,9,0.82)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 12,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 420,
                background: "rgba(34,12,12,0.98)",
                border: "1px solid #b91c1c",
                borderRadius: 18,
                padding: 16,
                textAlign: "center",
                boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
                margin: "auto 0",
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: "bold",
                  marginBottom: 8,
                  color: "#ffb4a2",
                  textShadow: "0 0 12px rgba(239,68,68,0.35)",
                }}
              >
                Game Over
              </div>

              <div style={{ color: "#ffe8d6", marginBottom: 10 }}>{message}</div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <Stat label="Final Score" value={score} />
                <Stat label="High Score" value={highScore} />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <Stat label="Bank Coins" value={bankCoins} />
                <Stat label="Theme" value={THEMES[activeTheme].name} />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <button style={mainButtonStyle} onClick={returnToMenu}>
                  Main Menu
                </button>
                <button style={mainButtonStyle} onClick={startGame}>
                  Play Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div
      style={{
        background: "#1f1111",
        borderRadius: 12,
        padding: 8,
        textAlign: "center",
        border: "1px solid #5b1c1c",
      }}
    >
      <div style={{ fontSize: 11, color: "#fec89a", marginBottom: 2 }}>{label}</div>
      <div
        style={{
          fontSize: typeof value === "string" && value.length > 10 ? 14 : 20,
          fontWeight: "bold",
          color: "#ffe8d6",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function CoinStat({ label, value }) {
  return (
    <div
      style={{
        background: "#1f1111",
        borderRadius: 12,
        padding: 8,
        textAlign: "center",
        border: "1px solid #5b1c1c",
      }}
    >
      <div style={{ fontSize: 11, color: "#fec89a", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: "bold", color: "#ffe8d6" }}>{value}</div>
    </div>
  );
}

function ThemeRow({
  title,
  owned,
  active,
  cost,
  previewColor,
  accentColor,
  onClick,
  disabled = false,
}) {
  let buttonText = `Buy (${cost})`;
  if (owned) buttonText = active ? "Equipped" : "Equip";

  const finalDisabled = active || disabled;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 8,
        alignItems: "center",
        background: "#2a1717",
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
        border: active ? "1px solid #fde68a" : "1px solid #5b1c1c",
      }}
    >
      <div style={{ display: "flex", gap: 4 }}>
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 6,
            background: previewColor,
            border: "1px solid rgba(255,255,255,0.2)",
            display: "inline-block",
          }}
        />
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 6,
            background: accentColor,
            border: "1px solid rgba(255,255,255,0.2)",
            display: "inline-block",
          }}
        />
      </div>

      <div>
        <div style={{ fontWeight: "bold", color: "#ffe8d6" }}>{title}</div>
        <div style={{ fontSize: 12, color: active ? "#fde68a" : "#fec89a" }}>
          {active ? "Currently equipped" : owned ? "Unlocked" : "Locked"}
        </div>
      </div>

      <button
        style={{
          ...secondaryButtonStyle,
          minWidth: 92,
          opacity: finalDisabled ? 0.5 : 1,
          cursor: finalDisabled ? "not-allowed" : "pointer",
        }}
        onClick={onClick}
        disabled={finalDisabled}
      >
        {buttonText}
      </button>
    </div>
  );
}

function Legend({ swatch, label, icon }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "#1f1111",
        borderRadius: 999,
        padding: "6px 10px",
        border: "1px solid #5b1c1c",
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 6,
          background: swatch,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
        }}
      >
        {icon}
      </span>
      <span style={{ color: "#ffe8d6" }}>{label}</span>
    </div>
  );
}

function ShopRow({ title, desc, buttonText, onClick, disabled = false }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 8,
        alignItems: "center",
        background: "#2a1717",
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
        border: "1px solid #5b1c1c",
      }}
    >
      <div>
        <div style={{ fontWeight: "bold", color: "#ffe8d6" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#fec89a" }}>{desc}</div>
      </div>
      <button
        style={{
          ...secondaryButtonStyle,
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        onClick={onClick}
        disabled={disabled}
      >
        {buttonText}
      </button>
    </div>
  );
}

function UpgradeRow({
  title,
  desc,
  level,
  maxLevel,
  cost,
  onClick,
  disabled = false,
}) {
  const isMaxed = level >= maxLevel;
  const finalDisabled = isMaxed || disabled;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 8,
        alignItems: "center",
        background: "#2a1717",
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
        border: "1px solid #5b1c1c",
      }}
    >
      <div>
        <div style={{ fontWeight: "bold", color: "#ffe8d6" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#fec89a", marginBottom: 2 }}>{desc}</div>
        <div style={{ fontSize: 11, color: "#ffd6a5" }}>
          Level {level}/{maxLevel}
        </div>
      </div>

      <button
        style={{
          ...secondaryButtonStyle,
          opacity: finalDisabled ? 0.5 : 1,
          cursor: finalDisabled ? "not-allowed" : "pointer",
        }}
        onClick={onClick}
        disabled={finalDisabled}
      >
        {isMaxed ? "Max" : `Buy (${cost})`}
      </button>
    </div>
  );
}

const mainButtonStyle = {
  width: "100%",
  minHeight: 46,
  borderRadius: 12,
  border: "1px solid #fb923c",
  background: "linear-gradient(180deg, #f97316 0%, #dc2626 100%)",
  color: "#fff7ed",
  fontWeight: "bold",
  fontSize: 16,
  cursor: "pointer",
  boxShadow: "0 0 14px rgba(249,115,22,0.28)",
};

const secondaryButtonStyle = {
  minHeight: 42,
  borderRadius: 12,
  border: "1px solid #ea580c",
  background: "linear-gradient(180deg, #7c2d12 0%, #581c1c 100%)",
  color: "#fff7ed",
  fontWeight: "bold",
  fontSize: 16,
  padding: "0 14px",
  cursor: "pointer",
  boxShadow: "0 0 10px rgba(249,115,22,0.15)",
};

const freezeButtonStyle = {
  width: "100%",
  minHeight: 58,
  borderRadius: 16,
  border: "1px solid #67e8f9",
  background: "linear-gradient(180deg, #22d3ee 0%, #0ea5e9 45%, #155e75 100%)",
  color: "#ecfeff",
  fontWeight: "bold",
  fontSize: 20,
  cursor: "pointer",
  boxShadow: "0 0 18px rgba(103,232,249,0.35)",
  letterSpacing: 0.3,
};
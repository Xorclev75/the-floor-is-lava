import { useEffect, useMemo, useState } from "react";

const TITLE_IMAGE = "/TFIL_Logo.png";

const BASE_TIME_MS = 2200;
const MIN_TIME_MS = 850;
const EXTRA_LIFE_COST = 8;
const FREEZE_COST = 6;
const START_LIVES = 3;
const SHOP_MESSAGE_DURATION = 1500;
const GAME_OVER_FLASH_MS = 350;

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

function getMoveTime(level) {
  return Math.max(MIN_TIME_MS, BASE_TIME_MS - (level - 1) * 120);
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
  const [phase, setPhase] = useState("menu"); // menu | playing | shop | lifeLost | gameover
  const [level, setLevel] = useState(1);
  const [levelData, setLevelData] = useState(() => generateLevel(1));
  const [player, setPlayer] = useState({ r: 0, c: 0 });

  const [score, setScore] = useState(0);
  const [bankCoins, setBankCoins] = useState(0);
  const [runCoins, setRunCoins] = useState(0);
  const [lives, setLives] = useState(START_LIVES);

  const [highScore, setHighScore] = useState(() =>
    getStoredNumber("floor_is_lava_high_score", 0)
  );
  const [bestLevel, setBestLevel] = useState(() =>
    getStoredNumber("floor_is_lava_best_level", 1)
  );

  const [timer, setTimer] = useState(BASE_TIME_MS);
  const [message, setMessage] = useState(
    "Reach the green exit before the floor drops away."
  );
  const [freezeCharges, setFreezeCharges] = useState(0);
  const [freezeActive, setFreezeActive] = useState(false);
  const [shopMessage, setShopMessage] = useState("");
  const [pendingRestart, setPendingRestart] = useState(false);
  const [flashGameOver, setFlashGameOver] = useState(false);

  const moveTime = useMemo(() => getMoveTime(level), [level]);
  const timerPercent = Math.max(0, Math.min(100, (timer / moveTime) * 100));

  function loadLevel(targetLevel) {
    const next = generateLevel(targetLevel);
    setLevelData(next);
    setPlayer({ ...next.start });
    setRunCoins(0);
    setTimer(getMoveTime(targetLevel));
    setFreezeActive(false);
    setShopMessage("");
    setMessage(`Level ${targetLevel}: move fast or fall.`);
  }

  function startGame() {
    const first = generateLevel(1);

    setPhase("playing");
    setLevel(1);
    setLevelData(first);
    setPlayer({ ...first.start });

    setScore(0);
    setBankCoins(0);
    setRunCoins(0);
    setLives(START_LIVES);
    setFreezeCharges(0);
    setFreezeActive(false);
    setShopMessage("");
    setPendingRestart(false);
    setFlashGameOver(false);

    setTimer(getMoveTime(1));
    setMessage("Level 1: orange is start, green is exit.");
  }

  function returnToMenu() {
    setPhase("menu");
    setShopMessage("");
    setPendingRestart(false);
    setFlashGameOver(false);
    setMessage("Reach the green exit before the floor drops away.");
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
  }

  function clearLevelWithCoinCount(clearedRunCoins) {
    const levelBonus = 25 + level * 10;
    const coinBonus = clearedRunCoins * 2;

    setScore((prev) => prev + levelBonus + coinBonus);

    const clearedLevel = level;
    if (clearedLevel > bestLevel) {
      setBestLevel(clearedLevel);
      localStorage.setItem("floor_is_lava_best_level", String(clearedLevel));
    }

    setShopMessage("");
    setPendingRestart(false);
    setPhase("shop");
    setMessage(`Level ${level} clear. Visit the shop or continue.`);
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
      updatedRunCoins = runCoins + 1;
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
      setRunCoins(updatedRunCoins);
      setBankCoins((prev) => prev + 1);
      setScore((prev) => prev + 12);
      setMessage("Coin collected.");
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
  }

  function buyLife() {
    if (bankCoins < EXTRA_LIFE_COST) {
      setShopMessage("Not enough coins!");
      setMessage(`You need ${EXTRA_LIFE_COST} coins for an extra life.`);
      return;
    }

    setBankCoins((prev) => prev - EXTRA_LIFE_COST);
    setLives((prev) => prev + 1);
    setShopMessage("Extra life purchased!");
    setMessage("Extra life purchased.");
  }

  function buyFreeze() {
    if (bankCoins < FREEZE_COST) {
      setShopMessage("Not enough coins!");
      setMessage(`You need ${FREEZE_COST} coins for a freeze charge.`);
      return;
    }

    setBankCoins((prev) => prev - FREEZE_COST);
    setFreezeCharges((prev) => prev + 1);
    setShopMessage("Freeze charge purchased!");
    setMessage("Freeze charge purchased.");
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
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("floor_is_lava_high_score", String(score));
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
          setTimeout(() => loseLife("You stood too long on one tile."), 0);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(tick);
  }, [phase, freezeActive, level]);

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

      if (phase === "menu" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        startGame();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, player, levelData, runCoins, freezeCharges, freezeActive, moveTime]);

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

      let background = "#5b6472";
      let content = "";
      let border = "2px solid #1f2937";
      let boxShadow = "none";

      if (isLava) {
        background = "#dc2626";
        content = "🔥";
        border = "2px solid #7f1d1d";
      } else if (isPlayer) {
        background = "#2563eb";
        content = "🧍";
        border = "2px solid #93c5fd";
        boxShadow = "0 0 14px rgba(147,197,253,0.9)";
      } else if (isExit) {
        background = "#16a34a";
        content = "↗";
        border = "2px solid #86efac";
      } else if (isCoin) {
        background = "#facc15";
        content = "🪙";
        border = "2px solid #ca8a04";
      } else if (isStart) {
        background = "#f97316";
        content = "➜";
        border = "2px solid #fdba74";
      }

      if (isTappable) {
        boxShadow = "0 0 10px rgba(249,115,22,0.35)";
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
          }}
        >
          {content}
        </button>
      );
    }
  }

  const boardMaxWidth =
    levelData.size >= 7 ? 300 :
    levelData.size === 6 ? 308 :
    levelData.size === 5 ? 330 :
    350;

  const gridGap = levelData.size >= 6 ? 4 : 6;
  const shopMessageIsError = shopMessage === "Not enough coins!";

  return (
    <div
      style={{
        height: "100dvh",
        background: "linear-gradient(180deg, #120909 0%, #2a1111 35%, #3f0d0d 65%, #1f2937 100%)",
        color: "#ffe8d6",
        padding: 10,
        fontFamily: "Arial, sans-serif",
        boxSizing: "border-box",
        overflow: phase === "playing" ? "hidden" : "auto",
      }}
    >
      <div
        style={{
          maxWidth: 460,
          margin: "0 auto",
          height: "calc(100dvh - 20px)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: phase === "menu" ? "center" : "flex-start",
          overflow: "hidden",
        }}
      >
        {phase !== "menu" && (
          <>
            <div
              style={{
                background: "rgba(34,12,12,0.92)",
                border: "1px solid #7c2d12",
                borderRadius: 16,
                padding: 10,
                marginBottom: 8,
                boxShadow: "0 0 18px rgba(249,115,22,0.08)",
                flex: "0 0 auto",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <Stat label="Level" value={level} />
                <Stat label="Score" value={score} />
                <Stat label="High" value={highScore} />
                <Stat label="Lives" value={lives} />
                <Stat label="Coins" value={bankCoins} />
                <Stat label="Freeze" value={freezeCharges} />
              </div>

              <div style={{ marginBottom: 8 }}>
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
                        timerPercent > 60
                          ? "#f97316"
                          : timerPercent > 30
                          ? "#f59e0b"
                          : "#ef4444",
                      transition: "width 0.1s linear",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  background: "#1f1111",
                  borderRadius: 12,
                  padding: 8,
                  textAlign: "center",
                  color: "#ffe8d6",
                  minHeight: 38,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  border: "1px solid #5b1c1c",
                }}
              >
                {message}
              </div>
            </div>

            <div
              style={{
                background: "rgba(34,12,12,0.92)",
                border: "1px solid #7c2d12",
                borderRadius: 16,
                padding: 8,
                marginBottom: 8,
                boxShadow: "0 0 18px rgba(249,115,22,0.08)",
                flex: "1 1 auto",
                minHeight: 0,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  flex: "1 1 auto",
                  minHeight: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: boardMaxWidth,
                    margin: "0 auto",
                    display: "grid",
                    gridTemplateColumns: `repeat(${levelData.size}, minmax(0, 1fr))`,
                    gap: gridGap,
                  }}
                >
                  {tiles}
                </div>
              </div>

              <div
                style={{
                  flex: "0 0 auto",
                  marginTop: 8,
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 6,
                  fontSize: 11,
                  color: "#fec89a",
                }}
              >
                <Legend swatch="#f97316" label="Start" icon="➜" />
                <Legend swatch="#16a34a" label="Exit" icon="↗" />
                <Legend swatch="#facc15" label="Coin" icon="🪙" />
                <Legend swatch="#dc2626" label="Lava" icon="🔥" />
              </div>
            </div>

            {phase === "playing" && (
              <div
                style={{
                  background: "rgba(18, 36, 54, 0.94)",
                  border: "1px solid #67e8f9",
                  borderRadius: 18,
                  padding: 10,
                  boxShadow:
                    "0 0 18px rgba(103,232,249,0.2), inset 0 0 18px rgba(255,255,255,0.03)",
                  marginBottom: 0,
                  flex: "0 0 auto",
                  textAlign: "center",
                }}
              >
                <button
                  style={freezeButtonStyle}
                  onClick={useFreeze}
                  disabled={phase !== "playing"}
                >
                  ❄ Freeze ({freezeCharges})
                </button>

                <div
                  style={{
                    textAlign: "center",
                    color: "#bae6fd",
                    fontSize: 12,
                    marginTop: 8,
                  }}
                >
                  Tap an adjacent tile to move.
                </div>
              </div>
            )}
          </>
        )}

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
            <div
              style={{
                width: "100%",
                maxWidth: 460,
                margin: "0 auto",
              }}
            >
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
                <button style={{ ...mainButtonStyle, marginBottom: 12 }} onClick={startGame}>
                  Start Game
                </button>

                <div
                  style={{
                    fontSize: 13,
                    color: "#ffe8d6",
                    lineHeight: 1.5,
                    marginBottom: 12,
                  }}
                >
                  Dash across collapsing tiles, grab coins, and reach the exit before the
                  floor drops into lava.
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
                    How to Play
                  </div>
                  <div>• Orange tile = start</div>
                  <div>• Green tile = exit</div>
                  <div>• Yellow tiles hold coins</div>
                  <div>• Tap an adjacent tile to move</div>
                  <div>• Use Freeze when the timer gets tight</div>
                  <div>• Wait too long and you lose a life</div>
                </div>
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
                maxWidth: 420,
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
                  color: "#fec89a",
                  fontSize: 14,
                  marginBottom: 12,
                }}
              >
                Spend your coins now, then continue to the next level.
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

              <ShopRow
                title="Extra Life"
                desc={`${EXTRA_LIFE_COST} coins`}
                buttonText="Buy"
                onClick={buyLife}
              />

              <ShopRow
                title="Freeze Charge"
                desc={`${FREEZE_COST} coins`}
                buttonText="Buy"
                onClick={buyFreeze}
              />

              <div style={{ marginTop: 10 }}>
                <button style={mainButtonStyle} onClick={nextLevel}>
                  Next Level
                </button>
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

              <div
                style={{
                  fontSize: 18,
                  marginBottom: 14,
                  color: "#ffd6a5",
                }}
              >
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
                }}
              >
                <button style={secondaryButtonStyle} onClick={returnToMenu}>
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
      <div style={{ fontSize: 20, fontWeight: "bold", color: "#ffe8d6" }}>{value}</div>
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

function ShopRow({ title, desc, buttonText, onClick }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 8,
        alignItems: "center",
        background: "#1f1111",
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
      <button style={secondaryButtonStyle} onClick={onClick}>
        {buttonText}
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
  padding: "0 14px",
  cursor: "pointer",
  boxShadow: "0 0 10px rgba(249,115,22,0.15)",
};

const freezeButtonStyle = {
  width: "100%",
  minHeight: 56,
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
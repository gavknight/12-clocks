import type { Game } from "../../game/Game";
import { Scene } from "@babylonjs/core/scene";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";

// ── Constants ─────────────────────────────────────────────────────────────────
const ROOM_W           = 12;
const ROOM_D           = 12;
const ROOM_H           = 4;
const GROW_INTERVAL    = 1.3;
const MAX_ON_PLANT     = 6;
const GRAB_DIST        = 2.2;
const DROP_DIST        = 1.4;
const DAY_SECS         = 70;
const PRICE_BUDDY      = 1;
const PRICE_VACUUM     = 25;
const PRICE_STARORB    = 45;
const PRICE_AUTODROP   = 2_000;
const PRICE_HAMMER     = 10_000;
const PRICE_BLITS      = 50_000;
const PRICE_FOUNTAIN   = 75_000;
const PRICE_GOLDEN     = 150_000_000;
const GOLDEN_MULT      = 50;
const BLITS_MULT       = 105;
const BLITS_DURATION   = 10;
const ABILITY_COOLDOWN = 600;

export class BerryBurryBerry {
  constructor(game: Game) {
    const scene = new Scene(game.engine);

    // ── Camera ─────────────────────────────────────────────────────────────
    const canvas = game.engine.getRenderingCanvas()!;
    const camera = new UniversalCamera("cam", new Vector3(0, 1.7, -2), scene);
    camera.setTarget(new Vector3(0, 1.7, 1));
    camera.minZ               = 0.1;
    camera.speed              = 0.15;
    camera.angularSensibility = 800;
    camera.keysUp    = [87];
    camera.keysDown  = [83];
    camera.keysLeft  = [65];
    camera.keysRight = [68];
    camera.attachControl(canvas, true);

    scene.registerBeforeRender(() => { camera.position.y = 1.7; });
    canvas.addEventListener("click", () => { if (!isBedtime) canvas.requestPointerLock(); });

    // ── Light ──────────────────────────────────────────────────────────────
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    light.intensity = 1.0;
    light.diffuse   = new Color3(1, 0.95, 0.85);

    // ── Materials ──────────────────────────────────────────────────────────
    const mkMat = (name: string, r: number, g: number, b: number) => {
      const m = new StandardMaterial(name, scene);
      m.diffuseColor = new Color3(r, g, b);
      return m;
    };
    const cardMat   = mkMat("card",   0.78, 0.60, 0.36);
    const cardDmg1  = mkMat("cdmg1",  0.55, 0.40, 0.20);
    const cardDmg2  = mkMat("cdmg2",  0.35, 0.25, 0.12);
    const skyMat    = mkMat("sky",    0.45, 0.68, 0.90);
    const grassMat  = mkMat("grass",  0.35, 0.58, 0.28);
    const plantMat  = mkMat("plant",  0.18, 0.65, 0.22);
    const berryMat  = mkMat("berry",  0.85, 0.10, 0.28);
    const goldenMat = mkMat("golden", 1.00, 0.80, 0.00);
    const holeMat   = mkMat("hole",   0.04, 0.04, 0.04);
    const vacMat    = mkMat("vac",    0.20, 0.20, 0.80);
    const orbMat    = mkMat("orb",    1.00, 0.85, 0.10);
    const fountMat  = mkMat("fount",  0.20, 0.80, 1.00);
    const buddyMat  = mkMat("buddy",  0.10, 0.80, 0.40);
    const hamMat    = mkMat("ham",    0.55, 0.55, 0.60);
    const bedMat    = mkMat("bed",    0.60, 0.30, 0.20);
    skyMat.backFaceCulling = false;

    // ── Room ───────────────────────────────────────────────────────────────
    const ground = MeshBuilder.CreateGround("ground", { width: ROOM_W, height: ROOM_D }, scene);
    ground.material       = grassMat;
    ground.checkCollisions = true;

    const ceiling = MeshBuilder.CreatePlane("ceil", { width: ROOM_W, height: ROOM_D }, scene);
    ceiling.position.y = ROOM_H;
    ceiling.rotation.x = Math.PI / 2;
    ceiling.material   = skyMat;

    const T = 0.3;
    const walls: Mesh[] = [];
    const makeWall = (x: number, z: number, w: number, d: number, mat: StandardMaterial) => {
      const wall = MeshBuilder.CreateBox("wall", { width: w, height: ROOM_H, depth: d }, scene) as Mesh;
      wall.position.set(x, ROOM_H / 2, z);
      wall.material        = mat;
      wall.checkCollisions = true;
      return wall;
    };
    walls.push(makeWall(0,            ROOM_D / 2, ROOM_W, T, cardMat));
    walls.push(makeWall(0,           -ROOM_D / 2, ROOM_W, T, cardMat));
    walls.push(makeWall( ROOM_W / 2,  0,          T, ROOM_D, cardMat));
    walls.push(makeWall(-ROOM_W / 2,  0,          T, ROOM_D, cardMat));

    // ── Berry plant ────────────────────────────────────────────────────────
    const plantBase = MeshBuilder.CreateCylinder("pb", { height: 1.4, diameter: 0.5 }, scene) as Mesh;
    plantBase.position.set(3.5, 0.7, 3.5);
    plantBase.material = plantMat;

    const plantTop = MeshBuilder.CreateSphere("pt", { diameter: 1.1 }, scene) as Mesh;
    plantTop.position.set(3.5, 1.7, 3.5);
    plantTop.material = plantMat;

    // ── Hole ───────────────────────────────────────────────────────────────
    const hole = MeshBuilder.CreateDisc("hole", { radius: 0.45, tessellation: 32 }, scene) as Mesh;
    hole.position.set(-3.5, 0.02, -3.5);
    hole.rotation.x = Math.PI / 2;
    hole.material   = holeMat;

    // ── Bed ────────────────────────────────────────────────────────────────
    const bed = MeshBuilder.CreateBox("bed", { width: 1.2, height: 0.4, depth: 2.0 }, scene) as Mesh;
    bed.position.set(-3.0, 0.2, 3.0);
    bed.material = bedMat;
    const pillow = MeshBuilder.CreateBox("pillow", { width: 1.0, height: 0.15, depth: 0.5 }, scene) as Mesh;
    pillow.position.set(-3.0, 0.45, 2.2);
    pillow.material = mkMat("pillow", 0.95, 0.92, 0.88);

    // ── Vacuum ─────────────────────────────────────────────────────────────
    let vacMesh: Mesh | null = null;
    let vacBerries = 0;

    const placeVacuum = () => {
      if (vacMesh) return;
      vacMesh = MeshBuilder.CreateCylinder("vac", { height: 1.0, diameter: 0.6 }, scene) as Mesh;
      vacMesh.position.set(2.0, 0.5, 2.0);
      vacMesh.material = vacMat;
    };

    // ── Star Orb Generator ─────────────────────────────────────────────────
    let hasStarOrbGenerator = false;
    let starOrbsCollected   = 0;
    let orbUpgradeUnlocked  = false;
    const starOrbs: Mesh[]  = [];

    const spawnStarOrb = () => {
      const orb = MeshBuilder.CreateSphere(`orb${starOrbs.length}`, { diameter: 0.45 }, scene) as Mesh;
      orb.position.set(Math.random() * 8 - 4, 0.8, Math.random() * 8 - 4);
      orb.material = orbMat;
      starOrbs.push(orb);
      showToast("⭐ A Star Orb appeared!");
    };

    // ── Hammer ─────────────────────────────────────────────────────────────
    let hasHammer      = false;
    let hammerEquipped = false;
    let hammerMesh: Mesh | null = null;
    const wallHits     = [0, 0, 0, 0];

    const placeHammer = () => {
      hasHammer  = true;
      hammerMesh = MeshBuilder.CreateBox("hammer", { width: 0.2, height: 1.0, depth: 0.2 }, scene) as Mesh;
      hammerMesh.position.set(0, 0.5, 0);
      hammerMesh.material = hamMat;
    };

    const throwHammer = () => {
      if (!hammerEquipped) return;
      const fwd = camera.getForwardRay(5);
      let hitWall = -1, minDist = 5;
      walls.forEach((w, i) => {
        const d = w.position.subtract(fwd.origin).length();
        if (d < minDist) { minDist = d; hitWall = i; }
      });
      if (hitWall >= 0 && minDist < 5) {
        wallHits[hitWall]++;
        const hits = wallHits[hitWall];
        if (hits === 1) walls[hitWall].material = cardDmg1;
        if (hits === 2) walls[hitWall].material = cardDmg2;
        if (hits >= 3) { wallHits[hitWall] = 0; walls[hitWall].material = cardMat; showToast("💥 Broke through! Stronger cardboard layer!"); }
      }
      hammerEquipped = false;
      updateHUD();
      showToast("🔨 Hammer thrown!");
    };

    // ── Berry Buddies ───────────────────────────────────────────────────────
    const buddies: Mesh[] = [];
    let buddyTimer        = 0;
    const BUDDY_INTERVAL  = 2.5;

    const addBuddy = () => {
      const angle = buddies.length * 1.2;
      const b = MeshBuilder.CreateSphere(`buddy${buddies.length}`, { diameter: 0.4 }, scene) as Mesh;
      b.position.set(
        plantBase.position.x + Math.cos(angle) * 1.5,
        0.2,
        plantBase.position.z + Math.sin(angle) * 1.5,
      );
      b.material = buddyMat;
      buddies.push(b);
    };

    // ── Golden Berry ────────────────────────────────────────────────────────
    let goldenBerryChance   = 0;
    let hasGoldenChance     = false;
    const goldenBerries     = new Set<Mesh>();
    let berriesInHandGolden = 0;

    // ── Abilities ──────────────────────────────────────────────────────────
    let hasBlits      = false;
    let blitsCooldown = 0;
    let blitsActive   = false;
    let blitsTimer    = 0;

    let hasFountain      = false;
    let fountainCooldown = 0;
    let fbCounter        = 0;

    type FountainBerry = { mesh: Mesh; isGolden: boolean; life: number };
    const fountainBerries: FountainBerry[] = [];

    const fmtCd = (s: number) => s > 60 ? `${Math.ceil(s / 60)}m` : `${Math.ceil(s)}s`;

    const activateBlits = () => {
      if (!hasBlits)           { showToast("⚡ Berry Blits not unlocked!"); return; }
      if (blitsActive)         { showToast("⚡ Berry Blits already active!"); return; }
      if (blitsCooldown > 0)   { showToast(`⚡ Berry Blits on cooldown: ${fmtCd(blitsCooldown)}`); return; }
      blitsActive   = true;
      blitsTimer    = BLITS_DURATION;
      blitsCooldown = ABILITY_COOLDOWN;
      showToast(`⚡ BERRY BLITS! ${BLITS_MULT}x multiplier for ${BLITS_DURATION}s!`);
      updateHUD();
    };

    const activateFountain = () => {
      if (!hasFountain)          { showToast("💧 Berry Fountain not unlocked!"); return; }
      if (fountainCooldown > 0)  { showToast(`💧 Berry Fountain on cooldown: ${fmtCd(fountainCooldown)}`); return; }
      fountainCooldown = ABILITY_COOLDOWN;
      for (let i = 0; i < 20; i++) {
        const isG = goldenBerryChance > 0 && Math.random() < goldenBerryChance;
        const fb  = MeshBuilder.CreateSphere(`fb${fbCounter++}`, { diameter: 0.18 }, scene) as Mesh;
        fb.position.set(Math.random() * 8 - 4, 0.8 + Math.random() * 1.5, Math.random() * 8 - 4);
        fb.material = isG ? goldenMat : fountMat;
        fountainBerries.push({ mesh: fb, isGolden: isG, life: 60 });
      }
      showToast("💧 BERRY FOUNTAIN! 20 berries spawned!");
      updateHUD();
    };

    // ── Auto Drop ──────────────────────────────────────────────────────────
    let hasAutoDrop = false;

    // ── Game state ─────────────────────────────────────────────────────────
    let dollars       = 0;
    let totalEarned   = 0;
    let day           = 1;
    let berriesOnPlant = 0;
    let berriesInHand  = 0;
    let growTimer      = 0;
    let dayTimer       = DAY_SECS;
    let isBedtime      = false;
    const berryMeshes: Mesh[] = [];

    const spawnBerry = (parentPos = plantTop.position) => {
      if (berriesOnPlant >= MAX_ON_PLANT) return;
      berriesOnPlant++;
      const angle    = Math.random() * Math.PI * 2;
      const r        = 0.2 + Math.random() * 0.25;
      const isGolden = goldenBerryChance > 0 && Math.random() < goldenBerryChance;
      const b        = MeshBuilder.CreateSphere(`berry${berryMeshes.length}`, { diameter: isGolden ? 0.18 : 0.13 }, scene) as Mesh;
      b.position.set(
        parentPos.x + Math.cos(angle) * r,
        parentPos.y - 0.1 + Math.random() * 0.3,
        parentPos.z + Math.sin(angle) * r,
      );
      b.material = isGolden ? goldenMat : berryMat;
      if (isGolden) goldenBerries.add(b);
      berryMeshes.push(b);
    };

    const dropBerry = (isGolden = false) => {
      const base   = isGolden ? GOLDEN_MULT : 1;
      const mult   = blitsActive ? BLITS_MULT : 1;
      const earned = base * mult;
      dollars     += earned;
      totalEarned += earned;
      if (hasStarOrbGenerator && Math.random() < 200 / 9000) spawnStarOrb();
      updateHUD();
    };

    // ── Toast ──────────────────────────────────────────────────────────────
    let toastTimeout = 0;
    const showToast = (msg: string) => {
      const el = document.getElementById("bbbToast");
      if (!el) return;
      el.textContent = msg;
      el.style.opacity = "1";
      clearTimeout(toastTimeout);
      toastTimeout = window.setTimeout(() => { el.style.opacity = "0"; }, 2200);
    };

    // ── HUD ────────────────────────────────────────────────────────────────
    const updateHUD = () => {
      const set = (id: string, v: string) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      set("bbbDollars", `$${dollars.toLocaleString()}`);
      set("bbbHand",    berriesInHandGolden > 0 ? `${berriesInHand} (${berriesInHandGolden}🌟)` : String(berriesInHand));
      set("bbbPlant",   String(berriesOnPlant));
      set("bbbDay",     `Day ${day}`);
      set("bbbTimer",   Math.ceil(dayTimer) + "s");
      set("bbbHammer",  hammerEquipped ? "🔨 READY" : hasHammer ? "🔨 [F] equip" : "");
      set("bbbVac",     vacBerries > 0 ? `🌀 ${vacBerries} stored` : "");
      set("bbbBlits",   !hasBlits ? "" :
        blitsActive       ? `⚡ BLITS ${Math.ceil(blitsTimer)}s` :
        blitsCooldown > 0 ? `⚡ [G] ${fmtCd(blitsCooldown)}` : "⚡ [G] READY");
      set("bbbFount",   !hasFountain ? "" :
        fountainCooldown > 0 ? `💧 [H] ${fmtCd(fountainCooldown)}` : "💧 [H] READY");
    };

    // ── Shop ───────────────────────────────────────────────────────────────
    const openShop = () => {
      isBedtime = true;
      camera.detachControl();

      const stars = Array.from({ length: 50 }, () => ({
        x: Math.random() * 100, y: Math.random() * 100,
        size: 18 + Math.random() * 22, speed: 0.02 + Math.random() * 0.04,
        lit: Math.random() > 0.5,
      }));

      const starHTML = stars.map((s, i) =>
        `<div id="star${i}" style="position:absolute;left:${s.x}%;top:${s.y}%;font-size:${s.size}px;
          opacity:${s.lit ? 1 : 0.35};transition:all 0.5s;color:#FFD700;user-select:none;">⭐</div>`
      ).join("");

      const btn = (id: string, label: string, price: number, owned: boolean) => `
        <button id="${id}" style="
          background:${owned ? "rgba(0,180,0,0.3)" : "rgba(255,255,255,0.12)"};
          color:white;font-size:13px;font-weight:bold;padding:9px 14px;
          border-radius:14px;border:2px solid ${owned ? "rgba(0,255,0,0.5)" : "rgba(255,255,255,0.25)"};
          cursor:pointer;font-family:'Courier New',monospace;width:100%;text-align:left;pointer-events:all;">
          ${label} ${owned ? "✓ OWNED" : `— $${price.toLocaleString()}`}
        </button>`;

      document.getElementById("bbbShop")!.innerHTML = `
        <div style="position:fixed;inset:0;background:#1a00aa;z-index:50;overflow:hidden;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          font-family:'Courier New',monospace;">
          ${starHTML}
          <div style="position:relative;z-index:2;text-align:center;width:100%;max-width:460px;padding:16px;">
            <div style="font-size:52px;font-weight:900;color:white;letter-spacing:4px;
              text-shadow:0 0 30px rgba(255,200,0,0.8);margin-bottom:4px;">SHOP II</div>
            <div style="color:rgba(255,255,255,0.5);font-size:13px;margin-bottom:12px;">
              Day ${day} — Buy upgrades or wake up
            </div>
            <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:14px;max-height:52vh;overflow-y:auto;">
              ${btn("shopBuddy",  "🌱 Berry Buddy (auto-grows berries)",                     PRICE_BUDDY,    buddies.length > 0 && !orbUpgradeUnlocked)}
              ${btn("shopVacuum", "🌀 Vacuum (auto-collects, click to fire)",                PRICE_VACUUM,   vacMesh !== null)}
              ${btn("shopOrb",    "⭐ Star Orb Generator",                                   PRICE_STARORB,  hasStarOrbGenerator)}
              ${btn("shopAuto",   "🔁 Auto Drop (auto-drops berries near hole)",             PRICE_AUTODROP, hasAutoDrop)}
              ${btn("shopHammer", "🔨 Sledge Hammer [F] (WARNING: DO NOT THROW)",           PRICE_HAMMER,   hasHammer)}
              ${btn("shopBlits",  `⚡ Berry Blits [G] (${BLITS_MULT}x · 10min cooldown)`,   PRICE_BLITS,    hasBlits)}
              ${btn("shopFount",  "💧 Berry Fountain [H] (20 berries · 10min cooldown)",     PRICE_FOUNTAIN, hasFountain)}
              ${btn("shopGolden", `🌟 Golden Berry Chance (${GOLDEN_MULT}x value · 10% rate)`, PRICE_GOLDEN, hasGoldenChance)}
            </div>
            <div style="color:rgba(255,255,255,0.6);font-size:13px;margin-bottom:14px;">
              💵 Balance: <b style="color:#FFD700;">$${dollars.toLocaleString()}</b>
              &nbsp;&nbsp;📊 All-time: <b style="color:#aaffaa;">$${totalEarned.toLocaleString()}</b>
            </div>
            <button id="shopWakeUp" style="
              background:white;color:#aa00ff;font-size:22px;font-weight:900;
              padding:14px 48px;border-radius:50px;border:none;cursor:pointer;
              font-family:'Courier New',monospace;letter-spacing:2px;
              box-shadow:0 0 30px rgba(255,255,255,0.4);pointer-events:all;">
              WAKE UP &gt;&gt;
            </button>
          </div>
        </div>
      `;

      let shopAnim = 0;
      const animStars = () => {
        if (!isBedtime) return;
        stars.forEach((s, i) => {
          s.y = (s.y - s.speed + 100) % 100;
          const el = document.getElementById(`star${i}`);
          if (el) el.style.top = s.y + "%";
        });
        shopAnim = requestAnimationFrame(animStars);
      };
      animStars();

      const tryBuy = (price: number, onBuy: () => void) => {
        if (dollars >= price) { dollars -= price; onBuy(); updateHUD(); openShop(); }
        else showToast(`❌ Need $${price.toLocaleString()}`);
      };

      document.getElementById("shopBuddy")!.onclick = () => {
        if (buddies.length > 0 && !orbUpgradeUnlocked) { showToast("Already have a buddy! Collect 3 Star Orbs to upgrade."); return; }
        tryBuy(PRICE_BUDDY, () => { closeShop(); addBuddy(); showToast("🌱 Berry Buddy joined your yard!"); });
      };
      document.getElementById("shopVacuum")!.onclick = () => {
        if (vacMesh) { showToast("Already have a vacuum!"); return; }
        tryBuy(PRICE_VACUUM, () => { closeShop(); placeVacuum(); showToast("🌀 Vacuum placed! Auto-collects berries. Click to fire!"); });
      };
      document.getElementById("shopOrb")!.onclick = () => {
        if (hasStarOrbGenerator) { showToast("Already have a Star Orb Generator!"); return; }
        tryBuy(PRICE_STARORB, () => { closeShop(); hasStarOrbGenerator = true; showToast("⭐ Star Orb Generator active! Drop berries to get lucky."); });
      };
      document.getElementById("shopAuto")!.onclick = () => {
        if (hasAutoDrop) { showToast("Already have Auto Drop!"); return; }
        tryBuy(PRICE_AUTODROP, () => { closeShop(); hasAutoDrop = true; showToast("🔁 Auto Drop active! Walk near hole with berries to auto-sell!"); });
      };
      document.getElementById("shopHammer")!.onclick = () => {
        if (hasHammer) { showToast("Already have a hammer!"); return; }
        tryBuy(PRICE_HAMMER, () => { closeShop(); placeHammer(); showToast("🔨 Sledge Hammer placed! Press F to equip."); });
      };
      document.getElementById("shopBlits")!.onclick = () => {
        if (hasBlits) { showToast("Already have Berry Blits!"); return; }
        tryBuy(PRICE_BLITS, () => { closeShop(); hasBlits = true; showToast(`⚡ Berry Blits unlocked! Press G → ${BLITS_MULT}x for ${BLITS_DURATION}s!`); });
      };
      document.getElementById("shopFount")!.onclick = () => {
        if (hasFountain) { showToast("Already have Berry Fountain!"); return; }
        tryBuy(PRICE_FOUNTAIN, () => { closeShop(); hasFountain = true; showToast("💧 Berry Fountain unlocked! Press H to spawn 20 berries!"); });
      };
      document.getElementById("shopGolden")!.onclick = () => {
        if (hasGoldenChance) { showToast("Already have Golden Berry Chance!"); return; }
        tryBuy(PRICE_GOLDEN, () => {
          closeShop();
          hasGoldenChance   = true;
          goldenBerryChance = 0.10;
          showToast(`🌟 Golden Berry Chance! 10% berries are now GOLDEN (${GOLDEN_MULT}x value)!`);
        });
      };
      document.getElementById("shopWakeUp")!.onclick = () => { cancelAnimationFrame(shopAnim); closeShop(); };
    };

    const closeShop = () => {
      isBedtime = false;
      dayTimer  = DAY_SECS;
      day++;
      document.getElementById("bbbShop")!.innerHTML = "";
      camera.attachControl(game.engine.getRenderingCanvas()!, true);
      updateHUD();
    };

    // ── Main UI ────────────────────────────────────────────────────────────
    game.ui.innerHTML = `
      <div style="position:fixed;top:14px;left:50%;transform:translateX(-50%);
        background:rgba(0,0,0,0.55);border-radius:14px;padding:8px 22px;
        color:white;font-family:Arial,sans-serif;font-size:14px;
        pointer-events:none;display:flex;gap:14px;align-items:center;white-space:nowrap;">
        <span>💵 <b id="bbbDollars">$0</b></span>
        <span>🍓 <b id="bbbHand">0</b></span>
        <span>🌱 <b id="bbbPlant">0</b></span>
        <span id="bbbHammer" style="color:#FFD700;"></span>
        <span id="bbbVac"    style="color:#88aaff;"></span>
        <span id="bbbBlits"  style="color:#ffff44;"></span>
        <span id="bbbFount"  style="color:#44ddff;"></span>
      </div>

      <div style="position:fixed;top:14px;right:14px;
        background:rgba(0,0,0,0.55);border-radius:14px;padding:8px 16px;
        color:white;font-family:Arial,sans-serif;font-size:14px;pointer-events:none;">
        <span id="bbbDay">Day 1</span> &nbsp;⏱ <span id="bbbTimer">${DAY_SECS}s</span>
      </div>

      <div id="bbbPrompt" style="display:none;position:fixed;top:58%;left:50%;
        transform:translateX(-50%);color:white;font-size:16px;font-weight:bold;
        font-family:Arial,sans-serif;pointer-events:none;
        text-shadow:0 2px 6px rgba(0,0,0,0.9);background:rgba(0,0,0,0.45);
        border-radius:10px;padding:6px 18px;"></div>

      <div id="bbbToast" style="position:fixed;top:48%;left:50%;transform:translateX(-50%);
        color:#FFD700;font-size:18px;font-weight:bold;font-family:Arial,sans-serif;
        pointer-events:none;opacity:0;transition:opacity 0.3s;
        text-shadow:0 2px 8px rgba(0,0,0,1);"></div>

      <div style="position:fixed;bottom:18px;left:50%;transform:translateX(-50%);
        color:rgba(255,255,255,0.45);font-size:11px;font-family:Arial,sans-serif;
        pointer-events:none;text-align:center;">
        WASD · Mouse look · [E] grab/collect · [Click] drop/fire · [F] hammer · [G] Berry Blits · [H] Berry Fountain
      </div>

      <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
        color:rgba(255,255,255,0.8);font-size:22px;pointer-events:none;">+</div>

      <div id="bbbShop"></div>

      <button id="bbbBack" style="position:fixed;top:14px;left:14px;
        background:rgba(0,0,0,0.5);color:white;font-size:13px;
        padding:7px 16px;border-radius:20px;border:1px solid rgba(255,255,255,0.25);
        cursor:pointer;font-family:Arial,sans-serif;pointer-events:all;">← Back</button>
    `;

    document.getElementById("bbbBack")!.onclick = () => {
      cleanup();
      game.ui.innerHTML = "";
      import("../ArcadeScene").then(m => new m.ArcadeScene(game));
    };

    // ── Input ──────────────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      if (isBedtime) return;
      const key = e.key.toLowerCase();

      if (key === "e") {
        // Near bed → sleep
        const bx = camera.position.x - bed.position.x;
        const bz = camera.position.z - bed.position.z;
        if (Math.sqrt(bx * bx + bz * bz) < 2.0) { openShop(); return; }

        // Near plant → grab berry
        const px = camera.position.x - plantTop.position.x;
        const pz = camera.position.z - plantTop.position.z;
        if (Math.sqrt(px * px + pz * pz) < GRAB_DIST && berriesOnPlant > 0) {
          berriesOnPlant--;
          berriesInHand++;
          const b = berryMeshes.pop();
          if (b) {
            if (goldenBerries.has(b)) { goldenBerries.delete(b); berriesInHandGolden++; }
            b.dispose();
          }
          updateHUD();
          return;
        }

        // Near star orb → collect
        for (let i = starOrbs.length - 1; i >= 0; i--) {
          const ox = camera.position.x - starOrbs[i].position.x;
          const oz = camera.position.z - starOrbs[i].position.z;
          if (Math.sqrt(ox * ox + oz * oz) < 1.5) {
            starOrbs[i].dispose();
            starOrbs.splice(i, 1);
            starOrbsCollected++;
            if (starOrbsCollected >= 3 && !orbUpgradeUnlocked) {
              orbUpgradeUnlocked = true;
              showToast("🌟 Berry Buddy upgrades unlocked!");
            } else {
              showToast(`⭐ Star Orb collected! (${Math.min(starOrbsCollected, 3)}/3)`);
            }
            return;
          }
        }

        // Near fountain berry → collect
        for (let i = fountainBerries.length - 1; i >= 0; i--) {
          const fx = camera.position.x - fountainBerries[i].mesh.position.x;
          const fz = camera.position.z - fountainBerries[i].mesh.position.z;
          if (Math.sqrt(fx * fx + fz * fz) < 1.5) {
            const fb = fountainBerries[i];
            fb.mesh.dispose();
            fountainBerries.splice(i, 1);
            berriesInHand++;
            if (fb.isGolden) berriesInHandGolden++;
            updateHUD();
            return;
          }
        }
      }

      // F — equip / unequip hammer
      if (key === "f" && hasHammer) {
        hammerEquipped = !hammerEquipped;
        updateHUD();
        showToast(hammerEquipped ? "🔨 Hammer equipped! Left click to throw." : "🔨 Hammer holstered.");
      }

      // G — Berry Blits
      if (key === "g") activateBlits();

      // H — Berry Fountain
      if (key === "h") activateFountain();
    };

    const onPointerDown = () => {
      if (isBedtime) return;

      if (hammerEquipped) { throwHammer(); return; }

      // Click vacuum to fire berries
      if (vacMesh && vacBerries > 0) {
        const vx = camera.position.x - vacMesh.position.x;
        const vz = camera.position.z - vacMesh.position.z;
        if (Math.sqrt(vx * vx + vz * vz) < 2.0) {
          dollars     += vacBerries;
          totalEarned += vacBerries;
          showToast(`🌀 Fired ${vacBerries} berries! +$${vacBerries}`);
          vacBerries = 0;
          updateHUD();
          return;
        }
      }

      // Drop berry into hole
      if (berriesInHand <= 0) return;
      const dx = camera.position.x - hole.position.x;
      const dz = camera.position.z - hole.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < DROP_DIST) {
        berriesInHand--;
        const isGolden = berriesInHandGolden > 0;
        if (isGolden) berriesInHandGolden--;
        dropBerry(isGolden);
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    // ── Game loop ──────────────────────────────────────────────────────────
    scene.registerBeforeRender(() => {
      if (isBedtime) return;

      const dt = scene.getEngine().getDeltaTime() / 1000;

      // Day countdown
      dayTimer -= dt;
      if (dayTimer <= 0) { openShop(); return; }

      // Berry Blits
      if (blitsActive) {
        blitsTimer -= dt;
        if (blitsTimer <= 0) { blitsActive = false; showToast("⚡ Berry Blits ended."); }
        updateHUD();
      }
      if (blitsCooldown > 0) { blitsCooldown = Math.max(0, blitsCooldown - dt); updateHUD(); }
      if (fountainCooldown > 0) { fountainCooldown = Math.max(0, fountainCooldown - dt); updateHUD(); }

      // Fountain berry lifetime
      for (let i = fountainBerries.length - 1; i >= 0; i--) {
        fountainBerries[i].life -= dt;
        if (fountainBerries[i].life <= 0) { fountainBerries[i].mesh.dispose(); fountainBerries.splice(i, 1); }
      }

      // Berry plant grow
      growTimer += dt;
      if (growTimer >= GROW_INTERVAL) { growTimer = 0; spawnBerry(); updateHUD(); }

      // Berry Buddies
      if (buddies.length > 0) {
        buddyTimer += dt;
        if (buddyTimer >= BUDDY_INTERVAL / buddies.length) {
          buddyTimer = 0;
          spawnBerry(buddies[Math.floor(Math.random() * buddies.length)].position);
          updateHUD();
        }
      }

      // Vacuum auto-collects
      if (vacMesh) {
        for (let i = berryMeshes.length - 1; i >= 0; i--) {
          const bx = berryMeshes[i].position.x - vacMesh.position.x;
          const bz = berryMeshes[i].position.z - vacMesh.position.z;
          if (Math.sqrt(bx * bx + bz * bz) < 1.5) {
            if (goldenBerries.has(berryMeshes[i])) goldenBerries.delete(berryMeshes[i]);
            berryMeshes[i].dispose();
            berryMeshes.splice(i, 1);
            berriesOnPlant = Math.max(0, berriesOnPlant - 1);
            vacBerries++;
          }
        }
      }

      // Auto Drop
      if (hasAutoDrop && berriesInHand > 0) {
        const dx = camera.position.x - hole.position.x;
        const dz = camera.position.z - hole.position.z;
        if (Math.sqrt(dx * dx + dz * dz) < DROP_DIST + 0.5) {
          berriesInHand--;
          const isGolden = berriesInHandGolden > 0;
          if (isGolden) berriesInHandGolden--;
          dropBerry(isGolden);
        }
      }

      // Orb / fountain berry bob
      starOrbs.forEach((o, i) => { o.position.y = 0.8 + Math.sin(Date.now() / 600 + i) * 0.15; });
      fountainBerries.forEach((fb, i) => { fb.mesh.position.y = 0.8 + Math.sin(Date.now() / 400 + i * 1.3) * 0.2; });

      // Bed pulse when time low
      if (dayTimer < 10) {
        const pulse = Math.sin(Date.now() / 150) * 0.5 + 0.5;
        (bed.material as StandardMaterial).diffuseColor = new Color3(0.6 + pulse * 0.4, 0.2, 0.2);
      }

      // Blits light flash
      light.intensity = blitsActive ? 1.0 + (Math.sin(Date.now() / 100) * 0.5 + 0.5) * 0.6 : 1.0;

      // Proximity prompts
      const prompt = document.getElementById("bbbPrompt");
      if (!prompt) return;

      const px  = camera.position.x - plantTop.position.x;
      const pz  = camera.position.z - plantTop.position.z;
      const hx  = camera.position.x - hole.position.x;
      const hz  = camera.position.z - hole.position.z;
      const bx2 = camera.position.x - bed.position.x;
      const bz2 = camera.position.z - bed.position.z;

      const nearPlant = Math.sqrt(px * px + pz * pz) < GRAB_DIST;
      const nearHole  = Math.sqrt(hx * hx + hz * hz) < DROP_DIST;
      const nearBed   = Math.sqrt(bx2 * bx2 + bz2 * bz2) < 2.0;
      const nearOrb   = starOrbs.some(o => {
        const ox = camera.position.x - o.position.x;
        const oz = camera.position.z - o.position.z;
        return Math.sqrt(ox * ox + oz * oz) < 1.5;
      });
      const nearFount = fountainBerries.some(fb => {
        const fx = camera.position.x - fb.mesh.position.x;
        const fz = camera.position.z - fb.mesh.position.z;
        return Math.sqrt(fx * fx + fz * fz) < 1.5;
      });
      const nearVac = vacMesh && (() => {
        const vx = camera.position.x - vacMesh!.position.x;
        const vz = camera.position.z - vacMesh!.position.z;
        return Math.sqrt(vx * vx + vz * vz) < 2.0;
      })();

      const dropValue = () => {
        const isG  = berriesInHandGolden > 0;
        const base = isG ? GOLDEN_MULT : 1;
        const mult = blitsActive ? BLITS_MULT : 1;
        return `$${(base * mult).toLocaleString()}`;
      };

      if (nearBed) {
        prompt.style.display = "block";
        prompt.textContent = `[E] Go to sleep (${Math.ceil(dayTimer)}s left)`;
      } else if (nearPlant && berriesOnPlant > 0) {
        prompt.style.display = "block";
        prompt.textContent = "[E] Grab berry 🍓";
      } else if (nearHole && berriesInHand > 0) {
        prompt.style.display = "block";
        prompt.textContent = `[Click] Drop berry → ${dropValue()}`;
      } else if (nearOrb) {
        prompt.style.display = "block";
        prompt.textContent = `[E] Break Star Orb (${Math.min(starOrbsCollected, 3)}/3)`;
      } else if (nearFount) {
        prompt.style.display = "block";
        prompt.textContent = "[E] Grab fountain berry 💧";
      } else if (nearVac && vacBerries > 0) {
        prompt.style.display = "block";
        prompt.textContent = `[Click] Fire ${vacBerries} berries!`;
      } else {
        prompt.style.display = "none";
      }

      updateHUD();
    });

    game.engine.runRenderLoop(() => scene.render());

    // ── Cleanup ────────────────────────────────────────────────────────────
    const cleanup = () => {
      window.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("pointerdown", onPointerDown);
      document.exitPointerLock();
      scene.dispose();
    };
    game._disposeScene = cleanup;
  }
}

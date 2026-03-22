// Roblox3DGame.ts — BabylonJS 3D, Roblox-style visuals
import { gpState } from "../../input/GamepadManager";
import { Engine }           from "@babylonjs/core/Engines/engine";
import { Scene }            from "@babylonjs/core/scene";
import { Vector3 }          from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 }   from "@babylonjs/core/Maths/math.color";
import { FreeCamera }       from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { MeshBuilder }      from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh }             from "@babylonjs/core/Meshes/mesh";
import { TransformNode }    from "@babylonjs/core/Meshes/transformNode";
import { DynamicTexture }   from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { ShadowGenerator }  from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";

export type GameId3D = "steal"|"lava"|"bombs"|"coins"|"brookhaven";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CharParts {
  root:  TransformNode;
  torso: Mesh; head:  Mesh;
  lArm:  Mesh; rArm:  Mesh;
  lLeg:  Mesh; rLeg:  Mesh;
  tag:   Mesh;
  walkT: number;
}

interface Ent3D {
  parts: CharParts;
  px: number; py: number; pz: number;
  vx: number; vy: number; vz: number;
  onGround: boolean; alive: boolean;
  name: string; isPlayer: boolean;
  score: number; holdItem: boolean;
  yaw: number;
  botTimer: number;
  inCar: boolean;
}

interface Surf {
  cx: number; cy: number; cz: number;
  hw: number; hh: number; hd: number;
  kill?: boolean;
}

interface Item3D {
  mesh: Mesh; x: number; y: number; z: number; taken: boolean; carriedBy: number;
}

interface Bomb3D {
  warn: Mesh; boom: Mesh | null;
  cx: number; cz: number; r: number; t: number; phase: "warn"|"boom";
}

const G        = -28;
const JUMP_SPD =  11;
const PLR_SPD  =  8;
const BOT_SPD  =  5.5;
const SKIN     = "#FFCC99";
const BOT_COLS = ["#dd3333","#ff9900","#22cc44"];
const BOT_NAMES= ["CoolDude99","XxProGamerxX","NoodleArms"];

// ── Class ─────────────────────────────────────────────────────────────────────

export class Roblox3DGame {
  private _canvas!: HTMLCanvasElement;
  private _hud!:    HTMLDivElement;
  private _engine!: Engine;
  private _scene!:  Scene;
  private _cam!:    FreeCamera;
  private _sun!:    DirectionalLight;
  private _shadow!: ShadowGenerator;
  private _mats:    Map<string, StandardMaterial> = new Map();

  private _ents:     Ent3D[]  = [];
  private _surfaces: Surf[]   = [];
  private _items:    Item3D[] = [];
  private _bombs:    Bomb3D[] = [];

  private _gameId: GameId3D;
  private _pvp:    boolean;
  private _onEnd:  (won: boolean, msg: string) => void;

  private _timer     = 60;
  private _phase: "countdown"|"playing"|"done" = "countdown";
  private _countdown = 3;

  // camera
  private _camYaw  = 0;
  private _camPitch= 0.35;
  private _camDist = 14;
  private _rMouse  = false;
  private _lastMX  = 0;
  private _lastMY  = 0;

  // touch
  private _joyActive= false;
  private _joyOx=0; _joyOy=0; _joyDx=0; _joyDy=0;
  private _rTouchId: number|null = null;
  private _rTouchX=0; _rTouchY=0;

  // game fields
  private _lavaY       = -5;
  private _lavaMesh:   Mesh|null = null;
  private _bombNext    = 2;
  private _coinSpawn   = 0;
  private _brainSpawn  = 3;
  private _carMesh:    Mesh|null = null;
  private _carPx=15; private _carPz=0;
  private _carVx=0;  private _carVz=0;
  private _carYaw=0;

  private _keys    = new Set<string>();
  private _cleanup : (() => void)[] = [];
  private _lastTs  = 0;
  private _raf     = 0;
  private _disposed= false;

  constructor(
    container: HTMLElement,
    gameId:    GameId3D,
    pvp:       boolean,
    onEnd:     (won: boolean, msg: string) => void,
  ) {
    this._gameId = gameId;
    this._pvp    = pvp;
    this._onEnd  = onEnd;

    // Canvas
    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;touch-action:none;outline:none;pointer-events:all;";
    this._canvas.setAttribute("tabindex","0");
    container.appendChild(this._canvas);
    this._canvas.focus();

    // HUD
    this._hud = document.createElement("div");
    this._hud.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:11;";
    container.appendChild(this._hud);

    // BabylonJS
    this._engine = new Engine(this._canvas, true, { antialias: true });
    this._scene  = new Scene(this._engine);
    this._scene.clearColor = new Color4(0.761, 0.878, 1.0, 1); // Roblox sky

    // Lights
    const amb = new HemisphericLight("amb", Vector3.Up(), this._scene);
    amb.intensity = 0.55;
    amb.diffuse   = new Color3(1, 0.98, 0.9);
    amb.groundColor = new Color3(0.4, 0.5, 0.4);
    this._sun = new DirectionalLight("sun", new Vector3(-0.6, -1, -0.4).normalize(), this._scene);
    this._sun.intensity = 1.1;
    this._sun.position  = new Vector3(20, 40, 20);

    // Shadows
    this._shadow = new ShadowGenerator(512, this._sun);
    this._shadow.usePoissonSampling = true;

    // Camera
    this._cam = new FreeCamera("cam", Vector3.Zero(), this._scene);
    this._cam.minZ = 0.1;
    this._cam.fov  = 1.0;

    // Fog for depth
    this._scene.fogMode    = Scene.FOGMODE_EXP2;
    this._scene.fogDensity = 0.012;
    this._scene.fogColor   = new Color3(0.8, 0.9, 1.0);

    this._setupGame();
    this._bindInput();
    this._addClouds();

    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  // ── Clouds ────────────────────────────────────────────────────────────────

  private _addClouds(): void {
    for (let i = 0; i < 8; i++) {
      const a = i * 0.8, r = 35 + i * 4;
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
      const m = MeshBuilder.CreateBox(`cl${i}`,
        { width: 10 + i * 2, height: 2, depth: 6 + i }, this._scene);
      m.position.set(cx, 22 + i * 1.5, cz);
      const mat = this._mat("#FFFFFF");
      mat.alpha = 0.88;
      m.material = mat;
    }
  }

  // ── Game setup ────────────────────────────────────────────────────────────

  private _setupGame(): void {
    const bots = this._pvp ? 3 : 0;
    switch (this._gameId) {
      case "lava":       this._timer = 90; this._setupLava(bots);        break;
      case "bombs":      this._timer = 60; this._setupBombs(bots);       break;
      case "coins":      this._timer = 30; this._setupCoins(bots);       break;
      case "steal":      this._timer = 90; this._setupSteal(bots);       break;
      case "brookhaven": this._timer = Infinity; this._setupBrookhaven(bots); break;
    }
  }

  // ── Floor is Lava ─────────────────────────────────────────────────────────

  private _setupLava(bots: number): void {
    this._scene.clearColor = new Color4(0.25, 0.1, 0.02, 1);
    this._lavaY = -4;

    // Lava plane
    this._lavaMesh = MeshBuilder.CreateBox("lava",
      { width: 120, height: 0.5, depth: 120 }, this._scene);
    this._lavaMesh.position.set(0, this._lavaY, 0);
    const lavaMat = this._mat("#ff4400");
    lavaMat.emissiveColor = new Color3(0.9, 0.25, 0);
    this._lavaMesh.material = lavaMat;

    // Platforms
    const defs: [number,number,number,number][] = [
      [ 0,  0,  0,  4],
      [-8,  3, -6,  3],[ 8,  3,  6,  3],
      [-4,  6,  8,  3],[ 4,  6, -8,  3],
      [-10, 9,  0,  3],[10,  9,  0,  3],
      [ 0, 12,  0,  5],[-6,12,-10,  3],[ 6,12, 10,  3],
      [ 0, 15,  6,  3],[ 0,15, -6,  3],
      [ 0, 18,  0,  4],
    ];
    const cols = ["#44bb44","#33aa33","#22aa22","#55cc55","#66dd66"];
    defs.forEach(([cx,cy,cz,s], i) => {
      const m = MeshBuilder.CreateBox(`p${i}`,
        { width: s*2, height: 0.6, depth: s*2 }, this._scene);
      m.position.set(cx, cy, cz);
      m.material = this._mat(cols[i % cols.length]);
      m.receiveShadows = true;
      this._shadow.addShadowCaster(m, false);
      this._surfaces.push({ cx, cy, cz, hw:s, hh:0.3, hd:s });
    });

    const spawns = [[0,1,0],[-8,4,-6],[8,4,6],[-4,7,8]];
    this._spawnEnts(bots, spawns);
  }

  // ── Bombs ─────────────────────────────────────────────────────────────────

  private _setupBombs(bots: number): void {
    this._scene.clearColor = new Color4(0.15, 0.2, 0.35, 1);
    this._bombNext = 2;
    this._addBaseplate("#555566", 40);
    this._surfaces.push({ cx:0, cy:-0.25, cz:0, hw:20, hh:0.25, hd:20 });

    // Walls (visual only, slight decoration)
    [[0,1.5,20.5,20,1.5,0.4],[0,1.5,-20.5,20,1.5,0.4],[20.5,1.5,0,0.4,1.5,20],[-20.5,1.5,0,0.4,1.5,20]].forEach(([cx,cy,cz,hw,hh,hd],i)=>{
      const m = MeshBuilder.CreateBox(`w${i}`,{width:hw*2,height:hh*2,depth:hd*2},this._scene);
      m.position.set(cx,cy,cz); m.material=this._mat("#3a3a4a"); m.receiveShadows=true;
    });

    const spawns = [[0,0.5,0],[-8,0.5,-8],[8,0.5,-8],[-8,0.5,8]];
    this._spawnEnts(bots, spawns);
    this._ents.forEach(e => e.score = 3);
  }

  // ── Coin Rush ─────────────────────────────────────────────────────────────

  private _setupCoins(bots: number): void {
    this._scene.clearColor = new Color4(0.55, 0.82, 0.4, 1);
    this._coinSpawn = 0;
    this._addBaseplate("#44aa33", 50);
    this._surfaces.push({ cx:0, cy:-0.2, cz:0, hw:25, hh:0.2, hd:25 });

    for (let i = 0; i < 8; i++) {
      const a = i * 0.79;
      this._makeTree(Math.cos(a)*18|0, 0, Math.sin(a)*18|0);
    }

    const spawns = [[0,0.5,0],[-8,0.5,-8],[8,0.5,-8],[-8,0.5,8]];
    this._spawnEnts(bots, spawns);
  }

  // ── Steal a Brainrot ──────────────────────────────────────────────────────

  private _setupSteal(bots: number): void {
    this._scene.clearColor = new Color4(0.2, 0.15, 0.3, 1);
    this._brainSpawn = 3;
    this._addBaseplate("#2a3a2a", 70);
    this._surfaces.push({ cx:0, cy:-0.2, cz:0, hw:35, hh:0.2, hd:35 });

    const baseDefs = [
      {cx:-22,cz:-22,col:"#4488ff"},{cx:22,cz:22,col:"#dd3333"},
      {cx:-22,cz:22,col:"#ff9900"}, {cx:22,cz:-22,col:"#22cc44"},
    ];
    baseDefs.forEach(({cx,cz,col}) => {
      const m = MeshBuilder.CreateBox("base",{width:8,height:0.35,depth:8},this._scene);
      m.position.set(cx,0.17,cz); m.material=this._mat(col); m.receiveShadows=true;
    });
    const cen = MeshBuilder.CreateCylinder("cen",{diameter:6,height:0.25,tessellation:16},this._scene);
    cen.position.set(0,0.12,0); cen.material=this._mat("#ffdd00");

    const spawns=[[-22,0.5,-22],[22,0.5,22],[-22,0.5,22],[22,0.5,-22]];
    this._spawnEnts(bots, spawns);
  }

  // ── Brookhaven ────────────────────────────────────────────────────────────

  private _setupBrookhaven(bots: number): void {
    this._scene.clearColor = new Color4(0.55, 0.82, 0.99, 1);
    this._scene.fogDensity = 0.006;

    // Grass
    this._addBaseplate("#66bb44", 100);
    this._surfaces.push({ cx:0, cy:-0.2, cz:0, hw:50, hh:0.2, hd:50 });

    // Roads
    [[0,0,0,50,0.22,4],[0,0,0,4,0.22,50]].forEach(([cx,cy,cz,hw,hh,hd])=>{
      const m=MeshBuilder.CreateBox("road",{width:hw*2,height:hh*2,depth:hd*2},this._scene);
      m.position.set(cx,cy,cz); m.material=this._mat("#778899"); m.receiveShadows=true;
    });
    // Road markings
    for (let i = -4; i <= 4; i++) {
      const mark = MeshBuilder.CreateBox(`rm${i}`,{width:0.3,height:0.23,depth:2},this._scene);
      mark.position.set(i*10, 0, 0); mark.material=this._mat("#FFFF00");
    }

    // Houses
    const hDefs = [[-20,-20,"#ffccaa"],[-20,-8,"#aaccff"],[-20,8,"#ffaacc"],[-20,20,"#ccffaa"],
                   [20,-20,"#ffffaa"], [20,-8,"#ffaaaa"], [20,8,"#aaffcc"],  [20,20,"#ccaaff"]];
    hDefs.forEach(([hx,hz,col])=>this._makeBuilding(hx as number,hz as number,col as string));

    // Shop & hospital
    this._makeBuilding(-8,-22,"#88ccff",10,5,8);
    this._makeBuilding(8, 22,"#ff8844",10,5,8);

    // Park trees
    for (let i=0;i<6;i++){const a=i*(Math.PI*2/6);this._makeTree(Math.round(Math.cos(a)*7),0,Math.round(Math.sin(a)*7));}

    // Stars
    for (let i=0;i<20;i++){
      const a=i*0.91+0.3, r=8+(i%5)*5;
      const sx=Math.cos(a)*r, sz=Math.sin(a)*r;
      const m=MeshBuilder.CreateBox(`star${i}`,{size:0.7},this._scene);
      m.position.set(sx,0.9,sz);
      const mat=this._mat("#ffdd00");
      mat.emissiveColor=new Color3(0.9,0.7,0);
      m.material=mat;
      this._items.push({mesh:m,x:sx,y:0.9,z:sz,taken:false,carriedBy:-1});
    }

    // Car
    this._carPx=18; this._carPz=0; this._carYaw=0;
    this._carMesh=MeshBuilder.CreateBox("car",{width:2.2,height:1.2,depth:4.2},this._scene);
    this._carMesh.material=this._mat("#dd2222");
    this._carMesh.receiveShadows=true;
    this._shadow.addShadowCaster(this._carMesh);
    const top=MeshBuilder.CreateBox("ctop",{width:1.8,height:0.9,depth:2.5},this._scene);
    top.material=this._mat("#bb1111"); top.parent=this._carMesh; top.position.set(0,1.1,-0.3);

    const spawns=[[-4,0.5,-4],[4,0.5,-4],[-4,0.5,4],[4,0.5,4]];
    this._spawnEnts(bots, spawns);
  }

  // ── Shared helpers ────────────────────────────────────────────────────────

  private _addBaseplate(col: string, half: number): void {
    const m = MeshBuilder.CreateBox("bp",{width:half*2,height:0.4,depth:half*2},this._scene);
    m.position.set(0,-0.2,0); m.material=this._mat(col); m.receiveShadows=true;
  }

  private _makeTree(tx: number, _ty: number, tz: number): void {
    const t=MeshBuilder.CreateCylinder(`tr${tx}${tz}`,{diameter:0.7,height:2.5,tessellation:8},this._scene);
    t.position.set(tx,1.25,tz); t.material=this._mat("#774411"); t.receiveShadows=true;
    this._shadow.addShadowCaster(t);
    const c=MeshBuilder.CreateBox(`tc${tx}${tz}`,{width:3,height:2.5,depth:3},this._scene);
    c.position.set(tx,3.8,tz); c.material=this._mat("#227722"); c.receiveShadows=true;
    this._shadow.addShadowCaster(c);
  }

  private _makeBuilding(bx:number,bz:number,col:string,w=6,h=4,d=6): void {
    const walls=MeshBuilder.CreateBox("bld",{width:w,height:h,depth:d},this._scene);
    walls.position.set(bx,h/2,bz); walls.material=this._mat(col);
    walls.receiveShadows=true; this._shadow.addShadowCaster(walls);
    const roof=MeshBuilder.CreateBox("roof",{width:w+0.4,height:1,depth:d+0.4},this._scene);
    roof.position.set(bx,h+0.5,bz); roof.material=this._mat("#774433");
    roof.receiveShadows=true; this._shadow.addShadowCaster(roof);
    this._surfaces.push({cx:bx,cy:h/2,cz:bz,hw:w/2,hh:h/2,hd:d/2});
  }

  // ── Character (R6 style) ──────────────────────────────────────────────────

  private _makeChar(color: string, name: string, idx: number): CharParts {
    const scene = this._scene;
    const root  = new TransformNode(`root${idx}`, scene);

    const torso = MeshBuilder.CreateBox(`torso${idx}`,{width:1.2,height:1.3,depth:0.6},scene);
    torso.material = this._mat(color); torso.parent=root; torso.position.set(0,1.05,0);

    const head = MeshBuilder.CreateBox(`head${idx}`,{width:1.1,height:1.1,depth:1.0},scene);
    head.material = this._mat(SKIN); head.parent=root; head.position.set(0,2.2,0);

    // Face plane — sits only on the front of the head
    const facePlane = MeshBuilder.CreatePlane(`face${idx}`,{width:0.9,height:0.9},scene);
    facePlane.parent=root; facePlane.position.set(0,2.2,0.51);
    const faceMat = new StandardMaterial(`facem${idx}`, scene);
    const faceTex = new DynamicTexture(`ftex${idx}`,{width:64,height:64},scene);
    const fctx = faceTex.getContext();
    fctx.fillStyle="#FFCC99"; fctx.fillRect(0,0,64,64);
    fctx.fillStyle="#222"; fctx.fillRect(10,20,10,12); fctx.fillRect(44,20,10,12);
    fctx.fillStyle="#222"; fctx.beginPath(); fctx.arc(32,46,9,0,Math.PI); fctx.fill();
    faceTex.update();
    faceMat.diffuseTexture=faceTex; faceMat.specularColor=Color3.Black();
    faceMat.emissiveColor=new Color3(0.6,0.5,0.4);
    faceMat.backFaceCulling=false;
    facePlane.material=faceMat;

    const lArm = MeshBuilder.CreateBox(`la${idx}`,{width:0.55,height:1.2,depth:0.55},scene);
    lArm.material=this._mat(SKIN); lArm.parent=root; lArm.position.set(-0.9,1.05,0);

    const rArm = MeshBuilder.CreateBox(`ra${idx}`,{width:0.55,height:1.2,depth:0.55},scene);
    rArm.material=this._mat(SKIN); rArm.parent=root; rArm.position.set(0.9,1.05,0);

    const lLeg = MeshBuilder.CreateBox(`ll${idx}`,{width:0.55,height:1.1,depth:0.55},scene);
    lLeg.material=this._mat("#333355"); lLeg.parent=root; lLeg.position.set(-0.3,0.35,0);

    const rLeg = MeshBuilder.CreateBox(`rl${idx}`,{width:0.55,height:1.1,depth:0.55},scene);
    rLeg.material=this._mat("#333355"); rLeg.parent=root; rLeg.position.set(0.3,0.35,0);

    // Name tag (billboard)
    const tagW=3, tagH=0.6;
    const tagPlane = MeshBuilder.CreatePlane(`tag${idx}`,{width:tagW,height:tagH},scene);
    tagPlane.parent=root; tagPlane.position.set(0,2.9,0);
    tagPlane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const tagMat = new StandardMaterial(`tagm${idx}`,scene);
    const tagTex = new DynamicTexture(`tagtex${idx}`,{width:256,height:52},scene);
    const tctx = tagTex.getContext() as unknown as CanvasRenderingContext2D;
    tctx.fillStyle="rgba(0,0,0,0.55)"; tctx.roundRect(0,0,256,52,10); tctx.fill();
    tctx.fillStyle="#fff"; tctx.font="bold 28px Arial";
    tctx.textAlign="center"; tctx.textBaseline="middle";
    tctx.fillText(name,128,26);
    tagTex.update();
    tagMat.diffuseTexture=tagTex; tagMat.emissiveColor=Color3.White();
    tagMat.backFaceCulling=false; tagMat.specularColor=Color3.Black();
    tagPlane.material=tagMat;

    // Shadows
    [torso,head,lArm,rArm,lLeg,rLeg].forEach(m=>{
      this._shadow.addShadowCaster(m); m.receiveShadows=true;
    });

    return { root,torso,head,lArm,rArm,lLeg,rLeg,tag:tagPlane,walkT:0 };
  }

  private _spawnEnts(botCount: number, spawns: number[][]): void {
    const make = (i: number): Ent3D => {
      const isPlayer = i===0;
      const col  = isPlayer ? "#4499ff" : BOT_COLS[(i-1)%3];
      const name = isPlayer ? "You" : BOT_NAMES[(i-1)%3];
      const [sx,sy,sz] = spawns[i] ?? [0,0.5,0];
      return {
        parts: this._makeChar(col, name, i),
        px:sx, py:sy, pz:sz,
        vx:0, vy:0, vz:0,
        onGround:false, alive:true,
        name, isPlayer,
        score:0, holdItem:false,
        yaw:0, botTimer:0, inCar:false,
      };
    };
    this._ents = [make(0)];
    for (let i=1; i<=botCount; i++) this._ents.push(make(i));
  }

  // ── Material cache ────────────────────────────────────────────────────────

  private _mat(hex: string): StandardMaterial {
    if (this._mats.has(hex)) return this._mats.get(hex)!;
    const m = new StandardMaterial(`m_${hex}`,this._scene);
    m.diffuseColor  = Color3.FromHexString(hex.length===7?hex:"#aaaaaa");
    m.specularColor = Color3.Black();
    this._mats.set(hex,m);
    return m;
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  private _bindInput(): void {
    const kd=(e:KeyboardEvent)=>this._keys.add(e.code);
    const ku=(e:KeyboardEvent)=>this._keys.delete(e.code);
    window.addEventListener("keydown",kd);
    window.addEventListener("keyup",ku);
    this._cleanup.push(()=>{window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);});

    // Right-click = camera rotate (Roblox standard)
    const md=(e:MouseEvent)=>{ if(e.button===2){this._rMouse=true;this._lastMX=e.clientX;this._lastMY=e.clientY;} };
    const mu=(e:MouseEvent)=>{ if(e.button===2) this._rMouse=false; };
    const mm=(e:MouseEvent)=>{ if(this._rMouse){ this._camYaw+=(e.clientX-this._lastMX)*0.005; this._camPitch=Math.max(-0.1,Math.min(1.1,this._camPitch-(e.clientY-this._lastMY)*0.004)); this._lastMX=e.clientX; this._lastMY=e.clientY; } };
    const cx2=(e:Event)=>e.preventDefault();
    const onWheel=(e:WheelEvent)=>{ this._camDist=Math.max(4,Math.min(22,this._camDist+e.deltaY*0.01)); };
    this._canvas.addEventListener("mousedown",md);
    this._canvas.addEventListener("mouseup",mu);
    this._canvas.addEventListener("mousemove",mm);
    this._canvas.addEventListener("contextmenu",cx2);
    this._canvas.addEventListener("wheel",onWheel,{passive:true});
    this._cleanup.push(()=>{
      this._canvas.removeEventListener("mousedown",md);
      this._canvas.removeEventListener("mouseup",mu);
      this._canvas.removeEventListener("mousemove",mm);
      this._canvas.removeEventListener("contextmenu",cx2);
      this._canvas.removeEventListener("wheel",onWheel);
    });

    // Touch
    const ts=(e:TouchEvent)=>{e.preventDefault();this._onTS(e);};
    const tm=(e:TouchEvent)=>{e.preventDefault();this._onTM(e);};
    const te=(e:TouchEvent)=>{e.preventDefault();this._onTE(e);};
    this._canvas.addEventListener("touchstart",ts,{passive:false});
    this._canvas.addEventListener("touchmove",tm,{passive:false});
    this._canvas.addEventListener("touchend",te,{passive:false});
    this._cleanup.push(()=>{
      this._canvas.removeEventListener("touchstart",ts);
      this._canvas.removeEventListener("touchmove",tm);
      this._canvas.removeEventListener("touchend",te);
    });

    const onR=()=>this._engine.resize();
    window.addEventListener("resize",onR);
    this._cleanup.push(()=>window.removeEventListener("resize",onR));

    const onLeave=()=>this._endGame();
    this._hud.addEventListener("r3d-leave",onLeave);
    this._cleanup.push(()=>this._hud.removeEventListener("r3d-leave",onLeave));
  }

  private _onTS(e:TouchEvent):void{
    for(const t of Array.from(e.changedTouches)){
      if(t.clientX/window.innerWidth<0.5){
        this._joyActive=true; this._joyOx=t.clientX; this._joyOy=t.clientY; this._joyDx=0; this._joyDy=0;
      } else {
        this._rTouchId=t.identifier; this._rTouchX=t.clientX; this._rTouchY=t.clientY;
      }
    }
  }
  private _onTM(e:TouchEvent):void{
    for(const t of Array.from(e.changedTouches)){
      if(t.identifier===this._rTouchId){
        this._camYaw+=(t.clientX-this._rTouchX)*0.005;
        this._camPitch=Math.max(-0.1,Math.min(1.1,this._camPitch-(t.clientY-this._rTouchY)*0.004));
        this._rTouchX=t.clientX; this._rTouchY=t.clientY;
      } else if(this._joyActive){
        const cap=55;
        this._joyDx=Math.max(-1,Math.min(1,(t.clientX-this._joyOx)/cap));
        this._joyDy=Math.max(-1,Math.min(1,(t.clientY-this._joyOy)/cap));
      }
    }
  }
  private _onTE(e:TouchEvent):void{
    for(const t of Array.from(e.changedTouches)){
      if(t.identifier===this._rTouchId) this._rTouchId=null;
      else { this._joyActive=false; this._joyDx=0; this._joyDy=0; }
    }
  }

  // ── Game loop ─────────────────────────────────────────────────────────────

  private _hudTs = 0;

  private _loop(ts:number):void{
    if(this._disposed)return;
    this._raf=requestAnimationFrame(t=>this._loop(t)); // schedule FIRST so crash can't kill loop
    const dt=Math.min((ts-this._lastTs)/1000,0.05);
    this._lastTs=ts;
    try{
      this._tick(dt);
      this._scene.render();
    }catch(e){
      console.error("3D game error:",e);
    }
  }

  private _tick(dt:number):void{
    // Right stick → orbit camera (controller support)
    this._camYaw   += gpState.rx * dt * 3.0;
    this._camPitch  = Math.max(-0.1, Math.min(1.1, this._camPitch + gpState.ry * dt * 2.5));

    if(this._phase==="countdown"){
      this._countdown-=dt;
      if(this._countdown<=0)this._phase="playing";
      this._hudTs+=dt; if(this._hudTs>=0.2){this._hudTs=0;this._updateHUD();}
      this._syncMeshes(dt);
      this._updateCamera();
      return;
    }
    if(this._phase==="done"){this._updateCamera();return;}

    if(this._gameId!=="brookhaven")this._timer-=dt;

    this._updatePlayer(dt);
    for(let i=1;i<this._ents.length;i++)this._updateBot(i,dt);
    this._syncMeshes(dt);

    switch(this._gameId){
      case"lava":      this._tickLava(dt);      break;
      case"bombs":     this._tickBombs(dt);     break;
      case"coins":     this._tickCoins(dt);     break;
      case"steal":     this._tickSteal(dt);     break;
      case"brookhaven":this._tickBrookhaven();  break;
    }

    this._items.forEach(it=>{ if(!it.taken) it.mesh.rotation.y+=dt*1.8; });
    this._updateCamera();
    this._hudTs+=dt; if(this._hudTs>=0.2){this._hudTs=0;this._updateHUD();}

    if(this._timer<=0&&this._phase==="playing")this._endGame();
    if(this._keys.has("Escape"))this._endGame();
  }

  // ── Player ────────────────────────────────────────────────────────────────

  private _updatePlayer(dt:number):void{
    const p=this._ents[0];
    if(!p.alive)return;
    if(p.inCar){this._updateDriving(dt);return;}

    const fw=Math.sin(this._camYaw), fz=Math.cos(this._camYaw);
    const rx=Math.cos(this._camYaw), rz=-Math.sin(this._camYaw);
    let dx=0,dz=0;
    if(this._keys.has("KeyW")||this._keys.has("ArrowUp"))   {dx+=fw;dz+=fz;}
    if(this._keys.has("KeyS")||this._keys.has("ArrowDown")) {dx-=fw;dz-=fz;}
    if(this._keys.has("KeyA")||this._keys.has("ArrowLeft")) {dx-=rx;dz-=rz;}
    if(this._keys.has("KeyD")||this._keys.has("ArrowRight")){dx+=rx;dz+=rz;}
    if(this._joyActive){dx+=fw*(-this._joyDy)+rx*this._joyDx;dz+=fz*(-this._joyDy)+rz*this._joyDx;}
    const len=Math.sqrt(dx*dx+dz*dz);
    if(len>0){dx/=len;dz/=len;}
    p.vx=dx*PLR_SPD; p.vz=dz*PLR_SPD;
    if(len>0)p.yaw=Math.atan2(dx,dz);

    if((this._keys.has("Space")||this._joyDy<-0.6)&&p.onGround)p.vy=JUMP_SPD;

    // Enter car (Brookhaven)
    if(this._gameId==="brookhaven"&&this._carMesh&&!p.inCar){
      if(Math.hypot(p.px-this._carPx,p.pz-this._carPz)<2.5&&
        (this._keys.has("KeyE")||this._keys.has("Space")))
        p.inCar=true;
    }
    this._moveEnt(p,dt);
  }

  private _updateDriving(dt:number):void{
    const p=this._ents[0];
    const acc=14,fric=0.82,turn=2;
    if(this._keys.has("KeyW")||this._keys.has("ArrowUp"))  {this._carVx+=Math.sin(this._carYaw)*acc*dt;this._carVz+=Math.cos(this._carYaw)*acc*dt;}
    if(this._keys.has("KeyS")||this._keys.has("ArrowDown")){this._carVx-=Math.sin(this._carYaw)*acc*0.6*dt;this._carVz-=Math.cos(this._carYaw)*acc*0.6*dt;}
    if(this._keys.has("KeyA")||this._keys.has("ArrowLeft")) this._carYaw-=turn*dt;
    if(this._keys.has("KeyD")||this._keys.has("ArrowRight"))this._carYaw+=turn*dt;
    if(this._keys.has("KeyE")){p.inCar=false;p.px=this._carPx+2;p.pz=this._carPz;p.py=0.5;return;}
    this._carVx*=fric; this._carVz*=fric;
    this._carPx=Math.max(-46,Math.min(46,this._carPx+this._carVx*dt));
    this._carPz=Math.max(-46,Math.min(46,this._carPz+this._carVz*dt));
    if(this._carMesh){this._carMesh.position.set(this._carPx,0.6,this._carPz);this._carMesh.rotation.y=this._carYaw;}
    p.px=this._carPx; p.py=0.6; p.pz=this._carPz;
  }

  // ── Bots ──────────────────────────────────────────────────────────────────

  private _updateBot(i:number,dt:number):void{
    const e=this._ents[i]; if(!e.alive)return;
    e.botTimer-=dt;
    switch(this._gameId){
      case"lava":      this._botLava(e);         break;
      case"bombs":     this._botBombs(e);        break;
      case"coins":     this._botCoins(e);        break;
      case"steal":     this._botSteal(e,i);      break;
      case"brookhaven":this._botBrookhaven(e);   break;
    }
    this._moveEnt(e,dt);
  }

  private _botLava(e:Ent3D):void{
    if(e.onGround&&e.botTimer<=0){e.vy=JUMP_SPD*(0.9+Math.random()*0.2);const a=Math.random()*Math.PI*2;e.vx=Math.sin(a)*BOT_SPD*0.7;e.vz=Math.cos(a)*BOT_SPD*0.7;e.botTimer=0.8+Math.random()*1.5;}
    if(e.py<this._lavaY+3&&e.onGround)e.vy=JUMP_SPD;
  }
  private _botBombs(e:Ent3D):void{
    let fx=0,fz=0;
    for(const b of this._bombs){const d=Math.hypot(e.px-b.cx,e.pz-b.cz);if(d<b.r+3){const s=1-d/(b.r+3);fx+=(e.px-b.cx)/Math.max(d,0.1)*s*5;fz+=(e.pz-b.cz)/Math.max(d,0.1)*s*5;}}
    if(Math.abs(fx)+Math.abs(fz)>0.1){const l=Math.hypot(fx,fz);e.vx=fx/l*BOT_SPD;e.vz=fz/l*BOT_SPD;}
    else if(e.botTimer<=0){const a=Math.random()*Math.PI*2;e.vx=Math.sin(a)*BOT_SPD*0.6;e.vz=Math.cos(a)*BOT_SPD*0.6;e.botTimer=1+Math.random();}
    e.px=Math.max(-18,Math.min(18,e.px));e.pz=Math.max(-18,Math.min(18,e.pz));
  }
  private _botCoins(e:Ent3D):void{
    let best:Item3D|null=null,bd=Infinity;
    for(const it of this._items){if(it.taken)continue;const d=Math.hypot(e.px-it.x,e.pz-it.z);if(d<bd){bd=d;best=it;}}
    if(best&&bd>0.1){const dx=best.x-e.px,dz=best.z-e.pz,l=Math.hypot(dx,dz);e.vx=dx/l*BOT_SPD;e.vz=dz/l*BOT_SPD;}
    else if(e.botTimer<=0){const a=Math.random()*Math.PI*2;e.vx=Math.sin(a)*BOT_SPD*0.5;e.vz=Math.cos(a)*BOT_SPD*0.5;e.botTimer=1;}
  }
  private _botSteal(e:Ent3D,idx:number):void{
    if(!e.holdItem){
      let best:Item3D|null=null,bd=Infinity;
      for(const it of this._items){if(it.taken||it.carriedBy>=0)continue;const d=Math.hypot(e.px-it.x,e.pz-it.z);if(d<bd){bd=d;best=it;}}
      if(best&&bd>0.1){const dx=best.x-e.px,dz=best.z-e.pz,l=Math.hypot(dx,dz);e.vx=dx/l*BOT_SPD;e.vz=dz/l*BOT_SPD;}
    } else {
      const bases=[[-22,-22],[22,22],[-22,22],[22,-22]];
      const [bx,bz]=bases[idx]??[0,0];
      const l=Math.hypot(bx-e.px,bz-e.pz);
      if(l>0.1){const dx=bx-e.px,dz=bz-e.pz;e.vx=dx/l*BOT_SPD;e.vz=dz/l*BOT_SPD;}
    }
  }
  private _botBrookhaven(e:Ent3D):void{
    let best:Item3D|null=null,bd=Infinity;
    for(const it of this._items){if(it.taken)continue;const d=Math.hypot(e.px-it.x,e.pz-it.z);if(d<bd){bd=d;best=it;}}
    if(best&&bd>0.1){const dx=best.x-e.px,dz=best.z-e.pz,l=Math.hypot(dx,dz);e.vx=dx/l*BOT_SPD*0.65;e.vz=dz/l*BOT_SPD*0.65;}
    else if(e.botTimer<=0){const a=Math.random()*Math.PI*2;e.vx=Math.sin(a)*2;e.vz=Math.cos(a)*2;e.botTimer=2;}
  }

  // ── Physics ───────────────────────────────────────────────────────────────

  private _moveEnt(e:Ent3D,dt:number):void{
    if(!e.alive)return;
    e.vy+=G*dt;
    e.px+=e.vx*dt; e.pz+=e.vz*dt; e.py+=e.vy*dt;
    e.onGround=false;
    for(const s of this._surfaces){
      if(e.px>s.cx-s.hw-0.4&&e.px<s.cx+s.hw+0.4&&
         e.pz>s.cz-s.hd-0.4&&e.pz<s.cz+s.hd+0.4){
        const top=s.cy+s.hh;
        if(e.py<=top+0.15&&e.py>=top-2.0&&e.vy<=0){
          e.py=top;e.vy=0;e.onGround=true;
          if(s.kill)this._killEnt(e);
        }
      }
    }
    const bound=this._gameId==="brookhaven"?48:(this._gameId==="steal"?34:18);
    e.px=Math.max(-bound,Math.min(bound,e.px));
    e.pz=Math.max(-bound,Math.min(bound,e.pz));
    if(e.py<-25){if(this._gameId!=="lava"){e.px=0;e.py=0.5;e.pz=0;e.vy=0;}else this._killEnt(e);}
  }

  private _killEnt(e:Ent3D):void{
    if(this._gameId==="bombs"){e.score=Math.max(0,e.score-1);e.px=0;e.py=0.5;e.pz=0;e.vy=0;return;}
    e.alive=false;
    e.parts.root.setEnabled(false);
  }

  // ── Mesh sync + walk animation ────────────────────────────────────────────

  private _syncMeshes(dt:number):void{
    for(const e of this._ents){
      if(!e.alive)continue;
      const p=e.parts;
      p.root.position.set(e.px,e.py,e.pz);
      p.root.rotation.y=e.yaw;

      // Walk animation
      const spd=Math.hypot(e.vx,e.vz);
      if(spd>0.3&&e.onGround){
        p.walkT+=dt*spd*0.9;
        const sw=Math.sin(p.walkT*Math.PI*2)*0.45;
        p.lLeg.rotation.x= sw; p.rLeg.rotation.x=-sw;
        p.lArm.rotation.x=-sw*0.5; p.rArm.rotation.x=sw*0.5;
      } else if(!e.onGround){
        // Jump pose
        p.lLeg.rotation.x+=(-0.35-p.lLeg.rotation.x)*0.2;
        p.rLeg.rotation.x+=( 0.35-p.rLeg.rotation.x)*0.2;
        p.lArm.rotation.x+=(-0.5-p.lArm.rotation.x)*0.2;
        p.rArm.rotation.x+=(-0.5-p.rArm.rotation.x)*0.2;
      } else {
        // Idle: smooth return to 0
        p.lLeg.rotation.x*=0.75; p.rLeg.rotation.x*=0.75;
        p.lArm.rotation.x*=0.75; p.rArm.rotation.x*=0.75;
      }
    }
  }

  // ── Camera ────────────────────────────────────────────────────────────────

  private _updateCamera():void{
    const p=this._ents[0]; if(!p)return;
    const tx=p.px, ty=p.py+1.2, tz=p.pz;
    const hDist=Math.cos(this._camPitch)*this._camDist;
    const cx=tx-Math.sin(this._camYaw)*hDist;
    const cy=ty+Math.sin(this._camPitch)*this._camDist;
    const cz=tz-Math.cos(this._camYaw)*hDist;
    const finalCy=Math.max(ty+0.5,cy);
    this._cam.position.set(cx,finalCy,cz);
    // Manual rotation — avoids FreeCamera.setTarget quirks
    const dx=tx-cx, dy=ty-finalCy, dz=tz-cz;
    this._cam.rotation.y=Math.atan2(dx,dz);
    this._cam.rotation.x=-Math.atan2(dy,Math.sqrt(dx*dx+dz*dz));
  }

  // ── Game ticks ────────────────────────────────────────────────────────────

  private _tickLava(dt:number):void{
    this._lavaY+=dt*0.4;
    if(this._lavaMesh)this._lavaMesh.position.y=this._lavaY;
    for(const e of this._ents)if(e.alive&&e.py<=this._lavaY+0.2)this._killEnt(e);
    const alive=this._ents.filter(e=>e.alive);
    if(alive.length<=1&&this._ents.length>1)this._endGame();
  }

  private _tickBombs(dt:number):void{
    this._bombNext-=dt;
    if(this._bombNext<=0){
      this._bombNext=1.5+Math.random()*1.5;
      const cx=(Math.random()-0.5)*30,cz=(Math.random()-0.5)*30;
      const warn=MeshBuilder.CreateCylinder("bw",{diameter:6,height:0.1,tessellation:16},this._scene);
      warn.position.set(cx,0.1,cz);
      const wm=this._mat("#ff2200"); wm.emissiveColor=new Color3(0.8,0,0); warn.material=wm;
      this._bombs.push({warn,boom:null,cx,cz,r:3,t:0,phase:"warn"});
    }
    for(let i=this._bombs.length-1;i>=0;i--){
      const b=this._bombs[i]; b.t+=dt;
      if(b.phase==="warn"&&b.t>2){
        b.phase="boom";b.t=0;b.warn.isVisible=false;
        b.boom=MeshBuilder.CreateSphere("boom",{diameter:b.r*2,segments:8},this._scene);
        b.boom.position.set(b.cx,b.r,b.cz);
        const bm=this._mat("#ff6600");bm.emissiveColor=new Color3(1,0.3,0);bm.alpha=0.7;b.boom.material=bm;
        for(const e of this._ents){
          if(!e.alive)continue;
          if(Math.hypot(e.px-b.cx,e.pz-b.cz)<b.r+0.6){
            e.score=Math.max(0,e.score-1);e.vy=9;e.vx=(e.px-b.cx)*4;e.vz=(e.pz-b.cz)*4;
          }
        }
      }
      if(b.phase==="boom"&&b.t>0.4){b.warn.dispose();b.boom?.dispose();this._bombs.splice(i,1);}
    }
    if(this._ents[0].score<=0)this._endGame();
  }

  private _tickCoins(dt:number):void{
    this._coinSpawn-=dt;
    if(this._coinSpawn<=0&&this._items.filter(i=>!i.taken).length<14){
      this._coinSpawn=1.2;
      const cx=(Math.random()-0.5)*44,cz=(Math.random()-0.5)*44;
      const m=MeshBuilder.CreateCylinder("coin",{diameter:0.8,height:0.18,tessellation:12},this._scene);
      m.position.set(cx,0.9,cz); m.rotation.x=Math.PI/2;
      const mat=this._mat("#ffcc00");mat.emissiveColor=new Color3(0.5,0.4,0);m.material=mat;
      this._shadow.addShadowCaster(m);
      this._items.push({mesh:m,x:cx,y:0.9,z:cz,taken:false,carriedBy:-1});
    }
    for(const it of this._items){
      if(it.taken)continue;
      for(let i=0;i<this._ents.length;i++){
        const e=this._ents[i];if(!e.alive)continue;
        if(Math.hypot(e.px-it.x,e.pz-it.z)<1.3){it.taken=true;it.mesh.isVisible=false;e.score++;}
      }
    }
  }

  private _tickSteal(dt:number):void{
    this._brainSpawn-=dt;
    if(this._brainSpawn<=0&&this._items.filter(i=>!i.taken&&i.carriedBy<0).length<5){
      this._brainSpawn=4;
      const cx=(Math.random()-0.5)*10,cz=(Math.random()-0.5)*10;
      const m=MeshBuilder.CreateBox("br",{size:0.8},this._scene);
      m.position.set(cx,0.5,cz);
      const mat=this._mat("#aa44ff");mat.emissiveColor=new Color3(0.3,0,0.4);m.material=mat;
      this._shadow.addShadowCaster(m);
      this._items.push({mesh:m,x:cx,y:0.5,z:cz,taken:false,carriedBy:-1});
    }
    const bases=[[-22,-22],[22,22],[-22,22],[22,-22]];
    for(let ei=0;ei<this._ents.length;ei++){
      const e=this._ents[ei];if(!e.alive)continue;
      if(!e.holdItem){
        for(const it of this._items){
          if(it.taken||it.carriedBy>=0)continue;
          if(Math.hypot(e.px-it.x,e.pz-it.z)<1.3){it.carriedBy=ei;e.holdItem=true;break;}
        }
      } else {
        const [bx,bz]=bases[ei]??[0,0];
        if(Math.hypot(e.px-bx,e.pz-bz)<4.5){
          const c=this._items.find(i=>i.carriedBy===ei);
          if(c){c.taken=true;c.mesh.isVisible=false;e.score+=50;e.holdItem=false;}
        }
        const c=this._items.find(i=>i.carriedBy===ei);
        if(c){c.x=e.px;c.y=e.py+2;c.z=e.pz;c.mesh.position.set(e.px,e.py+2,e.pz);}
      }
    }
  }

  private _tickBrookhaven():void{
    for(const it of this._items){
      if(it.taken)continue;
      for(let i=0;i<this._ents.length;i++){
        const e=this._ents[i];
        if(Math.hypot(e.px-it.x,e.pz-it.z)<1.3){it.taken=true;it.mesh.isVisible=false;e.score++;}
      }
    }
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  private _updateHUD():void{
    const p=this._ents[0];
    const W=window.innerWidth;
    const fs=Math.max(12,Math.min(W*0.022,18));

    if(this._phase==="countdown"){
      const n=Math.ceil(this._countdown);
      this._hud.innerHTML=`
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          color:#fff;font-size:${Math.min(W,600)*0.2}px;font-weight:900;
          text-shadow:0 0 30px rgba(0,0,0,0.8),0 4px 8px rgba(0,0,0,0.6);
          font-family:'Arial Black',Arial,sans-serif;text-align:center;">
          ${n>0?n:"GO!"}
        </div>`;
      return;
    }

    const timer=Math.max(0,Math.ceil(this._timer));
    let scoreStr="";
    if(this._gameId==="lava")      scoreStr=`🔥 Survive &nbsp;⏱ ${timer}s &nbsp; ${this._ents.filter(e=>e.alive).length} alive`;
    else if(this._gameId==="bombs") scoreStr=`💣 Bomb Dodge &nbsp;⏱ ${timer}s &nbsp; ❤️ ${p.score}`;
    else if(this._gameId==="coins") scoreStr=`🪙 Coin Rush &nbsp;⏱ ${timer}s &nbsp; ${p.score} coins`;
    else if(this._gameId==="steal") scoreStr=`💜 Steal &nbsp;⏱ ${timer}s &nbsp; ${p.score} pts`;
    else if(this._gameId==="brookhaven") scoreStr=`🏡 Brookhaven &nbsp;•&nbsp; ⭐ ${p.score} stars`;

    const sorted=[...this._ents].sort((a,b)=>b.score-a.score);
    const lbRows=sorted.slice(0,4).map((e,i)=>
      `<div style="color:${e.isPlayer?"#7fff7f":"#fff"};margin:2px 0;display:flex;justify-content:space-between;gap:12px;">
        <span>${i+1}. ${e.name}</span><span>${e.score}</span></div>`).join("");

    const nearCar=this._gameId==="brookhaven"&&!p.inCar&&this._carMesh&&Math.hypot(p.px-this._carPx,p.pz-this._carPz)<3;
    const carHint=nearCar?`<div style="position:absolute;bottom:28%;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,0.7);color:#fff;padding:8px 22px;border-radius:10px;
      font-size:15px;font-family:'Arial Black',Arial,sans-serif;">🚗 Press E / Space to enter car</div>`:"";
    const leaveBtn=this._gameId==="brookhaven"?`
      <div style="position:absolute;top:14px;left:16px;background:rgba(20,20,20,0.8);
        border:2px solid rgba(255,255,255,0.3);color:#fff;padding:8px 16px;border-radius:10px;
        font-size:14px;font-weight:900;pointer-events:all;cursor:pointer;
        font-family:'Arial Black',Arial,sans-serif;user-select:none;"
        onclick="this.dispatchEvent(new CustomEvent('r3d-leave',{bubbles:true}))">← Leave</div>`:"";
    const stealHint=this._gameId==="steal"&&p.holdItem?`
      <div style="position:absolute;top:60px;left:50%;transform:translateX(-50%);
        background:rgba(120,0,200,0.8);color:#fff;padding:5px 18px;border-radius:8px;
        font-size:13px;font-family:'Arial Black',Arial,sans-serif;">
        💜 Return to YOUR base!</div>`:"";

    this._hud.innerHTML=`
      ${leaveBtn}
      <div style="position:absolute;top:14px;left:50%;transform:translateX(-50%);
        background:rgba(15,15,15,0.75);border:1.5px solid rgba(255,255,255,0.2);
        color:#fff;padding:7px 20px;border-radius:12px;font-size:${fs+2}px;font-weight:900;
        font-family:'Arial Black',Arial,sans-serif;white-space:nowrap;backdrop-filter:blur(4px);">
        ${scoreStr}
      </div>
      <div style="position:absolute;top:14px;right:16px;background:rgba(15,15,15,0.75);
        border:1.5px solid rgba(255,255,255,0.2);color:#fff;padding:10px 16px;border-radius:12px;
        font-size:${fs}px;font-family:'Arial Black',Arial,sans-serif;backdrop-filter:blur(4px);">
        ${lbRows}
      </div>
      <div style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
        color:rgba(255,255,255,0.5);font-size:11px;font-family:Arial,sans-serif;white-space:nowrap;">
        WASD · SPACE jump · right-click drag to rotate · scroll to zoom${this._gameId==="brookhaven"?" · ESC to leave":""}
      </div>
      ${carHint}${stealHint}`;
  }

  // ── End ───────────────────────────────────────────────────────────────────

  private _endGame():void{
    if(this._phase==="done")return;
    this._phase="done";
    const p=this._ents[0];
    const sorted=[...this._ents].sort((a,b)=>b.score-a.score);
    const won=sorted[0]?.isPlayer??false;
    let msg="";
    switch(this._gameId){
      case"lava":      msg=p.alive?`🔥 You survived! You WIN!`:`😢 You fell in the lava. ${sorted[0]?.name} won.`; break;
      case"bombs":     msg=p.score>0?`💣 You survived with ${p.score} lives!`:`😢 You got blown up. ${sorted[0]?.name} won.`; break;
      case"coins":     msg=won?`🪙 You Win! ${p.score} coins!`:`😢 ${sorted[0]?.name} won with ${sorted[0]?.score}. You: ${p.score}.`; break;
      case"steal":     msg=won?`💜 You Win! ${p.score} pts!`:`😢 ${sorted[0]?.name} won with ${sorted[0]?.score}. You: ${p.score}.`; break;
      case"brookhaven":msg=`🏡 See ya! You collected ${p.score} ⭐ stars.`; break;
    }
    this._hud.innerHTML=`
      <div style="position:absolute;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;">
        <div style="background:#1a1a2e;border:2px solid rgba(255,255,255,0.25);border-radius:20px;
          padding:32px 44px;text-align:center;color:#fff;max-width:420px;
          font-family:'Arial Black',Arial,sans-serif;">
          <div style="font-size:30px;font-weight:900;margin-bottom:14px;">
            ${this._gameId==="brookhaven"?"🏡 See ya!":(won?"🏆 Victory!":"💀 Game Over")}
          </div>
          <div style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.6;">${msg}</div>
          <div style="margin-top:18px;color:rgba(255,255,255,0.35);font-size:13px;">Returning to lobby…</div>
        </div>
      </div>`;
    setTimeout(()=>this._onEnd(won,msg),3500);
  }

  // ── Dispose ───────────────────────────────────────────────────────────────

  dispose():void{
    if(this._disposed)return;
    this._disposed=true;
    cancelAnimationFrame(this._raf);
    this._cleanup.forEach(fn=>fn());
    this._scene.dispose();
    this._engine.dispose();
    this._canvas.remove();
    this._hud.remove();
  }
}

// EggyHideAndSeek.ts — Full school map, 6 AI hiders, 1 AI seeker

import { Engine }           from "@babylonjs/core/Engines/engine";
import { Scene }            from "@babylonjs/core/scene";
import { Vector3 }          from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 }   from "@babylonjs/core/Maths/math.color";
import { UniversalCamera }  from "@babylonjs/core/Cameras/universalCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder }      from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh }             from "@babylonjs/core/Meshes/mesh";

const HIDE_PHASE    = 10;
const SEEK_PHASE    = 190;
const PLR_SPD       = 5;
const PLR_H         = 0.45;
const SEEKER_SPD    = 2.8;
const TAG_DIST      = 1.1;
const G             = -20;
const JUMP_SPD      = 7;
const CAM_DIST      = 4;
const CAM_HEIGHT    = 2;
const DETECT_RANGE  = 2.5;   // seeker spots you from this close
const HIDDEN_DETECT = 0.8;   // near furniture: barely detectable

interface Wall { cx:number; cz:number; hw:number; hd:number; }
interface HideSpot { x:number; z:number; }
interface AiHider { mesh:Mesh; x:number; z:number; found:boolean; color:Color3; }

const PATROL_PTS = [
  {x:-12,z:0},{x:0,z:0},{x:12,z:0},
  {x:-12,z:6},{x:0,z:6},{x:12,z:6},
  {x:-12,z:-6},{x:0,z:-6},{x:12,z:-6},
];

const HIDER_COLORS = [
  new Color3(0.2,0.8,0.2),   // green
  new Color3(0.2,0.2,0.9),   // blue
  new Color3(0.9,0.2,0.9),   // purple
  new Color3(0.2,0.9,0.9),   // cyan
  new Color3(0.9,0.9,0.2),   // yellow
  new Color3(0.9,0.5,0.2),   // orange-red
];

export class EggyHideAndSeek {
  private _container: HTMLElement;
  private _canvas!: HTMLCanvasElement;
  private _hud!: HTMLDivElement;
  private _engine!: Engine;
  private _scene!: Scene;
  private _cam!: UniversalCamera;

  // Player (Eggy)
  private _eggyMesh!: Mesh;
  private _px = 0; private _py = PLR_H; private _pz = 8;
  private _vx = 0; private _vy = 0; private _vz = 0;
  private _onGround = false;
  private _camYaw = Math.PI; private _camPitch = 0.3;
  private _isSeeker = false;

  // AI Hiders (6 eggs)
  private _aiHiders: AiHider[] = [];

  // Seeker AI
  private _seekerMesh!: Mesh;
  private _seekerX = 0; private _seekerZ = -1;
  private _seekerState: "patrol"|"chase" = "patrol";
  private _seekerPatrolIdx = 0;
  private _seekerWaitTimer = 0;
  private _seekerTarget = { x:0, z:0 };
  private _seekerHunting: "player"|number = "player"; // who seeker is currently after

  // Collision & hide spots
  private _walls: Wall[] = [];
  private _hideSpots: HideSpot[] = [];

  // Input
  private _keys = new Set<string>();
  private _joyActive = false;
  private _joyOx = 0; _joyOy = 0; _joyDx = 0; _joyDy = 0;
  private _rTouchId: number | null = null;
  private _rTouchX = 0; _rTouchY = 0;

  // Game state
  private _phase: "menu"|"hiding"|"seeking"|"over" = "menu";
  private _timer = HIDE_PHASE;
  private _timerEl!: HTMLDivElement;
  private _statusEl!: HTMLDivElement;
  private _hidersLeftEl!: HTMLDivElement;

  private _cleanup: (()=>void)[] = [];
  private _lastTs = 0;
  private _raf = 0;
  private _disposed = false;
  private _onEnd: (won:boolean, msg:string)=>void;

  constructor(container: HTMLElement, onEnd: (won:boolean, msg:string)=>void) {
    this._container = container;
    this._onEnd = onEnd;
    this._showMenu();
  }

  // ── Menu ───────────────────────────────────────────────────────────────────
  private _showMenu() {
    const menu = document.createElement("div");
    Object.assign(menu.style, {
      position:"absolute", inset:"0", display:"flex",
      alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"24px",
      background:"linear-gradient(135deg,#1a0a00,#3d1f00)",
      fontFamily:"'Fredoka One',sans-serif", pointerEvents:"all", zIndex:"10"
    });
    menu.innerHTML = `
      <div style="font-size:72px">🥚</div>
      <div style="color:#ffc832;font-size:38px;font-weight:bold">Eggy Hide &amp; Seek</div>
      <div style="color:rgba(255,255,255,0.6);font-size:15px;text-align:center;max-width:320px;line-height:1.8">
        Hide anywhere in the school!<br>
        6 other eggs are hiding too.<br>
        Seeker must find everyone before time runs out.<br>
        <b style="color:#ffc832">Survive 3:10 to win!</b>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;width:240px;margin-top:8px">
        <button id="playAiBtn" style="
          background:#ffc832;color:#1a0a00;border:none;border-radius:14px;
          padding:16px;font-size:22px;font-weight:bold;cursor:pointer;
          font-family:'Fredoka One',sans-serif;pointer-events:all;
        ">Play vs AI</button>
        <button id="backBtn" style="
          background:rgba(255,255,255,0.1);color:white;
          border:2px solid rgba(255,255,255,0.2);border-radius:14px;
          padding:12px;font-size:17px;cursor:pointer;
          font-family:'Fredoka One',sans-serif;pointer-events:all;
        ">Back to Arcade</button>
      </div>
    `;
    this._container.appendChild(menu);
    document.getElementById("playAiBtn")!.onclick = () => { menu.remove(); this._startGame(); };
    document.getElementById("backBtn")!.onclick   = () => { menu.remove(); this._onEnd(false,""); };
  }

  // ── Start ──────────────────────────────────────────────────────────────────
  private _startGame() {
    this._canvas = document.createElement("canvas");
    Object.assign(this._canvas.style, { position:"absolute", inset:"0", width:"100%", height:"100%", display:"block" });
    this._container.appendChild(this._canvas);

    this._hud = document.createElement("div");
    Object.assign(this._hud.style, { position:"absolute", inset:"0", pointerEvents:"none", fontFamily:"'Fredoka One',sans-serif" });
    this._container.appendChild(this._hud);

    this._buildHUD();
    this._buildScene();
    this._buildInput();

    this._phase = "hiding";
    this._timer = HIDE_PHASE;
    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(this._loop);
  }

  // ── HUD ────────────────────────────────────────────────────────────────────
  private _buildHUD() {
    this._timerEl = document.createElement("div");
    Object.assign(this._timerEl.style, {
      position:"absolute", top:"14px", left:"50%", transform:"translateX(-50%)",
      background:"rgba(0,0,0,0.65)", borderRadius:"12px", padding:"8px 20px",
      color:"white", fontSize:"22px", fontWeight:"bold", textAlign:"center",
      border:"2px solid rgba(255,200,50,0.5)"
    });
    this._hud.appendChild(this._timerEl);

    this._statusEl = document.createElement("div");
    Object.assign(this._statusEl.style, {
      position:"absolute", bottom:"70px", left:"50%", transform:"translateX(-50%)",
      background:"rgba(0,0,0,0.7)", borderRadius:"12px", padding:"8px 20px",
      color:"#ffc832", fontSize:"16px", textAlign:"center"
    });
    this._statusEl.textContent = "Quick! Find somewhere to hide! 🥚";
    this._hud.appendChild(this._statusEl);

    this._hidersLeftEl = document.createElement("div");
    Object.assign(this._hidersLeftEl.style, {
      position:"absolute", top:"14px", right:"14px",
      background:"rgba(0,0,0,0.65)", borderRadius:"12px", padding:"8px 14px",
      color:"white", fontSize:"15px", textAlign:"center",
      border:"2px solid rgba(255,200,50,0.3)", display:"none"
    });
    this._hud.appendChild(this._hidersLeftEl);

    // Hiding indicator
    const hideEl = document.createElement("div");
    hideEl.id = "hideEl";
    Object.assign(hideEl.style, {
      position:"absolute", bottom:"130px", left:"50%", transform:"translateX(-50%)",
      background:"rgba(0,100,0,0.75)", borderRadius:"10px", padding:"6px 16px",
      color:"white", fontSize:"14px", display:"none"
    });
    hideEl.textContent = "🤫 You're hidden!";
    this._hud.appendChild(hideEl);

    const hint = document.createElement("div");
    Object.assign(hint.style, {
      position:"absolute", bottom:"14px", left:"50%", transform:"translateX(-50%)",
      color:"rgba(255,255,255,0.35)", fontSize:"12px", textAlign:"center"
    });
    hint.textContent = "WASD move  •  Space jump  •  Click & drag to look";
    this._hud.appendChild(hint);

    this._buildJoystick();
  }

  private _buildJoystick() {
    const zone = document.createElement("div");
    Object.assign(zone.style, {
      position:"absolute", bottom:"55px", left:"25px",
      width:"110px", height:"110px", borderRadius:"50%",
      background:"rgba(255,255,255,0.07)", border:"2px solid rgba(255,255,255,0.13)",
      pointerEvents:"auto", touchAction:"none"
    });
    const knob = document.createElement("div");
    Object.assign(knob.style, {
      position:"absolute", top:"30px", left:"30px",
      width:"50px", height:"50px", borderRadius:"50%",
      background:"rgba(255,200,50,0.5)", border:"2px solid rgba(255,200,50,0.8)"
    });
    zone.appendChild(knob); this._hud.appendChild(zone);

    const onS=(e:TouchEvent)=>{
      e.preventDefault();
      const t=e.changedTouches[0],r=zone.getBoundingClientRect();
      this._joyActive=true; this._joyOx=r.left+r.width/2; this._joyOy=r.top+r.height/2;
      this._joyDx=t.clientX-this._joyOx; this._joyDy=t.clientY-this._joyOy;
      this._updateKnob(knob);
    };
    const onM=(e:TouchEvent)=>{
      e.preventDefault(); if(!this._joyActive)return;
      const t=e.changedTouches[0];
      this._joyDx=t.clientX-this._joyOx; this._joyDy=t.clientY-this._joyOy;
      this._updateKnob(knob);
    };
    const onE=()=>{ this._joyActive=false;this._joyDx=0;this._joyDy=0;knob.style.top="30px";knob.style.left="30px"; };
    zone.addEventListener("touchstart",onS,{passive:false});
    zone.addEventListener("touchmove",onM,{passive:false});
    zone.addEventListener("touchend",onE);
    this._cleanup.push(()=>{
      zone.removeEventListener("touchstart",onS);
      zone.removeEventListener("touchmove",onM);
      zone.removeEventListener("touchend",onE);
    });
  }

  private _updateKnob(k:HTMLDivElement) {
    const max=35,len=Math.sqrt(this._joyDx**2+this._joyDy**2);
    k.style.left=`${30+(len>max?this._joyDx/len*max:this._joyDx)}px`;
    k.style.top =`${30+(len>max?this._joyDy/len*max:this._joyDy)}px`;
  }

  // ── Scene ──────────────────────────────────────────────────────────────────
  private _buildScene() {
    this._engine = new Engine(this._canvas, true);
    this._scene  = new Scene(this._engine);
    this._scene.clearColor = new Color4(0.55,0.78,0.9,1);

    this._cam = new UniversalCamera("cam", new Vector3(0,CAM_HEIGHT+PLR_H,CAM_DIST), this._scene);
    this._cam.minZ=0.1; this._cam.maxZ=120;

    const amb = new HemisphericLight("amb", new Vector3(0,1,0), this._scene);
    amb.intensity=0.9; amb.diffuse=new Color3(1,0.98,0.9); amb.groundColor=new Color3(0.5,0.5,0.5);

    this._buildSchool();
    this._buildEggy();
    this._buildAiHiders();
    this._buildSeeker();

    const onResize=()=>this._engine.resize();
    window.addEventListener("resize",onResize);
    this._cleanup.push(()=>window.removeEventListener("resize",onResize));
  }

  private _mat(n:string,r:number,g:number,b:number):StandardMaterial {
    const m=new StandardMaterial(n,this._scene); m.diffuseColor=new Color3(r,g,b); return m;
  }

  private _box(n:string,x:number,y:number,z:number,w:number,h:number,d:number,r:number,g:number,b:number,solid=true) {
    const mesh=MeshBuilder.CreateBox(n,{width:w,height:h,depth:d},this._scene);
    mesh.position.set(x,y,z); mesh.material=this._mat(n+"M",r,g,b);
    if(solid) this._walls.push({cx:x,cz:z,hw:w/2,hd:d/2});
    return mesh;
  }

  // ── School Layout ──────────────────────────────────────────────────────────
  // Hallway: x -18..18, z -2..2   (36 wide, 4 deep)
  // Room A:  x -18..-8, z  2..12  (10x10) — Ms. Bisque's
  // Room B:  x  -4.. 4, z  2..12  (8x10)
  // Room C:  x   8..18, z  2..12  (10x10)
  // Gym:     x  -8.. 8, z -12..-2 (16x10)
  private _buildSchool() {
    const FH=3.5; // floor height
    const wm=this._mat("wallM",0.88,0.88,0.82);
    const fm=this._mat("floorM",0.78,0.7,0.58);
    const cm=this._mat("ceilM",0.95,0.95,0.92);

    // Helper: room(name, cx, cz, hw, hd) — builds walls+floor+ceiling, leaves door gaps
    const room=(n:string,cx:number,cz:number,hw:number,hd:number,doorZ:number,doorSide:"N"|"S")=>{
      // Floor & ceiling
      const b=MeshBuilder.CreateBox(n+"F",{width:hw*2,height:0.2,depth:hd*2},this._scene);
      b.position.set(cx,-0.1,cz); b.material=fm;
      const c=MeshBuilder.CreateBox(n+"C",{width:hw*2,height:0.2,depth:hd*2},this._scene);
      c.position.set(cx,FH+0.1,cz); c.material=cm;
      // Walls: N S W E — with door opening
      const walls=[
        {side:"N",wx:cx,wz:cz-hd,ww:hw*2+0.2,wd:0.2},
        {side:"S",wx:cx,wz:cz+hd,ww:hw*2+0.2,wd:0.2},
        {side:"W",wx:cx-hw,wz:cz,ww:0.2,wd:hd*2},
        {side:"E",wx:cx+hw,wz:cz,ww:0.2,wd:hd*2},
      ];
      for(const w of walls){
        const isDoorWall=w.side===doorSide;
        if(isDoorWall){
          // Two wall segments with gap in middle
          const segW= w.side==="N"||w.side==="S" ? (hw-0.8) : 0.2;
          const segD= w.side==="N"||w.side==="S" ? 0.2 : (hd-1.2);
          if(w.side==="N"||w.side==="S"){
            for(const sign of [-1,1]){
              const seg=MeshBuilder.CreateBox(`${n}${w.side}${sign}`,{width:segW,height:FH,depth:0.2},this._scene);
              seg.position.set(cx+sign*(hw/2+0.4),FH/2,w.wz); seg.material=wm;
              this._walls.push({cx:cx+sign*(hw/2+0.4),cz:w.wz,hw:segW/2,hd:0.1});
              // Door frame above
              const top=MeshBuilder.CreateBox(`${n}${w.side}T${sign}`,{width:segW,height:FH-2.2,depth:0.2},this._scene);
              top.position.set(cx+sign*(hw/2+0.4),2.2+(FH-2.2)/2,w.wz); top.material=wm;
            }
          } else {
            for(const sign of [-1,1]){
              const seg=MeshBuilder.CreateBox(`${n}${w.side}${sign}`,{width:0.2,height:FH,depth:segD},this._scene);
              seg.position.set(w.wx,FH/2,cz+sign*(hd/2+0.6)); seg.material=wm;
              this._walls.push({cx:w.wx,cz:cz+sign*(hd/2+0.6),hw:0.1,hd:segD/2});
            }
          }
        } else {
          const seg=MeshBuilder.CreateBox(`${n}${w.side}`,{width:w.ww,height:FH,depth:w.wd},this._scene);
          seg.position.set(w.wx,FH/2,w.wz); seg.material=wm;
          this._walls.push({cx:w.wx,cz:w.wz,hw:w.ww/2,hd:w.wd/2});
        }
        void doorZ;
      }
    };

    // Hallway floor & ceiling (no room walls — open)
    const hf=MeshBuilder.CreateBox("hallF",{width:36,height:0.2,depth:4},this._scene);
    hf.position.set(0,-0.1,0); hf.material=fm;
    const hc=MeshBuilder.CreateBox("hallC",{width:36,height:0.2,depth:4},this._scene);
    hc.position.set(0,FH+0.1,0); hc.material=cm;
    // Hallway outer walls (N and S) — with gaps for room doors
    // N wall (z=-2): gap at x=-13,0,13
    for(const seg of [{x:-18,w:5},{x:-8,w:4},{x:4,w:4},{x:14,w:8}]){
      const wl=MeshBuilder.CreateBox("hN"+seg.x,{width:seg.w,height:FH,depth:0.2},this._scene);
      wl.position.set(seg.x+seg.w/2,FH/2,-2); wl.material=wm;
      this._walls.push({cx:seg.x+seg.w/2,cz:-2,hw:seg.w/2,hd:0.1});
    }
    // S wall (z=2): gap at gym door x=0
    for(const seg of [{x:-18,w:15},{x:3,w:15}]){
      const wl=MeshBuilder.CreateBox("hS"+seg.x,{width:seg.w,height:FH,depth:0.2},this._scene);
      wl.position.set(seg.x+seg.w/2,FH/2,2); wl.material=wm;
      this._walls.push({cx:seg.x+seg.w/2,cz:2,hw:seg.w/2,hd:0.1});
    }
    // Hallway end walls
    for(const xv of [-18,18]){
      const wl=MeshBuilder.CreateBox("hEnd"+xv,{width:0.2,height:FH,depth:4},this._scene);
      wl.position.set(xv,FH/2,0); wl.material=wm;
      this._walls.push({cx:xv,cz:0,hw:0.1,hd:2});
    }

    // Rooms
    room("A",-13, 7, 5,5,0,"S");   // Ms. Bisque's room A
    room("B",  0, 7, 4,5,0,"S");   // Room B
    room("C", 13, 7, 5,5,0,"S");   // Room C
    room("G",  0,-7, 8,5,0,"N");   // Gym

    // Furniture in each room
    // Room A: 4 desks + bookshelf
    this._addDesk("A1",-16, 5,   0.9,0.45,0.65); this._addDesk("A2",-13, 5,   0.9,0.45,0.65);
    this._addDesk("A3",-16, 8,   0.9,0.45,0.65); this._addDesk("A4",-13, 8,   0.9,0.45,0.65);
    this._addHideBox("Ashelf",-17.5,1.5,6.5, 0.6,3,2.5, 0.4,0.25,0.1);
    this._addDesk("Ateach",-12,3.5, 1.5,0.6,0.9);

    // Room B: 4 desks + cabinet
    this._addDesk("B1",-2, 5,   0.9,0.45,0.65); this._addDesk("B2", 1, 5,   0.9,0.45,0.65);
    this._addDesk("B3",-2, 8,   0.9,0.45,0.65); this._addDesk("B4", 1, 8,   0.9,0.45,0.65);
    this._addHideBox("Bcab", 3.5,1,6.5, 0.6,2,2, 0.38,0.28,0.22);

    // Room C: 4 desks + bookshelf
    this._addDesk("C1",10, 5,   0.9,0.45,0.65); this._addDesk("C2",13, 5,   0.9,0.45,0.65);
    this._addDesk("C3",10, 8,   0.9,0.45,0.65); this._addDesk("C4",13, 8,   0.9,0.45,0.65);
    this._addHideBox("Cshelf",17.5,1.5,6.5, 0.6,3,2.5, 0.4,0.25,0.1);

    // Gym: bleachers + equipment boxes
    this._addHideBox("Gblch1",-7,0.5,-10, 2,1,4, 0.5,0.4,0.35);
    this._addHideBox("Gblch2", 7,0.5,-10, 2,1,4, 0.5,0.4,0.35);
    this._addHideBox("Geq1",   0,0.6, -10, 1.5,1.2,1.5, 0.3,0.5,0.3);
    this._addHideBox("Geq2",  -4,0.6, -8,  1,1,1, 0.4,0.3,0.5);

    // Hallway lockers along north wall
    for(let i=0;i<5;i++){
      this._addHideBox(`locker${i}`, -15+i*6, 1, -1.5, 1,2,0.5, 0.3,0.4,0.7);
    }

    // Hide spots list (for AI hiders to pick)
    this._hideSpots=[
      // Room A
      {x:-16,z:9},{x:-13,z:9},{x:-17.5,z:7},{x:-12,z:4},
      // Room B
      {x:-2,z:9},{x:1,z:9},{x:3.5,z:7},
      // Room C
      {x:10,z:9},{x:13,z:9},{x:17.5,z:7},
      // Gym
      {x:-7,z:-10},{x:7,z:-10},{x:0,z:-10},{x:-4,z:-8},
      // Hallway lockers
      {x:-15,z:-1.5},{x:-9,z:-1.5},{x:-3,z:-1.5},{x:3,z:-1.5},{x:9,z:-1.5},
    ];
  }

  private _addDesk(n:string,x:number,z:number,tw:number,th:number,td:number){
    const m=this._mat(n+"DM",0.68,0.48,0.22);
    const top=MeshBuilder.CreateBox(n+"T",{width:tw,height:0.07,depth:td},this._scene);
    top.position.set(x,th,z); top.material=m;
    [[0.35,0.25],[-0.35,0.25],[0.35,-0.25],[-0.35,-0.25]].forEach(([lx,lz],i)=>{
      const leg=MeshBuilder.CreateBox(n+"L"+i,{width:0.07,height:th,depth:0.07},this._scene);
      leg.position.set(x+lx,th/2,z+lz); leg.material=m;
    });
    this._walls.push({cx:x,cz:z,hw:tw/2,hd:td/2});
    this._hideSpots.push({x,z});
  }

  private _addHideBox(n:string,x:number,y:number,z:number,w:number,h:number,d:number,r:number,g:number,b:number){
    this._box(n,x,y,z,w,h,d,r,g,b,true);
    this._hideSpots.push({x,z});
  }

  private _buildEggy(){
    this._eggyMesh=MeshBuilder.CreateSphere("eggy",{diameterX:0.7,diameterY:0.9,diameterZ:0.7,segments:10},this._scene);
    this._eggyMesh.material=this._mat("eggyMat",1.0,0.55,0.05);
    // Eyes on +Z (camera-facing back)
    for(const s of [-1,1]){
      const eye=MeshBuilder.CreateSphere(`eggyE${s}`,{diameter:0.14},this._scene);
      eye.parent=this._eggyMesh; eye.position.set(s*0.17,0.12,0.32);
      eye.material=this._mat(`eM${s}`,0.05,0.05,0.05);
    }
    // Bow on top
    for(const s of [-1,1]){
      const bow=MeshBuilder.CreateBox(`bow${s}`,{width:0.17,height:0.1,depth:0.08},this._scene);
      bow.parent=this._eggyMesh; bow.position.set(s*0.09,0.47,0);
      bow.material=this._mat(`bowM${s}`,0.9,0.1,0.4);
    }
  }

  private _buildAiHiders(){
    const spots=[...this._hideSpots].sort(()=>Math.random()-0.5).slice(0,6);
    for(let i=0;i<6;i++){
      const sp=spots[i]??{x:(i-3)*3,z:5};
      const col=HIDER_COLORS[i];
      const mesh=MeshBuilder.CreateSphere(`aih${i}`,{diameterX:0.7,diameterY:0.9,diameterZ:0.7,segments:8},this._scene);
      mesh.position.set(sp.x,PLR_H,sp.z);
      const mat=new StandardMaterial(`aihM${i}`,this._scene);
      mat.diffuseColor=col; mesh.material=mat;
      // Eyes
      for(const s of [-1,1]){
        const eye=MeshBuilder.CreateSphere(`aihE${i}${s}`,{diameter:0.12},this._scene);
        eye.parent=mesh; eye.position.set(s*0.17,0.1,0.32);
        eye.material=this._mat(`aihEM${i}${s}`,0.05,0.05,0.05);
      }
      this._aiHiders.push({mesh,x:sp.x,z:sp.z,found:false,color:col});
    }
  }

  private _buildSeeker(){
    this._seekerMesh=MeshBuilder.CreateSphere("seeker",{diameterX:0.7,diameterY:0.9,diameterZ:0.7,segments:8},this._scene);
    this._seekerMesh.position.set(0,0.45,0);
    this._seekerMesh.material=this._mat("seekerMat",0.9,0.1,0.1);
    for(const s of [-1,1]){
      const eye=MeshBuilder.CreateSphere(`sE${s}`,{diameter:0.13},this._scene);
      eye.parent=this._seekerMesh; eye.position.set(s*0.17,0.1,-0.32);
      eye.material=this._mat(`sEM${s}`,0.05,0.05,0.05);
    }
    const q=MeshBuilder.CreateBox("sQ",{width:0.12,height:0.25,depth:0.12},this._scene);
    q.parent=this._seekerMesh; q.position.set(0,0.58,0);
    q.material=this._mat("qM",1,1,0.1);
  }

  // ── Input ──────────────────────────────────────────────────────────────────
  private _buildInput(){
    const kd=(e:KeyboardEvent)=>this._keys.add(e.code);
    const ku=(e:KeyboardEvent)=>this._keys.delete(e.code);
    window.addEventListener("keydown",kd);
    window.addEventListener("keyup",ku);

    let dn=false, lx=0, ly=0;
    const onMD=(e:MouseEvent)=>{dn=true;lx=e.clientX;ly=e.clientY;};
    const onMU=()=>{dn=false;};
    const onMM=(e:MouseEvent)=>{
      if(!dn)return;
      this._camYaw  +=(e.clientX-lx)*0.005;
      this._camPitch =Math.max(-0.8,Math.min(1.0,this._camPitch+(e.clientY-ly)*0.005));
      lx=e.clientX; ly=e.clientY;
    };
    window.addEventListener("mousedown",onMD);
    window.addEventListener("mouseup",onMU);
    window.addEventListener("mousemove",onMM);

    const onTS=(e:TouchEvent)=>{
      for(let i=0;i<e.changedTouches.length;i++){
        const t=e.changedTouches[i];
        if(t.clientX>window.innerWidth/2&&this._rTouchId===null){
          this._rTouchId=t.identifier;this._rTouchX=t.clientX;this._rTouchY=t.clientY;
        }
      }
    };
    const onTM=(e:TouchEvent)=>{
      for(let i=0;i<e.changedTouches.length;i++){
        const t=e.changedTouches[i];
        if(t.identifier===this._rTouchId){
          this._camYaw  +=(t.clientX-this._rTouchX)*0.005;
          this._camPitch =Math.max(-0.8,Math.min(1.0,this._camPitch+(t.clientY-this._rTouchY)*0.005));
          this._rTouchX=t.clientX;this._rTouchY=t.clientY;
        }
      }
    };
    const onTE=(e:TouchEvent)=>{
      for(let i=0;i<e.changedTouches.length;i++)
        if(e.changedTouches[i].identifier===this._rTouchId)this._rTouchId=null;
    };
    this._canvas.addEventListener("touchstart",onTS,{passive:true});
    this._canvas.addEventListener("touchmove",onTM,{passive:true});
    this._canvas.addEventListener("touchend",onTE);

    this._cleanup.push(()=>{
      window.removeEventListener("keydown",kd);
      window.removeEventListener("keyup",ku);
      window.removeEventListener("mousedown",onMD);
      window.removeEventListener("mouseup",onMU);
      window.removeEventListener("mousemove",onMM);
      this._canvas.removeEventListener("touchstart",onTS);
      this._canvas.removeEventListener("touchmove",onTM);
      this._canvas.removeEventListener("touchend",onTE);
    });
  }

  // ── Collision ──────────────────────────────────────────────────────────────
  private _resolveWalls(x:number,z:number,r:number):{x:number;z:number}{
    for(const w of this._walls){
      const ox=w.hw+r-Math.abs(x-w.cx);
      const oz=w.hd+r-Math.abs(z-w.cz);
      if(ox>0&&oz>0){ if(ox<oz) x+=ox*Math.sign(x-w.cx); else z+=oz*Math.sign(z-w.cz); }
    }
    return {x,z};
  }

  private _isNearHideSpot(x:number,z:number):boolean{
    for(const h of this._hideSpots){
      if(Math.sqrt((x-h.x)**2+(z-h.z)**2)<1.2)return true;
    }
    return false;
  }

  // ── Loop ───────────────────────────────────────────────────────────────────
  private _loop=(ts:number)=>{
    if(this._disposed)return;
    const dt=Math.min((ts-this._lastTs)/1000,0.05);
    this._lastTs=ts;
    if(this._phase==="hiding"||this._phase==="seeking") this._updateGame(dt);
    this._scene.render();
    this._raf=requestAnimationFrame(this._loop);
  };

  private _updateGame(dt:number){
    this._timer-=dt;
    if(this._timer<=0&&this._phase==="hiding"){
      this._timer=SEEK_PHASE; this._phase="seeking";
      this._hidersLeftEl.style.display="block";
      this._statusEl.textContent="Seeker is searching! Stay hidden! 🏃";
    }
    if(this._timer<=0&&this._phase==="seeking"){ this._endGame(!this._isSeeker); return; }

    // HUD
    if(this._phase==="hiding"){
      this._timerEl.textContent=`Hiding: ${Math.ceil(this._timer)}s`;
      this._timerEl.style.color="#ffc832";
    } else {
      const m=Math.floor(this._timer/60),s=Math.floor(this._timer%60);
      this._timerEl.textContent=`${m}:${String(s).padStart(2,"0")} left`;
      this._timerEl.style.color=this._timer<30?"#ff4444":"white";
      const left=this._aiHiders.filter(h=>!h.found).length + (this._isSeeker?0:1);
      this._hidersLeftEl.textContent=`🥚 Hiding: ${left}/7`;
    }

    this._updatePlayer(dt);
    if(this._phase==="seeking") this._updateSeeker(dt);
    this._updateCamera();

    // Hiding indicator
    const hideEl=document.getElementById("hideEl");
    if(hideEl) hideEl.style.display=this._isNearHideSpot(this._px,this._pz)?"block":"none";
  }

  private _updatePlayer(dt:number){
    const fwd={x:Math.sin(this._camYaw),z:Math.cos(this._camYaw)};
    const right={x:Math.cos(this._camYaw),z:-Math.sin(this._camYaw)};
    let mx=0,mz=0;
    if(this._keys.has("KeyW")||this._keys.has("ArrowUp"))   {mx+=fwd.x;  mz+=fwd.z;  }
    if(this._keys.has("KeyS")||this._keys.has("ArrowDown")) {mx-=fwd.x;  mz-=fwd.z;  }
    if(this._keys.has("KeyA")||this._keys.has("ArrowLeft")) {mx-=right.x;mz-=right.z;}
    if(this._keys.has("KeyD")||this._keys.has("ArrowRight")){mx+=right.x;mz+=right.z;}
    if(this._joyActive){
      const max=35,len=Math.sqrt(this._joyDx**2+this._joyDy**2);
      const nx=len>1?this._joyDx/len:0,ny=len>1?this._joyDy/len:0;
      mx+=fwd.x*-ny+right.x*nx; mz+=fwd.z*-ny+right.z*nx;
    }
    const len=Math.sqrt(mx*mx+mz*mz);
    if(len>0){mx/=len;mz/=len;}
    this._vx=mx*PLR_SPD; this._vz=mz*PLR_SPD;
    if(this._keys.has("Space")&&this._onGround){this._vy=JUMP_SPD;this._onGround=false;}
    this._vy+=G*dt;
    const nx2=this._px+this._vx*dt, nz2=this._pz+this._vz*dt;
    this._py+=this._vy*dt;
    if(this._py<=PLR_H){this._py=PLR_H;this._vy=0;this._onGround=true;}
    const res=this._resolveWalls(nx2,nz2,0.35);
    this._px=res.x; this._pz=res.z;
    this._eggyMesh.position.set(this._px,this._py,this._pz);
    if(len>0) this._eggyMesh.rotation.y=Math.atan2(this._vx,this._vz);
  }

  private _updateSeeker(dt:number){
    // Build list of unhidden targets (ai hiders + player)
    const targets:[number,number,boolean][] = this._aiHiders
      .filter(h=>!h.found)
      .map(h=>[h.x,h.z,this._isNearHideSpot(h.x,h.z)]);
    if(!this._isSeeker) targets.push([this._px,this._pz,this._isNearHideSpot(this._px,this._pz)]);

    if(targets.length===0){ this._endGame(false); return; }

    // Find nearest detectable target
    let closest:{dx:number,dz:number,dist:number,idx:number}|null=null;
    for(let i=0;i<targets.length;i++){
      const [tx,tz,hidden]=targets[i];
      const range=hidden?HIDDEN_DETECT:DETECT_RANGE;
      const dist=Math.sqrt((this._seekerX-tx)**2+(this._seekerZ-tz)**2);
      if(dist<range&&(!closest||dist<closest.dist)){
        closest={dx:tx-this._seekerX,dz:tz-this._seekerZ,dist,idx:i};
      }
    }

    if(closest){
      // Chase closest detected target
      const spd=SEEKER_SPD*dt;
      this._seekerX+=closest.dx/closest.dist*spd;
      this._seekerZ+=closest.dz/closest.dist*spd;
      // Check tag
      if(closest.dist<TAG_DIST){
        // Which target?
        const [tx,tz]=targets[closest.idx];
        // Is it an AI hider?
        const aiIdx=this._aiHiders.findIndex(h=>!h.found&&Math.abs(h.x-tx)<0.1&&Math.abs(h.z-tz)<0.1);
        if(aiIdx>=0){
          this._aiHiders[aiIdx].found=true;
          (this._aiHiders[aiIdx].mesh.material as StandardMaterial).diffuseColor=new Color3(0.9,0.1,0.1);
        } else if(!this._isSeeker){
          this._tagged();
        }
      }
    } else {
      // Patrol
      const wp=PATROL_PTS[this._seekerPatrolIdx%PATROL_PTS.length];
      const dx=wp.x-this._seekerX,dz=wp.z-this._seekerZ;
      const dist=Math.sqrt(dx*dx+dz*dz);
      if(dist<0.5){
        this._seekerWaitTimer-=dt;
        if(this._seekerWaitTimer<=0){
          this._seekerPatrolIdx=(this._seekerPatrolIdx+1)%PATROL_PTS.length;
          this._seekerWaitTimer=1.0;
        }
      } else {
        this._seekerX+=dx/dist*SEEKER_SPD*0.7*dt;
        this._seekerZ+=dz/dist*SEEKER_SPD*0.7*dt;
      }
    }

    this._seekerMesh.position.set(this._seekerX,0.45,this._seekerZ);
    const fdx=this._seekerX-this._seekerTarget.x, fdz=this._seekerZ-this._seekerTarget.z;
    if(Math.abs(fdx)+Math.abs(fdz)>0.05) this._seekerMesh.rotation.y=Math.atan2(fdx,fdz);
    this._seekerTarget={x:this._seekerX,z:this._seekerZ};
  }

  private _updateCamera(){
    const camX=this._px-Math.sin(this._camYaw)*CAM_DIST*Math.cos(this._camPitch);
    const camY=this._py+PLR_H+Math.sin(this._camPitch)*CAM_DIST+CAM_HEIGHT*0.5;
    const camZ=this._pz-Math.cos(this._camYaw)*CAM_DIST*Math.cos(this._camPitch);
    this._cam.position.set(camX,Math.max(0.3,camY),camZ);
    this._cam.setTarget(new Vector3(this._px,this._py+PLR_H,this._pz));
  }

  private _tagged(){
    if(this._isSeeker)return;
    this._isSeeker=true;
    this._statusEl.textContent="You got TAGGED! 🔴";
    this._statusEl.style.color="#ff4444";
    (this._eggyMesh.material as StandardMaterial).diffuseColor=new Color3(0.9,0.1,0.1);
    const flash=document.createElement("div");
    Object.assign(flash.style,{position:"absolute",inset:"0",background:"rgba(255,0,0,0.4)",pointerEvents:"none",transition:"opacity 0.7s"});
    this._hud.appendChild(flash);
    requestAnimationFrame(()=>{flash.style.opacity="0";});
    setTimeout(()=>flash.remove(),800);
  }

  private _endGame(hidersWin:boolean){
    if(this._phase==="over")return;
    this._phase="over";
    cancelAnimationFrame(this._raf);
    const overlay=document.createElement("div");
    Object.assign(overlay.style,{
      position:"absolute",inset:"0",display:"flex",
      alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"20px",
      background:hidersWin?"rgba(0,60,0,0.88)":"rgba(80,0,0,0.88)",
      fontFamily:"'Fredoka One',sans-serif",pointerEvents:"all"
    });
    overlay.innerHTML=`
      <div style="font-size:64px">${hidersWin?"🥚":"🔴"}</div>
      <div style="color:white;font-size:32px;font-weight:bold;text-align:center">
        ${hidersWin?"Eggy survived! Hiders WIN!":"The seeker found everyone!"}
      </div>
      <div style="display:flex;gap:12px;margin-top:8px">
        <button id="eggyPA" style="background:#ffc832;color:#1a0a00;border:none;border-radius:12px;padding:14px 26px;font-size:18px;font-weight:bold;cursor:pointer;font-family:'Fredoka One',sans-serif;pointer-events:all;">Play Again</button>
        <button id="eggyBk" style="background:rgba(255,255,255,0.15);color:white;border:2px solid rgba(255,255,255,0.3);border-radius:12px;padding:14px 26px;font-size:18px;cursor:pointer;font-family:'Fredoka One',sans-serif;pointer-events:all;">Arcade</button>
      </div>
    `;
    this._hud.appendChild(overlay);
    document.getElementById("eggyPA")!.onclick=()=>{this._dispose();new EggyHideAndSeek(this._container,this._onEnd);};
    document.getElementById("eggyBk")!.onclick=()=>{this._dispose();this._onEnd(hidersWin,"");};
  }

  private _dispose(){
    if(this._disposed)return;
    this._disposed=true;
    cancelAnimationFrame(this._raf);
    this._cleanup.forEach(fn=>fn());
    this._engine.dispose();
    this._canvas.remove();
    this._hud.remove();
  }
}

// MinecraftGame.ts v4 — infinite world, biomes, day/night, sword
import { gpState } from "../../input/GamepadManager";
import type { Game } from "../../game/Game";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3, Color3, Color4 } from "@babylonjs/core/Maths/math";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";

// ── Block IDs ────────────────────────────────────────────────
const AIR=0,GRASS=1,DIRT=2,STONE=3,WOOD=4,LEAVES=5,SAND=6,GRAVEL=7,GLASS=8,BEDROCK=9;
const SNOW_B=10,ICE=11,SANDSTONE=12,CACTUS=13,GLOWSTONE=14;
const SWORD=100; // item only – never placed

const BLOCK_EMOJI:Record<number,string>={
  1:"🟩",2:"🟫",3:"⬜",4:"🪵",5:"🌿",6:"🟨",7:"▪️",8:"🪟",9:"⬛",
  10:"❄️",11:"🧊",12:"🟫",13:"🌵",14:"🌟",100:"⚔️",
};
const BLOCK_COL:Record<number,[number,number,number]>={
  1:[0.36,0.62,0.18],2:[0.55,0.37,0.20],3:[0.50,0.50,0.50],
  4:[0.55,0.37,0.22],5:[0.18,0.55,0.12],6:[0.87,0.80,0.55],
  7:[0.58,0.56,0.54],8:[0.80,0.95,1.00],9:[0.12,0.12,0.12],
  10:[0.90,0.95,1.00],11:[0.60,0.85,0.95],12:[0.75,0.65,0.40],
  13:[0.25,0.55,0.20],14:[1.00,0.90,0.30],
};
const MINE_SEC:Record<number,number>={
  1:0.9,2:0.75,3:1.5,4:1.25,5:0.4,6:0.75,7:0.75,8:0.5,9:Infinity,
  10:0.5,11:1.2,12:1.0,13:0.4,14:0.8,
};
const PLACEABLE=new Set([GRASS,DIRT,STONE,WOOD,LEAVES,SAND,GRAVEL,GLASS,SNOW_B,ICE,SANDSTONE,CACTUS,GLOWSTONE]);

// ── Chunk constants ───────────────────────────────────────────
const CX=16,CY=48,CZ=16;
const VDIST=2; // render 5×5 chunks around player
const cwi=(lx:number,ly:number,lz:number)=>lx*CY*CZ+ly*CZ+lz;

// ── Noise ─────────────────────────────────────────────────────
function h2(x:number,z:number):number{
  let h=((x*374761393)^(z*668265263))|0;
  h=((h^(h>>>13))*1274126177)|0;
  return ((h^(h>>>16))>>>0)/0xFFFFFFFF;
}
function sm(t:number){return t*t*(3-2*t);}
function vn(x:number,z:number):number{
  const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi;
  const a=h2(xi,zi),b=h2(xi+1,zi),c=h2(xi,zi+1),d=h2(xi+1,zi+1);
  const ux=sm(xf),uz=sm(zf);
  return a*(1-ux)*(1-uz)+b*ux*(1-uz)+c*(1-ux)*uz+d*ux*uz;
}
function oct(x:number,z:number,seed:number,octaves:number,scale:number):number{
  let v=0,amp=1,freq=1,mx=0;
  for(let i=0;i<octaves;i++){
    v+=vn((x+seed*137.1)*freq/scale,(z+seed*91.3)*freq/scale)*amp;
    mx+=amp;amp*=0.5;freq*=2;
  }
  return v/mx;
}

// ── Biomes ────────────────────────────────────────────────────
const PLAINS=0,FOREST=1,DESERT=2,TUNDRA=3,JUNGLE=4;
const BIOME_NAME=["🌾 Plains","🌲 Forest","🏜️ Desert","🌨️ Tundra","🌴 Jungle"];
function getBiome(gx:number,gz:number,seed:number):number{
  const t=oct(gx,gz,seed+11,3,400);
  const m=oct(gx,gz,seed+22,3,400);
  if(t<0.33) return TUNDRA;
  if(t>0.67&&m<0.40) return DESERT;
  if(t>0.60&&m>0.62) return JUNGLE;
  if(m>0.55) return FOREST;
  return PLAINS;
}
function getSurface(gx:number,gz:number,seed:number):number{
  const biome=getBiome(gx,gz,seed);
  const hn=oct(gx,gz,seed,4,80);
  const base=biome===DESERT?12:biome===TUNDRA?16:biome===JUNGLE?22:17;
  const vary=biome===DESERT?4:biome===FOREST?9:biome===JUNGLE?10:7;
  return Math.floor(base+hn*vary);
}

// ── World gen ─────────────────────────────────────────────────
function genChunk(cx:number,cz:number,seed:number,mods:Record<string,number>):Uint8Array{
  const data=new Uint8Array(CX*CY*CZ);
  for(let lx=0;lx<CX;lx++) for(let lz=0;lz<CZ;lz++){
    const gx=cx*CX+lx,gz=cz*CZ+lz;
    const biome=getBiome(gx,gz,seed);
    const surf=getSurface(gx,gz,seed);
    data[cwi(lx,0,lz)]=BEDROCK;
    for(let ly=1;ly<CY;ly++){
      if(ly>surf) break;
      // Cave (2D noise mapped to 3D via y-offset trick)
      const cv=vn((gx+ly*0.41)*0.11,(gz+ly*0.63)*0.11);
      if(cv<0.18&&ly>3&&ly<surf-2) continue;
      if(ly<=surf-4){
        const orv=h2(gx*997+ly,gz*1009+ly^(seed*7));
        if(ly<=7&&orv<0.006) data[cwi(lx,ly,lz)]=GLOWSTONE;
        else if(ly<=20&&orv<0.020) data[cwi(lx,ly,lz)]=GRAVEL;
        else data[cwi(lx,ly,lz)]=STONE;
      } else if(ly<surf){
        data[cwi(lx,ly,lz)]=biome===DESERT?SANDSTONE:DIRT;
      } else {
        if(biome===DESERT) data[cwi(lx,ly,lz)]=SAND;
        else if(biome===TUNDRA) data[cwi(lx,ly,lz)]=SNOW_B;
        else data[cwi(lx,ly,lz)]=GRASS;
      }
    }
    // Surface features
    const fv=h2(gx^(seed*13+7),gz^(seed*5+3));
    if(biome===DESERT&&fv<0.025&&surf+3<CY){
      const ch=2+Math.floor((fv*1000)%3);
      for(let dy=1;dy<=ch&&surf+dy<CY;dy++) data[cwi(lx,surf+dy,lz)]=CACTUS;
    } else {
      const tc=biome===FOREST?0.07:biome===JUNGLE?0.11:biome===TUNDRA?0.015:biome===PLAINS?0.013:0;
      if(fv<tc&&surf+8<CY){
        const th=biome===JUNGLE?7+Math.floor((fv*1000)%5):4+Math.floor((fv*1000)%3);
        for(let dy=1;dy<=th&&surf+dy<CY;dy++) data[cwi(lx,surf+dy,lz)]=WOOD;
        for(let lx2=Math.max(0,lx-2);lx2<=Math.min(CX-1,lx+2);lx2++)
          for(let lz2=Math.max(0,lz-2);lz2<=Math.min(CZ-1,lz+2);lz2++)
            for(let ly=surf+th-1;ly<=surf+th+2&&ly<CY;ly++)
              if(!data[cwi(lx2,ly,lz2)]) data[cwi(lx2,ly,lz2)]=LEAVES;
      }
    }
  }
  // Apply player mods for this chunk
  for(const[mk,mt] of Object.entries(mods)){
    const[mgx,mgy,mgz]=mk.split(",").map(Number);
    if(Math.floor(mgx/CX)!==cx||Math.floor(mgz/CZ)!==cz) continue;
    if(mgy<0||mgy>=CY) continue;
    const mlx=((mgx%CX)+CX)%CX,mlz=((mgz%CZ)+CZ)%CZ;
    data[cwi(mlx,mgy,mlz)]=mt;
  }
  return data;
}

// ── Save ──────────────────────────────────────────────────────
const MC_KEY="mc_worlds_v4";
interface MCWorld{id:string;name:string;seed:number;px:number;py:number;pz:number;created:number;mods:Record<string,number>;}
function loadWorlds():MCWorld[]{try{return JSON.parse(localStorage.getItem(MC_KEY)??"[]");}catch{return[];}}
function saveWorlds(ws:MCWorld[]):void{try{localStorage.setItem(MC_KEY,JSON.stringify(ws));}catch{console.warn("MC save failed: localStorage full");}}
function saveWorld(w:MCWorld):void{const ws=loadWorlds().filter(x=>x.id!==w.id);ws.push(w);saveWorlds(ws);}
function deleteWorld(id:string):void{saveWorlds(loadWorlds().filter(x=>x.id!==id));}

// ── Types ─────────────────────────────────────────────────────
interface Chunk{data:Uint8Array;meshes:Map<string,Mesh>;}
interface Mob{id:number;body:Mesh;head:Mesh;x:number;y:number;z:number;vy:number;hp:number;grounded:boolean;atkTimer:number;}
interface Slot{type:number;count:number;}

// ── Game class ────────────────────────────────────────────────
export class MinecraftGame {
  private _engine!:Engine; private _scene!:Scene; private _cam!:FreeCamera;
  private _canvas!:HTMLCanvasElement; private _wrap!:HTMLDivElement;
  private _worldMeta!:MCWorld;
  private _chunks=new Map<string,Chunk>();
  private _chunkQueue:Array<[number,number]>=[];
  private _mats=new Map<number,StandardMaterial>();
  private _hl!:Mesh;
  private _hemi!:HemisphericLight; private _sun!:DirectionalLight;
  private _dayTime=0.25; // 0=midnight 0.5=noon
  private _disposed=false; private _locked=false; private _started=false;
  private _pauseOv:HTMLDivElement|null=null;
  private _startOv:HTMLDivElement|null=null;
  private _lastAir:{x:number,y:number,z:number}|null=null;
  private _audioCtx:AudioContext|null=null;
  private _digSoundT=0; private _zombieGroanT=8;
  private _yaw=0; private _pitch=0; private _vy=0; private _grounded=false;
  private _keys=new Set<string>();
  private _creative=false;
  private _mineHeld=false; private _mineTgt:{x:number,y:number,z:number}|null=null; private _mineP=0;
  private _mineBar!:HTMLDivElement; private _mineWrap!:HTMLDivElement;
  private _slot=0;
  private _inv:Slot[]=[
    {type:SWORD,count:1},
    {type:AIR,count:0},{type:AIR,count:0},{type:AIR,count:0},
    {type:AIR,count:0},{type:AIR,count:0},{type:AIR,count:0},
    {type:AIR,count:0},{type:AIR,count:0},
  ];
  private _slotEls:HTMLDivElement[]=[];
  private _handEl!:HTMLDivElement;
  private _hp=20; private _heartEls:HTMLDivElement[]=[];
  private _dead=false; private _atkTimer=0;
  private _hunger=20; private _foodEls:HTMLDivElement[]=[];
  private _hungerTimer=0;
  private _xp=0; private _xpBarFill!:HTMLDivElement; private _xpNum!:HTMLDivElement;
  private _mobs:Mob[]=[]; private _mobSpawnT=15; private _mobId=0;
  private _mobBodyMat!:StandardMaterial; private _mobHeadMat!:StandardMaterial;
  private _mobMeshes=new Set<Mesh>();
  private _gRef:Game|null=null;
  // Admin panel
  private _adminOpen=false;
  private _killAura=false;
  private _adminOv:HTMLDivElement|null=null;

  constructor(g:Game){
    g.ui.innerHTML=""; g.inMiniGame=true;
    this._wrap=document.createElement("div");
    this._wrap.style.cssText="position:absolute;inset:0;overflow:hidden;pointer-events:all;background:#222;";
    g.ui.appendChild(this._wrap);

    if(window.matchMedia("(pointer:coarse)").matches){
      const ov=document.createElement("div");
      ov.style.cssText="position:absolute;inset:0;background:linear-gradient(160deg,#1a0000,#2a0a00);display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:all;font-family:Arial,sans-serif;gap:14px;padding:32px;text-align:center;";
      ov.innerHTML=
        `<div style="font-size:64px;">💻</div>`+
        `<div style="color:#ff4444;font-size:22px;font-weight:900;font-family:'Arial Black',Arial,sans-serif;">NOT FOR MOBILE</div>`+
        `<div style="color:#ff8888;font-size:15px;">Minecraft will crash on mobile.<br>Play on a computer instead!</div>`;
      const backBtn=document.createElement("button");
      backBtn.textContent="← Back to Arcade";
      backBtn.style.cssText="margin-top:8px;background:rgba(255,255,255,0.1);color:white;font-size:15px;font-weight:bold;padding:12px 28px;border-radius:20px;border:1.5px solid rgba(255,255,255,0.25);cursor:pointer;";
      backBtn.onclick=()=>{ g.ui.innerHTML=""; g.inMiniGame=false; import("../ArcadeScene").then(m=>new m.ArcadeScene(g)); };
      ov.appendChild(backBtn);
      this._wrap.appendChild(ov);
      return;
    }

    this._showWorldMenu(g);
  }

  // ── World menu ────────────────────────────────────────────────
  private _showWorldMenu(g:Game):void{
    this._wrap.innerHTML="";
    const worlds=loadWorlds();
    const menu=document.createElement("div");
    menu.style.cssText=
      "position:absolute;inset:0;background:linear-gradient(160deg,#1a2a0a,#0a1a00);"+
      "display:flex;flex-direction:column;align-items:center;justify-content:flex-start;"+
      "padding:40px 20px;overflow-y:auto;pointer-events:all;";
    menu.innerHTML=
      `<div style="font-size:48px;margin-bottom:10px;">⛏️</div>`+
      `<h2 style="color:white;font-size:26px;font-weight:900;font-family:'Arial Black',Arial,sans-serif;margin-bottom:4px;">Minecraft</h2>`+
      `<p style="color:rgba(255,255,255,0.4);font-size:13px;font-family:Arial,sans-serif;margin-bottom:24px;">Infinite worlds • 5 biomes • Survive the night</p>`+
      `<div id="mcWorldList" style="width:100%;max-width:360px;display:flex;flex-direction:column;gap:10px;"></div>`+
      `<button id="mcNewWorld" style="margin-top:16px;background:linear-gradient(135deg,#1a6b00,#4caf50);color:white;`+
      `font-size:16px;font-weight:bold;padding:12px 32px;border-radius:20px;`+
      `border:2px solid rgba(100,255,100,0.4);cursor:pointer;font-family:Arial,sans-serif;">+ New World</button>`+
      `<button id="mcBackBtn" style="margin-top:12px;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);`+
      `font-size:13px;padding:8px 20px;border-radius:16px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;">← Back to Arcade</button>`;
    this._wrap.appendChild(menu);
    const list=menu.querySelector("#mcWorldList")!;
    if(worlds.length===0){
      list.innerHTML=`<div style="color:rgba(255,255,255,0.3);font-size:13px;text-align:center;font-family:Arial,sans-serif;">No worlds yet — create one!</div>`;
    } else {
      worlds.slice().reverse().forEach(w=>{
        const row=document.createElement("div");
        row.style.cssText="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.07);"+
          "border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:12px 16px;";
        row.innerHTML=
          `<div style="flex:1;">`+
            `<div style="color:white;font-size:15px;font-weight:bold;font-family:Arial,sans-serif;">${w.name}</div>`+
            `<div style="color:rgba(255,255,255,0.35);font-size:11px;font-family:Arial,sans-serif;">Seed: ${w.seed} • ${new Date(w.created).toLocaleDateString()}</div>`+
          `</div>`+
          `<button data-play="${w.id}" style="background:#4caf50;color:white;border:none;border-radius:10px;padding:6px 14px;font-size:13px;font-weight:bold;cursor:pointer;">▶ Play</button>`+
          `<button data-del="${w.id}" style="background:rgba(255,60,60,0.3);color:#ff8888;border:1px solid rgba(255,60,60,0.3);border-radius:10px;padding:6px 10px;font-size:13px;cursor:pointer;">🗑</button>`;
        list.appendChild(row);
      });
      list.querySelectorAll("[data-play]").forEach(btn=>{
        (btn as HTMLElement).onclick=()=>{
          const id=(btn as HTMLElement).dataset.play!;
          const w=loadWorlds().find(x=>x.id===id);
          if(w) this._startGame(g,w);
        };
      });
      list.querySelectorAll("[data-del]").forEach(btn=>{
        (btn as HTMLElement).onclick=()=>{deleteWorld((btn as HTMLElement).dataset.del!);this._showWorldMenu(g);};
      });
    }
    menu.querySelector("#mcNewWorld")!.addEventListener("click",()=>{
      const seed=Math.floor(Math.random()*99999)+1;
      const surf=getSurface(0,0,seed);
      const w:MCWorld={id:Date.now().toString(),name:`World ${loadWorlds().length+1}`,seed,px:0.5,py:surf+2.5,pz:0.5,created:Date.now(),mods:{}};
      saveWorld(w); this._startGame(g,w);
    });
    menu.querySelector("#mcBackBtn")!.addEventListener("click",()=>{
      g.ui.innerHTML=""; g.inMiniGame=false;
      import("../ArcadeScene").then(m=>new m.ArcadeScene(g));
    });
  }

  // ── Start game ────────────────────────────────────────────────
  private _startGame(g:Game,meta:MCWorld):void{
    this._worldMeta=meta;
    this._wrap.innerHTML="";
    this._canvas=document.createElement("canvas");
    this._canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;pointer-events:all;";
    this._wrap.appendChild(this._canvas);
    try{
      this._initScene();
      this._cam.position.set(meta.px,meta.py,meta.pz);
      // Load immediate 3×3 chunks synchronously so player doesn't spawn in void
      const pcx=Math.floor(meta.px/CX),pcz=Math.floor(meta.pz/CZ);
      for(let dx=-1;dx<=1;dx++) for(let dz=-1;dz<=1;dz++) this._loadChunk(pcx+dx,pcz+dz);
      this._queueChunks();
      this._buildUI(g);
      this._bindEvents(g);
      this._engine.runRenderLoop(()=>{
        if(this._disposed) return;
        try{const dt=Math.min(this._engine.getDeltaTime()/1000,0.1);this._tick(dt);this._scene.render();}
        catch(e){console.error("[MC]",e);}
      });
      window.addEventListener("resize",this._onResize);
    }catch(e){
      console.error("[MC startGame]",e);
      const er=document.createElement("div");
      er.style.cssText="position:absolute;inset:0;background:#111;color:#f88;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:all;font-family:Arial;";
      er.innerHTML=`<div>Error: ${String(e)}</div><button style="margin-top:12px;padding:8px 20px;cursor:pointer;">Back</button>`;
      er.querySelector("button")!.onclick=()=>this._showWorldMenu(g);
      this._wrap.innerHTML=""; this._wrap.appendChild(er);
    }
  }

  // ── Scene ─────────────────────────────────────────────────────
  private _initScene():void{
    this._engine=new Engine(this._canvas,true,{preserveDrawingBuffer:false});
    this._scene=new Scene(this._engine);
    this._scene.clearColor=new Color4(0.52,0.80,0.97,1);
    this._hemi=new HemisphericLight("h",new Vector3(0,1,0),this._scene);
    this._hemi.intensity=0.75; this._hemi.diffuse=new Color3(1,1,0.95);
    this._sun=new DirectionalLight("s",new Vector3(-1,-2,-1).normalize(),this._scene);
    this._sun.intensity=0.55;
    this._cam=new FreeCamera("c",new Vector3(0,24,0),this._scene);
    this._cam.minZ=0.1; this._cam.maxZ=200;
    this._hl=MeshBuilder.CreateBox("_hl",{size:1.03},this._scene);
    this._hl.isPickable=false; this._hl.isVisible=false;
    const hlm=new StandardMaterial("_hlm",this._scene);
    hlm.wireframe=true; hlm.emissiveColor=new Color3(1,1,1);
    this._hl.material=hlm;
    this._mobBodyMat=new StandardMaterial("mob_body",this._scene);
    this._mobBodyMat.diffuseColor=new Color3(0.18,0.55,0.22);
    this._mobBodyMat.specularColor=new Color3(0,0,0);
    this._mobHeadMat=new StandardMaterial("mob_head",this._scene);
    this._mobHeadMat.diffuseColor=new Color3(0.12,0.38,0.15);
    this._mobHeadMat.specularColor=new Color3(0,0,0);
  }
  private _mat(type:number):StandardMaterial{
    if(!this._mats.has(type)){
      const m=new StandardMaterial(`m${type}`,this._scene);
      const c=BLOCK_COL[type]??[1,0,1];
      m.diffuseColor=new Color3(c[0],c[1],c[2]);
      m.specularColor=new Color3(0.05,0.05,0.05);
      if(type===GLASS){m.alpha=0.55;m.backFaceCulling=false;}
      if(type===LEAVES){m.alpha=0.88;m.backFaceCulling=false;}
      if(type===GLOWSTONE){m.emissiveColor=new Color3(0.5,0.45,0);}
      this._mats.set(type,m);
    }
    return this._mats.get(type)!;
  }

  // ── Chunk management ──────────────────────────────────────────
  private _getBlock(gx:number,gy:number,gz:number):number{
    if(gy<0) return BEDROCK;
    if(gy>=CY) return AIR;
    const cx=Math.floor(gx/CX),cz=Math.floor(gz/CZ);
    const chunk=this._chunks.get(`${cx},${cz}`);
    if(!chunk) return AIR;
    const lx=((gx%CX)+CX)%CX,lz=((gz%CZ)+CZ)%CZ;
    return chunk.data[cwi(lx,gy,lz)];
  }
  private _setBlock(gx:number,gy:number,gz:number,type:number):void{
    if(gy<0||gy>=CY) return;
    const cx=Math.floor(gx/CX),cz=Math.floor(gz/CZ);
    const chunk=this._chunks.get(`${cx},${cz}`);
    if(!chunk) return;
    const lx=((gx%CX)+CX)%CX,lz=((gz%CZ)+CZ)%CZ;
    chunk.data[cwi(lx,gy,lz)]=type;
    this._worldMeta.mods[`${gx},${gy},${gz}`]=type;
    const key=`${gx},${gy},${gz}`;
    if(type===AIR){
      chunk.meshes.get(key)?.dispose(); chunk.meshes.delete(key);
      for(const[dx,dy,dz] of[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
        const nt=this._getBlock(gx+dx,gy+dy,gz+dz);
        if(nt!==AIR) this._ensureMesh(gx+dx,gy+dy,gz+dz,nt);
      }
    } else {
      this._ensureMesh(gx,gy,gz,type);
      for(const[dx,dy,dz] of[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
        const nx=gx+dx,ny=gy+dy,nz=gz+dz;
        const nt=this._getBlock(nx,ny,nz);
        if(nt!==AIR&&!this._isExposed(nx,ny,nz)){
          const ncx=Math.floor(nx/CX),ncz=Math.floor(nz/CZ);
          const nc=this._chunks.get(`${ncx},${ncz}`);
          const nk=`${nx},${ny},${nz}`;
          nc?.meshes.get(nk)?.dispose(); nc?.meshes.delete(nk);
        }
      }
    }
  }
  private _isExposed(gx:number,gy:number,gz:number):boolean{
    for(const[dx,dy,dz] of[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
      const t=this._getBlock(gx+dx,gy+dy,gz+dz);
      if(t===AIR||t===GLASS||t===LEAVES) return true;
    }
    return false;
  }
  private _ensureMesh(gx:number,gy:number,gz:number,type:number):void{
    if(!this._isExposed(gx,gy,gz)) return;
    const cx=Math.floor(gx/CX),cz=Math.floor(gz/CZ);
    const chunk=this._chunks.get(`${cx},${cz}`);
    if(!chunk) return;
    const key=`${gx},${gy},${gz}`;
    if(chunk.meshes.has(key)) return;
    const m=MeshBuilder.CreateBox(key,{size:1},this._scene);
    m.position.set(gx+0.5,gy+0.5,gz+0.5); m.material=this._mat(type);
    m.isPickable=false;
    chunk.meshes.set(key,m);
  }
  private _loadChunk(cx:number,cz:number):void{
    const key=`${cx},${cz}`;
    if(this._chunks.has(key)) return;
    const data=genChunk(cx,cz,this._worldMeta.seed,this._worldMeta.mods);
    const meshes=new Map<string,Mesh>();
    this._chunks.set(key,{data,meshes});
    for(let lx=0;lx<CX;lx++) for(let ly=0;ly<CY;ly++) for(let lz=0;lz<CZ;lz++){
      const t=data[cwi(lx,ly,lz)];
      if(t===AIR) continue;
      const gx=cx*CX+lx,gy=ly,gz=cz*CZ+lz;
      if(!this._isExposed(gx,gy,gz)) continue;
      const mk=`${gx},${gy},${gz}`;
      const m=MeshBuilder.CreateBox(mk,{size:1},this._scene);
      m.position.set(gx+0.5,gy+0.5,gz+0.5); m.material=this._mat(t);
      m.isPickable=false;
      meshes.set(mk,m);
    }
  }
  private _unloadChunk(cx:number,cz:number):void{
    const key=`${cx},${cz}`;
    const chunk=this._chunks.get(key);
    if(!chunk) return;
    chunk.meshes.forEach(m=>m.dispose());
    this._chunks.delete(key);
  }
  private _queueChunks():void{
    const pcx=Math.floor(this._cam.position.x/CX);
    const pcz=Math.floor(this._cam.position.z/CZ);
    for(let dx=-VDIST;dx<=VDIST;dx++) for(let dz=-VDIST;dz<=VDIST;dz++){
      const cx=pcx+dx,cz=pcz+dz;
      const key=`${cx},${cz}`;
      if(!this._chunks.has(key)&&!this._chunkQueue.find(([a,b])=>a===cx&&b===cz))
        this._chunkQueue.push([cx,cz]);
    }
    this._chunkQueue.sort(([ax,az],[bx,bz])=>
      (ax-pcx)**2+(az-pcz)**2-(bx-pcx)**2-(bz-pcz)**2);
  }
  private _processChunkQueue():void{
    for(let i=0;i<2&&this._chunkQueue.length>0;i++){
      const[cx,cz]=this._chunkQueue.shift()!;
      this._loadChunk(cx,cz);
    }
    const pcx=Math.floor(this._cam.position.x/CX);
    const pcz=Math.floor(this._cam.position.z/CZ);
    for(const[key] of this._chunks){
      const[cx,cz]=key.split(",").map(Number);
      if(Math.abs(cx-pcx)>VDIST+1||Math.abs(cz-pcz)>VDIST+1) this._unloadChunk(cx,cz);
    }
  }
  private _solid(gx:number,gy:number,gz:number):boolean{
    const x=Math.floor(gx),y=Math.floor(gy),z=Math.floor(gz);
    if(y<0) return true; if(y>=CY) return false;
    const cx=Math.floor(x/CX),cz=Math.floor(z/CZ);
    if(!this._chunks.has(`${cx},${cz}`)) return true; // treat unloaded as solid
    const t=this._getBlock(x,y,z);
    return t!==AIR&&t!==GLASS&&t!==LEAVES&&t!==CACTUS;
  }

  // ── HUD ───────────────────────────────────────────────────────
  private _buildUI(g:Game):void{
    const top=document.createElement("div");
    top.style.cssText="position:absolute;top:0;left:0;right:0;padding:8px 12px;"+
      "display:flex;align-items:center;gap:8px;z-index:10;"+
      "background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);pointer-events:all;";
    top.innerHTML=
      `<button id="mcBack" style="background:rgba(255,255,255,0.1);color:#fff;border:1.5px solid rgba(255,255,255,0.25);border-radius:16px;padding:5px 14px;font-size:13px;font-weight:bold;cursor:pointer;font-family:Arial,sans-serif;">← Back</button>`+
      `<span id="mcBiome" style="color:rgba(255,255,255,0.5);font-size:12px;font-family:Arial,sans-serif;flex:1;text-align:center;"></span>`+
      `<span id="mcClock" style="color:rgba(255,255,255,0.5);font-size:12px;font-family:Arial,sans-serif;min-width:60px;text-align:right;"></span>`;
    this._wrap.appendChild(top);
    top.querySelector("#mcBack")!.addEventListener("click",()=>this._saveAndExit(g));

    const xh=document.createElement("div");
    xh.style.cssText="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:22px;height:22px;pointer-events:none;z-index:10;";
    xh.innerHTML=
      `<div style="position:absolute;top:50%;left:0;right:0;height:2px;background:rgba(255,255,255,0.85);transform:translateY(-50%);"></div>`+
      `<div style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:rgba(255,255,255,0.85);transform:translateX(-50%);"></div>`;
    this._wrap.appendChild(xh);

    this._handEl=document.createElement("div");
    this._handEl.style.cssText="position:absolute;bottom:80px;right:24px;pointer-events:none;z-index:10;width:64px;height:90px;transform:rotate(-18deg);";
    this._wrap.appendChild(this._handEl);
    this._updateHand();

    this._mineWrap=document.createElement("div");
    this._mineWrap.style.cssText="position:absolute;bottom:130px;left:50%;transform:translateX(-50%);width:180px;height:8px;background:rgba(0,0,0,0.5);border-radius:4px;overflow:hidden;z-index:10;pointer-events:none;display:none;border:1px solid rgba(255,255,255,0.2);";
    this._mineBar=document.createElement("div");
    this._mineBar.style.cssText="height:100%;width:0%;background:#e07000;border-radius:4px;";
    this._mineWrap.appendChild(this._mineBar);
    this._wrap.appendChild(this._mineWrap);

    const bottomHUD=document.createElement("div");
    bottomHUD.style.cssText="position:absolute;bottom:0;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:3px;z-index:10;pointer-events:all;padding-bottom:8px;";
    const statsRow=document.createElement("div");
    statsRow.style.cssText="display:flex;align-items:center;gap:16px;";
    const heartRow=document.createElement("div"); heartRow.style.cssText="display:flex;gap:2px;";
    for(let i=0;i<10;i++){const h=document.createElement("div");h.style.cssText="font-size:16px;line-height:1;";h.textContent="❤️";heartRow.appendChild(h);this._heartEls.push(h);}
    this._xpNum=document.createElement("div");
    this._xpNum.style.cssText="color:#7fff00;font-size:13px;font-weight:bold;font-family:'Arial Black',Arial,sans-serif;min-width:32px;text-align:center;";
    this._xpNum.textContent="0";
    const foodRow=document.createElement("div"); foodRow.style.cssText="display:flex;gap:2px;";
    for(let i=0;i<10;i++){const f=document.createElement("div");f.style.cssText="font-size:16px;line-height:1;";f.textContent="🍗";foodRow.appendChild(f);this._foodEls.push(f);}
    statsRow.appendChild(heartRow); statsRow.appendChild(this._xpNum); statsRow.appendChild(foodRow);
    bottomHUD.appendChild(statsRow);
    const xpBarWrap=document.createElement("div");
    xpBarWrap.style.cssText="width:432px;max-width:95vw;height:6px;background:rgba(0,0,0,0.6);border-radius:3px;overflow:hidden;";
    this._xpBarFill=document.createElement("div");
    this._xpBarFill.style.cssText="height:100%;width:0%;background:#7fff00;border-radius:3px;transition:width 0.2s;";
    xpBarWrap.appendChild(this._xpBarFill); bottomHUD.appendChild(xpBarWrap);
    const hb=document.createElement("div"); hb.style.cssText="display:flex;gap:4px;";
    for(let i=0;i<9;i++){
      const s=document.createElement("div");
      s.style.cssText=`width:46px;height:46px;background:rgba(0,0,0,0.65);border:2px solid ${i===0?"#FFD700":"rgba(255,255,255,0.3)"};border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;font-size:20px;position:relative;user-select:none;`;
      s.addEventListener("click",()=>this._setSlot(i));
      this._slotEls.push(s); hb.appendChild(s);
    }
    bottomHUD.appendChild(hb);
    this._wrap.appendChild(bottomHUD);
    for(let i=0;i<9;i++) this._refreshSlot(i);

    const ov=document.createElement("div");
    ov.style.cssText="position:absolute;inset:0;background:rgba(0,0,0,0.6);z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:all;cursor:pointer;";
    ov.innerHTML=
      `<div style="font-size:56px;margin-bottom:14px;">⛏️</div>`+
      `<div style="color:white;font-size:26px;font-weight:900;font-family:'Arial Black',Arial,sans-serif;margin-bottom:8px;">Minecraft</div>`+
      `<div style="color:rgba(255,255,255,0.65);font-size:15px;font-family:Arial,sans-serif;margin-bottom:4px;">Click to start</div>`+
      `<div style="color:rgba(255,255,255,0.35);font-size:12px;font-family:Arial,sans-serif;">Esc to pause · WASD/Space/Shift · Scroll hotbar · Right-click to place</div>`;
    this._wrap.appendChild(ov);
    this._startOv=ov;
  }
  private _refreshSlot(i:number):void{
    const el=this._slotEls[i]; const s=this._inv[i];
    el.innerHTML="";
    el.style.borderColor=i===this._slot?"#FFD700":"rgba(255,255,255,0.3)";
    if(s.type!==AIR){
      el.textContent=BLOCK_EMOJI[s.type]??"?";
      if(!this._creative&&s.type!==SWORD){
        const cnt=document.createElement("span");
        cnt.style.cssText="position:absolute;bottom:1px;right:3px;color:white;font-size:9px;font-weight:bold;font-family:Arial;text-shadow:1px 1px 0 #000;";
        cnt.textContent=String(s.count); el.appendChild(cnt);
      }
    }
    el.addEventListener("click",()=>this._setSlot(i));
  }
  private _setSlot(i:number):void{
    this._slotEls[this._slot].style.borderColor="rgba(255,255,255,0.3)";
    this._slot=i; this._slotEls[i].style.borderColor="#FFD700";
    this._updateHand();
  }
  private _updateHand():void{
    if(!this._handEl) return;
    const s=this._inv[this._slot];
    if(s.type===SWORD){
      this._handEl.innerHTML=`<div style="font-size:48px;transform:rotate(30deg);margin:8px;display:block;text-align:center;">⚔️</div>`;
    } else if(s.type!==AIR&&BLOCK_COL[s.type]){
      const c=BLOCK_COL[s.type];
      const col=`rgb(${Math.round(c[0]*255)},${Math.round(c[1]*255)},${Math.round(c[2]*255)})`;
      this._handEl.innerHTML=
        `<div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:36px;height:56px;background:#1a5fc8;border-radius:4px 4px 6px 6px;box-shadow:inset -4px 0 0 rgba(0,0,0,0.25);"></div>`+
        `<div style="position:absolute;bottom:42px;left:50%;transform:translateX(-50%);width:44px;height:42px;background:${col};border-radius:4px;box-shadow:inset -4px 0 0 rgba(0,0,0,0.2);"></div>`;
    } else {
      this._handEl.innerHTML=
        `<div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:36px;height:56px;background:#1a5fc8;border-radius:4px 4px 6px 6px;box-shadow:inset -4px 0 0 rgba(0,0,0,0.25);"></div>`+
        `<div style="position:absolute;bottom:42px;left:50%;transform:translateX(-50%);width:44px;height:42px;background:#e8c070;border-radius:4px;box-shadow:inset -4px 0 0 rgba(0,0,0,0.2);"></div>`;
    }
  }
  private _updateHearts():void{
    const full=Math.floor(this._hp/2),half=this._hp%2;
    for(let i=0;i<10;i++){
      if(i<full) this._heartEls[i].textContent="❤️";
      else if(i===full&&half) this._heartEls[i].textContent="🩷";
      else this._heartEls[i].textContent="🖤";
    }
  }
  private _updateFood():void{
    const full=Math.floor(this._hunger/2);
    for(let i=0;i<10;i++) this._foodEls[i].textContent=i<full?"🍗":"🦴";
  }
  private _updateXP():void{
    this._xpBarFill.style.width=(this._xp%100)+"%";
    this._xpNum.textContent=String(Math.floor(this._xp/100));
  }

  // ── Pause overlay ─────────────────────────────────────────────
  private _onLock=():void=>{
    if(this._isMobile){this._locked=true;return;}
    this._locked=document.pointerLockElement===this._canvas;
    if(this._locked){
      this._started=true;
      this._pauseOv?.remove(); this._pauseOv=null;
    } else {
      this._mineHeld=false; this._resetMine();
      if(this._started&&!this._disposed&&!this._dead&&!this._adminOpen){
        const ov=document.createElement("div");
        ov.style.cssText="position:absolute;inset:0;background:rgba(0,0,0,0.6);z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:all;gap:10px;";
        const btn=(label:string,cb:()=>void,bg="rgba(255,255,255,0.12)")=>{
          const b=document.createElement("button");
          b.style.cssText=`background:${bg};color:white;font-size:15px;font-weight:bold;padding:10px 40px;border-radius:16px;border:1.5px solid rgba(255,255,255,0.25);cursor:pointer;font-family:Arial,sans-serif;min-width:200px;`;
          b.textContent=label; b.onclick=cb; return b;
        };
        ov.appendChild(Object.assign(document.createElement("div"),{textContent:"⏸️ Paused",style:"color:white;font-size:26px;font-weight:900;font-family:'Arial Black',Arial,sans-serif;margin-bottom:8px;"}));
        ov.appendChild(btn("▶ Resume",()=>this._canvas.requestPointerLock(),"rgba(80,200,80,0.25)"));
        const modeBtn=btn(this._creative?"Switch to Survival":"Switch to Creative",()=>{
          this._creative=!this._creative;
          modeBtn.textContent=this._creative?"Switch to Survival":"Switch to Creative";
          for(let i=0;i<9;i++) this._refreshSlot(i);
        });
        ov.appendChild(modeBtn);
        ov.appendChild(btn("💾 Save & Exit",()=>this._saveAndExit(this._gRef!),"rgba(255,200,0,0.2)"));
        this._wrap.appendChild(ov); this._pauseOv=ov;
      }
    }
  };

  // ── Input ─────────────────────────────────────────────────────
  private _beforeUnload=():void=>{ this._doSave(); };
  private _bindEvents(g:Game):void{
    this._gRef=g;
    document.addEventListener("pointerlockchange",this._onLock);
    document.addEventListener("mousemove",this._onMove);
    document.addEventListener("keydown",this._onKeyDown);
    document.addEventListener("keyup",this._onKeyUp);
    this._canvas.addEventListener("wheel",this._onWheel,{passive:false});
    document.addEventListener("mousedown",this._onMouseDown);
    document.addEventListener("mouseup",this._onMouseUp);
    document.addEventListener("contextmenu",e=>e.preventDefault());
    window.addEventListener("beforeunload",this._beforeUnload);
    if(window.matchMedia("(pointer:coarse)").matches) this._setupTouchControls();
  }

  private _isMobile=false;
  private _touchHud:HTMLDivElement|null=null;
  private _joyActive=false; private _joyOx=0; private _joyOy=0;
  private _joyTouchId:number|null=null;
  private _lookTouchId:number|null=null; private _lookPrevX=0; private _lookPrevY=0;

  private _setupTouchControls():void{
    this._isMobile=true;
    this._locked=true;   // bypass pointer lock on mobile
    this._started=true;  // skip waiting for pointer lock to start
    this._startOv?.remove(); this._startOv=null;
    const hud=document.createElement("div");
    hud.style.cssText="position:absolute;inset:0;pointer-events:none;z-index:50;";
    this._canvas.parentElement!.appendChild(hud);
    this._touchHud=hud;

    // Joystick
    const joyBase=document.createElement("div");
    joyBase.style.cssText=
      "position:absolute;bottom:90px;left:30px;width:110px;height:110px;"+
      "border-radius:50%;background:rgba(255,255,255,0.12);border:2px solid rgba(255,255,255,0.25);"+
      "pointer-events:all;touch-action:none;";
    const joyDot=document.createElement("div");
    joyDot.style.cssText=
      "position:absolute;top:50%;left:50%;width:44px;height:44px;margin:-22px 0 0 -22px;"+
      "border-radius:50%;background:rgba(255,255,255,0.5);pointer-events:none;";
    joyBase.appendChild(joyDot);
    hud.appendChild(joyBase);

    const KMOVE=["KeyW","KeyS","KeyA","KeyD"] as const;
    const joyMove=(cx:number,cy:number)=>{
      const dx=cx-this._joyOx,dy=cy-this._joyOy;
      const dist=Math.min(Math.sqrt(dx*dx+dy*dy),40),ang=Math.atan2(dy,dx);
      joyDot.style.transform=`translate(${Math.cos(ang)*dist}px,${Math.sin(ang)*dist}px)`;
      const thr=12; KMOVE.forEach(k=>this._keys.delete(k));
      if(dy<-thr)this._keys.add("KeyW"); if(dy>thr)this._keys.add("KeyS");
      if(dx<-thr)this._keys.add("KeyA"); if(dx>thr)this._keys.add("KeyD");
    };
    joyBase.addEventListener("touchstart",e=>{
      e.preventDefault(); const t=e.changedTouches[0];
      this._joyTouchId=t.identifier; this._joyActive=true;
      const r=joyBase.getBoundingClientRect();
      this._joyOx=r.left+r.width/2; this._joyOy=r.top+r.height/2;
      joyMove(t.clientX,t.clientY);
    },{passive:false});
    joyBase.addEventListener("touchmove",e=>{
      e.preventDefault();
      for(const t of Array.from(e.changedTouches))
        if(t.identifier===this._joyTouchId) joyMove(t.clientX,t.clientY);
    },{passive:false});
    joyBase.addEventListener("touchend",e=>{
      for(const t of Array.from(e.changedTouches))
        if(t.identifier===this._joyTouchId){this._joyActive=false;this._joyTouchId=null;joyDot.style.transform="";KMOVE.forEach(k=>this._keys.delete(k));}
    });

    // Look area
    const lookArea=document.createElement("div");
    lookArea.style.cssText="position:absolute;top:0;right:0;width:55%;height:100%;pointer-events:all;touch-action:none;";
    hud.appendChild(lookArea);
    lookArea.addEventListener("touchstart",e=>{
      e.preventDefault(); const t=e.changedTouches[0];
      this._lookTouchId=t.identifier; this._lookPrevX=t.clientX; this._lookPrevY=t.clientY;
    },{passive:false});
    lookArea.addEventListener("touchmove",e=>{
      e.preventDefault();
      for(const t of Array.from(e.changedTouches)){
        if(t.identifier===this._lookTouchId){
          this._yaw+=(t.clientX-this._lookPrevX)*0.006;
          this._pitch=Math.max(-1.55,Math.min(1.55,this._pitch+(t.clientY-this._lookPrevY)*0.006));
          this._lookPrevX=t.clientX; this._lookPrevY=t.clientY;
        }
      }
    },{passive:false});
    lookArea.addEventListener("touchend",e=>{
      for(const t of Array.from(e.changedTouches))
        if(t.identifier===this._lookTouchId) this._lookTouchId=null;
    });

    // Jump
    const jumpBtn=document.createElement("div");
    jumpBtn.textContent="⬆";
    jumpBtn.style.cssText=
      "position:absolute;bottom:90px;right:30px;width:70px;height:70px;"+
      "border-radius:50%;background:rgba(100,180,255,0.25);border:2px solid rgba(100,180,255,0.5);"+
      "display:flex;align-items:center;justify-content:center;font-size:28px;"+
      "pointer-events:all;touch-action:none;user-select:none;";
    hud.appendChild(jumpBtn);
    jumpBtn.addEventListener("touchstart",e=>{e.preventDefault();this._keys.add("Space");},{passive:false});
    jumpBtn.addEventListener("touchend",()=>this._keys.delete("Space"));

    // Mine/place button (tap = mine, long press = place)
    const mineBtn=document.createElement("div");
    mineBtn.textContent="⛏";
    mineBtn.style.cssText=
      "position:absolute;bottom:90px;right:115px;width:60px;height:60px;"+
      "border-radius:50%;background:rgba(180,120,60,0.25);border:2px solid rgba(180,120,60,0.5);"+
      "display:flex;align-items:center;justify-content:center;font-size:26px;"+
      "pointer-events:all;touch-action:none;user-select:none;";
    hud.appendChild(mineBtn);
    mineBtn.addEventListener("touchstart",e=>{e.preventDefault();this._keys.add("__mine__");document.dispatchEvent(new MouseEvent("mousedown",{button:0,bubbles:true}));},{passive:false});
    mineBtn.addEventListener("touchend",()=>{this._keys.delete("__mine__");document.dispatchEvent(new MouseEvent("mouseup",{button:0,bubbles:true}));});
  }
  private _onMove=(e:MouseEvent):void=>{
    if(!this._locked) return;
    this._yaw+=e.movementX*0.002;
    this._pitch=Math.max(-1.55,Math.min(1.55,this._pitch+e.movementY*0.002));
  };
  private _onKeyDown=(e:KeyboardEvent):void=>{
    this._keys.add(e.code);
    if(e.code.startsWith("Digit")){const n=+e.code.slice(5)-1;if(n>=0&&n<9) this._setSlot(n);}
    if(e.code==="KeyP") this._toggleAdmin();
  };
  private _onKeyUp=(e:KeyboardEvent):void=>{this._keys.delete(e.code);};

  // ── Admin panel ───────────────────────────────────────────────
  private _toggleAdmin():void{
    if(this._adminOpen){
      this._adminOv?.remove(); this._adminOv=null;
      this._adminOpen=false;
      // Re-lock pointer if game is running
      if(this._started&&!this._dead) this._canvas.requestPointerLock();
    } else {
      this._adminOpen=true;
      if(this._locked) document.exitPointerLock();
      this._showAdminPanel();
    }
  }
  private _showAdminPanel():void{
    if(this._adminOv) return;
    const ov=document.createElement("div");
    ov.style.cssText=
      "position:absolute;inset:0;background:rgba(0,0,0,0.55);z-index:35;"+
      "display:flex;align-items:center;justify-content:center;pointer-events:all;";

    const panel=document.createElement("div");
    panel.style.cssText=
      "background:linear-gradient(160deg,#0a0a1a,#141428);"+
      "border:2px solid rgba(100,100,255,0.4);border-radius:20px;"+
      "padding:28px 32px;display:flex;flex-direction:column;align-items:center;gap:14px;"+
      "min-width:280px;box-shadow:0 0 40px rgba(80,80,255,0.3);pointer-events:all;";

    panel.innerHTML=
      `<div style="font-size:36px;">🛡️</div>`+
      `<div style="color:#aaaaff;font-size:22px;font-weight:900;font-family:'Arial Black',Arial,sans-serif;letter-spacing:2px;">ADMIN PANEL</div>`+
      `<div style="color:rgba(255,255,255,0.3);font-size:11px;font-family:Arial,sans-serif;">Press P to close</div>`;

    const mkBtn=(label:string,desc:string,active:boolean,cb:()=>void):HTMLButtonElement=>{
      const b=document.createElement("button");
      b.style.cssText=
        `width:100%;padding:12px 16px;border-radius:12px;cursor:pointer;font-family:Arial,sans-serif;`+
        `display:flex;align-items:center;justify-content:space-between;gap:10px;`+
        `background:${active?"rgba(80,220,80,0.15)":"rgba(255,255,255,0.07)"};`+
        `border:1.5px solid ${active?"rgba(80,220,80,0.5)":"rgba(255,255,255,0.15)"};color:white;`;
      b.innerHTML=
        `<div style="text-align:left;">`+
          `<div style="font-size:14px;font-weight:bold;">${label}</div>`+
          `<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">${desc}</div>`+
        `</div>`+
        `<div id="toggle_${label.replace(/\s/g,'')}" style="width:38px;height:20px;border-radius:10px;background:${active?"#4caf50":"#555"};position:relative;flex-shrink:0;">`+
          `<div style="width:16px;height:16px;border-radius:50%;background:white;position:absolute;top:2px;${active?"right:2px":"left:2px"};transition:all 0.15s;"></div>`+
        `</div>`;
      b.onclick=cb;
      return b;
    };

    const mkDangerBtn=(label:string,desc:string,cb:()=>void):HTMLButtonElement=>{
      const b=document.createElement("button");
      b.style.cssText=
        `width:100%;padding:12px 16px;border-radius:12px;cursor:pointer;font-family:Arial,sans-serif;`+
        `background:rgba(220,50,50,0.15);border:1.5px solid rgba(220,50,50,0.4);color:white;text-align:left;`;
      b.innerHTML=
        `<div style="font-size:14px;font-weight:bold;color:#ff8888;">${label}</div>`+
        `<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">${desc}</div>`;
      b.onclick=cb;
      return b;
    };

    // Kill Aura toggle
    const killAuraBtn=mkBtn("⚡ Kill Aura","Auto-kills mobs within 10 blocks",this._killAura,()=>{
      this._killAura=!this._killAura;
      // Rebuild the button to reflect new state
      const newBtn=mkBtn("⚡ Kill Aura","Auto-kills mobs within 10 blocks",this._killAura,killAuraBtn.onclick as ()=>void);
      killAuraBtn.replaceWith(newBtn);
    });
    panel.appendChild(killAuraBtn);

    // Kick from minigame
    panel.appendChild(mkDangerBtn(
      "🚪 Exit Minigame",
      "Leave Minecraft and return to Arcade",
      ()=>{ this._adminOpen=false; this._saveAndExit(this._gRef!); }
    ));

    // Close button
    const closeBtn=document.createElement("button");
    closeBtn.textContent="✕ Close  (P)";
    closeBtn.style.cssText=
      "margin-top:4px;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);"+
      "font-size:13px;padding:8px 24px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);cursor:pointer;font-family:Arial,sans-serif;width:100%;";
    closeBtn.onclick=()=>this._toggleAdmin();
    panel.appendChild(closeBtn);

    ov.appendChild(panel);
    this._wrap.appendChild(ov);
    this._adminOv=ov;
  }
  private _onWheel=(e:WheelEvent):void=>{e.preventDefault();this._setSlot((this._slot+(e.deltaY>0?1:-1)+9)%9);};
  private _onMouseDown=(e:MouseEvent):void=>{
    if(e.button===0){
      if(!this._locked){
        if(this._isMobile){this._locked=true;return;}
        this._startOv?.remove(); this._startOv=null;
        this._canvas.requestPointerLock(); return;
      }
      if(this._dead) return;
      this._mineHeld=true;
      const cosP=Math.cos(this._pitch);
      const rdx=Math.sin(this._yaw)*cosP,rdy=-Math.sin(this._pitch),rdz=Math.cos(this._yaw)*cosP;
      const rox=this._cam.position.x,roy=this._cam.position.y,roz=this._cam.position.z;
      let closestMob:Mesh|null=null; let closestDist=3.5;
      for(const mob of this._mobs){
        const ddx=mob.x-rox,ddy=(mob.y+0.5)-roy,ddz=mob.z-roz;
        const dist=Math.sqrt(ddx*ddx+ddy*ddy+ddz*ddz);
        if(dist>3.5) continue;
        const dot=(ddx*rdx+ddy*rdy+ddz*rdz)/dist;
        if(dot>0.96&&dist<closestDist){closestDist=dist;closestMob=mob.body;}
      }
      if(closestMob) this._attackMob(closestMob);
    }
    if(e.button===2&&this._locked&&!this._dead) this._place();
  };
  private _onMouseUp=(e:MouseEvent):void=>{if(e.button===0){this._mineHeld=false;this._resetMine();}};

  // ── Sound ─────────────────────────────────────────────────────
  private _sfx(type:'dig'|'break'|'place'|'player_hurt'|'mob_hurt'|'zombie_groan',blockType=GRASS):void{
    try{
      if(!this._audioCtx) this._audioCtx=new AudioContext();
      const ctx=this._audioCtx; const t=ctx.currentTime;
      if(type==='dig'||type==='break'){
        const len=type==='break'?0.18:0.12;
        const buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*len),ctx.sampleRate);
        const d=buf.getChannelData(0);
        for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length);
        const src=ctx.createBufferSource(); src.buffer=buf;
        const filt=ctx.createBiquadFilter(); filt.type='bandpass';
        filt.frequency.value=blockType===STONE||blockType===SANDSTONE?900:blockType===WOOD?350:blockType===SAND||blockType===GRAVEL?600:500;
        filt.Q.value=1.5;
        const g=ctx.createGain(); g.gain.setValueAtTime(type==='break'?0.7:0.35,t); g.gain.exponentialRampToValueAtTime(0.001,t+len);
        src.connect(filt); filt.connect(g); g.connect(ctx.destination); src.start(t);
      } else if(type==='place'){
        const buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.08),ctx.sampleRate);
        const d=buf.getChannelData(0);
        for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length);
        const src=ctx.createBufferSource(); src.buffer=buf;
        const filt=ctx.createBiquadFilter(); filt.type='highpass'; filt.frequency.value=800;
        const g=ctx.createGain(); g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.09);
        src.connect(filt); filt.connect(g); g.connect(ctx.destination); src.start(t);
      } else if(type==='player_hurt'){
        const osc=ctx.createOscillator(); const g=ctx.createGain();
        osc.type='sawtooth'; osc.frequency.setValueAtTime(280,t); osc.frequency.exponentialRampToValueAtTime(90,t+0.22);
        g.gain.setValueAtTime(0.45,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.25);
        osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t+0.25);
      } else if(type==='mob_hurt'){
        const osc=ctx.createOscillator(); const g=ctx.createGain();
        osc.type='square'; osc.frequency.setValueAtTime(160,t); osc.frequency.exponentialRampToValueAtTime(70,t+0.14);
        g.gain.setValueAtTime(0.3,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.18);
        osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t+0.18);
      } else if(type==='zombie_groan'){
        const osc=ctx.createOscillator(); const lfo=ctx.createOscillator(); const lfoG=ctx.createGain(); const g=ctx.createGain();
        osc.type='sawtooth'; osc.frequency.value=85;
        lfo.type='sine'; lfo.frequency.value=3; lfoG.gain.value=18;
        lfo.connect(lfoG); lfoG.connect(osc.frequency);
        g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.18,t+0.12); g.gain.exponentialRampToValueAtTime(0.001,t+0.9);
        osc.connect(g); g.connect(ctx.destination);
        lfo.start(t); osc.start(t); lfo.stop(t+0.9); osc.stop(t+0.9);
      }
    }catch(_){}
  }

  // ── Game loop ─────────────────────────────────────────────────
  private _tick(dt:number):void{
    this._processChunkQueue();
    if(!this._dead) this._tickDayNight(dt);
    if(this._dead) return;
    // Right stick → look (controller support)
    this._yaw   += gpState.rx * dt * 2.5;
    this._pitch  = Math.max(-1.55, Math.min(1.55, this._pitch + gpState.ry * dt * 2.0));
    this._cam.rotation.set(this._pitch,this._yaw,0);
    if(this._locked){
      const spd=this._creative?0.18:0.12;
      const fwd=this._cam.getDirection(new Vector3(0,0,1));
      const rgt=this._cam.getDirection(new Vector3(1,0,0));
      fwd.y=0; if(fwd.length()>0.001) fwd.normalize();
      rgt.y=0; if(rgt.length()>0.001) rgt.normalize();
      const mv=Vector3.Zero();
      if(this._keys.has("KeyW")||gpState.ly<-0.12) mv.addInPlace(fwd.scale(spd));
      if(this._keys.has("KeyS")||gpState.ly> 0.12) mv.addInPlace(fwd.scale(-spd));
      if(this._keys.has("KeyA")||gpState.lx<-0.12) mv.addInPlace(rgt.scale(-spd));
      if(this._keys.has("KeyD")||gpState.lx> 0.12) mv.addInPlace(rgt.scale(spd));
      if(this._creative){
        if(this._keys.has("Space")||gpState.btnA) mv.y+=spd;
        if(this._keys.has("ShiftLeft")||gpState.lb) mv.y-=spd;
      } else {
        this._vy=Math.max(this._vy-0.025,-0.5);
        if((this._keys.has("Space")||gpState.btnA)&&this._grounded) this._vy=0.25;
        mv.y+=this._vy;
      }
      this._applyMove(mv);
    }
    if(this._cam.position.y<-4) this._dieVoid();
    this._updatePick(dt);
    // Hunger drain
    if(!this._creative){
      this._hungerTimer+=dt;
      if(this._hungerTimer>30){this._hungerTimer=0;this._hunger=Math.max(0,this._hunger-1);this._updateFood();}
      if(this._hunger===0){this._hp=Math.max(1,this._hp-1);this._updateHearts();}
    }
    this._atkTimer=Math.max(0,this._atkTimer-dt);
    this._digSoundT=Math.max(0,this._digSoundT-dt);
    if(!this._creative&&this._mobs.length>0){
      this._zombieGroanT-=dt;
      if(this._zombieGroanT<=0){this._zombieGroanT=6+Math.random()*6;this._sfx('zombie_groan');}
    }
    // Mobs: spawn more at night
    if(!this._creative){
      this._mobSpawnT-=dt;
      const isNight=this._dayTime>0.55||this._dayTime<0.2;
      const maxMobs=isNight?8:3;
      if(this._mobSpawnT<=0&&this._mobs.length<maxMobs){
        this._mobSpawnT=isNight?12:25; this._spawnMob();
      }
      this._tickMobs(dt);
    }
    // Update biome/clock HUD
    const biomeEl=document.getElementById("mcBiome");
    if(biomeEl){
      const b=getBiome(Math.floor(this._cam.position.x),Math.floor(this._cam.position.z),this._worldMeta.seed);
      biomeEl.textContent=BIOME_NAME[b];
    }
    const clockEl=document.getElementById("mcClock");
    if(clockEl){
      const h=Math.floor(this._dayTime*24);
      const isDay=this._dayTime>0.2&&this._dayTime<0.75;
      clockEl.textContent=`${isDay?"☀️":"🌙"} ${h}:00`;
    }
    this._queueChunks();
  }
  private _tickDayNight(dt:number):void{
    this._dayTime=(this._dayTime+dt/600)%1;
    const t=this._dayTime;
    const angle=Math.cos(t*Math.PI*2); // 1=noon, -1=midnight
    const bright=Math.max(0,angle);
    const twi=Math.max(0,0.4-Math.abs(angle)*0.5);
    const nr=Math.min(1,0.02+bright*0.50+twi*0.88);
    const ng=Math.min(1,0.02+bright*0.78+twi*0.38);
    const nb=Math.min(1,0.08+bright*0.89+twi*0.18);
    this._scene.clearColor=new Color4(nr,ng,nb,1);
    this._hemi.intensity=0.15+bright*0.65;
    this._sun.intensity=0.08+bright*0.55;
  }
  private _applyMove(mv:Vector3):void{
    const p=this._cam.position; const r=0.3,h=0.9;
    p.x+=mv.x;
    if(this._solid(p.x-r,p.y,p.z)||this._solid(p.x+r,p.y,p.z)||this._solid(p.x-r,p.y-h,p.z)||this._solid(p.x+r,p.y-h,p.z)) p.x-=mv.x;
    p.z+=mv.z;
    if(this._solid(p.x,p.y,p.z-r)||this._solid(p.x,p.y,p.z+r)||this._solid(p.x,p.y-h,p.z-r)||this._solid(p.x,p.y-h,p.z+r)) p.z-=mv.z;
    p.y+=mv.y;
    if(mv.y<0){
      if(this._solid(p.x,p.y-h,p.z)||this._solid(p.x-r,p.y-h,p.z)||this._solid(p.x+r,p.y-h,p.z)||this._solid(p.x,p.y-h,p.z-r)||this._solid(p.x,p.y-h,p.z+r)){
        p.y-=mv.y; this._vy=0; this._grounded=true;
      } else {this._grounded=false;}
    } else if(mv.y>0){if(this._solid(p.x,p.y+0.1,p.z)){p.y-=mv.y;this._vy=0;}}
  }
  private _doPick():{hit:boolean,name:string|null}{
    const cosP=Math.cos(this._pitch);
    const dx=Math.sin(this._yaw)*cosP,dy=-Math.sin(this._pitch),dz=Math.cos(this._yaw)*cosP;
    const ox=this._cam.position.x,oy=this._cam.position.y,oz=this._cam.position.z;
    this._lastAir=null;
    let prevBx=Math.floor(ox),prevBy=Math.floor(oy),prevBz=Math.floor(oz);
    for(let t=0.05;t<=5.5;t+=0.04){
      const bx=Math.floor(ox+dx*t),by=Math.floor(oy+dy*t),bz=Math.floor(oz+dz*t);
      if(by<0||by>=CY){prevBx=bx;prevBy=by;prevBz=bz;continue;}
      if(this._getBlock(bx,by,bz)!==AIR){
        if(prevBx!==bx||prevBy!==by||prevBz!==bz) this._lastAir={x:prevBx,y:prevBy,z:prevBz};
        return {hit:true,name:`${bx},${by},${bz}`};
      }
      prevBx=bx;prevBy=by;prevBz=bz;
    }
    return {hit:false,name:null};
  }
  private _updatePick(dt:number):void{
    const p=this._doPick();
    if(!p.hit||!p.name){this._hl.isVisible=false;this._resetMine();return;}
    const[bx,by,bz]=p.name.split(",").map(Number);
    if(isNaN(bx)){this._hl.isVisible=false;this._resetMine();return;}
    this._hl.isVisible=true; this._hl.position.set(bx+0.5,by+0.5,bz+0.5);
    if(!this._mineHeld){this._resetMine();return;}
    const same=this._mineTgt&&this._mineTgt.x===bx&&this._mineTgt.y===by&&this._mineTgt.z===bz;
    if(!same){this._mineTgt={x:bx,y:by,z:bz};this._mineP=0;}
    const type=this._getBlock(bx,by,bz); if(type===BEDROCK) return;
    if(this._creative){this._break(bx,by,bz);return;}
    const time=MINE_SEC[type]??1;
    // Sword mines faster
    const mult=this._inv[this._slot].type===SWORD?2.5:1;
    this._mineP+=dt/time*mult;
    this._mineBar.style.width=Math.min(100,this._mineP*100)+"%";
    this._mineWrap.style.display="block";
    if(this._digSoundT<=0){this._digSoundT=0.38;this._sfx('dig',type);}
    if(this._mineP>=1) this._break(bx,by,bz);
  }
  private _resetMine():void{this._mineTgt=null;this._mineP=0;this._mineBar.style.width="0%";this._mineWrap.style.display="none";}
  private _break(gx:number,gy:number,gz:number):void{
    const type=this._getBlock(gx,gy,gz);
    this._sfx('break',type);
    this._setBlock(gx,gy,gz,AIR);
    this._hl.isVisible=false;
    if(!this._creative) this._pickup(type,1);
    this._xp+=5; this._updateXP();
    this._resetMine(); this._mineHeld=false;
  }
  private _pickup(type:number,n:number):void{
    for(let i=0;i<9;i++) if(this._inv[i].type===type){this._inv[i].count+=n;this._refreshSlot(i);return;}
    for(let i=0;i<9;i++) if(this._inv[i].type===AIR||this._inv[i].count===0){this._inv[i]={type,count:n};this._refreshSlot(i);return;}
  }
  private _place():void{
    const s=this._inv[this._slot];
    if(s.type===AIR||s.count<=0) return;
    if(s.type===SWORD||!PLACEABLE.has(s.type)) return;
    if(this._creative&&s.type===AIR) return;
    this._doPick();
    if(!this._lastAir) return;
    const{x:px,y:py,z:pz}=this._lastAir;
    if(py<0||py>=CY) return;
    if(this._getBlock(px,py,pz)!==AIR) return;
    const cp=this._cam.position;
    if(Math.abs(cp.x-(px+0.5))<0.5&&Math.abs(cp.y-(py+0.5))<1.0&&Math.abs(cp.z-(pz+0.5))<0.5) return;
    this._setBlock(px,py,pz,s.type);
    this._sfx('place',s.type);
    if(!this._creative){s.count--;if(s.count<=0){s.type=AIR;s.count=0;}this._refreshSlot(this._slot);}
  }

  // ── Mobs ──────────────────────────────────────────────────────
  private _spawnMob():void{
    const id=this._mobId++;
    const angle=Math.random()*Math.PI*2;
    const dist=12+Math.random()*8;
    const x=this._cam.position.x+Math.cos(angle)*dist;
    const z=this._cam.position.z+Math.sin(angle)*dist;
    const surf=getSurface(Math.floor(x),Math.floor(z),this._worldMeta.seed);
    const y=surf+1.5;
    if(y<=0||y>=CY) return;
    const body=MeshBuilder.CreateBox(`mob_body_${id}`,{width:0.8,height:1.2,depth:0.4},this._scene);
    body.position.set(x,y,z); body.material=this._mobBodyMat;
    const head=MeshBuilder.CreateBox(`mob_head_${id}`,{size:0.7},this._scene);
    head.position.set(x,y+0.95,z); head.material=this._mobHeadMat;
    this._mobMeshes.add(body); this._mobMeshes.add(head);
    this._mobs.push({id,body,head,x,y,z,vy:0,hp:6,grounded:false,atkTimer:0});
  }
  private _tickMobs(dt:number):void{
    const cp=this._cam.position;
    // Kill Aura: instantly destroy any mob within 10 blocks
    if(this._killAura){
      for(let i=this._mobs.length-1;i>=0;i--){
        const mob=this._mobs[i];
        const dx=mob.x-cp.x,dz=mob.z-cp.z;
        if(Math.sqrt(dx*dx+dz*dz)<=10) this._killMob(i);
      }
    }
    for(let i=this._mobs.length-1;i>=0;i--){
      const mob=this._mobs[i];
      mob.vy=Math.max(mob.vy-0.025,-0.5); mob.y+=mob.vy;
      const gx=Math.floor(mob.x),gy=Math.floor(mob.y-0.6),gz=Math.floor(mob.z);
      if(gy>=0&&gy<CY&&this._getBlock(gx,gy,gz)!==AIR){
        mob.y=gy+1.6; mob.vy=0; mob.grounded=true;
      } else {mob.grounded=false;}
      if(mob.y<-4){this._killMob(i);continue;}
      const dx=cp.x-mob.x,dz=cp.z-mob.z;
      const dist=Math.sqrt(dx*dx+dz*dz);
      if(dist>0.8&&dist<24){
        const spd=0.04;
        mob.x+=dx/dist*spd; mob.z+=dz/dist*spd;
        const mx=Math.floor(mob.x),mz=Math.floor(mob.z),my=Math.floor(mob.y);
        if(my>=0&&my<CY&&this._getBlock(mx,my,mz)!==AIR){
          mob.x-=dx/dist*spd; mob.z-=dz/dist*spd;
          if(mob.grounded) mob.vy=0.2;
        }
        mob.body.rotation.y=Math.atan2(dx,dz);
        mob.head.rotation.y=mob.body.rotation.y;
      }
      mob.atkTimer=Math.max(0,mob.atkTimer-dt);
      if(dist<1.5&&mob.atkTimer<=0){
        mob.atkTimer=1.2;
        this._hp=Math.max(0,this._hp-2);
        this._updateHearts(); this._sfx('player_hurt'); this._flashDamage();
        if(this._hp<=0) this._die();
      }
      mob.body.position.set(mob.x,mob.y,mob.z);
      mob.head.position.set(mob.x,mob.y+0.95,mob.z);
    }
  }
  private _attackMob(mesh:Mesh):void{
    if(this._atkTimer>0) return;
    this._atkTimer=0.25;
    const mob=this._mobs.find(m=>m.body===mesh||m.head===mesh);
    if(!mob) return;
    const dmg=this._inv[this._slot].type===SWORD?4:2;
    mob.hp-=dmg;
    this._sfx('mob_hurt');
    const origCol=(this._mobBodyMat.diffuseColor as Color3).clone();
    this._mobBodyMat.diffuseColor=new Color3(1,1,1);
    setTimeout(()=>{if(!this._disposed) this._mobBodyMat.diffuseColor=origCol;},100);
    if(mob.hp<=0) this._killMob(this._mobs.indexOf(mob));
    else{this._xp+=3;this._updateXP();}
  }
  private _killMob(i:number):void{
    const mob=this._mobs[i];
    this._mobMeshes.delete(mob.body); this._mobMeshes.delete(mob.head);
    mob.body.dispose(); mob.head.dispose();
    this._mobs.splice(i,1);
    this._xp+=20; this._updateXP();
    // Drop food
    const s=this._inv.find(s=>s.type===DIRT)||this._inv.find(s=>s.type===AIR);
    if(s){if(s.type===AIR){s.type=DIRT;s.count=2;}else s.count+=2;}
    const idx=this._inv.findIndex(s=>s.type===DIRT);
    if(idx>=0) this._refreshSlot(idx);
  }

  // ── Death ─────────────────────────────────────────────────────
  private _flashDamage():void{
    const f=document.createElement("div");
    f.style.cssText="position:absolute;inset:0;background:rgba(255,0,0,0.35);pointer-events:none;z-index:19;transition:opacity 0.5s;";
    this._wrap.appendChild(f);
    setTimeout(()=>{f.style.opacity="0";},50);
    setTimeout(()=>f.remove(),600);
  }
  private _dieVoid():void{this._hp=0;this._updateHearts();this._die();}
  private _die():void{
    if(this._dead) return; this._dead=true;
    document.exitPointerLock();
    this._mineHeld=false; this._resetMine();
    this._doSave();
    const ov=document.createElement("div");
    ov.style.cssText="position:absolute;inset:0;background:rgba(80,0,0,0.8);z-index:25;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;pointer-events:all;";
    ov.innerHTML=
      `<div style="font-size:60px;">💀</div>`+
      `<div style="color:#ff4444;font-size:32px;font-weight:900;font-family:'Arial Black',Arial,sans-serif;">You Died!</div>`+
      `<div style="color:rgba(255,255,255,0.5);font-size:14px;font-family:Arial,sans-serif;">Score: ${Math.floor(this._xp/100)} XP levels</div>`;
    const respawnBtn=document.createElement("button");
    respawnBtn.textContent="♻️ Respawn";
    respawnBtn.style.cssText="background:linear-gradient(135deg,#1a6b00,#4caf50);color:white;font-size:18px;font-weight:bold;padding:12px 36px;border-radius:20px;border:2px solid rgba(100,255,100,0.4);cursor:pointer;font-family:Arial,sans-serif;";
    respawnBtn.onclick=()=>{
      this._hp=20; this._hunger=20; this._dead=false;
      const surf=getSurface(0,0,this._worldMeta.seed);
      this._cam.position.set(0.5,surf+2.5,0.5);
      this._yaw=0; this._pitch=0; this._vy=0;
      this._updateHearts(); this._updateFood();
      ov.remove();
      for(const mob of this._mobs){this._mobMeshes.delete(mob.body);this._mobMeshes.delete(mob.head);mob.body.dispose();mob.head.dispose();}
      this._mobs=[];
      const ro=document.createElement("div");
      ro.style.cssText="position:absolute;inset:0;background:rgba(0,0,0,0.5);z-index:20;display:flex;align-items:center;justify-content:center;cursor:pointer;pointer-events:all;";
      ro.innerHTML=`<div style="color:white;font-size:22px;font-weight:900;font-family:'Arial Black',Arial,sans-serif;">Click to continue</div>`;
      this._wrap.appendChild(ro); this._startOv=ro;
    };
    const exitBtn=document.createElement("button");
    exitBtn.textContent="🚪 Exit to Menu";
    exitBtn.style.cssText="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);font-size:15px;padding:10px 28px;border-radius:16px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;font-family:Arial,sans-serif;";
    exitBtn.onclick=()=>this._saveAndExit(this._gRef!);
    ov.appendChild(respawnBtn); ov.appendChild(exitBtn);
    this._wrap.appendChild(ov);
  }

  // ── Save & Exit ───────────────────────────────────────────────
  private _doSave():void{
    if(!this._worldMeta) return;
    const p=this._cam.position;
    this._worldMeta.px=p.x; this._worldMeta.py=p.y; this._worldMeta.pz=p.z;
    saveWorld(this._worldMeta);
  }
  private _saveAndExit(g:Game):void{this._doSave();this._destroy(g);}

  // ── Cleanup ───────────────────────────────────────────────────
  private _onResize=():void=>{if(!this._disposed) this._engine.resize();};
  private _destroy(g:Game):void{
    this._disposed=true; document.exitPointerLock();
    document.removeEventListener("pointerlockchange",this._onLock);
    document.removeEventListener("mousemove",this._onMove);
    document.removeEventListener("keydown",this._onKeyDown);
    document.removeEventListener("keyup",this._onKeyUp);
    document.removeEventListener("mousedown",this._onMouseDown);
    document.removeEventListener("mouseup",this._onMouseUp);
    window.removeEventListener("resize",this._onResize);
    window.removeEventListener("beforeunload",this._beforeUnload);
    this._touchHud?.remove();
    if(this._engine){this._engine.stopRenderLoop();this._scene?.dispose();this._engine.dispose();}
    g.ui.innerHTML=""; g.inMiniGame=false;
    import("../ArcadeScene").then(m=>new m.ArcadeScene(g));
  }
}

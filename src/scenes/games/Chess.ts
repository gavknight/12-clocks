/**
 * Chess — full online multiplayer chess with bots and friends
 */
import type { Game } from "../../game/Game";

// ── Supabase (lazy) ───────────────────────────────────────────────────────────
const SB_URL = "https://xgzgqdhkjcsrgzhjyiss.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MzQ2NjQsImV4cCI6MjA0OTAxMDY2NH0.Jm7nNSNXNpjdVdvGHFNYxb3r8QRqOE3HrxqtJmLRjcY";

// ── Piece constants ───────────────────────────────────────────────────────────
const EMPTY=0,P=1,N=2,B=3,R=4,Q=5,K=6;
const WHITE=1,BLACK=-1;
type Piece = { type: number; color: number } | null;
type Board = Piece[][];
type Move = { fr:number;fc:number;tr:number;tc:number;promo?:number };

const PIECE_UNICODE: Record<number,Record<number,string>> = {
  [WHITE]: { [K]:"♔",[Q]:"♕",[R]:"♖",[B]:"♗",[N]:"♘",[P]:"♙" },
  [BLACK]: { [K]:"♚",[Q]:"♛",[R]:"♜",[B]:"♝",[N]:"♞",[P]:"♟" },
};

// ── Board helpers ─────────────────────────────────────────────────────────────
function emptyBoard(): Board {
  return Array.from({length:8},()=>Array(8).fill(null));
}
function startBoard(): Board {
  const b = emptyBoard();
  const back = [R,N,B,Q,K,B,N,R];
  for (let c=0;c<8;c++){
    b[0][c]={type:back[c],color:BLACK};
    b[1][c]={type:P,color:BLACK};
    b[6][c]={type:P,color:WHITE};
    b[7][c]={type:back[c],color:WHITE};
  }
  return b;
}
function cloneBoard(b:Board):Board{
  return b.map(row=>row.map(p=>p?{...p}:null));
}
function inBounds(r:number,c:number){return r>=0&&r<8&&c>=0&&c<8;}

// ── Move generation ───────────────────────────────────────────────────────────
function rawMoves(b:Board,r:number,c:number,ep:{r:number,c:number}|null): Move[] {
  const p = b[r][c]; if(!p) return [];
  const moves:Move[]=[];
  const add=(tr:number,tc:number,promo?:number)=>moves.push({fr:r,fc:c,tr,tc,promo});

  if(p.type===P){
    const dir=p.color===WHITE?-1:1;
    const start=p.color===WHITE?6:1;
    if(inBounds(r+dir,c)&&!b[r+dir][c]){
      if(r+dir===0||r+dir===7){[Q,R,B,N].forEach(t=>add(r+dir,c,t));}
      else add(r+dir,c);
      if(r===start&&!b[r+2*dir][c]) add(r+2*dir,c);
    }
    for(const dc of[-1,1]){
      if(!inBounds(r+dir,c+dc)) continue;
      const t=b[r+dir][c+dc];
      if(t&&t.color!==p.color){
        if(r+dir===0||r+dir===7){[Q,R,B,N].forEach(pt=>add(r+dir,c+dc,pt));}
        else add(r+dir,c+dc);
      }
      if(ep&&ep.r===r+dir&&ep.c===c+dc) add(r+dir,c+dc);
    }
  }
  if(p.type===N){
    for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){
      const nr=r+dr,nc=c+dc;
      if(inBounds(nr,nc)&&b[nr][nc]?.color!==p.color) add(nr,nc);
    }
  }
  if(p.type===B||p.type===Q){
    for(const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]){
      let nr=r+dr,nc=c+dc;
      while(inBounds(nr,nc)){
        if(b[nr][nc]){if(b[nr][nc]!.color!==p.color)add(nr,nc);break;}
        add(nr,nc); nr+=dr; nc+=dc;
      }
    }
  }
  if(p.type===R||p.type===Q){
    for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
      let nr=r+dr,nc=c+dc;
      while(inBounds(nr,nc)){
        if(b[nr][nc]){if(b[nr][nc]!.color!==p.color)add(nr,nc);break;}
        add(nr,nc); nr+=dr; nc+=dc;
      }
    }
  }
  if(p.type===K){
    for(const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){
      const nr=r+dr,nc=c+dc;
      if(inBounds(nr,nc)&&b[nr][nc]?.color!==p.color) add(nr,nc);
    }
  }
  return moves;
}

function applyMove(b:Board,m:Move,ep:{r:number,c:number}|null):Board{
  const nb=cloneBoard(b);
  const p=nb[m.fr][m.fc]!;
  nb[m.tr][m.tc]=m.promo?{type:m.promo,color:p.color}:p;
  nb[m.fr][m.fc]=null;
  // En passant capture
  if(p.type===P&&ep&&m.tr===ep.r&&m.tc===ep.c){
    nb[m.fr][m.tc]=null;
  }
  // Castling
  if(p.type===K){
    if(m.fc===4&&m.tc===6){nb[m.fr][5]=nb[m.fr][7];nb[m.fr][7]=null;}
    if(m.fc===4&&m.tc===2){nb[m.fr][3]=nb[m.fr][0];nb[m.fr][0]=null;}
  }
  return nb;
}

function findKing(b:Board,color:number):[number,number]|null{
  for(let r=0;r<8;r++) for(let c=0;c<8;c++)
    if(b[r][c]?.type===K&&b[r][c]?.color===color) return [r,c];
  return null;
}

function isAttacked(b:Board,r:number,c:number,byColor:number):boolean{
  for(let fr=0;fr<8;fr++) for(let fc=0;fc<8;fc++){
    const p=b[fr][fc];
    if(!p||p.color!==byColor) continue;
    const ms=rawMoves(b,fr,fc,null);
    if(ms.some(m=>m.tr===r&&m.tc===c)) return true;
  }
  return false;
}

interface ChessState {
  board:Board; turn:number;
  ep:{r:number,c:number}|null;
  castling:{wK:boolean;wQ:boolean;bK:boolean;bQ:boolean};
  halfMove:number; fullMove:number;
}

function initState():ChessState{
  return {board:startBoard(),turn:WHITE,ep:null,
    castling:{wK:true,wQ:true,bK:true,bQ:true},halfMove:0,fullMove:1};
}

function legalMoves(st:ChessState):Move[]{
  const {board,turn,ep,castling}=st;
  const moves:Move[]=[];
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=board[r][c]; if(!p||p.color!==turn) continue;
    for(const m of rawMoves(board,r,c,ep)){
      const nb=applyMove(board,m,ep);
      const kp=findKing(nb,turn);
      if(kp&&!isAttacked(nb,kp[0],kp[1],-turn)) moves.push(m);
    }
  }
  // Castling
  if(turn===WHITE){
    const r=7;
    if(castling.wK&&!board[r][5]&&!board[r][6]&&
       !isAttacked(board,r,4,-turn)&&!isAttacked(board,r,5,-turn)&&!isAttacked(board,r,6,-turn))
      moves.push({fr:r,fc:4,tr:r,tc:6});
    if(castling.wQ&&!board[r][3]&&!board[r][2]&&!board[r][1]&&
       !isAttacked(board,r,4,-turn)&&!isAttacked(board,r,3,-turn)&&!isAttacked(board,r,2,-turn))
      moves.push({fr:r,fc:4,tr:r,tc:2});
  } else {
    const r=0;
    if(castling.bK&&!board[r][5]&&!board[r][6]&&
       !isAttacked(board,r,4,-turn)&&!isAttacked(board,r,5,-turn)&&!isAttacked(board,r,6,-turn))
      moves.push({fr:r,fc:4,tr:r,tc:6});
    if(castling.bQ&&!board[r][3]&&!board[r][2]&&!board[r][1]&&
       !isAttacked(board,r,4,-turn)&&!isAttacked(board,r,3,-turn)&&!isAttacked(board,r,2,-turn))
      moves.push({fr:r,fc:4,tr:r,tc:2});
  }
  return moves;
}

function applyFull(st:ChessState,m:Move):ChessState{
  const nb=applyMove(st.board,m,st.ep);
  const p=st.board[m.fr][m.fc]!;
  // New en passant
  let ep:ChessState["ep"]=null;
  if(p.type===P&&Math.abs(m.tr-m.fr)===2)
    ep={r:(m.fr+m.tr)/2,c:m.fc};
  // Update castling
  const ca={...st.castling};
  if(p.type===K){if(p.color===WHITE){ca.wK=false;ca.wQ=false;}else{ca.bK=false;ca.bQ=false;}}
  if(p.type===R){
    if(m.fr===7&&m.fc===7)ca.wK=false;
    if(m.fr===7&&m.fc===0)ca.wQ=false;
    if(m.fr===0&&m.fc===7)ca.bK=false;
    if(m.fr===0&&m.fc===0)ca.bQ=false;
  }
  return {board:nb,turn:-st.turn,ep,castling:ca,
    halfMove:p.type===P||!!st.board[m.tr][m.tc]?0:st.halfMove+1,
    fullMove:st.turn===BLACK?st.fullMove+1:st.fullMove};
}

function isCheck(st:ChessState):boolean{
  const kp=findKing(st.board,st.turn);
  return !!kp&&isAttacked(st.board,kp[0],kp[1],-st.turn);
}

function gameStatus(st:ChessState):"playing"|"checkmate"|"stalemate"|"draw"{
  if(st.halfMove>=100) return "draw";
  const ml=legalMoves(st);
  if(ml.length===0) return isCheck(st)?"checkmate":"stalemate";
  return "playing";
}

// ── Bot AI ────────────────────────────────────────────────────────────────────
const PIECE_VAL:Record<number,number>={[P]:100,[N]:320,[B]:330,[R]:500,[Q]:900,[K]:20000};

// Positional tables (white perspective, flip for black)
const PAWN_PST=[
  [0,0,0,0,0,0,0,0],[5,10,10,-20,-20,10,10,5],[5,-5,-10,0,0,-10,-5,5],
  [0,0,0,20,20,0,0,0],[5,5,10,25,25,10,5,5],[10,10,20,30,30,20,10,10],
  [50,50,50,50,50,50,50,50],[0,0,0,0,0,0,0,0]
];
const KNIGHT_PST=[
  [-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,5,5,0,-20,-40],
  [-30,5,10,15,15,10,5,-30],[-30,0,15,20,20,15,0,-30],
  [-30,5,15,20,20,15,5,-30],[-30,0,10,15,15,10,0,-30],
  [-40,-20,0,0,0,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]
];
const PST:Record<number,number[][]>={[P]:PAWN_PST,[N]:KNIGHT_PST};

function evalBoard(b:Board,color:number):number{
  let score=0;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=b[r][c]; if(!p) continue;
    const v=PIECE_VAL[p.type]??0;
    const pr=p.color===WHITE?r:7-r;
    const pst=PST[p.type]?.[pr]?.[c]??0;
    score+=(v+pst)*p.color;
  }
  return score*color;
}

function botMove(st:ChessState,depth:number):Move|null{
  const moves=legalMoves(st);
  if(moves.length===0) return null;
  if(depth===0) return moves[Math.floor(Math.random()*moves.length)];

  let best:Move|null=null,bestScore=-Infinity;
  const shuffled=[...moves].sort(()=>Math.random()-0.5);

  for(const m of shuffled){
    const ns=applyFull(st,m);
    const score=depth===1?evalBoard(ns.board,st.turn):-negamax(ns,depth-1,-Infinity,Infinity,st.turn);
    if(score>bestScore){bestScore=score;best=m;}
  }
  return best;
}

function negamax(st:ChessState,depth:number,alpha:number,beta:number,origColor:number):number{
  const status=gameStatus(st);
  if(status==="checkmate") return -99999;
  if(status==="stalemate"||status==="draw") return 0;
  if(depth===0) return evalBoard(st.board,origColor);
  const moves=legalMoves(st);
  let best=-Infinity;
  for(const m of moves){
    const ns=applyFull(st,m);
    const score=-negamax(ns,depth-1,-beta,-alpha,origColor);
    best=Math.max(best,score);
    alpha=Math.max(alpha,score);
    if(alpha>=beta) break;
  }
  return best;
}

const BOT_LEVELS=[
  {name:"Beginner",emoji:"🟢",depth:0,desc:"Makes totally random moves"},
  {name:"Easy",    emoji:"🔵",depth:1,desc:"Thinks one move ahead"},
  {name:"Medium",  emoji:"🟡",depth:2,desc:"Thinks two moves ahead"},
  {name:"Hard",    emoji:"🟠",depth:3,desc:"Thinks three moves ahead"},
  {name:"Elite",   emoji:"🔴",depth:4,desc:"Thinks four moves ahead — good luck!"},
];

// ── Chess UI class ────────────────────────────────────────────────────────────
export class Chess {
  private _g: Game;
  private _wrap!: HTMLDivElement;
  private _username = "";

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;
    g.ui.innerHTML = "";
    this._wrap = document.createElement("div");
    this._wrap.style.cssText =
      "position:absolute;inset:0;overflow-y:auto;pointer-events:all;" +
      "background:linear-gradient(160deg,#0a0a1a,#0a1a0a);font-family:Arial,sans-serif;";
    g.ui.appendChild(this._wrap);
    this._askUsername();
  }

  // ── Username ──────────────────────────────────────────────────────────────
  private _askUsername(): void {
    const saved = localStorage.getItem("chess_username");
    if (saved) { this._username = saved; this._showLobby(); return; }

    this._wrap.innerHTML = "";
    const box = this._card();
    box.innerHTML =
      `<div style="font-size:48px;text-align:center;margin-bottom:12px;">♟️</div>`+
      `<div style="color:white;font-size:22px;font-weight:900;text-align:center;margin-bottom:6px;">Chess</div>`+
      `<div style="color:rgba(255,255,255,0.5);font-size:14px;text-align:center;margin-bottom:24px;">Enter a username to play online</div>`;
    const inp = document.createElement("input");
    inp.placeholder = "Your username";
    inp.maxLength = 20;
    inp.style.cssText =
      "width:100%;box-sizing:border-box;padding:12px 16px;background:#1a1a2a;"+
      "border:1.5px solid rgba(255,255,255,0.2);border-radius:12px;color:white;font-size:16px;outline:none;margin-bottom:12px;";
    const err = document.createElement("div");
    err.style.cssText = "color:#ff6060;font-size:13px;min-height:16px;margin-bottom:8px;";
    const btn = this._btn("Continue →","#4caf50");
    const go = () => {
      const v = inp.value.trim();
      if (!v) { err.textContent = "Enter a username!"; return; }
      if (v.length < 2) { err.textContent = "At least 2 characters."; return; }
      this._username = v;
      localStorage.setItem("chess_username", v);
      this._showLobby();
    };
    btn.onclick = go;
    inp.addEventListener("keydown", e => { if (e.key==="Enter") go(); });
    box.appendChild(inp); box.appendChild(err); box.appendChild(btn);
    this._wrap.appendChild(box);
    setTimeout(() => inp.focus(), 80);
  }

  // ── Lobby ─────────────────────────────────────────────────────────────────
  private _showLobby(): void {
    this._wrap.innerHTML = "";
    const box = this._card();

    // Header
    const hdr = document.createElement("div");
    hdr.style.cssText = "display:flex;align-items:center;gap:12px;margin-bottom:20px;";
    hdr.innerHTML =
      `<div style="font-size:36px;">♟️</div>`+
      `<div><div style="color:white;font-size:20px;font-weight:900;">Chess</div>`+
      `<div style="color:rgba(255,255,255,0.4);font-size:12px;">Playing as <b style="color:#80cfff;">${this._username}</b>`+
      ` <span id="chgUser" style="color:rgba(255,255,255,0.3);font-size:11px;cursor:pointer;text-decoration:underline;">change</span></div></div>`;
    box.appendChild(hdr);

    // Menu options
    const options = [
      {emoji:"🤖",label:"Play Bot",desc:"Choose difficulty and practice",color:"#4caf50",id:"botBtn"},
      {emoji:"🌐",label:"Play Online",desc:"Match with a random player",color:"#2196f3",id:"onlineBtn"},
      {emoji:"👥",label:"Friends",desc:"Add friends, challenge them, spectate",color:"#9c27b0",id:"friendsBtn"},
      {emoji:"📋",label:"Local 2P",desc:"Pass and play on the same device",color:"#ff9800",id:"localBtn"},
    ];

    for (const o of options) {
      const b = document.createElement("button");
      b.id = o.id;
      b.style.cssText =
        `width:100%;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.12);`+
        `border-radius:14px;padding:14px 16px;cursor:pointer;display:flex;align-items:center;gap:14px;`+
        `margin-bottom:10px;text-align:left;transition:background 0.15s;`;
      b.innerHTML =
        `<div style="font-size:28px;">${o.emoji}</div>`+
        `<div><div style="color:white;font-size:16px;font-weight:bold;">${o.label}</div>`+
        `<div style="color:rgba(255,255,255,0.45);font-size:12px;">${o.desc}</div></div>`;
      b.onmouseenter = () => { b.style.background=`rgba(255,255,255,0.1)`; };
      b.onmouseleave = () => { b.style.background=`rgba(255,255,255,0.05)`; };
      box.appendChild(b);
    }

    // Back
    const backBtn = this._btn("← Back to Arcade","rgba(255,255,255,0.08)");
    backBtn.style.marginTop = "6px";
    backBtn.onclick = () => this._exit();
    box.appendChild(backBtn);
    this._wrap.appendChild(box);

    box.querySelector("#chgUser")!.addEventListener("click",()=>{localStorage.removeItem("chess_username");this._askUsername();});
    box.querySelector("#botBtn")!.addEventListener("click",()=>this._showBotSelect());
    box.querySelector("#onlineBtn")!.addEventListener("click",()=>this._showOnline());
    box.querySelector("#friendsBtn")!.addEventListener("click",()=>this._showFriends());
    box.querySelector("#localBtn")!.addEventListener("click",()=>this._startGame(null,null,"local"));
  }

  // ── Bot select ────────────────────────────────────────────────────────────
  private _showBotSelect(): void {
    this._wrap.innerHTML = "";
    const box = this._card();
    box.innerHTML = `<div style="color:white;font-size:18px;font-weight:900;margin-bottom:4px;">🤖 Choose Difficulty</div>`+
      `<div style="color:rgba(255,255,255,0.4);font-size:13px;margin-bottom:20px;">Pick how hard the bot should be</div>`;

    for (let i=0;i<BOT_LEVELS.length;i++){
      const lv=BOT_LEVELS[i];
      const b=document.createElement("button");
      b.style.cssText=
        `width:100%;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.12);`+
        `border-radius:14px;padding:14px 16px;cursor:pointer;display:flex;align-items:center;gap:14px;`+
        `margin-bottom:10px;text-align:left;`;
      b.innerHTML=`<div style="font-size:28px;">${lv.emoji}</div>`+
        `<div><div style="color:white;font-size:16px;font-weight:bold;">${lv.name}</div>`+
        `<div style="color:rgba(255,255,255,0.45);font-size:12px;">${lv.desc}</div></div>`;
      b.onclick=()=>this._startGame(null,i,"bot");
      box.appendChild(b);
    }
    const back=this._btn("← Back","rgba(255,255,255,0.08)");
    back.onclick=()=>this._showLobby();
    box.appendChild(back);
    this._wrap.appendChild(box);
  }

  // ── Online ────────────────────────────────────────────────────────────────
  private _showOnline(): void {
    this._wrap.innerHTML = "";
    const box = this._card();
    box.innerHTML=`<div style="color:white;font-size:18px;font-weight:900;margin-bottom:4px;">🌐 Play Online</div>`;

    const statusDiv=document.createElement("div");
    statusDiv.style.cssText="color:rgba(255,255,255,0.5);font-size:13px;margin-bottom:16px;";
    statusDiv.textContent="Looking for an opponent...";
    box.appendChild(statusDiv);

    const spinner=document.createElement("div");
    spinner.style.cssText="font-size:32px;text-align:center;margin:20px 0;animation:spin 1s linear infinite;";
    spinner.textContent="⏳";
    box.appendChild(spinner);

    // Add spin animation
    if(!document.getElementById("chess-spin-style")){
      const s=document.createElement("style");
      s.id="chess-spin-style";
      s.textContent="@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}";
      document.head.appendChild(s);
    }

    const cancelBtn=this._btn("Cancel","rgba(255,100,100,0.2)");
    cancelBtn.style.marginTop="16px";
    box.appendChild(cancelBtn);
    this._wrap.appendChild(box);

    // Try to find/create a game room via Supabase
    this._findOnlineGame(statusDiv,cancelBtn);

    cancelBtn.onclick=()=>{this._cancelOnlineSearch();this._showLobby();};
  }

  private _onlineChannel:any=null;
  private _onlineGameId:string|null=null;
  private _cancelSearch=false;

  private _pollTimer:any=null;
  private async _findOnlineGame(statusEl:HTMLElement,cancelBtn:HTMLElement):Promise<void>{
    this._cancelSearch=false;
    const poll=async()=>{
      if(this._cancelSearch) return;
      try{
        // Check for any waiting game that isn't ours
        const res=await fetch(`${SB_URL}/rest/v1/chess_games?status=eq.waiting&select=id,host_user&limit=20`,{
          headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`}
        });
        if(this._cancelSearch) return;
        const games=await res.json();
        if(Array.isArray(games)){
          const other=games.find(g=>g.host_user!==this._username);
          if(other){
            // Delete our own waiting room if we created one
            if(this._onlineGameId){
              fetch(`${SB_URL}/rest/v1/chess_games?id=eq.${this._onlineGameId}`,{
                method:"DELETE",headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`}
              }).catch(()=>{});
              this._onlineGameId=null;
            }
            // Join the other player's game
            await fetch(`${SB_URL}/rest/v1/chess_games?id=eq.${other.id}`,{
              method:"PATCH",headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json"},
              body:JSON.stringify({status:"active",guest_user:this._username})
            });
            if(this._cancelSearch) return;
            statusEl.textContent=`Joined game vs ${other.host_user}!`;
            setTimeout(()=>this._startGame(other.id,null,"online-black"),300);
            return;
          }
        }
        // No one to join — create our waiting room if not already done
        if(!this._onlineGameId){
          const gid=`chess_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
          this._onlineGameId=gid;
          await fetch(`${SB_URL}/rest/v1/chess_games`,{
            method:"POST",headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal"},
            body:JSON.stringify({id:gid,status:"waiting",host_user:this._username,guest_user:null,moves:[],created_at:new Date().toISOString()})
          });
          statusEl.textContent="Waiting for someone to join...";
        } else {
          // Check if someone joined our waiting room
          const gres=await fetch(`${SB_URL}/rest/v1/chess_games?id=eq.${this._onlineGameId}&select=status,guest_user`,{
            headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`}
          });
          const gdata=await gres.json();
          if(Array.isArray(gdata)&&gdata[0]?.status==="active"&&gdata[0]?.guest_user){
            statusEl.textContent=`${gdata[0].guest_user} joined!`;
            setTimeout(()=>this._startGame(this._onlineGameId!,null,"online-white"),300);
            return;
          }
        }
      }catch(e){ /* keep polling on network error */ }
      if(!this._cancelSearch) this._pollTimer=setTimeout(poll,2000);
    };
    poll();
  }

  private _cancelOnlineSearch():void{
    this._cancelSearch=true;
    clearTimeout(this._pollTimer);
    // Delete waiting room if we created one
    if(this._onlineGameId){
      fetch(`${SB_URL}/rest/v1/chess_games?id=eq.${this._onlineGameId}`,{
        method:"DELETE",headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`}
      }).catch(()=>{});
      this._onlineGameId=null;
    }
  }

  // ── Friends ───────────────────────────────────────────────────────────────
  private _showFriends(): void {
    this._wrap.innerHTML = "";
    const box = this._card();
    box.innerHTML=`<div style="color:white;font-size:18px;font-weight:900;margin-bottom:4px;">👥 Friends</div>`+
      `<div style="color:rgba(255,255,255,0.4);font-size:13px;margin-bottom:16px;">Add friends by username to challenge or spectate them</div>`;

    // Add friend input
    const row=document.createElement("div");
    row.style.cssText="display:flex;gap:8px;margin-bottom:16px;";
    const inp=document.createElement("input");
    inp.placeholder="Friend's username";
    inp.style.cssText="flex:1;padding:10px 14px;background:#1a1a2a;border:1.5px solid rgba(255,255,255,0.2);border-radius:10px;color:white;font-size:14px;outline:none;";
    const addBtn=this._btn("Add","#4caf50");
    addBtn.style.cssText+="padding:10px 18px;font-size:14px;";
    row.appendChild(inp); row.appendChild(addBtn);
    box.appendChild(row);

    const friendList=document.createElement("div");
    box.appendChild(friendList);
    this._renderFriends(friendList);

    addBtn.onclick=()=>{
      const v=inp.value.trim();
      if(!v||v===this._username) return;
      const friends=this._getFriends();
      if(!friends.includes(v)) friends.push(v);
      localStorage.setItem("chess_friends",JSON.stringify(friends));
      inp.value="";
      this._renderFriends(friendList);
    };

    const back=this._btn("← Back","rgba(255,255,255,0.08)");
    back.onclick=()=>this._showLobby();
    box.appendChild(back);
    this._wrap.appendChild(box);
  }

  private _getFriends():string[]{
    try{return JSON.parse(localStorage.getItem("chess_friends")||"[]");}catch{return[];}
  }

  private _renderFriends(el:HTMLElement):void{
    el.innerHTML="";
    const friends=this._getFriends();
    if(friends.length===0){
      el.innerHTML=`<div style="color:rgba(255,255,255,0.3);font-size:13px;text-align:center;padding:16px;">No friends yet!</div>`;
      return;
    }
    for(const f of friends){
      const row=document.createElement("div");
      row.style.cssText="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.05);border-radius:10px;margin-bottom:8px;";
      row.innerHTML=`<div style="color:white;font-size:14px;flex:1;">👤 ${f}</div>`;
      const chalBtn=this._btn("Challenge","#2196f3");
      chalBtn.style.cssText+="padding:6px 12px;font-size:12px;";
      chalBtn.onclick=()=>this._challengeFriend(f);
      const removeBtn=this._btn("Remove","rgba(255,60,60,0.3)");
      removeBtn.style.cssText+="padding:6px 10px;font-size:12px;";
      removeBtn.onclick=()=>{
        const fr=this._getFriends().filter(x=>x!==f);
        localStorage.setItem("chess_friends",JSON.stringify(fr));
        this._renderFriends(el);
      };
      row.appendChild(chalBtn); row.appendChild(removeBtn);
      el.appendChild(row);
    }
  }

  private _challengeFriend(friend:string):void{
    const gid=`chess_friend_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    // Create a game room tagged with the friend's name
    fetch(`${SB_URL}/rest/v1/chess_games`,{
      method:"POST",headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal"},
      body:JSON.stringify({id:gid,status:"waiting",host_user:this._username,guest_user:null,invite_to:friend,moves:[],created_at:new Date().toISOString()})
    }).catch(()=>{});
    this._showLobby();
    // Show confirmation
    const toast=document.createElement("div");
    toast.style.cssText="position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:white;padding:10px 20px;border-radius:20px;font-size:14px;z-index:9999;";
    toast.textContent=`Challenge sent to ${friend}!`;
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(),2500);
  }

  // ── Game ──────────────────────────────────────────────────────────────────
  private _startGame(gameId:string|null,botLevel:number|null,mode:string):void{
    this._wrap.innerHTML="";
    new ChessGame(this._wrap,this._g,this._username,gameId,botLevel,mode,()=>this._showLobby());
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private _card():HTMLDivElement{
    const d=document.createElement("div");
    d.style.cssText=
      "max-width:440px;margin:0 auto;padding:24px 20px 32px;display:flex;flex-direction:column;";
    return d;
  }
  private _btn(label:string,bg:string):HTMLButtonElement{
    const b=document.createElement("button");
    b.textContent=label;
    b.style.cssText=
      `width:100%;padding:13px;border-radius:12px;background:${bg};color:white;`+
      `font-size:15px;font-weight:bold;border:none;cursor:pointer;font-family:Arial,sans-serif;`;
    return b;
  }
  private _exit():void{
    this._cancelOnlineSearch();
    this._wrap.remove();
    this._g.inMiniGame=false;
    import("../ArcadeScene").then(m=>new m.ArcadeScene(this._g));
  }
}

// ── ChessGame — the actual board ──────────────────────────────────────────────
class ChessGame {
  private _state: ChessState;
  private _selected: [number,number]|null = null;
  private _legalForSelected: Move[] = [];
  private _mode: string;
  private _botLevel: number;
  private _playerColor: number;
  private _gameId: string|null;
  private _username: string;
  private _onBack: ()=>void;
  private _g: Game;
  private _wrap: HTMLDivElement;
  private _boardEl!: HTMLDivElement;
  private _statusEl!: HTMLDivElement;
  private _pollId: any = null;
  private _lastMoveCount = 0;
  private _gameOver = false;
  private _promotion: Move|null = null;

  constructor(wrap:HTMLDivElement,g:Game,username:string,gameId:string|null,botLevel:number|null,mode:string,onBack:()=>void){
    this._wrap=wrap; this._g=g; this._username=username;
    this._gameId=gameId; this._botLevel=botLevel??0;
    this._mode=mode; this._onBack=onBack;
    this._state=initState();
    this._playerColor=mode==="online-black"?BLACK:WHITE;
    this._build();
    if(mode==="bot"&&this._playerColor===BLACK) this._doBotMove();
    if(mode.startsWith("online")) this._startOnlineSync();
  }

  private _build():void{
    this._wrap.innerHTML="";

    // Top bar
    const top=document.createElement("div");
    top.style.cssText="display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(0,0,0,0.4);";
    const backBtn=document.createElement("button");
    backBtn.textContent="←";
    backBtn.style.cssText="background:rgba(255,255,255,0.1);color:white;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:16px;";
    backBtn.onclick=()=>{clearInterval(this._pollId);this._onBack();};
    const title=document.createElement("div");
    title.style.cssText="color:white;font-size:16px;font-weight:bold;flex:1;";
    title.textContent=this._modeTitle();
    this._statusEl=document.createElement("div");
    this._statusEl.style.cssText="color:rgba(255,255,255,0.6);font-size:13px;";
    top.appendChild(backBtn); top.appendChild(title); top.appendChild(this._statusEl);
    this._wrap.appendChild(top);

    // Board container
    const boardWrap=document.createElement("div");
    boardWrap.style.cssText="display:flex;justify-content:center;align-items:center;padding:8px;";
    this._boardEl=document.createElement("div");
    this._boardEl.style.cssText="display:grid;grid-template-columns:repeat(8,1fr);aspect-ratio:1;width:min(96vw,calc(100svh - 80px),460px);border:3px solid rgba(255,255,255,0.2);border-radius:6px;overflow:hidden;";
    boardWrap.appendChild(this._boardEl);
    this._wrap.appendChild(boardWrap);

    this._renderBoard();
    this._updateStatus();
  }

  private _modeTitle():string{
    if(this._mode==="bot") return `vs Bot (${BOT_LEVELS[this._botLevel].name})`;
    if(this._mode==="local") return "Local 2 Player";
    if(this._mode.startsWith("online")) return "Online Match";
    return "Chess";
  }

  private _renderBoard():void{
    this._boardEl.innerHTML="";
    const flip=this._playerColor===BLACK;
    for(let ri=0;ri<8;ri++){
      for(let ci=0;ci<8;ci++){
        const r=flip?7-ri:ri;
        const c=flip?7-ci:ci;
        const light=(r+c)%2===0;
        const cell=document.createElement("div");
        cell.style.cssText=
          `display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;aspect-ratio:1;`+
          `background:${this._cellColor(r,c,light)};`;

        const p=this._state.board[r][c];
        if(p){
          const span=document.createElement("span");
          span.textContent=PIECE_UNICODE[p.color][p.type]??"";
          span.style.cssText=`font-size:clamp(18px,10vmin,42px);line-height:1;user-select:none;`+
            (p.color===WHITE?"filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8));":"");
          cell.appendChild(span);
        }

        // Legal move dot
        if(this._legalForSelected.some(m=>m.tr===r&&m.tc===c)){
          const dot=document.createElement("div");
          const isCapture=!!this._state.board[r][c];
          dot.style.cssText=isCapture
            ?`position:absolute;inset:0;border:4px solid rgba(0,200,0,0.7);border-radius:2px;pointer-events:none;`
            :`position:absolute;width:30%;height:30%;background:rgba(0,200,0,0.55);border-radius:50%;pointer-events:none;`;
          cell.appendChild(dot);
        }

        cell.addEventListener("click",()=>this._onCellClick(r,c));
        cell.addEventListener("touchend",e=>{e.preventDefault();this._onCellClick(r,c);});
        this._boardEl.appendChild(cell);
      }
    }
  }

  private _cellColor(r:number,c:number,light:boolean):string{
    if(this._selected&&this._selected[0]===r&&this._selected[1]===c) return "#f6f669";
    // Last move highlight
    const light1="#f0d9b5",dark1="#b58863";
    return light?light1:dark1;
  }

  private _onCellClick(r:number,c:number):void{
    if(this._gameOver) return;
    if(this._promotion) return;
    // Online: only move on your turn
    if(this._mode.startsWith("online")&&this._state.turn!==this._playerColor) return;
    // Bot: only move when it's player's turn
    if(this._mode==="bot"&&this._state.turn!==this._playerColor) return;

    const p=this._state.board[r][c];
    // If a piece is already selected, try to move
    if(this._selected){
      const [sr,sc]=this._selected;
      const move=this._legalForSelected.find(m=>m.tr===r&&m.tc===c);
      if(move){
        // Promotion?
        if(this._state.board[sr][sc]?.type===P&&(r===0||r===7)&&!move.promo){
          this._showPromotion(move);
          return;
        }
        // If multiple promo moves (already filtered to one square), pick queen
        const finalMove=move.promo?move:{...move};
        this._doMove(finalMove);
        return;
      }
      // Clicked same piece — deselect
      if(p&&p.color===this._state.turn){
        this._selected=[r,c];
        this._legalForSelected=legalMoves(this._state).filter(m=>m.fr===r&&m.fc===c);
        this._renderBoard(); return;
      }
      this._selected=null; this._legalForSelected=[]; this._renderBoard(); return;
    }
    // Select a piece
    if(p&&p.color===this._state.turn){
      this._selected=[r,c];
      this._legalForSelected=legalMoves(this._state).filter(m=>m.fr===r&&m.fc===c);
    }
    this._renderBoard();
  }

  private _showPromotion(baseMove:Move):void{
    this._promotion=baseMove;
    const ov=document.createElement("div");
    ov.style.cssText=
      "position:absolute;inset:0;background:rgba(0,0,0,0.75);display:flex;flex-direction:column;"+
      "align-items:center;justify-content:center;z-index:20;";
    const box=document.createElement("div");
    box.style.cssText="background:#222;border-radius:16px;padding:20px;display:flex;gap:12px;";
    box.innerHTML=`<div style="color:white;font-size:14px;font-weight:bold;width:100%;text-align:center;margin-bottom:8px;">Promote to:</div>`;
    for(const t of [Q,R,B,N]){
      const btn=document.createElement("button");
      btn.style.cssText="font-size:36px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.3);border-radius:10px;padding:8px 12px;cursor:pointer;";
      btn.textContent=PIECE_UNICODE[this._state.turn][t];
      btn.onclick=()=>{
        ov.remove(); this._promotion=null;
        this._doMove({...baseMove,promo:t});
      };
      box.appendChild(btn);
    }
    ov.appendChild(box);
    this._wrap.appendChild(ov);
  }

  private _doMove(m:Move):void{
    this._state=applyFull(this._state,m);
    this._selected=null; this._legalForSelected=[];
    this._renderBoard();
    this._updateStatus();
    const status=gameStatus(this._state);
    if(status!=="playing"){ this._showResult(status); return; }
    // Push to online
    if(this._mode.startsWith("online")) this._pushOnlineMove(m);
    // Bot move
    if(this._mode==="bot") setTimeout(()=>this._doBotMove(),300);
  }

  private _doBotMove():void{
    if(this._gameOver) return;
    const m=botMove(this._state,BOT_LEVELS[this._botLevel].depth);
    if(!m) return;
    this._state=applyFull(this._state,m);
    this._renderBoard();
    this._updateStatus();
    const status=gameStatus(this._state);
    if(status!=="playing") this._showResult(status);
  }

  private _updateStatus():void{
    const turn=this._state.turn===WHITE?"White":"Black";
    const check=isCheck(this._state)?" — CHECK!":"";
    if(this._mode==="local") this._statusEl.textContent=`${turn}'s turn${check}`;
    else if(this._mode==="bot") this._statusEl.textContent=this._state.turn===this._playerColor?`Your turn${check}`:`Bot thinking...${check}`;
    else this._statusEl.textContent=this._state.turn===this._playerColor?`Your turn${check}`:`Opponent's turn${check}`;
  }

  private _showResult(status:string):void{
    this._gameOver=true;
    const isCheckmate=status==="checkmate";
    let msg="";
    if(isCheckmate){
      const winner=this._state.turn===WHITE?"Black":"White";
      if(this._mode==="bot") msg=this._state.turn===this._playerColor?"😢 Bot wins!":"🎉 You win!";
      else if(this._mode==="local") msg=`${winner} wins by checkmate!`;
      else msg=this._state.turn===this._playerColor?"😢 You lost!":"🎉 You win!";
    } else msg=status==="stalemate"?"🤝 Stalemate — Draw!":"🤝 Draw!";

    const ov=document.createElement("div");
    ov.style.cssText=
      "position:absolute;inset:0;background:rgba(0,0,0,0.75);display:flex;flex-direction:column;"+
      "align-items:center;justify-content:center;z-index:20;gap:16px;";
    ov.innerHTML=`<div style="color:white;font-size:28px;font-weight:900;text-align:center;">${msg}</div>`;
    const btnRow=document.createElement("div");
    btnRow.style.cssText="display:flex;gap:12px;";
    const again=document.createElement("button");
    again.textContent="Play Again";
    again.style.cssText="padding:12px 24px;border-radius:12px;background:#4caf50;color:white;font-size:15px;font-weight:bold;border:none;cursor:pointer;";
    again.onclick=()=>{ov.remove();this._gameOver=false;this._state=initState();this._selected=null;this._legalForSelected=[];this._renderBoard();this._updateStatus();if(this._mode==="bot"&&this._playerColor===BLACK)this._doBotMove();};
    const back=document.createElement("button");
    back.textContent="← Back";
    back.style.cssText="padding:12px 24px;border-radius:12px;background:rgba(255,255,255,0.1);color:white;font-size:15px;font-weight:bold;border:none;cursor:pointer;";
    back.onclick=()=>{clearInterval(this._pollId);this._onBack();};
    btnRow.appendChild(again); btnRow.appendChild(back);
    ov.appendChild(btnRow);
    this._wrap.appendChild(ov);
  }

  // ── Online sync ───────────────────────────────────────────────────────────
  private async _pushOnlineMove(m:Move):Promise<void>{
    if(!this._gameId) return;
    try{
      const res=await fetch(`${SB_URL}/rest/v1/chess_games?id=eq.${this._gameId}&select=moves`,{
        headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`}
      });
      const data=await res.json();
      const moves=[...(data[0]?.moves??[]),m];
      await fetch(`${SB_URL}/rest/v1/chess_games?id=eq.${this._gameId}`,{
        method:"PATCH",headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json"},
        body:JSON.stringify({moves})
      });
    }catch{}
  }

  private _startOnlineSync():void{
    this._pollId=setInterval(async()=>{
      if(this._gameOver||this._state.turn===this._playerColor) return;
      try{
        const res=await fetch(`${SB_URL}/rest/v1/chess_games?id=eq.${this._gameId}&select=moves`,{
          headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`}
        });
        const data=await res.json();
        const moves:Move[]=data[0]?.moves??[];
        if(moves.length>this._lastMoveCount){
          const m=moves[moves.length-1];
          this._lastMoveCount=moves.length;
          this._state=applyFull(this._state,m);
          this._renderBoard(); this._updateStatus();
          const status=gameStatus(this._state);
          if(status!=="playing") this._showResult(status);
        }
      }catch{}
    },1500);
  }
}

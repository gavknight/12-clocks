import type { Game } from "../game/Game";
import { IS_BEDROCK } from "../bedrock";

const inputStyle = `
  background:rgba(255,255,255,0.12);color:white;
  border:2px solid rgba(255,255,255,0.25);border-radius:12px;
  padding:10px 16px;font-size:16px;outline:none;
  font-family:Arial,sans-serif;width:100%;box-sizing:border-box;
`;

export class AuthScene {
  constructor(game: Game) {
    this._render(game, "signin");
    game._disposeScene = () => { game.ui.innerHTML = ""; };
  }

  private _render(game: Game, mode: "signin" | "register", prefillUser = "00OW"): void {
    const isReg = mode === "register";

    game.ui.innerHTML = `
      <div class="screen" style="
        background:linear-gradient(160deg,#0a0020,#1a0850,#2a1460);
        flex-direction:column;gap:0;
      ">
        ${Array.from({length:8},(_,i)=>`<div style="position:absolute;
          left:${[8,20,40,60,75,88,30,55][i]}%;
          top:${[10,20,8,15,5,18,30,25][i]}%;
          width:3px;height:3px;border-radius:50%;background:white;
          opacity:${0.3+i*0.06};pointer-events:none;"></div>`).join("")}

        <div style="font-size:48px;margin-bottom:6px;">🕐</div>
        <h1 style="font-size:34px;color:white;
          text-shadow:0 0 20px rgba(255,200,0,0.6);margin-bottom:16px;">
          12 Clocks
        </h1>

        <!-- Tab switcher -->
        <div style="display:flex;gap:0;margin-bottom:22px;
          background:rgba(255,255,255,0.1);border-radius:12px;padding:4px;">
          <button id="tabSignin" style="
            padding:8px 28px;border-radius:9px;font-size:15px;font-weight:bold;
            border:none;cursor:pointer;font-family:Arial,sans-serif;
            background:${!isReg ? "white" : "transparent"};
            color:${!isReg ? "#1a0060" : "rgba(255,255,255,0.6)"};
          ">Sign In</button>
          <button id="tabRegister" style="
            padding:8px 28px;border-radius:9px;font-size:15px;font-weight:bold;
            border:none;cursor:pointer;font-family:Arial,sans-serif;
            background:${isReg ? "white" : "transparent"};
            color:${isReg ? "#1a0060" : "rgba(255,255,255,0.6)"};
          ">Register</button>
        </div>

        <!-- Form -->
        <div style="display:flex;flex-direction:column;gap:10px;width:280px;">
          <input id="authUser" type="text" maxlength="20" placeholder="Username"
            value="${prefillUser}" style="${inputStyle}" autocomplete="username" />
          <input id="authPass" type="password" maxlength="40" placeholder="Password"
            style="${inputStyle}" autocomplete="${isReg ? "new-password" : "current-password"}" />
          ${isReg ? `<input id="authPass2" type="password" maxlength="40"
            placeholder="Confirm password" style="${inputStyle}" autocomplete="new-password" />` : ""}

          <div id="authErr" style="
            color:#ff6666;font-size:13px;text-align:center;min-height:18px;
          "></div>

          <button id="authSubmit" style="
            background:#FFD700;color:#1a0060;font-size:20px;font-weight:bold;
            padding:14px;border-radius:40px;
            border:3px solid #e6b800;box-shadow:0 5px 0 #b8860b;
            cursor:pointer;font-family:Arial Black,Arial,sans-serif;
          ">${isReg ? "Create Account" : "Sign In"}</button>
        </div>

        ${IS_BEDROCK ? `
        <div style="display:flex;align-items:center;gap:10px;margin-top:18px;color:rgba(255,255,255,0.3);font-size:13px;">
          <div style="flex:1;height:1px;background:rgba(255,255,255,0.12);"></div>
          or
          <div style="flex:1;height:1px;background:rgba(255,255,255,0.12);"></div>
        </div>
        <button id="guestBtn" style="
          margin-top:14px;
          background:rgba(80,200,80,0.15);color:#7fff7f;font-size:17px;font-weight:bold;
          padding:12px 36px;border-radius:40px;
          border:2px solid rgba(80,200,80,0.4);
          cursor:pointer;font-family:Arial Black,Arial,sans-serif;
        ">🟢 Play as Guest</button>
        <div style="color:rgba(255,255,255,0.25);font-size:11px;margin-top:6px;font-family:Arial,sans-serif;">
          Your name will be "Guest" permanently
        </div>` : ""}
      </div>
    `;

    document.getElementById("tabSignin")!.onclick   = () => this._render(game, "signin", prefillUser);
    document.getElementById("tabRegister")!.onclick = () => this._render(game, "register", prefillUser);

    const userEl  = document.getElementById("authUser")   as HTMLInputElement;
    const passEl  = document.getElementById("authPass")   as HTMLInputElement;
    const pass2El = document.getElementById("authPass2")  as HTMLInputElement | null;
    const errEl   = document.getElementById("authErr")!;

    const showErr = (msg: string) => { errEl.textContent = msg; };

    const submit = () => {
      const user = userEl.value.trim();
      const pass = passEl.value;
      if (!user) { showErr("Enter a username."); return; }
      if (!pass) { showErr("Enter a password."); return; }

      if (mode === "signin") {
        const acc = game.findAccount(user, pass);
        if (!acc) { showErr("Wrong username or password."); return; }
        game.login(acc.id);
        if (game.isBanned(acc.id)) { game.goBanned(); return; }
        game.goTitle();
      } else {
        if (pass !== (pass2El?.value ?? "")) { showErr("Passwords don't match."); return; }
        if (pass.length < 3) { showErr("Password needs at least 3 characters."); return; }
        if (game.usernameExists(user)) { showErr("That username is taken — try another."); return; }
        const acc = game.register(user, pass);
        game.login(acc.id);
        // Show tutorial for brand new players
        import("./Tutorial").then(({ showTutorial }) => {
          showTutorial(() => game.goTitle());
        });
        return;
      }
    };

    document.getElementById("authSubmit")!.onclick = submit;
    [userEl, passEl, pass2El].forEach(el => {
      el?.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
    });

    if (IS_BEDROCK) {
      document.getElementById("guestBtn")!.onclick = () => {
        game.loginAsGuest();
        game.goTitle();
      };
    }

    // Focus username field
    setTimeout(() => userEl.focus(), 50);
  }
}

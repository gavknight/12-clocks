import { BgMusicManager } from "../game/BgMusicManager";
import type { SequencerPattern } from "../game/BgMusicManager";

const TRACKS = [
  { id: "kick",    label: "🥁 Kick",    color: "255,100,50"  },
  { id: "snare",   label: "🪘 Snare",   color: "255,200,0"   },
  { id: "hihat",   label: "🎩 Hi-Hat",  color: "80,200,255"  },
  { id: "openhat", label: "🔔 Open Hat",color: "0,180,255"   },
  { id: "bass",    label: "🎸 Bass",    color: "80,255,140"  },
  { id: "lead",    label: "🎹 Lead",    color: "190,80,255"  },
] as const;

const STEPS = 16;

// [track][step] — 1 = on
type Grid = boolean[][];

const empty = (): Grid => TRACKS.map(() => new Array(STEPS).fill(false));

const PRESETS: Record<string, Grid> = {
  "Basic Beat": [
    [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0].map(Boolean),
    [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0].map(Boolean),
    [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0].map(Boolean),
    [0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1].map(Boolean),
    [1,0,0,1,0,0,1,0,1,0,0,0,1,0,0,0].map(Boolean),
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0].map(Boolean),
  ],
  "Trap": [
    [1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0].map(Boolean),
    [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0].map(Boolean),
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1].map(Boolean),
    [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0].map(Boolean),
    [1,0,0,0,1,0,0,1,0,0,1,0,0,0,1,0].map(Boolean),
    [0,0,1,0,0,0,1,0,0,1,0,0,0,0,0,1].map(Boolean),
  ],
  "Chill": [
    [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0].map(Boolean),
    [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0].map(Boolean),
    [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0].map(Boolean),
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0].map(Boolean),
    [1,0,0,0,0,0,1,0,0,0,1,0,0,1,0,0].map(Boolean),
    [0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0].map(Boolean),
  ],
};

export class MusicCreator {
  private _overlay: HTMLDivElement;
  private _grid: Grid;
  private _bpm: number;
  private _title: string;
  private _previewPlaying: boolean;

  constructor() {
    this._grid = empty();
    this._bpm = 120;
    this._title = "My Beat";
    this._previewPlaying = false;

    this._overlay = document.createElement("div");
    this._overlay.style.cssText =
      "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.96);" +
      "display:flex;flex-direction:column;align-items:center;" +
      "overflow-y:auto;padding:20px 16px 48px;font-family:Arial,sans-serif;";
    this._build();
    document.body.appendChild(this._overlay);
    this._wire();
  }

  private _build(): void {
    this._overlay.innerHTML = `
      <div style="width:100%;max-width:740px;display:flex;flex-direction:column;gap:14px;">

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="color:#66ffaa;font-size:20px;font-weight:900;">🎵 Music Creator</div>
          <button id="mc_close"
            style="background:rgba(255,255,255,0.1);color:white;font-size:14px;
              padding:6px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;">
            ✕ Close
          </button>
        </div>

        <!-- Controls -->
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
          border-radius:14px;padding:13px 16px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
          <span style="color:rgba(255,255,255,0.55);font-size:13px;">BPM</span>
          <button id="mc_bpmDn"
            style="background:rgba(255,255,255,0.1);color:white;border:1px solid rgba(255,255,255,0.2);
              border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:16px;line-height:1;">−</button>
          <span id="mc_bpmVal"
            style="color:white;font-size:16px;font-weight:bold;min-width:40px;text-align:center;">
            ${this._bpm}
          </span>
          <button id="mc_bpmUp"
            style="background:rgba(255,255,255,0.1);color:white;border:1px solid rgba(255,255,255,0.2);
              border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:16px;line-height:1;">+</button>
          <div style="flex:1;"></div>
          <button id="mc_play"
            style="background:rgba(100,255,160,0.22);color:#66ffaa;font-size:13px;font-weight:bold;
              border:2px solid rgba(100,255,160,0.5);border-radius:10px;padding:8px 20px;cursor:pointer;">
            ▶ Preview
          </button>
          <button id="mc_stop"
            style="background:rgba(255,80,80,0.18);color:#ff8888;font-size:13px;font-weight:bold;
              border:1px solid rgba(255,80,80,0.4);border-radius:10px;padding:8px 15px;cursor:pointer;">
            ■ Stop
          </button>
        </div>

        <!-- Grid -->
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:12px;
          border:1px solid rgba(255,255,255,0.08);background:rgba(0,0,0,0.3);padding:12px 14px;">
          <div style="display:flex;flex-direction:column;gap:5px;min-width:560px;">
            <!-- Step numbers -->
            <div style="display:flex;padding-left:82px;gap:3px;margin-bottom:2px;">
              ${Array.from({length:STEPS},(_,i)=>`
                <div style="width:30px;text-align:center;font-size:10px;
                  color:${i%4===0 ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.18)"};">
                  ${i+1}
                </div>`).join("")}
            </div>
            ${TRACKS.map((t,ti) => `
              <div style="display:flex;align-items:center;gap:3px;">
                <div style="width:82px;text-align:right;padding-right:8px;
                  color:rgba(255,255,255,0.65);font-size:11px;white-space:nowrap;flex-shrink:0;">
                  ${t.label}
                </div>
                ${Array.from({length:STEPS},(_,si) => `
                  <button class="mc_cell" data-track="${ti}" data-step="${si}"
                    style="width:30px;height:30px;border-radius:5px;cursor:pointer;flex-shrink:0;
                      background:${this._grid[ti][si] ? `rgba(${t.color},0.75)` : "rgba(255,255,255,0.06)"};
                      border:1px solid ${si%4===0 ? "rgba(255,255,255,0.18)" : `rgba(${t.color},0.18)`};
                      transition:background 0.07s;">
                  </button>`).join("")}
              </div>`).join("")}
          </div>
        </div>

        <!-- Presets & clear -->
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
          <span style="color:rgba(255,255,255,0.4);font-size:12px;">Presets:</span>
          ${Object.keys(PRESETS).map(name=>`
            <button class="mc_preset" data-preset="${name}"
              style="background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.7);font-size:12px;
                border:1px solid rgba(255,255,255,0.18);border-radius:8px;padding:6px 12px;cursor:pointer;">
              ${name}
            </button>`).join("")}
          <button id="mc_clear"
            style="margin-left:auto;background:rgba(255,60,60,0.14);color:#ff8888;font-size:12px;
              border:1px solid rgba(255,60,60,0.3);border-radius:8px;padding:6px 12px;cursor:pointer;">
            🗑 Clear
          </button>
        </div>

        <!-- Save -->
        <div style="background:rgba(100,255,160,0.06);border:2px solid rgba(100,255,160,0.3);
          border-radius:14px;padding:14px 16px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
          <span style="color:rgba(255,255,255,0.5);font-size:13px;">Song name:</span>
          <input id="mc_titleIn" type="text" value="${this._title}" maxlength="30"
            style="flex:1;min-width:120px;background:rgba(255,255,255,0.08);
              border:1px solid rgba(100,255,160,0.3);border-radius:8px;
              color:white;font-size:13px;padding:7px 10px;outline:none;" />
          <button id="mc_save"
            style="background:rgba(100,255,160,0.25);color:#66ffaa;font-size:14px;font-weight:bold;
              border:2px solid rgba(100,255,160,0.55);border-radius:10px;padding:10px 20px;cursor:pointer;">
            🌍 Set as Global BG Music
          </button>
          <div id="mc_fb" style="width:100%;color:#80ff80;font-size:12px;min-height:14px;"></div>
        </div>

      </div>
    `;
  }

  private _wire(): void {
    const $ = (id: string) => document.getElementById(id)!;

    $("mc_close").onclick = () => this.destroy();

    // BPM
    const bpmEl = $("mc_bpmVal");
    $("mc_bpmDn").onclick = () => {
      this._bpm = Math.max(60, this._bpm - 5);
      bpmEl.textContent = String(this._bpm);
      if (this._previewPlaying) BgMusicManager.get().playSequencer(this._pattern());
    };
    $("mc_bpmUp").onclick = () => {
      this._bpm = Math.min(200, this._bpm + 5);
      bpmEl.textContent = String(this._bpm);
      if (this._previewPlaying) BgMusicManager.get().playSequencer(this._pattern());
    };

    // Grid toggle
    this._overlay.querySelectorAll<HTMLButtonElement>(".mc_cell").forEach(btn => {
      btn.addEventListener("pointerdown", e => {
        e.preventDefault();
        const ti = Number(btn.dataset.track);
        const si = Number(btn.dataset.step);
        this._grid[ti][si] = !this._grid[ti][si];
        const color = TRACKS[ti].color;
        btn.style.background = this._grid[ti][si]
          ? `rgba(${color},0.75)` : "rgba(255,255,255,0.06)";
      });
    });

    // Presets
    this._overlay.querySelectorAll<HTMLButtonElement>(".mc_preset").forEach(btn => {
      btn.onclick = () => {
        const p = PRESETS[btn.dataset.preset!];
        if (!p) return;
        this._grid = p.map(r => [...r]);
        this._refreshGrid();
        if (this._previewPlaying) BgMusicManager.get().playSequencer(this._pattern());
      };
    });

    // Clear
    $("mc_clear").onclick = () => {
      this._grid = empty();
      this._refreshGrid();
    };

    // Preview
    $("mc_play").onclick = () => {
      this._previewPlaying = true;
      BgMusicManager.get().playSequencer(this._pattern());
    };
    $("mc_stop").onclick = () => {
      this._previewPlaying = false;
      BgMusicManager.get().stop();
    };

    // Title sync
    ($("mc_titleIn") as HTMLInputElement).oninput = e => {
      this._title = (e.target as HTMLInputElement).value;
    };

    // Save global
    $("mc_save").onclick = async () => {
      this._title = ($("mc_titleIn") as HTMLInputElement).value.trim() || "My Beat";
      const pat = this._pattern();
      const mgr = BgMusicManager.get();
      await mgr.setGlobalSequencer(pat);
      mgr.playSequencer(pat);
      this._previewPlaying = true;
      const fb = $("mc_fb");
      fb.textContent = `✓ "${this._title}" is now playing globally for everyone!`;
      setTimeout(() => { fb.textContent = ""; }, 4000);
    };
  }

  private _pattern(): SequencerPattern {
    return {
      type: "sequencer",
      title: this._title || "My Beat",
      bpm: this._bpm,
      tracks: TRACKS.map((t, i) => ({ id: t.id, steps: [...this._grid[i]] })),
    };
  }

  private _refreshGrid(): void {
    this._overlay.querySelectorAll<HTMLButtonElement>(".mc_cell").forEach(btn => {
      const ti = Number(btn.dataset.track);
      const si = Number(btn.dataset.step);
      btn.style.background = this._grid[ti][si]
        ? `rgba(${TRACKS[ti].color},0.75)` : "rgba(255,255,255,0.06)";
    });
  }

  destroy(): void {
    this._overlay.remove();
  }
}

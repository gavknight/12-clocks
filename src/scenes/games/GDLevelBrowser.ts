// GDLevelBrowser.ts — browse published levels + manage own levels
import type { Game } from "../../game/Game";
import { gdLoadAll, gdMine, gdSearch, gdDelete, gdGetRating, gdSetRating, GD_DIFFICULTIES, type GDLevel } from "./GDStorage";

const FEATURED_KEY = 'gd_featured_levels';
type FeaturedEntry = { id: string; req: number };
function getFeaturedEntries(): FeaturedEntry[] { try { return JSON.parse(localStorage.getItem(FEATURED_KEY) ?? '[]'); } catch { return []; } }
function toggleFeatured(id: string): boolean {
  const entries = getFeaturedEntries();
  const i = entries.findIndex(e => e.id === id);
  if (i !== -1) { entries.splice(i, 1); localStorage.setItem(FEATURED_KEY, JSON.stringify(entries)); return false; }
  const reqStr = prompt('Coin requirement to play? (0 = free)', '0');
  const req = Math.max(0, parseInt(reqStr ?? '0') || 0);
  entries.push({ id, req });
  localStorage.setItem(FEATURED_KEY, JSON.stringify(entries));
  return true;
}

type Tab = 'published' | 'mine';

export class GDLevelBrowser {
  private _g:    Game;
  private _wrap: HTMLDivElement;
  private _tab:  Tab = 'published';

  constructor(g: Game, tab: Tab = 'published') {
    this._g  = g;
    this._tab = tab;
    this._wrap = document.createElement('div');
    this._wrap.style.cssText = [
      'position:fixed;inset:0;z-index:9999;pointer-events:all;',
      'display:flex;flex-direction:column;',
      'font-family:Arial,sans-serif;',
      'background:#700000;',
      'background-image:',
        'linear-gradient(rgba(0,0,0,0.28) 2px,transparent 2px),',
        'linear-gradient(90deg,rgba(0,0,0,0.28) 2px,transparent 2px);',
      'background-size:64px 64px;',
    ].join('');
    g.ui.innerHTML = '';
    g.ui.appendChild(this._wrap);
    this._render();
  }

  /* ── Render ─────────────────────────────────────────────── */
  private _render(): void {
    const isPublished = this._tab === 'published';
    const uid = this._g.currentAccountId ?? 'guest';

    this._wrap.innerHTML = `
      <style>
        .br-card {
          background:rgba(0,0,0,0.45);border:2px solid rgba(255,255,255,0.12);
          border-radius:12px;padding:10px 14px;
          display:flex;align-items:center;gap:10px;
        }
        .br-btn {
          background:rgba(0,0,0,0.4);color:white;
          border:2px solid rgba(255,255,255,0.2);padding:6px 14px;
          border-radius:8px;cursor:pointer;font-size:13px;white-space:nowrap;
        }
        .br-btn:hover { background:rgba(255,255,255,0.12); }
        #br-list { display:flex;flex-direction:column;gap:8px;padding:0 4px; }
      </style>

      <!-- Top bar -->
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;
        background:rgba(0,0,0,0.55);flex-shrink:0;">
        <div id="br-back" style="
          width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:16px;
          font-weight:900;color:white;display:flex;align-items:center;justify-content:center;
          background:linear-gradient(135deg,#cc0000,#880000);border:3px solid #ff4444;">✕</div>

        <button id="br-tab-pub" style="
          padding:6px 16px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:bold;
          background:${isPublished?'#ffcc00':'rgba(255,255,255,0.1)'};
          color:${isPublished?'#3a0000':'white'};">
          🔍 Search Levels
        </button>
        <button id="br-tab-mine" style="
          padding:6px 16px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:bold;
          background:${!isPublished?'#ffcc00':'rgba(255,255,255,0.1)'};
          color:${!isPublished?'#3a0000':'white'};">
          📁 My Levels
        </button>

        ${!isPublished ? `
          <button id="br-new" style="
            margin-left:auto;padding:6px 16px;border-radius:8px;border:none;cursor:pointer;
            background:#0066cc;color:white;font-size:13px;font-weight:bold;">
            + New Level
          </button>
        ` : ''}
      </div>

      <!-- Search bar (published tab only) -->
      ${isPublished ? `
        <div style="display:flex;gap:8px;padding:10px 14px;flex-shrink:0;">
          <input id="br-search" type="text" placeholder="Search by level name…"
            style="flex:1;background:rgba(0,0,0,0.5);color:white;
              border:2px solid rgba(255,255,255,0.25);border-radius:10px;
              padding:8px 14px;font-size:15px;outline:none;" />
          <button id="br-go" style="
            background:#ffcc00;color:#3a0000;border:none;border-radius:10px;
            padding:8px 18px;cursor:pointer;font-size:15px;font-weight:bold;">
            Search
          </button>
        </div>
      ` : ''}

      <!-- Level list -->
      <div style="flex:1;overflow-y:auto;padding:0 14px 14px;">
        <div id="br-list">
          ${isPublished
            ? '<div style="color:rgba(255,255,255,0.3);text-align:center;padding:30px;">Type a name above and hit Search</div>'
            : this._renderMyLevels(uid)
          }
        </div>
      </div>
    `;

    /* Wire back */
    document.getElementById('br-back')!.onclick = () => {
      this._wrap.remove();
      this._g.ui.innerHTML = '';
      import('./GeometryDash').then(m => new m.GeometryDash(this._g));
    };

    /* Tabs */
    document.getElementById('br-tab-pub')!.onclick  = () => { this._tab = 'published'; this._render(); };
    document.getElementById('br-tab-mine')!.onclick = () => { this._tab = 'mine';      this._render(); };

    /* New level */
    document.getElementById('br-new')?.addEventListener('click', () => {
      this._wrap.remove();
      import('./GDLevelEditor').then(m => new m.GDLevelEditor(this._g));
    });

    /* Search */
    if (isPublished) {
      const go = () => {
        const q = (document.getElementById('br-search') as HTMLInputElement).value;
        const results = gdSearch(q);
        document.getElementById('br-list')!.innerHTML =
          results.length
            ? results.map(l => this._cardHTML(l, false)).join('')
            : `<div style="color:rgba(255,255,255,0.3);text-align:center;padding:30px;">No published levels found for "${q}"</div>`;
        this._wireCards(results, false);
      };
      document.getElementById('br-go')!.onclick = go;
      document.getElementById('br-search')!.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    } else {
      const mine = gdMine(uid);
      this._wireCards(mine, true);
    }
  }

  /* ── My Levels HTML ────────────────────────────────────────── */
  private _renderMyLevels(uid: string): string {
    const mine = gdMine(uid);
    if (!mine.length) return `
      <div style="color:rgba(255,255,255,0.3);text-align:center;padding:40px;font-size:15px;">
        📭 No levels yet — click "+ New Level" to create one!
      </div>`;
    return mine.map(l => this._cardHTML(l, true)).join('');
  }

  /* ── Card HTML ─────────────────────────────────────────────── */
  private _cardHTML(l: GDLevel, showEdit: boolean): string {
    const ri = gdGetRating(l.id);
    const diff = ri !== null ? GD_DIFFICULTIES[ri] : null;
    return `
      <div class="br-card">
        <div style="flex:1;min-width:0;">
          <div style="color:#ffcc00;font-size:15px;font-weight:bold;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l.name}</div>
          <div style="color:rgba(255,255,255,0.4);font-size:11px;margin-top:2px;">
            by ${l.authorName}
            ${showEdit ? (l.published ? ' · 🌐 Published' : ' · 🔒 Draft') : ''}
            · ${l.objects.length} objects
          </div>
          ${diff ? `<div style="display:inline-block;margin-top:4px;background:${diff.color}22;
            border:1px solid ${diff.color};color:${diff.color};
            font-size:10px;font-weight:bold;padding:1px 7px;border-radius:20px;">
            ${diff.emoji} ${diff.name}</div>` : ''}
        </div>
        <button class="br-btn br-rate" data-id="${l.id}"
          style="background:#333;border-color:#666;color:#aaa;font-size:12px;">⭐ Rate</button>
        <button class="br-btn br-play" data-id="${l.id}"
          style="background:#004400;border-color:#228822;color:#7fff7f;">▶ Play</button>
        ${showEdit ? `
          <button class="br-btn br-feat" data-id="${l.id}"
            style="background:${getFeaturedEntries().some(e=>e.id===l.id)?'#554400':'#222'};border-color:${getFeaturedEntries().some(e=>e.id===l.id)?'#ffcc00':'#555'};color:${getFeaturedEntries().some(e=>e.id===l.id)?'#ffcc00':'#888'};" title="Pin to Play screen">📌</button>
          <button class="br-btn br-edit" data-id="${l.id}"
            style="background:#003366;border-color:#3366cc;">✏️ Edit</button>
          <button class="br-btn br-del" data-id="${l.id}"
            style="background:#440000;border-color:#cc0000;color:#ff8888;">🗑</button>
        ` : ''}
      </div>`;
  }

  /* ── Wire card buttons ──────────────────────────────────────── */
  private _wireCards(levels: GDLevel[], showEdit: boolean): void {
    const all = gdLoadAll();

    document.querySelectorAll<HTMLElement>('.br-rate').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id!;
        const current = gdGetRating(id) ?? -1;
        const picker = document.createElement('div');
        picker.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.88);';
        picker.innerHTML = `
          <div style="background:#1a1a2e;border:2px solid rgba(255,255,255,0.15);border-radius:16px;
            padding:20px;max-width:320px;width:90%;display:flex;flex-direction:column;gap:8px;">
            <div style="color:#ffcc00;font-size:16px;font-weight:900;margin-bottom:4px;">⭐ Rate this level</div>
            ${GD_DIFFICULTIES.map((d, di) => `
              <button class="diff-pick" data-di="${di}" style="
                background:${di===current?d.color+'33':'rgba(255,255,255,0.05)'};
                border:2px solid ${di===current?d.color:'rgba(255,255,255,0.1)'};
                color:${di===current?d.color:'rgba(255,255,255,0.7)'};
                border-radius:8px;padding:7px 14px;font-size:12px;font-weight:bold;cursor:pointer;text-align:left;">
                ${d.emoji} ${d.name}</button>`).join('')}
            <button id="rate-cancel" style="margin-top:4px;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.4);
              border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:6px;font-size:12px;cursor:pointer;">Cancel</button>
          </div>`;
        picker.querySelector('#rate-cancel')!.addEventListener('click', () => picker.remove());
        picker.querySelectorAll<HTMLElement>('.diff-pick').forEach(pb => {
          pb.addEventListener('click', () => {
            gdSetRating(id, +pb.dataset.di!);
            picker.remove();
            this._render();
          });
        });
        document.body.appendChild(picker);
      };
    });

    document.querySelectorAll<HTMLElement>('.br-play').forEach(btn => {
      btn.onclick = () => {
        const lvl = all.find(l => l.id === btn.dataset.id);
        if (!lvl) return;
        this._wrap.remove();
        import('./GeometryDash').then(m =>
          new m.GeometryDash(this._g, lvl, true)
        );
      };
    });

    if (!showEdit) return;

    document.querySelectorAll<HTMLElement>('.br-edit').forEach(btn => {
      btn.onclick = () => {
        const lvl = levels.find(l => l.id === btn.dataset.id);
        if (!lvl) return;
        this._wrap.remove();
        import('./GDLevelEditor').then(m => new m.GDLevelEditor(this._g, lvl));
      };
    });

    document.querySelectorAll<HTMLElement>('.br-feat').forEach(btn => {
      btn.onclick = () => {
        toggleFeatured(btn.dataset.id!);
        this._render();
      };
    });

    document.querySelectorAll<HTMLElement>('.br-del').forEach(btn => {
      btn.onclick = () => {
        if (!confirm('Delete this level?')) return;
        gdDelete(btn.dataset.id!);
        this._render();
      };
    });
  }
}

export class InputManager {
  private keys: Set<string> = new Set();
  private readonly _down: (e: KeyboardEvent) => void;
  private readonly _up: (e: KeyboardEvent) => void;

  constructor() {
    this._down = (e) => this.keys.add(e.code);
    this._up = (e) => this.keys.delete(e.code);
    window.addEventListener("keydown", this._down);
    window.addEventListener("keyup", this._up);
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  dispose(): void {
    window.removeEventListener("keydown", this._down);
    window.removeEventListener("keyup", this._up);
    this.keys.clear();
  }
}

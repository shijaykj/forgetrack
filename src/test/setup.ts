import 'fake-indexeddb/auto';

/**
 * Node 25+ defines a global `localStorage` that is unusable unless Node is
 * started with --localstorage-file. Install a small in-memory Storage so
 * persisted zustand stores (e.g. the rest timer) behave like in a browser.
 */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  removeItem(k: string) { this.map.delete(k); }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
}

const ls = (globalThis as { localStorage?: Storage }).localStorage;
if (!ls || typeof ls.setItem !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true, writable: true });
}

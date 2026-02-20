import "@testing-library/jest-dom/vitest";

// jsdom 在 vitest 中的 localStorage 有时不完整
// 提供一个兼容的 polyfill
if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage.getItem !== "function") {
  const store: Record<string, string> = {};
  const storage: Storage = {
    getItem(key: string) { return store[key] ?? null; },
    setItem(key: string, value: string) { store[key] = String(value); },
    removeItem(key: string) { delete store[key]; },
    clear() { Object.keys(store).forEach((k) => delete store[k]); },
    key(index: number) { return Object.keys(store)[index] ?? null; },
    get length() { return Object.keys(store).length; },
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, writable: true });
}

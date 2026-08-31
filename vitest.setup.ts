// vitest 全局 setup
// 背景：vitest 2.1.9 在 Node 22+ 下通过 populateGlobal 将 jsdom window 拷贝到全局时，
// localStorage 会丢失 Storage 原型方法（clear/setItem/getItem 等），导致
// window.localStorage.clear is not a function。
// 这里在 jsdom 环境下从 jsdom 原生 window 恢复 localStorage 实现；node 环境下为 no-op。
const jsdomWindow = (globalThis as { jsdom?: { window: Window & { localStorage: Storage } } }).jsdom?.window;
if (
  jsdomWindow
  && typeof jsdomWindow.localStorage?.clear === "function"
  && typeof (globalThis as { localStorage?: Storage }).localStorage?.clear !== "function"
) {
  Object.defineProperty(globalThis, "localStorage", { value: jsdomWindow.localStorage, configurable: true, writable: true });
}

// Radix Select 在 jsdom 中依赖的 DOM API（hasPointerCapture / scrollIntoView）未实现，补充 no-op polyfill。
// node 环境下不存在 Element，自动跳过；仅 jsdom 环境生效。
if (typeof Element !== "undefined") {
  const elementPrototype = Element.prototype as unknown as Record<string, unknown>;
  if (typeof elementPrototype.hasPointerCapture !== "function") {
    elementPrototype.hasPointerCapture = () => false;
    elementPrototype.setPointerCapture = () => undefined;
    elementPrototype.releasePointerCapture = () => undefined;
  }
  if (typeof elementPrototype.scrollIntoView !== "function") {
    elementPrototype.scrollIntoView = () => undefined;
  }
}

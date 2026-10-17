// happy-dom has no matchMedia by default; components read it for reduced
// motion and hover capability.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
// IntersectionObserver / ResizeObserver: present in browsers, absent here.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
for (const name of ["IntersectionObserver", "ResizeObserver"] as const) {
  if (!(name in window)) Object.defineProperty(window, name, { value: NoopObserver });
}

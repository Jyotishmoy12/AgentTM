import type { DesktopBridge } from '../types/Onboarding';

const bridges = new WeakMap<DesktopBridge, DesktopBridge>();

export function desktopBridge(): DesktopBridge | undefined {
  const bridge = window.go?.main?.Desktop;
  if (!bridge) return undefined;
  let handler = bridges.get(bridge);
  if (!handler) {
    handler = new Proxy(bridge, {
      get(target, property) {
        const value = Reflect.get(target, property);
        return typeof value === 'function'
          ? (...args: unknown[]) => Reflect.apply(value, target, args)
          : value;
      },
    });
    bridges.set(bridge, handler);
  }
  return handler;
}

export function copyText(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

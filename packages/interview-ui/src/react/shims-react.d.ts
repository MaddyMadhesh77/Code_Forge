declare module 'react' {
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useRef<T>(initialValue: T): { current: T };
  export function useState<S>(initialState: S | (() => S)): [S, (next: S) => void];
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  const React: any;
  export default React;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

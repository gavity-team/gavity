export function toCachedFn<P extends any[], R>(fn: (...args: P) => R): (...args: P) => R {
  let cache: R, isCached = false;
  return (...args: P) => {
    if (!isCached) {
      cache = fn(...args);
      isCached = true;
    }
    return cache;
  };
}

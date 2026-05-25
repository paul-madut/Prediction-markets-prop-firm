import { useEffect, useState } from "react";

/**
 * Defers a fast-changing value until the user has stopped pushing updates
 * for `delay` ms. Useful for search inputs that should hit the network only
 * after the user pauses typing.
 *
 * Returns the latest value once it has been stable for `delay` ms. On
 * unmount or a fresh update the pending timer is cancelled, so we never
 * fire on a stale value.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

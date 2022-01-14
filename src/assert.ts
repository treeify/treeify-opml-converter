/**
 * nullではないことを表明する。
 * もしnullの場合は例外を投げる。
 */
export function assertNonNull<T>(value: T | null): asserts value is T {
  console.assert(value !== null)
  if (value === null) {
    throw new Error()
  }
}

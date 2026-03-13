export function coerceDateFields<T extends Record<string, unknown>>(
  obj: T,
  ...fields: string[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    const val = result[field];
    if (typeof val === "string") {
      (result as Record<string, unknown>)[field] = new Date(val);
    }
  }
  return result;
}

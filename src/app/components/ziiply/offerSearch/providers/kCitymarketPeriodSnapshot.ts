// A publisher's AV/LV entry can roll forward before the current period ends.
// Keep the validated output independent of deployment-local Next.js caches.
export async function resolveKCitymarketPeriodSnapshot<T>(options: {
  read: () => Promise<T | null>;
  parse: () => Promise<T>;
  write: (payload: T) => Promise<void>;
  validate: (payload: T) => boolean;
}): Promise<T> {
  const saved = await options.read();
  if (saved && options.validate(saved)) return saved;
  const fresh = await options.parse();
  if (!options.validate(fresh)) throw new Error("Invalid K-Citymarket period snapshot");
  await options.write(fresh);
  return fresh;
}

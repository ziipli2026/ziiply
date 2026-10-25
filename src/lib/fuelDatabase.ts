// The curated fuel registry lives on the primary Neon branch. The desktop
// preview must read the same station catalog and prices as the mobile app.
// Do not silently fall back to the obsolete Tankkaus validation branch.
export function fuelDatabaseConfig(env:Record<string,string|undefined>=process.env){
  const connection=env.DATABASE_URL||env.POSTGRES_URL;
  return {
    production:true,
    connection,
    expectedBranch:'br-lucky-fog-b1hwz641',
  };
}

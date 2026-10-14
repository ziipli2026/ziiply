export function fuelDatabaseConfig(env:Record<string,string|undefined>=process.env){
  const production=env.FUEL_PRODUCTION_ENABLED==='true';
  const connection=production?(env.DATABASE_URL||env.POSTGRES_URL):env.TANKKAUS_TEST_DATABASE_URL;
  return {
    production,connection,
    expectedBranch:production?'br-lucky-fog-b1hwz641':'br-weathered-meadow-b1bwpzst',
  };
}

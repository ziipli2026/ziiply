/** Desktop preview reads the same dedicated fuel registry as production. */
export function fuelDatabaseConfig(env:Record<string,string|undefined>=process.env){
  return {
    production:true,
    connection:env.FUEL_DATABASE_URL,
    expectedBranch:'br-lucky-fog-b1hwz641',
  };
}

const fs = require('node:fs');
const vm = require('node:vm');
module.exports = function readSearchRegistry() {
  const source = fs.readFileSync('src/app/components/ziiply/search/searchCategoryRegistry.ts', 'utf8');
  const section = source.split('export const SEARCH_INTENTS: SearchIntent[] = ')[1];
  if (!section) throw Error('SEARCH_INTENTS missing');
  return vm.runInNewContext(section.replace(/;\s*$/, ''), Object.create(null), {timeout:1000});
};

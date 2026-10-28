import type { Product } from './engine';
export const scenarios = ['Tavallinen haku', 'Neon tyhjä', 'Neon virhe', 'S virhe', 'Kuva puuttuu', 'EAN ja pakkauserot'] as const;
export type Scenario = typeof scenarios[number];
export function fixture(scenario: Scenario, source: string): Product[] {
  const first = { ean: '6410000000001', name: 'SIMULAATIO · Lager olut 0,33 l', imageUrl: '/storelogos/s-group.png' };
  if(source === 'Neon') {
    if(scenario === 'Neon virhe') throw new Error('Simuloitu Neon-virhe');
    if(scenario === 'Neon tyhjä') return [];
    return [{ ...first, imageUrl: null }, { ean: '6410000000002', name: 'SIMULAATIO · Alkoholiton olut 0,33 l', imageUrl: null }];
  }
  if(source === 'S' && scenario === 'S virhe') throw new Error('Simuloitu S-virhe');
  const items: Product[] = [{ ...first, imageUrl: scenario === 'Kuva puuttuu' ? null : first.imageUrl, price: source === 'S' ? 1.25 : 1.39 }, { ean: '6410000000003', name: 'SIMULAATIO · Kaupasta löytynyt uusi olut', price: 1.79 }];
  if(scenario === 'EAN ja pakkauserot') items.push({ ean: '6410000000004', name: first.name + ' 6-pack', price: 7.49 }, { id: 'no-ean', name: first.name, price: null });
  return items;
}

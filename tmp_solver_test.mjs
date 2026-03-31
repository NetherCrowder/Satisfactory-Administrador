import solver from './src/solver/Solver.js';
import dataManager from './src/data/dataManager.js';

const selectedProducts = [
  { itemId: 'Desc_ModularFrameFused_C', rate: 5 },
  { itemId: 'Desc_MotorLightweight_C', rate: 5 }
];

const basicRecipes = dataManager.getBasicRecipes();
const activeRecipes = basicRecipes.map(r => r.id);

const selectedTargetIds = selectedProducts.map(p => p.itemId);
console.log('selected target products:', selectedTargetIds);
console.log('active recipes count', activeRecipes.length);

const findItemId = (name) => {
  const item = dataManager.getAllItems().find(i => i.name === name || i.slug === name || i.className === name);
  if (!item) {
    console.error('Item not found for name', name);
    return null;
  }
  return item.id;
};

const importedSupply = {};
const rawSupply = {
  [findItemId('Iron Ore')]: 10000,
  [findItemId('Copper Ore')]: 10000,
  [findItemId('Coal')]: 10000,
  [findItemId('Limestone')]: 10000,
  [findItemId('Water')]: 10000,
  [findItemId('Caterium Ore')]: 10000,
  [findItemId('Raw Quartz')]: 10000,
  [findItemId('Sulfur')]: 10000,
  [findItemId('Crude Oil')]: 10000,
  [findItemId('Nitrogen Gas')]: 10000,
  [findItemId('Bauxite')]: 10000
};

const options = {
  overclock: 1,
  minerPurityMultiplier: 1,
  minerBaseRate: 60,
  activeRecipes,
  rawSupply,
  importedSupply
};

try {
  const result = solver.solve(selectedProducts, null, options);
  console.log('Solver executed successfully.');
  console.log('nodes:', result.nodes.length, 'edges:', result.edges.length);
  console.log('sample nodes:', result.nodes.slice(0, 5).map(n => ({ id: n.id, label: n.data.label, details: n.data.details, rate: n.data.rate })));
} catch (err) {
  console.error('Solver error:', err.message);
}

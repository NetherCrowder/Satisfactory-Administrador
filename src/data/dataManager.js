import gameData from './data-ficsmas.json';

class DataManager {
  constructor() {
    this.data = gameData;
  }

  // --- Items ---
  getAllItems() {
    return Object.entries(this.data.items || {}).map(([id, item]) => ({ id, ...item }));
  }

  getItem(itemId) {
    const item = this.data.items[itemId];
    return item ? { id: itemId, ...item } : undefined;
  }

  // --- Recetas ---
  getAllRecipes() {
    return Object.entries(this.data.recipes || {}).map(([id, recipe]) => ({ id, ...recipe }));
  }

  getRecipe(recipeId) {
    return this.data.recipes[recipeId];
  }

  // Devuelve todas las recetas que producen un ítem en específico
  getRecipesProducing(itemId) {
    return this.getAllRecipes().filter(recipe => {
      return recipe.products && recipe.products.some(p => p.item === itemId);
    });
  }

  // Devuelve todas las recetas que usan un ítem como ingrediente
  getRecipesConsuming(itemId) {
    return this.getAllRecipes().filter(recipe => {
      return recipe.ingredients && recipe.ingredients.some(ig => ig.item === itemId);
    });
  }

  // --- Edificios de Producción ---
  getAllBuildings() {
    return Object.entries(this.data.buildings || {}).map(([id, building]) => ({ id, ...building }));
  }

  getBuilding(buildingId) {
    const building = this.data.buildings[buildingId];
    return building ? { id: buildingId, ...building } : undefined;
  }

  // --- Recursos Crudos (Minerales, Agua, etc.) ---
  isRawResource(itemId) {
    return this.data.resources && this.data.resources[itemId] !== undefined;
  }

  // --- Recetas Básicas y Alternativas ---
  getBasicRecipes() {
    return this.getAllRecipes().filter(recipe => recipe.inMachine === true && recipe.alternate === false && recipe.forBuilding !== true);
  }

  getAlternativeRecipes() {
    return this.getAllRecipes().filter(recipe => recipe.inMachine === true && recipe.alternate === true && recipe.forBuilding !== true);
  }

  // --- Filtrar recetas producidas en máquinas ---
  isMachineProduced(recipe) {
    return recipe.inMachine === true;
  }
}

// Instancia global del manejador
const dataManager = new DataManager();
export default dataManager;

import gameData from './data-ficsmas.json' with { type: 'json' };

class DataManager {
  constructor() {
    this.data = gameData;
  }

  // --- Items ---
  getAllItems() {
    return Object.values(this.data.items || {});
  }

  getItem(itemId) {
    return this.data.items[itemId];
  }

  // --- Recetas ---
  getAllRecipes() {
    return Object.values(this.data.recipes || {});
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
    return Object.values(this.data.buildings || {});
  }

  getBuilding(buildingId) {
    return this.data.buildings[buildingId];
  }

  // --- Recursos Crudos (Minerales, Agua, etc.) ---
  isRawResource(itemId) {
    return this.data.resources && this.data.resources[itemId] !== undefined;
  }
}

// Instancia global del manejador
const dataManager = new DataManager();
export default dataManager;

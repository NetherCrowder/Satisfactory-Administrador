import dataManager from '../data/dataManager.js';
import solver from './Solver.js';

/**
 * Obtiene todos los recursos crudos disponibles en el juego
 * @returns {Array} Lista de objetos {id, name, isLiquid, isGas}
 */
export function getAllRawResources() {
  const resources = [];
  const allItems = dataManager.getAllItems();

  allItems.forEach(item => {
    if (dataManager.isRawResource(item.className)) {
      resources.push({
        id: item.className,
        name: item.name,
        isLiquid: item.liquid === true,
        isGas: item.gas === true
      });
    }
  });

  return resources.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Calcula los recursos crudos necesarios para un objetivo dado
 * @param {string} itemId - ID del ítem objetivo
 * @param {number} rate - Tasa de producción en items/min
 * @param {object} externalInputs - Mapa de itemId -> cantidad disponible/min (inputs externos)
 * @param {object} options - Opciones del solver
 * @returns {object} Mapa de recursoId -> tasa requerida
 */
export function calculateRequiredResources(itemId, rate, externalInputs = {}, options = {}) {
  try {
    // Si este item está disponible externamente, ajustamos la tasa requerida
    let effectiveRate = rate;
    if (externalInputs[itemId]) {
      const availableExternal = externalInputs[itemId];
      if (availableExternal >= rate) {
        // Completamente cubierto por inputs externos
        return {};
      } else {
        // Parcialmente cubierto
        effectiveRate = rate - availableExternal;
      }
    }

    const solverInstance = new solver(externalInputs);
    const graph = solverInstance.solve(itemId, effectiveRate, options);
    const requiredResources = {};

    // Extraer nodos y verificar si producen items disponibles externamente
    graph.nodes.forEach(node => {
      if (node.data.label === 'Miner' || node.data.label === 'Extracción Cruda') {
        const resourceId = node.data.details;
        const resourceRate = node.data.rate || 0;
        requiredResources[resourceId] = (requiredResources[resourceId] || 0) + resourceRate;
      } else if (node.data.outputs && node.data.outputs.length > 0) {
        // Este es un nodo de producción (fábrica)
        const producedItem = node.data.outputs[0]; // Asumimos que el primer output es el principal
        if (externalInputs[producedItem]) {
          // Este item está disponible externamente, no necesitamos producirlo
          // Pero necesitamos reducir la tasa de producción de este nodo
          // Por simplicidad, por ahora solo manejamos el caso donde el item objetivo está disponible
        }
      }
    });

    // Si el item objetivo está disponible como input externo, no necesitamos producirlo
    if (externalInputs[itemId] && externalInputs[itemId] >= rate) {
      return {}; // No se necesitan recursos
    }

    return requiredResources;
  } catch (e) {
    console.error('Error calculating resources:', e);
    return {};
  }
}

/**
 * Calcula los recursos crudos necesarios para múltiples objetivos
 * @param {Array} objectives - Array de {itemId, rate}
 * @param {object} externalInputs - Mapa de itemId -> cantidad disponible/min (inputs externos)
 * @param {object} options - Opciones del solver
 * @returns {object} Mapa de recursoId -> tasa total requerida
 */
export function calculateTotalRequiredResources(objectives, externalInputs = {}, options = {}) {
  const totalResources = {};

  objectives.forEach(objective => {
    const required = calculateRequiredResources(objective.itemId, objective.rate, externalInputs, options);
    Object.entries(required).forEach(([resourceId, rate]) => {
      totalResources[resourceId] = (totalResources[resourceId] || 0) + rate;
    });
  });

  return totalResources;
}

/**
 * Encuentra la máxima tasa de producción para un objetivo dado límites de recursos disponibles
 * @param {string} itemId - ID del ítem objetivo
 * @param {object} availableResources - Mapa de recursoId -> cantidad disponible/min
 * @param {object} externalInputs - Mapa de itemId -> cantidad disponible/min (inputs externos)
 * @param {object} options - Opciones del solver
 * @param {number} startRate - Tasa inicial (default 1)
 * @param {number} maxIterations - Máximo de iteraciones (default 50)
 * @returns {object} { maxRate, requiredResources, limitingResource, message }
 */
export function maximizeProductionForObjective(itemId, availableResources, externalInputs = {}, options = {}, startRate = 1, maxIterations = 50) {
  // Si no hay límites definidos, devolver tasa alta arbitraria
  if (!availableResources || Object.keys(availableResources).length === 0) {
    return {
      maxRate: 1000,
      requiredResources: {},
      limitingResource: null,
      message: 'Sin límites de recursos definidos - producción ilimitada'
    };
  }

  // Calcular recursos requeridos con tasa inicial
  const initialResources = calculateRequiredResources(itemId, startRate, externalInputs, options);
  
  // Si no requiere recursos crudos, puede ser ilimitado
  if (Object.keys(initialResources).length === 0) {
    return {
      maxRate: 1000,
      requiredResources: {},
      limitingResource: null,
      message: 'No requiere recursos crudos - producción ilimitada'
    };
  }

  // Verificar si todos los recursos requeridos están en 0
  const allResourcesZero = Object.keys(initialResources).every(resourceId => 
    availableResources[resourceId] === 0 || availableResources[resourceId] === undefined
  );
  
  if (allResourcesZero) {
    return {
      maxRate: 0,
      requiredResources: initialResources,
      limitingResource: Object.keys(initialResources)[0],
      message: 'Sin recursos disponibles para este objetivo'
    };
  }

  let currentRate = startRate;
  let increment = startRate;
  let optimalRate = startRate;
  let optimalResources = initialResources;
  let iterations = 0;
  let limitingResource = null;

  // Binary search para encontrar el máximo rate
  while (iterations < maxIterations) {
    const nextRate = currentRate + increment;
    const requiredResources = calculateRequiredResources(itemId, nextRate, externalInputs, options);

    // Verificar si cumple con todos los límites
    let withinLimits = true;
    let currentLimitingResource = null;
    let maxExcess = 0;

    for (const [resourceId, required] of Object.entries(requiredResources)) {
      const available = availableResources[resourceId];
      if (available !== undefined && required > available) {
        withinLimits = false;
        const excess = required - available;
        if (excess > maxExcess) {
          maxExcess = excess;
          currentLimitingResource = resourceId;
        }
      }
    }

    if (withinLimits) {
      // Incremento exitoso, continuar
      optimalRate = nextRate;
      optimalResources = requiredResources;
      currentRate = nextRate;
      limitingResource = currentLimitingResource;
      // Incrementar más agresivamente si estamos muy debajo del límite
      increment = Math.max(increment * 1.1, 0.1);
    } else {
      // Cuando excedemos, usar binary search más fino
      increment *= 0.5;

      // Si el incremento es muy pequeño, detener
      if (increment < 0.01) {
        const resourceName = currentLimitingResource ? dataManager.getItem(currentLimitingResource)?.name || currentLimitingResource : 'desconocido';
        return {
          maxRate: optimalRate,
          requiredResources: optimalResources,
          limitingResource: currentLimitingResource,
          message: `Limitado por ${resourceName} (${(requiredResources[currentLimitingResource] || 0).toFixed(1)}/${availableResources[currentLimitingResource]} /min)`,
          iterations
        };
      }
    }

    iterations++;
  }

  return {
    maxRate: optimalRate,
    requiredResources: optimalResources,
    limitingResource,
    iterations
  };
}

/**
 * Maximiza la producción de múltiples objetivos respetando límites globales de recursos
 * @param {Array} objectives - Array de {itemId, rate, isMaximizing}
 * @param {object} availableResources - Mapa de recursoId -> cantidad disponible/min
 * @param {object} externalInputs - Mapa de itemId -> cantidad disponible/min (inputs externos)
 * @param {object} options - Opciones del solver
 * @returns {object} { optimizedObjectives, totalResources, limitingFactors, externalInputsUsed }
 */
export function optimizeMultiObjectiveProduction(objectives, availableResources, externalInputs = {}, options = {}) {
  const optimizedObjectives = [...objectives];
  const totalResources = {};
  const limitingFactors = {};
  const externalInputsUsed = {};

  // Combinar recursos disponibles con inputs externos
  const combinedResources = { ...availableResources };
  Object.entries(externalInputs).forEach(([itemId, rate]) => {
    combinedResources[itemId] = (combinedResources[itemId] || 0) + rate;
  });

  // Primero, calcular recursos requeridos por objetivos no maximizados
  const fixedObjectives = objectives.filter(obj => !obj.isMaximizing);
  
  // Procesar objetivos fijos considerando inputs externos
  const processedFixedObjectives = fixedObjectives.map(obj => {
    let effectiveRate = obj.rate;
    if (externalInputs[obj.itemId]) {
      const availableExternal = externalInputs[obj.itemId];
      if (availableExternal >= obj.rate) {
        effectiveRate = 0;
        externalInputsUsed[obj.itemId] = (externalInputsUsed[obj.itemId] || 0) + obj.rate;
      } else {
        effectiveRate = obj.rate - availableExternal;
        externalInputsUsed[obj.itemId] = (externalInputsUsed[obj.itemId] || 0) + availableExternal;
      }
    }
    return { ...obj, effectiveRate };
  });

  const fixedResources = calculateTotalRequiredResources(
    processedFixedObjectives.map(obj => ({ ...obj, rate: obj.effectiveRate })), 
    externalInputs,
    options
  );

  // Recursos restantes disponibles (incluyendo inputs externos)
  const remainingResources = { ...combinedResources };
  Object.entries(fixedResources).forEach(([resourceId, used]) => {
    if (remainingResources[resourceId] !== undefined) {
      remainingResources[resourceId] -= used;
      if (remainingResources[resourceId] < 0) {
        limitingFactors[resourceId] = `Recursos insuficientes para objetivos fijos: ${used.toFixed(1)} requerido, ${combinedResources[resourceId]} disponible`;
      }
    }
  });

  // Ahora maximizar objetivos que lo requieren
  const maximizingObjectives = objectives.filter(obj => obj.isMaximizing);

  maximizingObjectives.forEach((objective, index) => {
    // Considerar inputs externos para este objetivo
    let effectiveRate = objective.rate || 1;
    let externalUsed = 0;

    if (externalInputs[objective.itemId]) {
      const availableExternal = externalInputs[objective.itemId];
      const originalRate = objective.rate || 1;
      
      if (availableExternal >= originalRate) {
        // Completamente cubierto por inputs externos - no necesitamos producir más
        const finalRate = originalRate;
        externalUsed = originalRate;
        
        // Actualizar la tasa optimizada
        const objectiveIndex = objectives.findIndex(obj => obj === objective);
        optimizedObjectives[objectiveIndex] = {
          ...objective,
          rate: finalRate,
          optimizationInfo: {
            maxRate: 0, // No necesitamos producir
            requiredResources: {},
            limitingResource: null,
            message: `Completamente satisfecho por inputs externos (${originalRate}/min)`
          }
        };

        // Registrar uso de inputs externos
        externalInputsUsed[objective.itemId] = externalUsed;
        return; // Salir de la iteración
      } else {
        // Parcialmente cubierto
        effectiveRate = originalRate - availableExternal;
        externalUsed = availableExternal;
      }
    }

    const result = maximizeProductionForObjective(
      objective.itemId,
      remainingResources,
      options,
      effectiveRate,
      50
    );

    // Ajustar la tasa final considerando los inputs externos
    const finalRate = result.maxRate + externalUsed;

    // Actualizar la tasa optimizada
    const objectiveIndex = objectives.findIndex(obj => obj === objective);
    optimizedObjectives[objectiveIndex] = {
      ...objective,
      rate: finalRate,
      optimizationInfo: result
    };

    // Actualizar recursos usados (solo para la parte que necesitamos producir)
    if (result.maxRate > 0) {
      Object.entries(result.requiredResources).forEach(([resourceId, used]) => {
        totalResources[resourceId] = (totalResources[resourceId] || 0) + used;
        if (remainingResources[resourceId] !== undefined) {
          remainingResources[resourceId] -= used;
        }
      });
    }

    if (result.limitingResource) {
      limitingFactors[result.limitingResource] = result.message;
    }

    // Registrar uso de inputs externos
    if (externalUsed > 0) {
      externalInputsUsed[objective.itemId] = externalUsed;
    }
  });

  // Calcular uso de inputs externos
  Object.entries(externalInputs).forEach(([itemId, available]) => {
    const originalAvailable = availableResources[itemId] || 0;
    const totalAvailable = originalAvailable + available;
    const remaining = remainingResources[itemId] || 0;
    const used = Math.max(0, totalAvailable - remaining);
    const externalUsed = Math.max(0, used - originalAvailable);
    if (externalUsed > 0) {
      externalInputsUsed[itemId] = externalUsed;
    }
  });

  // Agregar recursos de objetivos fijos al total
  Object.entries(fixedResources).forEach(([resourceId, used]) => {
    totalResources[resourceId] = (totalResources[resourceId] || 0) + used;
  });

  return {
    optimizedObjectives,
    totalResources,
    limitingFactors,
    externalInputsUsed,
    remainingResources
  };
}

export default {
  getAllRawResources,
  calculateRequiredResources,
  calculateTotalRequiredResources,
  maximizeProductionForObjective,
  optimizeMultiObjectiveProduction
};
import dataManager from '../data/dataManager.js';

class Solver {
  constructor() {
    this.nodes = [];
    this.edges = [];
    this.nodeCounter = 0;
  }

  // Resuelve la cadena productiva hacia atrás
  solve(targetItemId, targetRate, options = {}) {
    this.nodes = [];
    this.edges = [];
    this.inventory = {}; // Almacén Virtual para Subproductos
    this.nodeCounter = 0;
    
    this.options = {
      minerPurityMultiplier: options.minerPurityMultiplier || 1,
      minerBaseRate: options.minerBaseRate || 60,
      overclock: options.overclock || 1,
      enabledAlternates: options.enabledAlternates || []
    };

    const outputNodeId = this._addNode('Output', targetItemId, targetRate, 0, null);
    this._calculateNode(targetItemId, targetRate, outputNodeId, 0, []);

    // --- CONSOLIDACIÓN DEL GRAFO (Post-procesamiento Modular) ---
    // Esta maravilla agrupa todos los nodos idénticos (Ej. 40 fundiciones repetidas separadas) en 1 solo súper módulo.
    const consolidatedNodesMap = {};
    const finalNodes = [];
    
    this.nodes.forEach(node => {
      // Clave de agrupación: el tipo de edificio y el ítem que produce
      const key = `${node.data.label}_${node.data.details}`;
      if (!consolidatedNodesMap[key]) {
        const clonedNode = JSON.parse(JSON.stringify(node));
        clonedNode.id = `consolid_` + key;
        consolidatedNodesMap[key] = clonedNode;
        finalNodes.push(clonedNode);
      } else {
        consolidatedNodesMap[key].data.rate += node.data.rate;
        consolidatedNodesMap[key].data.machines += node.data.machines;
      }
      node._consolidatedId = `consolid_` + key;
    });

    const finalEdgesMap = {};
    const finalEdges = [];
    const targetHandleCounts = {}; // Rastreador de entradas múltiples

    this.edges.forEach(edge => {
      const oldSource = this.nodes.find(n => n.id === edge.source);
      const oldTarget = this.nodes.find(n => n.id === edge.target);
      if (!oldSource || !oldTarget) return;

      const newSourceId = oldSource._consolidatedId;
      const newTargetId = oldTarget._consolidatedId;
      const key = `${newSourceId}_${newTargetId}_${edge._itemId}`;

      if (!finalEdgesMap[key]) {
        if (!targetHandleCounts[newTargetId]) targetHandleCounts[newTargetId] = 0;
        const handleIndex = targetHandleCounts[newTargetId];
        targetHandleCounts[newTargetId]++;

        const clonedEdge = JSON.parse(JSON.stringify(edge));
        clonedEdge.id = key;
        clonedEdge.source = newSourceId;
        clonedEdge.target = newTargetId;
        clonedEdge.targetHandle = `in-${handleIndex}`; // Asignar al pin magnético correspondiente
        finalEdgesMap[key] = clonedEdge;
        finalEdges.push(clonedEdge);
      } else {
        // En lugar de múltiples líneas para lo mismo, sumamos el flujo matemático de la tubería
        finalEdgesMap[key]._rate += edge._rate;
      }
    });

    // Asignar el conteo de entradas total a la caja visual
    finalNodes.forEach(n => {
      n.data.inputCount = targetHandleCounts[n.id] || 0;
    });

    this.nodes = finalNodes;
    this.edges = finalEdges;

    return { nodes: this.nodes, edges: this.edges };
  }

  _calculateNode(itemId, rateNeeded, parentNodeId, depth, pathArr) {
    if (depth > 50) {
      throw new Error(`¡Bucle infinito detectado!\nRuta de ítems: ${pathArr.join(' -> ')} -> ${itemId}`);
    }
    const currentPath = [...pathArr, itemId];

    // 1. Revisar Almacén Virtual (Subproductos Sobrantes)
    if (this.inventory[itemId] && this.inventory[itemId] > 0) {
      const available = this.inventory[itemId];
      const consumed = Math.min(available, rateNeeded);
      this.inventory[itemId] -= consumed;
      rateNeeded -= consumed;
      
      const warehouseId = 'VirtualWarehouse';
      if (!this.nodes.find(n => n.id === warehouseId)) {
        this.nodes.push({
          id: warehouseId, position: {x:0, y:0},
          data: { label: 'Almacén Virtual', details: 'Subproductos', rate: 0, machines: 0 }
        });
      }
      this._addEdge(warehouseId, parentNodeId, itemId, consumed);

      if (rateNeeded <= 0) return; // Se cubrió la demanda completamente con el sobrante
    }

    // Detener la búsqueda si es un recurso crudo natural (mineral, agua) para evitar transmutaciones cíclicas alienígenas
    if (dataManager.isRawResource(itemId)) {
      const actualMinerRate = this.options.minerBaseRate * this.options.minerPurityMultiplier * this.options.overclock;
      const machinesNeeded = rateNeeded / actualMinerRate;
      
      const minerNodeId = this._addNode('Miner', itemId, rateNeeded, machinesNeeded, null);
      this._addEdge(minerNodeId, parentNodeId, itemId, rateNeeded);
      return;
    }

    const recipes = dataManager.getRecipesProducing(itemId);
    
    // Fallback: Si no hay receta en lo absoluto
    if (!recipes || recipes.length === 0) {
      // Forzar nodo extractor
      const actualMinerRate = this.options.minerBaseRate * this.options.minerPurityMultiplier * this.options.overclock;
      const machinesNeeded = rateNeeded / actualMinerRate;
      const minerNodeId = this._addNode('Miner', itemId, rateNeeded, machinesNeeded, null);
      this._addEdge(minerNodeId, parentNodeId, itemId, rateNeeded);
      return;
    }

    // Priorizar recetas alternativas activadas
    const activeAlternate = recipes.find(r => this.options.enabledAlternates.includes(r.className));
    const defaultRecipe = activeAlternate || (recipes.find(r => !r.alternate) || recipes[0]);
    const product = defaultRecipe.products.find(p => p.item === itemId) || defaultRecipe.products[0];
    
    // Matemática con Overclock:
    const cyclesPerMinute = rateNeeded / product.amount;
    const recipeCyclesPerMinute = 60 / defaultRecipe.time;
    const machinesNeeded = cyclesPerMinute / (recipeCyclesPerMinute * this.options.overclock);
    const buildingId = defaultRecipe.producedIn[0]; // Ej: fabricante

    const machineNodeId = this._addNode(buildingId, itemId, rateNeeded, machinesNeeded, defaultRecipe);
    this._addEdge(machineNodeId, parentNodeId, itemId, rateNeeded);

    // 2. Almacenar los excedentes de otros productos (Subproductos)
    defaultRecipe.products.forEach(p => {
      if (p.item !== itemId) {
        const generatedExtra = p.amount * cyclesPerMinute;
        this.inventory[p.item] = (this.inventory[p.item] || 0) + generatedExtra;
        
        const warehouseId = 'VirtualWarehouse';
        if (!this.nodes.find(n => n.id === warehouseId)) {
          this.nodes.push({
            id: warehouseId, position: {x:0, y:0},
            data: { label: 'Almacén Virtual', details: 'Subproductos', rate: 0, machines: 0 }
          });
        }
        this._addEdge(machineNodeId, warehouseId, p.item, generatedExtra);
      }
    });

    // Recursión de ingredientes
    if (defaultRecipe.ingredients) {
      defaultRecipe.ingredients.forEach(ing => {
        const inputRateNeeded = ing.amount * cyclesPerMinute;
        this._calculateNode(ing.item, inputRateNeeded, machineNodeId, depth + 1, currentPath);
      });
    }
  }

  _addNode(type, itemId, rate, machinesCount, recipeObj) {
    this.nodeCounter++;
    const id = `node_${this.nodeCounter}`;
    
    const itemInfo = dataManager.getItem(itemId);
    let buildingName = type;
    if (type === 'Output') buildingName = 'Cofre de Salida';
    else if (type === 'Miner') buildingName = 'Extracción Cruda';
    else if (dataManager.getBuilding(type)) buildingName = dataManager.getBuilding(type).name;

    const itemName = itemInfo ? itemInfo.name : itemId;

    this.nodes.push({
      id: id,
      position: { x: 0, y: 0 },
      data: {
        label: buildingName,
        details: itemName,
        rate: rate,
        machines: machinesCount,
        icon: itemInfo ? itemInfo.image : null
      }
    });

    return id;
  }

  _addEdge(source, target, itemId, rate) {
    const itemInfo = dataManager.getItem(itemId);
    this.edges.push({
      id: `e_${source}-${target}-${itemId}_${this.nodeCounter}`,
      source: source,
      target: target,
      type: 'smoothstep',
      animated: true,
      _itemId: itemId,
      _rate: rate,
      style: { stroke: '#007acc', strokeWidth: 2 }
    });
  }
}

export default new Solver();

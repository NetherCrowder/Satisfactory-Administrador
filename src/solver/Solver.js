import dataManager from '../data/dataManager.js';

class Solver {
  constructor(externalInputs = {}) {
    this.nodes = [];
    this.edges = [];
    this.nodeCounter = 0;
    this.externalInputs = externalInputs; // Mapa de itemId -> cantidad disponible/min
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
      activeRecipes: options.activeRecipes || []
    };

    const outputNodeId = this._addNode('Output', targetItemId, targetRate, 0, null);
    this._calculateNode(targetItemId, targetRate, outputNodeId, 0, []);

    // Purgar el inventario sobrante puramente físico en verdaderos nodos de Descarte (AWESOME Sink)
    Object.keys(this.inventory).forEach(key => {
      this.inventory[key].forEach(stash => {
        if (stash.amount > 0.0001) {
          const dumpId = this._addNode('Descarte', key, stash.amount, 0, null);
          this._addEdge(stash.sourceNode, dumpId, key, stash.amount);
        }
      });
    });

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
    const sourceHandleCounts = {}; // Rastreador de salidas múltiples

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

        if (!sourceHandleCounts[newSourceId]) sourceHandleCounts[newSourceId] = 0;
        const outHandleIndex = sourceHandleCounts[newSourceId];
        sourceHandleCounts[newSourceId]++;

        const clonedEdge = JSON.parse(JSON.stringify(edge));
        clonedEdge.id = key;
        clonedEdge.source = newSourceId;
        clonedEdge.target = newTargetId;
        clonedEdge.targetHandle = `in-${handleIndex}`; // Asignar al pin magnético correspondiente
        clonedEdge.sourceHandle = `out-${outHandleIndex}`;
        
        // Colorear de forma diferencial y precisa (Cinta vs Tubería de fluido)
        const itemInfo = dataManager.getItem(edge._itemId) || {};
        const isLiquid = itemInfo.liquid === true;

        if (isLiquid) {
          let r = 0, g = 188, b = 212; // Fallback cian
          if (itemInfo.fluidColor) {
            r = itemInfo.fluidColor.r; g = itemInfo.fluidColor.g; b = itemInfo.fluidColor.b;
            // Iluminar fluidos oscuros (Ej: Petróleo rgb 0,0,0)
            if (Math.max(r, g, b) < 50) { r += 120; g += 120; b += 120; }
          }

          clonedEdge.type = 'pipe'; 
          clonedEdge.style = { stroke: `rgb(${r}, ${g}, ${b})` }; 
        } else {
          clonedEdge.type = 'belt'; 
          clonedEdge.style = { stroke: '#FFA726' }; 
          clonedEdge.markerEnd = { type: 'arrowclosed', color: '#FFA726' }; // Pequeña flecha extra estática apuntando a la máquina
        }

        finalEdgesMap[key] = clonedEdge;
        finalEdges.push(clonedEdge);
      } else {
        // En lugar de múltiples líneas para lo mismo, sumamos el flujo matemático de la tubería
        finalEdgesMap[key]._rate += edge._rate;
      }
    });

    // Asignar el conteo de entradas/salidas y calcular el Balance de Masa del Almacén
    finalNodes.forEach(n => {
      n.data.inputCount = targetHandleCounts[n.id] || 0;
      n.data.outputCount = sourceHandleCounts[n.id] || 0;
      
      // Matemáticas de sumidero delegadas estáticamente a las puntas DAG
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

    // Verificar si este item está disponible como input externo
    if (this.externalInputs[itemId] && this.externalInputs[itemId] > 0) {
      const availableExternal = this.externalInputs[itemId];
      const usedExternal = Math.min(availableExternal, rateNeeded);
      
      // Crear un nodo de input externo
      const externalNodeId = this._addNode('Input Externo', itemId, usedExternal, 0, null);
      this._addEdge(externalNodeId, parentNodeId, itemId, usedExternal);
      
      // Reducir la cantidad disponible externamente (para este cálculo)
      this.externalInputs[itemId] -= usedExternal;
      
      // Si aún necesitamos más, continuar con la producción normal
      const remainingNeeded = rateNeeded - usedExternal;
      if (remainingNeeded <= 0.0001) {
        return; // Completamente satisfecho por inputs externos
      }
      // Ajustar rateNeeded para la producción restante
      rateNeeded = remainingNeeded;
    }

    // 1. Tomar subproductos del inventario (Conexión Directa visual)
    if (this.inventory[itemId] && this.inventory[itemId].length > 0) {
      let needed = rateNeeded;
      while (needed > 0.0001 && this.inventory[itemId].length > 0) {
        let stash = this.inventory[itemId][0];
        const consumedHere = Math.min(stash.amount, needed);
        
        // CONEXIÓN OMNIDIRECCIONAL: Dibuja flecha/tubería directo del Productor al Consumidor saltándose cajas falsas
        this._addEdge(stash.sourceNode, parentNodeId, itemId, consumedHere);
        
        stash.amount -= consumedHere;
        needed -= consumedHere;
        
        if (stash.amount <= 0.0001) this.inventory[itemId].shift(); // vaciar sumidero
      }
      rateNeeded = needed;
      if (rateNeeded <= 0.0001) return; 
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

    // Algoritmo Avanzado Ant-Ciclos y Heurística de Empaquetados
    const activePrefs = this.options.activeRecipes || [];
    
    // Filtro 1: Bloqueo de bucles. Ninguna receta puede requerir un ítem que ya estemos intentando fabricar en esta misma rama.
    const safeRecipes = recipes.filter(r => {
      if (!r.ingredients) return true;
      return !r.ingredients.some(ing => pathArr.includes(ing.item) && !dataManager.isRawResource(ing.item));
    });

    if (safeRecipes.length === 0) {
      // Rompe-bucle inquebrantable: Se extrae artificialmente de un nodo crudo.
      const actualMinerRate = this.options.minerBaseRate * this.options.minerPurityMultiplier * this.options.overclock;
      const minerNodeId = this._addNode('Miner', itemId, rateNeeded, rateNeeded / actualMinerRate, null);
      this._addEdge(minerNodeId, parentNodeId, itemId, rateNeeded);
      return;
    }

    // 1. Elegida por el usuario
    let defaultRecipe = safeRecipes.find(r => activePrefs.includes(r.className));

    if (!defaultRecipe) {
      // 2. Es Producto Principal, y NO es un proceso de "Empaquetado" o "Desempaquetado" de fluidos infinitos
      const primaryRecipes = safeRecipes.filter(r => 
        r.products[0].item === itemId && 
        !r.className.toLowerCase().includes('package')
      );
      
      if (primaryRecipes.length > 0) {
        defaultRecipe = primaryRecipes.find(r => !r.alternate) || primaryRecipes[0];
      } else {
        // 3. Fallback: Es un subproducto (Plástico generando Residuo Pesado) o solo quedan empaquetadoras
        defaultRecipe = safeRecipes.find(r => !r.alternate) || safeRecipes[0];
      }
    }
                       
    const product = defaultRecipe.products.find(p => p.item === itemId) || defaultRecipe.products[0];
    
    // Matemática con Overclock:
    const cyclesPerMinute = rateNeeded / product.amount;
    const recipeCyclesPerMinute = 60 / defaultRecipe.time;
    const machinesNeeded = cyclesPerMinute / (recipeCyclesPerMinute * this.options.overclock);
    const buildingId = defaultRecipe.producedIn[0]; // Ej: fabricante

    const machineNodeId = this._addNode(buildingId, itemId, rateNeeded, machinesNeeded, defaultRecipe);
    this._addEdge(machineNodeId, parentNodeId, itemId, rateNeeded);

    // 2. Registrar subproductos PRIMERO (para que la máquina pueda autoabastecerse en su propia cadena)
    defaultRecipe.products.forEach(p => {
      if (p.item !== itemId) {
        const generatedExtra = p.amount * cyclesPerMinute;
        if (!this.inventory[p.item]) this.inventory[p.item] = [];
        this.inventory[p.item].push({ sourceNode: machineNodeId, amount: generatedExtra });
      }
    });

    // 3. Recursión de ingredientes
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

export default Solver;

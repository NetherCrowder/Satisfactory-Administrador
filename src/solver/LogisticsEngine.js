import dataManager from '../data/dataManager';

// Capacidades de transporte por tier
const BELT_CAPS = [0, 60, 120, 270, 480, 780, 1200]; // Mk1-Mk6 items/min
const PIPE_CAPS = [0, 300, 600];                      // Mk1-Mk2 m³/min

export function applyLogistics(nodes, edges, options = {}) {
  const beltCap = BELT_CAPS[options.beltTier || 6];
  const pipeCap = PIPE_CAPS[options.pipeTier || 2];

  if (!edges || edges.length === 0) return { nodes, edges };

  const allNodes = [...nodes];
  const edgesToRemove = new Set();
  const edgesToAdd = [];

  // === FASE 1: DIVISORES (1 fuente → N destinos del mismo item) ===
  const outGroups = {};
  edges.forEach(e => {
    if (!e._itemId) return;
    const key = `${e.source}::${e._itemId}`;
    if (!outGroups[key]) outGroups[key] = [];
    outGroups[key].push(e);
  });

  Object.values(outGroups).forEach(group => {
    if (group.length <= 1) return;

    const sourceId = group[0].source;
    const itemId = group[0]._itemId;
    const itemInfo = dataManager.getItem(itemId) || {};
    const isLiquid = itemInfo.liquid === true;
    const totalRate = group.reduce((s, e) => s + (e._rate || 0), 0);
    const label = isLiquid ? 'Conexión en Cruz' : 'Divisor';
    const divId = `div_${sourceId}_${itemId}`;

    allNodes.push({
      id: divId,
      position: { x: 0, y: 0 },
      data: { label, details: itemInfo.name || itemId, rate: totalRate, isLogistics: true, isLiquid, inputCount: 1, outputCount: group.length, machines: 0 }
    });

    edgesToAdd.push({ ...group[0], id: `trunk_in_${divId}`, target: divId, targetHandle: 'in-0', _rate: totalRate });

    group.forEach((e, i) => {
      edgesToRemove.add(e.id);
      edgesToAdd.push({ ...e, id: `trunk_out_${divId}_${i}`, source: divId, sourceHandle: `out-${i}` });
    });
  });

  // === FASE 2: UNIONES (N fuentes → 1 destino del mismo item) ===
  let workEdges = edges.filter(e => !edgesToRemove.has(e.id)).concat(edgesToAdd);
  const edgesToRemove2 = new Set();
  const edgesToAdd2 = [];

  const inGroups = {};
  workEdges.forEach(e => {
    if (!e._itemId) return;
    const key = `${e.target}::${e._itemId}`;
    if (!inGroups[key]) inGroups[key] = [];
    inGroups[key].push(e);
  });

  Object.values(inGroups).forEach(group => {
    if (group.length <= 1) return;

    const targetId = group[0].target;
    const itemId = group[0]._itemId;
    const itemInfo = dataManager.getItem(itemId) || {};
    const isLiquid = itemInfo.liquid === true;
    const totalRate = group.reduce((s, e) => s + (e._rate || 0), 0);

    // Válvula reguladora: se usa en rutas 1-a-1 de fluido con posible contraflujo (se añade en Fase 3 si es necesario)
    // En uniones, siempre es "Conexión en Cruz" para fluidos y "Unión" para sólidos
    const label = isLiquid ? 'Conexión en Cruz' : 'Unión';
    const mergId = `merg_${targetId}_${itemId}`;

    allNodes.push({
      id: mergId,
      position: { x: 0, y: 0 },
      data: { label, details: itemInfo.name || itemId, rate: totalRate, isLogistics: true, isLiquid, inputCount: group.length, outputCount: 1, machines: 0 }
    });

    edgesToAdd2.push({ ...group[0], id: `trunk_out_${mergId}`, source: mergId, sourceHandle: 'out-0', target: targetId, targetHandle: group[0].targetHandle || 'in-0', _rate: totalRate });

    group.forEach((e, i) => {
      edgesToRemove2.add(e.id);
      edgesToAdd2.push({ ...e, id: `trunk_in_${mergId}_${i}`, target: mergId, targetHandle: `in-${i}` });
    });
  });

  let finalEdges = workEdges.filter(e => !edgesToRemove2.has(e.id)).concat(edgesToAdd2);

  // === FASE 3: CAPACIDAD DE TRANSPORTE Y BUFFERS ===
  const capacityEdgesToRemove = new Set();
  const capacityNodesToAdd = [];
  const capacityEdgesToAdd = [];

  finalEdges.forEach(e => {
    if (!e._itemId || !e._rate) return;
    const itemInfo = dataManager.getItem(e._itemId) || {};
    const isLiquid = itemInfo.liquid === true;
    const cap = isLiquid ? pipeCap : beltCap;
    const maxAbsCap = isLiquid ? PIPE_CAPS[2] : BELT_CAPS[6]; // Mk2/Mk6 máximo absoluto
    const rate = e._rate;

    if (rate <= cap) return; // Sin problema, cabe en el tier disponible

    const n = Math.ceil(rate / cap);         // Líneas paralelas necesarias
    const overflow = rate > maxAbsCap;       // Excede incluso el tier máximo

    const bufferLabel = isLiquid ? 'Almacenador de Fluidos' : 'Almacenador Industrial';
    const splitLabel = isLiquid ? 'Conexión en Cruz' : 'Divisor';
    const bufId = `buf_${e.id}`;
    const splitId = `split_cap_${e.id}`;

    // Nodo Buffer (amortiguador antes del split)
    capacityNodesToAdd.push({
      id: bufId,
      position: { x: 0, y: 0 },
      data: {
        label: bufferLabel,
        details: `${itemInfo.name || e._itemId} • ${n} líneas${overflow ? ' ⚠️ Excede Tier máximo' : ''}`,
        rate,
        isLogistics: true,
        isLiquid,
        overflow,
        inputCount: 1,
        outputCount: n,
        machines: 0
      }
    });

    // Nodo Divisor de capacidad (salida del buffer)
    capacityNodesToAdd.push({
      id: splitId,
      position: { x: 0, y: 0 },
      data: { label: splitLabel, details: itemInfo.name || e._itemId, rate, isLogistics: true, isLiquid, inputCount: 1, outputCount: n, machines: 0 }
    });

    // Reemplazar edge original con: orig_source → buffer → divisor → orig_target
    capacityEdgesToRemove.add(e.id);
    capacityEdgesToAdd.push({ ...e, id: `cap_src_${e.id}`, target: bufId, targetHandle: 'in-0' });
    capacityEdgesToAdd.push({ ...e, id: `cap_buf_${e.id}`, source: bufId, sourceHandle: 'out-0', target: splitId, targetHandle: 'in-0' });
    for (let i = 0; i < n; i++) {
      capacityEdgesToAdd.push({ ...e, id: `cap_out_${e.id}_${i}`, source: splitId, sourceHandle: `out-${i}`, _rate: rate / n });
    }
  });

  finalEdges = finalEdges.filter(e => !capacityEdgesToRemove.has(e.id)).concat(capacityEdgesToAdd);
  const allFinalNodes = allNodes.concat(capacityNodesToAdd);

  return { nodes: allFinalNodes, edges: finalEdges };
}

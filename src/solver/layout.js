import dagre from 'dagre';

export function getLayoutedElements(nodes, edges, direction = 'LR') {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Dimensiones estimadas de un nodo para el ordenamiento
  const nodeWidth = 250;
  const nodeHeight = 150;

  // LR significa Lado Izquierdo a Lado Derecho (Left to Right)
  dagreGraph.setGraph({ rankdir: direction, nodesep: 150, ranksep: 350 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  const nodeIds = new Set(nodes.map(n => n.id));

  edges.forEach((edge) => {
    // Solo agregar edges cuyos source y target existan como nodos
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    if (!nodeWithPosition) return { ...node, position: node.position || { x: 0, y: 0 } };
    return {
      ...node,
      targetPosition: 'right',
      sourcePosition: 'left',
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

import React, { useState, useEffect, useMemo, Component } from 'react';
import ReactFlow, { Background, Controls, Handle, Position, MiniMap, getSmoothStepPath } from 'reactflow';
import 'reactflow/dist/style.css';
import solver from '../solver/Solver';
import { applyLogistics } from '../solver/LogisticsEngine';
import { getLayoutedElements } from '../solver/layout';
import { getAllRawResources, optimizeMultiObjectiveProduction } from '../solver/resourceCalculator';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: '#ff5555', padding: '80px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
          <h2>React Crash Report:</h2>
          {this.state.error?.toString()}
          <br/><br/>
          {this.state.error?.stack}
        </div>
      );
    }
    return this.props.children;
  }
}
import dataManager from '../data/dataManager';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Settings, X, Search, ClipboardList } from 'lucide-react';

const CustomNode = ({ data, isConnectable }) => {
  // Garantizar mínimo 1 entrada visual 
  const inputCount = Math.max(1, data.inputCount || 1);
  const outputCount = Math.max(1, data.outputCount || 1);

  if (data.isLogistics) {
    return (
      <div style={{ 
        background: data.isLiquid ? 'linear-gradient(145deg, #102A43, #0b1a29)' : 'linear-gradient(145deg, #37474F, #263238)', 
        border: `2px solid ${data.isLiquid ? '#4FC3F7' : '#FFA726'}`, 
        borderRadius: data.isLiquid ? '50%' : '6px', 
        padding: '12px 6px', color: '#fff', textAlign: 'center', 
        minWidth: '70px', minHeight: data.isLiquid ? '70px' : 'auto', 
        boxShadow: `0 0 15px ${data.isLiquid ? 'rgba(79, 195, 247, 0.4)' : 'rgba(255, 167, 38, 0.4)'}`, 
        position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
      }}>
        {Array.from({ length: inputCount }).map((_, i) => (
          <Handle key={`in-${i}`} type="target" position={Position.Left} id={`in-${i}`} isConnectable={isConnectable} style={{ background: '#555', width: 6, height: 6, borderRadius: 3, top: `${(i + 1) * 100 / (inputCount + 1)}%`, left: -4 }} />
        ))}
        
        <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: data.isLiquid ? '#4FC3F7' : '#FFA726', margin: '0 5px' }}>{data.label}</div>
        
        {Array.from({ length: outputCount }).map((_, i) => (
          <Handle key={`out-${i}`} type="source" position={Position.Right} id={`out-${i}`} isConnectable={isConnectable} style={{ background: '#007acc', width: 6, height: 6, borderRadius: 3, top: `${(i + 1) * 100 / (outputCount + 1)}%`, right: -4 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(30, 30, 35, 0.95)', backdropFilter: 'blur(10px)',
      border: '1px solid #3a3a40', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      borderRadius: '12px', padding: '15px', width: '220px', color: '#fff',
      display: 'flex', flexDirection: 'column', gap: '8px'
    }}>
      {Array.from({ length: inputCount }).map((_, i) => (
        <Handle key={`in-${i}`} type="target" position={Position.Left} id={`in-${i}`} 
          style={{ background: '#555', width: 8, height: 8, borderRadius: 4, top: `${(i + 1) * 100 / (inputCount + 1)}%`, left: -4 }} />
      ))}
      <div style={{ fontSize: '12px', color: '#ffc107', fontWeight: 600 }}>{data.label}</div>
      <div style={{ fontSize: '18px', fontWeight: 600, color: '#9cdcfe' }}>{data.details}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', alignItems: 'center' }}>
        <div style={{ background: 'rgba(76,175,80,0.2)', color: '#4CAF50', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
          {data.rate.toFixed(1)} / min
        </div>
        {data.machines > 0 && <div style={{ fontSize: '13px', color: '#aaa' }}>{data.machines.toFixed(2)}x M</div>}
      </div>
      {/* Múltiples salidas calculadas dinámicamente y espaciadas verticalmente */}
      {Array.from({ length: outputCount }).map((_, i) => (
        <Handle 
          key={`out-${i}`} type="source" position={Position.Right} id={`out-${i}`} 
          style={{ background: '#007acc', width: 8, height: 8, borderRadius: 4, top: `${(i + 1) * 100 / (outputCount + 1)}%`, right: -4 }} 
        />
      ))}
    </div>
  );
};
const nodeTypes = { custom: CustomNode };

const BeltEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd }) => {
  const [edgePath] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 16 });
  return (
    <>
      {/* Riel Grueso Transparente Base */}
      <path id={id} style={{ stroke: style.stroke, opacity: 0.15, strokeWidth: 14, fill: 'none' }} d={edgePath} />
      {/* Línea Central Guía */}
      <path style={{ stroke: style.stroke, opacity: 0.4, strokeWidth: 2, fill: 'none' }} className="react-flow__edge-path" d={edgePath} markerEnd={markerEnd} />
      {/* Flota de flechas moviéndose direccionalmente */}
      <polygon points="-6,-5 4,0 -6,5" fill={style.stroke || '#FFA726'}>
        <animateMotion dur="2s" repeatCount="indefinite" begin="0s" path={edgePath} rotate="auto" />
      </polygon>
      <polygon points="-6,-5 4,0 -6,5" fill={style.stroke || '#FFA726'}>
        <animateMotion dur="2s" repeatCount="indefinite" begin="0.66s" path={edgePath} rotate="auto" />
      </polygon>
      <polygon points="-6,-5 4,0 -6,5" fill={style.stroke || '#FFA726'}>
        <animateMotion dur="2s" repeatCount="indefinite" begin="1.33s" path={edgePath} rotate="auto" />
      </polygon>
    </>
  );
};

const PipeEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {} }) => {
  const [edgePath] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 4 });
  return (
    <>
      {/* Envoltura Exterior gruesa (Tubo físico continuo brillante) */}
      <path id={id} style={{ stroke: style.stroke, opacity: 0.25, strokeWidth: 14, fill: 'none', strokeLinecap: 'round' }} d={edgePath} />
      
      {/* Carga de Líquido sólida (Continua sin cortes) */}
      <path style={{ stroke: style.stroke, opacity: 0.6, strokeWidth: 6, fill: 'none', strokeLinecap: 'round', strokeDasharray: 'none' }} d={edgePath} />

      {/* Burbujas esféricas brillantes evidenciando la dirección estricta del flujo */}
      <circle r="3" fill="#fff" opacity="0.9">
        <animateMotion dur="2.5s" repeatCount="indefinite" begin="0s" path={edgePath} />
      </circle>
      <circle r="3" fill="#fff" opacity="0.9">
        <animateMotion dur="2.5s" repeatCount="indefinite" begin="0.83s" path={edgePath} />
      </circle>
      <circle r="3" fill="#fff" opacity="0.9">
        <animateMotion dur="2.5s" repeatCount="indefinite" begin="1.66s" path={edgePath} />
      </circle>
    </>
  );
};

const edgeTypes = { belt: BeltEdge, pipe: PipeEdge };

export default function Editor() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  // Múltiples objetivos: array de {itemId, rate, isMaximizing}
  const [targetObjectives, setTargetObjectives] = useState([{ itemId: 'Desc_Rotor_C', rate: 10, isMaximizing: false }]);
  const [selectedObjectiveIdx, setSelectedObjectiveIdx] = useState(0);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAlternatesOpen, setIsAlternatesOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [altSearchQuery, setAltSearchQuery] = useState('');
  const [overclock, setOverclock] = useState(100);
  const [minerPurity, setMinerPurity] = useState(1);
  const [minerMark, setMinerMark] = useState(60);
  const [activeRecipes, setActiveRecipes] = useState([]);
  const [beltTier, setBeltTier] = useState(6);
  const [pipeTier, setPipeTier] = useState(2);

  // Recursos disponibles globales: {resourceId: availableRate}
  const [availableResources, setAvailableResources] = useState({});
  const [showResourceManager, setShowResourceManager] = useState(false);

  // Inputs externos: {itemId: availableRate}
  const [externalInputs, setExternalInputs] = useState({});
  const [showExternalInputs, setShowExternalInputs] = useState(false);
  const [externalInputsSearchQuery, setExternalInputsSearchQuery] = useState('');

  // Inicializar recursos disponibles con 0 para todos los recursos crudos
  const initializeAvailableResources = () => {
    const rawResources = getAllRawResources();
    const initialized = { ...availableResources };
    rawResources.forEach(resource => {
      if (initialized[resource.name] === undefined) {
        initialized[resource.name] = 0;
      }
    });
    setAvailableResources(initialized);
  };

  // Inicializar recursos cuando se abre el modal por primera vez
  useEffect(() => {
    if (showResourceManager && Object.keys(availableResources).length === 0) {
      initializeAvailableResources();
    }
  }, [showResourceManager]);

  const allItems = useMemo(() => dataManager.getAllItems().sort((a,b) => a.name.localeCompare(b.name)), []);
  const filteredItems = useMemo(() => allItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())), [allItems, searchQuery]);
  const filteredExternalItems = useMemo(() => allItems.filter(item => item.name.toLowerCase().includes(externalInputsSearchQuery.toLowerCase())), [allItems, externalInputsSearchQuery]);
  
  const recipesByProduct = useMemo(() => {
    const groups = {};
    dataManager.getAllRecipes().forEach(r => {
      if (!r.products || r.products.length === 0) return;
      const mainProductClass = r.products[0].item;
      const itemName = dataManager.getItem(mainProductClass)?.name || mainProductClass;
      if (!groups[itemName]) groups[itemName] = { itemClass: mainProductClass, recipes: [] };
      groups[itemName].recipes.push(r);
    });
    return Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0]));
  }, []);

  const filteredRecipeGroups = useMemo(() => {
    return recipesByProduct.filter(([itemName]) => itemName.toLowerCase().includes(altSearchQuery.toLowerCase()));
  }, [recipesByProduct, altSearchQuery]);

  const handleOptimizeAllObjectives = () => {
    try {
      setErrorMsg('Optimizando producción...');
      const options = { overclock: overclock/100, minerPurityMultiplier: minerPurity, minerBaseRate: minerMark, activeRecipes };

      const result = optimizeMultiObjectiveProduction(targetObjectives, availableResources, externalInputs, options);

      setTargetObjectives(result.optimizedObjectives);

      // Mostrar mensaje de optimización
      const limitingMessages = Object.values(result.limitingFactors);
      const externalUsedMessages = Object.entries(result.externalInputsUsed).map(([itemId, used]) => {
        const item = dataManager.getItem(itemId);
        return `${item?.name || itemId}: ${used.toFixed(1)}/min usado`;
      });

      let message = '';
      if (limitingMessages.length > 0) {
        message += `Optimización completada. Factores limitantes: ${limitingMessages.join('; ')}`;
      } else {
        message += 'Optimización completada - producción maximizada dentro de límites disponibles.';
      }

      if (externalUsedMessages.length > 0) {
        message += ` Inputs externos utilizados: ${externalUsedMessages.join(', ')}`;
      }

      setErrorMsg(message);
      
      // Auto-recalcular con las nuevas tasas
      calculateGraph(result.optimizedObjectives, options);
    } catch (e) {
      setErrorMsg('Error al optimizar: ' + e.toString());
    }
  };

  const calculateGraph = (objectives, opts = null) => {
    try {
      setErrorMsg('');
      const options = opts || { overclock: overclock/100, minerPurityMultiplier: minerPurity, minerBaseRate: minerMark, activeRecipes };
      
      // Si no hay objetivos, mostrar error
      if (!objectives || objectives.length === 0) {
        setErrorMsg('Por favor, agrega al menos un objetivo.');
        return;
      }

      // Combinar todos los grafos de cada objetivo
      let allNodes = [];
      let allEdges = [];
      const nodeIdMapping = {}; // Para evitar duplicados de nodos de salida
      let nodeCounter = 0;

      objectives.forEach((objective, idx) => {
        const solverInstance = new solver(externalInputs);
        const rawGraph = solverInstance.solve(objective.itemId, Number(objective.rate), options);
        
        // Renombrar IDs de nodos para evitar conflictos
        const nodeMap = {};
        rawGraph.nodes.forEach(node => {
          nodeCounter++;
          const newId = `node_${idx}_${node.id}`;
          nodeMap[node.id] = newId;
          allNodes.push({ ...node, id: newId });
        });

        // Renombrar IDs de edges
        rawGraph.edges.forEach(edge => {
          const newEdge = { 
            ...edge, 
            id: `e_${idx}_${edge.id}`,
            source: nodeMap[edge.source],
            target: nodeMap[edge.target]
          };
          allEdges.push(newEdge);
        });
      });

      // Aplicar logística a todos los nodos/edges combinados
      const logicGraph = applyLogistics(allNodes, allEdges, { beltTier, pipeTier });

      // Layout
      const formattedNodes = logicGraph.nodes.map(n => ({ ...n, type: 'custom' }));
      const layoutedGraph = getLayoutedElements(formattedNodes, logicGraph.edges, 'LR');
      setNodes(layoutedGraph.nodes);
      setEdges(layoutedGraph.edges);
    } catch (e) { 
      setErrorMsg(e.toString()); 
    }
  };

  useEffect(() => { calculateGraph(targetObjectives); }, []);
  const handleApplyConfig = () => { calculateGraph(targetObjectives, { overclock: overclock/100, minerPurityMultiplier: minerPurity, minerBaseRate: minerMark, activeRecipes }); setIsConfigOpen(false); };
  
  const currentObjective = targetObjectives[selectedObjectiveIdx];
  const currentItemName = dataManager.getItem(currentObjective?.itemId)?.name || 'Desconocido';

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0d0d0f', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', background: 'rgba(20,20,25,0.95)', borderBottom: '1px solid #333', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => navigate('/')} style={{ background: 'transparent', border: '1px solid #444', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><ArrowLeft size={18} /></button>
          <span style={{ color: 'white', fontWeight: 600, fontSize: '18px' }}>Fábrica de {currentItemName}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setIsAlternatesOpen(true)} style={{ background: '#252528', color: '#ffc107', border: '1px solid #444', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>Gestor de Recetas</button>
          <button onClick={() => setShowResourceManager(true)} style={{ background: '#252528', color: '#4CAF50', border: '1px solid #444', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>📊 Recursos Disponibles</button>
          <button onClick={() => setShowExternalInputs(true)} style={{ background: '#252528', color: '#FF9800', border: '1px solid #444', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>📦 Importar Productos</button>
          <button onClick={() => setShowSummary(!showSummary)} style={{ background: showSummary ? '#333' : '#252528', color: '#fff', border: '1px solid #444', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={16} /> Ver Resumen</button>
          <button onClick={() => setIsConfigOpen(true)} style={{ background: '#252528', color: '#fff', border: '1px solid #444', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={16} /> Configurar Receta</button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {errorMsg ? <div style={{ color: '#ff5555', padding: '80px', fontFamily: 'monospace' }}>{errorMsg}</div> : (
          <ErrorBoundary>
            <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView>
              <Background color="#333" gap={20} size={1.5} />
              <Controls />
              <MiniMap nodeColor={() => '#252528'} maskColor="rgba(0, 0, 0, 0.6)" style={{ background: '#111', border: '1px solid #333', borderRadius: '8px' }} />
            </ReactFlow>
          </ErrorBoundary>
        )}
      </div>

      {showSummary && (
        <div style={{
          position: 'absolute', top: '75px', right: '20px', width: '300px',
          background: 'rgba(25, 25, 30, 0.95)', backdropFilter: 'blur(12px)',
          border: '1px solid #3a3a40', borderRadius: '12px', padding: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 50, color: '#fff',
          maxHeight: 'calc(100vh - 100px)', overflowY: 'auto'
        }}>
          <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #444', paddingBottom: '10px', color: '#9cdcfe' }}>
            Consolidado de Fábrica
          </h3>
          
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#aaa', margin: '0 0 10px 0', fontSize: '14px' }}>Máquinas Requeridas</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(() => {
                const machineCounts = {};
                nodes.forEach(n => {
                  const type = n.data.label;
                  if (type === 'Extracción Cruda' || type === 'Cofre de Salida' || type === 'Output' || type === 'Miner') return;
                  if (!machineCounts[type]) machineCounts[type] = 0;
                  machineCounts[type] += n.data.machines || 0;
                });
                const types = Object.keys(machineCounts);
                if (types.length === 0) return <div style={{color:'#666', fontSize:'13px'}}>No hay máquinas calculadas aún.</div>;
                
                return types.map(t => (
                  <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#222', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                    <span>{t}</span>
                    <span style={{ fontWeight: 'bold', color: '#ffc107', textAlign: 'right' }}>
                      {Math.ceil(machineCounts[t])}
                      <div style={{fontSize:'10px', color:'#888', fontWeight:'normal'}}>({machineCounts[t].toFixed(2)} real)</div>
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>

          <div>
            <h4 style={{ color: '#aaa', margin: '0 0 10px 0', fontSize: '14px' }}>Recursos Crudos Extraídos</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(() => {
                const rawCounts = {};
                nodes.forEach(n => {
                  if (n.data.label === 'Extracción Cruda' || n.data.label === 'Miner') {
                    const item = n.data.details;
                    if (!rawCounts[item]) rawCounts[item] = 0;
                    rawCounts[item] += n.data.rate || 0;
                  }
                });
                const items = Object.keys(rawCounts);
                if (items.length === 0) return <div style={{color:'#666', fontSize:'13px'}}>No requiere materiales brutos.</div>;
                
                return items.map(item => (
                  <div key={item} style={{ display: 'flex', justifyContent: 'space-between', background: '#222', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                    <span>{item}</span>
                    <span style={{ fontWeight: 'bold', color: '#4CAF50' }}>{rawCounts[item].toFixed(1)} / m</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h4 style={{ color: '#aaa', margin: '0 0 10px 0', fontSize: '14px' }}>Balance de Subproductos</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(() => {
                const surpluses = {};
                nodes.forEach(n => {
                  if (n.data.label === 'Descarte') { surpluses[n.data.details] = (surpluses[n.data.details] || 0) + n.data.rate; }
                });
                const items = Object.keys(surpluses).filter(k => surpluses[k] > 0.01);
                if (items.length === 0) return <div style={{color:'#666', fontSize:'13px'}}>Ciclo cerrado / Cero residuos.</div>;
                
                return items.map(item => (
                  <div key={item} style={{ display: 'flex', justifyContent: 'space-between', background: '#222', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                    <span>{item}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                       <span style={{ fontWeight: 'bold', color: '#00BCD4' }}>+{surpluses[item].toFixed(1)} / m</span>
                       <span style={{ fontSize: '10px', color: '#888' }}>al sumidero AWESOME</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {isConfigOpen && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#1a1a20', border: '1px solid #333', borderRadius: '12px', width: '550px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>Configurar Producción</h2>
              <X size={24} color="#aaa" style={{ cursor: 'pointer' }} onClick={() => setIsConfigOpen(false)} />
            </div>
            
            <div style={{ padding: '25px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Lista de Objetivos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ color: '#aaa', fontSize: '14px', fontWeight: 'bold' }}>Objetivos de Producción:</label>
                  <button 
                    onClick={() => { setTargetObjectives([...targetObjectives, { itemId: '', rate: 1, isMaximizing: false }]); setSelectedObjectiveIdx(targetObjectives.length); }}
                    style={{ background: '#007acc', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                  >+ Agregar</button>
                </div>
                
                {/* Cards de Objetivos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#0d0d0f', borderRadius: '8px', padding: '12px', border: '1px solid #2a2a30', maxHeight: '200px', overflowY: 'auto' }}>
                  {targetObjectives.length === 0 ? (
                    <div style={{ color: '#666', fontSize: '13px', padding: '10px' }}>No hay objetivos. Agrega uno arriba.</div>
                  ) : (
                    targetObjectives.map((obj, idx) => {
                      const itemName = dataManager.getItem(obj.itemId)?.name || 'Sin seleccionar';
                      return (
                        <div 
                          key={idx}
                          onClick={() => setSelectedObjectiveIdx(idx)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            background: selectedObjectiveIdx === idx ? '#007acc' : '#1c1c22',
                            border: `1px solid ${selectedObjectiveIdx === idx ? '#0099ff' : '#333'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <span style={{ color: selectedObjectiveIdx === idx ? '#fff' : '#aaa', fontSize: '13px' }}>
                            <strong>{itemName}</strong> ({obj.rate}/min)
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTargetObjectives(targetObjectives.filter((_, i) => i !== idx));
                              if (selectedObjectiveIdx >= targetObjectives.length - 1) {
                                setSelectedObjectiveIdx(Math.max(0, selectedObjectiveIdx - 1));
                              }
                            }}
                            style={{
                              background: 'transparent',
                              color: '#ff5555',
                              border: '1px solid #ff5555',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: 'bold'
                            }}
                          >✕</button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Editor del Objetivo Seleccionado */}
              {currentObjective && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: '#aaa', fontSize: '14px' }}>Seleccionar Ítem:</label>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} color="#666" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                      <input 
                        type="text" 
                        placeholder="Buscar ítem..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        style={{ width: '100%', boxSizing: 'border-box', background: '#252528', border: '1px solid #444', padding: '10px 10px 10px 35px', borderRadius: '6px', color: '#fff', outline: 'none' }} 
                      />
                    </div>
                    <div style={{ background: '#0d0d0f', border: '1px solid #333', borderRadius: '6px', height: '140px', overflowY: 'auto', marginTop: '5px' }}>
                      {filteredItems.map(item => (
                        <div 
                          key={item.className} 
                          onClick={() => {
                            const newObjs = [...targetObjectives];
                            newObjs[selectedObjectiveIdx].itemId = item.className;
                            setTargetObjectives(newObjs);
                          }} 
                          style={{ 
                            padding: '10px 15px', 
                            color: currentObjective.itemId === item.className ? '#fff' : '#ccc', 
                            background: currentObjective.itemId === item.className ? '#007acc' : 'transparent', 
                            cursor: 'pointer', 
                            borderBottom: '1px solid #1a1a20', 
                            fontSize: '14px' 
                          }}
                        >
                          {item.name}
                        </div>
                      ))}
                      {filteredItems.length === 0 && <div style={{ padding: '15px', color: '#666', textAlign: 'center' }}>No se encontraron resultados</div>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: '#aaa', fontSize: '14px' }}>Producción deseada (ítems/min):</label>
                    <input 
                      type="number" 
                      value={currentObjective.rate} 
                      onChange={(e) => {
                        const newObjs = [...targetObjectives];
                        newObjs[selectedObjectiveIdx].rate = e.target.value;
                        setTargetObjectives(newObjs);
                      }} 
                      min="0.1" 
                      step="0.1" 
                      style={{ width: '100%', boxSizing: 'border-box', background: '#252528', border: '1px solid #444', padding: '10px', borderRadius: '6px', color: '#fff', fontSize: '16px', outline: 'none' }} 
                    />
                  </div>

                  {/* Checkbox de Maximización */}
                  <div style={{ background: '#1c1c22', border: '1px solid #333', borderRadius: '8px', padding: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      type="checkbox" 
                      checked={currentObjective.isMaximizing || false}
                      onChange={(e) => {
                        const newObjs = [...targetObjectives];
                        newObjs[selectedObjectiveIdx].isMaximizing = e.target.checked;
                        setTargetObjectives(newObjs);
                      }}
                      style={{ accentColor: '#007acc', width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ color: '#aaa', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>Maximizar Producción</label>
                      <span style={{ color: '#666', fontSize: '11px' }}>
                        Calcula la tasa máxima posible respetando los recursos disponibles configurados
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Botón Global de Optimización */}
              {targetObjectives.some(obj => obj.isMaximizing) && (
                <div style={{ background: '#2a2a35', border: '1px solid #4CAF50', borderRadius: '8px', padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ color: '#4CAF50', fontSize: '14px', fontWeight: 'bold' }}>🚀 Optimización Disponible</div>
                    <div style={{ color: '#ccc', fontSize: '12px' }}>
                      {targetObjectives.filter(obj => obj.isMaximizing).length} objetivo(s) con maximización activada
                    </div>
                  </div>
                  <button 
                    onClick={handleOptimizeAllObjectives}
                    style={{
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '13px'
                    }}
                  >
                    📈 Optimizar Todo
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: '15px', padding: '15px', background: '#1c1c22', borderRadius: '8px', border: '1px solid #333' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ color: '#aaa', fontSize: '13px' }}>Overclock (%):</label>
                  <input type="number" value={overclock} onChange={e => setOverclock(e.target.value)} min="1" max="250" style={{ background: '#111', border: '1px solid #444', color: '#ffc107', padding: '8px', borderRadius: '6px', outline: 'none' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ color: '#aaa', fontSize: '13px' }}>Pureza Mineros:</label>
                  <select value={minerPurity} onChange={e => setMinerPurity(Number(e.target.value))} style={{ background: '#111', border: '1px solid #444', color: '#fff', padding: '8px', borderRadius: '6px', outline: 'none' }}>
                    <option value={0.5}>Impuro (-50%)</option>
                    <option value={1}>Normal</option>
                    <option value={2}>Puro (+100%)</option>
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ color: '#aaa', fontSize: '13px' }}>Extractor:</label>
                  <select value={minerMark} onChange={e => setMinerMark(Number(e.target.value))} style={{ background: '#111', border: '1px solid #444', color: '#fff', padding: '8px', borderRadius: '6px', outline: 'none' }}>
                    <option value={60}>Mk.1</option>
                    <option value={120}>Mk.2</option>
                    <option value={240}>Mk.3</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', padding: '15px', background: '#1c1c22', borderRadius: '8px', border: '1px solid #2a2a35' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ color: '#aaa', fontSize: '13px' }}>Cinta Disponible:</label>
                  <select value={beltTier} onChange={e => setBeltTier(Number(e.target.value))} style={{ background: '#111', border: '1px solid #444', color: '#FFA726', padding: '8px', borderRadius: '6px', outline: 'none' }}>
                    <option value={1}>Mk.1 (60/min)</option>
                    <option value={2}>Mk.2 (120/min)</option>
                    <option value={3}>Mk.3 (270/min)</option>
                    <option value={4}>Mk.4 (480/min)</option>
                    <option value={5}>Mk.5 (780/min)</option>
                    <option value={6}>Mk.6 (1200/min)</option>
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ color: '#aaa', fontSize: '13px' }}>Tubería Disponible:</label>
                  <select value={pipeTier} onChange={e => setPipeTier(Number(e.target.value))} style={{ background: '#111', border: '1px solid #444', color: '#4FC3F7', padding: '8px', borderRadius: '6px', outline: 'none' }}>
                    <option value={1}>Mk.1 (300 m³/min)</option>
                    <option value={2}>Mk.2 (600 m³/min)</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setIsConfigOpen(false)} style={{ background: 'transparent', color: '#aaa', border: '1px solid #444', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleApplyConfig} style={{ background: '#007acc', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Aplicar y Recalcular</button>
            </div>
          </div>
        </div>
      )}

      {isAlternatesOpen && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#1a1a20', border: '1px solid #333', borderRadius: '12px', width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>Gestor de Recetas</h2>
              <X size={24} color="#aaa" style={{ cursor: 'pointer' }} onClick={() => setIsAlternatesOpen(false)} />
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>Elige la receta explícita que tu fábrica usará para elaborar cada componente.</p>
              
               <div style={{ position: 'relative' }}>
                <Search size={16} color="#666" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input type="text" placeholder="Buscar por producto..." value={altSearchQuery} onChange={(e) => setAltSearchQuery(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: '#252528', border: '1px solid #444', padding: '10px 10px 10px 35px', borderRadius: '6px', color: '#fff', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {filteredRecipeGroups.map(([itemName, group]) => {
                  const defaultRec = group.recipes.find(r => !r.alternate) || group.recipes[0];
                  
                  return (
                    <div key={itemName} style={{ background: '#1c1c22', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ background: '#222', padding: '10px 15px', fontWeight: 'bold', color: '#9cdcfe', borderBottom: '1px solid #333' }}>
                        {itemName}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {group.recipes.sort((a,b) => (a.alternate === b.alternate ? 0 : a.alternate ? 1 : -1)).map(r => {
                          const isSelected = activeRecipes.includes(r.className) || (!r.alternate && !group.recipes.some(alt => activeRecipes.includes(alt.className)));
                          
                          let advantage = "Receta Base";
                          if (r.alternate && defaultRec) {
                             const rRate = r.products[0].amount / r.time;
                             const dRate = defaultRec.products[0].amount / defaultRec.time;
                             const rIngCount = r.ingredients ? r.ingredients.length : 1;
                             const dIngCount = defaultRec.ingredients ? defaultRec.ingredients.length : 1;
                             
                             if (rRate >= dRate * 1.5) advantage = "Rendimiento Masivo (+Velocidad)";
                             else if (rRate > dRate) advantage = "Ahorra tiempo (Más rápida)";
                             else if (rIngCount < dIngCount) advantage = "Ahorra pasos (Menos máquinas y cintas)";
                             else advantage = "Alternativa para balanceo de recursos";
                          }

                          return (
                            <label key={r.className} title={advantage} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 15px', cursor: 'pointer', background: isSelected ? 'rgba(0, 122, 204, 0.15)' : 'transparent', borderBottom: '1px solid #2a2a30' }}>
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={() => {
                                  if (activeRecipes.includes(r.className)) setActiveRecipes(activeRecipes.filter(x => x !== r.className));
                                  else setActiveRecipes([...activeRecipes, r.className]);
                                }}
                                style={{ accentColor: '#007acc', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
                                <span style={{ color: isSelected ? '#fff' : '#aaa', fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                  {r.name} {r.alternate && <span style={{ background: '#ffc107', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', marginLeft: '6px', fontWeight: 'bold' }}>ALT</span>}
                                </span>
                                {r.alternate && <span style={{ fontSize: '11px', color: isSelected ? '#7ec9ff' : '#666' }}>⚡ {advantage}</span>}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {filteredRecipeGroups.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No se encontraron productos.</div>}
            </div>

            <div style={{ padding: '20px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => { calculateGraph(targetObjectives); setIsAlternatesOpen(false); }} style={{ background: '#007acc', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Guardar y Recalcular</button>
            </div>
          </div>
        </div>
      )}

      {showResourceManager && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#1a1a20', border: '1px solid #333', borderRadius: '12px', width: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>📊 Recursos Disponibles</h2>
              <X size={24} color="#aaa" style={{ cursor: 'pointer' }} onClick={() => setShowResourceManager(false)} />
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
                Define la cantidad máxima de recursos crudos disponibles para tu fábrica. 
                Los objetivos con "Maximizar Producción" usarán estos límites para calcular la producción óptima.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                {getAllRawResources().map(resource => {
                  const currentValue = availableResources[resource.name] || 0;
                  const isLiquid = resource.isLiquid;
                  const isGas = resource.isGas;

                  return (
                    <div key={resource.id} style={{ background: '#1c1c22', border: '1px solid #333', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          color: isLiquid ? '#4FC3F7' : isGas ? '#81C784' : '#FFA726', 
                          fontSize: '16px' 
                        }}>
                          {isLiquid ? '💧' : isGas ? '💨' : '⛰️'}
                        </span>
                        <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>{resource.name}</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          type="number" 
                          placeholder="0" 
                          value={currentValue} 
                          onChange={(e) => {
                            const newResources = { ...availableResources };
                            const value = e.target.value;
                            if (value && !isNaN(Number(value)) && Number(value) > 0) {
                              newResources[resource.name] = Number(value);
                            } else {
                              newResources[resource.name] = 0;
                            }
                            setAvailableResources(newResources);
                          }}
                          min="0"
                          step="1"
                          style={{ 
                            flex: 1, 
                            background: '#111', 
                            border: '1px solid #444', 
                            color: isLiquid ? '#4FC3F7' : isGas ? '#81C784' : '#FFA726', 
                            padding: '8px', 
                            borderRadius: '4px', 
                            fontSize: '13px', 
                            outline: 'none' 
                          }}
                        />
                        <span style={{ color: '#666', fontSize: '12px', minWidth: '35px' }}>/min</span>
                      </div>
                      
                      {currentValue > 0 && (
                        <div style={{ fontSize: '11px', color: '#888' }}>
                          {currentValue} unidades/minuto disponibles
                        </div>
                      )}
                      {currentValue === 0 && (
                        <div style={{ fontSize: '11px', color: '#ff5555' }}>
                          Sin recursos disponibles
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ background: '#2a2a35', borderRadius: '8px', padding: '15px', border: '1px solid #444' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#9cdcfe', fontSize: '14px' }}>💡 Consejos de Uso:</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#ccc', fontSize: '12px', lineHeight: '1.4' }}>
                  <li>Deja vacío o pon 0 para recursos no disponibles</li>
                  <li>Los valores representan unidades/minuto que puedes extraer</li>
                  <li>Los objetivos con "Maximizar Producción" respetarán estos límites</li>
                  <li>Puedes actualizar estos valores en cualquier momento</li>
                </ul>
              </div>
            </div>

            <div style={{ padding: '20px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {Object.values(availableResources).filter(v => v > 0).length} recursos con límites configurados
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => {
                  const rawResources = getAllRawResources();
                  const cleared = {};
                  rawResources.forEach(resource => {
                    cleared[resource.name] = 0;
                  });
                  setAvailableResources(cleared);
                }} style={{ background: 'transparent', color: '#ff5555', border: '1px solid #ff5555', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Poner Todo en 0</button>
                <button onClick={() => setShowResourceManager(false)} style={{ background: '#007acc', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Inputs Externos */}
      {showExternalInputs && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', width: '90vw', maxWidth: '1000px', height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: '#FF9800', fontSize: '20px' }}>📦 Importar Productos</h2>
              <X size={24} color="#aaa" style={{ cursor: 'pointer' }} onClick={() => setShowExternalInputs(false)} />
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
                Especifica items que ya produces en otras fábricas y que puedes usar en este plano.
                <strong style={{ color: '#FF9800' }}>Nota:</strong> Los inputs externos solo afectan la producción del item objetivo seleccionado.
                Si produces componentes (como tornillos) en otras fábricas, configúralos como "Recursos Disponibles" en lugar de inputs externos.
              </p>

              {/* Buscador de items */}
              <div style={{ background: '#1c1c22', border: '1px solid #333', borderRadius: '8px', padding: '15px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
                  <Search size={18} color="#666" />
                  <input 
                    type="text" 
                    placeholder="Buscar item..." 
                    value={externalInputsSearchQuery}
                    onChange={(e) => setExternalInputsSearchQuery(e.target.value)}
                    style={{ flex: 1, background: '#111', border: '1px solid #444', color: '#fff', padding: '8px 12px', borderRadius: '6px', outline: 'none' }}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                  {filteredExternalItems.slice(0, 50).map(item => {
                    const currentValue = externalInputs[item.className] || 0;
                    const isSelected = currentValue > 0;
                    
                    return (
                      <div 
                        key={item.className}
                        onClick={() => {
                          const newInputs = { ...externalInputs };
                          if (isSelected) {
                            delete newInputs[item.className];
                          } else {
                            newInputs[item.className] = 1; // Valor por defecto
                          }
                          setExternalInputs(newInputs);
                        }}
                        style={{ 
                          background: isSelected ? '#2a2a35' : '#1c1c22', 
                          border: `1px solid ${isSelected ? '#FF9800' : '#333'}`, 
                          borderRadius: '6px', 
                          padding: '10px', 
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '5px'
                        }}
                      >
                        <div style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>{item.name}</div>
                        {isSelected && (
                          <input 
                            type="number" 
                            value={currentValue} 
                            onChange={(e) => {
                              e.stopPropagation();
                              const newInputs = { ...externalInputs };
                              const value = Number(e.target.value);
                              if (value > 0) {
                                newInputs[item.className] = value;
                              } else {
                                delete newInputs[item.className];
                              }
                              setExternalInputs(newInputs);
                            }}
                            min="0.1"
                            step="0.1"
                            style={{ 
                              width: '100%', 
                              background: '#111', 
                              border: '1px solid #444', 
                              color: '#FF9800', 
                              padding: '4px 6px', 
                              borderRadius: '4px', 
                              fontSize: '12px', 
                              outline: 'none' 
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {isSelected && (
                          <div style={{ fontSize: '10px', color: '#888' }}>/min disponible</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Items seleccionados */}
              {Object.keys(externalInputs).length > 0 && (
                <div style={{ background: '#2a2a35', border: '1px solid #444', borderRadius: '8px', padding: '15px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#FF9800', fontSize: '14px' }}>📦 Inputs Configurados:</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                    {Object.entries(externalInputs).map(([itemId, rate]) => {
                      const item = dataManager.getItem(itemId);
                      return (
                        <div key={itemId} style={{ background: '#1c1c22', border: '1px solid #FF9800', borderRadius: '6px', padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{item?.name || itemId}</div>
                            <div style={{ color: '#FF9800', fontSize: '11px' }}>{rate}/min</div>
                          </div>
                          <X 
                            size={14} 
                            color="#ff5555" 
                            style={{ cursor: 'pointer' }} 
                            onClick={() => {
                              const newInputs = { ...externalInputs };
                              delete newInputs[itemId];
                              setExternalInputs(newInputs);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ background: '#2a2a35', borderRadius: '8px', padding: '15px', border: '1px solid #444' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#9cdcfe', fontSize: '14px' }}>💡 Consejos de Uso:</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#ccc', fontSize: '12px', lineHeight: '1.4' }}>
                  <li><strong>Inputs Externos:</strong> Para items que produces en otras fábricas y quieres usar directamente (ej: ya tienes 10 rotores de otra línea)</li>
                  <li><strong>Recursos Disponibles:</strong> Para componentes o recursos crudos que produces externamente (ej: tornillos, mineral de hierro)</li>
                  <li>Haz click en un item para agregarlo como input externo</li>
                  <li>Especifica la cantidad que produces en otras fábricas</li>
                  <li>El sistema calculará si necesitas producir más o si tienes suficiente</li>
                </ul>
              </div>
            </div>

            <div style={{ padding: '20px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {Object.keys(externalInputs).length} inputs externos configurados
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setExternalInputs({})} style={{ background: 'transparent', color: '#ff5555', border: '1px solid #ff5555', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Limpiar Todo</button>
                <button onClick={() => setShowExternalInputs(false)} style={{ background: '#007acc', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

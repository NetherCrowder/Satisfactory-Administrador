import React, { useState, useEffect, useMemo, Component } from 'react';
import ReactFlow, { Background, Controls, Handle, Position, MiniMap, getSmoothStepPath } from 'reactflow';
import 'reactflow/dist/style.css';
import solver from '../solver/Solver';
import { applyLogistics } from '../solver/LogisticsEngine';
import { getLayoutedElements } from '../solver/layout';

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

const rawResourceNames = [
  'Bauxite',
  'Caterium ore',
  'Coal',
  'Copper ore',
  'Crude oil',
  'Iron ore',
  'Limestone',
  'Nitrogen gas',
  'Raw quartz',
  'SAM',
  'Sulfur',
  'Uranium',
  'Water'
];

export default function Editor() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const [targetItem, setTargetItem] = useState('Desc_Rotor_C');
  const [targetRate, setTargetRate] = useState(10);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAlternatesOpen, setIsAlternatesOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [basicRecipeSearch, setBasicRecipeSearch] = useState('');
  const [alternativeRecipeSearch, setAlternativeRecipeSearch] = useState('');
  const [overclock, setOverclock] = useState(100);
  const [minerPurity, setMinerPurity] = useState(1);
  const [minerMark, setMinerMark] = useState(60);
  const [activeRecipes, setActiveRecipes] = useState(() => dataManager.getBasicRecipes().map(recipe => recipe.id));
  const [beltTier, setBeltTier] = useState(6);
  const [pipeTier, setPipeTier] = useState(2);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState(() => rawResourceNames.map(name => ({ itemName: name, quantity: 0, enabled: true })));
  const [importedProducts, setImportedProducts] = useState([]);
  const [availableMachines, setAvailableMachines] = useState([]);

  const allItems = useMemo(() => dataManager.getAllItems().sort((a,b) => a.name.localeCompare(b.name)), []);
  const filteredItems = useMemo(() => allItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())), [allItems, searchQuery]);
  const filteredBasicRecipes = useMemo(() => dataManager.getBasicRecipes().filter(recipe => recipe.name.toLowerCase().includes(basicRecipeSearch.toLowerCase())), [basicRecipeSearch]);
  const filteredAlternativeRecipes = useMemo(() => dataManager.getAlternativeRecipes().filter(recipe => recipe.name.toLowerCase().includes(alternativeRecipeSearch.toLowerCase())), [alternativeRecipeSearch]);

  const getItemIdByName = (name) => {
    if (!name) return null;
    const normalized = name.trim().toLowerCase();
    const exactMatch = allItems.find(item => item.name.toLowerCase() === normalized);
    if (exactMatch) return exactMatch.id;
    const partialMatch = allItems.find(item => item.name.toLowerCase().includes(normalized));
    return partialMatch?.id || null;
  };

  const importedItemIds = useMemo(() => {
    return importedProducts
      .map(product => getItemIdByName(product.itemName))
      .filter(Boolean);
  }, [importedProducts, allItems]);

  const graphTargets = useMemo(() => {
    const selected = selectedProducts
      .map(product => {
        if (!product.itemId) return null;
        const quantity = Number(product.quantity);
        const rate = product.productionMode === 'items/min'
          ? (quantity > 0 ? quantity : 1)
          : (quantity > 0 ? quantity : 1);
        return rate > 0 ? { itemId: product.itemId, rate } : null;
      })
      .filter(Boolean);

    return selected.length > 0 ? selected : [{ itemId: targetItem, rate: targetRate }];
  }, [selectedProducts, targetItem, targetRate]);

  const toggleRecipeSelection = (recipeId) => {
    setActiveRecipes(prev => prev.includes(recipeId) ? prev.filter(id => id !== recipeId) : [...prev, recipeId]);
  };

  const calculateGraph = (opts = {}) => {
    try {
      setErrorMsg('');
      const options = {
        overclock: overclock / 100,
        minerPurityMultiplier: minerPurity,
        minerBaseRate: minerMark,
        activeRecipes,
        importedItems: importedItemIds,
        ...opts
      };
      const rawGraph = solver.solve(graphTargets, options);
      
      const logicGraph = applyLogistics(rawGraph.nodes, rawGraph.edges, { beltTier, pipeTier });

      const formattedNodes = logicGraph.nodes.map(n => ({ ...n, type: 'custom' }));
      const layoutedGraph = getLayoutedElements(formattedNodes, logicGraph.edges, 'LR');
      setNodes(layoutedGraph.nodes); setEdges(layoutedGraph.edges);
    } catch (e) { setErrorMsg(e.toString()); }
  };

  useEffect(() => { calculateGraph(); }, []);
  useEffect(() => {
    if (showGraph) {
      calculateGraph();
    }
  }, [showGraph, graphTargets, importedItemIds, activeRecipes, overclock, minerPurity, minerMark, beltTier, pipeTier]);

  const handleApplyConfig = () => { calculateGraph(); setIsConfigOpen(false); };
  const toggleGraphView = () => {
    setShowGraph(prev => !prev);
  };
  const currentItemName = dataManager.getItem(targetItem)?.name || 'Desconocido';

  const addProduct = () => setSelectedProducts(prev => [...prev, { itemId: '', productionMode: 'items/min', quantity: 0 }]);
  const removeProduct = (index) => setSelectedProducts(prev => prev.filter((_, i) => i !== index));
  const duplicateProduct = (index) => setSelectedProducts(prev => {
    const product = prev[index];
    if (!product) return prev;
    return [...prev, { ...product }];
  });
  const handleProductChange = (index, itemId) => setSelectedProducts(prev => prev.map((product, i) => i === index ? { ...product, itemId } : product));
  const handleProductionTypeChange = (index, productionMode) => setSelectedProducts(prev => prev.map((product, i) => i === index ? { ...product, productionMode } : product));
  const handleProductQuantityChange = (index, quantity) => setSelectedProducts(prev => prev.map((product, i) => i === index ? { ...product, quantity: Number(quantity) } : product));

  const addRawMaterial = () => setRawMaterials(prev => [...prev, { itemName: '', quantity: 0, enabled: true }]);
  const removeRawMaterial = (index) => setRawMaterials(prev => prev.filter((_, i) => i !== index));
  const handleRawMaterialToggle = (index) => setRawMaterials(prev => prev.map((material, i) => i === index ? { ...material, enabled: !material.enabled } : material));
  const handleRawMaterialChange = (index, itemName) => setRawMaterials(prev => prev.map((material, i) => i === index ? { ...material, itemName } : material));
  const handleRawMaterialQuantityChange = (index, quantity) => setRawMaterials(prev => prev.map((material, i) => i === index ? { ...material, quantity: Number(quantity) } : material));

  const addImportedProduct = () => setImportedProducts(prev => [...prev, { itemName: '', quantity: 0 }]);
  const removeImportedProduct = (index) => setImportedProducts(prev => prev.filter((_, i) => i !== index));
  const handleImportedProductChange = (index, itemName) => setImportedProducts(prev => prev.map((product, i) => i === index ? { ...product, itemName } : product));
  const handleImportedProductQuantityChange = (index, quantity) => setImportedProducts(prev => prev.map((product, i) => i === index ? { ...product, quantity: Number(quantity) } : product));

  const addMachine = () => setAvailableMachines(prev => [...prev, { buildingId: '', energy: 0 }]);
  const removeMachine = (index) => setAvailableMachines(prev => prev.filter((_, i) => i !== index));
  const handleMachineChange = (index, buildingId) => setAvailableMachines(prev => prev.map((machine, i) => i === index ? { ...machine, buildingId } : machine));
  const handleMachineEnergyChange = (index, energy) => setAvailableMachines(prev => prev.map((machine, i) => i === index ? { ...machine, energy: Number(energy) } : machine));

  const [activeTab, setActiveTab] = useState('recetas');

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0d0d0f', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', background: 'rgba(20,20,25,0.95)', borderBottom: '1px solid #333', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => navigate('/')} style={{ background: 'transparent', border: '1px solid #444', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><ArrowLeft size={18} /></button>
          <span style={{ color: 'white', fontWeight: 600, fontSize: '18px' }}>Fábrica de {currentItemName}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setActiveTab('recetas')} style={{ background: activeTab === 'recetas' ? '#333' : '#252528', color: '#ffc107', border: '1px solid #444', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>Recetas</button>
          <button onClick={() => setActiveTab('produccion')} style={{ background: activeTab === 'produccion' ? '#333' : '#252528', color: '#fff', border: '1px solid #444', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={16} /> Producción</button>
          <button onClick={() => setActiveTab('materias_primas')} style={{ background: activeTab === 'materias_primas' ? '#333' : '#252528', color: '#fff', border: '1px solid #444', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>Materias Primas</button>
          <button onClick={() => setActiveTab('productos_importados')} style={{ background: activeTab === 'productos_importados' ? '#333' : '#252528', color: '#fff', border: '1px solid #444', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>Productos Importados</button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', padding: '20px' }}>
        {activeTab === 'recetas' && (
          <div>
            <h2 style={{ color: '#9cdcfe' }}>Recetas</h2>
            <p>Seleccione las recetas para la producción. Las recetas están separadas en básicas y alternativas.</p>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '320px', background: '#1f2a38', borderRadius: '16px', padding: '20px', border: '1px solid #324050' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ color: '#cbd5e1', fontWeight: 700, fontSize: '16px' }}>Base recipes</div>
                    <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>Search for a recipe</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setActiveRecipes(prev => Array.from(new Set([...prev, ...dataManager.getBasicRecipes().map(r => r.id)])))} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>All</button>
                    <button onClick={() => setActiveRecipes(prev => prev.filter(id => !dataManager.getBasicRecipes().some(r => r.id === id)))} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>None</button>
                  </div>
                </div>
                <input
                  type="text"
                  value={basicRecipeSearch}
                  onChange={(e) => setBasicRecipeSearch(e.target.value)}
                  placeholder="Search for a recipe"
                  style={{ width: '100%', maxWidth: '280px', marginBottom: '16px', padding: '10px 12px', borderRadius: '12px', border: '1px solid #334155', background: '#111827', color: '#fff' }}
                />
                <div style={{ maxHeight: 'calc(100vh - 310px)', overflowY: 'auto', paddingRight: '4px' }}>
                  {filteredBasicRecipes.length === 0 ? (
                    <div style={{ color: '#94a3b8' }}>No recipes found.</div>
                  ) : filteredBasicRecipes.map(recipe => (
                    <label key={recipe.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: '#15202b', padding: '12px 14px', borderRadius: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                      <span style={{ color: '#fff', fontSize: '14px' }}>{recipe.name}</span>
                      <input
                        type="checkbox"
                        checked={activeRecipes.includes(recipe.id)}
                        onChange={() => toggleRecipeSelection(recipe.id)}
                        style={{ width: '18px', height: '18px' }}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: '320px', background: '#1f2a38', borderRadius: '16px', padding: '20px', border: '1px solid #324050' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ color: '#cbd5e1', fontWeight: 700, fontSize: '16px' }}>Alternate recipes</div>
                    <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>Search for a recipe</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setActiveRecipes(prev => Array.from(new Set([...prev, ...dataManager.getAlternativeRecipes().map(r => r.id)])))} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>All</button>
                    <button onClick={() => setActiveRecipes(prev => prev.filter(id => !dataManager.getAlternativeRecipes().some(r => r.id === id)))} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>None</button>
                  </div>
                </div>
                <input
                  type="text"
                  value={alternativeRecipeSearch}
                  onChange={(e) => setAlternativeRecipeSearch(e.target.value)}
                  placeholder="Search for a recipe"
                  style={{ width: '100%', maxWidth: '280px', marginBottom: '16px', padding: '10px 12px', borderRadius: '12px', border: '1px solid #334155', background: '#111827', color: '#fff' }}
                />
                <div style={{ maxHeight: 'calc(100vh - 310px)', overflowY: 'auto', paddingRight: '4px' }}>
                  {filteredAlternativeRecipes.length === 0 ? (
                    <div style={{ color: '#94a3b8' }}>No recipes found.</div>
                  ) : filteredAlternativeRecipes.map(recipe => (
                    <label key={recipe.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: '#15202b', padding: '12px 14px', borderRadius: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                      <span style={{ color: '#fff', fontSize: '14px' }}>{recipe.name}</span>
                      <input
                        type="checkbox"
                        checked={activeRecipes.includes(recipe.id)}
                        onChange={() => toggleRecipeSelection(recipe.id)}
                        style={{ width: '18px', height: '18px' }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'produccion' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div>
                <h2 style={{ color: '#9cdcfe', margin: 0 }}>Producción</h2>
                <p style={{ margin: '8px 0 0' }}>Seleccione los productos que desea producir. Puede agregar o eliminar productos libremente y seleccionar el tipo de producción para cada uno.</p>
              </div>
              <button onClick={toggleGraphView} style={{ height: '40px', padding: '0 18px', background: '#2563eb', border: 'none', color: '#fff', borderRadius: '12px', cursor: 'pointer' }}>
                {showGraph ? 'Ocultar gráfico' : 'Visualizar gráfico del plano'}
              </button>
            </div>

            <div style={{ marginTop: '20px', padding: '20px', background: '#1f2a38', borderRadius: '18px', border: '1px solid #324050' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {selectedProducts.map((product, index) => {
                  const item = dataManager.getItem(product.itemId);
                  return (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '32px minmax(180px,1fr) 260px 120px', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#15202b', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '18px', cursor: 'grab' }}>≡</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0f1720', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9cdcfe', fontSize: '16px' }}>
                          {item?.name?.charAt(0) || '#'}
                        </div>
                        <select
                          value={product.itemId}
                          onChange={(e) => handleProductChange(index, e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #334155', background: '#111827', color: '#fff' }}
                        >
                          <option value="">Seleccionar producto</option>
                          {allItems.map((itemOption) => (
                            <option key={itemOption.id} value={itemOption.id}>{itemOption.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <select
                          value={product.productionMode}
                          onChange={(e) => handleProductionTypeChange(index, e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #334155', background: '#111827', color: '#fff' }}
                        >
                          <option value="items/min">items/min</option>
                          <option value="maximize">maximize</option>
                        </select>
                        {product.productionMode === 'items/min' && (
                          <input
                            type="number"
                            value={product.quantity}
                            onChange={(e) => handleProductQuantityChange(index, e.target.value)}
                            placeholder="0"
                            style={{ width: '90px', padding: '10px 12px', borderRadius: '10px', border: '1px solid #334155', background: '#111827', color: '#fff' }}
                          />
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button onClick={() => duplicateProduct(index)} style={{ background: '#22c55e', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer' }}>⧉</button>
                        <button onClick={() => removeProduct(index)} style={{ background: '#ef4444', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer' }}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button onClick={addProduct} style={{ marginTop: '16px', width: '100%', padding: '14px', background: 'transparent', border: '1px solid #22c55e', color: '#22c55e', borderRadius: '12px', cursor: 'pointer' }}>+ Add product</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '24px' }}>
              <div style={{ background: '#1f2a38', borderRadius: '18px', padding: '20px', border: '1px solid #324050' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ color: '#cbd5e1', margin: 0 }}>Descripción general</h3>
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Productos seleccionados</span>
                    <span>{selectedProducts.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Materias primas</span>
                    <span>{rawMaterials.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Productos importados</span>
                    <span>{importedProducts.length}</span>
                  </div>
                  <div style={{ marginTop: '12px', padding: '14px', background: '#15202b', borderRadius: '14px' }}>
                    <div style={{ color: '#fff', marginBottom: '8px' }}>Consumo estimado</div>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Raw resources</span><span style={{ color: '#fff' }}>{rawMaterials.some(item => item.enabled) ? `${rawMaterials.filter(item => item.enabled).reduce((sum, item) => sum + item.quantity, 0)} units` : '0 units'}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Imported items</span><span style={{ color: '#fff' }}>{importedProducts.length > 0 ? `${importedProducts.reduce((sum, item) => sum + item.quantity, 0)} units` : '0 units'}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#1f2a38', borderRadius: '18px', padding: '20px', border: '1px solid #324050' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ color: '#cbd5e1', margin: 0 }}>Energía</h3>
                </div>
                <div style={{ color: '#94a3b8', marginBottom: '16px' }}>Consumo eléctrico estimado y herramientas de overclock.</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', color: '#fff' }}>
                  <span>Consumo base</span>
                  <span>{availableMachines.length > 0 ? `${availableMachines.reduce((sum, machine) => sum + machine.energy, 0)} MW` : '0 MW'}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="250"
                  value={overclock}
                  onChange={(e) => setOverclock(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', color: '#94a3b8' }}>
                  <span>Overclock</span>
                  <span>{overclock}%</span>
                </div>
                <button style={{ marginTop: '16px', width: '100%', padding: '12px', background: '#2563eb', border: 'none', color: '#fff', borderRadius: '12px', cursor: 'pointer' }}>Enable Summerslop</button>
              </div>

              <div style={{ background: '#1f2a38', borderRadius: '18px', padding: '20px', border: '1px solid #324050' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ color: '#cbd5e1', margin: 0 }}>Objetos</h3>
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Productos totales</span>
                    <span>{selectedProducts.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Importados</span>
                    <span>{importedProducts.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Materias primas</span>
                    <span>{rawMaterials.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Subproductos</span>
                    <span>0</span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#1f2a38', borderRadius: '18px', padding: '20px', border: '1px solid #324050' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ color: '#cbd5e1', margin: 0 }}>Máquinas</h3>
                </div>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {availableMachines.length === 0 ? (
                    <div style={{ color: '#94a3b8' }}>No machines selected yet.</div>
                  ) : availableMachines.map((machine, index) => {
                    const building = dataManager.getBuilding(machine.buildingId);
                    return (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', padding: '12px', background: '#15202b', borderRadius: '12px' }}>
                        <span>{building?.name || 'Unknown'}</span>
                        <span>{machine.energy} MW</span>
                      </div>
                    );
                  })}
                  {availableMachines.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#15202b', borderRadius: '12px', color: '#94a3b8' }}>
                      <span>Total</span>
                      <span>{availableMachines.reduce((sum, machine) => sum + machine.energy, 0)} MW</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {showGraph && (
              <div style={{ marginTop: '24px', background: '#0f1720', borderRadius: '18px', border: '1px solid #334155', overflow: 'hidden', minHeight: '420px' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #273444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#cbd5e1', fontWeight: 700 }}>Vista del plano</div>
                    <div style={{ color: '#94a3b8', fontSize: '13px' }}>Se muestra la red de producción calculada para {currentItemName}.</div>
                  </div>
                  <button onClick={() => setShowGraph(false)} style={{ background: 'transparent', border: '1px solid #666', color: '#fff', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer' }}>Cerrar</button>
                </div>
                <div style={{ width: '100%', height: '520px' }}>
                  <ErrorBoundary>
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      nodeTypes={nodeTypes}
                      edgeTypes={edgeTypes}
                      fitView
                      fitViewOptions={{ padding: 0.2 }}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <Background gap={24} size={1} color="#1f2937" />
                      <Controls showInteractive={false} />
                      <MiniMap nodeStrokeColor="#64748b" nodeColor="#1f2937" zoomable={false} />
                    </ReactFlow>
                  </ErrorBoundary>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'materias_primas' && (
          <div>
            <h2 style={{ color: '#9cdcfe' }}>Materias Primas</h2>
            <p>Especifique las materias primas disponibles y sus cantidades.</p>
            <div style={{ display: 'grid', gap: '10px', maxWidth: '100%', overflowX: 'hidden' }}>
              {rawMaterials.map((material, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '32px minmax(180px,1fr) 110px', alignItems: 'center', gap: '10px', marginBottom: '10px', padding: '12px', borderRadius: '12px', background: '#15202b', border: '1px solid #273444', minWidth: 0 }}>
                  <input
                    type="checkbox"
                    checked={material.enabled}
                    onChange={() => handleRawMaterialToggle(index)}
                    style={{ width: '16px', height: '16px', accentColor: '#22c55e' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#0f1720', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9cdcfe', fontSize: '14px' }}>
                      {material.itemName?.charAt(0) || '?'}
                    </div>
                    <span style={{ color: '#fff', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{material.itemName}</span>
                  </div>
                  <input
                    type="number"
                    value={material.quantity}
                    onChange={(e) => handleRawMaterialQuantityChange(index, e.target.value)}
                    placeholder="Límite"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #334155', background: '#111827', color: '#fff', boxSizing: 'border-box', minWidth: 0 }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'productos_importados' && (
          <div>
            <h2 style={{ color: '#9cdcfe' }}>Productos Importados</h2>
            <p>Seleccione los productos importados y especifique sus cantidades.</p>
            <div style={{ display: 'grid', gap: '10px', maxWidth: '100%', overflowX: 'hidden' }}>
              {importedProducts.map((product, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '28px minmax(220px,1fr) 100px 48px', alignItems: 'center', gap: '10px', marginBottom: '10px', padding: '12px', borderRadius: '12px', background: '#15202b', border: '1px solid #273444', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '18px', cursor: 'grab' }}>≡</div>
                  <input
                    type="text"
                    list="item-options"
                    value={product.itemName}
                    onChange={(e) => handleImportedProductChange(index, e.target.value)}
                    placeholder="Search or select item"
                    style={{ width: '100%', minWidth: 0, padding: '10px 12px', borderRadius: '10px', border: '1px solid #334155', background: '#111827', color: '#fff', boxSizing: 'border-box' }}
                  />
                  <input
                    type="number"
                    value={product.quantity}
                    onChange={(e) => handleImportedProductQuantityChange(index, e.target.value)}
                    placeholder="Cantidad"
                    style={{ width: '100%', minWidth: 0, padding: '10px 12px', borderRadius: '10px', border: '1px solid #334155', background: '#111827', color: '#fff', boxSizing: 'border-box' }}
                  />
                  <button onClick={() => removeImportedProduct(index)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <button onClick={addImportedProduct} style={{ marginTop: '10px', background: 'transparent', border: '1px solid #22c55e', color: '#22c55e', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer' }}>+ Agregar Producto Importado</button>
              <datalist id="item-options">
                {allItems.map((item) => (
                  <option key={item.id} value={item.name} />
                ))}
              </datalist>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

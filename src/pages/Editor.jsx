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
  const [searchQuery, setSearchQuery] = useState('');
  const [altSearchQuery, setAltSearchQuery] = useState('');
  const [overclock, setOverclock] = useState(100);
  const [minerPurity, setMinerPurity] = useState(1);
  const [minerMark, setMinerMark] = useState(60);
  const [activeRecipes, setActiveRecipes] = useState([]);
  const [beltTier, setBeltTier] = useState(6);
  const [pipeTier, setPipeTier] = useState(2);

  const allItems = useMemo(() => dataManager.getAllItems().sort((a,b) => a.name.localeCompare(b.name)), []);
  const filteredItems = useMemo(() => allItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())), [allItems, searchQuery]);
  
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

  const calculateGraph = (itemLabel, rate, opts = null) => {
    try {
      setErrorMsg('');
      const options = opts || { overclock: overclock/100, minerPurityMultiplier: minerPurity, minerBaseRate: minerMark, activeRecipes };
      const rawGraph = solver.solve(itemLabel, Number(rate), options);
      
      const logicGraph = applyLogistics(rawGraph.nodes, rawGraph.edges, { beltTier, pipeTier });

      const formattedNodes = logicGraph.nodes.map(n => ({ ...n, type: 'custom' }));
      const layoutedGraph = getLayoutedElements(formattedNodes, logicGraph.edges, 'LR');
      setNodes(layoutedGraph.nodes); setEdges(layoutedGraph.edges);
    } catch (e) { setErrorMsg(e.toString()); }
  };

  useEffect(() => { calculateGraph(targetItem, targetRate); }, []);
  const handleApplyConfig = () => { calculateGraph(targetItem, targetRate, { overclock: overclock/100, minerPurityMultiplier: minerPurity, minerBaseRate: minerMark, activeRecipes }); setIsConfigOpen(false); };
  const currentItemName = dataManager.getItem(targetItem)?.name || 'Desconocido';

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0d0d0f', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', background: 'rgba(20,20,25,0.95)', borderBottom: '1px solid #333', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => navigate('/')} style={{ background: 'transparent', border: '1px solid #444', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><ArrowLeft size={18} /></button>
          <span style={{ color: 'white', fontWeight: 600, fontSize: '18px' }}>Fábrica de {currentItemName}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setIsAlternatesOpen(true)} style={{ background: '#252528', color: '#ffc107', border: '1px solid #444', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>Gestor de Recetas</button>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: '#aaa', fontSize: '14px' }}>Ítem Objetivo:</label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} color="#666" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  <input type="text" placeholder="Buscar ítem..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: '#252528', border: '1px solid #444', padding: '10px 10px 10px 35px', borderRadius: '6px', color: '#fff', outline: 'none' }} />
                </div>
                <div style={{ background: '#0d0d0f', border: '1px solid #333', borderRadius: '6px', height: '140px', overflowY: 'auto', marginTop: '5px' }}>
                  {filteredItems.map(item => (
                    <div key={item.className} onClick={() => setTargetItem(item.className)} style={{ padding: '10px 15px', color: targetItem === item.className ? '#fff' : '#ccc', background: targetItem === item.className ? '#007acc' : 'transparent', cursor: 'pointer', borderBottom: '1px solid #1a1a20', fontSize: '14px' }}>
                      {item.name}
                    </div>
                  ))}
                  {filteredItems.length === 0 && <div style={{ padding: '15px', color: '#666', textAlign: 'center' }}>No se encontraron resultados</div>}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: '#aaa', fontSize: '14px' }}>Producción deseada (ítems/min):</label>
                <input type="number" value={targetRate} onChange={(e) => setTargetRate(e.target.value)} min="0.1" step="0.1" style={{ width: '100%', boxSizing: 'border-box', background: '#252528', border: '1px solid #444', padding: '10px', borderRadius: '6px', color: '#fff', fontSize: '16px', outline: 'none' }} />
              </div>

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
              <button onClick={() => { calculateGraph(targetItem, targetRate); setIsAlternatesOpen(false); }} style={{ background: '#007acc', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Guardar y Recalcular</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

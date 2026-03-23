import { useState, useEffect, useMemo } from 'react';
import ReactFlow, { Background, Controls, Handle, Position, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import solver from '../solver/Solver';
import { getLayoutedElements } from '../solver/layout';
import dataManager from '../data/dataManager';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Settings, X, Search, ClipboardList } from 'lucide-react';

const CustomNode = ({ data }) => {
  const inputCount = Math.max(1, data.inputCount || 1);
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
      <Handle type="source" position={Position.Right} id="out" style={{ background: '#007acc', width: 8, height: 16, borderRadius: 4, right: -4 }} />
    </div>
  );
};
const nodeTypes = { custom: CustomNode };

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
  const [enabledAlternates, setEnabledAlternates] = useState([]);

  const allItems = useMemo(() => dataManager.getAllItems().sort((a,b) => a.name.localeCompare(b.name)), []);
  const filteredItems = useMemo(() => allItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())), [allItems, searchQuery]);
  const allAlternates = useMemo(() => dataManager.getAllRecipes().filter(r => r.alternate).sort((a,b) => a.name.localeCompare(b.name)), []);
  const filteredAlternates = useMemo(() => allAlternates.filter(alt => alt.name.toLowerCase().includes(altSearchQuery.toLowerCase())), [allAlternates, altSearchQuery]);

  const calculateGraph = (itemLabel, rate, opts = null) => {
    try {
      setErrorMsg('');
      const options = opts || { overclock: overclock/100, minerPurityMultiplier: minerPurity, minerBaseRate: minerMark, enabledAlternates };
      const rawGraph = solver.solve(itemLabel, Number(rate), options);
      const formattedNodes = rawGraph.nodes.map(n => ({ ...n, type: 'custom' }));
      const layoutedGraph = getLayoutedElements(formattedNodes, rawGraph.edges, 'LR');
      setNodes(layoutedGraph.nodes); setEdges(layoutedGraph.edges);
    } catch (e) { setErrorMsg(e.toString()); }
  };

  useEffect(() => { calculateGraph(targetItem, targetRate); }, []);
  const handleApplyConfig = () => { calculateGraph(targetItem, targetRate, { overclock: overclock/100, minerPurityMultiplier: minerPurity, minerBaseRate: minerMark, enabledAlternates }); setIsConfigOpen(false); };
  const currentItemName = dataManager.getItem(targetItem)?.name || 'Desconocido';

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0d0d0f', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', background: 'rgba(20,20,25,0.95)', borderBottom: '1px solid #333', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => navigate('/')} style={{ background: 'transparent', border: '1px solid #444', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><ArrowLeft size={18} /></button>
          <span style={{ color: 'white', fontWeight: 600, fontSize: '18px' }}>Fábrica de {currentItemName}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setIsAlternatesOpen(true)} style={{ background: '#252528', color: '#ffc107', border: '1px solid #444', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>Gestor de Alternativas</button>
          <button onClick={() => setShowSummary(!showSummary)} style={{ background: showSummary ? '#333' : '#252528', color: '#fff', border: '1px solid #444', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={16} /> Ver Resumen</button>
          <button onClick={() => setIsConfigOpen(true)} style={{ background: '#252528', color: '#fff', border: '1px solid #444', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={16} /> Configurar Receta</button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {errorMsg ? <div style={{ color: '#ff5555', padding: '80px', fontFamily: 'monospace' }}>{errorMsg}</div> : (
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
            <Background color="#333" gap={20} size={1.5} />
            <Controls />
            <MiniMap nodeColor={() => '#252528'} maskColor="rgba(0, 0, 0, 0.6)" style={{ background: '#111', border: '1px solid #333', borderRadius: '8px' }} />
          </ReactFlow>
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
              <h2 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>Gestor de Alternativas</h2>
              <X size={24} color="#aaa" style={{ cursor: 'pointer' }} onClick={() => setIsAlternatesOpen(false)} />
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>Cualesquiera recetas marcadas tendrán prioridad sobre las base.</p>
              
               <div style={{ position: 'relative' }}>
                <Search size={16} color="#666" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input type="text" placeholder="Buscar alternativa por nombre..." value={altSearchQuery} onChange={(e) => setAltSearchQuery(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: '#252528', border: '1px solid #444', padding: '10px 10px 10px 35px', borderRadius: '6px', color: '#fff', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
                {filteredAlternates.map(alt => {
                  const isEnabled = enabledAlternates.includes(alt.className);
                  return (
                    <div key={alt.className} onClick={() => { if (isEnabled) setEnabledAlternates(enabledAlternates.filter(x => x !== alt.className)); else setEnabledAlternates([...enabledAlternates, alt.className]); }}
                      style={{ padding: '10px', background: isEnabled ? 'rgba(0, 122, 204, 0.2)' : '#222', border: `1px solid ${isEnabled ? '#007acc' : '#333'}`, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }} title={alt.name}>
                      <input type="checkbox" checked={isEnabled} readOnly style={{ cursor: 'pointer', flexShrink: 0 }} />
                      <span style={{ color: isEnabled ? '#fff' : '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alt.name}</span>
                    </div>
                  );
                })}
              </div>
              {filteredAlternates.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No se encontraron recetas.</div>}
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

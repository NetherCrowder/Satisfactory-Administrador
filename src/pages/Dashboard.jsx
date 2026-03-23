import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Factory, LayoutGrid } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', width: '100vw', padding: '60px', background: '#0d0d0f', color: '#fff', boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Factory size={36} color="#007acc" />
          Satisfactory Planner
        </h1>
        <button 
          onClick={() => navigate('/editor/new')}
          style={{ 
            background: 'linear-gradient(135deg, #007acc 0%, #005999 100%)', 
            color: 'white', border: 'none', padding: '12px 24px', 
            borderRadius: '8px', fontSize: '16px', fontWeight: 600, 
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
            boxShadow: '0 4px 15px rgba(0, 122, 204, 0.4)'
          }}
        >
          <Plus size={20} /> Nueva Fábrica
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
        
        {/* Mockup de un proyecto guardado */}
        <div style={{
          background: 'rgba(30, 30, 35, 0.6)', border: '1px solid #2a2a30',
          borderRadius: '12px', padding: '25px', cursor: 'pointer',
          transition: 'transform 0.2s',
          display: 'flex', flexDirection: 'column', gap: '15px'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = '#007acc'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#2a2a30'; }}
        onClick={() => navigate('/editor/demo')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ background: '#1a1a20', padding: '12px', borderRadius: '10px' }}>
              <LayoutGrid size={24} color="#ffc107" />
            </div>
            <span style={{ fontSize: '12px', color: '#888', background: '#222', padding: '4px 8px', borderRadius: '4px' }}>
              Base de Demostración
            </span>
          </div>
          <div style={{ marginTop: '10px' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', color: '#fff' }}>Fábrica de Rotores</h3>
            <p style={{ margin: 0, color: '#aaa', fontSize: '14px' }}>Objetivo principal: 10 Rotores/min</p>
          </div>
        </div>

      </div>
    </div>
  );
}

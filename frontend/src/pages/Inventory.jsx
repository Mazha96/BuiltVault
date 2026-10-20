import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Plus, Trash2, AlertTriangle, Package, Printer, Edit2, Check, X, ChevronDown, ChevronUp, ExternalLink, Upload } from 'lucide-react';

const s = {
  page: { maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  h1: { fontSize: '1.875rem', fontWeight: 700, color: '#e2e8f0' },
  sub: { color: '#9ca3af', fontSize: '0.875rem', marginTop: 4 },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1.25rem', background: 'linear-gradient(135deg,#ff2d78,#00d4ff)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap' },
  btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#e2e8f0', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' },
  btnIcon: { background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', borderRadius: 4 },
  formCard: { background: '#0d1224', border: '1px solid rgba(255,45,120,0.25)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' },
  formTitle: { fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '1.25rem' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' },
  label: { display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.3rem', fontWeight: 500 },
  input: { width: '100%', padding: '0.5rem 0.75rem', background: '#0a0e1a', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, color: '#e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' },
  checkRow: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', color: '#e2e8f0', marginBottom: '0.75rem' },
  btnRow: { display: 'flex', gap: '0.75rem', marginTop: '1rem' },
  // Stats bar
  statsBar: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' },
  statCard: { background: '#0d1224', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '1rem', textAlign: 'center' },
  statVal: { fontSize: '1.5rem', fontWeight: 800 },
  statLabel: { fontSize: '0.7rem', color: '#6b7280', marginTop: 2 },
  // Part row
  partRow: (low) => ({ background: '#0d1224', border: `1px solid ${low ? 'rgba(255,45,120,0.35)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, padding: '1rem', marginBottom: '0.5rem' }),
  partTop: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  partName: { fontWeight: 600, fontSize: '0.95rem', color: '#e2e8f0', flex: 1 },
  partMeta: { fontSize: '0.75rem', color: '#9ca3af', marginTop: 3 },
  qtyBadge: (avail) => ({ fontSize: '0.85rem', fontWeight: 700, color: avail < 0 ? '#ff2d78' : avail === 0 ? '#f59e0b' : '#00d4ff', textAlign: 'right', minWidth: 80 }),
  qtyLabel: { fontSize: '0.7rem', color: '#6b7280', textAlign: 'right' },
  tag: (color) => ({ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: 9999, background: `${color}18`, color, border: `1px solid ${color}40`, fontWeight: 600 }),
  expandBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '0.2rem', display: 'flex', alignItems: 'center', fontSize: '0.75rem', gap: 3 },
  expandRow: { marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' },
  editInput: { padding: '0.3rem 0.5rem', background: '#0a0e1a', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 6, color: '#e2e8f0', fontSize: '0.875rem', outline: 'none', width: 80, colorScheme: 'dark' },
  empty: { textAlign: 'center', padding: '4rem 1rem', border: '2px dashed rgba(255,255,255,0.07)', borderRadius: 12 },
  searchInput: { padding: '0.5rem 0.875rem', background: '#0d1224', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: '0.875rem', outline: 'none', width: 220, colorScheme: 'dark' },
  filterRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' },
};

const defaultForm = { name: '', description: '', unit: 'pcs', stock_qty: 1, unit_cost: 0, supplier: '', supplier_url: '', is_3d_printed: false, filament_type: 'PLA', filament_grams: 0, filament_cost_per_kg: 20 };

export default function Inventory() {
  const nav = useNavigate();
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [expanded, setExpanded] = useState({});
  const [editing, setEditing] = useState({}); // { [partId]: { stock_qty: x } }
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | low | 3d

  const load = () => api.get('/inventory').then(r => setParts(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const addPart = async e => {
    e.preventDefault();
    await api.post('/inventory', form);
    setForm(defaultForm);
    setShowForm(false);
    load();
  };

  const deletePart = async id => {
    if (!confirm('Remove this part from inventory?')) return;
    await api.delete(`/inventory/${id}`);
    load();
  };

  const saveEdit = async (id) => {
    const updates = editing[id];
    await api.put(`/inventory/${id}`, updates);
    setEditing(e => { const n = {...e}; delete n[id]; return n; });
    load();
  };

  const toggleExpand = id => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const filtered = parts.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.supplier?.toLowerCase().includes(q);
    const matchFilter = filter === 'all' || (filter === 'low' && p.available_qty <= 2) || (filter === '3d' && p.is_3d_printed);
    return matchSearch && matchFilter;
  });

  const totalValue = parts.reduce((s, p) => s + (p.stock_qty * p.unit_cost), 0);
  const lowStock = parts.filter(p => p.available_qty <= 2 && p.stock_qty > 0).length;
  const outOfStock = parts.filter(p => p.available_qty <= 0).length;

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.h1}>Parts <span style={{ color: '#ff2d78' }}>Inventory</span></h1>
          <p style={s.sub}>Global parts library — shared across all active projects. Consumed when a project completes.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => nav('/inventory/import')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 8, color: '#00d4ff', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
            <Upload size={15} /> Import CSV
          </button>
          <button onClick={() => setShowForm(!showForm)} style={s.btnPrimary}>
            <Plus size={16} /> Add Part
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={s.statsBar}>
        <div style={s.statCard}>
          <div style={{ ...s.statVal, color: '#00d4ff' }}>{parts.length}</div>
          <div style={s.statLabel}>Total Parts</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statVal, color: '#ff2d78' }}>{lowStock}</div>
          <div style={s.statLabel}>Low / Out of Stock</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statVal, color: '#a78bfa' }}>${totalValue.toFixed(2)}</div>
          <div style={s.statLabel}>Total Value</div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={s.formCard}>
          <p style={s.formTitle}>New Part</p>
          <form onSubmit={addPart}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={s.label}>Part Name *</label>
              <input style={s.input} required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. M3×10mm Bolt, ESP32, PLA Spool" />
            </div>
            <div style={s.grid3}>
              <div>
                <label style={s.label}>Stock Qty</label>
                <input style={s.input} type="number" step="any" min="0" value={form.stock_qty} onChange={e => setForm({...form, stock_qty: +e.target.value})} />
              </div>
              <div>
                <label style={s.label}>Unit</label>
                <input style={s.input} value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="pcs, m, kg…" />
              </div>
              <div>
                <label style={s.label}>Unit Cost ($)</label>
                <input style={s.input} type="number" step="any" min="0" value={form.unit_cost} onChange={e => setForm({...form, unit_cost: +e.target.value})} />
              </div>
            </div>
            <div style={s.grid2}>
              <div>
                <label style={s.label}>Supplier</label>
                <input style={s.input} value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} placeholder="Amazon, Digikey, McMaster…" />
              </div>
              <div>
                <label style={s.label}>Supplier URL</label>
                <input style={s.input} value={form.supplier_url} onChange={e => setForm({...form, supplier_url: e.target.value})} placeholder="https://…" />
              </div>
            </div>
            <div>
              <label style={s.label}>Description</label>
              <input style={s.input} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Optional notes" />
            </div>
            <label style={{ ...s.checkRow, marginTop: '0.75rem' }}>
              <input type="checkbox" checked={form.is_3d_printed} onChange={e => setForm({...form, is_3d_printed: e.target.checked})} style={{ accentColor: '#ff2d78', width: 16, height: 16 }} />
              <Printer size={14} style={{ color: '#ff2d78' }} /> 3D Printed Part
            </label>
            {form.is_3d_printed && (
              <div style={s.grid3}>
                <div><label style={s.label}>Filament Type</label><input style={s.input} value={form.filament_type} onChange={e => setForm({...form, filament_type: e.target.value})} /></div>
                <div><label style={s.label}>Grams</label><input style={s.input} type="number" step="any" min="0" value={form.filament_grams} onChange={e => setForm({...form, filament_grams: +e.target.value})} /></div>
                <div><label style={s.label}>$/kg</label><input style={s.input} type="number" step="any" min="0" value={form.filament_cost_per_kg} onChange={e => setForm({...form, filament_cost_per_kg: +e.target.value})} /></div>
              </div>
            )}
            <div style={s.btnRow}>
              <button type="submit" style={s.btnPrimary}><Plus size={16} /> Add Part</button>
              <button type="button" onClick={() => setShowForm(false)} style={s.btnSecondary}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter row */}
      {parts.length > 0 && (
        <div style={s.filterRow}>
          <input style={s.searchInput} placeholder="Search parts…" value={search} onChange={e => setSearch(e.target.value)} />
          {['all','low','3d'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '0.35rem 0.75rem', borderRadius: 9999, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, background: filter === f ? '#00d4ff' : 'rgba(255,255,255,0.06)', color: filter === f ? '#0a0e1a' : '#9ca3af' }}>
              {f === 'all' ? 'All' : f === 'low' ? '⚠️ Low Stock' : '🖨️ 3D Printed'}
            </button>
          ))}
          <span style={{ fontSize: '0.8rem', color: '#6b7280', marginLeft: 'auto' }}>{filtered.length} parts</span>
        </div>
      )}

      {/* Parts list */}
      {loading ? (
        <p style={{ color: '#9ca3af' }}>Loading…</p>
      ) : parts.length === 0 ? (
        <div style={s.empty}>
          <Package size={48} style={{ color: '#374151', margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No parts yet. Add your first component!</p>
          <button onClick={() => setShowForm(true)} style={s.btnPrimary}><Plus size={16} /> Add Part</button>
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No parts match your search.</p>
      ) : (
        filtered.map(part => {
          const isLow = part.available_qty <= 2;
          const isEditing = !!editing[part.id];
          const isExpanded = expanded[part.id];

          return (
            <div key={part.id} style={s.partRow(isLow)}>
              <div style={s.partTop}>
                {part.is_3d_printed
                  ? <Printer size={18} style={{ color: '#ff2d78', flexShrink: 0 }} />
                  : <Package size={18} style={{ color: '#00d4ff', flexShrink: 0 }} />}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.partName}>{part.name}</div>
                  <div style={s.partMeta}>
                    {part.unit_cost > 0 && `$${part.unit_cost}/${part.unit}`}
                    {part.supplier && ` · ${part.supplier}`}
                    {part.description && ` · ${part.description}`}
                  </div>
                </div>

                {/* Qty display / inline edit */}
                <div style={{ textAlign: 'right', marginRight: 8 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number"
                        style={s.editInput}
                        value={editing[part.id].stock_qty ?? part.stock_qty}
                        onChange={e => setEditing(ed => ({ ...ed, [part.id]: { ...ed[part.id], stock_qty: +e.target.value } }))}
                        min="0"
                        step="any"
                      />
                      <button onClick={() => saveEdit(part.id)} style={{ ...s.btnIcon, color: '#00d4ff' }}><Check size={14} /></button>
                      <button onClick={() => setEditing(ed => { const n={...ed}; delete n[part.id]; return n; })} style={{ ...s.btnIcon, color: '#6b7280' }}><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <div style={s.qtyBadge(part.available_qty)}>
                        {part.available_qty} {part.unit}
                        <span style={{ fontSize: '0.65rem', color: '#6b7280' }}> avail</span>
                      </div>
                      <div style={s.qtyLabel}>{part.stock_qty} stock · {part.committed_qty} used</div>
                    </>
                  )}
                </div>

                {isLow && !isEditing && <AlertTriangle size={16} style={{ color: '#ff2d78', flexShrink: 0 }} />}

                <button onClick={() => setEditing(ed => ({ ...ed, [part.id]: { stock_qty: part.stock_qty } }))} style={{ ...s.btnIcon, color: '#6b7280' }}
                  onMouseOver={e => e.currentTarget.style.color='#00d4ff'} onMouseOut={e => e.currentTarget.style.color='#6b7280'}>
                  <Edit2 size={14} />
                </button>
                <button onClick={() => deletePart(part.id)} style={{ ...s.btnIcon, color: '#6b7280' }}
                  onMouseOver={e => e.currentTarget.style.color='#ff2d78'} onMouseOut={e => e.currentTarget.style.color='#6b7280'}>
                  <Trash2 size={14} />
                </button>
                <button onClick={() => toggleExpand(part.id)} style={s.expandBtn}>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={s.expandRow}>
                  <div>
                    <div style={s.label}>Unit Cost</div>
                    <div style={{ color: '#00d4ff', fontWeight: 600 }}>${part.unit_cost} / {part.unit}</div>
                  </div>
                  <div>
                    <div style={s.label}>Total Value</div>
                    <div style={{ color: '#a78bfa', fontWeight: 600 }}>${(part.stock_qty * part.unit_cost).toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={s.label}>Type</div>
                    {part.is_3d_printed
                      ? <span style={s.tag('#ff2d78')}>🖨️ {part.filament_type}</span>
                      : <span style={s.tag('#00d4ff')}>📦 Physical</span>}
                  </div>
                  {part.supplier_url && (
                    <div style={{ gridColumn: 'span 3' }}>
                      <a href={part.supplier_url} target="_blank" rel="noreferrer"
                        style={{ color: '#00d4ff', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                        <ExternalLink size={12} /> {part.supplier || 'Supplier link'}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

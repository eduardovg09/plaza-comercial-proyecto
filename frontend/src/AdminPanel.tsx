import { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    Title,
    CategoryScale,
    LinearScale,
    BarElement,
    RadialLinearScale
} from 'chart.js';
import { Doughnut, Bar, PolarArea } from 'react-chartjs-2';
import { API_URL } from './config';

// Registramos todos los componentes de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, Title, CategoryScale, LinearScale, BarElement, RadialLinearScale);

// --- TIPOS DE DATOS ---

// Interfaces para respuestas de KPIs
interface KpiStatus { Status: string; Total: number; }
interface KpiRequest { Status: string; Total: number; }
interface KpiFloor { FloorName: string; Total: number; }
interface KpiGiro { Giro: string; Total: number; }

interface Request {
    RequestId: number;
    Status: string;
    CreatedAt: string;
    GiroSolicitado: string;
    PlanNegocio: string;
    FullName: string;
    Email: string;
    LocalCode: string;
    LocalName: string;
}

interface User {
    UserId: number;
    FullName: string;
    Email: string;
    Role: string;
}

interface Local {
    LocalId: number;
    Name: string;
    Code: string;
    Status: string;
    MonthlyPrice: number;
    Area: number;
    Giro: string;
}

// --- COMPONENTE PRINCIPAL (LAYOUT) ---
function AdminPanel() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'locals' | 'users'>('dashboard');

    return (
        <div className="flex h-screen bg-gray-100">
            {/* SIDEBAR (MENÚ LATERAL) */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
                <div className="p-6 text-center border-b border-slate-700">
                    <h2 className="text-2xl font-bold">Admin Panel</h2>
                    <p className="text-slate-400 text-xs mt-1">Gestión Plaza Comercial</p>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <MenuButton label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon="📊" />
                    <MenuButton label="Solicitudes" active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} icon="📨" />
                    <MenuButton label="Locales" active={activeTab === 'locals'} onClick={() => setActiveTab('locals')} icon="🏢" />
                    <MenuButton label="Clientes" active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon="👥" />
                </nav>

                <div className="p-4 border-t border-slate-700">
                    <a href="/" className="block text-center bg-slate-800 py-2 rounded hover:bg-slate-700 text-sm">
                        ← Volver al Mapa
                    </a>
                </div>
            </aside>

            {/* ÁREA DE CONTENIDO PRINCIPAL */}
            <main className="flex-1 overflow-y-auto p-8">
                {activeTab === 'dashboard' && <DashboardView />}
                {activeTab === 'requests' && <RequestsView />}
                {activeTab === 'locals' && <LocalsView />}
                {activeTab === 'users' && <UsersView />}
            </main>
        </div>
    );
}

// --- VISTA 1: DASHBOARD (KPIs + Filtros + Historial) ---
function DashboardView() {
    // Estados para KPIs Gráficos
    const [kpiStatus, setKpiStatus] = useState<KpiStatus[]>([]);
    const [kpiRequests, setKpiRequests] = useState<KpiRequest[]>([]);
    const [kpiFloors, setKpiFloors] = useState<KpiFloor[]>([]);
    const [kpiGiros, setKpiGiros] = useState<KpiGiro[]>([]);

    // Estado: Historial Reciente
    const [recentHistory, setRecentHistory] = useState<any[]>([]);

    // Estados Filtros
    const [filterFloor, setFilterFloor] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const cargarDatos = () => {
        const params = new URLSearchParams();
        if (filterFloor !== 'all') params.append('floorId', filterFloor);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const qs = params.toString();

        // Cargar Gráficas
        fetch(`${API_URL}/api/admin/kpi/status?${qs}`).then(r => r.json()).then(setKpiStatus).catch(console.error);
        fetch(`${API_URL}/api/admin/kpi/requests-status?${qs}`).then(r => r.json()).then(setKpiRequests).catch(console.error);
        fetch(`${API_URL}/api/admin/kpi/requests-floor?${qs}`).then(r => r.json()).then(setKpiFloors).catch(console.error);
        fetch(`${API_URL}/api/admin/kpi/requests-giro?${qs}`).then(r => r.json()).then(setKpiGiros).catch(console.error);

        // Cargar Historial (Siempre muestra lo último)
        fetch(`${API_URL}/api/admin/kpi/recent-history`).then(r => r.json()).then(setRecentHistory).catch(console.error);
    };

    useEffect(() => { cargarDatos(); }, []);

    // Configuración de Gráficas
    const dataLocales = {
        labels: ['Disponible', 'Negociación', 'Ocupado'],
        datasets: [{
            data: [
                kpiStatus.find(k => k.Status === 'disponible')?.Total || 0,
                kpiStatus.find(k => k.Status.includes('negociacion'))?.Total || 0,
                kpiStatus.find(k => k.Status === 'ocupado')?.Total || 0,
            ],
            backgroundColor: ['#22c55e', '#eab308', '#ef4444'], borderWidth: 0
        }]
    };

    const dataRequests = {
        labels: ['Pendientes', 'Aprobadas', 'Rechazadas'],
        datasets: [{
            label: 'Solicitudes',
            data: [
                kpiRequests.find(k => k.Status === 'pending')?.Total || 0,
                kpiRequests.find(k => k.Status === 'approved')?.Total || 0,
                kpiRequests.find(k => k.Status === 'rejected')?.Total || 0,
            ],
            backgroundColor: ['#f59e0b', '#10b981', '#ef4444'], borderRadius: 5
        }]
    };

    const dataFloors = {
        labels: kpiFloors.map(k => k.FloorName),
        datasets: [{
            label: 'Solicitudes',
            data: kpiFloors.map(k => k.Total),
            backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(139, 92, 246, 0.7)'], borderWidth: 1
        }]
    };

    const dataGiros = {
        labels: kpiGiros.map(k => k.Giro),
        datasets: [{
            label: 'Interesados',
            data: kpiGiros.map(k => k.Total),
            backgroundColor: '#0ea5e9', borderRadius: 4
        }]
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Monitoreo Operativo (KPI's)</h1>

            {/* BARRA DE FILTROS Y EXPORTACIÓN */}
            <div className="bg-white p-4 rounded-lg shadow mb-8 flex flex-wrap gap-4 items-end border border-gray-200 justify-between">

                {/* PARTE IZQUIERDA: LOS FILTROS */}
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Piso</label>
                        <select className="border p-2 rounded w-40 bg-gray-50 text-sm" value={filterFloor} onChange={(e) => setFilterFloor(e.target.value)}>
                            <option value="all">Todos</option>
                            <option value="1">Planta Baja</option>
                            <option value="2">Piso 2</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Inicio</label>
                        <input type="date" className="border p-2 rounded bg-gray-50 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Fin</label>
                        <input type="date" className="border p-2 rounded bg-gray-50 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <button onClick={cargarDatos} className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-bold shadow hover:bg-blue-700 h-10">🔍 Filtrar</button>
                </div>

                {/* PARTE DERECHA: BOTONES DE EXPORTACIÓN */}
                <div className="flex gap-2">
                    {/* Reporte General (Solicitudes) */}
                    <a
                        href={`${API_URL}/api/report/locals`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-bold shadow transition-colors flex items-center gap-2 h-10"
                        title="Detalle de Solicitudes"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Solicitudes
                    </a>

                    {/* Reporte Operativo (ETL) */}
                    <a
                        href={`${API_URL}/api/report/operational`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-bold shadow transition-colors flex items-center gap-2 h-10"
                        title="Formato para PowerBI/Excel"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Reporte Operativo (ETL)
                    </a>
                </div>
            </div>

            {/* GRILLA DE GRÁFICAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-700 mb-4">1. Ocupación Actual</h3>
                    <div className="h-64 flex justify-center"><Doughnut data={dataLocales} options={{ maintainAspectRatio: false }} /></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-700 mb-4">2. Solicitudes de Renta</h3>
                    <div className="h-64"><Bar data={dataRequests} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-700 mb-4">3. Demanda por Piso</h3>
                    <div className="h-64 flex justify-center"><PolarArea data={dataFloors} options={{ maintainAspectRatio: false }} /></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-700 mb-4">4. Top Giros Solicitados</h3>
                    <div className="h-64"><Bar data={dataGiros} options={{ indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
                </div>
            </div>

            {/* SECCIÓN: HISTORIAL RECIENTE */}
            <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden mb-10">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-700">🕒 Historial Reciente (Últimas 20)</h3>
                    <button onClick={() => window.location.reload()} className="text-sm text-blue-600 hover:underline">Actualizar</button>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-gray-500 border-b">
                        <tr>
                            <th className="p-3 font-medium">Fecha</th>
                            <th className="p-3 font-medium">Cliente</th>
                            <th className="p-3 font-medium">Local</th>
                            <th className="p-3 font-medium">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {recentHistory.map((item) => (
                            <tr key={item.RequestId} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 text-gray-500">
                                    {new Date(item.CreatedAt).toLocaleDateString()} <span className="text-xs text-gray-400">{new Date(item.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </td>
                                <td className="p-3 font-medium text-gray-800">{item.FullName}</td>
                                <td className="p-3">
                                    <span className="font-mono text-blue-600 bg-blue-50 px-1 rounded">{item.Code}</span>
                                    <span className="text-gray-500 ml-2 text-xs hidden sm:inline">{item.LocalName}</span>
                                </td>
                                <td className="p-3">
                                    <StatusBadge status={item.Status} />
                                </td>
                            </tr>
                        ))}
                        {recentHistory.length === 0 && (
                            <tr><td colSpan={4} className="p-6 text-center text-gray-400">No hay actividad reciente.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
}

// --- VISTA 2: GESTIÓN DE SOLICITUDES ---
function RequestsView() {
    const [requests, setRequests] = useState<Request[]>([]);

    const cargar = () => {
        fetch(`${API_URL}/api/admin/requests`)
            .then(res => res.json()).then(setRequests)
            .catch(console.error);
    };

    useEffect(() => { cargar(); }, []);

    const accion = async (id: number, action: 'approve' | 'reject') => {
        if (!confirm(`¿Estás seguro de que deseas ${action === 'approve' ? 'APROBAR' : 'RECHAZAR'} esta solicitud?`)) return;

        try {
            const res = await fetch(`${API_URL}/api/admin/requests/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                cargar();
            }
        } catch (error) {
            alert("Error de conexión");
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestionar Solicitudes</h1>
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-800 text-white">
                        <tr>
                            <th className="p-3">Local</th>
                            <th className="p-3">Solicitante</th>
                            <th className="p-3">Plan / Giro</th>
                            <th className="p-3">Estado</th>
                            <th className="p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((req) => (
                            <tr key={req.RequestId} className="border-b hover:bg-gray-50">
                                <td className="p-3">
                                    <p className="font-bold text-blue-900">{req.LocalCode}</p>
                                    <p className="text-xs text-gray-500">{req.LocalName}</p>
                                </td>
                                <td className="p-3">
                                    <p className="font-bold">{req.FullName}</p>
                                    <p className="text-sm text-gray-500">{req.Email}</p>
                                    <p className="text-xs text-gray-400">{new Date(req.CreatedAt).toLocaleDateString()}</p>
                                </td>
                                <td className="p-3">
                                    <p className="font-semibold">{req.GiroSolicitado}</p>
                                    <p className="text-xs text-gray-500 italic">"{req.PlanNegocio}"</p>
                                </td>
                                <td className="p-3">
                                    <StatusBadge status={req.Status} />
                                </td>
                                <td className="p-3">
                                    {req.Status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button onClick={() => accion(req.RequestId, 'approve')}
                                                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm font-bold" title="Aprobar">
                                                ✓
                                            </button>
                                            <button onClick={() => accion(req.RequestId, 'reject')}
                                                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm font-bold" title="Rechazar">
                                                ✕
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {requests.length === 0 && <p className="p-4 text-center text-gray-500">No hay solicitudes.</p>}
            </div>
        </div>
    );
}

// --- VISTA 3: GESTIÓN DE LOCALES ---
function LocalsView() {
    const [locals, setLocals] = useState<Local[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ price: 0, status: '' });

    const cargar = () => {
        fetch(`${API_URL}/api/admin/locals`)
            .then(res => res.json()).then(setLocals)
            .catch(console.error);
    };

    useEffect(() => { cargar(); }, []);

    const startEdit = (l: Local) => {
        setEditingId(l.LocalId);
        setEditForm({ price: l.MonthlyPrice, status: l.Status });
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            await fetch(`${API_URL}/api/admin/locals/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            setEditingId(null);
            cargar();
        } catch (e) { alert("Error al guardar"); }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Inventario de Locales</h1>
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-800 text-white">
                        <tr>
                            <th className="p-3">Código</th>
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Precio</th>
                            <th className="p-3">Estado</th>
                            <th className="p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {locals.map(l => (
                            <tr key={l.LocalId} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-mono text-gray-500">{l.Code}</td>
                                <td className="p-3 font-bold">{l.Name}</td>

                                {editingId === l.LocalId ? (
                                    // MODO EDICIÓN
                                    <>
                                        <td className="p-3">
                                            <input type="number" className="border p-1 w-24 rounded"
                                                value={editForm.price}
                                                onChange={e => setEditForm({ ...editForm, price: Number(e.target.value) })}
                                            />
                                        </td>
                                        <td className="p-3">
                                            <select className="border p-1 rounded"
                                                value={editForm.status}
                                                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                            >
                                                <option value="disponible">Disponible</option>
                                                <option value="negociacion">Negociación</option>
                                                <option value="ocupado">Ocupado</option>
                                            </select>
                                        </td>
                                        <td className="p-3 flex gap-2">
                                            <button onClick={saveEdit} className="bg-green-600 text-white px-2 py-1 rounded text-sm">Guardar</button>
                                            <button onClick={() => setEditingId(null)} className="bg-gray-400 text-white px-2 py-1 rounded text-sm">Cancelar</button>
                                        </td>
                                    </>
                                ) : (
                                    // MODO LECTURA
                                    <>
                                        <td className="p-3 text-green-700 font-bold">${l.MonthlyPrice}</td>
                                        <td className="p-3"><StatusBadge status={l.Status} /></td>
                                        <td className="p-3">
                                            <button onClick={() => startEdit(l)} className="text-blue-600 hover:underline text-sm font-medium">Editar</button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- VISTA 4: GESTIÓN DE CLIENTES ---
function UsersView() {
    const [users, setUsers] = useState<User[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ fullName: '', email: '', role: '' });

    const cargar = () => {
        fetch(`${API_URL}/api/admin/users`)
            .then(res => res.json()).then(setUsers)
            .catch(console.error);
    };

    useEffect(() => { cargar(); }, []);

    const startEdit = (u: User) => {
        setEditingId(u.UserId);
        setEditForm({ fullName: u.FullName, email: u.Email, role: u.Role });
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/users/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            const data = await res.json();
            if (data.success) {
                setEditingId(null);
                cargar();
            }
        } catch (e) { alert("Error de conexión"); }
    };

    const deleteUser = async (id: number) => {
        if (!confirm("⚠️ ¿ESTÁS SEGURO?\nSe borrarán todas sus solicitudes e historial.")) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/users/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) { alert("Usuario eliminado."); cargar(); }
        } catch (e) { alert("Error al eliminar"); }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Cartera de Clientes</h1>
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-800 text-white">
                        <tr>
                            <th className="p-3">ID</th>
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Rol</th>
                            <th className="p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.UserId} className="border-b hover:bg-gray-50">
                                <td className="p-3 text-gray-500">{u.UserId}</td>

                                {editingId === u.UserId ? (
                                    // MODO EDICIÓN
                                    <>
                                        <td className="p-3"><input value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} className="border p-1 w-full rounded" /></td>
                                        <td className="p-3"><input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="border p-1 w-full rounded" /></td>
                                        <td className="p-3">
                                            <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className="border p-1 rounded">
                                                <option value="client">Cliente</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className="p-3 flex gap-2">
                                            <button onClick={saveEdit} className="bg-green-600 text-white px-2 py-1 rounded text-sm">Guardar</button>
                                            <button onClick={() => setEditingId(null)} className="bg-gray-400 text-white px-2 py-1 rounded text-sm">Cancelar</button>
                                        </td>
                                    </>
                                ) : (
                                    // MODO LECTURA
                                    <>
                                        <td className="p-3 font-bold">{u.FullName}</td>
                                        <td className="p-3 text-gray-600">{u.Email}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.Role === 'admin' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                {u.Role}
                                            </span>
                                        </td>
                                        <td className="p-3 flex gap-2">
                                            <button onClick={() => startEdit(u)} className="text-blue-600 hover:text-blue-800 font-medium text-sm">✏️ Editar</button>
                                            <button onClick={() => deleteUser(u.UserId)} className="text-red-600 hover:text-red-800 font-medium text-sm ml-2">🗑️ Eliminar</button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- COMPONENTES AUXILIARES ---

// Botón del Menú Lateral
const MenuButton = ({ label, active, onClick, icon }: any) => (
    <button
        onClick={onClick}
        className={`w-full text-left px-4 py-3 rounded flex items-center gap-3 transition-colors
      ${active ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
    >
        <span>{icon}</span><span className="font-medium">{label}</span>
    </button>
);

// Badge de Estado (Colorines)
const StatusBadge = ({ status }: { status: string }) => {
    let color = 'bg-gray-500';
    if (status === 'disponible' || status === 'approved') color = 'bg-green-500';
    if (status === 'ocupado' || status === 'rejected') color = 'bg-red-500';
    if (status.includes('negociacion') || status === 'pending') color = 'bg-yellow-500';

    return <span className={`${color} text-white px-2 py-1 rounded text-xs uppercase font-bold`}>{status}</span>;
};

export default AdminPanel;
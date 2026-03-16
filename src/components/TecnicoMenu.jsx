import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import MaintenanceModal from './MaintenanceModal';
import MaintenanceHistoryModal from './MaintenanceHistoryModal';
import MaintenanceTypeModal from './MaintenanceTypeModal';
import CalendarView from './CalendarView';
import ReportView from './ReportView';
import StatisticsView from './StatisticsView';
import ConsultationMenu from './ConsultationMenu';
import './AdminMenu.css';

export default function TecnicoMenu({ isOnline }) {
    const [activeTab, setActiveTab] = useState('maintenances');
    const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(false);
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const [editingMaintenance, setEditingMaintenance] = useState(null);
    const [editingHistory, setEditingHistory] = useState(null);

    const [maintenances, setMaintenances] = useState([]);
    const [maintenanceHistory, setMaintenanceHistory] = useState([]);
    const [proCourses, setProCourses] = useState([]);
    const [users, setUsers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [simulators, setSimulators] = useState([]);
    const [roles, setRoles] = useState([]);
    const [maintenanceTypes, setMaintenanceTypes] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [maintenanceSearchTerm, setMaintenanceSearchTerm] = useState('');
    const [maintenanceCurrentPage, setMaintenanceCurrentPage] = useState(1);
    const [maintenanceItemsPerPage, setMaintenanceItemsPerPage] = useState(10);
    const [historySearchTerm, setHistorySearchTerm] = useState('');
    const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
    const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10);

    const fetchMaintenances = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/v1/maintenances', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMaintenances(response.data);
        } catch (err) {
            console.error('Error fetching maintenances:', err);
            setError('Error al cargar mantenimientos.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMaintenanceHistory = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/v1/maintenance-history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMaintenanceHistory(response.data);
        } catch (err) {
            console.error('Error fetching maintenance history:', err);
            setError('Error al cargar el historial.');
        } finally {
            setLoading(false);
        }
    }, []);



    const fetchProCourses = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/v1/pro-courses', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProCourses(response.data);
        } catch (err) {
            console.error('Error fetching course programming:', err);
            setError('Error al cargar programaciones académicas.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/v1/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
            fetchCourses();
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Error al cargar usuarios.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCourses = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/v1/courses', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourses(response.data);
            fetchSimulators();
        } catch (err) {
            console.error('Error fetching courses:', err);
            setError('Error al cargar cursos.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSimulators = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/v1/simulators', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSimulators(response.data);
        } catch (err) {
            console.error('Error fetching simulators:', err);
        }
    }, []);

    const fetchRoles = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/v1/roles', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRoles(response.data);
        } catch (err) {
            console.error('Error fetching roles:', err);
        }
    }, []);

    const fetchMaintenanceTypes = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/v1/maintenance-types', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMaintenanceTypes(response.data);
        } catch (err) {
            console.error('Error fetching maintenance types:', err);
        }
    }, []);

    useEffect(() => {
        const fetchMap = {
            dashboard: () => { fetchMaintenances(); fetchSimulators(); fetchMaintenanceTypes(); fetchProCourses(); fetchUsers(); },
            maintenances: fetchMaintenances,
            'calendar-maint': fetchMaintenances,
            'maintenance-history': fetchMaintenanceHistory,
            'calendar-courses': fetchProCourses,
            'reports-courses': () => { fetchCourses(); fetchSimulators(); },
            'reports-maintenances': () => { fetchMaintenances(); fetchSimulators(); fetchMaintenanceTypes(); },
            'reports-users': () => { fetchUsers(); fetchRoles(); fetchCourses(); },
            'reports-simulators': fetchSimulators
        };

        if (fetchMap[activeTab]) {
            fetchMap[activeTab]();
        } else {
            setLoading(false);
        }
    }, [activeTab, fetchMaintenances, fetchMaintenanceHistory, fetchProCourses, fetchUsers, fetchCourses, fetchSimulators, fetchRoles, fetchMaintenanceTypes]);

    const handleMaintenanceSaved = (maintenance, isEdit) => {
        if (isEdit) setMaintenances(prev => prev.map(m => m.id === maintenance.id ? maintenance : m));
        else setMaintenances(prev => [maintenance, ...prev]);
    };

    const handleHistorySaved = (history, isEdit) => {
        if (isEdit) setMaintenanceHistory(prev => prev.map(h => h.id === history.id ? history : h));
        else setMaintenanceHistory(prev => [history, ...prev]);
    };



    const handleDeleteMaintenance = async (id) => {
        if (!window.confirm('¿Desea eliminar este registro?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/v1/maintenances/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setMaintenances(prev => prev.filter(m => m.id !== id));
        } catch (err) { alert('Error al eliminar'); }
    };

    const handleDeleteHistory = async (id) => {
        if (!window.confirm('¿Desea eliminar este registro del historial?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/v1/maintenance-history/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setMaintenanceHistory(prev => prev.filter(h => h.id !== id));
        } catch (err) { alert('Error al eliminar'); }
    };

    const filteredMaintenances = maintenances.filter(m => {
        const search = maintenanceSearchTerm.toLowerCase();
        const simulatorName = (m.simulator?.name || '').toLowerCase();
        const typeName = (m.maintenanceType?.name || '').toLowerCase();
        const description = (m.description || '').toLowerCase();
        return simulatorName.includes(search) || typeName.includes(search) || description.includes(search);
    }).sort((a, b) => (a.simulator?.name || '').localeCompare(b.simulator?.name || ''));

    const totalMaintenancePages = Math.ceil(filteredMaintenances.length / maintenanceItemsPerPage);
    const indexOfLastMaintenance = maintenanceCurrentPage * maintenanceItemsPerPage;
    const indexOfFirstMaintenance = indexOfLastMaintenance - maintenanceItemsPerPage;
    const currentMaintenances = filteredMaintenances.slice(indexOfFirstMaintenance, indexOfLastMaintenance);

    const filteredMaintenanceHistory = maintenanceHistory.filter(h => {
        const search = historySearchTerm.toLowerCase();
        const simulatorName = (h.maintenance?.simulator?.name || '').toLowerCase();
        const observation = (h.observation || '').toLowerCase();
        return simulatorName.includes(search) || observation.includes(search);
    }).sort((a, b) => (a.maintenance?.simulator?.name || '').localeCompare(b.maintenance?.simulator?.name || ''));

    const totalHistoryPages = Math.ceil(filteredMaintenanceHistory.length / historyItemsPerPage);
    const indexOfLastHistory = historyCurrentPage * historyItemsPerPage;
    const indexOfFirstHistory = indexOfLastHistory - historyItemsPerPage;
    const currentHistory = filteredMaintenanceHistory.slice(indexOfFirstHistory, indexOfLastHistory);

    const getCourseColor = (id) => {
        const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1', '#06b6d4', '#f43f5e', '#14b8a6', '#eab308'];
        return colors[id % colors.length];
    };

    const renderMaintenanceTable = () => (
        <div className="table-card">
            <div className="search-container" style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                    type="text"
                    placeholder="Buscar mantenimiento por simulador, tipo o descripción..."
                    value={maintenanceSearchTerm}
                    onChange={(e) => {
                        setMaintenanceSearchTerm(e.target.value);
                        setMaintenanceCurrentPage(1);
                    }}
                    style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        fontSize: '14px',
                        color: '#1e293b'
                    }}
                />
                {maintenanceSearchTerm && (
                    <button onClick={() => setMaintenanceSearchTerm('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                )}
            </div>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Simulador</th>
                        <th>Tipo</th>
                        <th>Fecha</th>
                        <th>Horario</th>
                        <th>Técnico</th>
                        <th>Descripción</th>
                        <th className="text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {loading && maintenances.length === 0 ? (
                        <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                <div className="loading-spinner-small" style={{ marginBottom: '10px' }}></div>
                                Cargando mantenimientos...
                            </td>
                        </tr>
                    ) : (
                        <>
                            {currentMaintenances.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No se encontraron mantenimientos que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            ) : (
                                currentMaintenances.map(m => {
                                    return (
                                        <tr key={m.id}>
                                            <td data-label="Simulador" className="font-medium">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className="course-color-dot" style={{ backgroundColor: getCourseColor(m.simulator?.id || 0) }}></span>
                                                    {m.simulator?.name || '-'}
                                                </div>
                                            </td>
                                            <td data-label="Tipo"><span className="status-badge status-active">{m.maintenanceType?.name || 'N/A'}</span></td>
                                            <td data-label="Fecha">{m.fecIni}</td>
                                            <td data-label="Horario">{m.horaIni} - {m.horaFin}</td>
                                            <td data-label="Técnico">{m.technician ? `${m.technician.firstName} ${m.technician.lastname}` : 'Sin asignar'}</td>
                                            <td data-label="Descripción">{m.description}</td>
                                            <td data-label="Acciones" className="actions-cell">
                                                {isOnline ? (
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button className="btn-icon btn-edit" title="Editar" onClick={() => { setEditingMaintenance(m); setIsMaintenanceModalOpen(true); }}>
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                        </button>
                                                        <button className="btn-icon btn-delete" title="Eliminar" onClick={() => handleDeleteMaintenance(m.id)}>
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="read-only-badge">Sólo lectura</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </>
                    )}
                </tbody>
            </table>

            {/* Pagination Controls */}
            {filteredMaintenances.length > 0 && (
                <div className="pagination-container">
                    <div className="pagination-info">
                        Mostrando {indexOfFirstMaintenance + 1} - {Math.min(indexOfLastMaintenance, filteredMaintenances.length)} de {filteredMaintenances.length}
                    </div>
                    <div className="pagination-actions">
                        <div className="items-per-page">
                            <label>Mostrar:</label>
                            <select
                                value={maintenanceItemsPerPage}
                                onChange={(e) => {
                                    setMaintenanceItemsPerPage(Number(e.target.value));
                                    setMaintenanceCurrentPage(1);
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <div className="pagination-buttons">
                            <button
                                className="btn-pagination"
                                disabled={maintenanceCurrentPage === 1}
                                onClick={() => setMaintenanceCurrentPage(prev => prev - 1)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                            <span className="current-page">Página {maintenanceCurrentPage} de {totalMaintenancePages || 1}</span>
                            <button
                                className="btn-pagination"
                                disabled={maintenanceCurrentPage >= totalMaintenancePages}
                                onClick={() => setMaintenanceCurrentPage(prev => prev + 1)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderHistoryTable = () => (
        <div className="table-card">
            <div className="search-container" style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                    type="text"
                    placeholder="Buscar en el historial por simulador u observación..."
                    value={historySearchTerm}
                    onChange={(e) => {
                        setHistorySearchTerm(e.target.value);
                        setHistoryCurrentPage(1);
                    }}
                    style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        fontSize: '14px',
                        color: '#1e293b'
                    }}
                />
                {historySearchTerm && (
                    <button onClick={() => setHistorySearchTerm('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                )}
            </div>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Fecha Cambio</th>
                        <th>Simulador</th>
                        <th>Tipo</th>
                        <th>Técnico</th>
                        <th>Observación</th>
                        <th className="text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {loading && maintenanceHistory.length === 0 ? (
                        <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                                <div className="loading-spinner-small" style={{ marginBottom: '10px' }}></div>
                                Cargando historial...
                            </td>
                        </tr>
                    ) : (
                        <>
                            {currentHistory.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No se encontraron registros en el historial que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            ) : (
                                currentHistory.map(h => {
                                    return (
                                        <tr key={h.id}>
                                            <td data-label="Fecha">{new Date(h.changeDate).toLocaleString()}</td>
                                            <td data-label="Simulador" className="font-medium">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className="course-color-dot" style={{ backgroundColor: getCourseColor(h.maintenance?.simulator?.id || 0) }}></span>
                                                    {h.maintenance?.simulator?.name || '-'}
                                                </div>
                                            </td>
                                            <td data-label="Tipo">
                                                <span className="status-badge status-active">
                                                    {h.maintenance?.maintenanceType?.name || 'Mantenimiento'}
                                                </span>
                                            </td>
                                            <td data-label="Técnico">{h.maintenance?.technician ? `${h.maintenance.technician.firstName} ${h.maintenance.technician.lastname}` : 'Sin asignar'}</td>
                                            <td data-label="Observación">{h.observation}</td>
                                            <td data-label="Acciones" className="actions-cell">
                                                {isOnline ? (
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button className="btn-icon btn-edit" title="Editar" onClick={() => { setEditingHistory(h); setIsHistoryModalOpen(true); }}>
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                        </button>
                                                        <button className="btn-icon btn-delete" title="Eliminar" onClick={() => handleDeleteHistory(h.id)}>
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="read-only-badge">Sólo lectura</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </>
                    )}
                </tbody>
            </table>

            {/* Pagination Controls */}
            {filteredMaintenanceHistory.length > 0 && (
                <div className="pagination-container">
                    <div className="pagination-info">
                        Mostrando {indexOfFirstHistory + 1} - {Math.min(indexOfLastHistory, filteredMaintenanceHistory.length)} de {filteredMaintenanceHistory.length}
                    </div>
                    <div className="pagination-actions">
                        <div className="items-per-page">
                            <label>Mostrar:</label>
                            <select
                                value={historyItemsPerPage}
                                onChange={(e) => {
                                    setHistoryItemsPerPage(Number(e.target.value));
                                    setHistoryCurrentPage(1);
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <div className="pagination-buttons">
                            <button
                                className="btn-pagination"
                                disabled={historyCurrentPage === 1}
                                onClick={() => setHistoryCurrentPage(prev => prev - 1)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                            <span className="current-page">Página {historyCurrentPage} de {totalHistoryPages || 1}</span>
                            <button
                                className="btn-pagination"
                                disabled={historyCurrentPage >= totalHistoryPages}
                                onClick={() => setHistoryCurrentPage(prev => prev + 1)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );



    return (
        <div className="admin-container">
            <div className="admin-sidebar">
                <h2 className="admin-title">Panel Coordinador Técnico</h2>
                <ul className="admin-nav">
                    <li className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>📈 Estadísticas</li>
                    <li className={`admin-nav-item ${activeTab === 'maintenances' ? 'active' : ''}`} onClick={() => setActiveTab('maintenances')}>Mantenimientos</li>
                    <li className={`admin-nav-item ${activeTab === 'maintenance-history' ? 'active' : ''}`} onClick={() => setActiveTab('maintenance-history')}>Historial</li>
                    <li className={`admin-nav-item ${activeTab === 'calendar-maint' ? 'active' : ''}`} onClick={() => setActiveTab('calendar-maint')}>Calendario Mantenimientos</li>
                    <li className={`admin-nav-item ${activeTab === 'calendar-courses' ? 'active' : ''}`} onClick={() => setActiveTab('calendar-courses')}>Calendario Cursos</li>
                    <li className={`admin-nav-item ${activeTab === 'consultations' ? 'active' : ''}`} onClick={() => setActiveTab('consultations')}>🔍 Consultas y Reportes</li>

                </ul>
            </div>

            <div className="admin-content">
                <div className="admin-header">
                    <h2>
                        {activeTab === 'dashboard' ? 'Panel de Estadísticas y Control Técnico' :
                            activeTab === 'maintenances' ? 'Gestión de Mantenimientos' :
                                activeTab === 'maintenance-history' ? 'Historial Técnico' :
                                    activeTab === 'calendar-maint' ? 'Calendario de Mantenimientos' :
                                        activeTab === 'consultations' ? 'Consultas y Reportes' :
                                            'Calendario de Cursos'}
                    </h2>
                    <div className="admin-header-actions">
                        {isOnline && activeTab !== 'calendar-maint' && activeTab !== 'calendar-courses' && activeTab !== 'consultations' && !activeTab.startsWith('reports-') && (
                            <button className="btn-primary" onClick={() => {
                                if (activeTab === 'maintenances') { setEditingMaintenance(null); setIsMaintenanceModalOpen(true); }
                                else if (activeTab === 'maintenance-history') { setEditingHistory(null); setIsHistoryModalOpen(true); }
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                {activeTab === 'maintenances' ? 'Nuevo Mantenimiento' : 'Nuevo Registro'}
                            </button>
                        )}
                    </div>
                </div>

                {error && <div className="error-state" style={{ marginBottom: '20px' }}>{error}</div>}

                {activeTab === 'dashboard' ? (
                    <StatisticsView users={users} courses={courses} proCourses={proCourses} maintenances={maintenances} simulators={simulators} />
                ) : activeTab === 'maintenances' ? (
                    renderMaintenanceTable()
                ) : activeTab === 'maintenance-history' ? (
                    renderHistoryTable()
                ) : activeTab === 'calendar-maint' ? (
                    loading && maintenances.length === 0 ? <div className="loading-state">Cargando calendario...</div> : <CalendarView events={maintenances} type="maint" />
                ) : activeTab === 'consultations' ? (
                    <ConsultationMenu />
                ) : (
                    loading && proCourses.length === 0 ? <div className="loading-state">Cargando calendario...</div> : <CalendarView events={proCourses} type="course" />
                )}
            </div>

            <MaintenanceModal
                isOpen={isMaintenanceModalOpen}
                onClose={() => { setIsMaintenanceModalOpen(false); setEditingMaintenance(null); }}
                onSuccess={handleMaintenanceSaved}
                editMaintenance={editingMaintenance}
                isOnline={isOnline}
            />
            <MaintenanceHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => { setIsHistoryModalOpen(false); setEditingHistory(null); }}
                onSuccess={handleHistorySaved}
                editHistory={editingHistory}
                isOnline={isOnline}
            />
        </div>
    );
}

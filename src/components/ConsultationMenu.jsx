import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import ReportView from './ReportView';
import './AdminMenu.css';

export default function ConsultationMenu() {
    const [activeSubTab, setActiveSubTab] = useState('students-course');
    const [users, setUsers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [proCourses, setProCourses] = useState([]);
    const [maintenances, setMaintenances] = useState([]);
    const [simulators, setSimulators] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSimulatorId, setSelectedSimulatorId] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [isAuthorized, setIsAuthorized] = useState(true);

    const userRole = localStorage.getItem('role');
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        // Now all roles have access, but content will be filtered
        const authorizedRoles = [
            'ADMINISTRADOR', 'COORDINADOR ACADÉMICO', 'COORACAD',
            'COORDINADOR TÉCNICO', 'TECNICO', 'TÉCNICO MANTENIMIENTO',
            'INSTRUCTOR', 'PSEUDOPILOTO', 'ESTUDIANTE'
        ];
        if (!authorizedRoles.includes(userRole)) {
            setIsAuthorized(false);
            setLoading(false);
        }
    }, [userRole]);

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const authHeader = { headers: { Authorization: `Bearer ${token}` } };

        setLoading(true);
        setError(null);
        try {
            // Fetch multiple resources, handling potential 403s for certain roles
            const [usersRes, coursesRes, simsRes, rolesRes, proCoursesRes, maintRes, userCoursesRes] = await Promise.all([
                axios.get('/api/v1/users', authHeader).catch(err => {
                    console.warn('Access to users restricted:', err.message);
                    return { data: [] };
                }),
                axios.get('/api/v1/courses', authHeader).catch(err => {
                    console.warn('Access to courses restricted:', err.message);
                    return { data: [] };
                }),
                axios.get('/api/v1/simulators', authHeader).catch(err => {
                    console.warn('Access to simulators restricted:', err.message);
                    return { data: [] };
                }),
                axios.get('/api/v1/roles', authHeader).catch(err => {
                    console.warn('Access to roles restricted:', err.message);
                    return { data: [] };
                }),
                axios.get('/api/v1/pro-courses', authHeader).catch(err => {
                    console.warn('Access to pro-courses restricted:', err.message);
                    return { data: [] };
                }),
                axios.get('/api/v1/maintenances', authHeader).catch(err => {
                    console.warn('Access to maintenances restricted:', err.message);
                    return { data: [] };
                }),
                // Specifically fetch user's courses for roles like ESTUDIANTE/INSTRUCTOR
                (!['ADMINISTRADOR', 'COORDINADOR ACADÉMICO', 'COORACAD'].includes(userRole) && userId)
                    ? axios.get(`/api/v1/users/${userId}/courses`, authHeader).catch(() => ({ data: [] }))
                    : Promise.resolve({ data: [] })
            ]);

            let finalCourses = coursesRes.data || [];
            let userSpecificCourses = userCoursesRes.data || [];
            if (!Array.isArray(userSpecificCourses)) userSpecificCourses = [userSpecificCourses];

            // Merge and track which courses we already know are authorized
            const authorizedIds = new Set();

            // 1. Process global courses (for Admins/Coordinators)
            finalCourses.forEach(c => authorizedIds.add(c.id));

            // 2. Add user specific courses (already authorized)
            userSpecificCourses.forEach(c => {
                if (c && c.id) {
                    authorizedIds.add(c.id);
                    if (!finalCourses.find(fc => fc.id === c.id)) {
                        finalCourses.push(c);
                    }
                }
            });

            let finalUsers = usersRes.data || [];
            let finalProCourses = proCoursesRes.data || [];
            let finalMaintenances = maintRes.data || [];

            const isFullAuth = [
                'ADMINISTRADOR', 'COORDINADOR ACADÉMICO', 'COORACAD',
                'COORDINADOR TÉCNICO', 'COORDINADOR', 'ADMIN'
            ].includes(userRole?.toUpperCase());

            if (!isFullAuth && userId) {
                const uid = parseInt(userId);

                // 1. Filter the courses list to only those the user is authorized for
                finalCourses = finalCourses.filter(c => authorizedIds.has(c.id));

                // 2. Filter pro-courses (sessions)
                // They are authorized if:
                // a) The user is the instructor of the session
                // b) The user is the pseudoPilot of the session
                // c) The session belongs to a course the user is enrolled in (authorizedIds)
                finalProCourses = finalProCourses.filter(pc =>
                    (pc.instructor?.id === uid) ||
                    (pc.pseudoPilot?.id === uid) ||
                    (pc.course?.id && authorizedIds.has(pc.course.id))
                );

                // 3. Filter maintenances (for technicians work)
                finalMaintenances = finalMaintenances.filter(m => m.technician?.id === uid);

                // 4. Non-admins should only see themselves in the users list to protect privacy
                finalUsers = finalUsers.filter(u => u.id === uid);
            }

            // Filter courses to only show those that have at least one real assignment
            // (either users assigned, main roles defined, or scheduled sessions)
            const assignedCourses = finalCourses.filter(c => {
                const hasUsers = (c.users && c.users.length > 0);
                const hasMainRoles = c.coordinator || c.instructor || c.pseudoPilot;
                const hasSessions = finalProCourses.some(pc => pc.course?.id === c.id);
                return hasUsers || hasMainRoles || hasSessions;
            });

            setUsers(finalUsers);
            setCourses(assignedCourses);
            setProCourses(finalProCourses);
            setMaintenances(finalMaintenances);
            setSimulators(simsRes.data || []);
            setRoles(rolesRes.data || []);
        } catch (err) {
            console.error('Error fetching consultation data:', err);
            setError('No se pudieron cargar los datos de consulta.');
        } finally {
            setLoading(false);
        }
    }, [userRole, userId]);

    useEffect(() => {
        if (isAuthorized) {
            fetchData();
        }
    }, [isAuthorized, fetchData]);

    // Memoized filtered data to prevent unnecessary calculations and flickering
    const filteredStudents = useMemo(() => {
        if (!selectedCourseId) return [];

        // Robust filtering: Check global users list and their assigned courses
        let filtered = users.filter(u => {
            const hasCourse = u.courses?.some(c => String(c.id) === String(selectedCourseId));
            const isStudent = u.role?.name?.toUpperCase().includes('ESTUDIANTE');
            return hasCourse && isStudent;
        });

        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            filtered = filtered.filter(u =>
                `${u.firstName} ${u.lastname}`.toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q) ||
                (u.documentNumber || '').includes(q)
            );
        }
        return filtered;
    }, [selectedCourseId, users, searchTerm]);

    const filteredPseudos = useMemo(() => {
        if (!selectedCourseId) return [];

        // Robust filtering: Check global users list for Pseudo pilots
        let filtered = users.filter(u => {
            const hasCourse = u.courses?.some(c => String(c.id) === String(selectedCourseId));
            const isPseudo = u.role?.name?.toUpperCase().includes('PSEUDO');
            return hasCourse && isPseudo;
        });

        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            filtered = filtered.filter(u =>
                `${u.firstName} ${u.lastname}`.toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q) ||
                (u.documentNumber || '').includes(q)
            );
        }
        return filtered;
    }, [selectedCourseId, users, searchTerm]);

    const filteredRolesCourses = useMemo(() => {
        return courses.filter(c => {
            const q = searchTerm.toLowerCase();
            const matchesSearch = c.name.toLowerCase().includes(q) ||
                (c.simulator?.name || '').toLowerCase().includes(q);
            const matchesSim = !selectedSimulatorId || String(c.simulator?.id) === String(selectedSimulatorId);
            return matchesSearch && matchesSim;
        });
    }, [courses, searchTerm, selectedSimulatorId]);

    if (!isAuthorized) {
        return (
            <div className="error-state" style={{ padding: '50px', textAlign: 'center' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{ marginBottom: '20px' }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <h3>Acceso Restringido</h3>
                <p>No tiene permisos suficientes para acceder a este menú de consultas y reportes.</p>
            </div>
        );
    }

    const renderPagination = (totalItems) => {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) return null;

        return (
            <div className="pagination-container" style={{ padding: '15px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="pagination-info" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                    Mostrando <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, totalItems)}</strong> de {totalItems}
                </div>
                <div className="pagination-buttons" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        className="btn-pagination"
                        style={{ background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                    >
                        Anterior
                    </button>
                    <span className="current-page" style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>{currentPage} / {totalPages}</span>
                    <button
                        className="btn-pagination"
                        style={{ background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        );
    };

    const renderSearchBar = (placeholder) => (
        <div className="search-container" style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '15px', background: 'var(--bg-surface)' }}>
            <div style={{ flex: 1, position: 'relative' }}>
                <input
                    type="text"
                    placeholder={placeholder || "Buscar..."}
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', outline: 'none' }}
                />
            </div>
        </div>
    );

    const renderStudentsByCourse = () => {
        const pagedData = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

        return (
            <div className="table-card">
                <div style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                    <select
                        value={selectedCourseId}
                        onChange={(e) => { setSelectedCourseId(e.target.value); setCurrentPage(1); setSearchTerm(''); }}
                        className="modal-select"
                        style={{ width: '100%', maxWidth: '400px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                    >
                        <option value="">Seleccione un curso para ver estudiantes...</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                {selectedCourseId && (
                    <>
                        {renderSearchBar("Buscar estudiante...")}
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Nombre Completo</th>
                                    <th>Email</th>
                                    <th>Documento</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedData.length === 0 ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px' }}>No hay resultados.</td></tr>
                                ) : (
                                    pagedData.map(u => (
                                        <tr key={u.id}>
                                            <td className="font-medium">{u.firstName} {u.lastname}</td>
                                            <td>{userRole === 'ESTUDIANTE' ? '**********' : u.email}</td>
                                            <td>{userRole === 'ESTUDIANTE' ? '**********' : (u.documentNumber || '—')}</td>
                                            <td>
                                                <span className={`status-badge ${u.active ? 'status-active' : 'status-inactive'}`}>
                                                    {u.active ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        {renderPagination(filteredStudents.length)}
                    </>
                )}
            </div>
        );
    };

    const renderPseudosByCourse = () => {
        const pagedData = filteredPseudos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

        return (
            <div className="table-card">
                <div style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                    <select
                        value={selectedCourseId}
                        onChange={(e) => { setSelectedCourseId(e.target.value); setCurrentPage(1); setSearchTerm(''); }}
                        className="modal-select"
                        style={{ width: '100%', maxWidth: '400px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                    >
                        <option value="">Seleccione un curso para ver pseudopilotos...</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                {selectedCourseId && (
                    <>
                        {renderSearchBar("Buscar pseudopiloto...")}
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Nombre Completo</th>
                                    <th>Email</th>
                                    <th>Rol Específico</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedData.length === 0 ? (
                                    <tr><td colSpan="3" style={{ textAlign: 'center', padding: '30px' }}>No hay resultados.</td></tr>
                                ) : (
                                    pagedData.map(u => (
                                        <tr key={u.id}>
                                            <td className="font-medium">{u.firstName} {u.lastname}</td>
                                            <td>{u.email}</td>
                                            <td><span className="role-badge role-pseudopiloto">{u.role?.name}</span></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        {renderPagination(filteredPseudos.length)}
                    </>
                )}
            </div>
        );
    };

    const renderAllRolesIntervening = () => {
        const pagedCourses = filteredRolesCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

        return (
            <div className="table-card">
                <div className="search-container" style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '15px', background: 'var(--bg-surface)' }}>
                    <div style={{ flex: 1 }}>
                        <input
                            type="text"
                            placeholder="Filtrar cursos..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                        />
                    </div>
                </div>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Curso / Simulador</th>
                            <th>Coordinador</th>
                            <th>Instructor</th>
                            <th>Pseudopiloto</th>
                            <th>Estudiantes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pagedCourses.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>Sin resultados.</td></tr>
                        ) : (
                            pagedCourses.map(c => {
                                const students = (c.users || []).filter(u => u.role?.name?.toUpperCase().includes('ESTUDIANTE'));
                                return (
                                    <tr key={c.id}>
                                        <td className="font-medium">
                                            {c.name}
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>✈️ {c.simulator?.name || 'N/A'}</div>
                                        </td>
                                        <td>{(() => {
                                            const coord = c.coordinator || (c.users || []).find(u => {
                                                const r = (u.role?.name || '').toUpperCase();
                                                return r.includes('COORDINADOR') || r === 'COORACAD' || r === 'ADMINISTRADOR';
                                            });
                                            return coord ? `${coord.firstName} ${coord.lastname}` : '—';
                                        })()}</td>
                                        <td>{(() => {
                                            const instr = c.instructor || (c.users || []).find(u => (u.role?.name || '').toUpperCase().includes('INSTRUCTOR'));
                                            return instr ? `${instr.firstName} ${instr.lastname}` : '—';
                                        })()}</td>
                                        <td>{(() => {
                                            const pseudo = c.pseudoPilot || (c.users || []).find(u => (u.role?.name || '').toUpperCase().includes('PSEUDO'));
                                            return pseudo ? `${pseudo.firstName} ${pseudo.lastname}` : '—';
                                        })()}</td>
                                        <td><span className="status-badge" style={{ background: 'var(--primary-color)', opacity: 0.8, color: '#fff' }}>{students.length}</span></td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
                {renderPagination(filteredRolesCourses.length)}
            </div>
        );
    };

    const availableTabs = [
        { id: 'students-course', label: '👨‍🎓 Estudiantes', roles: ['ADMINISTRADOR', 'COORDINADOR ACADÉMICO', 'COORACAD'] },
        { id: 'pseudos-course', label: '🎮 Pseudopilotos', roles: ['ADMINISTRADOR', 'COORDINADOR ACADÉMICO', 'COORACAD'] },
        { id: 'all-roles', label: '👥 Roles de Curso', roles: ['ADMINISTRADOR', 'COORDINADOR ACADÉMICO', 'COORACAD'] },
        { id: 'simulators-status', label: '✈️ Simuladores', roles: ['ADMINISTRADOR', 'COORDINADOR TÉCNICO', 'TECNICO'] },
        {
            id: 'reports', label:
                userRole === 'ESTUDIANTE' || userRole === 'INSTRUCTOR' || userRole === 'PSEUDOPILOTO' ? '📄 Mi Horario PDF' :
                    userRole.includes('TECNICO') || userRole.includes('MANTENIMIENTO') ? '📄 Mis Mantenimientos' : '📄 Informes',
            roles: ['ADMINISTRADOR', 'COORDINADOR ACADÉMICO', 'COORACAD', 'COORDINADOR TÉCNICO', 'TECNICO', 'TÉCNICO MANTENIMIENTO', 'INSTRUCTOR', 'PSEUDOPILOTO', 'ESTUDIANTE']
        }
    ].filter(tab => tab.roles.includes(userRole));

    // Update active tab if current one is not allowed for this role
    useEffect(() => {
        if (availableTabs.length > 0 && !availableTabs.find(t => t.id === activeSubTab)) {
            setActiveSubTab(availableTabs[0].id);
        }
    }, [userRole, availableTabs, activeSubTab]);

    return (
        <div className="consultation-menu">
            <div className="admin-subnav" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
                {availableTabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`btn-subtab ${activeSubTab === tab.id ? 'active' : ''}`}
                        onClick={() => {
                            setActiveSubTab(tab.id);
                            setSelectedCourseId('');
                            setSearchTerm('');
                            setSelectedSimulatorId('');
                            setCurrentPage(1);
                        }}
                        style={{
                            padding: '12px 20px',
                            border: 'none',
                            background: 'none',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            borderBottom: activeSubTab === tab.id ? '3px solid var(--primary-color)' : '3px solid transparent',
                            color: activeSubTab === tab.id ? 'var(--primary-color)' : 'var(--text-muted)',
                            fontWeight: activeSubTab === tab.id ? '700' : '400'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '10px', color: 'var(--text-muted)' }}>Sincronizando datos...</p>
                </div>
            ) : error ? (
                <div className="error-alert">{error}</div>
            ) : (
                <div className="consultation-content">
                    {activeSubTab === 'students-course' && renderStudentsByCourse()}
                    {activeSubTab === 'pseudos-course' && renderPseudosByCourse()}
                    {activeSubTab === 'all-roles' && renderAllRolesIntervening()}
                    {activeSubTab === 'simulators-status' && (
                        <div className="table-card">
                            <div className="search-container" style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                                <select
                                    value={selectedSimulatorId}
                                    onChange={(e) => setSelectedSimulatorId(e.target.value)}
                                    className="modal-select"
                                    style={{ width: '100%', maxWidth: '400px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                >
                                    <option value="">Todos los simuladores...</option>
                                    {simulators.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Simulador</th>
                                        <th>Descripción</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {simulators
                                        .filter(s => !selectedSimulatorId || String(s.id) === String(selectedSimulatorId))
                                        .map(s => (
                                            <tr key={s.id}>
                                                <td className="font-medium">{s.name}</td>
                                                <td>{s.description || '—'}</td>
                                                <td>
                                                    <span className={`status-badge ${s.active ? 'status-active' : 'status-inactive'}`}>
                                                        {s.active ? 'Operativo' : 'En Mantenimiento'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {activeSubTab === 'reports' && (
                        <ReportView
                            type={
                                (userRole.includes('TECNICO') || userRole.includes('MANTENIMIENTO')) ? 'maintenances' :
                                    (['ESTUDIANTE', 'INSTRUCTOR', 'PSEUDOPILOTO'].includes(userRole)) ? 'sessions' : 'users'
                            }
                            data={
                                (userRole.includes('TECNICO') || userRole.includes('MANTENIMIENTO')) ? maintenances :
                                    (['ESTUDIANTE', 'INSTRUCTOR', 'PSEUDOPILOTO'].includes(userRole)) ? proCourses : users
                            }
                            courses={courses}
                            simulators={simulators}
                            roles={roles}
                            maintenanceTypes={[]}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

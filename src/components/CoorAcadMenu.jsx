import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import UserModal from './UserModal';
import CourseModal from './CourseModal';
import ProCourseModal from './ProCourseModal';
import UserCoursesMenu from './UserCoursesMenu';
import CalendarView from './CalendarView';
import ReportView from './ReportView';
import StatisticsView from './StatisticsView';
import ConsultationMenu from './ConsultationMenu';
import './AdminMenu.css';

export default function CoorAcadMenu({ isOnline }) {
    const [activeTab, setActiveTab] = useState('users');
    const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [isProCourseModalOpen, setIsProCourseModalOpen] = useState(false);

    const [editingUser, setEditingUser] = useState(null);
    const [editingCourse, setEditingCourse] = useState(null);
    const [editingProCourse, setEditingProCourse] = useState(null);

    const [users, setUsers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [proCourses, setProCourses] = useState([]);
    const [maintenances, setMaintenances] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [courseSearchTerm, setCourseSearchTerm] = useState('');
    const [proCourseSearchTerm, setProCourseSearchTerm] = useState('');
    const [courseCurrentPage, setCourseCurrentPage] = useState(1);
    const [courseItemsPerPage, setCourseItemsPerPage] = useState(10);
    const [proCourseCurrentPage, setProCourseCurrentPage] = useState(1);
    const [proCourseItemsPerPage, setProCourseItemsPerPage] = useState(10);
    const [simulators, setSimulators] = useState([]);

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
            setError('No se pudieron cargar los usuarios.');
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
            setError('No se pudieron cargar los cursos.');
        } finally {
            setLoading(false);
        }
    }, [fetchSimulators]);

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
            setError('No se pudieron cargar las programaciones.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMaintenances = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/v1/maintenances', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMaintenances(response.data);
            fetchSimulators();
        } catch (err) {
            console.error('Error fetching maintenances:', err);
            setError('No se pudieron cargar los mantenimientos.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchMap = {
            dashboard: () => { fetchUsers(); fetchCourses(); fetchProCourses(); fetchMaintenances(); },
            users: fetchUsers,
            courses: fetchCourses,
            'pro-courses': fetchProCourses,
            calendar: fetchProCourses,
            'reports-users': fetchUsers,
            'reports-courses': fetchCourses,
            'reports-maintenances': fetchMaintenances
        };

        if (fetchMap[activeTab]) {
            fetchMap[activeTab]();
        } else {
            setLoading(false);
        }
    }, [activeTab, fetchUsers, fetchCourses, fetchProCourses, fetchMaintenances]);

    const handleUserSaved = (userData, isEdit) => {
        if (isEdit) {
            setUsers(prev => prev.map(u => u.id === userData.id ? userData : u));
        } else {
            setUsers(prev => [userData, ...prev]);
        }
    };

    const handleCourseSaved = (courseData, isEdit) => {
        if (isEdit) setCourses(prev => prev.map(c => c.id === courseData.id ? courseData : c));
        else setCourses(prev => [courseData, ...prev]);
    };

    const handleProCourseSaved = (proData, isEdit) => {
        if (isEdit) setProCourses(prev => prev.map(p => p.id === proData.id ? proData : p));
        else setProCourses(prev => [proData, ...prev]);
    };

    const handleDeleteUser = async (e, id, email) => {
        e.stopPropagation();
        if (!window.confirm(`¿Está seguro de eliminar al usuario ${email}?`)) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/v1/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (err) {
            alert('Error al eliminar usuario: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteCourse = async (e, id, name) => {
        e.stopPropagation();
        if (!window.confirm(`¿Está seguro de eliminar el curso ${name}?`)) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/v1/courses/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourses(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            alert('Error al eliminar curso: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteProCourse = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm(`¿Está seguro de eliminar esta programación?`)) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/v1/pro-courses/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProCourses(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            alert('Error al eliminar programación: ' + (err.response?.data?.message || err.message));
        }
    };

    const filteredUsers = users.filter(user => {
        const fullName = `${user.firstName} ${user.middleName || ''} ${user.lastname} ${user.secondlasname || ''}`.toLowerCase();
        const email = user.email.toLowerCase();
        const search = userSearchTerm.toLowerCase();
        return fullName.includes(search) || email.includes(search);
    });

    const filteredCourses = courses.filter(course => {
        const search = courseSearchTerm.toLowerCase();
        const name = course.name.toLowerCase();
        const description = (course.description || '').toLowerCase();
        const simulatorName = (course.simulator?.name || '').toLowerCase();
        return name.includes(search) || description.includes(search) || simulatorName.includes(search);
    }).sort((a, b) => a.name.localeCompare(b.name));

    const filteredProCourses = proCourses.filter(pro => {
        const courseName = (pro.course?.name || '').toLowerCase();
        const search = proCourseSearchTerm.toLowerCase();
        return courseName.includes(search);
    }).sort((a, b) => (a.course?.name || '').localeCompare(b.course?.name || ''));

    // Pagination for Courses
    const totalCoursePages = Math.ceil(filteredCourses.length / courseItemsPerPage);
    const indexOfLastCourse = courseCurrentPage * courseItemsPerPage;
    const indexOfFirstCourse = indexOfLastCourse - courseItemsPerPage;
    const currentCourses = filteredCourses.slice(indexOfFirstCourse, indexOfLastCourse);

    // Pagination for ProCourses
    const totalProCoursePages = Math.ceil(filteredProCourses.length / proCourseItemsPerPage);
    const indexOfLastProCourse = proCourseCurrentPage * proCourseItemsPerPage;
    const indexOfFirstProCourse = indexOfLastProCourse - proCourseItemsPerPage;
    const currentProCourses = filteredProCourses.slice(indexOfFirstProCourse, indexOfLastProCourse);

    const getCourseColor = (courseId) => {
        const colors = [
            '#3b82f6', // Blue
            '#10b981', // Green
            '#8b5cf6', // Purple
            '#f59e0b', // Orange
            '#ec4899', // Pink
            '#6366f1', // Indigo
            '#06b6d4', // Cyan
            '#f43f5e', // Rose
            '#14b8a6', // Teal
            '#eab308'  // Yellow
        ];
        return colors[courseId % colors.length];
    };

    const renderUserTable = () => (
        <div className="table-card">
            <div className="search-container" style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                    type="text"
                    placeholder="Buscar usuario por nombre o email..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        fontSize: '14px',
                        color: '#1e293b'
                    }}
                />
                {userSearchTerm && (
                    <button onClick={() => setUserSearchTerm('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                )}
            </div>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre Completo</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th className="text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {loading && users.length === 0 ? (
                        <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                <div className="loading-spinner-small" style={{ marginBottom: '10px' }}></div>
                                Cargando usuarios...
                            </td>
                        </tr>
                    ) : (
                        <>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No se encontraron usuarios.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => {
                                    return (
                                        <tr key={user.id}>
                                            <td data-label="ID">#{user.id}</td>
                                            <td data-label="Nombre Completo" className="font-medium">{`${user.firstName} ${user.lastname}`}</td>
                                            <td data-label="Email">{user.email}</td>
                                            <td data-label="Rol">
                                                <span className={`role-badge role-${user.role?.name?.toLowerCase() || 'unknown'}`}>
                                                    {user.role?.name || 'UNKNOWN'}
                                                </span>
                                            </td>
                                            <td data-label="Estado">
                                                <span className={`status-badge ${user.active ? 'status-active' : 'status-inactive'}`}>
                                                    {user.active ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td data-label="Acciones" className="actions-cell">
                                                {isOnline ? (
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button className="btn-icon btn-edit" title="Editar" onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }}>
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                            </svg>
                                                        </button>
                                                        <button className="btn-icon btn-delete" title="Eliminar" onClick={(e) => handleDeleteUser(e, user.id, user.email)}>
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            </svg>
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
        </div>
    );

    const renderCourseTable = () => (
        <div className="table-card">
            <div className="search-container" style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                    type="text"
                    placeholder="Buscar curso por nombre, descripción o simulador..."
                    value={courseSearchTerm}
                    onChange={(e) => {
                        setCourseSearchTerm(e.target.value);
                        setCourseCurrentPage(1);
                    }}
                    style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        fontSize: '14px',
                        color: '#1e293b'
                    }}
                />
                {courseSearchTerm && (
                    <button onClick={() => { setCourseSearchTerm(''); setCourseCurrentPage(1); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                )}
            </div>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Curso</th>
                        <th>Inicio / Fin</th>
                        <th>Horas</th>
                        <th>Recursos</th>
                        <th>Personal</th>
                        <th className="text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {loading && courses.length === 0 ? (
                        <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                <div className="loading-spinner-small" style={{ marginBottom: '10px' }}></div>
                                Cargando cursos...
                            </td>
                        </tr>
                    ) : (
                        <>
                            {currentCourses.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No se encontraron cursos que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            ) : (
                                currentCourses.map(course => {
                                    return (
                                        <tr key={course.id}>
                                            <td data-label="ID">#{course.id}</td>
                                            <td data-label="Curso" className="font-medium">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className="course-color-dot" style={{ backgroundColor: getCourseColor(course.id) }}></span>
                                                    <div>
                                                        <div>{course.name}</div>
                                                        <small style={{ color: '#64748b' }}>{course.description || '-'}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td data-label="Inicio / Fin">
                                                {course.fecInicio} <br /> {course.fecFin}
                                            </td>
                                            <td data-label="Horas">{course.horas}h</td>
                                            <td data-label="Recursos">
                                                <div className="entity-indicator" title="Simulator">
                                                    ✈️ {course.simulator?.name || 'N/A'}
                                                </div>
                                                <div className="entity-indicator" title="Rooms">
                                                    🏫 {course.rooms?.length || 0} aulas
                                                </div>
                                            </td>
                                            <td data-label="Personal">
                                                <div className="entity-indicator" title="Coordinador">
                                                    👤 Coord: {(() => {
                                                        const directCoord = course.coordinator;
                                                        const coordsFromUsers = users.filter(u => {
                                                            const r = (u.role?.name || '').toUpperCase();
                                                            const isCoord = r.includes('COORDINADOR') || r === 'COORACAD' || r === 'ADMINISTRADOR';
                                                            const isInCourse = (u.courses || []).some(uc => uc.id === course.id);
                                                            return isCoord && isInCourse;
                                                        });
                                                        const allCoords = directCoord ? [directCoord, ...coordsFromUsers.filter(u => u.id !== directCoord.id)] : coordsFromUsers;
                                                        return allCoords.length > 0 ? allCoords.map(u => `${u.firstName} ${u.lastname}`).join(', ') : 'Sin asignar';
                                                    })()}
                                                </div>
                                                <div className="entity-indicator" title="Pseudopiloto">
                                                    👤 Pseudo: {(() => {
                                                        const directPseudo = course.pseudoPilot;
                                                        const pseudosFromUsers = (course.users || []).filter(u => (u.role?.name || '').toUpperCase().includes('PSEUDO'));
                                                        const pseudosFromSessions = proCourses
                                                            .filter(pc => pc.course?.id === course.id && pc.pseudoPilot)
                                                            .map(pc => pc.pseudoPilot);
                                                        const all = [...(directPseudo ? [directPseudo] : []), ...pseudosFromUsers, ...pseudosFromSessions];
                                                        const unique = all.reduce((acc, curr) => {
                                                            if (!acc.find(u => u.id === curr.id)) acc.push(curr);
                                                            return acc;
                                                        }, []);
                                                        return unique.length > 0 ? unique.map(u => `${u.firstName} ${u.lastname}`).join(', ') : 'Sin asignar';
                                                    })()}
                                                </div>
                                                <div className="entity-indicator" title="Instructor">
                                                    👤 Instr: {(() => {
                                                        const directInstr = course.instructor;
                                                        const instrsFromUsers = (course.users || []).filter(u => (u.role?.name || '').toUpperCase().includes('INSTRUCTOR'));
                                                        const instrsFromSessions = proCourses
                                                            .filter(pc => pc.course?.id === course.id && pc.instructor)
                                                            .map(pc => pc.instructor);
                                                        const all = [...(directInstr ? [directInstr] : []), ...instrsFromUsers, ...instrsFromSessions];
                                                        const unique = all.reduce((acc, curr) => {
                                                            if (!acc.find(u => u.id === curr.id)) acc.push(curr);
                                                            return acc;
                                                        }, []);
                                                        return unique.length > 0 ? unique.map(u => `${u.firstName} ${u.lastname}`).join(', ') : 'Sin asignar';
                                                    })()}
                                                </div>
                                            </td>
                                            <td data-label="Acciones" className="actions-cell">
                                                {isOnline ? (
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button className="btn-icon btn-edit" title="Editar" onClick={() => { setEditingCourse(course); setIsCourseModalOpen(true); }}>
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                            </svg>
                                                        </button>
                                                        <button className="btn-icon btn-delete" title="Eliminar" onClick={(e) => handleDeleteCourse(e, course.id, course.name)}>
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            </svg>
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
            {filteredCourses.length > 0 && (
                <div className="pagination-container">
                    <div className="pagination-info">
                        Mostrando {indexOfFirstCourse + 1} - {indexOfLastCourse} de {filteredCourses.length}
                    </div>
                    <div className="pagination-actions">
                        <div className="items-per-page">
                            <label>Mostrar:</label>
                            <select
                                value={courseItemsPerPage}
                                onChange={(e) => {
                                    setCourseItemsPerPage(Number(e.target.value));
                                    setCourseCurrentPage(1);
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
                                disabled={courseCurrentPage === 1}
                                onClick={() => setCourseCurrentPage(prev => prev - 1)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                            <span className="current-page">Página {courseCurrentPage} de {totalCoursePages || 1}</span>
                            <button
                                className="btn-pagination"
                                disabled={courseCurrentPage >= totalCoursePages}
                                onClick={() => setCourseCurrentPage(prev => prev + 1)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderProCourseTable = () => (
        <div className="table-card">
            <div className="search-container" style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                    type="text"
                    placeholder="Buscar programación por curso..."
                    value={proCourseSearchTerm}
                    onChange={(e) => {
                        setProCourseSearchTerm(e.target.value);
                        setProCourseCurrentPage(1);
                    }}
                    style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        fontSize: '0.95rem',
                        color: '#1e293b'
                    }}
                />
                {proCourseSearchTerm && (
                    <button onClick={() => { setProCourseSearchTerm(''); setProCourseCurrentPage(1); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '5px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                )}
            </div>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Curso</th>
                        <th>Fecha</th>
                        <th>Horario</th>
                        <th>Instructor</th>
                        <th>Pseudo</th>
                        <th>Horas</th>
                        <th className="text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {loading && proCourses.length === 0 ? (
                        <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                                <div className="loading-spinner-small" style={{ marginBottom: '10px' }}></div>
                                Cargando programación...
                            </td>
                        </tr>
                    ) : currentProCourses.length === 0 ? (
                        <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                                No se encontraron programaciones que coincidan con la búsqueda o la selección actual.
                            </td>
                        </tr>
                    ) : (
                        currentProCourses.map(pro => (
                            <tr key={pro.id}>
                                <td data-label="ID">#{pro.id}</td>
                                <td data-label="Curso" className="font-medium">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="course-color-dot" style={{ backgroundColor: getCourseColor(pro.course?.id || 0) }}></span>
                                        {pro.course?.name || 'N/A'}
                                    </div>
                                </td>
                                <td data-label="Fecha">{pro.fecha}</td>
                                <td data-label="Horario">{pro.horaini} - {pro.horafin}</td>
                                <td data-label="Instructor">{pro.instructor ? `${pro.instructor.firstName} ${pro.instructor.lastname}` : '—'}</td>
                                <td data-label="Pseudo">{pro.pseudoPilot ? `${pro.pseudoPilot.firstName} ${pro.pseudoPilot.lastname}` : '—'}</td>
                                <td data-label="Horas">{pro.horas}h</td>
                                <td data-label="Acciones" className="actions-cell">
                                    {isOnline && (
                                        <>
                                            <button className="btn-icon btn-edit" title="Editar" onClick={() => { setEditingProCourse(pro); setIsProCourseModalOpen(true); }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            <button className="btn-icon btn-delete" title="Eliminar" onClick={(e) => handleDeleteProCourse(e, pro.id)}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            </button>
                                        </>
                                    )}
                                    {!isOnline && <span className="read-only-badge">Sólo lectura</span>}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Pagination Controls */}
            {filteredProCourses.length > 0 && (
                <div className="pagination-container">
                    <div className="pagination-info">
                        Mostrando {indexOfFirstProCourse + 1} - {Math.min(indexOfLastProCourse, filteredProCourses.length)} de {filteredProCourses.length}
                    </div>
                    <div className="pagination-actions">
                        <div className="items-per-page">
                            <label>Mostrar:</label>
                            <select
                                value={proCourseItemsPerPage}
                                onChange={(e) => {
                                    setProCourseItemsPerPage(Number(e.target.value));
                                    setProCourseCurrentPage(1);
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
                                disabled={proCourseCurrentPage === 1}
                                onClick={() => setProCourseCurrentPage(prev => prev - 1)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                            <span className="current-page">Página {proCourseCurrentPage} de {totalProCoursePages || 1}</span>
                            <button
                                className="btn-pagination"
                                disabled={proCourseCurrentPage >= totalProCoursePages}
                                onClick={() => setProCourseCurrentPage(prev => prev + 1)}
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
                <h2 className="admin-title">Panel Coordinador Académico</h2>
                <ul className="admin-nav">
                    <li className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>📈 Estadísticas</li>
                    <li className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Usuarios</li>
                    <li className={`admin-nav-item ${activeTab === 'user-courses' ? 'active' : ''}`} onClick={() => setActiveTab('user-courses')}>Asignar Cursos</li>
                    <li className={`admin-nav-item ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>Cursos</li>
                    <li className={`admin-nav-item ${activeTab === 'pro-courses' ? 'active' : ''}`} onClick={() => setActiveTab('pro-courses')}>Programación</li>
                    <li className={`admin-nav-item ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>Calendario</li>
                    <li className={`admin-nav-item ${activeTab === 'consultations' ? 'active' : ''}`} onClick={() => setActiveTab('consultations')}>🔍 Consultas y Reportes</li>

                </ul>
            </div>

            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <h1 className="admin-main-title">
                            {activeTab === 'dashboard' ? 'Panel de Estadísticas Académicas' :
                                activeTab === 'users' ? 'Gestión de Usuarios' :
                                    activeTab === 'courses' ? 'Gestión de Cursos' :
                                        activeTab === 'user-courses' ? 'Usuarios — Asignación de Cursos' :
                                            activeTab === 'pro-courses' ? 'Programación de Cursos' :
                                                activeTab === 'calendar' ? 'Calendario Académico' :
                                                    activeTab === 'reports-users' ? 'Reporte de Usuarios' : ''}
                        </h1>
                        <p className="admin-subtitle">Panel de control de recursos académicos</p>
                    </div>
                    {isOnline && activeTab !== 'calendar' && activeTab !== 'user-courses' && activeTab !== 'consultations' && !activeTab.startsWith('reports-') && (
                        <button className="btn-primary" onClick={() => {
                            if (activeTab === 'users') { setEditingUser(null); setIsUserModalOpen(true); }
                            else if (activeTab === 'courses') { setEditingCourse(null); setIsCourseModalOpen(true); }
                            else if (activeTab === 'pro-courses') { setEditingProCourse(null); setIsProCourseModalOpen(true); }
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            {activeTab === 'users' ? 'Nuevo Usuario' : activeTab === 'courses' ? 'Nuevo Curso' : 'Programar Curso'}
                        </button>
                    )}
                </header>

                {error && <div className="error-alert">{error}</div>}

                {activeTab === 'dashboard' ? <StatisticsView users={users} courses={courses} proCourses={proCourses} maintenances={maintenances} simulators={simulators} /> :
                    activeTab === 'users' ? renderUserTable() :
                        activeTab === 'user-courses' ? <UserCoursesMenu /> :
                            activeTab === 'courses' ? renderCourseTable() :
                                activeTab === 'pro-courses' ? renderProCourseTable() :
                                    activeTab === 'consultations' ? <ConsultationMenu /> :
                                        loading && proCourses.length === 0 ? (
                                            <div className="loading-state">Cargando calendario...</div>
                                        ) : (
                                            <CalendarView events={proCourses} type="course" />
                                        )
                }
            </main>

            <UserModal
                isOpen={isUserModalOpen}
                onClose={() => { setIsUserModalOpen(false); setEditingUser(null); }}
                onSuccess={handleUserSaved}
                editUser={editingUser}
                currentUserRole="COORACAD"
                isOnline={isOnline}
            />

            <CourseModal
                isOpen={isCourseModalOpen}
                onClose={() => { setIsCourseModalOpen(false); setEditingCourse(null); }}
                onSuccess={handleCourseSaved}
                editCourse={editingCourse}
                isOnline={isOnline}
            />

            <ProCourseModal
                isOpen={isProCourseModalOpen}
                onClose={() => { setIsProCourseModalOpen(false); setEditingProCourse(null); }}
                onSuccess={handleProCourseSaved}
                editProCourse={editingProCourse}
                isOnline={isOnline}
            />
        </div>
    );
}

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import CalendarView from './CalendarView';
import ConsultationMenu from './ConsultationMenu';
import './AdminMenu.css';

export default function EstudianteMenu({ userId }) {
    const [activeTab, setActiveTab] = useState('my-courses');
    const [courses, setCourses] = useState([]);
    const [proCourses, setProCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const fetchMyCourses = useCallback(async (isSilent = false) => {
        if (!userId) {
            setLoading(false);
            return;
        }
        if (!isSilent) setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/v1/users/${userId}/courses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourses(Array.isArray(response.data) ? response.data : Object.values(response.data));
        } catch (err) {
            console.error('Error fetching courses:', err);
            if (!isSilent) setError('Error al cargar tus cursos.');
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [userId]);

    const fetchProCourses = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/v1/pro-courses', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Filter programming to show only student's courses
            const studentCourseIds = courses.map(c => c.id);
            const filtered = response.data.filter(pc => studentCourseIds.includes(pc.course?.id));

            setProCourses(filtered);
        } catch (err) {
            console.error('Error fetching course programming:', err);
            if (!isSilent) setError('Error al cargar la programación del calendario.');
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [courses]);

    // Initial fetch on tab change
    useEffect(() => {
        if (activeTab === 'my-courses') {
            fetchMyCourses();
        } else if (activeTab === 'calendar') {
            fetchProCourses();
        }
    }, [activeTab]);

    // Polling effect: Refresh data every 30 seconds (or 5s if empty)
    useEffect(() => {
        const intervalTime = courses.length === 0 ? 5000 : 30000;
        const interval = setInterval(() => {
            if (activeTab === 'my-courses') {
                fetchMyCourses(true);
            } else if (activeTab === 'calendar') {
                fetchProCourses(true);
            }
        }, intervalTime);

        return () => clearInterval(interval);
    }, [activeTab, courses.length, fetchMyCourses, fetchProCourses]);

    const renderCoursesTable = () => (
        <div className="table-card">
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nombre del Curso</th>
                        <th>Simulador</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {loading && courses.length === 0 ? (
                        <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                <div className="loading-spinner-small" style={{ marginBottom: '10px' }}></div>
                                Cargando información...
                            </td>
                        </tr>
                    ) : error ? (
                        <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>
                                {error}
                            </td>
                        </tr>
                    ) : courses.length > 0 ? (
                        courses.map(course => (
                            <tr key={course.id}>
                                <td data-label="Código">#{course.id}</td>
                                <td data-label="Nombre" className="font-medium">{course.name}</td>
                                <td data-label="Simulador">{course.simulator?.name || '-'}</td>
                                <td data-label="Estado">
                                    <span className="status-badge status-active">Matriculado</span>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                                No te encuentras matriculado en ningún curso actualmente.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className={`admin-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
            <div className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-mobile-header">
                    <h2 className="admin-title">Menú</h2>
                    <button className="btn-close-sidebar" onClick={() => setIsSidebarOpen(false)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <h2 className="admin-title desktop-only-title">Panel Estudiante</h2>
                <ul className="admin-nav">
                    <li
                        className={`admin-nav-item ${activeTab === 'my-courses' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('my-courses'); setIsSidebarOpen(false); }}
                    >
                        Mis Cursos
                    </li>
                    <li
                        className={`admin-nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('calendar'); setIsSidebarOpen(false); }}
                    >
                        Mi Calendario
                    </li>
                    <li
                        className={`admin-nav-item ${activeTab === 'consultations' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('consultations'); setIsSidebarOpen(false); }}
                    >
                        🔍 Consultas
                    </li>
                </ul>
                <div className="desktop-only-title" style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(110, 142, 251, 0.05)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                        Consulta aquí tus clases programadas y materiales.
                    </p>
                </div>
            </div>

            {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

            <div className="admin-content">
                <div className="admin-header">
                    <div className="admin-header-title-box">
                        <button className="btn-menu-toggle" onClick={() => setIsSidebarOpen(true)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                        </button>
                        <h2>
                            {activeTab === 'my-courses' ? 'Mis Cursos Matriculados' :
                                activeTab === 'calendar' ? 'Mi Calendario Académico' :
                                    'Consultas Académicas'}
                        </h2>
                    </div>
                </div>

                {activeTab === 'my-courses' ? renderCoursesTable() :
                    activeTab === 'calendar' ? (
                        loading && proCourses.length === 0 ? (
                            <div className="loading-state">Cargando calendario...</div>
                        ) : (
                            <CalendarView events={proCourses} type="course" />
                        )
                    ) : (
                        <ConsultationMenu />
                    )}
            </div>
        </div>
    );
}

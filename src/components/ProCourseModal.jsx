import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import DatePicker from './DatePicker';
import './UserModal.css';
import './TimePicker.css';

// ---- TimePicker sub-component (dropdown style) ----
function TimePicker({ value, onChange, label, required }) {
    const [open, setOpen] = useState(false);

    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutes = ['00', '15', '30', '45'];

    const [selH, selM] = value ? value.split(':') : ['', ''];

    const handleSelect = (h, m) => {
        onChange({ target: { value: `${h}:${m}` } });
        setOpen(false);
    };

    return (
        <div className="timepicker-wrapper" style={{ position: 'relative' }}>
            <div
                className={`timepicker-input ${open ? 'open' : ''}`}
                onClick={() => setOpen(o => !o)}
            >
                {value ? (
                    <span className="timepicker-value">{value}</span>
                ) : (
                    <span className="timepicker-placeholder">Seleccionar hora</span>
                )}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
            </div>

            {open && (
                <div className="timepicker-dropdown">
                    <div className="timepicker-cols">
                        <div className="timepicker-col">
                            <div className="timepicker-col-header">Hora</div>
                            <div className="timepicker-col-body">
                                {hours.map(h => (
                                    <div
                                        key={h}
                                        className={`timepicker-option ${selH === h ? 'selected' : ''}`}
                                        onClick={() => handleSelect(h, selM || '00')}
                                    >
                                        {h}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="timepicker-col">
                            <div className="timepicker-col-header">Min</div>
                            <div className="timepicker-col-body">
                                {minutes.map(m => (
                                    <div
                                        key={m}
                                        className={`timepicker-option ${selM === m ? 'selected' : ''}`}
                                        onClick={() => handleSelect(selH || '08', m)}
                                    >
                                        {m}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---- Main modal ----
export default function ProCourseModal({ isOpen, onClose, onSuccess, editProCourse, isOnline = true }) {
    const [courseId, setCourseId] = useState('');
    const [sessions, setSessions] = useState([]); // Array of { id, fecha, horaini, horafin, horas }

    // For the "current" row being edited in the form before adding to list
    const [currentSession, setCurrentSession] = useState({
        fecha: '',
        horaini: '',
        horafin: '',
        horas: ''
    });

    const [courses, setCourses] = useState([]);
    const [allProCourses, setAllProCourses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingCourses, setFetchingCourses] = useState(false);
    const [error, setError] = useState(null);
    const [warnings, setWarnings] = useState([]);
    const [courseSearchQuery, setCourseSearchQuery] = useState('');

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        const fetchData = async () => {
            if (!isOpen) return;
            setFetchingCourses(true);
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const [coursesRes, proCoursesRes] = await Promise.all([
                    axios.get('/api/v1/courses', config),
                    axios.get('/api/v1/pro-courses', config)
                ]);
                setCourses(coursesRes.data);
                setAllProCourses(proCoursesRes.data);
            } catch (err) {
                setError('No se pudieron cargar los cursos.');
            } finally {
                setFetchingCourses(false);
            }
        };
        fetchData();
    }, [isOpen]);

    useEffect(() => {
        if (editProCourse) {
            setCourseId(editProCourse.course ? String(editProCourse.course.id) : '');
            setSessions([{
                id: editProCourse.id,
                fecha: editProCourse.fecha || '',
                horaini: editProCourse.horaini || '',
                horafin: editProCourse.horafin || '',
                horas: editProCourse.horas || ''
            }]);
        } else {
            setCourseId('');
            setSessions([]);
            setCurrentSession({ fecha: '', horaini: '', horafin: '', horas: '' });
        }
        setError(null);
        setWarnings([]);
        setCourseSearchQuery('');
    }, [editProCourse, isOpen]);

    // ---- Derived values ----
    const selectedCourse = useMemo(
        () => courses.find(c => String(c.id) === String(courseId)),
        [courses, courseId]
    );

    const calcSessionHours = (ini, fin) => {
        if (!ini || !fin) return '';
        const [hI, mI] = ini.split(':').map(Number);
        const [hF, mF] = fin.split(':').map(Number);
        const totalMin = (hF * 60 + mF) - (hI * 60 + mI);
        if (totalMin <= 0) return '';
        return Math.round(totalMin / 60 * 10) / 10;
    };

    const scheduledHours = useMemo(() => {
        if (!courseId) return 0;
        return allProCourses
            .filter(pc => String(pc.course?.id) === String(courseId) && (!editProCourse || pc.id !== editProCourse.id))
            .reduce((sum, pc) => sum + (Number(pc.horas) || 0), 0);
    }, [allProCourses, courseId, editProCourse]);

    const totalNewSessionsHours = useMemo(() => {
        return sessions.reduce((sum, s) => sum + (Number(s.horas) || 0), 0);
    }, [sessions]);

    const checkConflicts = (testSession) => {
        const overlaps = (s1, s2) => {
            if (!s1.fecha || !s1.horaini || !s1.horafin || !s2.fecha || !s2.horaini || !s2.horafin) return false;
            if (s1.fecha !== s2.fecha) return false;
            return (s1.horaini < s2.horafin && s1.horafin > s2.horaini);
        };

        if (!selectedCourse) return null;

        const selSimId = selectedCourse.simulator?.id;
        const selInstrId = selectedCourse.instructor?.id;
        const selPseudoId = selectedCourse.pseudoPilot?.id;
        const selCoordId = selectedCourse.coordinator?.id;
        const selRoomIds = (selectedCourse.rooms || []).map(r => r.id);
        const selUserIds = (selectedCourse.users || []).map(u => u.id);

        for (const pc of allProCourses) {
            if (editProCourse && pc.id === editProCourse.id) continue;

            if (overlaps(testSession, pc)) {
                // Course from sessions may not have full data, lookup from courses list
                const pcCourseFull = courses.find(c => c.id === (pc.course?.id || pc.courseId)) || pc.course;

                // 1. Room Conflict (Strictly by physical room/aula)
                const otherRooms = (pcCourseFull?.rooms || []);
                const currentRooms = (selectedCourse.rooms || []);
                const conflictingRooms = currentRooms.filter(room => {
                    const isOccupied = otherRooms.some(r => r.id === room.id);
                    if (!isOccupied) return false;
                    const roomName = (room.name || '').toUpperCase();
                    if (roomName.includes('PSEUDO')) return false;
                    return true;
                });

                if (conflictingRooms.length > 0) {
                    const firstConflicting = conflictingRooms[0];
                    return `Conflicto de AULA: La ${firstConflicting.name} ya está ocupada por el curso "${pcCourseFull?.name || 'Otro'}" en este horario.`;
                }

                // Personnel (Instructor)
                const otherInstrId = pc.instructor?.id || pcCourseFull?.instructor?.id;
                if (selInstrId && otherInstrId === selInstrId) {
                    return `Conflicto de INSTRUCTOR: ${selectedCourse.instructor?.firstName || 'Asignado'} ya tiene una sesión asignada en el curso "${pcCourseFull?.name}" en este horario (${pc.horaini} - ${pc.horafin}).`;
                }

                // 3. Personnel Conflict (Pseudo) - No check, they can monitor everything concurrently
                // 4. Personnel Conflict (Coordinator)
                const otherCoordId = pc.coordinator?.id || pcCourseFull?.coordinator?.id;
                if (selCoordId && otherCoordId === selCoordId) {
                    return `Conflicto de COORDINADOR: ${selectedCourse.coordinator?.firstName || 'Asignado'} ya tiene una sesión asignada en el curso "${pcCourseFull?.name}" en este horario.`;
                }

                // 5. Student Conflict
                const otherUserIds = (pcCourseFull?.users || []).map(u => u.id);
                const conflictingUsers = selUserIds.filter(id => otherUserIds.includes(id));
                if (conflictingUsers.length > 0) {
                    const currentUsers = (selectedCourse.users || []);
                    const firstConflicting = currentUsers.find(u => u.id === conflictingUsers[0]);
                    return `Conflicto de USUARIO: ${firstConflicting?.firstName || 'Usuario'} ${firstConflicting?.lastname || ''} ya tiene clase en el curso "${pcCourseFull?.name || 'Otro'}" en este horario.`;
                }
            }
        }

        // Check against sessions in current queue
        for (const s of sessions) {
            if (overlaps(testSession, s) && testSession.id !== s.id) {
                return `Conflicto Interno: Este horario (${testSession.horaini} - ${testSession.horafin}) se solapa con otra sesión que ya está en la lista de espera.`;
            }
        }

        return null;
    };

    const handleCurrentTimeChange = (field, val) => {
        const next = { ...currentSession, [field]: val };
        const calc = calcSessionHours(
            field === 'horaini' ? val : currentSession.horaini,
            field === 'horafin' ? val : currentSession.horafin
        );
        next.horas = calc || '';
        setCurrentSession(next);
    };

    const addSessionToList = () => {
        if (!currentSession.fecha || !currentSession.horaini || !currentSession.horafin || !currentSession.horas) {
            setError('Complete todos los campos de la sesión antes de añadirla.');
            return;
        }

        // Validate individual session against course bounds
        if (selectedCourse) {
            if (currentSession.fecha < selectedCourse.fecInicio || currentSession.fecha > selectedCourse.fecFin) {
                setError(`La fecha debe estar entre ${selectedCourse.fecInicio} y ${selectedCourse.fecFin}`);
                return;
            }
            if (currentSession.fecha < today) {
                setError('No se pueden programar sesiones en fechas pasadas.');
                return;
            }
        }

        const newTotal = scheduledHours + totalNewSessionsHours + Number(currentSession.horas);
        if (selectedCourse && newTotal > selectedCourse.horas) {
            setError(`Esta sesión superaría el límite de horas del curso (${selectedCourse.horas}h).`);
            return;
        }

        // Conflict check
        const conflictError = checkConflicts(currentSession);
        if (conflictError) {
            setError(conflictError);
            return;
        }

        setSessions([...sessions, { ...currentSession, id: Date.now() }]);
        setCurrentSession({ fecha: '', horaini: '', horafin: '', horas: '' });
        setError(null);
    };

    const removeSession = (id) => {
        setSessions(sessions.filter(s => s.id !== id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (sessions.length === 0) {
            setError('Debe añadir al menos una sesión a la lista.');
            return;
        }

        // Final conflict check before submit (important for edits)
        for (const s of sessions) {
            const err = checkConflicts(s);
            if (err) {
                setError(err);
                return;
            }
        }

        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            if (editProCourse) {
                const s = sessions[0];
                const payload = { ...s, horas: Number(s.horas), courseId: Number(courseId) };
                const res = await axios.put(`/api/v1/pro-courses/${editProCourse.id}`, payload, config);
                onSuccess(res.data, true);
            } else {
                const promises = sessions.map(s => {
                    const payload = { ...s, horas: Number(s.horas), courseId: Number(courseId) };
                    return axios.post('/api/v1/pro-courses', payload, config);
                });
                const responses = await Promise.all(promises);
                onSuccess(responses[0].data, false);
            }
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar la programación.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const totalAfter = scheduledHours + totalNewSessionsHours;
    const courseLimit = selectedCourse?.horas || 0;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '1100px', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        {editProCourse ? 'Editar Sesión' : 'Programar Multi-sesiones'}
                    </h3>
                    <button className="btn-close" onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                {error && <div className="modal-error" style={{ margin: '1rem 2rem 0' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div className="modal-body" style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1 }}>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Curso *</label>
                                {!editProCourse && (
                                    <div className="uc-search-box" style={{ marginBottom: '10px', maxWidth: '100%', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                        <input
                                            type="text"
                                            placeholder="Filtrar cursos por nombre..."
                                            value={courseSearchQuery}
                                            onChange={(e) => setCourseSearchQuery(e.target.value)}
                                            style={{ fontSize: '12px', padding: '6px 0' }}
                                        />
                                        {courseSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setCourseSearchQuery('')}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0', color: '#64748b', display: 'flex' }}
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                        )}
                                    </div>
                                )}
                                <select
                                    required
                                    value={courseId}
                                    onChange={(e) => {
                                        setCourseId(e.target.value);
                                        setSessions([]);
                                        setError(null);
                                    }}
                                    disabled={fetchingCourses || editProCourse}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">
                                        {courses.filter(c => c.name.toLowerCase().includes(courseSearchQuery.toLowerCase())).length === 0 && courseSearchQuery
                                            ? 'No se encontraron cursos'
                                            : 'Seleccione un curso...'}
                                    </option>
                                    {courses
                                        .filter(course => course.name.toLowerCase().includes(courseSearchQuery.toLowerCase()))
                                        .map(course => (
                                            <option key={course.id} value={course.id}>
                                                {course.name} ({course.horas}h — hasta {course.fecFin})
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {selectedCourse && (
                                <div className="form-group full-width">
                                    <div className="hours-progress-bar" style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px' }}>
                                        <div className="hours-progress-labels" style={{ marginBottom: '8px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Progreso de Horas</span>
                                            <span className={totalAfter > courseLimit ? 'over-limit' : ''}>
                                                <strong>{totalAfter}</strong> / {courseLimit}h
                                            </span>
                                        </div>
                                        <div className="hours-track" style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                                            <div
                                                className={`hours-fill ${totalAfter >= courseLimit ? 'complete' : ''}`}
                                                style={{ width: `${Math.min((totalAfter / courseLimit) * 100, 100)}%`, height: '100%', transition: 'width 0.4s ease' }}
                                            />
                                        </div>
                                        <div className="hours-meta" style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '15px' }}>
                                            <span>DB: <strong>{scheduledHours}h</strong></span>
                                            <span>En Lista: <strong>{totalNewSessionsHours}h</strong></span>
                                            <span>Disponible: <strong style={{ color: totalAfter >= courseLimit ? '#ef4444' : '#10b981' }}>{Math.max(courseLimit - totalAfter, 0)}h</strong></span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!editProCourse && selectedCourse && (
                                <div className="session-builder full-width" style={{ position: 'relative', background: 'rgba(255,255,255,0.02)', padding: '15px 15px 30px 15px', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.12)', marginBottom: '5px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Configurar nueva sesión</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1.5fr) 1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '11px', color: '#64748b' }}>Fecha</label>
                                            <DatePicker
                                                value={currentSession.fecha}
                                                onChange={(e) => setCurrentSession({ ...currentSession, fecha: e.target.value })}
                                                minDate={selectedCourse.fecInicio < today ? today : selectedCourse.fecInicio}
                                                maxDate={selectedCourse.fecFin}
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '11px', color: '#64748b' }}>Inicio</label>
                                            <TimePicker
                                                value={currentSession.horaini}
                                                onChange={(e) => handleCurrentTimeChange('horaini', e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '11px', color: '#64748b' }}>Fin</label>
                                            <TimePicker
                                                value={currentSession.horafin}
                                                onChange={(e) => handleCurrentTimeChange('horafin', e.target.value)}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            onClick={addSessionToList}
                                            style={{
                                                width: '42px',
                                                height: '42px',
                                                padding: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '10px'
                                            }}
                                            title="Añadir sesión"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        </button>
                                    </div>
                                    {currentSession.horas && (
                                        <div style={{ position: 'absolute', top: '15px', right: '15px', fontSize: '12px', color: '#6366f1', fontWeight: '600' }}>
                                            {currentSession.horas} h
                                        </div>
                                    )}
                                </div>
                            )}

                            {sessions.length > 0 && (
                                <div className="sessions-list full-width" style={{ marginTop: '10px' }}>
                                    <label style={{ marginBottom: '10px', fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20"></path></svg>
                                        Sesiones en cola ({sessions.length}):
                                    </label>
                                    <div style={{ maxHeight: '140px', overflowY: 'auto', paddingRight: '5px' }}>
                                        {sessions.map((s) => (
                                            <div key={s.id} className="session-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{s.fecha}</span>
                                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{s.horaini} — {s.horafin}</span>
                                                    </div>
                                                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                                                        {s.horas}h
                                                    </div>
                                                </div>
                                                {!editProCourse && (
                                                    <button type="button" className="btn-icon" onClick={() => removeSession(s.id)} style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '6px', borderRadius: '6px' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {editProCourse && sessions[0] && (
                                <>
                                    <div className="form-group">
                                        <label>Fecha de Sesión *</label>
                                        <DatePicker
                                            required
                                            value={sessions[0].fecha}
                                            onChange={(e) => setSessions([{ ...sessions[0], fecha: e.target.value }])}
                                            minDate={selectedCourse?.fecInicio < today ? today : selectedCourse?.fecInicio}
                                            maxDate={selectedCourse?.fecFin}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Horario *</label>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <TimePicker
                                                value={sessions[0].horaini}
                                                onChange={(e) => {
                                                    const h = calcSessionHours(e.target.value, sessions[0].horafin);
                                                    setSessions([{ ...sessions[0], horaini: e.target.value, horas: h || '' }]);
                                                }}
                                            />
                                            <span style={{ color: '#64748b' }}>—</span>
                                            <TimePicker
                                                value={sessions[0].horafin}
                                                onChange={(e) => {
                                                    const h = calcSessionHours(sessions[0].horaini, e.target.value);
                                                    setSessions([{ ...sessions[0], horafin: e.target.value, horas: h || '' }]);
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ display: 'flex', justifyContent: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                            <label style={{ fontSize: '11px', color: '#64748b' }}>Duración Calculada</label>
                                            <div className="hours-chip" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '10px 20px', borderRadius: '12px', fontWeight: '700', fontSize: '1.2rem' }}>
                                                {sessions[0].horas}h
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="modal-actions" style={{ padding: '1.25rem 2rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'rgba(15, 23, 42, 0.4)' }}>
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading} style={{ padding: '10px 20px' }}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading || sessions.length === 0 || !isOnline} style={{ padding: '10px 24px', minWidth: '160px' }}>
                            {loading ? 'Guardando...' : (isOnline ? (editProCourse ? 'Actualizar Sesión' : `Guardar ${sessions.length} Sesiones`) : 'Modo Lectura')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


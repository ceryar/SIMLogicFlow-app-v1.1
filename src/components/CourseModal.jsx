import { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from './DatePicker';
import './UserModal.css';

export default function CourseModal({ isOpen, onClose, onSuccess, editCourse }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        fecInicio: '',
        fecFin: '',
        horas: '',
        roomIds: [],
        simulatorId: ''
    });
    const [rooms, setRooms] = useState([]);
    const [simulators, setSimulators] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!isOpen) return;
            setFetchingData(true);
            try {
                const token = localStorage.getItem('token');
                const [roomsRes, simsRes, usersRes] = await Promise.all([
                    axios.get('/api/v1/rooms', { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get('/api/v1/simulators', { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get('/api/v1/users', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setRooms(roomsRes.data);
                setSimulators(simsRes.data);
                setUsers(usersRes.data);
            } catch (err) {
                console.error('Error fetching course dependencies:', err);
                setError('Error al cargar aulas o simuladores.');
            } finally {
                setFetchingData(false);
            }
        };
        fetchData();
    }, [isOpen]);

    useEffect(() => {
        if (editCourse) {
            setFormData({
                name: editCourse.name || '',
                description: editCourse.description || '',
                fecInicio: editCourse.fecInicio || '',
                fecFin: editCourse.fecFin || '',
                horas: editCourse.horas || '',
                roomIds: editCourse.rooms ? editCourse.rooms.map(r => r.id) : [],
                simulatorId: editCourse.simulator ? editCourse.simulator.id : ''
            });
        } else {
            setFormData({
                name: '',
                description: '',
                fecInicio: '',
                fecFin: '',
                horas: '',
                roomIds: [],
                simulatorId: ''
            });
        }
        setError(null);
    }, [editCourse, isOpen]);

    const handleRoomToggle = (roomId) => {
        setFormData(prev => {
            const isSelected = prev.roomIds.includes(roomId);
            if (isSelected) {
                return { ...prev, roomIds: prev.roomIds.filter(id => id !== roomId) };
            } else {
                return { ...prev, roomIds: [...prev.roomIds, roomId] };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.simulatorId) {
            setError('Debe seleccionar un simulador.');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            let response;
            if (editCourse) {
                response = await axios.put(`/api/v1/courses/${editCourse.id}`, formData, config);
            } else {
                response = await axios.post('/api/v1/courses', formData, config);
            }

            onSuccess(response.data, !!editCourse);
            onClose();
        } catch (err) {
            console.error('Error saving course:', err);
            setError(err.response?.data?.message || 'Error al guardar el curso.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        {editCourse ? 'Editar Curso' : 'Nuevo Curso'}
                    </h3>
                    <button className="btn-close" onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {error && <div className="modal-error" style={{ margin: '1rem 2rem 0' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div className="modal-body" style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1 }}>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Nombre del Curso *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Curso de Vuelo Básico"
                                />
                            </div>

                            <div className="form-group">
                                <label>Fecha de Inicio *</label>
                                <DatePicker
                                    required
                                    value={formData.fecInicio}
                                    onChange={(e) => setFormData({ ...formData, fecInicio: e.target.value })}
                                    placeholder="Seleccionar inicio"
                                    minDate={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="form-group">
                                <label>Fecha de Fin *</label>
                                <DatePicker
                                    required
                                    value={formData.fecFin}
                                    onChange={(e) => setFormData({ ...formData, fecFin: e.target.value })}
                                    placeholder="Seleccionar fin"
                                    minDate={formData.fecInicio || new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            <div className="form-group">
                                <label>Horas Totales *</label>
                                <input
                                    type="number"
                                    required
                                    value={formData.horas}
                                    onChange={(e) => setFormData({ ...formData, horas: e.target.value })}
                                    placeholder="Ej: 40"
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Simulador Principal *</label>
                                <select
                                    required
                                    value={formData.simulatorId}
                                    onChange={(e) => setFormData({ ...formData, simulatorId: e.target.value })}
                                >
                                    <option value="">Seleccione un simulador...</option>
                                    {simulators.map(sim => (
                                        <option key={sim.id} value={sim.id}>{sim.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group full-width">
                                <label>Descripción</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Objetivos y contenido del curso"
                                    rows="2"
                                ></textarea>
                            </div>

                            <div className="form-group full-width">
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Asignar Aulas (Seleccione una o más)</span>
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formData.roomIds.length} seleccionadas</span>
                                </label>
                                <div className="checkbox-grid" style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                                    gap: '10px',
                                    marginTop: '10px',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '10px',
                                    maxHeight: '140px',
                                    overflowY: 'auto',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    {rooms.filter(room => room.active || formData.roomIds.includes(room.id)).map(room => (
                                        <label key={room.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            padding: '6px 8px',
                                            borderRadius: '6px',
                                            transition: 'background 0.2s',
                                            background: formData.roomIds.includes(room.id) ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                            color: !room.active ? '#ef4444' : (formData.roomIds.includes(room.id) ? '#818cf8' : 'inherit')
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.roomIds.includes(room.id)}
                                                onChange={() => handleRoomToggle(room.id)}
                                            />
                                            <span style={{ flex: 1 }}>{room.name}</span>
                                            {!room.active && <span style={{ fontSize: '10px', opacity: 0.7 }}>(Inactiva)</span>}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions" style={{ padding: '1.25rem 2rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'rgba(15, 23, 42, 0.4)' }}>
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading || fetchingData} style={{ padding: '10px 20px' }}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading || fetchingData} style={{ padding: '10px 24px', minWidth: '160px' }}>
                            {loading ? 'Guardando...' : (editCourse ? 'Actualizar Curso' : 'Crear Curso')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

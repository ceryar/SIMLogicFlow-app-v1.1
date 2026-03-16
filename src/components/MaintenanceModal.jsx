import { useState, useEffect } from 'react';
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

export default function MaintenanceModal({ isOpen, onClose, onSuccess, editMaintenance, isOnline = true }) {
    const [formData, setFormData] = useState({
        description: '',
        fecIni: '',
        fecFin: '',
        horaIni: '',
        horaFin: '',
        simulatorId: '',
        maintenanceTypeId: '',
        technicianId: '',
        horas: ''
    });
    const [simulators, setSimulators] = useState([]);
    const [types, setTypes] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!isOpen) return;
            setFetchingData(true);
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const [simsRes, typesRes, usersRes] = await Promise.all([
                    axios.get('/api/v1/simulators', config),
                    axios.get('/api/v1/maintenance-types', config),
                    axios.get('/api/v1/users', config)
                ]);
                setSimulators(simsRes.data);
                setTypes(typesRes.data);
                setTechnicians(usersRes.data.filter(u => {
                    const r = u.role?.name?.toUpperCase() || '';
                    return r.includes('TÉCNICO') || r.includes('TECNICO') || r.includes('MANTENIMIENTO');
                }));
            } catch (err) {
                console.error('Error fetching maintenance dependencies:', err);
                setError('Error al cargar simuladores o tipos de mantenimiento.');
            } finally {
                setFetchingData(false);
            }
        };
        fetchData();
    }, [isOpen]);

    useEffect(() => {
        if (editMaintenance) {
            setFormData({
                description: editMaintenance.description || '',
                fecIni: editMaintenance.fecIni || '',
                fecFin: editMaintenance.fecFin || '',
                horaIni: editMaintenance.horaIni || '',
                horaFin: editMaintenance.horaFin || '',
                simulatorId: editMaintenance.simulator ? editMaintenance.simulator.id : '',
                maintenanceTypeId: editMaintenance.maintenanceType ? editMaintenance.maintenanceType.id : '',
                technicianId: editMaintenance.technician ? editMaintenance.technician.id : '',
                horas: editMaintenance.horas || ''
            });
        } else {
            setFormData({
                description: '',
                fecIni: '',
                fecFin: '',
                horaIni: '',
                horaFin: '',
                simulatorId: '',
                maintenanceTypeId: '',
                technicianId: '',
                horas: ''
            });
        }
        setError(null);
    }, [editMaintenance, isOpen]);

    const calculateHours = (ini, fin) => {
        if (!ini || !fin) return '';
        const [hI, mI] = ini.split(':').map(Number);
        const [hF, mF] = fin.split(':').map(Number);
        const totalMin = (hF * 60 + mF) - (hI * 60 + mI);
        if (totalMin <= 0) return '';
        return Math.round(totalMin / 60 * 10) / 10;
    };

    const handleTimeChange = (field, val) => {
        const next = { ...formData, [field]: val };
        const h = calculateHours(
            field === 'horaIni' ? val : formData.horaIni,
            field === 'horaFin' ? val : formData.horaFin
        );
        if (h) next.horas = h;
        setFormData(next);
    };

    const today = new Date().toISOString().split('T')[0];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!editMaintenance && formData.fecIni && formData.fecIni < today) {
            setError('No se puede programar mantenimiento en fechas pasadas.');
            setLoading(false);
            return;
        }

        if (formData.fecFin && formData.fecIni && formData.fecFin < formData.fecIni) {
            setError('La fecha de fin no puede ser anterior a la fecha de inicio.');
            setLoading(false);
            return;
        }

        const payload = {
            ...formData,
            horas: formData.horas ? Number(formData.horas) : null
        };

        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            let response;
            if (editMaintenance) {
                response = await axios.put(`/api/v1/maintenances/${editMaintenance.id}`, payload, config);
            } else {
                response = await axios.post('/api/v1/maintenances', payload, config);
            }

            onSuccess(response.data, !!editMaintenance);
            onClose();
        } catch (err) {
            console.error('Error saving maintenance:', err);
            setError(err.response?.data?.message || 'Error al guardar el mantenimiento.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>{editMaintenance ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}</h3>
                    <button className="btn-close" onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {error && <div className="modal-error">{error}</div>}
                {fetchingData && <div style={{ padding: '8px 0', color: '#94a3b8', fontSize: '0.85rem' }}>Cargando datos del formulario...</div>}

                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-grid">
                        {/* Simulador */}
                        <div className="form-group">
                            <label>Simulador *</label>
                            <select
                                required
                                value={formData.simulatorId}
                                onChange={(e) => setFormData({ ...formData, simulatorId: e.target.value })}
                                disabled={fetchingData}
                            >
                                <option value="">Seleccione un simulador...</option>
                                {simulators.map(sim => (
                                    <option key={sim.id} value={sim.id}>{sim.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tipo de Mantenimiento */}
                        <div className="form-group">
                            <label>Tipo de Mantenimiento *</label>
                            <select
                                required
                                value={formData.maintenanceTypeId}
                                onChange={(e) => setFormData({ ...formData, maintenanceTypeId: e.target.value })}
                                disabled={fetchingData}
                            >
                                <option value="">Seleccione un tipo...</option>
                                {types.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Técnico */}
                        <div className="form-group">
                            <label>Técnico *</label>
                            <select
                                required
                                value={formData.technicianId}
                                onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                                disabled={fetchingData}
                            >
                                <option value="">Seleccione un técnico...</option>
                                {technicians.map(tech => (
                                    <option key={tech.id} value={tech.id}>
                                        {tech.firstName} {tech.lastname}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Fecha Inicio */}
                        <div className="form-group">
                            <label>Fecha Inicio *</label>
                            <DatePicker
                                required
                                value={formData.fecIni}
                                onChange={(e) => setFormData({ ...formData, fecIni: e.target.value })}
                                placeholder="Seleccionar fecha inicio"
                                minDate={editMaintenance ? null : today}
                            />
                        </div>

                        {/* Fecha Fin */}
                        <div className="form-group">
                            <label>Fecha Fin *</label>
                            <DatePicker
                                required
                                value={formData.fecFin}
                                onChange={(e) => setFormData({ ...formData, fecFin: e.target.value })}
                                placeholder="Seleccionar fecha fin"
                                minDate={formData.fecIni || today}
                            />
                        </div>

                        {/* Hora Inicio */}
                        <div className="form-group">
                            <label>Hora Inicio *</label>
                            <TimePicker
                                required
                                value={formData.horaIni}
                                onChange={(e) => handleTimeChange('horaIni', e.target.value)}
                            />
                        </div>

                        {/* Hora Fin */}
                        <div className="form-group">
                            <label>Hora Fin *</label>
                            <TimePicker
                                required
                                value={formData.horaFin}
                                onChange={(e) => handleTimeChange('horaFin', e.target.value)}
                            />
                        </div>

                        {/* Horas */}
                        <div className="form-group">
                            <label>Horas de Trabajo</label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.horas}
                                onChange={(e) => setFormData({ ...formData, horas: e.target.value })}
                                placeholder="Auto-calculado"
                            />
                        </div>

                        {/* Descripción */}
                        <div className="form-group full-width">
                            <label>Descripción / Observaciones</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Detalles del mantenimiento programado..."
                                rows="3"
                            ></textarea>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading || fetchingData}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading || fetchingData || !isOnline}>
                            {loading ? 'Guardando...' : (isOnline ? (editMaintenance ? 'Actualizar' : 'Crear Mantenimiento') : 'Modo Lectura')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

import { useState, useMemo } from 'react';

export default function ReportView({ type, data, courses = [], simulators = [], roles = [], maintenanceTypes = [] }) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedSimulatorId, setSelectedSimulatorId] = useState('');
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [selectedMaintTypeId, setSelectedMaintTypeId] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredData = useMemo(() => {
        if (!data) return [];
        let result = [...data];

        // Date Filter
        if (startDate || endDate) {
            result = result.filter(item => {
                let itemDate = null;
                if (type === 'courses') itemDate = item.fecInicio;
                else if (type === 'maintenances') itemDate = item.fecIni;

                if (!itemDate) return true;

                const d = new Date(itemDate);
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;

                if (start && d < start) return false;
                if (end && d > end) return false;
                return true;
            });
        }

        // Status Filter
        if (selectedStatus !== '') {
            const isActive = selectedStatus === 'true';
            result = result.filter(item => item.active === isActive);
        }

        // Course Filter (Relevant for Users)
        if (type === 'users' && selectedCourseId) {
            result = result.filter(user =>
                user.courses && user.courses.some(c => c.id === parseInt(selectedCourseId))
            );
        }

        // Role Filter (Relevant for Users)
        if (type === 'users' && selectedRoleId) {
            result = result.filter(user => user.role?.id === parseInt(selectedRoleId));
        }

        // Maintenance Type Filter
        if (type === 'maintenances' && selectedMaintTypeId) {
            result = result.filter(m => m.maintenanceType?.id === parseInt(selectedMaintTypeId));
        }

        // Simulator Filter (Relevant for Maintenances and Courses)
        if (selectedSimulatorId) {
            if (type === 'maintenances') {
                result = result.filter(m => m.simulator?.id === parseInt(selectedSimulatorId));
            } else if (type === 'courses') {
                result = result.filter(c => c.simulator?.id === parseInt(selectedSimulatorId));
            }
        }

        // Search Term Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(item => {
                if (type === 'courses') {
                    return (item.name?.toLowerCase().includes(term)) ||
                        (item.description?.toLowerCase().includes(term));
                } else if (type === 'users') {
                    return (item.firstName?.toLowerCase().includes(term)) ||
                        (item.lastname?.toLowerCase().includes(term)) ||
                        (item.email?.toLowerCase().includes(term));
                } else if (type === 'maintenances') {
                    return (item.description?.toLowerCase().includes(term)) ||
                        (item.simulator?.name?.toLowerCase().includes(term));
                }
                return true;
            });
        }

        return result;
    }, [data, startDate, endDate, type, selectedCourseId, selectedSimulatorId, selectedRoleId, selectedMaintTypeId, selectedStatus, searchTerm]);

    const handleDownloadCSV = () => {
        let headers = [];
        let rows = [];

        if (type === 'users') {
            headers = ['ID', 'Nombre', 'Apellido', 'Email', 'Rol', 'Estado', 'Cursos'];
            rows = filteredData.map(u => [
                u.id,
                u.firstName,
                u.lastname,
                u.email,
                u.role?.name || 'N/A',
                u.active ? 'Activo' : 'Inactivo',
                u.courses ? u.courses.map(c => c.name).join(' | ') : ''
            ]);
        } else if (type === 'courses') {
            headers = ['ID', 'Nombre', 'Descripción', 'Fecha Inicio', 'Fecha Fin', 'Simulador'];
            rows = filteredData.map(c => [
                c.id,
                c.name,
                c.description,
                c.fecInicio,
                c.fecFin,
                c.simulator?.name || 'N/A'
            ]);
        } else if (type === 'maintenances') {
            headers = ['ID', 'Simulador', 'Tipo', 'Fecha', 'Horario', 'Técnico', 'Descripción'];
            rows = filteredData.map(m => [
                m.id,
                m.simulator?.name || 'N/A',
                m.maintenanceType?.name || 'N/A',
                m.fecIni,
                `${m.horaIni} - ${m.horaFin}`,
                m.technician ? `${m.technician.firstName} ${m.technician.lastname}` : 'Sin asignar',
                m.description || ''
            ]);
        }

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_${type}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="report-container" style={{ padding: '20px' }}>
            <div className="report-filters card" style={{ padding: '20px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div className="filter-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Buscar</label>
                    <input
                        type="text"
                        placeholder={type === 'courses' ? "Nombre o descripción..." : "Buscar..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '220px', outline: 'none' }}
                    />
                </div>
                <div className="filter-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Fecha Inicio</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '160px', outline: 'none' }}
                    />
                </div>
                <div className="filter-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Fecha Fin</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '160px', outline: 'none' }}
                    />
                </div>

                {type === 'users' && courses.length > 0 && (
                    <div className="filter-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Filtrar por Curso</label>
                        <select
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '200px', outline: 'none' }}
                        >
                            <option value="">Todos los cursos</option>
                            {courses.map(course => (
                                <option key={course.id} value={course.id}>{course.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {type === 'users' && roles.length > 0 && (
                    <div className="filter-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Filtrar por Rol</label>
                        <select
                            value={selectedRoleId}
                            onChange={(e) => setSelectedRoleId(e.target.value)}
                            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '200px', outline: 'none' }}
                        >
                            <option value="">Todos los roles</option>
                            {roles.map(role => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {type === 'maintenances' && maintenanceTypes.length > 0 && (
                    <div className="filter-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Filtrar por Tipo Mantenimiento</label>
                        <select
                            value={selectedMaintTypeId}
                            onChange={(e) => setSelectedMaintTypeId(e.target.value)}
                            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '200px', outline: 'none' }}
                        >
                            <option value="">Todos los tipos</option>
                            {maintenanceTypes.map(mtype => (
                                <option key={mtype.id} value={mtype.id}>{mtype.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {(type === 'maintenances' || type === 'courses') && simulators.length > 0 && (
                    <div className="filter-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Filtrar por Simulador</label>
                        <select
                            value={selectedSimulatorId}
                            onChange={(e) => setSelectedSimulatorId(e.target.value)}
                            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '200px', outline: 'none' }}
                        >
                            <option value="">Todos los simuladores</option>
                            {simulators.map(sim => (
                                <option key={sim.id} value={sim.id}>{sim.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="filter-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Estado</label>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '120px', outline: 'none' }}
                    >
                        <option value="">Todos</option>
                        <option value="true">Activo</option>
                        <option value="false">Inactivo</option>
                    </select>
                </div>

                <button
                    className="btn-primary"
                    onClick={handleDownloadCSV}
                    style={{ height: '44px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px', borderRadius: '8px', fontWeight: '600', transition: 'all 0.2s', background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Descargar CSV
                </button>
            </div>

            <div className="report-preview card" style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '2px dashed #cbd5e1', background: '#f8fafc', borderRadius: '12px' }}>
                <div style={{ padding: '20px', background: 'white', borderRadius: '50%', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', marginBottom: '24px' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div style={{ fontSize: '72px', fontWeight: '800', marginBottom: '8px', color: '#1e293b', lineHeight: '1' }}>
                    {filteredData.length}
                </div>
                <div style={{ color: '#64748b', fontSize: '20px', fontWeight: '600', marginBottom: '32px' }}>
                    Registros encontrados
                </div>

                <div style={{ display: 'flex', gap: '32px', textAlign: 'left' }}>
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', minWidth: '200px' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Tipo de Reporte</div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#334155' }}>
                            {type === 'users' ? 'Usuarios' : type === 'courses' ? 'Cursos' : 'Mantenimientos'}
                        </div>
                    </div>
                    {(startDate || endDate) && (
                        <div style={{ padding: '16px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', minWidth: '200px' }}>
                            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Rango de Fechas</div>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: '#334155' }}>
                                {startDate || '...'} al {endDate || 'ahora'}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '40px', padding: '16px 24px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #dbeafe', maxWidth: '500px' }}>
                    <p style={{ color: '#1e40af', fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        El archivo CSV incluirá el detalle de los {filteredData.length} registros filtrados.
                    </p>
                </div>
            </div>
        </div>
    );
}

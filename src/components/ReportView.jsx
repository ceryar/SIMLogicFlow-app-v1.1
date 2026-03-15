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
                else if (type === 'sessions') itemDate = item.fecha || item.fecIni;

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

        // Course Filter (Relevant for Users and Sessions)
        if (selectedCourseId) {
            if (type === 'users') {
                result = result.filter(user =>
                    user.courses && user.courses.some(c => c.id === parseInt(selectedCourseId))
                );
            } else if (type === 'sessions') {
                result = result.filter(s => s.course?.id === parseInt(selectedCourseId));
            }
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
            } else if (type === 'courses' || type === 'sessions') {
                result = result.filter(c => c.simulator?.id === parseInt(selectedSimulatorId));
            }
        }

        // Search Term Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(item => {
                if (type === 'courses') {
                    const instr = item.instructor || (item.users || []).find(u => (u.role?.name || '').toUpperCase().includes('INSTRUCTOR'));
                    const pseudo = item.pseudoPilot || (item.users || []).find(u => (u.role?.name || '').toUpperCase().includes('PSEUDO'));
                    const instrName = instr ? `${instr.firstName} ${instr.lastname}`.toLowerCase() : '';
                    const pseudoName = pseudo ? `${pseudo.firstName} ${pseudo.lastname}`.toLowerCase() : '';

                    return (item.name?.toLowerCase().includes(term)) ||
                        (item.description?.toLowerCase().includes(term)) ||
                        instrName.includes(term) ||
                        pseudoName.includes(term);
                } else if (type === 'users') {
                    return (item.firstName?.toLowerCase().includes(term)) ||
                        (item.lastname?.toLowerCase().includes(term)) ||
                        (item.email?.toLowerCase().includes(term)) ||
                        (item.documentNumber || '').includes(term);
                } else if (type === 'maintenances' || type === 'sessions') {
                    return (item.description?.toLowerCase().includes(term)) ||
                        (item.simulator?.name?.toLowerCase().includes(term)) ||
                        (item.course?.name?.toLowerCase().includes(term)) ||
                        (item.horaini || '').includes(term) ||
                        (item.horafin || '').includes(term);
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
        } else if (type === 'sessions') {
            headers = ['ID', 'Curso', 'Simulador', 'Fecha', 'Horario', 'Instructor', 'Pseudopiloto'];
            rows = filteredData.map(s => [
                s.id,
                s.course?.name || 'N/A',
                s.simulator?.name || 'N/A',
                s.fecha || s.fecIni,
                `${s.horaini || s.horaIni} - ${s.horafin || s.horaFin}`,
                s.instructor ? `${s.instructor.firstName} ${s.instructor.lastname}` : 'N/A',
                s.pseudoPilot ? `${s.pseudoPilot.firstName} ${s.pseudoPilot.lastname}` : 'N/A'
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

    const handleDownloadPDF = async () => {
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');

            const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for better table space

            // Styling identical to StatisticsView
            // Header
            doc.setFontSize(22);
            doc.setTextColor(59, 130, 246); // #3b82f6
            doc.text('SimLogicFlow', 14, 20);

            const titleMap = {
                'users': 'Reporte Detallado de Usuarios',
                'courses': 'Reporte de Programas Académicos',
                'maintenances': 'Reporte de Mantenimientos',
                'sessions': 'Reporte de Sesiones y Horarios'
            };
            doc.text(titleMap[type] || 'Reporte del Sistema', 14, 30);

            // Metadata
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139); // #64748b
            doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 38);

            let filterSummary = `Filtros: ${searchTerm ? `Búsqueda: "${searchTerm}" | ` : ''}${startDate ? `Desde: ${startDate} | ` : ''}${endDate ? `Hasta: ${endDate}` : ''}`;
            if (filterSummary === 'Filtros: ') filterSummary = 'Filtros: Ninguno (Todos los registros)';
            doc.text(filterSummary, 14, 44);

            doc.text(`Total de registros: ${filteredData.length}`, 14, 50);

            let tableHead = [];
            let tableBody = [];

            if (type === 'users') {
                tableHead = [['Nombre Completo', 'Email', 'Documento', 'Rol', 'Estado']];
                tableBody = filteredData.map(u => [
                    `${u.firstName} ${u.lastname}`,
                    u.email,
                    u.documentNumber || '—',
                    u.role?.name || 'N/A',
                    u.active ? 'Activo' : 'Inactivo'
                ]);
            } else if (type === 'courses') {
                tableHead = [['Nombre del Curso', 'Fecha Inicio', 'Fecha Fin', 'Simulador', 'Horas', 'Instructor', 'Pseudopiloto']];
                tableBody = filteredData.map(c => {
                    const instr = c.instructor || (c.users || []).find(u => (u.role?.name || '').toUpperCase().includes('INSTRUCTOR'));
                    const pseudo = c.pseudoPilot || (c.users || []).find(u => (u.role?.name || '').toUpperCase().includes('PSEUDO'));
                    return [
                        c.name,
                        c.fecInicio || '—',
                        c.fecFin || '—',
                        c.simulator?.name || 'N/A',
                        c.horas || 0,
                        instr ? `${instr.firstName} ${instr.lastname}` : '—',
                        pseudo ? `${pseudo.firstName} ${pseudo.lastname}` : '—'
                    ];
                });
            } else if (type === 'maintenances') {
                tableHead = [['Simulador', 'Tipo', 'Fecha', 'Horario', 'Técnico', 'Descripción']];
                tableBody = filteredData.map(m => [
                    m.simulator?.name || 'N/A',
                    m.maintenanceType?.name || 'N/A',
                    m.fecIni,
                    `${m.horaIni} - ${m.horaFin}`,
                    m.technician ? `${m.technician.firstName} ${m.technician.lastname}` : '—',
                    m.description || '—'
                ]);
            } else if (type === 'sessions') {
                tableHead = [['Curso', 'Simulador', 'Fecha', 'Horario', 'Instructor', 'Pseudopiloto']];
                tableBody = filteredData.map(s => [
                    s.course?.name || 'N/A',
                    s.simulator?.name || 'N/A',
                    s.fecha || s.fecIni,
                    `${s.horaini || s.horaIni} - ${s.horafin || s.horaFin}`,
                    s.instructor ? `${s.instructor.firstName} ${s.instructor.lastname}` : '—',
                    s.pseudoPilot ? `${s.pseudoPilot.firstName} ${s.pseudoPilot.lastname}` : '—'
                ]);
            }

            autoTable(doc, {
                startY: 55,
                head: tableHead,
                body: tableBody,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246], fontSize: 10 },
                styles: { fontSize: 9, cellPadding: 3 },
                alternateRowStyles: { fillColor: [248, 250, 252] }
            });

            doc.save(`SimLogicFlow_Reporte_${type}_${new Date().getTime()}.pdf`);
        } catch (error) {
            console.error("Error generating report PDF:", error);
            alert("Error al generar el PDF.");
        }
    };

    return (
        <div className="report-container" style={{ padding: '20px' }}>
            <div className="report-filters card" style={{ padding: '20px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div className="filter-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Buscar</label>
                    <input
                        type="text"
                        placeholder={
                            type === 'courses' ? "Nombre o descripción..." :
                                type === 'sessions' ? "Curso, simulador u horario (ej. 08:00)..." :
                                    type === 'maintenances' ? "Simulador o descripción..." : "Buscar..."
                        }
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

                {(type === 'users' || type === 'sessions') && courses.length > 0 && (
                    <div className="filter-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Curso</label>
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

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="btn-primary"
                        onClick={handleDownloadCSV}
                        style={{ height: '44px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', borderRadius: '8px', fontWeight: '600', transition: 'all 0.2s', background: '#3b82f6' }}
                    >
                        CSV
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleDownloadPDF}
                        style={{ height: '44px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', borderRadius: '8px', fontWeight: '600', transition: 'all 0.2s', background: '#ef4444' }}
                    >
                        PDF
                    </button>
                </div>
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

                <div style={{ display: 'flex', gap: '32px', textAlign: 'left', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', minWidth: '200px' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Tipo de Reporte</div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#334155' }}>
                            {type === 'users' ? 'Usuarios' : type === 'courses' ? 'Programas' : type === 'sessions' ? 'Sesiones' : 'Mantenimientos'}
                        </div>
                    </div>
                    {(startDate || endDate) && (
                        <div style={{ padding: '16px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', minWidth: '200px' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Rango de Fechas</div>
                            <div style={{ fontSize: '15px', fontWeight: '600', color: '#334155' }}>
                                {startDate || '—'} al {endDate || 'hoy'}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '40px', padding: '16px 24px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #dbeafe', maxWidth: '500px' }}>
                    <p style={{ color: '#1e40af', fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        Exportación disponible en CSV y PDF con diseño profesional.
                    </p>
                </div>
            </div>
        </div>
    );
}

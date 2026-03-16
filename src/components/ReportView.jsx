import { useState, useMemo } from 'react';

export default function ReportView({ type, data, users = [], courses = [], simulators = [], roles = [], maintenanceTypes = [] }) {
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

            const doc = new jsPDF('l', 'mm', 'a4');

            // Header
            doc.setFontSize(22);
            doc.setTextColor(59, 130, 246);
            doc.text('SimLogicFlow', 14, 20);

            const titleMap = {
                'users': 'Reporte Detallado de Usuarios',
                'courses': 'Reporte de Programas Académicos',
                'maintenances': 'Reporte de Mantenimientos',
                'sessions': 'Reporte de Sesiones y Horarios'
            };
            doc.text(titleMap[type] || 'Reporte del Sistema', 14, 30);

            // Metadata & Course Name
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 38);

            const courseName = selectedCourseId ? courses.find(c => String(c.id) === String(selectedCourseId))?.name : null;
            let currentY = 44;

            if (courseName) {
                doc.setFontSize(12);
                doc.setTextColor(30, 41, 59);
                doc.setFont('helvetica', 'bold');
                doc.text(`Curso: ${courseName}`, 14, currentY);
                currentY += 6;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(100, 116, 139);
            }

            let filterSummary = `Filtros: ${searchTerm ? `Búsqueda: "${searchTerm}" | ` : ''}${startDate ? `Desde: ${startDate} | ` : ''}${endDate ? `Hasta: ${endDate}` : ''}`;
            if (filterSummary === 'Filtros: ') filterSummary = 'Filtros: Ninguno (Todos los registros)';
            doc.text(filterSummary, 14, currentY);
            currentY += 6;

            doc.text(`Total de registros: ${filteredData.length}`, 14, currentY);
            currentY += 10;

            if (type === 'users') {
                // Group users by role
                const rolesMap = filteredData.reduce((acc, user) => {
                    const rName = user.role?.name || 'Sin Rol';
                    if (!acc[rName]) acc[rName] = [];
                    acc[rName].push(user);
                    return acc;
                }, {});

                Object.entries(rolesMap).forEach(([roleName, roleUsers]) => {
                    doc.setFontSize(12);
                    doc.setTextColor(51, 65, 85);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Rol: ${roleName} (${roleUsers.length})`, 14, currentY);
                    currentY += 4;

                    autoTable(doc, {
                        startY: currentY,
                        head: [['Nombre Completo', 'Email', 'Documento', 'Cursos', 'Estado']],
                        body: roleUsers.map(u => [
                            `${u.firstName} ${u.lastname}`,
                            u.email,
                            u.documentNumber || '—',
                            u.courses?.map(c => c.name).join(', ') || '—',
                            u.active ? 'Activo' : 'Inactivo'
                        ]),
                        theme: 'striped',
                        headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
                        styles: { fontSize: 8, cellPadding: 2 },
                        alternateRowStyles: { fillColor: [248, 250, 252] },
                        margin: { left: 14 }
                    });

                    currentY = doc.lastAutoTable.finalY + 10;

                    // Check if we need a new page
                    if (currentY > 180 && Object.keys(rolesMap).indexOf(roleName) < Object.keys(rolesMap).length - 1) {
                        doc.addPage();
                        currentY = 20;
                    }
                });
            } else {
                let tableHead = [];
                let tableBody = [];

                if (type === 'courses') {
                    tableHead = [['Nombre del Curso', 'Simulador', 'Sala', 'Fecha Inicio', 'Fecha Fin', 'Horas', 'Instructor', 'Pseudopiloto']];
                    tableBody = filteredData.map(c => {
                        // Attempt to find instructor and pseudo from global users list if not directly on course
                        const courseUsers = users.filter(u => u.courses?.some(uc => uc.id === c.id));

                        const instr = c.instructor || courseUsers.find(u => {
                            const r = u.role?.name?.toUpperCase() || '';
                            return r.includes('INSTRUCTOR');
                        });

                        const pseudo = c.pseudoPilot || courseUsers.find(u => {
                            const r = u.role?.name?.toUpperCase() || '';
                            return r.includes('PSEUDO');
                        });

                        const salaStr = (c.rooms && c.rooms.length > 0) ? c.rooms.map(r => r.name).join(', ') : 'N/A';
                        return [
                            c.name,
                            c.simulator?.name || 'N/A',
                            salaStr,
                            c.fecInicio || '—',
                            c.fecFin || '—',
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
                    tableHead = [['Curso', 'Simulador', 'Sala', 'Fecha', 'Horario', 'Instructor', 'Pseudopiloto']];
                    tableBody = filteredData.map(s => {
                        const courseObj = s.course || {};
                        const sim = s.simulator || courseObj.simulator;
                        const rooms = courseObj.rooms || [];
                        const salaStr = rooms.length > 0 ? rooms.map(r => r.name).join(', ') : 'N/A';

                        // Robust personal finding from global users list using safe string comparison
                        const targetCourseId = String(courseObj.id || 0);
                        const courseUsers = users.filter(u =>
                            Array.isArray(u.courses) && u.courses.some(uc => String(uc.id) === targetCourseId)
                        );

                        const instr = s.instructor || courseObj.instructor || courseUsers.find(u => {
                            const r = (u.role?.name || '').toUpperCase();
                            return r.includes('INSTRUCTOR');
                        });

                        const pseudo = s.pseudoPilot || courseObj.pseudoPilot || courseUsers.find(u => {
                            const r = (u.role?.name || '').toUpperCase();
                            return r.includes('PSEUDO');
                        });

                        return [
                            courseObj.name || 'N/A',
                            sim?.name || 'N/A',
                            salaStr,
                            s.fecha || s.fecIni,
                            `${s.horaini || s.horaIni} - ${s.horafin || s.horafin}`,
                            instr ? `${instr.firstName} ${instr.lastname}` : '—',
                            pseudo ? `${pseudo.firstName} ${pseudo.lastname}` : '—'
                        ];
                    });
                }

                autoTable(doc, {
                    startY: currentY,
                    head: tableHead,
                    body: tableBody,
                    theme: 'striped',
                    headStyles: { fillColor: [59, 130, 246], fontSize: 10 },
                    styles: { fontSize: 9, cellPadding: 3 },
                    alternateRowStyles: { fillColor: [248, 250, 252] }
                });
            }

            doc.save(`SimLogicFlow_Reporte_${type}_${new Date().getTime()}.pdf`);
        } catch (error) {
            console.error("Error generating report PDF:", error);
            alert("Error al generar el PDF.");
        }
    };

    return (
        <div className="report-container" style={{ padding: '20px', color: 'var(--text-main)' }}>
            <div className="report-filters card" style={{ padding: '24px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
                <div className="filter-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Buscar</label>
                    <input
                        type="text"
                        placeholder={
                            type === 'courses' ? "Nombre o descripción..." :
                                type === 'sessions' ? "Curso, simulador u horario (ej. 08:00)..." :
                                    type === 'maintenances' ? "Simulador o descripción..." : "Buscar..."
                        }
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', minWidth: '240px', outline: 'none', transition: 'all 0.2s' }}
                    />
                </div>
                <div className="filter-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Fecha Inicio</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', minWidth: '160px', outline: 'none' }}
                    />
                </div>
                <div className="filter-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Fecha Fin</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', minWidth: '160px', outline: 'none' }}
                    />
                </div>

                {(type === 'users' || type === 'sessions') && courses.length > 0 && (
                    <div className="filter-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Curso</label>
                        <select
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                            style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', minWidth: '200px', outline: 'none' }}
                        >
                            <option value="">Todos los cursos</option>
                            {courses.map(course => (
                                <option key={course.id} value={course.id}>{course.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="filter-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Estado</label>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', minWidth: '120px', outline: 'none' }}
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
                        style={{ height: '48px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px', borderRadius: '12px', fontWeight: '700', transition: 'all 0.2s', background: 'var(--primary-color)', border: 'none', color: '#fff', cursor: 'pointer' }}
                    >
                        CSV
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleDownloadPDF}
                        style={{ height: '48px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px', borderRadius: '12px', fontWeight: '700', transition: 'all 0.2s', background: 'var(--error-color)', border: 'none', color: '#fff', cursor: 'pointer' }}
                    >
                        PDF
                    </button>
                </div>
            </div>

            <div className="report-preview card" style={{ padding: '64px 48px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '2px dashed var(--border-color)', background: 'var(--bg-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-lg)' }}>
                <div style={{ padding: '24px', background: 'var(--primary-color)', borderRadius: '50%', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)', marginBottom: '32px' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div style={{ fontSize: '80px', fontWeight: '900', marginBottom: '8px', color: 'var(--text-main)', lineHeight: '1', letterSpacing: '-0.05em' }}>
                    {filteredData.length}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '20px', fontWeight: '700', marginBottom: '40px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Registros encontrados
                </div>

                <div style={{ display: 'flex', gap: '32px', textAlign: 'left', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-body)', border: '1px solid var(--border-color)', minWidth: '220px', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontWeight: '800' }}>Tipo de Reporte</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                            {type === 'users' ? 'Usuarios' : type === 'courses' ? 'Programas' : type === 'sessions' ? 'Sesiones' : 'Mantenimientos'}
                        </div>
                    </div>
                    {(startDate || endDate) && (
                        <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-body)', border: '1px solid var(--border-color)', minWidth: '220px', boxShadow: 'var(--shadow-sm)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontWeight: '800' }}>Rango de Fechas</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                                {startDate || '—'} al {endDate || 'hoy'}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '48px', padding: '16px 32px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', maxWidth: '600px' }}>
                    <p style={{ color: 'var(--primary-color)', fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        Exportación disponible en CSV y PDF con diseño profesional.
                    </p>
                </div>
            </div>
        </div>
    );
}

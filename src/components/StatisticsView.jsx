import { useMemo, useState } from 'react';
import axios from 'axios';
// Dynamic imports moved inside function

export default function StatisticsView({ users = [], courses = [], proCourses = [], maintenances = [], simulators = [] }) {

    const [filterType, setFilterType] = useState('all'); // all, week, month, custom
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedSimulatorId, setSelectedSimulatorId] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');

    const filteredData = useMemo(() => {
        const now = new Date();
        let startLimit = null;
        let endLimit = null;

        if (filterType === 'week') {
            const startOfWeek = new Date(now);
            const day = startOfWeek.getDay();
            const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
            startLimit = new Date(startOfWeek.setDate(diff));
            startLimit.setHours(0, 0, 0, 0);

            // Set end of week
            endLimit = new Date(startLimit);
            endLimit.setDate(startLimit.getDate() + 6);
            endLimit.setHours(23, 59, 59, 999);
        } else if (filterType === 'month') {
            startLimit = new Date(now.getFullYear(), now.getMonth(), 1);
            endLimit = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month
            endLimit.setHours(23, 59, 59, 999);
        } else if (filterType === 'custom' && startDate && endDate) {
            startLimit = new Date(startDate + 'T00:00:00');
            endLimit = new Date(endDate + 'T23:59:59');
        }

        const isInRange = (dateStr) => {
            if (!startLimit && !endLimit) return true;
            if (!dateStr) return false;
            const itemDate = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
            if (startLimit && itemDate < startLimit) return false;
            if (endLimit && itemDate > endLimit) return false;
            return true;
        };

        const simId = selectedSimulatorId ? parseInt(selectedSimulatorId) : null;
        const courseId = selectedCourseId ? parseInt(selectedCourseId) : null;

        return {
            proCourses: proCourses.filter(pc => {
                const dateMatch = isInRange(pc.fecha);
                const simMatch = !simId || pc.course?.simulator?.id === simId;
                const courseMatch = !courseId || pc.course?.id === courseId;
                return dateMatch && simMatch && courseMatch;
            }),
            maintenances: maintenances.filter(m => {
                const dateMatch = isInRange(m.fecIni);
                const simMatch = !simId || m.simulator?.id === simId;
                return dateMatch && simMatch;
            }),
            courses: courses.filter(c => {
                const simMatch = !simId || c.simulator?.id === simId;
                const courseMatch = !courseId || c.id === courseId;
                return simMatch && courseMatch;
            }),
            users: users.filter(u => {
                if (!courseId) return true;
                return u.courses?.some(c => c.id === courseId);
            })
        };
    }, [filterType, startDate, endDate, selectedSimulatorId, selectedCourseId, proCourses, maintenances, courses, users]);

    const stats = useMemo(() => {
        // 1. Simulator Usage Statistics
        const simulatorUsage = simulators
            .filter(sim => !selectedSimulatorId || sim.id === parseInt(selectedSimulatorId))
            .map(sim => {
                const usageHours = filteredData.proCourses
                    .filter(pc => pc.course?.simulator?.id === sim.id)
                    .reduce((acc, pc) => acc + (pc.horas || 0), 0);
                return { name: sim.name, hours: usageHours };
            }).sort((a, b) => b.hours - a.hours);

        // 2. Maintenance Types Distribution
        const maintDistribution = filteredData.maintenances.reduce((acc, m) => {
            const type = m.maintenanceType?.name || 'Otro';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        // 3. User Role Distribution
        const roleDistribution = filteredData.users.reduce((acc, u) => {
            const role = u.role?.name || 'Sin Rol';
            acc[role] = (acc[role] || 0) + 1;
            return acc;
        }, {});

        // 4. Course Intensity (Hours per Course)
        const courseIntensity = filteredData.courses.map(c => ({
            name: c.name,
            totalHours: c.horas || 0,
            programmedHours: filteredData.proCourses
                .filter(pc => pc.course?.id === c.id)
                .reduce((acc, pc) => acc + (pc.horas || 0), 0)
        })).filter(c => c.programmedHours > 0 || filterType === 'all').slice(0, 10);

        return {
            simulatorUsage,
            maintDistribution,
            roleDistribution,
            courseIntensity,
            totalUsers: filteredData.users.length,
            totalCourses: filteredData.courses.length,
            totalMaintenances: filteredData.maintenances.length,
            activeSimulators: simulators.filter(s => s.active && (!selectedSimulatorId || s.id === parseInt(selectedSimulatorId))).length
        };
    }, [simulators, selectedSimulatorId, filteredData, filterType]);

    const exportToPDF = async () => {
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');

            const doc = new jsPDF();

            // Header
            doc.setFontSize(22);
            doc.setTextColor(59, 130, 246); // #3b82f6
            doc.text('SimLogicFlow', 14, 22);

            doc.setFontSize(16);
            doc.setTextColor(30, 41, 59); // #1e293b
            doc.text('Reporte Estadístico de Operaciones', 14, 32);

            // Filter Info
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139); // #64748b
            let periodText = 'Periodo: ';
            if (filterType === 'all') periodText += 'Todo el historial';
            else if (filterType === 'week') periodText += 'Esta Semana';
            else if (filterType === 'month') periodText += 'Este Mes';
            else periodText += `${startDate} hasta ${endDate}`;
            doc.text(periodText, 14, 40);

            let filterText = '';
            if (selectedSimulatorId) {
                const sim = simulators.find(s => s.id === parseInt(selectedSimulatorId));
                filterText += `Simulador: ${sim?.name || 'N/A'} `;
            }
            if (selectedCourseId) {
                const course = courses.find(c => c.id === parseInt(selectedCourseId));
                filterText += `Curso: ${course?.name || 'N/A'} `;
            }
            if (filterText) doc.text(filterText, 14, 45);

            doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, filterText ? 50 : 45);

            // 1. Overview Table
            autoTable(doc, {
                startY: 55,
                head: [['Indicador', 'Valor']],
                body: [
                    ['Total Usuarios', stats.totalUsers],
                    ['Cursos Activos', stats.totalCourses],
                    ['Simuladores Operativos', `${stats.activeSimulators}/${simulators.length}`],
                    ['Mantenimientos en Periodo', stats.totalMaintenances]
                ],
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] }
            });

            // 2. Simulator Usage Table
            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59);
            doc.text('Uso de Simuladores (Horas)', 14, doc.lastAutoTable.finalY + 15);

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 20,
                head: [['Simulador', 'Horas de Uso']],
                body: stats.simulatorUsage.map(sim => [sim.name, `${sim.hours}h`]),
                theme: 'grid',
                headStyles: { fillColor: [16, 185, 129] }
            });

            // 3. Maintenance Distribution
            doc.setFontSize(14);
            doc.text('Distribución de Mantenimiento', 14, doc.lastAutoTable.finalY + 15);

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 20,
                head: [['Tipo de Mantenimiento', 'Cantidad']],
                body: Object.entries(stats.maintDistribution).map(([type, count]) => [type, count]),
                theme: 'striped',
                headStyles: { fillColor: [245, 158, 11] }
            });

            // 4. Course Intensity
            doc.setFontSize(14);
            doc.text('Estado de Cursos', 14, doc.lastAutoTable.finalY + 15);

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 20,
                head: [['Curso', 'Progreso', 'Horas Programadas', 'Total']],
                body: stats.courseIntensity.map(c => [
                    c.name,
                    `${Math.round((c.programmedHours / (c.totalHours || 1)) * 100)}%`,
                    c.programmedHours,
                    c.totalHours
                ]),
                theme: 'grid',
                headStyles: { fillColor: [139, 92, 246] }
            });

            doc.save(`SimLogicFlow_Reporte_${filterType}_${new Date().getTime()}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Error al generar el PDF. Por favor, intente de nuevo.");
        }
    };

    const maxUsageHours = Math.max(...stats.simulatorUsage.map(s => s.hours), 1);

    return (
        <div className="statistics-container" style={{ padding: '20px', color: '#1e293b' }}>

            {/* Filters Row */}
            <div style={{ marginBottom: '30px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', background: '#f8fafc', padding: '15px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <span style={{ fontWeight: '700', fontSize: '12px', color: '#64748b' }}>Periodo:</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[
                            { id: 'all', label: 'Todo' },
                            { id: 'week', label: 'Esta Semana' },
                            { id: 'month', label: 'Este Mes' },
                            { id: 'custom', label: 'Personalizado' }
                        ].map(btn => (
                            <button
                                key={btn.id}
                                onClick={() => setFilterType(btn.id)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: filterType === btn.id ? '#3b82f6' : '#fff',
                                    color: filterType === btn.id ? '#fff' : '#64748b',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>

                {filterType === 'custom' && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', alignSelf: 'flex-end', marginBottom: '4px' }}>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                        />
                        <span style={{ color: '#64748b' }}>a</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                        />
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <span style={{ fontWeight: '700', fontSize: '12px', color: '#64748b' }}>Simulador:</span>
                    <select
                        value={selectedSimulatorId}
                        onChange={(e) => setSelectedSimulatorId(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontSize: '13px', fontWeight: '600', minWidth: '180px' }}
                    >
                        <option value="">Todos los Simuladores</option>
                        {simulators.map(sim => (
                            <option key={sim.id} value={sim.id}>{sim.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <span style={{ fontWeight: '700', fontSize: '12px', color: '#64748b' }}>Curso:</span>
                    <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontSize: '13px', fontWeight: '600', minWidth: '180px' }}
                    >
                        <option value="">Todos los Cursos</option>
                        {(selectedSimulatorId
                            ? courses.filter(c => c.simulator?.id === parseInt(selectedSimulatorId))
                            : courses
                        ).map(course => (
                            <option key={course.id} value={course.id}>{course.name}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={exportToPDF}
                    style={{
                        marginLeft: 'auto',
                        padding: '10px 20px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                        transition: 'transform 0.2s',
                        alignSelf: 'flex-end',
                        marginBottom: '4px'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <span>📄</span> PDF
                </button>
            </div>

            {/* Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <StatCard title="Total Usuarios" value={stats.totalUsers} icon="👥" color="#3b82f6" />
                <StatCard title="Cursos Activos" value={stats.totalCourses} icon="📚" color="#8b5cf6" />
                <StatCard title="Simuladores Operativos" value={`${stats.activeSimulators}/${simulators.length}`} icon="🕹️" color="#10b981" />
                <StatCard title="Mantenimientos" value={stats.totalMaintenances} icon="🛠️" color="#f59e0b" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '30px' }}>

                {/* Simulator Usage Chart */}
                <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '700' }}>Uso de Simuladores (Horas)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {stats.simulatorUsage.map(sim => (
                            <div key={sim.name}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                                    <span style={{ fontWeight: '600' }}>{sim.name}</span>
                                    <span style={{ color: '#64748b' }}>{sim.hours}h</span>
                                </div>
                                <div style={{ height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${(sim.hours / maxUsageHours) * 100}%`,
                                        background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                                        borderRadius: '6px',
                                        transition: 'width 1s ease-out'
                                    }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Maintenance Distribution */}
                <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '700' }}>Distribución de Mantenimiento</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '40px', height: '200px' }}>
                        <div style={{ position: 'relative', width: '160px', height: '160px' }}>
                            {/* Simple SVG Donut Chart logic */}
                            <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#f1f5f9" strokeWidth="3.8"></circle>
                                {Object.entries(stats.maintDistribution).map(([type, count], i, arr) => {
                                    const total = stats.totalMaintenances || 1;
                                    const percentage = (count / total) * 100;
                                    const offset = arr.slice(0, i).reduce((acc, [_, c]) => acc + (c / total) * 100, 0);
                                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                                    return (
                                        <circle
                                            key={type}
                                            cx="18" cy="18" r="15.9"
                                            fill="transparent"
                                            stroke={colors[i % colors.length]}
                                            strokeWidth="3.8"
                                            strokeDasharray={`${percentage} ${100 - percentage}`}
                                            strokeDashoffset={-offset}
                                        ></circle>
                                    );
                                })}
                            </svg>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '800' }}>{stats.totalMaintenances}</div>
                                <div style={{ fontSize: '10px', color: '#64748b' }}>TOTAL</div>
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            {Object.entries(stats.maintDistribution).map(([type, count], i) => {
                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                                return (
                                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '14px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors[i % colors.length] }}></div>
                                        <span style={{ fontWeight: '500' }}>{type}</span>
                                        <span style={{ marginLeft: 'auto', color: '#64748b' }}>{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Progress Tracking */}
                <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', gridColumn: '1 / -1' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '700' }}>Estado de Cursos (Horas Realizadas vs Totales)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                        {stats.courseIntensity.map(course => {
                            const percent = Math.min((course.programmedHours / (course.totalHours || 1)) * 100, 100);
                            return (
                                <div key={course.name} style={{ textAlign: 'center', padding: '16px', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                                    <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '12px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{course.name}</div>
                                    <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 12px' }}>
                                        <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                                            <circle cx="18" cy="18" r="16" fill="transparent" stroke="#f1f5f9" strokeWidth="4"></circle>
                                            <circle cx="18" cy="18" r="16" fill="transparent" stroke="#8b5cf6" strokeWidth="4" strokeDasharray={`${percent} 100`}></circle>
                                        </svg>
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: '700', fontSize: '12px' }}>
                                            {Math.round(percent)}%
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                        {course.programmedHours}/{course.totalHours} Horas
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }) {
    return (
        <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', borderLeft: `6px solid ${color}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>{title}</div>
                <div style={{ fontSize: '28px', fontWeight: '800' }}>{value}</div>
            </div>
            <div style={{ fontSize: '32px' }}>{icon}</div>
        </div>
    );
}

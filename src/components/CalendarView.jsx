import { useState, useMemo, useEffect } from 'react';
import DatePicker from './DatePicker';
import './AdminMenu.css';
import './CalendarView.css';

const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function CalendarView({ events, type }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDayEvents, setSelectedDayEvents] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);

    const [viewMode, setViewMode] = useState('month');

    const { days, viewTitle, year } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const date = currentDate.getDate();
        if (viewMode === 'month') {
            const firstDayOfMonth = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const days = [];
            for (let i = 0; i < firstDayOfMonth; i++) {
                days.push({ day: null, key: `empty-${i}` });
            }
            for (let i = 1; i <= daysInMonth; i++) {
                days.push({
                    day: i,
                    dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
                    key: `day-${i}`
                });
            }
            return { days, viewTitle: monthNames[month], year };
        } else if (viewMode === 'week') {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(date - currentDate.getDay());
            const days = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(startOfWeek);
                d.setDate(startOfWeek.getDate() + i);
                days.push({
                    day: d.getDate(),
                    dateString: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
                    key: `week-${i}`,
                    weekday: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][i]
                });
            }
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            let title = `${monthNames[startOfWeek.getMonth()]}`;
            if (startOfWeek.getMonth() !== endOfWeek.getMonth()) {
                title += ` - ${monthNames[endOfWeek.getMonth()]}`;
            }
            return { days, viewTitle: title, year };
        } else {
            // Day view
            return {
                days: [{
                    day: date,
                    dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`,
                    key: 'single-day'
                }],
                viewTitle: `${monthNames[month]} ${date}`,
                year
            };
        }
    }, [currentDate, viewMode]);

    const navigate = (offset) => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') {
            newDate.setMonth(currentDate.getMonth() + offset);
            newDate.setDate(1);
        } else if (viewMode === 'week') {
            newDate.setDate(currentDate.getDate() + (offset * 7));
        } else {
            newDate.setDate(currentDate.getDate() + offset);
        }
        setCurrentDate(newDate);
        setSelectedDayEvents(null);
        setSelectedDate(null);
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const parts = timeStr.split(':');
        return `${parts[0]}:${parts[1]}`;
    };

    const getEventColor = (event) => {
        const colors = [
            '#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899',
            '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16', '#ef4444'
        ];
        // Mirroring maint logic: Simulator ID is the primary key for color
        const id = event.simulator?.id || event.course?.simulator?.id || event.course?.id || 0;
        return colors[id % colors.length];
    };

    const getEventLabel = (event) => {
        const simName = event.simulator?.name || event.course?.simulator?.name || '';
        const name = type === 'course'
            ? (event.course?.name || 'Curso')
            : (event.maintenanceType?.name || 'Mantenimiento');

        return simName ? `${simName} | ${name}` : name;
    };

    const getEventTime = (event) => {
        const start = event.horaini || event.horaIni;
        const end = event.horafin || event.horaFin;
        return (start && end) ? `${formatTime(start)} – ${formatTime(end)}` : null;
    };

    const getEventsForDay = (dateString) => {
        return events.filter(event => {
            let eventDate = event.fecha || event.fecIni;
            if (!eventDate) return false;
            // If it's a full ISO string, take only the date part
            if (eventDate.includes('T')) {
                eventDate = eventDate.split('T')[0];
            }
            return eventDate === dateString;
        });
    };

    const handleDayClick = (dayObj) => {
        if (!dayObj.day) return;
        const dayEvents = getEventsForDay(dayObj.dateString);
        setSelectedDate(dayObj.dateString);
        setSelectedDayEvents(dayEvents);
    };

    // Auto-select day in day view
    useEffect(() => {
        if (viewMode === 'day') {
            const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
            setSelectedDate(dateString);
            setSelectedDayEvents(getEventsForDay(dateString));
        }
    }, [viewMode, currentDate, events]);

    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return (
        <div className="calendar-wrapper">
            <div className="calendar-container">
                {/* Header */}
                <div className="calendar-header">
                    <div className="calendar-nav-group">
                        <button className="btn-calendar-nav" onClick={() => navigate(-1)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <button className="btn-calendar-today" onClick={() => setCurrentDate(new Date())}>Hoy</button>
                        <button className="btn-calendar-nav" onClick={() => navigate(1)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>

                    <div className="calendar-title-wrapper">
                        <div className="calendar-selectors-menu">
                            <select
                                className="calendar-select-menu"
                                value={currentDate.getMonth()}
                                onChange={(e) => {
                                    const d = new Date(currentDate);
                                    d.setMonth(parseInt(e.target.value));
                                    d.setDate(1);
                                    setCurrentDate(d);
                                }}
                            >
                                {monthNames.map((name, i) => (
                                    <option key={i} value={i}>{name}</option>
                                ))}
                            </select>

                            <select
                                className="calendar-select-menu year"
                                value={currentDate.getFullYear()}
                                onChange={(e) => {
                                    const d = new Date(currentDate);
                                    d.setFullYear(parseInt(e.target.value));
                                    setCurrentDate(d);
                                }}
                            >
                                {Array.from({ length: 11 }, (_, i) => currentDate.getFullYear() - 5 + i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>

                            <div className="calendar-date-selector" title="Escoger día específico">
                                <DatePicker
                                    value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`}
                                    onChange={(e) => {
                                        const dateStr = e.target.value;
                                        const [y, m, d] = dateStr.split('-').map(Number);
                                        if (y && m && d) {
                                            setCurrentDate(new Date(y, m - 1, d));
                                            setSelectedDate(dateStr);
                                            setSelectedDayEvents(getEventsForDay(dateStr));
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="calendar-view-switcher">
                        <button
                            className={`btn-view-mode ${viewMode === 'month' ? 'active' : ''}`}
                            onClick={() => setViewMode('month')}
                        >Mes</button>
                        <button
                            className={`btn-view-mode ${viewMode === 'week' ? 'active' : ''}`}
                            onClick={() => setViewMode('week')}
                        >Semana</button>
                        <button
                            className={`btn-view-mode ${viewMode === 'day' ? 'active' : ''}`}
                            onClick={() => setViewMode('day')}
                        >Día</button>
                    </div>
                </div>

                {/* Weekday Labels (Only for Month and Week) */}
                {viewMode !== 'day' && (
                    <div className={`calendar-grid-header ${viewMode}-view`}>
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                            <div key={d} className="calendar-weekday">{d}</div>
                        ))}
                    </div>
                )}

                {/* Day Cells */}
                <div className={`calendar-grid ${viewMode}-view`}>
                    {days.map(dayObj => {
                        const dayEvents = dayObj.day ? getEventsForDay(dayObj.dateString) : [];
                        const isToday = dayObj.dateString === todayString;
                        const isSelected = dayObj.dateString === selectedDate;

                        return (
                            <div
                                key={dayObj.key}
                                className={`calendar-day ${dayObj.day === null ? 'empty' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayEvents.length > 0 ? 'has-events' : ''} ${viewMode}-day`}
                                onClick={() => dayObj.day && (viewMode === 'day' ? null : handleDayClick(dayObj))}
                            >
                                {dayObj.day && (
                                    <>
                                        <div className="day-header">
                                            <span className="day-number">{dayObj.day}</span>
                                            {viewMode === 'week' && <span className="day-weekday-label">{dayObj.weekday}</span>}
                                        </div>
                                        <div className="day-events">
                                            {(viewMode === 'month' ? dayEvents.slice(0, 3) : dayEvents).map((ev, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`calendar-event event-${type} ${viewMode}-event`}
                                                    style={{
                                                        borderLeftColor: getEventColor(ev),
                                                        backgroundColor: `${getEventColor(ev)}15`,
                                                        color: getEventColor(ev)
                                                    }}
                                                    title={`${getEventLabel(ev)}${getEventTime(ev) ? ' · ' + getEventTime(ev) : ''}`}
                                                    onClick={(e) => {
                                                        if (viewMode === 'day' || viewMode === 'week') {
                                                            e.stopPropagation();
                                                            handleDayClick(dayObj);
                                                        }
                                                    }}
                                                >
                                                    <span className="event-label">{getEventLabel(ev)}</span>
                                                    {getEventTime(ev) && (
                                                        <span className="event-time">{getEventTime(ev)}</span>
                                                    )}
                                                </div>
                                            ))}
                                            {viewMode === 'month' && dayEvents.length > 3 && (
                                                <div className="event-more">+{dayEvents.length - 3} más</div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Detail Sidebar */}
            {selectedDayEvents !== null && (
                <div className="calendar-detail">
                    <div className="calendar-detail-header">
                        <h4>
                            {selectedDate
                                ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
                                : 'Detalle'}
                        </h4>
                        <button className="btn-close-detail" onClick={() => { setSelectedDayEvents(null); setSelectedDate(null); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    {selectedDayEvents.length === 0 ? (
                        <div className="calendar-detail-empty">
                            <p>No hay eventos programados para este día</p>
                        </div>
                    ) : (
                        <ul className="calendar-detail-list">
                            {selectedDayEvents.map((ev, idx) => {
                                const timeStr = getEventTime(ev);
                                return (
                                    <li key={idx} className={`calendar-detail-item event-${type}-item`}>
                                        <div className="detail-color-bar" style={{ backgroundColor: getEventColor(ev) }}></div>
                                        <div className="detail-content">
                                            <span className="detail-title">{getEventLabel(ev)}</span>
                                            {timeStr && (
                                                <div className="detail-time">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <polyline points="12 6 12 12 16 14"></polyline>
                                                    </svg>
                                                    {timeStr}
                                                </div>
                                            )}

                                            {/* Unified Metadata Hierarchy */}
                                            <div className="detail-meta-group">
                                                {(ev.simulator?.name || ev.course?.simulator?.name) && (
                                                    <div className="detail-meta">🎮 Simulador: {ev.simulator?.name || ev.course?.simulator?.name}</div>
                                                )}

                                                {type === 'course' ? (
                                                    <>
                                                        {ev.course?.name && <div className="detail-meta">📚 Curso: {ev.course.name}</div>}
                                                        {ev.course?.rooms?.length > 0 && <div className="detail-meta">🏫 Aula: {ev.course.rooms.map(r => r.name).join(', ')}</div>}
                                                        {(ev.course?.instructor || ev.instructor) && (
                                                            <div className="detail-meta">👤 Instructor: {(ev.course?.instructor || ev.instructor).firstName} {(ev.course?.instructor || ev.instructor).lastname}</div>
                                                        )}
                                                        {(ev.course?.pseudoPilot || ev.pseudoPilot) && (
                                                            <div className="detail-meta">👤 Pseudopiloto: {(ev.course?.pseudoPilot || ev.pseudoPilot).firstName} {(ev.course?.pseudoPilot || ev.pseudoPilot).lastname}</div>
                                                        )}
                                                        {ev.course?.coordinator && (
                                                            <div className="detail-meta">⚙️ Gestión: {ev.course.coordinator.firstName} {ev.course.coordinator.lastname}</div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        {ev.maintenanceType?.name && <div className="detail-meta">🔧 Tipo: {ev.maintenanceType.name}</div>}
                                                        {ev.technician && <div className="detail-meta">👤 Técnico: {ev.technician.firstName} {ev.technician.lastname}</div>}
                                                        {ev.fecFin && ev.fecFin !== ev.fecIni && <div className="detail-meta">📅 Hasta: {ev.fecFin}</div>}
                                                        {ev.horas && <div className="detail-meta" style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>⏱️ Duración: {ev.horas}h</div>}
                                                    </>
                                                )}

                                                {/* Common Footers */}
                                                {ev.description && <div className="detail-desc">📝 {ev.description}</div>}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

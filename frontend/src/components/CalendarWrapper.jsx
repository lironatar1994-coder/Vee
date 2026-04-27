import React, { useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useDroppable } from '@dnd-kit/core';

const DEFAULT_HE_LOCALE = {
    code: 'he',
    week: {
        dow: 0, // Sunday is first day
        doy: 6  // The week that contains Jan 1st is the first week of the year
    },
    buttonText: {
        prev: 'הקודם',
        next: 'הבא',
        today: 'היום',
        month: 'חודש',
        week: 'שבוע',
        day: 'יום',
        list: 'סדר יום'
    },
    weekText: 'שבוע',
    allDayText: 'כל היום',
    moreLinkText: 'נוספים',
    noEventsText: 'אין אירועים להצגה'
};

const CalendarWrapper = ({
    events,
    onDateClick,
    onEventClick,
    onEventDrop,
    onEventResize,
    onDatesSet,
    onMoreLinkClick,
    initialDate,
    initialView = 'dayGridMonth',
    headerToolbar = {
        right: 'timeGridDay,timeGridWeek,dayGridMonth',
        center: 'title',
        left: 'prev,next today'
    },
    height = '100%',
    viewMode,
    onDragEnd, // Optional: handle drops if needed
    isDraggingFAB = false // New prop to indicate if a FAB is being dragged
}, ref) => {
    const calendarRef = useRef(null);
    const { isOver, setNodeRef } = useDroppable({
        id: 'calendar-drop-zone',
        data: { type: 'Calendar' }
    });

    // Expose helpers to parent
    React.useImperativeHandle(ref, () => ({
        getApi: () => calendarRef.current?.getApi(),
        getDateTimeAtPoint: (x, y) => {
            // Find ALL elements at the drop point
            const elements = document.elementsFromPoint(x, y);
            if (!elements || elements.length === 0) return null;

            // Find the first element that has (or is inside) a cell with data-date
            const cell = elements.map(el => el.closest('[data-date]')).find(Boolean);
            if (cell) {
                const dateAttr = cell.getAttribute('data-date');
                if (dateAttr) {
                    const [date, time] = dateAttr.split('T');
                    return {
                        date,
                        time: time ? time.substring(0, 5) : null
                    };
                }
            }
            return null;
        }
    }));

    // Sync external viewMode with internal FullCalendar view if viewMode prop is provided
    useEffect(() => {
        if (viewMode && calendarRef.current) {
            const api = calendarRef.current.getApi();
            if (!api) return;

            const targetView = viewMode === 'monthly' ? 'dayGridMonth' : 
                               viewMode === 'weekly' ? 'timeGridWeek' : 
                               viewMode === 'daily' ? 'timeGridDay' : null;

            if (targetView && api.view.type !== targetView) {
                // Use setTimeout to avoid 'flushSync was called from inside a lifecycle method' error
                // by pushing the imperative update to the next tick.
                setTimeout(() => {
                    api.changeView(targetView);
                }, 0);
            }
        }
    }, [viewMode]);

    // Granular Drop Highlights
    useEffect(() => {
        const onMove = (e) => {
            const { x, y } = e.detail;
            
            // Remove previous highlight
            document.querySelectorAll('.fc-drop-highlight').forEach(el => el.classList.remove('fc-drop-highlight'));
            
            const elements = document.elementsFromPoint(x, y);
            
            // Find the most specific calendar cell element
            // In Monthly view: .fc-daygrid-day
            // In TimeGrid view: .fc-timegrid-slot-lane or .fc-timegrid-col
            const col = elements.find(el => el.classList.contains('fc-timegrid-col') || el.classList.contains('fc-daygrid-day'));
            const slot = elements.find(el => el.classList.contains('fc-timegrid-slot-lane'));
            
            if (col && slot) {
                // Precise TimeGrid slot (intersection of day column and time row)
                // Since the slot lane is wide, we highlight it, but we can see the column too.
                // We'll highlight the column but maybe use the slot's y/height.
                // This is the most granular 1-hour hint.
                const rect = col.getBoundingClientRect();
                const slotRect = slot.getBoundingClientRect();
                
                // For the best visual, we'll look for or create a highlight element
                // But simpler: highlight BOTH the column and the slot if possible.
                // Or find the specific element under the pointer that has data-date
                col.classList.add('fc-drop-highlight');
                slot.classList.add('fc-drop-highlight-slot');
            } else if (col) {
                // Fallback for DayGrid (Month view)
                col.classList.add('fc-drop-highlight');
            }
        };

        const onEnd = () => {
            document.querySelectorAll('.fc-drop-highlight').forEach(el => el.classList.remove('fc-drop-highlight'));
            document.querySelectorAll('.fc-drop-highlight-slot').forEach(el => el.classList.remove('fc-drop-highlight-slot'));
        };

        window.addEventListener('fabDragMove', onMove);
        window.addEventListener('fabDragEnd', onEnd);
        return () => {
            window.removeEventListener('fabDragMove', onMove);
            window.removeEventListener('fabDragEnd', onEnd);
        };
    }, []);

    return (
        <div ref={setNodeRef} className={`calendar-wrapper-container ${isOver ? 'is-over' : ''}`} style={{ height }}>
            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialDate={initialDate}
                initialView={initialView}
                locales={[DEFAULT_HE_LOCALE]}
                locale="he"
                direction="rtl"
                headerToolbar={headerToolbar}
                events={events}
                editable={isDraggingFAB ? false : true} // Avoid mirrors when dragging FAB
                selectable={isDraggingFAB ? false : true}
                selectMirror={isDraggingFAB ? false : true}
                unselectAuto={true}
                longPressDelay={50}
                dayMaxEvents={3}
                moreLinkContent={(arg) => `עוד ${arg.num}`}
                moreLinkClick={(arg) => {
                    if (onMoreLinkClick) return onMoreLinkClick(arg);
                    return true;
                }}
                weekends={true}
                height={height}
                navLinks={true}

                // Event Callbacks
                dateClick={onDateClick}
                eventClick={onEventClick}
                eventDrop={onEventDrop}
                eventResize={onEventResize}
                datesSet={onDatesSet}

                // Aesthetic overrides
                slotMinTime="06:00:00"
                slotMaxTime="24:00:00"
                slotDuration="01:00:00"
                scrollTime="08:00:00"
                nowIndicator={true}

                dayHeaderFormat={{ weekday: 'short' }}
                dayHeaderContent={(arg) => {
                    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
                    const dayName = days[arg.date.getDay()];
                    
                    if (arg.view.type === 'dayGridMonth') {
                        return dayName;
                    }
                    
                    // For weekly/daily views, custom 2-line layout
                    const dateNum = arg.date.getDate();
                    return (
                        <div className="custom-day-header">
                            <div className="day-name">{dayName}</div>
                            <div className={`date-number ${arg.isToday ? 'is-today' : ''}`}>
                                {dateNum}
                            </div>
                        </div>
                    );
                }}

                // Custom event rendering for modern UI
                eventContent={(arg) => {
                    const { event, timeText, view } = arg;
                    const isCompleted = event.extendedProps.completed;
                    const isGoogle = event.extendedProps.isGoogleEvent;
                    const googleClass = isGoogle ? 'is-google-event' : '';

                    // Month Grid view: Minimalist themed pill based on priority
                    if (view.type === 'dayGridMonth') {
                        const priority = event.extendedProps.priority || 4;
                        return (
                            <div className={`fc-custom-event-month priority-${priority} ${isCompleted ? 'is-completed' : ''} ${googleClass}`}>
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{event.title}</span>
                                {timeText && <span className="event-time">{timeText}</span>}
                            </div>
                        );
                    }

                    // All Day event in Daily/Weekly views (Solid Block)
                    if (event.allDay) {
                        return (
                            <div className={`fc-custom-event-allday-block ${isCompleted ? 'is-completed' : ''} ${googleClass}`}>
                                <span className="event-title">{event.title}</span>
                            </div>
                        );
                    }

                    // Timed view (Weekly/Daily slots) -> Solid Block, no checkbox
                    return (
                        <div className={`fc-custom-event-timed ${isCompleted ? 'is-completed' : ''} ${googleClass}`}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                <span className="event-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</span>
                                {timeText && <span className="event-time">{timeText}</span>}
                            </div>
                        </div>
                    );
                }}
            />
        </div>
    );
};

export default React.forwardRef(CalendarWrapper);

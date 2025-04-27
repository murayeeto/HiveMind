import React, { useState, useEffect } from 'react';
import './Calendar.css';
import { useAuth } from '../contexts/AuthContext';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import firebase from '../firebase';
import { GiHoneycomb, GiBee } from 'react-icons/gi';

const Calendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [events, setEvents] = useState({});
  const [newEvent, setNewEvent] = useState({
    hour: '9',
    minute: '00',
    period: 'AM',
    title: '',
    color: '#FFD700'
  });

  // Load events from Firebase
  useEffect(() => {
    const loadEvents = async () => {
      if (!user) return;

      try {
        const eventsRef = doc(firebase.db, 'users', user.uid, 'data', 'events');
        const eventsSnap = await getDoc(eventsRef);

        if (eventsSnap.exists()) {
          setEvents(eventsSnap.data().events || {});
        }
      } catch (error) {
        console.error("Error loading events:", error);
      }
    };

    loadEvents();
    window.scrollTo(0, 0);
  }, [user]);

  const today = new Date();
  const month = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  // Calendar generation
  const daysInMonth = new Date(year, currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, currentDate.getMonth(), 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const downloadICS = () => {
    if (!events || Object.keys(events).length === 0) {
      alert("No events to export!");
      return;
    }
  
    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//BeeProductive//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ].join("\n");
  
    for (const dateKey in events) {
      if (!events.hasOwnProperty(dateKey)) continue;
      
      const eventDay = events[dateKey];
      if (!eventDay) continue;
  
      for (const timeValue in eventDay) {
        if (!eventDay.hasOwnProperty(timeValue)) continue;
        
        const event = eventDay[timeValue];
        if (!event) continue;
  
        // Parse the date more reliably
        const [year, month, day] = dateKey.split('-');
        const eventDate = new Date(Date.UTC(year, month - 1, day));
        
        // Calculate start time (timeValue is hours as float)
        const hours = Math.floor(parseFloat(timeValue));
        const minutes = Math.round((parseFloat(timeValue) - hours) * 60);
        const startTime = new Date(eventDate);
        startTime.setHours(hours, minutes, 0);
        
        // End time (1 hour duration)
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
  
        const formatDate = (date) => {
          return date.toISOString().replace(/[-:.]/g, '').split('T')[0] + 'Z';
        };
  
        icsContent += "\n" + [
          "BEGIN:VEVENT",
          `UID:${event.id}@beeproductive`,
          `DTSTAMP:${formatDate(new Date())}`,
          `DTSTART:${formatDate(startTime)}`,
          `DTEND:${formatDate(endTime)}`,
          `SUMMARY:${event.title.replace(/\n/g, '\\n')}`,
          `DESCRIPTION:${event.title.replace(/\n/g, '\\n')}`,
          "END:VEVENT"
        ].join("\n");
      }
    }
  
    icsContent += "\nEND:VCALENDAR";
  
    // Create download
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
  
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hivemind-calendar.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  

  const changeMonth = (offset) => {
    setCurrentDate(new Date(year, currentDate.getMonth() + offset, 1));
    setSelectedDay(null);
  };

  const isCurrentDay = (day) => {
    return day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      year === today.getFullYear();
  };

  const handleDayClick = (day) => {
    if (!day) return;
    setSelectedDay(new Date(year, currentDate.getMonth(), day));
  };

  const closeDayView = () => {
    setSelectedDay(null);
  };

  const formatDateKey = (date) => {
    return date.toISOString().split('T')[0];
  };

  const convertToTimeValue = (hour, minute, period) => {
    let hour24 = parseInt(hour);
    minute = parseInt(minute);

    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    if (period === 'AM' && hour24 === 12) hour24 = 0;

    return hour24 + (minute / 60);
  };

  const addTimeEvent = async () => {
    if (!newEvent.title || !user || !selectedDay) return;

    const timeValue = convertToTimeValue(newEvent.hour, newEvent.minute, newEvent.period);
    const dateKey = formatDateKey(selectedDay);

    const newEvents = {
      ...events,
      [dateKey]: {
        ...events[dateKey],
        [timeValue]: {
          id: Date.now(),
          title: newEvent.title,
          color: newEvent.color,
          displayTime: `${newEvent.hour}:${newEvent.minute} ${newEvent.period}`
        }
      }
    };

    try {
      const eventsRef = doc(firebase.db, 'users', user.uid, 'data', 'events');
      await setDoc(eventsRef, { events: newEvents }, { merge: true });
      setEvents(newEvents);
      setNewEvent({
        hour: '9',
        minute: '00',
        period: 'AM',
        title: '',
        color: '#FFD700'
      });
    } catch (error) {
      console.error("Error saving event:", error);
    }
  };

  const deleteEvent = async (dateKey, timeValue) => {
    if (!user) return;

    try {
      const eventsRef = doc(firebase.db, 'users', user.uid, 'data', 'events');
      const eventsSnap = await getDoc(eventsRef);

      if (eventsSnap.exists()) {
        const currentEvents = eventsSnap.data().events || {};
        
        if (currentEvents[dateKey] && currentEvents[dateKey][timeValue]) {
          delete currentEvents[dateKey][timeValue];
          
          if (Object.keys(currentEvents[dateKey]).length === 0) {
            delete currentEvents[dateKey];
          }

          await setDoc(eventsRef, { events: currentEvents });
          setEvents(currentEvents);
        }
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const getDayEvents = (day) => {
    if (!day) return [];
    const date = new Date(year, currentDate.getMonth(), day);
    const dateKey = formatDateKey(date);
    return events[dateKey] ? Object.values(events[dateKey]) : [];
  };

  // Generate time options
  const hourOptions = Array.from({ length: 12 }, (_, i) => (
    <option key={i + 1} value={i + 1}>{i + 1}</option>
  ));

  const minuteOptions = Array.from({ length: 60 }, (_, i) => (
    <option key={i} value={i.toString().padStart(2, '0')}>
      {i.toString().padStart(2, '0')}
    </option>
  ));

  // Get events for selected day
  const dayEvents = selectedDay ? events[formatDateKey(selectedDay)] || {} : {};

  return (
    <div className="calendar-container dark-theme">
      <div className="calendar">
        {selectedDay ? (
          <div className="day-view-expanded">
            <div className="day-header">
              <button onClick={closeDayView} className="back-btn">
                ← Back to Calendar
              </button>
              <h2>
                <GiHoneycomb className="honeycomb-icon" /> 
                {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                

              </h2>
            </div>

            <div className="day-content-wrapper">
              {/* Timeline Section */}
              <div className="timeline-container">
                {/* Time Labels Column */}
                <div className="time-labels">
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <div 
                      key={`label-${hour}`}
                      className="time-label"
                      style={{ top: `${hour * 60}px` }}
                    >
                      {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                    </div>
                  ))}
                </div>
                
                {/* Events Column */}
                <div className="events-column">
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <div 
                      key={`line-${hour}`} 
                      className="hour-line"
                      style={{ top: `${hour * 60}px` }}
                    ></div>
                  ))}
                  
                  <div className="events-container">
                    {Object.entries(dayEvents).map(([time, event]) => (
                      <div
                        key={event.id}
                        className="event"
                        style={{
                          top: `${parseFloat(time) * 60}px`,
                          backgroundColor: event.color || '#FFD700',
                          border: '2px solid #222'
                        }}
                      >
                        <span className="event-time">{event.displayTime}</span>
                        <span className="event-title">{event.title}</span>
                        <button 
                          className="delete-btn" 
                          onClick={() => deleteEvent(formatDateKey(selectedDay), time)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="add-event-form">
                <h3>Add New Study Session</h3>
                <div className="form-group">
                  <label>Time:</label>
                  <div className="time-inputs">
                    <select value={newEvent.hour} onChange={(e) => setNewEvent({ ...newEvent, hour: e.target.value })}>
                      {hourOptions}
                    </select>
                    <span>:</span>
                    <select value={newEvent.minute} onChange={(e) => setNewEvent({ ...newEvent, minute: e.target.value })}>
                      {minuteOptions}
                    </select>
                    <select value={newEvent.period} onChange={(e) => setNewEvent({ ...newEvent, period: e.target.value })}>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Title:</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Study topic"
                  />
                </div>
                <div className="form-group">
                  <label>Color:</label>
                  <input
                    type="color"
                    value={newEvent.color}
                    onChange={(e) => setNewEvent({ ...newEvent, color: e.target.value })}
                  />
                </div>
                <button onClick={addTimeEvent} className="add-btn">
                  <GiHoneycomb className="icon" /> Add Event
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="month-header">
              <button onClick={() => changeMonth(-1)} className="nav-btn">
                ←
              </button>
              <h2>
                <GiBee className="bee-icon" /> {month} {year} <button onClick={downloadICS} className="download-btn">Export Calendar</button>
              </h2>
              <button onClick={() => changeMonth(1)} className="nav-btn">
                →
              </button>
            </div>

            <div className="days-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="day-name">
                  {day}
                </div>
              ))}

              {days.map((day, i) => (
                <div
                  key={day || `empty-${i}`}
                  className={`day-cell ${!day ? 'empty' : isCurrentDay(day) ? 'current' : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  {day && (
                    <>
                      <div className="date-number">{day}</div>
                      {isCurrentDay(day) && (
                        <div className="today-badge">
                          <GiBee className="today-icon" />
                        </div>
                      )}
                      <div className="events">
                        {getDayEvents(day).slice(0, 3).map(event => ( // Show max 3 events
                          <div
                            key={event.id}
                            className="event-preview"
                            style={{ 
                              backgroundColor: event.color,
                              borderLeft: `3px solid ${event.color}`
                            }}
                          >
                            <span className="event-time">{event.displayTime.replace(/:00 /, ' ')}</span>
                            <span className="event-name">{event.title}</span>
                          </div>
                        ))}
                        {getDayEvents(day).length > 3 && (
                          <div className="more-events-indicator">
                            +{getDayEvents(day).length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Calendar;
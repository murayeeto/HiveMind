import { doc, setDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import firebase from '../firebase';

export const useSessionHandlers = (user, sessions, setSessions, collectionName, onSessionUpdate) => {
    const handleJoinSession = async (sessionId) => {
        try {
            const sessionRef = doc(firebase.db, collectionName, sessionId);
            const session = sessions.find(s => s.id === sessionId);
            
            const maxParticipants = collectionName === 'sessions' ? 2 : session.capacity;
            
            if (session.participants?.length >= maxParticipants) {
                alert("Session is full, please join another one");
                return;
            }

            // Get current session data
            const sessionDoc = await getDoc(sessionRef);
            const currentData = sessionDoc.data();
            
            // Create or update participant info
            const newParticipant = {
                uid: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL
            };

            // Remove existing participant entry if it exists (to update their info)
            let updatedParticipants = [...(currentData.participants || [])].filter(p => p.uid !== user.uid);
            
            // Add the participant with current info
            updatedParticipants.push(newParticipant);
            const isFull = updatedParticipants.length >= maxParticipants;

            // Update session data
            const updates = {
                participants: updatedParticipants,
                full: isFull,
                updatedAt: serverTimestamp()
            };

            // If user is the session owner, update their info
            if (currentData.userId === user.uid) {
                updates.displayName = user.displayName;
                updates.photoURL = user.photoURL;
            }

            await setDoc(sessionRef, updates, { merge: true });

            // Add to calendar
            await addToCalendar(session, collectionName, user);

            // Update local state and trigger refresh
            setSessions(prevSessions =>
                prevSessions.map(s =>
                    s.id === sessionId
                        ? {
                            ...s,
                            participants: updatedParticipants,
                            full: isFull
                        }
                        : s
                )
            );
            
            if (onSessionUpdate) {
                await onSessionUpdate();
            }
        } catch (error) {
            console.error("Error joining session:", error);
        }
    };

    const handleLeaveSession = async (sessionId) => {
        try {
            const sessionRef = doc(firebase.db, collectionName, sessionId);
            const session = sessions.find(s => s.id === sessionId);
            
            // Remove from calendar
            await removeFromCalendar(session, user);
            
            // Get current session data
            const sessionDoc = await getDoc(sessionRef);
            const currentData = sessionDoc.data();
            
            // Filter out the user by uid only
            const updatedParticipants = currentData.participants.filter(p => p.uid !== user.uid);
            
            await setDoc(sessionRef, {
                participants: updatedParticipants,
                full: false,
                updatedAt: serverTimestamp()
            }, { merge: true });

            // Update local state and trigger refresh
            setSessions(prevSessions =>
                prevSessions.map(s =>
                    s.id === sessionId
                        ? {
                            ...s,
                            participants: s.participants.filter(p => p.uid !== user.uid),
                            full: false
                        }
                        : s
                )
            );

            if (onSessionUpdate) {
                await onSessionUpdate();
            }
        } catch (error) {
            console.error("Error leaving session:", error);
        }
    };

    const handleDisbandSession = async (sessionId) => {
        try {
            const session = sessions.find(s => s.id === sessionId);
            const sessionRef = doc(firebase.db, collectionName, sessionId);
            
            // Remove from calendar
            await removeFromCalendar(session, user);
            
            // Delete session
            await deleteDoc(sessionRef);

            // Update local state and trigger refresh
            setSessions(prevSessions =>
                prevSessions.filter(s => s.id !== sessionId)
            );

            if (onSessionUpdate) {
                await onSessionUpdate();
            }
        } catch (error) {
            console.error("Error disbanding session:", error);
        }
    };

    return { handleJoinSession, handleLeaveSession, handleDisbandSession };
};

export const addToCalendar = async (sessionData, collectionName, user) => {
    try {
        // Create date in local timezone
        const [datePart, timePart] = sessionData.dateTime.split('T');
        const [hours, minutes] = timePart.split(':');
        const date = new Date(datePart);
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        
        const dateKey = datePart;
        const period = parseInt(hours, 10) >= 12 ? 'PM' : 'AM';
        const displayHours = parseInt(hours, 10) % 12 || 12;
        const timeValue = parseInt(hours, 10) + (parseInt(minutes, 10) / 60);

        // Get current calendar events
        const eventsRef = doc(firebase.db, 'users', user.uid, 'data', 'events');
        const eventsSnap = await getDoc(eventsRef);
        const currentEvents = eventsSnap.exists() ? eventsSnap.data().events || {} : {};

        // Create new event
        const newEvents = {
            ...currentEvents,
            [dateKey]: {
                ...(currentEvents[dateKey] || {}),
                [timeValue]: {
                    id: Date.now(),
                    title: `${collectionName === 'sessions' ? 'Study' : 'Group Study'}: ${sessionData.course}`,
                    color: collectionName === 'sessions' ? '#00A7E3' : '#4BC0C0',
                    displayTime: `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
                }
            }
        };

        // Update Firebase
        await setDoc(eventsRef, { events: newEvents }, { merge: true });
    } catch (error) {
        console.error("Error adding to calendar:", error);
    }
};

export const removeFromCalendar = async (sessionData, user) => {
    try {
        const [datePart, timePart] = sessionData.dateTime.split('T');
        const [hours, minutes] = timePart.split(':');
        const timeValue = parseInt(hours, 10) + (parseInt(minutes, 10) / 60);
        const dateKey = datePart;

        // Get current calendar events
        const eventsRef = doc(firebase.db, 'users', user.uid, 'data', 'events');
        const eventsSnap = await getDoc(eventsRef);
        
        if (eventsSnap.exists()) {
            const currentEvents = eventsSnap.data().events || {};
            
            if (currentEvents[dateKey] && currentEvents[dateKey][timeValue]) {
                delete currentEvents[dateKey][timeValue];
                
                // Clean up empty dates
                if (Object.keys(currentEvents[dateKey]).length === 0) {
                    delete currentEvents[dateKey];
                }
                
                // Update Firebase
                await setDoc(eventsRef, { events: currentEvents });
            }
        }
    } catch (error) {
        console.error("Error removing from calendar:", error);
    }
};
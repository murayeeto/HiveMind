import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, getDocs, where } from 'firebase/firestore';
import { FaRobot, FaShareAlt } from 'react-icons/fa';
import axios from 'axios';
import firebase from '../firebase';
import './ChatWindow.css';

/**
 * ChatWindow Component
 * Provides real-time chat functionality with AI integration for both duo and group study sessions.
 *
 * @param {string} sessionId - Unique identifier for the chat session
 * @param {boolean} isOpen - Controls chat window visibility
 * @param {function} onClose - Handler for closing the chat window
 * @param {boolean} isHornet - Indicates if user has AI assistant privileges
 */
const ChatWindow = ({ sessionId, isOpen, onClose, isHornet }) => {
    // Check if this is a group session based on URL
    const isGroupSession = window.location.pathname.includes('group');
    
    // State management for chat functionality
    const [messages, setMessages] = useState([]); // Chat message history
    const [newMessage, setNewMessage] = useState(''); // Current message input
    const [showAiButtons, setShowAiButtons] = useState(false); // AI feature visibility toggle
    const [charCount, setCharCount] = useState(0); // Message length counter
    const [loading, setLoading] = useState(false); // Loading state for AI operations
    const [showRecommendModal, setShowRecommendModal] = useState(false); // Modal for recommendation type
    const [showShareModal, setShowShareModal] = useState(false); // Modal for sharing flashcard sets
    const [flashcardSets, setFlashcardSets] = useState([]); // User's flashcard sets
    const messagesContainerRef = useRef(null); // Reference for auto-scrolling
    const MAX_CHARS = 400; // Maximum characters per message
    
    // Set up real-time listener for chat messages
    useEffect(() => {
        if (!sessionId) return;

        let unsubscribe = () => {};

        const setupMessagesListener = async () => {
            try {
                // Smart collection detection: tries group sessions first, then falls back to duo sessions
                let collectionPath = 'groupSessions';
                let sessionDocRef = doc(firebase.db, collectionPath, sessionId);
                let sessionDoc = await getDoc(sessionDocRef);

                if (!sessionDoc.exists()) {
                    collectionPath = 'sessions';
                    sessionDocRef = doc(firebase.db, collectionPath, sessionId);
                }

                // Set up real-time updates for messages
                const messagesRef = collection(sessionDocRef, 'messages');
                const q = query(messagesRef, orderBy('timestamp', 'asc'));

                unsubscribe = onSnapshot(q, (snapshot) => {
                    const newMessages = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setMessages(newMessages);
                });
            } catch (error) {
                console.error("Error setting up messages listener:", error);
            }
        };

        setupMessagesListener();
        // Clean up listener on unmount or session change
        return () => unsubscribe();
    }, [sessionId]);

    // Auto-scroll chat to bottom when new messages arrive
    useEffect(() => {
        if (messagesContainerRef.current) {
            const scrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop = scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedMessage = newMessage.trim();
        if (!trimmedMessage || trimmedMessage.length > MAX_CHARS) return;

        try {
            // First try groupSessions
            let collectionPath = 'groupSessions';
            let sessionDocRef = doc(firebase.db, collectionPath, sessionId);
            let sessionDoc = await getDoc(sessionDocRef);

            // If not found, try regular sessions
            if (!sessionDoc.exists()) {
                collectionPath = 'sessions';
                sessionDocRef = doc(firebase.db, collectionPath, sessionId);
            }

            const messagesRef = collection(sessionDocRef, 'messages');
            
            await addDoc(messagesRef, {
                text: trimmedMessage,
                userId: firebase.auth.currentUser.uid,
                displayName: firebase.auth.currentUser.displayName,
                photoURL: firebase.auth.currentUser.photoURL,
                timestamp: serverTimestamp(),
                isAiMessage: false
            });
            setNewMessage('');
            setCharCount(0);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    /**
     * Gets the session data for the current chat
     * @returns {Object} Session data and messages reference
     */
    const getSessionData = async () => {
        if (!sessionId) {
            throw new Error('No session ID provided');
        }

        // Smart session detection for both group and duo sessions
        let collectionPath = 'groupSessions';
        let sessionDocRef = doc(firebase.db, collectionPath, sessionId);
        let sessionDoc = await getDoc(sessionDocRef);

        if (!sessionDoc.exists()) {
            collectionPath = 'sessions';
            sessionDocRef = doc(firebase.db, collectionPath, sessionId);
            sessionDoc = await getDoc(sessionDocRef);
        }

        if (!sessionDoc.exists()) {
            throw new Error(`Session document not found: ${sessionId} in either collection`);
        }

        const sessionData = sessionDoc.data();
        if (!sessionData?.course) {
            throw new Error(`Session found but no course information available. Session ID: ${sessionId}`);
        }

        return {
            sessionData,
            messagesRef: collection(sessionDocRef, 'messages')
        };
    };

    /**
     * Handles video recommendations for the current course
     */
    const handleVideoRecommend = async () => {
        setLoading(true);
        try {
            const { sessionData, messagesRef } = await getSessionData();

            // Fetch video recommendations from AI service
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/recommend-video`, {
                major: sessionData.course
            });

            // Format videos with clickable links and visual organization
            const videos = response.data;
            const recommendationText = videos.map(video => (
                `<div style="margin-bottom: 20px;">
                    <strong>📺 ${video.title}</strong><br/>
                    <a href="${video.url}" target="_blank" rel="noopener noreferrer">🔗 Watch Video</a><br/>
                    <span>📝 ${video.description}</span>
                </div>`
            )).join('\n');
            
            // Add formatted recommendations to chat
            await addDoc(messagesRef, {
                text: `<div>
                    <h3>Here are some recommended videos for ${sessionData.course}:</h3>
                    ${recommendationText}
                </div>`,
                isHtml: true,
                userId: "ai",
                displayName: "AI Assistant",
                timestamp: serverTimestamp(),
                isAiMessage: true,
                visibleToHornet: true
            });
            
            setShowAiButtons(false);
        } catch (error) {
            await handleRecommendationError(error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handles textbook recommendations for the current course
     */
    const handleTextbookRecommend = async () => {
        setLoading(true);
        try {
            const { sessionData, messagesRef } = await getSessionData();

            // Fetch textbook recommendations from AI service
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/recommend-textbook`, {
                major: sessionData.course
            });

            // Format textbooks with organized display
            const textbooks = response.data;
            const recommendationText = textbooks.map(book => (
                `<div style="margin-bottom: 20px;">
                    <strong>📚 ${book.title}</strong><br/>
                    <span>📖 Edition: ${book.edition}</span>
                </div>`
            )).join('\n');
            
            // Add formatted recommendations to chat
            await addDoc(messagesRef, {
                text: `<div>
                    <h3>Here are some recommended textbooks for ${sessionData.course}:</h3>
                    ${recommendationText}
                </div>`,
                isHtml: true,
                userId: "ai",
                displayName: "AI Assistant",
                timestamp: serverTimestamp(),
                isAiMessage: true,
                visibleToHornet: true
            });
            
            setShowAiButtons(false);
        } catch (error) {
            await handleRecommendationError(error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handles errors from recommendation requests
     */
    const handleRecommendationError = async (error) => {
        console.error("Error getting recommendations:", error);
        const isGroupSession = window.location.pathname.includes('group');
        const collectionPath = isGroupSession ? 'groupSessions' : 'sessions';
        const messagesRef = collection(doc(firebase.db, collectionPath, sessionId), 'messages');
        await addDoc(messagesRef, {
            text: error.message.includes('No session ID provided')
                ? "Error: Chat session not properly initialized. Please try refreshing the page."
                : error.message.includes('Session document not found')
                ? "Error: Could not find the chat session. Please try refreshing the page."
                : error.message.includes('Session found but no course information')
                ? "Error: This chat session doesn't have a course assigned to it. Please make sure you're in a course-specific chat."
                : "Sorry, I couldn't get recommendations at the moment. Please try again later.",
            userId: "ai",
            displayName: "AI Assistant",
            timestamp: serverTimestamp(),
            isAiMessage: true,
            visibleToHornet: true
        });
    };

    /**
     * Opens the recommendation type selection modal
     */
    const handleAiRecommend = () => {
        setShowRecommendModal(true);
    };

    /**
     * Handles AI-powered Q&A interactions
     * Sends user's question to AI service and displays the response in chat
     */
    const handleAiAsk = async () => {
        setLoading(true);
        try {
            // Smart session detection for both group and duo sessions
            let collectionPath = 'groupSessions';
            let sessionDocRef = doc(firebase.db, collectionPath, sessionId);
            let sessionDoc = await getDoc(sessionDocRef);

            if (!sessionDoc.exists()) {
                collectionPath = 'sessions';
                sessionDocRef = doc(firebase.db, collectionPath, sessionId);
            }

            const messagesRef = collection(sessionDocRef, 'messages');
            
            if (!newMessage.trim()) {
                return;
            }

            // Get AI response for user's question
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/ask-ai`, {
                message: newMessage.trim()
            });
            
            // Add user's question to chat history
            await addDoc(messagesRef, {
                text: newMessage.trim(),
                userId: firebase.auth.currentUser.uid,
                displayName: firebase.auth.currentUser.displayName,
                timestamp: serverTimestamp(),
                isAiMessage: false
            });

            // Add AI's response to chat history
            await addDoc(messagesRef, {
                text: response.data.response,
                userId: "ai",
                displayName: "AI Assistant",
                timestamp: serverTimestamp(),
                isAiMessage: true,
                visibleToHornet: true
            });
            
            // Reset input state
            setNewMessage('');
            setCharCount(0);
            setShowAiButtons(false);
        } catch (error) {
            console.error("Error getting AI response:", error);
            console.error("Error details:", {
                message: error.message,
                response: error.response,
                status: error.response?.status,
                data: error.response?.data
            });
            // Add error message to chat
            const isGroupSession = window.location.pathname.includes('group');
            const collectionPath = isGroupSession ? 'groupSessions' : 'sessions';
            const messagesRef = collection(doc(firebase.db, collectionPath, sessionId), 'messages');
            await addDoc(messagesRef, {
                text: "Sorry, I'm having trouble connecting to the AI at the moment. Please try again later.",
                userId: "ai",
                displayName: "AI Assistant",
                timestamp: serverTimestamp(),
                isAiMessage: true,
                visibleToHornet: true
            });
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handles generating AI flashcards for the current course
     */
    const handleGenerateFlashcards = async () => {
        setLoading(true);
        try {
            const { sessionData, messagesRef } = await getSessionData();

            // Get AI to generate flashcards
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/generate-flashcards`, {
                course: sessionData.course
            });
            
            const flashcards = response.data;
            
            // Create a new flashcard set
            const newSet = {
                name: `AI Generated - ${sessionData.course}`,
                userId: firebase.auth.currentUser.uid,
                createdAt: new Date().toISOString()
            };
            
            // Add the set to the database
            const setRef = await addDoc(collection(firebase.db, 'flashcard_groups'), newSet);
            
            // Add all flashcards to the set
            const addFlashcardPromises = flashcards.map(card =>
                addDoc(collection(firebase.db, 'flashcards'), {
                    question: card.question,
                    answer: card.answer,
                    userId: firebase.auth.currentUser.uid,
                    groupId: setRef.id,
                    createdAt: new Date().toISOString()
                })
            );
            
            await Promise.all(addFlashcardPromises);
            
            // Add success message to chat
            await addDoc(messagesRef, {
                text: `Successfully generated a new flashcard set "${newSet.name}" with ${flashcards.length} cards! You can find it in your study sets.`,
                userId: "system",
                displayName: "System",
                timestamp: serverTimestamp(),
                isSystemMessage: true,
                promptedBy: firebase.auth.currentUser.uid
            });
            
            setShowAiButtons(false);
        } catch (error) {
            console.error("Error generating flashcards:", error);
            
            // Add error message to chat
            try {
                // Try group sessions first
                let sessionRef = doc(firebase.db, 'groupSessions', sessionId);
                let sessionDoc = await getDoc(sessionRef);
                
                if (!sessionDoc.exists()) {
                    sessionRef = doc(firebase.db, 'sessions', sessionId);
                }
                
                const messagesRef = collection(sessionRef, 'messages');
                await addDoc(messagesRef, {
                    text: "Failed to generate flashcards. Please try again.",
                    userId: "system",
                    displayName: "System",
                    timestamp: serverTimestamp(),
                    isSystemMessage: true,
                    promptedBy: firebase.auth.currentUser.uid
                });
            } catch (e) {
                console.error("Error adding error message:", e);
            }
        } finally {
            setLoading(false);
        }
    };

    // Load user's flashcard sets when share modal opens
    useEffect(() => {
        if (showShareModal && firebase.auth.currentUser) {
            const loadSets = async () => {
                try {
                    const setsQuery = query(
                        collection(firebase.db, 'flashcard_groups'),
                        where('userId', '==', firebase.auth.currentUser.uid)
                    );
                    const setsSnapshot = await getDocs(setsQuery);
                    const loadedSets = setsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setFlashcardSets(loadedSets);
                } catch (err) {
                    console.error('Error loading flashcard sets:', err);
                }
            };
            loadSets();
        }
    }, [showShareModal]);

    // Handle sharing a flashcard set
    const handleShareSet = async (setId, setName) => {
        try {
            // Try group session first
            let sessionRef = doc(firebase.db, 'groupSessions', sessionId);
            let sessionDoc = await getDoc(sessionRef);
            
            // If not found in group sessions, try regular sessions
            if (!sessionDoc.exists()) {
                sessionRef = doc(firebase.db, 'sessions', sessionId);
                sessionDoc = await getDoc(sessionRef);
                
                if (!sessionDoc.exists()) {
                    console.error('Session not found in either collection');
                    return;
                }
            }

            const messagesRef = collection(sessionRef, 'messages');
            await addDoc(messagesRef, {
                text: `FLASHCARD_SHARE:${setId}:${setName}`,
                userId: firebase.auth.currentUser.uid,
                displayName: firebase.auth.currentUser.displayName,
                photoURL: firebase.auth.currentUser.photoURL,
                timestamp: serverTimestamp(),
                isFlashcardShare: true
            });
            setShowShareModal(false);
        } catch (error) {
            console.error("Error sharing flashcard set:", error);
            // Add error message to chat
            try {
                const messagesRef = collection(doc(firebase.db, isGroupSession ? 'groupSessions' : 'sessions', sessionId), 'messages');
                await addDoc(messagesRef, {
                    text: "Failed to share flashcard set. Please try again.",
                    userId: "system",
                    displayName: "System",
                    timestamp: serverTimestamp(),
                    isSystemMessage: true,
                    promptedBy: firebase.auth.currentUser.uid
                });
            } catch (e) {
                console.error("Error adding error message:", e);
            }
            console.error("Error sharing flashcard set:", error);
        }
    };

    // Handle accepting a shared flashcard set
    const handleAcceptSet = async (setId, originalMessage) => {
        try {
            // Get the original flashcard set
            const setDoc = await getDoc(doc(firebase.db, 'flashcard_groups', setId));
            if (!setDoc.exists()) return;

            const setData = setDoc.data();
            
            // Create a new set for the accepting user
            const newSet = {
                name: setData.name,
                userId: firebase.auth.currentUser.uid,
                createdAt: new Date().toISOString(),
                sharedFrom: originalMessage.userId
            };

            // Add the new set
            const newSetRef = await addDoc(collection(firebase.db, 'flashcard_groups'), newSet);

            // Get all flashcards from original set
            const flashcardsQuery = query(
                collection(firebase.db, 'flashcards'),
                where('groupId', '==', setId)
            );
            const flashcardsSnapshot = await getDocs(flashcardsQuery);

            // Copy all flashcards to new set
            const copyPromises = flashcardsSnapshot.docs.map(flashcardDoc => {
                const flashcardData = flashcardDoc.data();
                return addDoc(collection(firebase.db, 'flashcards'), {
                    ...flashcardData,
                    userId: firebase.auth.currentUser.uid,
                    groupId: newSetRef.id,
                    createdAt: new Date().toISOString()
                });
            });

            await Promise.all(copyPromises);

            // Add confirmation message to chat
            // Try group sessions first
            let sessionRef = doc(firebase.db, 'groupSessions', sessionId);
            let sessionDoc = await getDoc(sessionRef);
            
            if (!sessionDoc.exists()) {
                sessionRef = doc(firebase.db, 'sessions', sessionId);
            }
            
            const messagesRef = collection(sessionRef, 'messages');
            await addDoc(messagesRef, {
                text: `Successfully added "${setData.name}" to your flashcard sets!`,
                userId: "system",
                displayName: "System",
                timestamp: serverTimestamp(),
                isSystemMessage: true,
                promptedBy: firebase.auth.currentUser.uid
            });

        } catch (error) {
            console.error("Error accepting flashcard set:", error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="chat-window">
            {/* Chat Header with AI Assistant Toggle */}
            <div className="chat-header">
                <h3>The Hive</h3>
                <div className="header-controls">
                    <FaShareAlt
                        className="share-icon"
                        style={{
                            fontSize: '20px',
                            marginRight: '10px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                        onClick={() => setShowShareModal(true)}
                    />
                    {isHornet && (
                        <FaRobot
                            className="robot-icon"
                            style={{
                                fontSize: '20px',
                                marginRight: '10px',
                                color: 'white'
                            }}
                            onClick={() => setShowAiButtons(!showAiButtons)}
                        />
                    )}
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
            </div>

            {/* Messages Display with Auto-scroll */}
            <div className="messages-container" ref={messagesContainerRef}>
                {messages.map((message) => (
                    // Hide AI messages from non-Hornet users and system messages from other users
                    (message.isAiMessage && !isHornet) || (message.isSystemMessage && message.userId === "system" && message.promptedBy !== firebase.auth.currentUser?.uid) ? null : (
                        <div
                            key={message.id}
                            className={`chat-message ${message.userId === firebase.auth.currentUser?.uid ? 'user' : 'ai'}`}
                        >
                            <div className="message-content">
                                <span className="message-sender">
                                    {message.userId === firebase.auth.currentUser?.uid ? 'You' : message.displayName}
                                </span>
                                {message.isFlashcardShare ? (
                                    <div className="flashcard-share">
                                        {(() => {
                                            const [prefix, setId, setName] = message.text.split(':');
                                            return (
                                                <>
                                                    <p>Shared flashcard set: {setName}</p>
                                                    {message.userId !== firebase.auth.currentUser?.uid && (
                                                        <button
                                                            className="accept-button"
                                                            onClick={() => handleAcceptSet(setId, message)}
                                                        >
                                                            Accept Set
                                                        </button>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                ) : message.isHtml ? (
                                    <p dangerouslySetInnerHTML={{ __html: message.text }} />
                                ) : (
                                    <p>{message.text}</p>
                                )}
                            </div>
                        </div>
                    )
                ))}
                {/* Loading indicator for AI operations */}
                {loading && (
                    <div className="chat-message ai">
                        <div className="message-content">
                            <span className="message-sender">AI Assistant</span>
                            <p>Thinking...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Message Input and AI Controls */}
            <div className="message-form-container">
                {/* AI Feature Buttons */}
                {showAiButtons && isHornet && (
                    <div className="ai-buttons">
                        <button
                            onClick={handleAiRecommend}
                            className="ai-button recommend"
                            disabled={loading}
                        >
                            Recommend
                        </button>
                        <button
                            onClick={handleAiAsk}
                            className="ai-button ask"
                            disabled={loading}
                        >
                            Ask
                        </button>
                        <button
                            onClick={handleGenerateFlashcards}
                            className="ai-button generate"
                            disabled={loading}
                        >
                            Generate Flashcards
                        </button>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="message-form">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                            const text = e.target.value;
                            if (text.length <= MAX_CHARS) {
                                setNewMessage(text);
                                setCharCount(text.length);
                            }
                        }}
                        placeholder="Type a message..."
                        className="message-input"
                        maxLength={MAX_CHARS}
                        disabled={loading}
                    />
                    <div style={{
                        position: 'absolute',
                        right: '100px',
                        bottom: '-20px',
                        fontSize: '12px',
                        color: charCount >= MAX_CHARS ? '#ff4444' : '#666'
                    }}>
                        {charCount}/{MAX_CHARS}
                    </div>
                    <button 
                        type="submit" 
                        className="send-button"
                        disabled={loading || !newMessage.trim() || newMessage.length > MAX_CHARS}
                    >
                        Send
                    </button>
                </form>
            </div>

            {/* Share Flashcard Sets Modal */}
            {showShareModal && (
                <div className="recommendation-modal">
                    <div className="recommendation-modal-content">
                        <h3>Share Flashcard Set</h3>
                        <div className="flashcard-sets-list">
                            {flashcardSets.map(set => (
                                <button
                                    key={set.id}
                                    onClick={() => handleShareSet(set.id, set.name)}
                                    className="share-set-button"
                                    disabled={loading}
                                >
                                    {set.name}
                                </button>
                            ))}
                            {flashcardSets.length === 0 && (
                                <p style={{ textAlign: 'center', color: '#666' }}>
                                    No flashcard sets available
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => setShowShareModal(false)}
                            className="close-modal-button"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Recommendation Type Modal */}
            {showRecommendModal && (
                <div className="recommendation-modal">
                    <div className="recommendation-modal-content">
                        <h3>Choose Recommendation Type</h3>
                        <div className="recommendation-buttons">
                            <button
                                onClick={() => {
                                    setShowRecommendModal(false);
                                    handleVideoRecommend();
                                }}
                                className="recommend-button video"
                                disabled={loading}
                            >
                                📺 Educational Videos
                            </button>
                            <button
                                onClick={() => {
                                    setShowRecommendModal(false);
                                    handleTextbookRecommend();
                                }}
                                className="recommend-button textbook"
                                disabled={loading}
                            >
                                📚 Textbooks
                            </button>
                        </div>
                        <button
                            onClick={() => setShowRecommendModal(false)}
                            className="close-modal-button"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
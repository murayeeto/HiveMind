import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { FaPlus } from 'react-icons/fa';
import firebase from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './Study.css';

const Study = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [lowScores, setLowScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studyMode, setStudyMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [studyCards, setStudyCards] = useState([]);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const { user } = useAuth();

  const loadData = useCallback(async () => {
    try {
      // Load groups
      const groupsQuery = query(
        collection(firebase.db, 'flashcard_groups'),
        where('userId', '==', user.uid)
      );
      const groupsSnapshot = await getDocs(groupsQuery);
      const loadedGroups = [];

      for (const groupDoc of groupsSnapshot.docs) {
        const groupData = { id: groupDoc.id, ...groupDoc.data(), flashcards: [] };
        
        const flashcardsQuery = query(
          collection(firebase.db, 'flashcards'),
          where('groupId', '==', groupDoc.id)
        );
        const flashcardsSnapshot = await getDocs(flashcardsQuery);
        groupData.flashcards = flashcardsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          isFlipped: false
        }));
        
        loadedGroups.push(groupData);
      }
setGroups(loadedGroups);

// Get user's test scores from users collection
const userDoc = await getDoc(doc(firebase.db, 'users', user.uid));
if (userDoc.exists()) {
  const userData = userDoc.data();
  const testScores = userData.testScores || {};

  // Convert scores object to array and add set names
  const scores = Object.entries(testScores)
    .map(([setId, scoreData]) => {
      const group = loadedGroups.find(g => g.id === setId);
      return {
        setId,
        setName: group ? group.name : 'Unknown Set',
        ...scoreData,
        score: (scoreData.correctAnswers / scoreData.totalCards) * 100
      };
    })
    .filter(score => score.score <= 75)
    .sort((a, b) => a.score - b.score);

  setLowScores(scores.slice(0, 2));
}
      setLoading(false);
    } catch (err) {
      console.error('Error loading groups:', err);
      setError('Failed to load flashcard groups');
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);


  const startStudyMode = async (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      try {
        // Update lastStudied timestamp in Firestore
        await updateDoc(doc(firebase.db, 'flashcard_groups', groupId), {
          lastStudied: new Date().toISOString()
        });

        // Update local state
        setGroups(groups.map(g => {
          if (g.id === groupId) {
            return { ...g, lastStudied: new Date().toISOString() };
          }
          return g;
        }));

        setStudyCards([...group.flashcards]);
        setCurrentCardIndex(0);
        setStudyMode(true);
        setIsCardFlipped(false);
      } catch (err) {
        console.error('Error updating last studied time:', err);
      }
    }
  };

  const exitStudyMode = () => {
    setStudyMode(false);
    setStudyCards([]);
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
  };

  const nextCard = () => {
    setCurrentCardIndex((prev) => (prev + 1) % studyCards.length);
    setIsCardFlipped(false);
  };

  const prevCard = () => {
    setCurrentCardIndex((prev) => 
      prev === 0 ? studyCards.length - 1 : prev - 1
    );
    setIsCardFlipped(false);
  };

  const shuffleCards = () => {
    setStudyCards(cards => {
      const shuffled = [...cards];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setCurrentCardIndex(0);
      setIsCardFlipped(false);
      return shuffled;
    });
  };

  if (loading) {
    return <div className="loading">Loading flashcards...</div>;
  }

  const recentGroups = groups
    .sort((a, b) => new Date(b.lastStudied || b.createdAt) - new Date(a.lastStudied || a.createdAt))
    .slice(0, 2);

  return (
    <div className="study-page">
      <h1 className="page-title">Your Study Hub</h1>
      
      <div className="dashboard-container">
        <div className="dashboard-box study-sets-box">
          <h2>Study Sets</h2>
          <div className="action-buttons">
            <button
              className="big-button create-button"
              onClick={() => navigate('/your-sets')}
            >
              <FaPlus className="plus-icon" />
              <span>Create New</span>
            </button>
            <button
              className="big-button view-sets-button"
              onClick={() => navigate('/your-sets')}
            >
              <span>Your Sets</span>
            </button>
            <button
              className="big-button games-button"
              onClick={() => navigate('/games')}
            >
              <span>Games</span>
            </button>
          </div>
        </div>

        <div className="dashboard-box needs-improvement-box">
          <h2>Needs Improvement</h2>
          <p className="subtitle">Based on your test scores</p>
          {lowScores.length > 0 ? (
            lowScores.map(score => (
              <div key={score.setId} className="improvement-item">
                <button
                  className="delete-score-btn"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to remove this set from Needs Improvement?')) {
                      try {
                        // Get user document
                        const userDoc = doc(firebase.db, 'users', user.uid);
                        const userSnap = await getDoc(userDoc);
                        
                        if (userSnap.exists()) {
                          const userData = userSnap.data();
                          const updatedTestScores = {};
                          
                          // Create new testScores object without the deleted score
                          Object.entries(userData.testScores || {}).forEach(([key, value]) => {
                            if (key !== score.setId) {
                              updatedTestScores[key] = value;
                            }
                          });
                          
                          // Update user document with clean testScores
                          await updateDoc(userDoc, {
                            testScores: updatedTestScores
                          });
                          
                          // Update local state
                          setLowScores(prevScores =>
                            prevScores.filter(s => s.setId !== score.setId)
                          );
                        }
                      } catch (err) {
                        console.error('Error removing score:', err);
                        setError('Failed to remove score');
                      }
                    }
                  }}
                >
                  ×
                </button>
                <h3>{score.setName}</h3>
                <div className="test-score">
                  <span>Test score: {score.correctAnswers} / {score.totalCards} ({score.score.toFixed(1)}% accuracy)</span>
                  <div className="test-date">
                    Taken: {new Date(score.completedAt).toLocaleString()}
                  </div>
                </div>
                <button
                  className="practice-button"
                  onClick={() => navigate(`/test/${score.setId}`)}
                >
                  Practice Now
                </button>
              </div>
            ))
          ) : (
            <p className="no-scores">No low scores to show</p>
          )}
        </div>

        <div className="dashboard-box recently-used-box">
          <h2>Recently Used</h2>
          {recentGroups.slice(0, 2).map(group => (
            <div key={group.id} className="recent-item">
              <h3>{group.name}</h3>
              <div className="last-studied">
                Last studied: {group.lastStudied ? new Date(group.lastStudied).toLocaleString() : 'Never'}
              </div>
              <button
                className="continue-button"
                onClick={() => startStudyMode(group.id)}
              >
                Continue
              </button>
            </div>
          ))}
        </div>
      </div>

      {studyMode && studyCards.length > 0 && (
        <div className="study-mode">
          <button className="study-close-btn" onClick={exitStudyMode}>×</button>
          
          <div
            className={`study-card ${isCardFlipped ? 'flipped' : ''}`}
            onClick={() => setIsCardFlipped(!isCardFlipped)}
          >
            <div className="study-card-front">
              {studyCards[currentCardIndex].question}
            </div>
            <div className="study-card-back">
              {studyCards[currentCardIndex].answer}
            </div>
          </div>

          <div className="study-controls">
            <button className="study-nav-btn" onClick={prevCard}>
              ←
            </button>
            <span className="study-counter">
              {currentCardIndex + 1} / {studyCards.length}
            </span>
            <button className="study-nav-btn" onClick={nextCard}>
              →
            </button>
            <button className="study-nav-btn study-shuffle-btn" onClick={shuffleCards}>
              🔄 Remix
            </button>
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default Study;
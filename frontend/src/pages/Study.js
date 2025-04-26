import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore';
import { FaPlus } from 'react-icons/fa';
import firebase from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './Study.css';

const Study = () => {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studyMode, setStudyMode] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [studyCards, setStudyCards] = useState([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadGroups();
    }
  }, [user]);

  const loadGroups = async () => {
    try {
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
      setLoading(false);
    } catch (err) {
      console.error('Error loading groups:', err);
      setError('Failed to load flashcard groups');
      setLoading(false);
    }
  };

  const createGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setError('Group name is required');
      return;
    }

    try {
      const newGroup = {
        name: newGroupName.trim(),
        userId: user.uid,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(firebase.db, 'flashcard_groups'), newGroup);
      setGroups([...groups, { ...newGroup, id: docRef.id, flashcards: [] }]);
      setNewGroupName('');
      setError('');
    } catch (err) {
      console.error('Error creating group:', err);
      setError('Failed to create group');
    }
  };

  const deleteGroup = async (groupId) => {
    try {
      const flashcardsQuery = query(
        collection(firebase.db, 'flashcards'),
        where('groupId', '==', groupId)
      );
      const flashcardsSnapshot = await getDocs(flashcardsQuery);
      const deletePromises = flashcardsSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      await deleteDoc(doc(firebase.db, 'flashcard_groups', groupId));
      setGroups(groups.filter(group => group.id !== groupId));
      if (selectedGroup === groupId) {
        setSelectedGroup(null);
      }
    } catch (err) {
      console.error('Error deleting group:', err);
      setError('Failed to delete group');
    }
  };

  const createFlashcard = async (e) => {
    e.preventDefault();
    if (!selectedGroup) {
      setError('Please select a group first');
      return;
    }
    if (!question.trim() || !answer.trim()) {
      setError('Both question and answer are required');
      return;
    }

    try {
      const newFlashcard = {
        question: question.trim(),
        answer: answer.trim(),
        userId: user.uid,
        groupId: selectedGroup,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(firebase.db, 'flashcards'), newFlashcard);
      setGroups(groups.map(group => {
        if (group.id === selectedGroup) {
          return {
            ...group,
            flashcards: [...group.flashcards, { ...newFlashcard, id: docRef.id, isFlipped: false }]
          };
        }
        return group;
      }));
      setQuestion('');
      setAnswer('');
      setError('');
    } catch (err) {
      console.error('Error creating flashcard:', err);
      setError('Failed to create flashcard');
    }
  };

  const deleteFlashcard = async (groupId, cardId) => {
    try {
      await deleteDoc(doc(firebase.db, 'flashcards', cardId));
      setGroups(groups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            flashcards: group.flashcards.filter(card => card.id !== cardId)
          };
        }
        return group;
      }));
    } catch (err) {
      console.error('Error deleting flashcard:', err);
      setError('Failed to delete flashcard');
    }
  };

  const startStudyMode = async (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      const shuffled = [...group.flashcards].sort(() => Math.random() - 0.5);
      setStudyCards(shuffled);
      setCurrentGroupId(groupId);
      setCurrentCardIndex(0);
      setStudyMode(true);
      setShowAnswer(false);
      setUserAnswer('');
      setResults([]);
    }
  };

  const exitStudyMode = async () => {
    if (results.length > 0) {
      const correctCount = results.filter(r => r.correct).length;
      const newAccuracy = (correctCount / results.length) * 100;
      
      // Update group with new accuracy
      const groupsRef = collection(firebase.db, 'flashcard_groups');
      await updateDoc(doc(groupsRef, currentGroupId), {
        lastAccuracy: newAccuracy,
        lastStudied: new Date().toISOString()
      });

      // Update local state
      setGroups(groups.map(group => {
        if (group.id === currentGroupId) {
          return { ...group, lastAccuracy: newAccuracy };
        }
        return group;
      }));
    }

    setStudyMode(false);
    setCurrentGroupId(null);
    setStudyCards([]);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setUserAnswer('');
    setResults([]);
  };

  const checkAnswer = () => {
    const currentCard = studyCards[currentCardIndex];
    const isCorrect = userAnswer.toLowerCase() === currentCard.answer.toLowerCase();
    
    setResults([...results, {
      cardId: currentCard.id,
      correct: isCorrect,
      userAnswer,
      correctAnswer: currentCard.answer
    }]);

    setShowAnswer(true);
  };

  const skipCard = () => {
    const currentCard = studyCards[currentCardIndex];
    setResults([...results, {
      cardId: currentCard.id,
      correct: false,
      skipped: true,
      userAnswer: '',
      correctAnswer: currentCard.answer
    }]);
    setShowAnswer(true);
  };

  const nextCard = () => {
    if (currentCardIndex < studyCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setShowAnswer(false);
      setUserAnswer('');
    } else {
      exitStudyMode();
    }
  };

  if (loading) {
    return <div className="loading">Loading flashcards...</div>;
  }

  // Get 2 most recently studied sets
  const recentGroups = groups
    .filter(group => group.flashcards.length > 0)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 2);

  return (
    <div className="study-page">
      <h1 className="page-title">Your Study Hub</h1>
      
      <div className="dashboard-container">
        <div className="dashboard-box">
          <h2>Study Sets</h2>
          {selectedGroup !== 'new' ? (
            <>
              <button
                className="big-button create-button"
                onClick={() => setSelectedGroup('new')}
              >
                <FaPlus className="plus-icon" />
                Create New
              </button>
              <button
                className="big-button your-sets-button"
                onClick={() => navigate('/your-sets')}
              >
                Your Sets
              </button>
            </>
          ) : (
            <form className="create-set-form" onSubmit={(e) => {
              createGroup(e);
              setSelectedGroup(null);
            }}>
              <input
                type="text"
                placeholder="Enter set name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                autoFocus
              />
              <div className="form-buttons">
                <button type="submit" className="confirm-btn">Create</button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setSelectedGroup(null);
                    setNewGroupName('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="dashboard-box">
          <h2>Needs Improvement</h2>
          <p className="subtitle">Based on your test scores</p>
          <div className="sets-list">
            {groups
              .filter(group => group.lastAccuracy <= 75)
              .sort((a, b) => (a.lastAccuracy || 100) - (b.lastAccuracy || 100))
              .slice(0, 2)
              .map(group => (
                <div key={group.id} className="set-item">
                  <h3>{group.name}</h3>
                  <p className="set-info">Test score: {group.lastAccuracy?.toFixed(1) || 'No'} % accuracy</p>
                <button
                  className="action-button"
                  onClick={() => startStudyMode(group.id)}
                >
                  Practice Now
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-box">
          <h2>Recently Used</h2>
          <div className="sets-list">
            {recentGroups.map(group => (
              <div key={group.id} className="set-item">
                <h3>{group.name}</h3>
                <div className="progress-container">
                  <div
                    className="progress-bar"
                    style={{ width: `${(group.flashcards.length / 10) * 100}%` }}
                  ></div>
                </div>
                <p className="set-info">{group.flashcards.length} cards</p>
                <button
                  className="action-button"
                  onClick={() => startStudyMode(group.id)}
                >
                  Continue
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {studyMode && studyCards.length > 0 && (
        <div className="study-mode">
          <button className="study-close-btn" onClick={exitStudyMode}>×</button>
          
          <div className="study-card">
            <div className="study-progress">
              {results.length} / {studyCards.length} Cards
              {results.length > 0 && (
                <span className="accuracy">
                  {((results.filter(r => r.correct).length / results.length) * 100).toFixed(1)}% Correct
                </span>
              )}
            </div>

            <div className="card-content">
              <div className="question">
                {studyCards[currentCardIndex].question}
              </div>

              {!showAnswer ? (
                <div className="answer-input">
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && userAnswer.trim()) {
                        checkAnswer();
                      }
                    }}
                  />
                  <div className="input-buttons">
                    <button
                      className="check-btn"
                      onClick={checkAnswer}
                      disabled={!userAnswer.trim()}
                    >
                      Check
                    </button>
                    <button
                      className="skip-btn"
                      onClick={skipCard}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ) : (
                <div className="answer-reveal">
                  <div className={`result ${results[results.length - 1].correct ? 'correct' : 'incorrect'}`}>
                    {results[results.length - 1].correct ? 'Correct!' : 'Incorrect'}
                  </div>
                  <div className="correct-answer">
                    Correct answer: {studyCards[currentCardIndex].answer}
                  </div>
                  {!results[results.length - 1].correct && !results[results.length - 1].skipped && (
                    <div className="your-answer">
                      Your answer: {userAnswer}
                    </div>
                  )}
                  <button
                    className="next-btn"
                    onClick={nextCard}
                  >
                    {currentCardIndex < studyCards.length - 1 ? 'Next Card' : 'Finish'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default Study;
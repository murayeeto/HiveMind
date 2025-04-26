import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
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
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const { user } = useAuth();

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

  const startStudyMode = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setStudyCards([...group.flashcards]);
      setCurrentGroupId(groupId);
      setCurrentCardIndex(0);
      setStudyMode(true);
      setIsCardFlipped(false);
    }
  };

  const exitStudyMode = () => {
    setStudyMode(false);
    setCurrentGroupId(null);
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
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  return (
    <div className="study-page">
      <h1 className="page-title">Your Study Hub</h1>
      
      <div className="dashboard-container">
        <div className="dashboard-box sets-box">
          <h2>Study Sets</h2>
          <div className="big-buttons-container">
            <button 
              className="big-button create-button"
              onClick={() => setSelectedGroup(null)}
            >
              <FaPlus className="plus-icon" />
              <span>Create New Set</span>
            </button>
            {selectedGroup === null && (
              <form onSubmit={createGroup}>
                <input
                  type="text"
                  placeholder="Enter set name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                <button type="submit">Create</button>
              </form>
            )}
          </div>
        </div>

        <div className="dashboard-box">
          <h2>Your Sets</h2>
          <div className="sets-list">
            {groups.map(group => (
              <div key={group.id} className="set-item">
                <h3>{group.name}</h3>
                <p className="score">{group.flashcards.length} cards</p>
                <div className="set-buttons">
                  <button 
                    className="hive-button small"
                    onClick={() => startStudyMode(group.id)}
                  >
                    Study
                  </button>
                  <button 
                    className={`hive-button small ${selectedGroup === group.id ? 'active' : ''}`}
                    onClick={() => setSelectedGroup(prev => prev === group.id ? null : group.id)}
                  >
                    {selectedGroup === group.id ? 'Cancel' : 'Add Cards'}
                  </button>
                  <button 
                    className="hive-button small delete"
                    onClick={() => deleteGroup(group.id)}
                  >
                    Delete
                  </button>
                </div>
                {selectedGroup === group.id && (
                  <form className="add-cards-form" onSubmit={createFlashcard}>
                    <input
                      type="text"
                      placeholder="Question"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Answer"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                    />
                    <button type="submit">Add Card</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-box recent-box">
          <h2>Recently Added</h2>
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
                <p className="last-studied">{group.flashcards.length} cards</p>
                <button 
                  className="hive-button small"
                  onClick={() => startStudyMode(group.id)}
                >
                  Study Now
                </button>
              </div>
            ))}
          </div>
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
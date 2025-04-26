import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import firebase from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './Study.css';

const Study = () => {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [minimizedGroups, setMinimizedGroups] = useState(new Set());
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

  return (
    <div className="study-container">
      <div className="study-header">
        <h1>Study with Flashcards</h1>
        <p>Create groups and add flashcards to study</p>
      </div>

      <form className="create-group-form" onSubmit={createGroup}>
        <input
          type="text"
          placeholder="Enter group name"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
        />
        <button type="submit">Create Group</button>
      </form>

      {error && <div className="error">{error}</div>}

      {groups.map(group => (
        <div key={group.id} className="group-section">
          <div className="group-header">
            <h2 className="group-title">
              <button
                className="minimize-btn"
                onClick={() => {
                  setMinimizedGroups(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(group.id)) {
                      newSet.delete(group.id);
                    } else {
                      newSet.add(group.id);
                    }
                    return newSet;
                  });
                }}
              >
                <span className={`icon ${minimizedGroups.has(group.id) ? 'rotated' : ''}`}>▼</span>
              </button>
              {group.name}
            </h2>
            <div className="group-buttons">
              <button
                className="study-mode-btn"
                onClick={() => startStudyMode(group.id)}
              >
                Study
              </button>
              <button
                className={`select-group-btn ${selectedGroup === group.id ? 'active' : ''}`}
                onClick={() => setSelectedGroup(prev => prev === group.id ? null : group.id)}
              >
                {selectedGroup === group.id ? 'Selected' : 'Select to Add Cards'}
              </button>
              <button
                className="delete-group-btn"
                onClick={() => deleteGroup(group.id)}
              >
                Delete Group
              </button>
            </div>
          </div>

          <div className={`group-content ${minimizedGroups.has(group.id) ? 'minimized' : ''}`}>
            {selectedGroup === group.id && (
              <form className="create-flashcard-form" onSubmit={createFlashcard}>
                <input
                  type="text"
                  placeholder="Enter question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Enter answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                />
                <button type="submit">Add Flashcard</button>
              </form>
            )}

            {group.flashcards.length > 0 && (
              <>
                <div className="featured-card">
                  {group.flashcards[0].question}
                </div>

                <div className="cards-header">
                  <div>Question</div>
                  <div>Answer</div>
                </div>

                <div className="cards-list">
                  {group.flashcards.map(card => (
                    <div key={card.id} className="card-row">
                      <div className="card-side">
                        <button
                          className="delete-btn"
                          onClick={() => deleteFlashcard(group.id, card.id)}
                        >
                          ×
                        </button>
                        {card.question}
                      </div>
                      <div className="card-side">
                        {card.answer}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ))}

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
    </div>
  );
};

export default Study;
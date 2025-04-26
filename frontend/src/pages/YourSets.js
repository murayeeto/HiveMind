import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import firebase from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { FaPlus } from 'react-icons/fa';
import './YourSets.css';

const YourSets = () => {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newSetName, setNewSetName] = useState('');
  const [selectedSet, setSelectedSet] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [showNewSetForm, setShowNewSetForm] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadSets = async () => {
      try {
        const setsQuery = query(
          collection(firebase.db, 'flashcard_groups'),
          where('userId', '==', user.uid)
        );
        const setsSnapshot = await getDocs(setsQuery);
        const loadedSets = [];

        for (const setDoc of setsSnapshot.docs) {
          const setData = { id: setDoc.id, ...setDoc.data(), flashcards: [] };
          
          const flashcardsQuery = query(
            collection(firebase.db, 'flashcards'),
            where('groupId', '==', setDoc.id)
          );
          const flashcardsSnapshot = await getDocs(flashcardsQuery);
          setData.flashcards = flashcardsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          loadedSets.push(setData);
        }

        setSets(loadedSets);
        setLoading(false);
      } catch (err) {
        console.error('Error loading sets:', err);
        setError('Failed to load flashcard sets');
        setLoading(false);
      }
    };

    if (user) {
      loadSets();
    }
  }, [user]);

  const deleteSet = async (setId) => {
    if (!window.confirm('Are you sure you want to delete this set? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete all flashcards in the set
      const flashcardsQuery = query(
        collection(firebase.db, 'flashcards'),
        where('groupId', '==', setId)
      );
      const flashcardsSnapshot = await getDocs(flashcardsQuery);
      const deleteFlashcards = flashcardsSnapshot.docs.map(doc =>
        deleteDoc(doc.ref)
      );

      // Delete all test scores for the set
      const scoresQuery = query(
        collection(firebase.db, 'test_scores'),
        where('setId', '==', setId)
      );
      const scoresSnapshot = await getDocs(scoresQuery);
      const deleteScores = scoresSnapshot.docs.map(doc =>
        deleteDoc(doc.ref)
      );

      // Wait for all flashcards and scores to be deleted
      await Promise.all([...deleteFlashcards, ...deleteScores]);

      // Delete the set itself
      await deleteDoc(doc(firebase.db, 'flashcard_groups', setId));

      // Update local state
      setSets(sets.filter(set => set.id !== setId));
      setError('');
    } catch (err) {
      console.error('Error deleting set:', err);
      setError('Failed to delete set');
    }
  };

  const createSet = async (e) => {
    e.preventDefault();
    if (!newSetName.trim()) {
      setError('Set name is required');
      return;
    }

    try {
      const newSet = {
        name: newSetName.trim(),
        userId: user.uid,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(firebase.db, 'flashcard_groups'), newSet);
      setSets([...sets, { ...newSet, id: docRef.id, flashcards: [] }]);
      setNewSetName('');
      setShowNewSetForm(false);
      setError('');
    } catch (err) {
      console.error('Error creating set:', err);
      setError('Failed to create set');
    }
  };

  const createFlashcard = async (e) => {
    e.preventDefault();
    if (!selectedSet) {
      setError('Please select a set first');
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
        groupId: selectedSet,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(firebase.db, 'flashcards'), newFlashcard);
      setSets(sets.map(set => {
        if (set.id === selectedSet) {
          return {
            ...set,
            flashcards: [...set.flashcards, { ...newFlashcard, id: docRef.id }]
          };
        }
        return set;
      }));
      setQuestion('');
      setAnswer('');
      setError('');
    } catch (err) {
      console.error('Error creating flashcard:', err);
      setError('Failed to create flashcard');
    }
  };

  const handleSetClick = (setId) => {
    navigate(`/set/${setId}`);
  };

  if (loading) {
    return <div className="loading">Loading your sets...</div>;
  }

  return (
    <div className="your-sets-page">
      <div className="sets-header">
        <h1>Your Study Sets</h1>
        <button 
          className="create-set-button"
          onClick={() => setShowNewSetForm(true)}
        >
          <FaPlus className="plus-icon" />
          Create New Set
        </button>
      </div>

      {showNewSetForm && (
        <div className="new-set-form">
          <h2>Create New Set</h2>
          <form onSubmit={createSet}>
            <input
              type="text"
              placeholder="Enter set name"
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
            />
            <div className="form-buttons">
              <button type="submit">Create</button>
              <button type="button" onClick={() => setShowNewSetForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="sets-grid">
        {sets.map(set => (
          <div key={set.id} className="set-card">
            <button
              className="delete-set-button"
              onClick={() => deleteSet(set.id)}
            >
              ×
            </button>
            <div className="set-card-content">
              <h2>{set.name}</h2>
              <div className="set-card-stats">
                <span>{set.flashcards.length} cards</span>
                <span>Created: {new Date(set.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="progress-container">
                <div 
                  className="progress-bar" 
                  style={{ width: `${(set.flashcards.length / 10) * 100}%` }}
                ></div>
              </div>
              <div className="set-card-actions">
                <button onClick={() => handleSetClick(set.id)}>View Set</button>
                <button onClick={() => setSelectedSet(prev => prev === set.id ? null : set.id)}>
                  {selectedSet === set.id ? 'Cancel' : 'Add Cards'}
                </button>
                <button
                  className="test-button"
                  onClick={() => navigate(`/test/${set.id}`)}
                >
                  Test
                </button>
              </div>
              {selectedSet === set.id && (
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
          </div>
        ))}
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default YourSets;
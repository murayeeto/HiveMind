import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import firebase from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './Games.css';

const Games = () => {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSet, setSelectedSet] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

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
        setError('Failed to load study sets');
        setLoading(false);
      }
    };

    if (user) {
      loadSets();
    }
  }, [user]);

  const startGame = (set) => {
    setSelectedSet(set);
  };

  const startMatchingGame = () => {
    navigate(`/games/matching/${selectedSet.id}`);
  };

  if (loading) {
    return <div className="loading">Loading sets...</div>;
  }

  return (
    <div className="games-page">
      <h1>Study Games</h1>
      
      {!selectedSet ? (
        <>
          <h2>Select a Set to Play</h2>
          <div className="sets-grid">
            {sets.map(set => (
              <div key={set.id} className="set-card" onClick={() => startGame(set)}>
                <h3>{set.name}</h3>
                <div className="set-stats">
                  <span>{set.flashcards.length} cards</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="game-selection">
          <h2>Select a Game Mode</h2>
          <div className="game-modes">
            <div className="game-mode-card" onClick={startMatchingGame}>
              <h3>Matching Game</h3>
              <p>Match the front of the card to its back as fast as possible!</p>
              <button className="play-button">Play Now</button>
            </div>
            <div className="game-mode-card coming-soon">
              <h3>More Games Coming Soon!</h3>
              <p>Stay tuned for more exciting ways to study.</p>
              <button className="play-button" disabled>Coming Soon</button>
            </div>
          </div>
          <button 
            className="back-button"
            onClick={() => setSelectedSet(null)}
          >
            ← Back to Sets
          </button>
        </div>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default Games;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, getDoc, addDoc } from 'firebase/firestore';
import firebase from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { calculateGamePoints, updateUserPoints } from '../utils/pointsSystem';
import './MatchingGame.css';

const MatchingGame = () => {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [highScore, setHighScore] = useState(null);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [moves, setMoves] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCards = async () => {
      try {
        const setDoc = await getDoc(doc(firebase.db, 'flashcard_groups', setId));
        if (!setDoc.exists()) {
          setError('Set not found');
          return;
        }

        const setData = setDoc.data();
        if (setData.userId !== user.uid) {
          setError('You do not have permission to access this set');
          return;
        }

        const cardsQuery = query(
          collection(firebase.db, 'flashcards'),
          where('groupId', '==', setId)
        );
        const cardsSnapshot = await getDocs(cardsQuery);
        let loadedCards = cardsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Limit to 6 cards (12 pairs)
        loadedCards = loadedCards.slice(0, 6);

        // Create pairs of cards (front and back)
        const gamePairs = loadedCards.flatMap(card => [
          { ...card, type: 'question', pairId: card.id },
          { ...card, type: 'answer', pairId: card.id }
        ]);

        // Shuffle the cards
        const shuffledCards = gamePairs.sort(() => Math.random() - 0.5);

        // Load high score
        const highScoreQuery = query(
          collection(firebase.db, 'game_scores'),
          where('setId', '==', setId),
          where('gameType', '==', 'matching')
        );
        const highScoreSnapshot = await getDocs(highScoreQuery);
        const scores = highScoreSnapshot.docs.map(doc => doc.data().time);
        if (scores.length > 0) {
          setHighScore(Math.min(...scores));
        }
        setCards(shuffledCards);
        setLoading(false);
      } catch (err) {
        console.error('Error loading cards:', err);
        setError('Failed to load game cards');
        setLoading(false);
      }
    };

    if (user && setId) {
      loadCards();
    }
  }, [setId, user]);

  useEffect(() => {
    let interval;
    if (gameStarted && !gameCompleted) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted, gameCompleted]);

  const handleCardClick = async (index) => {
    if (!gameStarted) {
      setGameStarted(true);
    }

    if (flippedCards.length === 2 || flippedCards.includes(index) || matchedPairs.includes(cards[index].pairId)) {
      return;
    }

    const newFlippedCards = [...flippedCards, index];
    setFlippedCards(newFlippedCards);

    if (newFlippedCards.length === 2) {
      setMoves(prev => prev + 1);
      const [firstIndex, secondIndex] = newFlippedCards;
      const firstCard = cards[firstIndex];
      const secondCard = cards[secondIndex];

      if (firstCard.pairId === secondCard.pairId && firstCard.type !== secondCard.type) {
        setMatchedPairs([...matchedPairs, firstCard.pairId]);
        setFlippedCards([]);

        // Check if game is completed
        if (matchedPairs.length + 1 === cards.length / 2) {
          setGameCompleted(true);
          
          // Calculate points earned
          const points = calculateGamePoints(timer, moves);
          setEarnedPoints(points);
          
          // Save score to Firebase
          await addDoc(collection(firebase.db, 'game_scores'), {
            setId,
            gameType: 'matching',
            time: timer,
            moves: moves,
            points: points,
            userId: user.uid,
            completedAt: new Date().toISOString()
          });
          
          // Update user's total points
          await updateUserPoints(user, points);
        }
      } else {
        setTimeout(() => {
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const restartGame = () => {
    setCards(cards.sort(() => Math.random() - 0.5));
    setFlippedCards([]);
    setMatchedPairs([]);
    setMoves(0);
    setTimer(0);
    setGameStarted(false);
    setGameCompleted(false);
    setEarnedPoints(0);
  };

  if (loading) {
    return <div className="loading">Loading game...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="matching-game">
      <div className="game-header">
        <h1>Matching Game</h1>
        <div className="game-stats">
          <div className={`stat ${timer < highScore ? 'beating-record' : ''}`}>
            <span>Time:</span> {formatTime(timer)}
          </div>
          <div className="stat">
            <span>Moves:</span> {moves}
          </div>
          <div className="stat">
            <span>Matches:</span> {matchedPairs.length} / {cards.length / 2}
          </div>
        </div>
      </div>

      <div className="game-grid">
        {cards.map((card, index) => (
          <div
            key={`${card.pairId}-${card.type}`}
            className={`game-card ${
              flippedCards.includes(index) || matchedPairs.includes(card.pairId)
                ? 'flipped'
                : ''
            } ${matchedPairs.includes(card.pairId) ? 'matched' : ''}`}
            onClick={() => handleCardClick(index)}
          >
            <div className="card-inner">
              <div className="card-front">
                ?
              </div>
              <div className="card-back">
                {card.type === 'question' ? card.question : card.answer}
              </div>
            </div>
          </div>
        ))}
      </div>

      {gameCompleted && (
        <div className="game-completed">
          <h2>Congratulations!</h2>
          <p>You completed the game in {formatTime(timer)} with {moves} moves!</p>
          <p className="points-earned">Points earned: {earnedPoints}</p>
          <div className="game-actions">
            <button onClick={restartGame}>Play Again</button>
            <button onClick={() => navigate('/games')}>Back to Games</button>
          </div>
        </div>
      )}

      {!gameCompleted && (
        <button className="back-button" onClick={() => navigate('/games')}>
          ← Back to Games
        </button>
      )}
    </div>
  );
};

export default MatchingGame;
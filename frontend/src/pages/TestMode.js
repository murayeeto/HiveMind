import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';
import firebase from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { calculateTestPoints, updateUserPoints } from '../utils/pointsSystem';
import './TestMode.css';

const TestMode = () => {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [setName, setSetName] = useState('');
  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [error, setError] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);

  useEffect(() => {
    const loadSet = async () => {
      try {
        const setDoc = await getDoc(doc(firebase.db, 'flashcard_groups', setId));
        if (!setDoc.exists()) {
          setError('Set not found');
          return;
        }

        const setData = { id: setDoc.id, ...setDoc.data() };
        if (setData.userId !== user.uid) {
          setError('You do not have permission to view this set');
          return;
        }

        setSetName(setData.name);

        const cardsQuery = query(
          collection(firebase.db, 'flashcards'),
          where('groupId', '==', setId)
        );
        const cardsSnapshot = await getDocs(cardsQuery);
        const loadedCards = cardsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Shuffle the cards
        const shuffledCards = [...loadedCards].sort(() => Math.random() - 0.5);
        setCards(shuffledCards);
        setLoading(false);
      } catch (err) {
        console.error('Error loading set:', err);
        setError('Failed to load study set');
        setLoading(false);
      }
    };

    if (user && setId) {
      loadSet();
    }
  }, [setId, user]);

  const checkAnswer = () => {
    const currentCard = cards[currentCardIndex];
    const isAnswerCorrect = userAnswer.toLowerCase().trim() === currentCard.answer.toLowerCase().trim();
    setIsCorrect(isAnswerCorrect);
    
    // If this is the last question
    if (currentCardIndex === cards.length - 1) {
      // Update score and finish test
      if (isAnswerCorrect) {
        setScore(prevScore => prevScore + 1);
      }
      finishTest(isAnswerCorrect);
    } else {
      // Otherwise, update score and move to next question
      if (isAnswerCorrect) {
        setScore(prevScore => prevScore + 1);
      }
      setTimeout(() => {
        setCurrentCardIndex(currentCardIndex + 1);
        setUserAnswer('');
        setIsCorrect(null);
      }, 1000);
    }
  };

  const finishTest = async (lastAnswerCorrect) => {
    // Final score is already correct in the score state
    const finalScore = (score / cards.length) * 100;
    const timestamp = new Date().toISOString();
    
    // Calculate points earned
    const points = calculateTestPoints(score, cards.length);
    setEarnedPoints(points);
    
    // Update the display
    setShowResult(true);

    try {
      // Save to test_scores collection
      await addDoc(collection(firebase.db, 'test_scores'), {
        setId,
        userId: user.uid,
        score: finalScore,
        totalCards: cards.length,
        correctAnswers: score,
        points: points,
        completedAt: timestamp
      });

      // Get user's document
      const userDoc = doc(firebase.db, 'users', user.uid);
      const userSnap = await getDoc(userDoc);

      if (userSnap.exists()) {
        // Get existing test scores or initialize empty object
        const testScores = userSnap.data().testScores || {};
        
        // Update or add score for this set
        testScores[setId] = {
          score: finalScore,
          correctAnswers: score,
          totalCards: cards.length,
          points: points,
          completedAt: timestamp
        };

        // Update user's points
        await updateUserPoints(user, points);

        // Update user document
        await updateDoc(userDoc, {
          testScores: testScores
        });
      }
    } catch (err) {
      console.error('Error saving score:', err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    checkAnswer();
  };

  if (loading) {
    return <div className="loading">Loading test...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (showResult) {
    const finalScore = (score / cards.length) * 100;
    return (
      <div className="test-mode">
        <div className="test-complete">
          <h2>Test Complete!</h2>
          <div className="final-score">Score: {finalScore.toFixed(1)}%</div>
          <div className="score-details">
            <p>Correct Answers: {score} / {cards.length}</p>
            <p className="points-earned">Points earned: {earnedPoints}</p>
          </div>
          <div className="test-actions">
            <button onClick={() => navigate('/your-sets')}>Back to Sets</button>
            <button onClick={() => window.location.reload()}>Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="test-mode">
      <div className="test-header">
        <h1>Test Mode: {setName}</h1>
        <div className="test-progress">
          Question {currentCardIndex + 1} of {cards.length}
        </div>
        <div className="score-display">
          Score: {score} / {currentCardIndex + 1}
        </div>
      </div>

      <div className="test-card">
        <div className="question">
          {cards[currentCardIndex].question}
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your answer..."
            className={isCorrect === null ? '' : isCorrect ? 'correct' : 'incorrect'}
            autoFocus
          />
          <button type="submit">Submit</button>
        </form>
      </div>

      <button className="back-button" onClick={() => navigate('/your-sets')}>
        ← Back to Sets
      </button>
    </div>
  );
};

export default TestMode;
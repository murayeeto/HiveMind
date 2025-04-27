import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import firebase from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './SetView.css';

const SetView = () => {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [set, setSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [studyCards, setStudyCards] = useState([]);

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

        setSet(setData);

        const cardsQuery = query(
          collection(firebase.db, 'flashcards'),
          where('groupId', '==', setId)
        );
        const cardsSnapshot = await getDocs(cardsQuery);
        const loadedCards = cardsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setCards(loadedCards);
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

  const handleNextCard = () => {
    setCurrentCardIndex((prev) => (prev + 1) % cards.length);
    setIsCardFlipped(false);
  };

  const handlePrevCard = () => {
    setCurrentCardIndex((prev) =>
      prev === 0 ? cards.length - 1 : prev - 1
    );
    setIsCardFlipped(false);
  };

  const handleCardFlip = () => {
    setIsCardFlipped(!isCardFlipped);
  };

  const handleStartStudy = () => {
    setStudyCards([...cards]);
    setCurrentCardIndex(0);
    setStudyMode(true);
    setIsCardFlipped(false);
  };

  const exitStudyMode = () => {
    setStudyMode(false);
    setStudyCards([]);
    setCurrentCardIndex(0);
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
    return <div className="loading">Loading set...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!set) {
    return null;
  }

  return (
    <div className="set-view-page">
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
            <button className="study-nav-btn" onClick={handlePrevCard}>
              ←
            </button>
            <span className="study-counter">
              {currentCardIndex + 1} / {studyCards.length}
            </span>
            <button className="study-nav-btn" onClick={handleNextCard}>
              →
            </button>
            <button className="study-nav-btn study-shuffle-btn" onClick={shuffleCards}>
              🔄 Remix
            </button>
          </div>
        </div>
      )}
      <div className="set-header">
        <h1>{set.name}</h1>
        <div className="set-stats">
          <span>{cards.length} cards</span>
          <span>Created: {new Date(set.createdAt).toLocaleDateString()}</span>
        </div>
        <button className="study-button" onClick={handleStartStudy}>
          Start Studying
        </button>
      </div>

      <div className="featured-card">
        {cards.length > 0 && (
          <>
            <div className="card-navigation">
              <button onClick={handlePrevCard}>←</button>
              <span>{currentCardIndex + 1} / {cards.length}</span>
              <button onClick={handleNextCard}>→</button>
            </div>
            <div
              className={`featured-card-content ${isCardFlipped ? 'flipped' : ''}`}
              onClick={handleCardFlip}
            >
              <div className="featured-side front">
                <h3>Front</h3>
                <p>{cards[currentCardIndex].question}</p>
              </div>
              <div className="featured-side back">
                <h3>Back</h3>
                <p>{cards[currentCardIndex].answer}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="cards-grid">
        {cards.map((card, index) => (
          <div key={card.id} className="card-preview">
            <div className="card-number">#{index + 1}</div>
            <div className="card-content">
              <div className="card-side">
                <h4>Front</h4>
                <p>{card.question}</p>
              </div>
              <div className="card-side">
                <h4>Back</h4>
                <p>{card.answer}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SetView;
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
    navigate(`/study/${setId}`);
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
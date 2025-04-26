import React from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import firebase from '../firebase';
import './YourSets.css';

const YourSets = () => {
  const [sets, setSets] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedSet, setSelectedSet] = React.useState(null);
  const [question, setQuestion] = React.useState('');
  const [answer, setAnswer] = React.useState('');
  const [error, setError] = React.useState('');
  const [viewMode, setViewMode] = React.useState(false);
  const [viewCards, setViewCards] = React.useState([]);
  const [currentCardIndex, setCurrentCardIndex] = React.useState(0);
  const [isCardFlipped, setIsCardFlipped] = React.useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    const loadSets = async () => {
      try {
        const setsQuery = query(
          collection(firebase.db, 'flashcard_groups'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(setsQuery);
        const loadedSets = [];

        for (const doc of snapshot.docs) {
          const setData = { id: doc.id, ...doc.data() };
          
          const flashcardsQuery = query(
            collection(firebase.db, 'flashcards'),
            where('groupId', '==', doc.id)
          );
          const flashcardsSnapshot = await getDocs(flashcardsQuery);
          setData.cardCount = flashcardsSnapshot.size;
          
          loadedSets.push(setData);
        }

        loadedSets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setSets(loadedSets);
        setLoading(false);
      } catch (error) {
        console.error('Error loading sets:', error);
        setLoading(false);
      }
    };

    if (user) {
      loadSets();
    }
  }, [user]);

  const createFlashcard = async (e, setId) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setError('Both question and answer are required');
      return;
    }

    try {
      const newFlashcard = {
        question: question.trim(),
        answer: answer.trim(),
        userId: user.uid,
        groupId: setId,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(firebase.db, 'flashcards'), newFlashcard);
      
      setSets(sets.map(set => {
        if (set.id === setId) {
          return { ...set, cardCount: set.cardCount + 1 };
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

  const viewSet = async (setId) => {
    try {
      const flashcardsQuery = query(
        collection(firebase.db, 'flashcards'),
        where('groupId', '==', setId)
      );
      const flashcardsSnapshot = await getDocs(flashcardsQuery);
      const cards = flashcardsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setViewCards(cards);
      setViewMode(true);
      setCurrentCardIndex(0);
      setIsCardFlipped(false);
    } catch (err) {
      console.error('Error loading flashcards:', err);
      setError('Failed to load flashcards');
    }
  };

  const shuffleCards = () => {
    setViewCards(cards => {
      const shuffled = [...cards].sort(() => Math.random() - 0.5);
      return shuffled;
    });
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
  };

  const nextCard = () => {
    setCurrentCardIndex((prev) => (prev + 1) % viewCards.length);
    setIsCardFlipped(false);
  };

  const prevCard = () => {
    setCurrentCardIndex((prev) => 
      prev === 0 ? viewCards.length - 1 : prev - 1
    );
    setIsCardFlipped(false);
  };

  const startStudying = (setId) => {
    navigate(`/study/${setId}`);
  };

  if (loading) {
    return <div className="loading">Loading your sets...</div>;
  }

  return (
    <div className="your-sets-page">
      <h1>Your Study Sets</h1>

      <div className="sets-grid">
        {sets.map(set => (
          <div key={set.id} className="set-card">
            <h2>{set.name}</h2>
            <p className="card-count">{set.cardCount} cards</p>
            <div className="progress-container">
              <div 
                className="progress-bar" 
                style={{ width: `${(set.cardCount / 10) * 100}%` }}
              ></div>
            </div>
            <div className="set-actions">
              <button 
                className="action-button study"
                onClick={() => startStudying(set.id)}
              >
                Study Now
              </button>
              <button 
                className="action-button view"
                onClick={() => viewSet(set.id)}
              >
                View Cards
              </button>
              <button 
                className={`action-button add ${selectedSet === set.id ? 'active' : ''}`}
                onClick={() => setSelectedSet(prev => prev === set.id ? null : set.id)}
              >
                {selectedSet === set.id ? 'Cancel' : 'Add Cards'}
              </button>
            </div>

            {selectedSet === set.id && (
              <form className="add-cards-form" onSubmit={(e) => createFlashcard(e, set.id)}>
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

      {viewMode && (
        <div className="view-mode">
          <div className="view-header">
            <h2>Viewing Cards</h2>
            <div className="view-controls">
              <button 
                className="shuffle-btn"
                onClick={shuffleCards}
              >
                🔄 Remix Cards
              </button>
              <button 
                className="close-btn"
                onClick={() => {
                  setViewMode(false);
                  setViewCards([]);
                }}
              >
                ×
              </button>
            </div>
          </div>

          <div className="featured-card-container">
            <div 
              className={`featured-card ${isCardFlipped ? 'flipped' : ''}`}
              onClick={() => setIsCardFlipped(!isCardFlipped)}
            >
              <div className="card-inner">
                <div className="card-front">
                  <div className="card-label">Question</div>
                  <div className="card-text">
                    {viewCards[currentCardIndex]?.question}
                  </div>
                </div>
                <div className="card-back">
                  <div className="card-label">Answer</div>
                  <div className="card-text">
                    {viewCards[currentCardIndex]?.answer}
                  </div>
                </div>
              </div>
            </div>

            <div className="card-navigation">
              <button onClick={prevCard}>←</button>
              <button onClick={nextCard}>→</button>
            </div>
            <div className="card-counter">
              {currentCardIndex + 1} / {viewCards.length}
            </div>
          </div>

          <div className="cards-list">
            <h3>All Cards</h3>
            {viewCards.map((card, index) => (
              <div key={card.id} className="list-card">
                <div className="card-number">{index + 1}</div>
                <div className="card-content">
                  <div className="card-question">
                    <span>Q:</span> {card.question}
                  </div>
                  <div className="card-answer">
                    <span>A:</span> {card.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {sets.length === 0 && (
        <div className="empty-state">
          <p>You haven't created any study sets yet.</p>
          <button 
            className="create-button"
            onClick={() => navigate('/')}
          >
            Create Your First Set
          </button>
        </div>
      )}
    </div>
  );
};

export default YourSets;
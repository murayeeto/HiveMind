import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import departmentsAndMajors from '../data/departmentsAndMajors';
import './Faq.css';

// Flatten majors list
const allMajors = Object.values(departmentsAndMajors).flat().sort();

// Static FAQ data
const faqData = {
  title: "Frequently Asked Questions",
  categories: [
    {
      title: "General Questions.",
      items: [
        {
          question: "What is HiveMind?",
          answer: "HiveMind is a cutting-edge AI-powered study platform designed specifically for Delaware State University students. It combines smart study group matching, automated scheduling, and personalized learning resources to create an optimal learning environment. Our platform uses advanced algorithms to connect you with compatible study partners and provide tailored educational content."
        },
        {
          question: "How is this different from Discord or Facebook Groups?",
          answer: "Unlike general social platforms, HiveMind is purpose-built for academic success. We offer automated calendar syncing for study sessions, AI-powered resource recommendations, and a focus on academic compatibility matching. Our platform also integrates with your major and course information to provide truly relevant study connections and materials."
        },
        {
          question: "Is HiveMind secure and private?",
          answer: "Yes, HiveMind prioritizes your privacy and security. We use secure authentication through your school credentials, encrypt all personal data, and maintain strict privacy controls for study group information. You have full control over your visibility and sharing preferences."
        },
        {
          question: "Can I use HiveMind on my mobile device?",
          answer: "Yes, HiveMind is fully responsive and works seamlessly on all devices - smartphones, tablets, and computers. You can access all features and manage your study sessions on the go."
        }
      ]
    },
    {
      title: "Study Groups",
      items: [
        {
          question: "How do I find study groups?",
          answer: "HiveMind offers multiple ways to find study groups: browse by department, course, or major; use smart filters for scheduling preferences and group size; or let our AI matching system suggest compatible study partners based on your academic profile and study habits."
        },
        {
          question: "What makes study groups effective on HiveMind?",
          answer: "Our platform encourages productive study sessions through structured meeting formats, integrated calendar management, and clear group objectives. You can set specific study goals, track progress, and access relevant study materials all in one place."
        },
        {
          question: "Can I create both one-on-one and group study sessions?",
          answer: "Yes! HiveMind supports both duo sessions (2 people) and group sessions (3-10 people). You can create or join either type based on your study preferences and learning style. Each format has specialized features to enhance the study experience."
        },
        {
          question: "What if I need to reschedule or cancel a session?",
          answer: "HiveMind makes it easy to manage your study commitments. You can reschedule sessions with group consensus, set up recurring meetings, or cancel if needed. All changes automatically sync with everyone's calendars."
        }
      ]
    },
    {
      title: "Premium Features",
      items: [
        {
          question: "What features are included in HiveMind Premium?",
          answer: "Premium members get access to advanced features including: AI-powered study resource recommendations, priority matching for study groups, unlimited study session creation, advanced analytics to track your study habits, and early access to new features."
        },
        {
          question: "How much does Premium cost?",
          answer: "We offer flexible pricing options: Monthly ($4.99) or Annual ($49.99) subscriptions. The annual plan provides a significant discount. Special discounts are available for student organizations and study groups."
        },
        {
          question: "What makes the AI recommendations special?",
          answer: "Our AI system analyzes your course materials, study patterns, and learning preferences to recommend highly relevant educational videos, textbooks, and study resources. It adapts to your progress and feedback to provide increasingly personalized suggestions."
        },
        {
          question: "Can I try Premium features before subscribing?",
          answer: "Yes! New users can access a 14-day free trial of Premium features. This lets you experience the full power of HiveMind's advanced features before making a commitment."
        }
      ]
    }
  ]
};

const Faq = () => {
  const { user } = useAuth();
  const [showAiDemo, setShowAiDemo] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [videoRecommendation, setVideoRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [selectedMajor, setSelectedMajor] = useState(user?.major || allMajors[0]);

  const chatContainerRef = useRef(null);
  const aiDemoRef = useRef(null);

  const scrollToDemo = () => {
    if (aiDemoRef.current) {
      aiDemoRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    const fetchFaqData = async () => {
      try {
        setLoading(false);
      } catch (error) {
        console.error('Error fetching FAQ data:', error);
        setLoading(false);
      }
    };

    fetchFaqData();
    window.scrollTo(0,0);
  }, []);

  useEffect(() => {
    if (user?.major) {
      setSelectedMajor(user.major);
    }
  }, [user]);

  const toggleAnswer = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const handleAskAi = async () => {
    if (!userInput.trim()) return;

    const userMessage = userInput;
    setUserInput('');
    setChatMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    
    setLoading(true);
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/ask-ai`, {
        message: userMessage
      });
      setChatMessages(prev => [...prev, { type: 'ai', text: response.data.response }]);
    } catch (error) {
      console.error('Error asking AI:', error);
      setChatMessages(prev => [...prev, {
        type: 'error',
        text: 'Sorry, there was an error connecting to the AI. Please try again later.'
      }]);
    }
    setLoading(false);
  };

  const handleGetVideoRecommendation = async () => {
    if (user && !user.major) {
      setVideoRecommendation('no-major');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/recommend-video`, {
        major: user ? user.major : selectedMajor
      });
      console.log('Video response:', response.data);
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        setVideoRecommendation(response.data);
      } else {
        console.error('No videos found in response:', response.data);
        setVideoRecommendation(null);
      }
    } catch (error) {
      console.error('Error getting video recommendation:', error);
      setVideoRecommendation(null);
    }
    setLoading(false);
  };

  return (
    <div className="faq-page">
      <div className="faq-header">
        <h1>{faqData.title}</h1>
        <p>Find answers to common questions about our study platform</p>
      </div>

      <div className="faq-content">
        {faqData.categories.map((category, catIndex) => (
          <div key={catIndex} className="faq-category">
            <h2>{category.title}</h2>
            <div className="faq-items">
              {category.items.map((item, itemIndex) => {
                const uniqueIndex = `${catIndex}-${itemIndex}`;
                return (
                  <div key={uniqueIndex} className="faq-item">
                    <div 
                      className="faq-question" 
                      onClick={() => toggleAnswer(uniqueIndex)}
                    >
                      <h3>{item.question}</h3>
                      <span className="toggle-icon">
                        {activeIndex === uniqueIndex ? '−' : '+'}
                      </span>
                    </div>
                    {activeIndex === uniqueIndex && (
                      <div className="faq-answer">
                        <p>{item.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="ai-demo-section" ref={aiDemoRef}>
        <h2>AI Features Demo</h2>
        <div className="demo-buttons">
          <button
            type="button"
            onClick={() => {
              setShowAiDemo(true);
              scrollToDemo();
            }}
            className="demo-button"
          >
            Demo Now!
          </button>
          <button
            type="button"
            onClick={() => {
              handleGetVideoRecommendation();
              scrollToDemo();
            }}
            className="recommend-button"
          >
            Recommend Video
          </button>
        </div>

        {showAiDemo && (
          <div className={`ai-chat-demo ${loading ? 'loading' : ''}`}>
            <div className="chat-messages" ref={chatContainerRef}>
              {chatMessages.length === 0 && !loading && (
                <div className="chat-message ai">
                  <div className="message-content">
                    <span className="message-sender">AI Assistant:</span>
                    <p>Hello! I'm your personal study assistant, ready to help you succeed in your studies. I can help with study techniques, difficult concepts, or time management. What would you like help with today?</p>
                  </div>
                </div>
              )}
              {chatMessages.map((message, index) => (
                <div key={index} className={`chat-message ${message.type}`}>
                  <div className="message-content">
                    <span className="message-sender">
                      {message.type === 'user' ? 'You' : 'AI Assistant'}:
                    </span>
                    <p>{message.text}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="chat-message ai">
                  <div className="message-content">
                    <span className="message-sender">AI Assistant:</span>
                    <p>Thinking...</p>
                  </div>
                </div>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskAi();
                if (chatContainerRef.current) {
                  chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                }
              }}
              className="chat-input-form"
            >
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask me anything about studying..."
                className="chat-input"
                disabled={loading}
              />
              <button
                type="submit"
                className="ask-ai-button"
                disabled={loading || !userInput.trim()}
              >
                Send
              </button>
            </form>
          </div>
        )}

        {!user && (
          <div className="major-selector">
            <select 
              value={selectedMajor}
              onChange={(e) => setSelectedMajor(e.target.value)}
              className="major-dropdown"
            >
              {allMajors.map((major) => (
                <option key={major} value={major}>
                  {major}
                </option>
              ))}
            </select>
          </div>
        )}

        {videoRecommendation === 'no-major' ? (
          <div className="video-recommendations">
            <h3>Major Not Set</h3>
            <p>Please set your major in your account settings to get personalized video recommendations.</p>
          </div>
        ) : videoRecommendation ? (
          <div className="video-recommendations">
            <h3>Recommended Videos for {user ? user.major : selectedMajor}:</h3>
            <div className="video-grid">
              {videoRecommendation.map((video, index) => (
                <div key={index} className="video-card">
                  <img src={video.thumbnail} alt={video.title} className="video-thumbnail" />
                  <h4>{video.title}</h4>
                  <p>{video.description}</p>
                  <a href={video.url} target="_blank" rel="noopener noreferrer" className="watch-button">
                    Watch Video
                  </a>
                </div>
              ))}
            </div>
          </div>
        ) : loading ? null : videoRecommendation === null && (
          <div className="video-recommendations">
            <h3>No Videos Found</h3>
            <p>Sorry, we couldn't find any educational videos for your major at the moment. Please try again later.</p>
          </div>
        )}
      </div>

      <div className="faq-support">
        <h2>Still have questions?</h2>
        <p>Contact our support team at <a href="mailto:support@studyservice.com">support@studyservice.com</a> or use the chat feature in the app.</p>
      </div>
    </div>
  );
};

export default Faq;
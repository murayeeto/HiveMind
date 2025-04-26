import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

const Home = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const upcomingSessions = [
    {
      type: 'duo',
      partner: 'Matthew Little',
      date: 'April 3rd',
      time: '7:00pm',
      location: 'William C. Jason Library'
    },
    {
      type: 'group',
      date: 'April 7th',
      time: '6:30 pm',
      location: 'Tubman Halls'
    },
    {
      type: 'group',
      date: 'April 7th',
      time: '6:30 pm',
      location: 'Tubman Halls'
    }
  ];

  const features = [
    {
      title: 'Find Study Partners',
      icon: '/study-group.png',
      link: '/grouping',
      style: 'primary'
    },
    {
      title: 'Get AI Powered Recommendations',
      icon: '/ai-robot.png',
      link: '/study-with-buddy',
      style: 'secondary'
    },
    {
      title: 'Learn by playing our games',
      icon: '/rocket.png',
      link: '/study',
      style: 'primary'
    },
    {
      title: 'Go to Calendar',
      icon: '/calendar.png',
      link: '/calendar',
      style: 'secondary'
    }
  ];

  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1>Welcome to HiveWind</h1>
          <p>
            Find study partners, access recommended resources, and stay organized with our user-friendly platform. Your one-stop solution for all your needs!
          </p>
          {!currentUser && (
            <button 
              className="google-login-btn"
              onClick={() => navigate('/signin')}
            >
              <img src="/google-icon.png" alt="Google" />
              Continue with Google
            </button>
          )}
        </div>
      </div>

      <div className="content-section">
        <div className="section-container">
          <div className="upcoming-sessions">
            <h2>Upcoming sessions</h2>
            <div className="sessions-list">
              {upcomingSessions.map((session, index) => (
                <div key={index} className="session-card">
                  <div className="session-info">
                    {session.type === 'duo' ? (
                      <p>You have an upcoming duo session with {session.partner} on {session.date} at {session.time}</p>
                    ) : (
                      <p>You have an upcoming Group study session on {session.date} at {session.time}</p>
                    )}
                    <div className="location">
                      <span className="location-icon">📍</span>
                      {session.location}
                    </div>
                  </div>
                  <button className="cancel-btn">Cancel session</button>
                </div>
              ))}
            </div>
            <button className="view-more-btn">View More</button>
          </div>

          <div className="features-grid">
            <h2>Features</h2>
            <div className="features-container">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className="feature-card"
                  onClick={() => navigate(feature.link)}
                >
                  <div className="feature-icon">
                    <img src={feature.icon} alt={feature.title} />
                  </div>
                  <button className={`feature-btn ${feature.style}`}>
                    {feature.title}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
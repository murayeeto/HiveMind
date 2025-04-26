import React from 'react';
import './StudyPage.css'; // We'll update this CSS file
import { FaPlus } from 'react-icons/fa'; // You'll need to install react-icons

const StudyPage = () => {
  // Mock data - replace with your actual data
  const recentSets = [
    { id: 1, title: 'Biology Chapter 5', progress: 65, lastStudied: '2 hours ago' },
    { id: 2, title: 'Spanish Verbs', progress: 42, lastStudied: '1 day ago' }
  ];

  // Now only based on test scores
  const recommendedSets = [
    { id: 4, title: 'World History Dates', score: '58% accuracy' },
    { id: 5, title: 'Chemistry Elements', score: '62% accuracy' }
  ];

  return (
    <div className="study-page">
      <h1 className="page-title">Your Study Hub</h1>
      
      <div className="dashboard-container">
        {/* Study Sets Box - Now with large buttons */}
        <div className="dashboard-box sets-box">
          <h2>Study Sets</h2>
          <div className="big-buttons-container">
            <button className="big-button create-button">
              <FaPlus className="plus-icon" />
              <span>Create New</span>
            </button>
            <button className="big-button view-button">
              Your Sets
            </button>
          </div>
        </div>

        {/* Recommended Sets Box - simplified */}
        <div className="dashboard-box recommended-box">
          <h2>Needs Improvement</h2>
          <p className="subtitle">Based on your test scores</p>
          <div className="sets-list">
            {recommendedSets.map(set => (
              <div key={set.id} className="set-item">
                <h3>{set.title}</h3>
                <p className="score">Test score: {set.score}</p>
                <button className="hive-button small">Practice Now</button>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Used Box */}
        <div className="dashboard-box recent-box">
          <h2>Recently Used</h2>
          <div className="sets-list">
            {recentSets.map(set => (
              <div key={set.id} className="set-item">
                <h3>{set.title}</h3>
                <div className="progress-container">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${set.progress}%` }}
                  ></div>
                </div>
                <p className="last-studied">Last studied: {set.lastStudied}</p>
                <button className="hive-button small">Continue</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyPage;
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './App.css';

// Components
import Navbar from './components/Navbar';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Calendar from './pages/Calendar';
import Faq from './pages/Faq';
import Account from './pages/Account';
import StudyWithBuddy from './pages/StudyWithBuddy';
import Pricing from './pages/Pricing'
import StudyPage from './pages/StudyPage'
import Study from './pages/Study';
import YourSets from './pages/YourSets';
import SetView from './pages/SetView';
import Games from './pages/Games';
import MatchingGame from './pages/MatchingGame';
import TestMode from './pages/TestMode';


// Auth Context
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="App">
          <Navbar />
          <div className="container">
            <Routes>
              <Route path="/signin" element={<Login />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Home />
                  </PrivateRoute>
                }
              />
              <Route
                path="/studywithbuddy"
                element={
                  <PrivateRoute>
                    <StudyWithBuddy />
                  </PrivateRoute>
                }
              />
              <Route
                path="/faq"
                element={
                  <PrivateRoute>
                    <Faq />
                  </PrivateRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <PrivateRoute>
                    <Calendar />
                  </PrivateRoute>
                }
              />
              <Route
                path="/pricing"
                element={
                  <PrivateRoute>
                    <Pricing />
                  </PrivateRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <PrivateRoute>
                    <Account />
                  </PrivateRoute>
                }
              />
              <Route
                path="/your-sets"
                element={
                  <PrivateRoute>
                    <YourSets />
                  </PrivateRoute>
                }
              />
              <Route
                path="/set/:setId"
                element={
                  <PrivateRoute>
                    <SetView />
                  </PrivateRoute>
                }
              />
              <Route
                path="/games"
                element={
                  <PrivateRoute>
                    <Games />
                  </PrivateRoute>
                }
              />
              <Route
                path="/games/matching/:setId"
                element={
                  <PrivateRoute>
                    <MatchingGame />
                  </PrivateRoute>
                }
              />
              <Route
                path="/test/:setId"
                element={
                  <PrivateRoute>
                    <TestMode />
                  </PrivateRoute>
                }
              />
              <Route
                path="/studysets"
                element={
                  <PrivateRoute>
                    <StudyPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/study"
                element={
                  <PrivateRoute>
                    <Study />
                  </PrivateRoute>
                }
              />
            </Routes>
          </div>
          <Footer></Footer>
        </div>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
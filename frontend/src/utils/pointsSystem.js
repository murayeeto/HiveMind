import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import firebase from '../firebase';

// Points calculation constants
const GAME_BASE_POINTS = 100;
const TIME_PENALTY = 2; // Points deducted per second
const MOVE_PENALTY = 5; // Points deducted per move
const MIN_POINTS = 10; // Minimum points awarded for completion

// Test points constants
const TEST_BASE_POINTS = 50; // Base points per correct answer
const PERFECT_SCORE_BONUS = 100; // Bonus for 100% score

export const calculateGamePoints = (time, moves) => {
    // Start with base points
    let points = GAME_BASE_POINTS;
    
    // Deduct points for time taken
    points -= time * TIME_PENALTY;
    
    // Deduct points for moves made
    points -= moves * MOVE_PENALTY;
    
    // Ensure minimum points
    return Math.max(points, MIN_POINTS);
};

export const calculateTestPoints = (correctAnswers, totalQuestions) => {
    // Calculate percentage score
    const percentage = (correctAnswers / totalQuestions) * 100;
    
    // Base points from correct answers
    let points = correctAnswers * TEST_BASE_POINTS;
    
    // Add bonus for perfect score
    if (percentage === 100) {
        points += PERFECT_SCORE_BONUS;
    }
    
    return Math.round(points);
};

export const updateUserPoints = async (user, pointsToAdd) => {
    const userRef = doc(firebase.db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
        const currentPoints = userDoc.data().points || 0;
        await updateDoc(userRef, {
            points: currentPoints + pointsToAdd
        });
    } else {
        await setDoc(userRef, {
            points: pointsToAdd
        });
    }
};
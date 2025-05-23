"""
Backend Server for HornetHelper
Provides AI-powered endpoints for chat assistance and video recommendations.
Uses OpenAI for natural language processing and YouTube API for video search.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from functools import wraps
from ai_utils import get_ai_response, get_video_recommendation, get_textbook_recommendation, generate_flashcards
#test
app = Flask(__name__)

# Configure CORS to allow requests from both local and deployed frontend
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:4000",
            "https://localhost:4000",
            "https://hivemind-app.firebaseapp.com",
            "https://hivemind-app.web.app",
            "https://murayeeto.github.io",
            "https://murayeeto.github.io/HiveMind/#/",
            "https://hivemind-d8z8.onrender.com"
        ],
        "methods": ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

# API Endpoints

@app.route('/api/ask-ai', methods=['POST'])
def ask_ai():
    """
    AI Q&A Endpoint
    Accepts a user's question and returns an AI-generated response.
    
    Request body:
    {
        "message": "User's question string"
    }
    
    Returns:
    - 200: JSON with AI response
    - 400: If message is missing
    - 500: For server errors
    """
    try:
        print("Received ask-ai request")
        data = request.get_json()
        print("Request data:", data)
        
        if not data or 'message' not in data:
            print("Error: Message is missing from request")
            return jsonify({"error": "Message is required"}), 400
        
        print("Getting AI response for message:", data['message'])
        response = get_ai_response(data['message'])
        print("AI response:", response)
        return jsonify({"response": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/recommend-video', methods=['POST'])
def recommend_video():
    """
    Video Recommendation Endpoint
    Returns educational videos based on the provided course/major.
    
    Request body:
    {
        "major": "Course or major name"
    }
    
    Returns:
    - 200: JSON array of video recommendations
    - 400: If major is missing
    - 404: If no videos found
    - 500: For server errors
    """
    try:
        data = request.get_json()
        if not data or 'major' not in data:
            return jsonify({"error": "Major is required"}), 400
        major = data['major']
        recommendation = get_video_recommendation(major)
        
        if recommendation:
            return jsonify(recommendation)
        return jsonify({"error": "No video recommendations found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/recommend-textbook', methods=['POST'])
def recommend_textbook():
    """
    Textbook Recommendation Endpoint
    Returns textbook recommendations based on the provided course/major.
    
    Request body:
    {
        "major": "Course or major name"
    }
    
    Returns:
    - 200: JSON array of textbook recommendations
    - 400: If major is missing
    - 404: If no textbooks found
    - 500: For server errors
    """
    try:
        data = request.get_json()
        if not data or 'major' not in data:
            return jsonify({"error": "Major is required"}), 400
        major = data['major']
        recommendation = get_textbook_recommendation(major)
        
        if recommendation:
            return jsonify(recommendation)
        return jsonify({"error": "No textbook recommendations found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate-flashcards', methods=['POST'])
def create_flashcards():
    """
    Flashcard Generation Endpoint
    Generates a set of flashcards based on the provided course/topic.
    
    Request body:
    {
        "course": "Course name or topic"
    }
    
    Returns:
    - 200: JSON array of flashcards with questions and answers
    - 400: If course is missing
    - 500: For server errors
    """
    try:
        data = request.get_json()
        if not data or 'course' not in data:
            return jsonify({"error": "Course is required"}), 400
            
        course = data['course']
        flashcards = generate_flashcards(course)
        
        if flashcards:
            return jsonify(flashcards)
        return jsonify({"error": "Failed to generate flashcards"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Global Error Handlers

@app.errorhandler(404)
def not_found(error):
    """Handle 404 Not Found errors"""
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def server_error(error):
    """Handle 500 Internal Server errors"""
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=8000)
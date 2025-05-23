"""
AI Utilities Module
Provides integration with OpenAI for Q&A and YouTube for educational video recommendations.
Requires API keys to be set in .env file:
- OPENAI_API_KEY: For ChatGPT integration
- YOUTUBE_API_KEY: For video search functionality
"""

import os
import openai
import pandas as pd
from googleapiclient.discovery import build
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Path to the textbooks dataset
TEXTBOOKS_CSV_PATH = './backend/csv/textbooks.csv'

# Initialize OpenAI with API key
openai.api_key = os.getenv('OPENAI_API_KEY')
if not openai.api_key:
    print("Warning: OPENAI_API_KEY not found in environment variables")

# Set up YouTube API client for video recommendations
YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')
youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)

def get_ai_response(prompt):
    """
    Generate an AI response using OpenAI's ChatGPT
    
    Args:
        prompt (str): User's question or message
        
    Returns:
        str: AI-generated response focused on educational guidance
        
    Note:
        Uses GPT-3.5-turbo with specific instructions to act as a supportive teacher,
        providing guidance rather than direct answers to encourage learning.
    """
    try:
        if not openai.api_key:
            print("Error: OpenAI API key not found")
            return "OpenAI API key not configured. Please set OPENAI_API_KEY in your environment."
            
        print("Attempting to get AI response for prompt:", prompt)
        # Create the chat completion
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a kind and supportive teacher who helps students succeed. Keep responses concise (3-4 sentences max). Be clear, encouraging, and practical. Use simple formatting - no markdown or special characters. Focus on giving actionable advice and clear explanations and also try not give the user the direct answer they are seeking rather seek to guide them to the correct answer."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.7
        )
        
        # Extract the response text
        return response.choices[0].message['content'].strip()
    except Exception as e:
        print(f"Error generating AI response: {str(e)}")
        return "I apologize, but I'm having trouble processing your request right now. Please try again later."

def get_video_recommendation(major):
    """
    Search YouTube for educational videos related to a specific course or major
    
    Args:
        major (str): Course name or major to search for
        
    Returns:
        list: List of dictionaries containing video information:
            - title: Video title
            - url: YouTube watch URL
            - thumbnail: High-quality thumbnail URL
            - description: Truncated video description
            
    Note:
        - Searches for course-specific educational content
        - Returns up to 3 most relevant results
        - Ensures videos are embeddable and safe for educational use
        - Truncates descriptions to 100 characters for readability
    """
    try:
        # Construct an education-focused search query
        search_query = f"{major} course lecture tutorial concepts"
        
        # Configure YouTube search parameters
        request = youtube.search().list(
            part="snippet",
            q=search_query,
            type="video",          # Only return videos (not playlists/channels)
            videoEmbeddable="true", # Ensure videos can be embedded
            maxResults=3,          # Limit to top 3 results
            relevanceLanguage="en", # English content only
            safeSearch="strict"    # Ensure content is appropriate
        )
        response = request.execute()

        if not response.get('items'):
            return None

        # Process and format video results
        videos = []
        for video in response['items']:
            video_id = video['id']['videoId']
            video_title = video['snippet']['title']
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            thumbnail_url = video['snippet']['thumbnails']['high']['url']
            
            # Format video data for frontend display
            videos.append({
                "title": video_title,
                "url": video_url,
                "thumbnail": thumbnail_url,
                "description": video['snippet']['description'][:100] + '...' if len(video['snippet']['description']) > 100 else video['snippet']['description']
            })

        return videos
    except Exception as e:
        print(f"Error getting video recommendation for course '{major}': {str(e)}")
        if not YOUTUBE_API_KEY:
            print("YouTube API key is missing!")
        return None

def get_textbook_recommendation(major):
    """
    Search for textbook recommendations related to a specific course or major
    
    Args:
        major (str): Course name or major to search for
        
    Returns:
        list: List of dictionaries containing textbook information:
            - title: Textbook title
            - author: Author name
            - isbn: ISBN number
            - subject: Subject area
            - description: Course description if available
            
    Note:
        - Returns up to 3 most relevant textbooks
        - Matches based on course name and subject area
        - Uses a local CSV file containing textbook information
    """
    try:
        # Read the dataset from local CSV file
        df = pd.read_csv(TEXTBOOKS_CSV_PATH)
        
        # Convert search terms and book titles to lowercase for case-insensitive matching
        search_terms = major.lower().split()
        
        # Convert search terms and book titles to lowercase for case-insensitive matching
        search_terms = major.lower().split()
        
        # Create a relevance score based on how many search terms match the book title
        df['relevance'] = df.apply(
            lambda row: sum(
                term in str(row['title']).lower()
                for term in search_terms
            ),
            axis=1
        )
        
        # Get top 3 most relevant textbooks
        relevant_books = df[df['relevance'] > 0].sort_values('relevance', ascending=False).head(3)
        
        if relevant_books.empty:
            return None
            
        # Format results
        textbooks = []
        for _, book in relevant_books.iterrows():
            textbooks.append({
                "title": book['title'],
                "edition": book['edition'] if 'edition' in book else "Edition not available"
            })
            
        return textbooks
        
    except Exception as e:
        print(f"Error getting textbook recommendation for course '{major}': {str(e)}")
        return None

def generate_flashcards(course):
    """
    Generate flashcards for a specific course using OpenAI's ChatGPT
    
    Args:
        course (str): Course name or topic to generate flashcards for
        
    Returns:
        list: List of dictionaries containing flashcard information:
            - question: The question or front of the card
            - answer: The answer or back of the card
            
    Note:
        Uses GPT-3.5-turbo to generate 5 relevant flashcards for studying
    """
    try:
        if not openai.api_key:
            print("Error: OpenAI API key not found")
            return None
            
        print(f"Generating flashcards for course: {course}")
        
        # Create the chat completion with specific instructions
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert in creating educational flashcards. Generate 5 question-answer pairs for studying. Focus on key concepts, definitions, and important facts. Keep questions clear and concise. Answers should be brief but comprehensive."},
                {"role": "user", "content": f"Create 5 flashcards for studying {course}. Return them in this format: [{{\"question\": \"Q1\", \"answer\": \"A1\"}}, {{\"question\": \"Q2\", \"answer\": \"A2\"}}]"}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        # Extract and parse the response
        content = response.choices[0].message['content'].strip()
        # Convert string representation of list to actual list
        import ast
        flashcards = ast.literal_eval(content)
        
        return flashcards
        
    except Exception as e:
        print(f"Error generating flashcards: {str(e)}")
        return None
# HornetHelper

A study assistance platform with AI-powered features.

## Setup Instructions

### Prerequisites
- Python 3.8 or higher
- Node.js 14 or higher
- npm or yarn
- Kaggle account for dataset access
- OpenAI API key
- YouTube Data API key

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
```

3. Install required packages:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
- Create a `.env` file in the backend directory
- Add the following variables:
```
OPENAI_API_KEY=your_openai_api_key
YOUTUBE_API_KEY=your_youtube_api_key
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
- Create a `.env` file in the frontend directory
- Add the following variables:
```
REACT_APP_BACKEND_URL=http://localhost:8888
```

### Dataset Setup

The textbook recommendation feature requires the US College Textbooks and Courses dataset from Kaggle:

1. Create a Kaggle account if you don't have one
2. Generate a Kaggle API token:
   - Go to your Kaggle account settings
   - Click "Create New API Token"
   - Save the kaggle.json file

3. Set up the dataset:
```bash
# Create csv directory
mkdir csv

# Download dataset using kagglehub
pip install kagglehub
python -c "import kagglehub; kagglehub.dataset_download('polartech/us-college-textbooks-and-courses-dataset')"

# Move and rename the dataset
mv us-college-textbooks-and-courses-dataset/textbooks.csv csv/
```

Alternatively, you can manually:
1. Download the dataset from [US College Textbooks and Courses Dataset](https://www.kaggle.com/datasets/polartech/us-college-textbooks-and-courses-dataset)
2. Create a `csv` folder in the root directory
3. Extract and place the textbooks CSV file in the `csv` folder
4. Rename the file to `textbooks.csv`

### Running the Application

1. Start the backend server:
```bash
cd backend
python app.py
```
The backend will run on http://localhost:8888

2. In a new terminal, start the frontend:
```bash
cd frontend
npm start
```
The frontend will run on http://localhost:3000

## Features

- Real-time chat for study sessions
- AI-powered Q&A assistance
- Educational resource recommendations:
  - Educational videos from YouTube
  - Relevant textbooks from the dataset
- Comprehensive FAQ section with:
  - General platform information
  - Study group guidance
  - Premium features details
  - Interactive AI demo

## Troubleshooting

- If you encounter CORS issues, ensure the backend is running on port 8888
- If the AI features aren't working, verify your OpenAI API key
- For video recommendation issues, check your YouTube API key
- For textbook recommendations, ensure the dataset is properly placed in the csv folder
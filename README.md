# HiveMind

A study assistance platform with AI-powered features.

## Setup Instructions

### Prerequisites
- Python 3.9.16 (recommended for deployment)
- Node.js 14 or higher
- npm or yarn
- Kaggle account for dataset access
- OpenAI API key
- YouTube Data API key
- Firebase project credentials

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
- Copy `.env.example` to create `.env` for development and `.env.production` for production
- Update the Firebase configuration in both files with your Firebase project details:
```
REACT_APP_API_URL=http://localhost:8000  # For development
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_firebase_app_id
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
The backend will run on http://localhost:8000

2. In a new terminal, start the frontend:
```bash
cd frontend
npm start
```
The frontend will run on http://localhost:4000

## Deployment on Render

### Backend Deployment

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the service:
   - Name: hornethelper-backend (or your preferred name)
   - Environment: Python
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `gunicorn --chdir backend app:app --bind 0.0.0.0:$PORT`
   
4. Add environment variables:
   - OPENAI_API_KEY: Your OpenAI API key
   - YOUTUBE_API_KEY: Your YouTube Data API key

The backend will be deployed and accessible at your Render URL.

### Environment Configuration

1. After deployment, update your frontend's production environment:
   - In `.env.production`, update REACT_APP_API_URL to your Render backend URL
   ```
   REACT_APP_API_URL=https://your-render-backend-url
   ```

2. Update CORS settings in backend/app.py:
   - Add your deployed frontend URL to the CORS origins list

### Deployment Checklist

- [ ] Backend code pushed to GitHub
- [ ] Python 3.9.16 selected in Render settings
- [ ] numpy==1.24.3 and pandas==2.0.3 versions confirmed in requirements.txt
- [ ] Environment variables set in Render dashboard
- [ ] Frontend environment updated with new backend URL
- [ ] CORS origins updated in backend code
- [ ] CSV directory with textbooks.csv present in the repository

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

- If you encounter CORS issues, ensure the backend is running on port 8000
- If the AI features aren't working, verify your OpenAI API key
- For video recommendation issues, check your YouTube API key
- For textbook recommendations, ensure the dataset is properly placed in the csv folder
- For Firebase authentication issues, verify your Firebase configuration in the environment files
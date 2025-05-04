# CodeFlowAI UI

A web application to generate comprehensive tutorials from any codebase using PocketFlow.

![Screenshot](screenshot.png)

## Features

- Generate tutorials from GitHub repositories or local directories
- Background processing with real-time status updates
- User-friendly interface for viewing generated tutorials
- Support for syntax highlighting and Mermaid diagrams
- Support for multiple languages

## System Architecture

The application consists of two parts:

1. **Backend** (FastAPI): Handles tutorial generation requests, manages background tasks, and serves generated content.
2. **Frontend** (Next.js): Provides a user interface for submitting requests, viewing job status, and reading tutorials.

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│             │       │             │       │             │
│   Next.js   │ ━━━━▶ │   FastAPI   │ ━━━━▶ │  PocketFlow │
│  Frontend   │       │   Backend   │       │ Core Engine │
│             │ ◀━━━━ │             │ ◀━━━━ │             │
└─────────────┘       └─────────────┘       └─────────────┘
```

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- OpenAI API key or other LLM provider credentials

### Backend Setup

1. Set up the FastAPI backend:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -e ..  # Install parent PocketFlow project
```

2. Create a `.env` file in the backend directory:

```
OPENAI_API_KEY=your_api_key_here
OPENAI_URL=your_api_url  # Optional, for custom endpoints
GITHUB_TOKEN=your_github_token  # Optional, for crawling private repos
```

3. Start the backend server:

```bash
uvicorn app:app --reload
```

The API will be available at [http://localhost:8000](http://localhost:8000).

### Frontend Setup

1. Set up the Next.js frontend:

```bash
cd frontend
npm install
# or
yarn install
```

2. Start the development server:

```bash
npm run dev
# or
yarn dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Usage

1. **Generate a Tutorial**:
   - Enter a GitHub repository URL or local directory path
   - Configure optional settings like language and max abstractions
   - Click "Generate Tutorial"

2. **Monitor Job Status**:
   - View real-time status of the generation job
   - Wait for the job to complete

3. **View the Tutorial**:
   - Browse through chapters in the sidebar
   - Read the generated content with syntax highlighting and diagrams
   - Navigate between chapters using links

## Development

- Backend API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs)
- The frontend uses Next.js with TypeScript and Tailwind CSS
- Both components communicate via REST API

## License

This project is licensed under the MIT License - see the LICENSE file for details.


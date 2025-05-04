# Tutorial Generator Backend

A FastAPI backend for the CodeFlowAI.

## Features

- RESTful API for tutorial generation
- Background task processing
- File serving for generated content
- Built on FastAPI for high performance

## Getting Started

### Prerequisites

- Python 3.8+
- PocketFlow project dependencies
- OpenAI API key or other LLM provider credentials

### Installation

1. Create and activate a virtual environment:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
# Also install parent project requirements
pip install -e ..
```

3. Set up environment variables:

Create a `.env` file in the backend directory with the following variables:

```
OPENAI_API_KEY=your_api_key_here
OPENAI_URL=your_api_url  # Optional, for custom endpoints
GITHUB_TOKEN=your_github_token  # Optional, for crawling private repos
```

4. Start the server:

```bash
uvicorn app:app --reload
```

The API will be available at [http://localhost:8000](http://localhost:8000).

## API Endpoints

- `POST /generate`: Start a tutorial generation job
- `GET /status/{job_id}`: Get job status
- `GET /jobs`: List all jobs
- `GET /output/{project_name}`: Get tutorial content for a project
- `GET /file/{project_name}/{filename}`: Get a specific file from a project
- `DELETE /jobs/{job_id}`: Delete a job and its output

Visit [http://localhost:8000/docs](http://localhost:8000/docs) for interactive API documentation.

## Configuration

The backend requires access to the PocketFlow library. Make sure the parent directory is accessible or install PocketFlow as a package.

## Production Deployment

For production, use Gunicorn with Uvicorn workers:

```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app:app
```

Consider using a process manager like Supervisor or systemd for production deployments. 
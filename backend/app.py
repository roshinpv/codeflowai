from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import os
import sys
import json
from datetime import datetime
import shutil

# Add parent directory to path so we can import the tutorial generator
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from flow import create_tutorial_flow

app = FastAPI(title="Tutorial Generator API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create output directory if it doesn't exist
os.makedirs("output", exist_ok=True)

# Mount the output directory for serving files
app.mount("/files", StaticFiles(directory="output"), name="output_files")

# Store jobs in memory (in a real app, use a database)
jobs = {}

class TutorialRequest(BaseModel):
    repo_url: Optional[str] = None
    local_dir: Optional[str] = None
    project_name: Optional[str] = None
    language: str = "english"
    use_cache: bool = True
    max_abstractions: int = 10
    include_patterns: Optional[List[str]] = None
    exclude_patterns: Optional[List[str]] = None
    max_file_size: int = 100000

class JobStatus(BaseModel):
    id: str
    status: str
    start_time: str
    end_time: Optional[str] = None
    project_name: Optional[str] = None
    output_dir: Optional[str] = None
    error: Optional[str] = None

def run_tutorial_generation(job_id: str, params: TutorialRequest):
    """Run the tutorial generation in the background"""
    try:
        # Create shared dictionary for PocketFlow
        shared = {
            "repo_url": params.repo_url,
            "local_dir": params.local_dir,
            "project_name": params.project_name,
            "language": params.language,
            "use_cache": params.use_cache,
            "max_abstraction_num": params.max_abstractions,
            "output_dir": "output",
            "include_patterns": set(params.include_patterns) if params.include_patterns else {
                "*.py", "*.js", "*.jsx", "*.ts", "*.tsx", "*.go", "*.java", "*.pyi", "*.pyx",
                "*.c", "*.cc", "*.cpp", "*.h", "*.md", "*.rst", "Dockerfile",
                "Makefile", "*.yaml", "*.yml",
            },
            "exclude_patterns": set(params.exclude_patterns) if params.exclude_patterns else {
                "assets/*", "data/*", "examples/*", "images/*", "public/*", "static/*", "temp/*",
                "docs/*", "venv/*", ".venv/*", "*test*", "tests/*", "docs/*", "examples/*", "v1/*",
                "dist/*", "build/*", "experimental/*", "deprecated/*", "misc/*", 
                "legacy/*", ".git/*", ".github/*", ".next/*", ".vscode/*", "obj/*", "bin/*", "node_modules/*", "*.log"
            },
            "max_file_size": params.max_file_size,
        }

        # Update job status to running
        jobs[job_id]["status"] = "running"
        
        # Create the flow instance
        tutorial_flow = create_tutorial_flow()
        
        # Run the flow
        tutorial_flow.run(shared)
        
        # Update job status to completed
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["end_time"] = datetime.now().isoformat()
        jobs[job_id]["project_name"] = shared.get("project_name")
        jobs[job_id]["output_dir"] = shared.get("final_output_dir")
        
    except Exception as e:
        # Update job status to failed
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["end_time"] = datetime.now().isoformat()
        jobs[job_id]["error"] = str(e)

@app.post("/generate", response_model=JobStatus)
async def generate_tutorial(request: TutorialRequest, background_tasks: BackgroundTasks):
    """Start a tutorial generation job"""
    if not request.repo_url and not request.local_dir:
        raise HTTPException(status_code=400, detail="Either repo_url or local_dir must be provided")
    
    job_id = f"job_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    jobs[job_id] = {
        "id": job_id,
        "status": "pending",
        "start_time": datetime.now().isoformat(),
        "params": request.dict()
    }
    
    background_tasks.add_task(run_tutorial_generation, job_id, request)
    
    return JobStatus(
        id=job_id,
        status="pending",
        start_time=jobs[job_id]["start_time"]
    )

@app.get("/status/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """Get the status of a tutorial generation job"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    return JobStatus(
        id=job_id,
        status=job["status"],
        start_time=job["start_time"],
        end_time=job.get("end_time"),
        project_name=job.get("project_name"),
        output_dir=job.get("output_dir"),
        error=job.get("error")
    )

@app.get("/jobs", response_model=List[JobStatus])
async def list_jobs():
    """List all tutorial generation jobs"""
    return [
        JobStatus(
            id=job_id,
            status=job["status"],
            start_time=job["start_time"],
            end_time=job.get("end_time"),
            project_name=job.get("project_name"),
            output_dir=job.get("output_dir"),
            error=job.get("error")
        )
        for job_id, job in jobs.items()
    ]

@app.get("/tutorials")
async def list_tutorials():
    """List all available tutorials in the output directory"""
    tutorials = []
    output_dir = "output"
    
    if not os.path.exists(output_dir):
        return {"tutorials": []}
    
    for project_name in os.listdir(output_dir):
        project_dir = os.path.join(output_dir, project_name)
        if not os.path.isdir(project_dir):
            continue
            
        # Check for index.md to verify it's a tutorial
        index_path = os.path.join(project_dir, "index.md")
        if not os.path.isfile(index_path):
            continue
            
        # Get creation time
        created_time = datetime.fromtimestamp(os.path.getctime(project_dir)).isoformat()
        
        # Count markdown files
        file_count = sum(1 for f in os.listdir(project_dir) if f.endswith('.md'))
        
        # Get the first few lines of index.md for description
        description = ""
        try:
            with open(index_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
                # Extract title from the first line if it's a markdown title
                title = project_name
                if lines and lines[0].startswith('# '):
                    title = lines[0][2:].strip()
                # Get a brief description from the content
                content_lines = [line for line in lines[1:20] if line.strip() and not line.startswith('#')]
                if content_lines:
                    description = ' '.join(content_lines[:3]).strip()
        except Exception as e:
            description = f"Error reading description: {str(e)}"
            
        tutorials.append({
            "project_name": project_name,
            "title": title,
            "description": description,
            "created_at": created_time,
            "file_count": file_count,
        })
    
    # Sort by creation time (newest first)
    tutorials.sort(key=lambda x: x["created_at"], reverse=True)
    
    return {"tutorials": tutorials}

@app.get("/output/{project_name}")
async def get_tutorial_content(project_name: str):
    """Get the tutorial content for a specific project"""
    output_dir = os.path.join("output", project_name)
    if not os.path.exists(output_dir):
        raise HTTPException(status_code=404, detail="Project output not found")
    
    # Read the index.md file
    index_path = os.path.join(output_dir, "index.md")
    if not os.path.isfile(index_path):
        raise HTTPException(status_code=404, detail="Index file not found")
    
    # Read all .md files in the output directory
    files = {}
    for filename in os.listdir(output_dir):
        if filename.endswith(".md"):
            file_path = os.path.join(output_dir, filename)
            with open(file_path, "r", encoding="utf-8") as f:
                files[filename] = f.read()
    
    return {
        "project_name": project_name,
        "files": files
    }

@app.get("/file/{project_name}/{filename}")
async def get_file(project_name: str, filename: str):
    """Get a specific file from a project"""
    file_path = os.path.join("output", project_name, filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

@app.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    """Delete a job and its output"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    output_dir = job.get("output_dir")
    
    # If the job has completed and has an output directory, remove it
    if output_dir and os.path.exists(output_dir):
        try:
            shutil.rmtree(output_dir)
        except Exception as e:
            pass
    
    # Remove the job from the jobs dictionary
    del jobs[job_id]
    
    return {"status": "deleted"}

@app.delete("/tutorials/{project_name}")
async def delete_tutorial(project_name: str):
    """Delete a tutorial by project name"""
    project_dir = os.path.join("output", project_name)
    
    # Check if the directory exists
    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Tutorial not found")
    
    # Remove the directory
    try:
        shutil.rmtree(project_dir)
        
        # Also remove any jobs associated with this project
        for job_id, job in list(jobs.items()):
            if job.get("project_name") == project_name:
                del jobs[job_id]
                
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete tutorial: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True) 
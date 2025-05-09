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
import time
import threading
import asyncio

# Add parent directory to path so we can import the cloud analysis flow
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from flow import create_cloud_readiness_flow
import database

app = FastAPI(title="Cloud Readiness Analysis API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Create output directory if it doesn't exist
os.makedirs("output", exist_ok=True)

# Mount the output directory for serving files
app.mount("/files", StaticFiles(directory="output"), name="output_files")

# In-memory job storage
jobs: Dict[str, Dict[str, Any]] = {}

class CloudReadinessRequest(BaseModel):
    repo_url: Optional[str] = None
    local_dir: Optional[str] = None
    project_name: Optional[str] = None
    include_patterns: Optional[List[str]] = None
    exclude_patterns: Optional[List[str]] = None
    max_file_size: int = 100000
    github_token: Optional[str] = None
    use_llm_cloud_analysis: Optional[bool] = None

class JobStatus(BaseModel):
    id: str
    status: str
    start_time: str
    end_time: Optional[str] = None
    project_name: Optional[str] = None
    output_dir: Optional[str] = None
    error: Optional[str] = None

class GitHubTokenRequest(BaseModel):
    token: str

def run_cloud_analysis(job_id: str, params: CloudReadinessRequest):
    """Run cloud readiness analysis in a background thread"""
    from utils.logging_utils import get_logger
    
    # Set up logger
    logger = get_logger(f"job_{job_id}")
    logger.info(f"Starting cloud analysis job {job_id}")
    
    try:
        # Update job status
        jobs[job_id]["status"] = "running"
        logger.info(f"Job {job_id} status set to 'running'")
        
        # Get parameters
        repo_url = params.repo_url
        local_dir = params.local_dir
        project_name = params.project_name
        
        # Log input parameters
        log_params = {
            "repo_url": repo_url,
            "local_dir": local_dir,
            "project_name": project_name,
            "use_llm": params.use_llm_cloud_analysis,
            "max_file_size": params.max_file_size,
            "has_github_token": bool(params.github_token)
        }
        logger.info(f"Job {job_id} parameters: {log_params}")
        
        # If project_name is not provided, derive it from repo_url or local_dir
        if not project_name:
            if repo_url:
                project_name = repo_url.split("/")[-1].replace(".git", "")
                logger.info(f"Derived project name from repo URL: {project_name}")
            else:
                project_name = os.path.basename(os.path.abspath(local_dir))
                logger.info(f"Derived project name from local directory: {project_name}")
        
        # If project_name still has problematic characters, sanitize it
        original_name = project_name
        project_name = "".join(c if c.isalnum() or c in ['-', '_'] else '_' for c in project_name)
        if project_name != original_name:
            logger.info(f"Sanitized project name from '{original_name}' to '{project_name}'")
        
        # Make sure we have a unique project name
        original_name = project_name
        counter = 1
        while True:
            # Check if this name is already used
            output_dir = os.path.join("output", project_name)
            if not os.path.exists(output_dir):
                break
            # If it exists, append a counter
            project_name = f"{original_name}_{counter}"
            logger.info(f"Project directory already exists, trying new name: {project_name}")
            counter += 1
        
        # Create output directory
        output_dir = os.path.join("output", project_name)
        os.makedirs(output_dir, exist_ok=True)
        logger.info(f"Created output directory: {output_dir}")
        
        # Update job with project name
        jobs[job_id]["project_name"] = project_name
        jobs[job_id]["output_dir"] = output_dir
        logger.info(f"Updated job {job_id} with project name: {project_name}")
        
        # Create the flow
        logger.info(f"Creating cloud readiness analysis flow for job {job_id}")
        flow = create_cloud_readiness_flow()
        
        # Prepare include/exclude patterns
        include_patterns = params.include_patterns or ["**/*"]
        exclude_patterns = params.exclude_patterns or ["**/node_modules/**", "**/.git/**"]
        
        # Log file patterns
        logger.info(f"Include patterns: {include_patterns[:5]}{'...' if len(include_patterns) > 5 else ''}")
        logger.info(f"Exclude patterns: {exclude_patterns[:5]}{'...' if len(exclude_patterns) > 5 else ''}")
        
        # Prepare shared data
        logger.info(f"Preparing shared data for job {job_id} flow execution")
        shared = {
            "repo_url": repo_url,
            "local_dir": local_dir,
            "project_name": project_name,
            "include_patterns": include_patterns,
            "exclude_patterns": exclude_patterns,
            "max_file_size": params.max_file_size,
            "github_token": params.github_token,
            "output_dir": "output",
            "use_llm_cloud_analysis": params.use_llm_cloud_analysis if params.use_llm_cloud_analysis is not None else True,
            "job_id": job_id,  # Add job_id to shared data for status updates
            "jobs": jobs  # Provide access to the jobs dictionary for status updates
        }
        
        # Run the flow
        logger.info(f"Starting flow execution for job {job_id}")
        start_time = datetime.now()
        flow.run(shared)
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        duration_str = f"{int(duration // 60)}m {int(duration % 60)}s"
        logger.info(f"Flow execution for job {job_id} completed in {duration_str}")
        
        # Get cloud analysis results
        cloud_analysis = shared.get("cloud_analysis", {})
        
        # Log analysis summary
        overall_score = cloud_analysis.get("overall_score", 0)
        readiness_level = cloud_analysis.get("readiness_level", "Unknown")
        logger.info(f"Job {job_id} analysis complete - Overall score: {overall_score:.2f}, Readiness level: {readiness_level}")
        
        # Count recommendations by priority
        recommendations = cloud_analysis.get("recommendations", [])
        high_priority = sum(1 for r in recommendations if r.get("priority") == "high")
        medium_priority = sum(1 for r in recommendations if r.get("priority") == "medium")
        low_priority = sum(1 for r in recommendations if r.get("priority") == "low")
        logger.info(f"Job {job_id} generated {len(recommendations)} recommendations: {high_priority} high, {medium_priority} medium, {low_priority} low priority")
        
        # Save the result to the database
        logger.info(f"Saving analysis results for job {job_id} to database")
        try:
            evaluation_id = database.save_evaluation(project_name, cloud_analysis, job_id)
            logger.info(f"Job {job_id} saved to database with evaluation ID: {evaluation_id}")
        except Exception as db_error:
            logger.error(f"Failed to save job {job_id} to database: {str(db_error)}")
            logger.exception("Database error stack trace:")
        
        # Update job status (handled by StatusUpdater now, but we'll ensure it's set)
        if jobs[job_id]["status"] != "completed":
            jobs[job_id]["status"] = "completed"
            jobs[job_id]["end_time"] = datetime.now().isoformat()
            logger.info(f"Updated job {job_id} status to 'completed'")
        
        logger.info(f"Cloud analysis job {job_id} completed successfully")
        
    except Exception as e:
        error_msg = f"Error in cloud analysis job {job_id}: {str(e)}"
        logger.error(error_msg)
        logger.exception("Stack trace:")
        
        # Update job status
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["end_time"] = datetime.now().isoformat()
        jobs[job_id]["error"] = str(e)
        logger.info(f"Updated job {job_id} status to 'failed'")

@app.post("/analyze-cloud", response_model=JobStatus)
async def analyze_cloud_readiness(request: CloudReadinessRequest, background_tasks: BackgroundTasks):
    """Start a cloud readiness analysis job"""
    if not request.repo_url and not request.local_dir:
        raise HTTPException(status_code=400, detail="Either repo_url or local_dir must be provided")
    
    job_id = f"cloud_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    jobs[job_id] = {
        "id": job_id,
        "status": "pending",
        "start_time": datetime.now().isoformat(),
        "params": request.dict()
    }
    
    background_tasks.add_task(run_cloud_analysis, job_id, request)
    
    return JobStatus(
        id=job_id,
        status="pending",
        start_time=jobs[job_id]["start_time"]
    )

@app.get("/status/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """Get the status of a cloud analysis job"""
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
    """List all cloud analysis jobs"""
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

@app.get("/cloud-projects")
async def list_cloud_projects():
    """List all available cloud analysis projects in the output directory"""
    projects = []
    output_dir = "output"
    
    if not os.path.exists(output_dir):
        return {"projects": []}
    
    for project_name in os.listdir(output_dir):
        project_dir = os.path.join(output_dir, project_name)
        if not os.path.isdir(project_dir):
            continue
            
        # Check for cloud_readiness.json to verify it's a cloud analysis
        cloud_data_path = os.path.join(project_dir, "cloud_readiness.json")
        if not os.path.isfile(cloud_data_path):
            continue
            
        # Get creation time
        created_time = datetime.fromtimestamp(os.path.getctime(project_dir)).isoformat()
        
        # Get data from cloud_readiness.json
        try:
            with open(cloud_data_path, "r", encoding="utf-8") as f:
                cloud_data = json.load(f)
                
            projects.append({
                "project_name": project_name,
                "overall_score": cloud_data.get("overall_score", 0),
                "readiness_level": cloud_data.get("readiness_level", "Unknown"),
                "created_at": created_time,
            })
        except Exception as e:
            print(f"Error reading cloud data for {project_name}: {str(e)}")
    
    # Sort by creation time (newest first)
    projects.sort(key=lambda x: x["created_at"], reverse=True)
    
    return {"projects": projects}

@app.get("/output/{project_name}/cloud-dashboard")
async def get_cloud_dashboard(project_name: str):
    """Get the cloud readiness dashboard for a specific project"""
    output_dir = os.path.join("output", project_name)
    if not os.path.exists(output_dir):
        raise HTTPException(status_code=404, detail="Project output not found")
    
    # Read the cloud_dashboard.md file
    dashboard_path = os.path.join(output_dir, "cloud_dashboard.md")
    if not os.path.isfile(dashboard_path):
        raise HTTPException(status_code=404, detail="Cloud dashboard not found")
    
    with open(dashboard_path, "r", encoding="utf-8") as f:
        dashboard_content = f.read()
    
    return {
        "project_name": project_name,
        "cloud_dashboard": dashboard_content
    }

@app.get("/output/{project_name}/cloud-data")
async def get_cloud_data(project_name: str, evaluation_id: Optional[str] = None):
    """
    Get the cloud readiness data for a specific project
    
    Args:
        project_name: Name of the project
        evaluation_id: Optional ID of a specific evaluation. If not provided, returns the latest.
    """
    if evaluation_id:
        # Get specific evaluation
        evaluation = database.get_evaluation_by_id(evaluation_id)
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        # Return the data from the evaluation
        return evaluation["data"]
    else:
        # Get the latest evaluation for this project
        evaluations = database.get_project_evaluations(project_name)
        
        if not evaluations:
            # If no evaluations in DB, try to fall back to the file-based approach
            json_path = os.path.join("output", project_name, "cloud_readiness.json")
            if os.path.isfile(json_path):
                with open(json_path, "r", encoding="utf-8") as f:
                    cloud_data = json.load(f)
                
                # Save this legacy data to the database for future use
                database.save_evaluation(project_name, cloud_data)
                
                return cloud_data
            else:
                raise HTTPException(status_code=404, detail="Cloud readiness data not found")
        
        # Get the first evaluation (which is the most recent one)
        latest_eval_id = evaluations[0]["id"]
        latest_eval = database.get_evaluation_by_id(latest_eval_id)
        
        return latest_eval["data"]

@app.get("/cloud-history/{project_name}")
async def get_cloud_history(project_name: str):
    """Get the history of cloud readiness evaluations for a project"""
    evaluations = database.get_project_evaluations(project_name)
    
    if not evaluations:
        raise HTTPException(status_code=404, detail="No evaluations found for this project")
    
    # Format timestamps for better display
    for eval in evaluations:
        if "timestamp" in eval:
            try:
                dt = datetime.fromisoformat(eval["timestamp"])
                eval["formatted_date"] = dt.strftime("%b %d, %Y")
                eval["formatted_time"] = dt.strftime("%I:%M %p")
            except Exception:
                eval["formatted_date"] = eval["timestamp"]
                eval["formatted_time"] = ""
    
    return {"project_name": project_name, "evaluations": evaluations}

@app.get("/cloud-evaluation/{evaluation_id}")
async def get_cloud_evaluation(evaluation_id: str):
    """Get a specific cloud readiness evaluation by ID"""
    evaluation = database.get_evaluation_by_id(evaluation_id)
    
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    return evaluation

@app.get("/latest-evaluations")
async def get_latest_evaluations(limit: int = 10):
    """Get the latest cloud readiness evaluations across all projects"""
    evaluations = database.get_latest_evaluations(limit)
    
    # Format timestamps for better display
    for eval in evaluations:
        if "timestamp" in eval:
            try:
                dt = datetime.fromisoformat(eval["timestamp"])
                eval["formatted_date"] = dt.strftime("%b %d, %Y")
                eval["formatted_time"] = dt.strftime("%I:%M %p")
            except Exception:
                eval["formatted_date"] = eval["timestamp"]
                eval["formatted_time"] = ""
    
    return {"evaluations": evaluations}

@app.delete("/cloud-evaluation/{evaluation_id}")
async def delete_cloud_evaluation(evaluation_id: str):
    """Delete a specific cloud readiness evaluation"""
    # First check if it exists
    evaluation = database.get_evaluation_by_id(evaluation_id)
    
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    # Delete from database - we would need to add this function to database.py
    # For now we'll just return a not implemented error
    raise HTTPException(status_code=501, detail="Delete operation not yet implemented")

@app.delete("/projects/{project_name}")
async def delete_project(project_name: str):
    """Delete a project by project name"""
    project_dir = os.path.join("output", project_name)
    
    # Check if the directory exists
    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Remove the directory
    try:
        shutil.rmtree(project_dir)
        
        # Delete evaluations from database
        database.delete_project_evaluations(project_name)
        
        # Also remove any jobs associated with this project
        for job_id, job in list(jobs.items()):
            if job.get("project_name") == project_name:
                del jobs[job_id]
                
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")

@app.post("/config/github-token")
async def set_github_token(request: GitHubTokenRequest):
    """Set the GitHub token for repository access"""
    # Instead of storing the token, we'll just test it and return validity info
    try:
        import requests
        
        headers = {
            "Authorization": f"token {request.token}",
            "User-Agent": "CloudView-API/1.0"
        }
        
        # Test the token by getting rate limit info
        response = requests.get("https://api.github.com/rate_limit", headers=headers)
        
        if response.status_code != 200:
            return {
                "valid": False,
                "message": f"Invalid token. GitHub API returned status {response.status_code}"
            }
            
        # Extract rate limit info
        data = response.json()
        core_rate = data["resources"]["core"]
        rate_limit = core_rate["limit"]
        rate_remaining = core_rate["remaining"]
        rate_reset = core_rate["reset"]
        reset_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(rate_reset))
        
        return {
            "valid": True,
            "rate_limit": rate_limit,
            "rate_remaining": rate_remaining,
            "rate_reset": rate_reset,
            "reset_time": reset_time,
            "message": f"Token is valid. Rate limit: {rate_remaining}/{rate_limit} requests. Resets at {reset_time}"
        }
        
    except Exception as e:
        return {
            "valid": False,
            "message": f"Error verifying token: {str(e)}"
        }

@app.post("/test-github-token")
async def test_github_token(request: GitHubTokenRequest):
    """Test a GitHub token for validity and check rate limit information"""
    try:
        import requests
        
        headers = {
            "Authorization": f"token {request.token}",
            "User-Agent": "CloudView-API/1.0"
        }
        
        # Test the token by getting rate limit info
        response = requests.get("https://api.github.com/rate_limit", headers=headers)
        
        if response.status_code != 200:
            return {
                "valid": False,
                "message": f"Invalid token. GitHub API returned status {response.status_code}"
            }
            
        # Extract rate limit info
        data = response.json()
        core_rate = data["resources"]["core"]
        rate_limit = core_rate["limit"]
        rate_remaining = core_rate["remaining"]
        rate_reset = core_rate["reset"]
        reset_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(rate_reset))
        
        return {
            "valid": True,
            "rate_limit": rate_limit,
            "rate_remaining": rate_remaining,
            "rate_reset": rate_reset,
            "reset_time": reset_time,
            "message": f"Token is valid. Rate limit: {rate_remaining}/{rate_limit} requests. Resets at {reset_time}"
        }
        
    except Exception as e:
        return {
            "valid": False,
            "message": f"Error verifying token: {str(e)}"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="::1", port=8000, reload=True) 
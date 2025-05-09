import os
import json
from datetime import datetime
import uuid
from utils.logging_utils import get_logger
import shutil

# Initialize logger
logger = get_logger('database')

# Database file path
DATABASE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "db")
DATABASE_FILE = os.path.join(DATABASE_DIR, "evaluations.json")

# Ensure the database directory exists
os.makedirs(DATABASE_DIR, exist_ok=True)

def _load_db():
    """Load the database from file"""
    if not os.path.exists(DATABASE_FILE):
        logger.info(f"Creating new database file at {DATABASE_FILE}")
        return {"evaluations": []}
    
    try:
        with open(DATABASE_FILE, 'r') as f:
            db = json.load(f)
            logger.debug(f"Database loaded successfully with {len(db.get('evaluations', []))} evaluations")
            return db
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error loading database: {str(e)}")
        # Create a backup of the corrupted file
        backup_file = f"{DATABASE_FILE}.backup.{int(datetime.now().timestamp())}"
        try:
            shutil.copy2(DATABASE_FILE, backup_file)
            logger.info(f"Created backup of corrupted database at {backup_file}")
        except Exception as backup_err:
            logger.error(f"Failed to create backup of corrupted database: {str(backup_err)}")
        return {"evaluations": []}
    except Exception as e:
        logger.error(f"Unexpected error loading database: {str(e)}")
        return {"evaluations": []}

def _save_db(db):
    """Save the database to file"""
    try:
        with open(DATABASE_FILE, 'w') as f:
            json.dump(db, f, indent=2)
        logger.debug(f"Database saved successfully with {len(db.get('evaluations', []))} evaluations")
        return True
    except (IOError, OSError) as e:
        logger.error(f"I/O error saving database: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error saving database: {str(e)}")
        return False

def save_evaluation(project_name, evaluation_data, job_id=None):
    """
    Save a cloud readiness evaluation to the database
    
    Args:
        project_name: Name of the project
        evaluation_data: Cloud readiness analysis data
        job_id: Optional job ID associated with this evaluation
        
    Returns:
        The evaluation ID
    """
    logger.info(f"Saving evaluation for project: {project_name}")
    
    # Generate a unique ID for this evaluation
    evaluation_id = str(uuid.uuid4())
    logger.debug(f"Generated evaluation ID: {evaluation_id}")
    
    # Create evaluation record
    evaluation = {
        "id": evaluation_id,
        "project_name": project_name,
        "timestamp": datetime.now().isoformat(),
        "job_id": job_id,
        "data": evaluation_data
    }
    
    # Add basic stats for quick access
    try:
        evaluation["overall_score"] = evaluation_data.get("overall_score", 0)
        evaluation["readiness_level"] = evaluation_data.get("readiness_level", "Unknown")
        evaluation["recommendations_count"] = len(evaluation_data.get("recommendations", []))
        
        # Extract technology stack summary
        tech_stack = evaluation_data.get("technology_stack", {})
        languages = tech_stack.get("languages", {})
        frameworks = tech_stack.get("frameworks", {})
        
        evaluation["summary"] = {
            "languages": list(languages.keys()),
            "frameworks": list(frameworks.keys()),
            "architecture": evaluation_data.get("architecture", {}).get("patterns", [])
        }
        
        logger.info(f"Evaluation prepared with ID: {evaluation_id}, score: {evaluation['overall_score']}, level: {evaluation['readiness_level']}")
    except Exception as e:
        logger.error(f"Error extracting evaluation stats: {str(e)}")
        logger.exception("Stats extraction stack trace:")
    
    # Load database
    db = _load_db()
    
    # Add evaluation to database
    db["evaluations"].insert(0, evaluation)  # Add to beginning (most recent first)
    
    # Save database
    if _save_db(db):
        logger.info(f"Evaluation saved successfully with ID: {evaluation_id}")
    else:
        logger.error(f"Failed to save evaluation to database")
    
    return evaluation_id

def get_project_evaluations(project_name):
    """
    Get all evaluations for a project
    
    Args:
        project_name: Name of the project
        
    Returns:
        List of evaluations for the project, ordered by most recent first
    """
    logger.info(f"Getting evaluations for project: {project_name}")
    
    db = _load_db()
    evaluations = [e for e in db["evaluations"] if e["project_name"] == project_name]
    
    # Sort by timestamp (newest first)
    evaluations.sort(key=lambda x: x["timestamp"], reverse=True)
    
    logger.info(f"Found {len(evaluations)} evaluations for project: {project_name}")
    return evaluations

def get_evaluation_by_id(evaluation_id):
    """
    Get an evaluation by its ID
    
    Args:
        evaluation_id: ID of the evaluation
        
    Returns:
        The evaluation, or None if not found
    """
    logger.info(f"Getting evaluation with ID: {evaluation_id}")
    
    db = _load_db()
    
    for evaluation in db["evaluations"]:
        if evaluation["id"] == evaluation_id:
            logger.info(f"Found evaluation with ID: {evaluation_id}")
            return evaluation
    
    logger.warning(f"Evaluation not found with ID: {evaluation_id}")
    return None

def get_latest_evaluations(limit=10):
    """
    Get the latest evaluations across all projects
    
    Args:
        limit: Maximum number of evaluations to return
        
    Returns:
        List of evaluations, ordered by most recent first
    """
    logger.info(f"Getting latest {limit} evaluations")
    
    db = _load_db()
    
    # Sort by timestamp (newest first)
    evaluations = sorted(db["evaluations"], key=lambda x: x["timestamp"], reverse=True)
    
    # Limit the number of evaluations
    evaluations = evaluations[:limit]
    
    logger.info(f"Returning {len(evaluations)} latest evaluations")
    return evaluations

def delete_project_evaluations(project_name):
    """
    Delete all evaluations for a project
    
    Args:
        project_name: Name of the project
        
    Returns:
        True if successful, False otherwise
    """
    logger.info(f"Deleting evaluations for project: {project_name}")
    
    db = _load_db()
    
    # Count evaluations before deletion
    before_count = len(db["evaluations"])
    
    # Filter out evaluations for this project
    db["evaluations"] = [e for e in db["evaluations"] if e["project_name"] != project_name]
    
    # Count evaluations after deletion
    after_count = len(db["evaluations"])
    deleted_count = before_count - after_count
    
    # Save database
    if _save_db(db):
        logger.info(f"Successfully deleted {deleted_count} evaluations for project: {project_name}")
        return True
    else:
        logger.error(f"Failed to delete evaluations for project: {project_name}")
        return False

def delete_evaluation(evaluation_id):
    """
    Delete a specific evaluation by ID
    
    Args:
        evaluation_id: ID of the evaluation to delete
        
    Returns:
        True if successful, False if evaluation not found or error
    """
    logger.info(f"Deleting evaluation with ID: {evaluation_id}")
    
    db = _load_db()
    
    # Find the evaluation
    eval_index = None
    for i, evaluation in enumerate(db["evaluations"]):
        if evaluation["id"] == evaluation_id:
            eval_index = i
            break
    
    # If evaluation not found
    if eval_index is None:
        logger.warning(f"Evaluation not found with ID: {evaluation_id}")
        return False
    
    # Remove the evaluation
    removed = db["evaluations"].pop(eval_index)
    logger.debug(f"Removed evaluation for project: {removed['project_name']}")
    
    # Save database
    if _save_db(db):
        logger.info(f"Successfully deleted evaluation with ID: {evaluation_id}")
        return True
    else:
        logger.error(f"Failed to delete evaluation with ID: {evaluation_id}")
        return False 
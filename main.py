import os
import sys
import json
import dotenv
import uvicorn
from flow import create_tutorial_flow, create_cloud_readiness_flow
from backend.app import app
from utils.logging_utils import setup_logger
import logging

# Configure root logger
logger = setup_logger('cloudview', level=logging.INFO)
logger.info("Starting CloudView application")

# Load environment variables
dotenv.load_dotenv()

# Default file patterns
DEFAULT_PATTERNS = {
    "includePatterns": [
        "**/*.py", "**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx", "**/*.java", "**/*.c", "**/*.cpp", 
        "**/*.h", "**/*.cs", "**/*.go", "**/*.rb", "**/*.php", "**/*.html", "**/*.css", "**/*.scss",
        "**/*.json", "**/*.yaml", "**/*.yml", "**/*.xml", "**/*.md", "**/*.txt",
        "**/Dockerfile", "**/docker-compose.yml", "**/Makefile", "**/Jenkinsfile",
        "**/*.properties", "**/*.config", "**/*.cfg", "**/*.ini", "**/*.env",
        "**/*.sh", "**/*.bat", "**/*.ps1", "**/*.gradle", "**/*.sql", "**/*.proto"
    ],
    "excludePatterns": [
        "**/node_modules/**", "**/.git/**", "**/__pycache__/**", "**/venv/**", "**/env/**",
        "**/build/**", "**/dist/**", "**/bin/**", "**/obj/**", "**/.next/**", "**/.idea/**",
        "**/tmp/**", "**/temp/**", "**/logs/**", "**/*.min.js", "**/*.min.css", 
        "**/test/**", "**/tests/**", "**/coverage/**", "**/assets/**", "**/static/**",
        "**/vendor/**", "**/third_party/**", "**/generated/**", "**/legacy/**", "**/.github/**",
        "**/.vscode/**", "**/*.log", "**/.DS_Store"
    ]
}

# --- Main Function ---
def main():
    """Run a cloud readiness analysis or tutorial generation flow"""
    logger.info("Running main function")
    
    # Define parameters
    repo_url = os.getenv("REPO_URL", "")
    local_dir = os.getenv("LOCAL_DIR", ".")
    project_name = os.getenv("PROJECT_NAME", "MyProject")
    output_dir = os.getenv("OUTPUT_DIR", "output")
    github_token = os.getenv("GITHUB_TOKEN", "")
    
    # Set up shared data
    shared = {
        "repo_url": repo_url,
        "local_dir": local_dir,
        "project_name": project_name,
        "include_patterns": DEFAULT_PATTERNS["includePatterns"],
        "exclude_patterns": DEFAULT_PATTERNS["excludePatterns"],
        "output_dir": output_dir,
        "github_token": github_token,
        "max_file_size": 100000,  # 100KB
        "use_llm_cloud_analysis": True,
    }
    
    # Choose which flow to run
    flow_type = os.getenv("FLOW_TYPE", "cloud").lower()
    
    if flow_type == "tutorial":
        logger.info(f"Running tutorial flow for project: {project_name}")
        flow = create_tutorial_flow()
    else:
        logger.info(f"Running cloud readiness flow for project: {project_name}")
        flow = create_cloud_readiness_flow()
    
    # Run the flow
    try:
        flow.run(shared)
        logger.info(f"Flow execution completed successfully. Output in: {output_dir}/{project_name}")
    except Exception as e:
        logger.error(f"Flow execution failed: {str(e)}")
        logger.exception("Stack trace:")

if __name__ == "__main__":
    # Check if we should run the flow directly or start the API server
    if "--flow" in sys.argv:
        logger.info("Starting in flow mode")
        main()
    else:
        # Add parent directory to path if needed (for direct execution)
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        
        # Configure Uvicorn logging
        log_config = uvicorn.config.LOGGING_CONFIG
        log_config["formatters"]["access"]["fmt"] = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        log_config["formatters"]["default"]["fmt"] = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        
        logger.info("Starting Uvicorn server")
        
        # Run the FastAPI application with Uvicorn
        uvicorn.run(
            "main:app", 
            host="0.0.0.0", 
            port=8000, 
            reload=True,
            log_config=log_config
        )

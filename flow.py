from pocketflow import Flow
# Import all node classes from nodes.py
from nodes import (
    FetchRepo,
    CloudReadinessAnalysis
)

def create_cloud_readiness_flow():
    """Creates and returns a standalone cloud readiness analysis flow.
    This allows running the cloud analysis independently of the tutorial generation.
    """
    # Instantiate nodes
    fetch_repo = FetchRepo()
    cloud_readiness = CloudReadinessAnalysis(max_retries=3, wait=5)
    
    # Connect nodes directly - fetch repo then analyze cloud readiness
    fetch_repo >> cloud_readiness
    
    # Create the flow starting with FetchRepo
    cloud_flow = Flow(start=fetch_repo)
    
    return cloud_flow

import os
import json
from datetime import datetime
from utils.logging_utils import get_logger

class StatusUpdater:
    """
    A utility class that manages status updates for long-running tasks.
    It tracks progress, provides detailed status messages, and persists state.
    """
    
    def __init__(self, job_id, jobs_dict=None, status_file=None):
        """
        Initialize the status updater
        
        Args:
            job_id: Unique identifier for the job
            jobs_dict: Dictionary to update with status information (in-memory)
            status_file: Path to a file for persisting status (file-based)
        """
        self.job_id = job_id
        self.jobs_dict = jobs_dict  # Reference to a shared dict (e.g., from the jobs dict in app.py)
        self.status_file = status_file
        self.current_phase = None
        self.total_phases = 0
        self.phase_progress = 0
        self.phase_total = 0
        self.detailed_status = ""
        self.start_time = datetime.now()
        self.logger = get_logger(f"status_{job_id}")
        
        self.logger.info(f"Initializing job {job_id}")
        
        # Create the base status entry if using jobs_dict
        if self.jobs_dict is not None and job_id not in self.jobs_dict:
            self.jobs_dict[job_id] = {
                "id": job_id,
                "status": "pending",
                "start_time": self.start_time.isoformat(),
                "detailed_status": {},
                "progress": 0
            }
            self.logger.info(f"Created new job entry for {job_id}")
        
        # Initialize status file if provided
        if self.status_file and not os.path.exists(os.path.dirname(self.status_file)):
            os.makedirs(os.path.dirname(self.status_file), exist_ok=True)
            self._save_to_file({
                "id": job_id,
                "status": "pending",
                "start_time": self.start_time.isoformat(),
                "detailed_status": {},
                "progress": 0
            })
            self.logger.info(f"Initialized status file for job {job_id}")
    
    def set_phases(self, phases):
        """
        Set the list of processing phases
        
        Args:
            phases: List of phase names
        """
        self.phases = phases
        self.total_phases = len(phases)
        self._update_status({"total_phases": self.total_phases, "phases": phases})
        self.logger.info(f"Set {self.total_phases} processing phases: {', '.join(phases)}")
    
    def update_phase(self, phase_name, message=None):
        """
        Update the current processing phase
        
        Args:
            phase_name: Name of the current phase
            message: Optional message describing the phase
        """
        self.current_phase = phase_name
        self.phase_progress = 0
        self.phase_total = 100  # Default to percentage-based progress
        
        phase_idx = self.phases.index(phase_name) if hasattr(self, 'phases') and phase_name in self.phases else -1
        
        status_update = {
            "current_phase": phase_name,
            "phase_index": phase_idx,
            "phase_progress": 0,
            "phase_total": 100,
            "detailed_status": {}
        }
        
        if message:
            status_update["phase_message"] = message
            self.detailed_status = message
        
        # Calculate overall progress if possible
        if phase_idx >= 0 and self.total_phases > 0:
            overall_progress = int((phase_idx / self.total_phases) * 100)
            status_update["progress"] = overall_progress
        
        self._update_status(status_update)
        
        log_msg = f"Starting phase: {phase_name}" + (f" - {message}" if message else "")
        if phase_idx >= 0:
            log_msg += f" (Phase {phase_idx + 1}/{self.total_phases})"
        self.logger.info(log_msg)
    
    def set_phase_items(self, total_items, message=None):
        """
        Set the total number of items to process in the current phase
        
        Args:
            total_items: Total number of items to process
            message: Optional message describing the items
        """
        self.phase_total = total_items
        self.phase_progress = 0
        
        status_update = {
            "phase_total": total_items,
            "phase_progress": 0
        }
        
        if message:
            status_update["items_message"] = message
        
        self._update_status(status_update)
        
        log_msg = f"Phase '{self.current_phase}' has {total_items} items to process" + (f" - {message}" if message else "")
        self.logger.info(log_msg)
    
    def increment_progress(self, items=1, message=None):
        """
        Increment the progress counter for the current phase
        
        Args:
            items: Number of items completed
            message: Optional message describing the progress
        """
        self.phase_progress += items
        
        # Ensure we don't exceed the total
        if self.phase_progress > self.phase_total:
            self.phase_progress = self.phase_total
        
        # Calculate phase percentage
        phase_percentage = int((self.phase_progress / self.phase_total) * 100) if self.phase_total > 0 else 0
        
        # Calculate overall progress if possible
        overall_progress = 0
        if hasattr(self, 'phases') and self.current_phase in self.phases and self.total_phases > 0:
            phase_idx = self.phases.index(self.current_phase)
            phase_weight = 1 / self.total_phases
            prior_phases_progress = (phase_idx * phase_weight) * 100
            current_phase_progress = (phase_percentage / 100) * phase_weight * 100
            overall_progress = int(prior_phases_progress + current_phase_progress)
        
        status_update = {
            "phase_progress": self.phase_progress,
            "progress": overall_progress
        }
        
        if message:
            status_update["progress_message"] = message
            self.detailed_status = message
        
        self._update_status(status_update)
        
        # Log progress at reasonable intervals or when message is provided
        should_log = message is not None or self.phase_progress % max(1, int(self.phase_total / 10)) == 0
        if should_log:
            log_msg = f"Progress for '{self.current_phase}': {self.phase_progress}/{self.phase_total} items ({phase_percentage}%)"
            if message:
                log_msg += f" - {message}"
            self.logger.info(log_msg)
    
    def update_detailed_status(self, key, value):
        """
        Update a specific field in the detailed status
        
        Args:
            key: Status field name
            value: Status field value
        """
        if self.jobs_dict is not None:
            if "detailed_status" not in self.jobs_dict[self.job_id]:
                self.jobs_dict[self.job_id]["detailed_status"] = {}
            self.jobs_dict[self.job_id]["detailed_status"][key] = value
        
        if self.status_file:
            status_data = self._read_from_file()
            if "detailed_status" not in status_data:
                status_data["detailed_status"] = {}
            status_data["detailed_status"][key] = value
            self._save_to_file(status_data)
            
        self.logger.info(f"Updated detailed status: {key}={value}")
    
    def complete(self, success=True, error=None):
        """
        Mark the job as completed or failed
        
        Args:
            success: Whether the job completed successfully
            error: Error message if the job failed
        """
        end_time = datetime.now()
        status = "completed" if success else "failed"
        
        status_update = {
            "status": status,
            "end_time": end_time.isoformat(),
            "duration_seconds": (end_time - self.start_time).total_seconds()
        }
        
        if not success and error:
            status_update["error"] = error
        
        if success:
            status_update["progress"] = 100
        
        self._update_status(status_update)
        
        duration = (end_time - self.start_time).total_seconds()
        duration_str = f"{int(duration // 60)}m {int(duration % 60)}s"
        
        if success:
            self.logger.info(f"Job {self.job_id} completed successfully in {duration_str}")
        else:
            self.logger.error(f"Job {self.job_id} failed after {duration_str}: {error or 'Unknown error'}")
    
    def log_info(self, message):
        """Log an info message"""
        self.logger.info(message)
        
    def log_warning(self, message):
        """Log a warning message"""
        self.logger.warning(message)
        
    def log_error(self, message):
        """Log an error message"""
        self.logger.error(message)
    
    def _update_status(self, status_update):
        """
        Update the status in both memory and file (if configured)
        
        Args:
            status_update: Dictionary of status fields to update
        """
        # Update in-memory dict if available
        if self.jobs_dict is not None:
            self.jobs_dict[self.job_id].update(status_update)
        
        # Update status file if available
        if self.status_file:
            status_data = self._read_from_file()
            status_data.update(status_update)
            self._save_to_file(status_data)
    
    def _save_to_file(self, data):
        """Save status to file"""
        with open(self.status_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def _read_from_file(self):
        """Read status from file"""
        if not os.path.exists(self.status_file):
            return {"id": self.job_id}
        
        try:
            with open(self.status_file, 'r') as f:
                return json.load(f)
        except:
            return {"id": self.job_id} 
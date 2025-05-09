import logging
import os
from datetime import datetime

def setup_logger(name, log_dir='logs', level=logging.INFO):
    """
    Set up a logger with file and console handlers
    
    Args:
        name: Logger name (usually __name__)
        log_dir: Directory to store log files
        level: Logging level (default: INFO)
        
    Returns:
        Configured logger
    """
    # Create logs directory if it doesn't exist
    os.makedirs(log_dir, exist_ok=True)
    
    # Create a logger
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Only add handlers if they don't already exist
    if not logger.handlers:
        # Create a file handler
        today = datetime.now().strftime('%Y-%m-%d')
        log_file = os.path.join(log_dir, f'{today}_{name}.log')
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(level)
        
        # Create a console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(level)
        
        # Create a formatter and add it to the handlers
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        # Add the handlers to the logger
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
    
    return logger

def get_logger(name):
    """
    Get a logger instance, creating a new one if needed
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        Logger instance
    """
    # Check if logger exists
    logger = logging.getLogger(name)
    if not logger.handlers:
        return setup_logger(name)
    
    return logger 
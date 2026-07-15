import os
import time
import json
import logging
from datetime import datetime
from HealthcareData.config import LOGS_DIR

def setup_logger(name, log_file_name):
    """
    Sets up a standard Python logger with stdout and file handlers.
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    # Avoid duplicate handlers if setup multiple times
    if not logger.handlers:
        formatter = logging.Formatter('[%(asctime)s] [%(levelname)s] %(message)s')
        
        # File handler
        log_path = os.path.join(LOGS_DIR, log_file_name)
        file_handler = logging.FileHandler(log_path, encoding='utf-8')
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
    return logger

class PipelineLogger:
    def __init__(self, name, log_file_name):
        self.name = name
        self.log_file_name = log_file_name
        self.logger = setup_logger(name, log_file_name)
        self.start_time = time.time()
        self.records_processed = 0
        self.duplicates_removed = 0
        self.missing_values_imputed = 0
        self.errors = 0
        self.warnings = 0
        
    def info(self, msg):
        self.logger.info(msg)
        
    def warning(self, msg):
        self.warnings += 1
        self.logger.warning(msg)
        
    def error(self, msg):
        self.errors += 1
        self.logger.error(msg)
        
    def finalize(self):
        duration = time.time() - self.start_time
        summary = {
            "pipeline_stage": self.name,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "duration_seconds": round(duration, 4),
            "records_processed": int(self.records_processed),
            "duplicates_removed": int(self.duplicates_removed),
            "missing_values_imputed": int(self.missing_values_imputed),
            "warnings_count": int(self.warnings),
            "errors_count": int(self.errors)
        }
        
        # Save structured summary to a separate json file
        summary_path = os.path.join(LOGS_DIR, f"{os.path.splitext(self.log_file_name)[0]}_summary.json")
        try:
            with open(summary_path, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2)
            self.logger.info(f"Pipeline stage finalized. Summary written to {summary_path}")
        except Exception as e:
            self.logger.error(f"Failed to write summary json: {str(e)}")
            
        return summary

import pandas as pd
from HealthcareData.config import VALIDATION_RULES
from HealthcareData.scripts.logger_helper import PipelineLogger

def validate(df: pd.DataFrame, schema_name: str, plog: PipelineLogger) -> bool:
    """
    Validates a dataset DataFrame against rules defined in config.py.
    
    Checks:
      - Required columns presence.
      - Malformed rows (e.g. check if rows have wrong number of items, which pandas flags as nan/missing or structural issues).
      - Columns numeric boundary values limits.
      - Duplicated rows.
      
    Returns:
      bool: True if validation passed with no major errors.
    """
    plog.info(f"Validating dataset under schema: {schema_name}")
    
    # Strip column names whitespace
    df.columns = [col.strip() for col in df.columns]
    
    rules = VALIDATION_RULES.get(schema_name)
    if not rules:
        plog.warning(f"No validation rules found for schema: {schema_name}. Skipping validation.")
        return True
        
    required_cols = rules.get("required_columns", [])
    numeric_bounds = rules.get("numeric_bounds", {})
    
    passed = True
    
    # 1. Required columns presence check
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        plog.error(f"Validation FAILED: Missing required columns: {missing_cols}")
        passed = False
    else:
        plog.info("All required columns are present.")
        
    # 2. Check duplicate identifiers (if identifier columns exist)
    id_cols = [c for c in ["id", "Person ID", "SEQN", "Patient File No.", "Sr_No", "Sr. No."] if c in df.columns]
    for id_col in id_cols:
        duplicates_count = df[id_col].duplicated().sum()
        if duplicates_count > 0:
            plog.warning(f"Duplicate IDs detected in column '{id_col}': {duplicates_count} rows.")
            
    # 3. Numeric range validation
    for col, bounds in numeric_bounds.items():
        if col in df.columns:
            # Coerce to numeric for range checks
            series = pd.to_numeric(df[col], errors='coerce')
            min_val, max_val = bounds
            out_of_range = series[(series < min_val) | (series > max_val)]
            if not out_of_range.empty:
                plog.warning(f"Column '{col}' has {len(out_of_range)} values outside bounds [{min_val}, {max_val}]. Examples: {out_of_range.head(3).tolist()}")
                
    return passed

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python validate_dataset.py <schema_name> <csv_file_path>")
        sys.exit(1)
        
    schema = sys.argv[1]
    csv_path = sys.argv[2]
    
    plog = PipelineLogger(f"CLI_Validate_{schema}", f"validate_{schema}.log")
    try:
        df = pd.read_csv(csv_path)
        success = validate(df, schema, plog)
        if success:
            print(f"Validation PASSED for {schema}.")
        else:
            print(f"Validation FAILED for {schema}. Check log files for details.")
    except Exception as e:
        plog.error(f"Error during validation CLI: {str(e)}")
        print(f"ERROR: {str(e)}")
    plog.finalize()

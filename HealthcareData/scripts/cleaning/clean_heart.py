#!/usr/bin/env python3
import os
import pandas as pd
from HealthcareData.config import RAW_DIR, CLEANED_DIR
from HealthcareData.scripts.logger_helper import PipelineLogger
from HealthcareData.scripts.validation.validate_dataset import validate

def clean_heart():
    plog = PipelineLogger("Clean_Heart", "clean_heart.log")
    plog.info("Starting clean heart dataset pipeline...")
    
    input_path = os.path.join(RAW_DIR, "heart", "heart_cleveland_upload.csv")
    output_dir = os.path.join(CLEANED_DIR, "heart")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "heart.csv")
    
    if not os.path.exists(input_path):
        plog.error(f"Input file not found at: {input_path}")
        plog.finalize()
        return

    try:
        # Load
        df = pd.read_csv(input_path)
        plog.records_processed = len(df)
        plog.info(f"Loaded {len(df)} records.")

        # Clean columns
        df.columns = [col.strip() for col in df.columns]

        # Remove duplicates
        duplicates = df.duplicated().sum()
        if duplicates > 0:
            df = df.drop_duplicates()
            plog.duplicates_removed = duplicates
            plog.info(f"Removed {duplicates} duplicate rows.")

        # Fill NaNs if any
        for col in df.columns:
            missing_count = df[col].isnull().sum()
            if missing_count > 0:
                if col in ["sex", "cp", "fbs", "restecg", "exang", "slope", "ca", "thal", "condition"]:
                    fill_val = df[col].mode()[0]
                else:
                    fill_val = df[col].median()
                df[col] = df[col].fillna(fill_val)
                plog.missing_values_imputed += missing_count
                plog.info(f"Imputed {missing_count} missing values in '{col}' with: {fill_val}")

        # Standardise condition column to "num" for validation matching (if config says "num" is needed)
        if "condition" in df.columns and "num" not in df.columns:
            df = df.rename(columns={"condition": "num"})
            plog.info("Renamed 'condition' column to 'num' to align with validation schema.")

        # Validate
        validate(df, "heart", plog)

        # Save
        df.to_csv(output_path, index=False)
        plog.info(f"Successfully saved cleaned file to: {output_path}")

    except Exception as e:
        plog.error(f"Error during heart cleaning: {str(e)}")
        
    plog.finalize()

if __name__ == "__main__":
    clean_heart()

#!/usr/bin/env python3
import os
import pandas as pd
from HealthcareData.config import RAW_DIR, CLEANED_DIR
from HealthcareData.scripts.logger_helper import PipelineLogger
from HealthcareData.scripts.validation.validate_dataset import validate

def clean_pcos():
    plog = PipelineLogger("Clean_PCOS", "clean_pcos.log")
    plog.info("Starting clean PCOS dataset pipeline...")
    
    input_path = os.path.join(RAW_DIR, "pcos", "PCOS_extended_dataset.csv")
    output_dir = os.path.join(CLEANED_DIR, "pcos")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "pcos.csv")
    
    if not os.path.exists(input_path):
        plog.error(f"Input file not found at: {input_path}")
        plog.finalize()
        return

    try:
        # Load
        df = pd.read_csv(input_path)
        plog.records_processed = len(df)
        plog.info(f"Loaded {len(df)} records.")

        # Strip spaces from column names
        df.columns = [col.strip() for col in df.columns]

        # Rename columns to match required schema in config.py
        column_mapping = {
            "Age (yrs)": "Age (in years)",
            "Marraige Status (Yrs)": "Marital Status (Yrs)",
            "No. of abortions": "No. of aborations"
        }
        df = df.rename(columns=column_mapping)
        plog.info("Standardized PCOS column names to match validation schema.")

        # Remove duplicate rows
        duplicates = df.duplicated().sum()
        if duplicates > 0:
            df = df.drop_duplicates()
            plog.duplicates_removed = duplicates
            plog.info(f"Removed {duplicates} duplicate rows.")

        # Handle missing values
        for col in df.columns:
            missing_count = df[col].isnull().sum()
            if missing_count > 0:
                # Handle numeric versus categorical
                try:
                    df[col] = pd.to_numeric(df[col], errors='raise')
                    fill_val = df[col].median()
                except (ValueError, TypeError):
                    fill_val = df[col].mode()[0] if not df[col].mode().empty else "unknown"
                df[col] = df[col].fillna(fill_val)
                plog.missing_values_imputed += missing_count
                plog.info(f"Imputed {missing_count} missing values in '{col}' with: {fill_val}")

        # Validate
        validate(df, "pcos", plog)

        # Save
        df.to_csv(output_path, index=False)
        plog.info(f"Successfully saved cleaned file to: {output_path}")

    except Exception as e:
        plog.error(f"Error during PCOS cleaning: {str(e)}")
        
    plog.finalize()

if __name__ == "__main__":
    clean_pcos()

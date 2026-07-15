#!/usr/bin/env python3
import os
import pandas as pd
from HealthcareData.config import CLEANED_DIR
from HealthcareData.scripts.logger_helper import PipelineLogger

def clean_nhanes():
    plog = PipelineLogger("Clean_NHANES", "clean_nhanes.log")
    plog.info("Starting clean NHANES dataset pipeline...")
    
    cleaned_nhanes_dir = os.path.join(CLEANED_DIR, "nhanes")
    
    if not os.path.exists(cleaned_nhanes_dir):
        plog.error(f"Cleaned NHANES directory not found at: {cleaned_nhanes_dir}. Please run convert_nhanes.py first.")
        plog.finalize()
        return

    # Find all CSV files in cleaned nhanes
    csv_files = []
    for root, _, files in os.walk(cleaned_nhanes_dir):
        for file in files:
            if file.lower().endswith('.csv'):
                csv_files.append(os.path.join(root, file))

    plog.info(f"Found {len(csv_files)} converted CSV files to clean.")

    for csv_path in csv_files:
        try:
            rel_path = os.path.relpath(csv_path, cleaned_nhanes_dir)
            df = pd.read_csv(csv_path)
            plog.records_processed += len(df)
            
            # Clean column names
            df.columns = [col.strip() for col in df.columns]

            # Remove duplicates
            duplicates = df.duplicated().sum()
            if duplicates > 0:
                df = df.drop_duplicates()
                plog.duplicates_removed += duplicates
                plog.info(f"[{rel_path}] Removed {duplicates} duplicate rows.")

            # Fill missing values: for NHANES datasets, missing values are common.
            # We can fill numeric columns with median, and text columns with mode.
            for col in df.columns:
                missing_count = df[col].isnull().sum()
                if missing_count > 0:
                    if df[col].dtype == 'object':
                        fill_val = df[col].mode()[0] if not df[col].mode().empty else "unknown"
                    else:
                        fill_val = df[col].median()
                    df[col] = df[col].fillna(fill_val)
                    plog.missing_values_imputed += missing_count

            # Overwrite the cleaned CSV
            df.to_csv(csv_path, index=False)
            plog.info(f"Successfully cleaned: {rel_path}")

        except Exception as e:
            plog.error(f"Error cleaning file {csv_path}: {str(e)}")
            
    plog.finalize()

if __name__ == "__main__":
    clean_nhanes()

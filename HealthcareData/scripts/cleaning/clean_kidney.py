#!/usr/bin/env python3
import os
import pandas as pd
from HealthcareData.config import RAW_DIR, CLEANED_DIR
from HealthcareData.scripts.logger_helper import PipelineLogger
from HealthcareData.scripts.validation.validate_dataset import validate

def clean_kidney():
    plog = PipelineLogger("Clean_Kidney", "clean_kidney.log")
    plog.info("Starting clean kidney dataset pipeline...")
    
    input_path = os.path.join(RAW_DIR, "kidney", "kidney_disease.csv")
    output_dir = os.path.join(CLEANED_DIR, "kidney")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "kidney.csv")
    
    if not os.path.exists(input_path):
        plog.error(f"Input file not found at: {input_path}")
        plog.finalize()
        return

    try:
        # Load
        df = pd.read_csv(input_path)
        plog.records_processed = len(df)
        plog.info(f"Loaded {len(df)} records.")

        # Clean column names
        df.columns = [col.strip() for col in df.columns]

        # Remove duplicate rows
        duplicates = df.duplicated().sum()
        if duplicates > 0:
            df = df.drop_duplicates()
            plog.duplicates_removed = duplicates
            plog.info(f"Removed {duplicates} duplicate rows.")

        # Clean string spaces in categorical columns
        categorical_cols = ["rbc", "pc", "pcc", "ba", "htn", "dm", "cad", "appet", "pe", "ane", "classification"]
        for col in categorical_cols:
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip().str.lower()
                # Replace placeholder 'nan' text back to actual NaNs
                df[col] = df[col].replace('nan', None)

        # Impute missing values
        for col in df.columns:
            missing_count = df[col].isnull().sum()
            if missing_count > 0:
                if col in categorical_cols:
                    # Fill categorical with mode
                    modes = df[col].mode()
                    fill_val = modes[0] if not modes.empty else "unknown"
                else:
                    # Fill numeric with median
                    # Coerce first to handle mixed types
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                    fill_val = df[col].median()
                df[col] = df[col].fillna(fill_val)
                plog.missing_values_imputed += missing_count
                plog.info(f"Imputed {missing_count} missing values in '{col}' with: {fill_val}")

        # Ensure correct numeric types
        numeric_cols = ["age", "bp", "bgr", "bu", "sc", "sod", "pot", "hemo"]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
                df[col] = df[col].fillna(df[col].median())

        # Validate
        validate(df, "kidney", plog)

        # Save
        df.to_csv(output_path, index=False)
        plog.info(f"Successfully saved cleaned file to: {output_path}")

    except Exception as e:
        plog.error(f"Error during kidney cleaning: {str(e)}")
        
    plog.finalize()

if __name__ == "__main__":
    clean_kidney()

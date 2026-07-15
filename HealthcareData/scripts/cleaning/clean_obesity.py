#!/usr/bin/env python3
import os
import pandas as pd
from HealthcareData.config import RAW_DIR, CLEANED_DIR
from HealthcareData.scripts.logger_helper import PipelineLogger
from HealthcareData.scripts.validation.validate_dataset import validate

def clean_obesity():
    plog = PipelineLogger("Clean_Obesity", "clean_obesity.log")
    plog.info("Starting clean obesity dataset pipeline...")
    
    input_path = os.path.join(RAW_DIR, "obesity", "ObesityDataSet_raw_and_data_sinthetic.csv")
    output_dir = os.path.join(CLEANED_DIR, "obesity")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "obesity.csv")
    
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

        # Impute missing values
        for col in df.columns:
            missing_count = df[col].isnull().sum()
            if missing_count > 0:
                if df[col].dtype == 'object':
                    fill_val = df[col].mode()[0]
                else:
                    fill_val = df[col].median()
                df[col] = df[col].fillna(fill_val)
                plog.missing_values_imputed += missing_count
                plog.info(f"Imputed {missing_count} missing values in '{col}' with: {fill_val}")

        # Validate
        validate(df, "obesity", plog)

        # Save
        df.to_csv(output_path, index=False)
        plog.info(f"Successfully saved cleaned file to: {output_path}")

    except Exception as e:
        plog.error(f"Error during obesity cleaning: {str(e)}")
        
    plog.finalize()

if __name__ == "__main__":
    clean_obesity()

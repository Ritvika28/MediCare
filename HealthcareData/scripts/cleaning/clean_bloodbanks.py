#!/usr/bin/env python3
import os
import re
import pandas as pd
from HealthcareData.config import RAW_DIR, CLEANED_DIR
from HealthcareData.scripts.logger_helper import PipelineLogger
from HealthcareData.scripts.validation.validate_dataset import validate

def clean_bloodbanks():
    plog = PipelineLogger("Clean_Bloodbanks", "clean_bloodbanks.log")
    plog.info("Starting clean bloodbanks dataset pipeline...")
    
    input_path = os.path.join(RAW_DIR, "bloodbanks", "blood_centre.csv")
    output_dir = os.path.join(CLEANED_DIR, "bloodbanks")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "bloodbanks.csv")
    
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

        # Extract Pincode from Address using Regex
        pincodes = []
        for addr in df["Address"].astype(str):
            match = re.search(r'\b\d{6}\b', addr)
            pincodes.append(match.group(0) if match else "000000")
        df["Pincode"] = pincodes
        plog.info("Extracted 6-digit Pincodes from Address field via regex.")

        # Rename columns to match config.py requirements
        column_mapping = {
            "Blood Center": "Blood Centre Name",
            "Phone": "Contact No"
        }
        df = df.rename(columns=column_mapping)
        
        # Add missing fields
        if "District" not in df.columns:
            df["District"] = df["State"] # Default fallback
            
        df["Mobile"] = df["Contact No"]
        df["Latitude"] = 20.5937  # Center of India fallback
        df["Longitude"] = 78.9629

        # Ensure all required columns are selected
        required_cols = ["Blood Centre Name", "Address", "State", "District", "Pincode", "Contact No", "Mobile", "Email", "Latitude", "Longitude"]
        for col in required_cols:
            if col not in df.columns:
                df[col] = None
        df = df[required_cols]

        # Impute missing values
        df["Blood Centre Name"] = df["Blood Centre Name"].fillna("Unknown Blood Bank")
        df["Address"] = df["Address"].fillna("Address Not Available")
        df["State"] = df["State"].fillna("Unknown State")
        df["District"] = df["District"].fillna("Unknown District")
        df["Email"] = df["Email"].fillna("N/A")
        df["Contact No"] = df["Contact No"].fillna("N/A")
        df["Mobile"] = df["Mobile"].fillna("N/A")

        # Remove duplicate rows
        duplicates = df.duplicated().sum()
        if duplicates > 0:
            df = df.drop_duplicates()
            plog.duplicates_removed = duplicates
            plog.info(f"Removed {duplicates} duplicate rows.")

        # Validate
        validate(df, "bloodbanks", plog)

        # Save
        df.to_csv(output_path, index=False)
        plog.info(f"Successfully saved cleaned file to: {output_path}")

    except Exception as e:
        plog.error(f"Error during blood bank cleaning: {str(e)}")
        
    plog.finalize()

if __name__ == "__main__":
    clean_bloodbanks()

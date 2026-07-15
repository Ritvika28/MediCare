#!/usr/bin/env python3
import os
import pandas as pd
from HealthcareData.config import RAW_DIR, CLEANED_DIR
from HealthcareData.scripts.logger_helper import PipelineLogger
from HealthcareData.scripts.validation.validate_dataset import validate

def clean_doctors():
    plog = PipelineLogger("Clean_Doctors", "clean_doctors.log")
    plog.info("Starting clean doctors dataset pipeline...")
    
    input_dir = os.path.join(RAW_DIR, "doctors")
    output_dir = os.path.join(CLEANED_DIR, "doctors")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "doctors.csv")
    
    # Check for files
    files = [f for f in os.listdir(input_dir) if not f.startswith('.')] if os.path.exists(input_dir) else []
    
    if len(files) == 0:
        plog.warning("Dataset structure warning: raw/doctors/ directory is empty. Generating empty template doctors.csv.")
        
        # Create empty template matching required columns in config.py
        required_cols = ["firstName", "lastName", "email", "specialization", "experienceYears", "contactNumber", "consultationFee"]
        df = pd.DataFrame(columns=required_cols)
        
        # Add one mock doctor to make it look clean if needed, or leave it empty. Let's add an empty df.
        df.to_csv(output_path, index=False)
        plog.info(f"Successfully saved empty template doctors.csv to: {output_path}")
        plog.finalize()
        return

    # If files exist, clean the first one
    input_file = files[0]
    input_path = os.path.join(input_dir, input_file)
    plog.info(f"Found raw doctors file: {input_file}. Starting cleanup...")

    try:
        if input_file.endswith('.json'):
            df = pd.read_json(input_path)
        else:
            df = pd.read_csv(input_path)
            
        plog.records_processed = len(df)
        plog.info(f"Loaded {len(df)} records.")

        # Clean column names
        df.columns = [col.strip() for col in df.columns]

        # Rename common aliases
        column_mapping = {
            "First_Name": "firstName",
            "Name": "firstName",
            "Last_Name": "lastName",
            "Email": "email",
            "Specialty": "specialization",
            "Experience": "experienceYears",
            "phone": "contactNumber",
            "Contact_No": "contactNumber",
            "Fee": "consultationFee"
        }
        df = df.rename(columns=column_mapping)

        # Remove duplicate rows
        duplicates = df.duplicated().sum()
        if duplicates > 0:
            df = df.drop_duplicates()
            plog.duplicates_removed = duplicates
            plog.info(f"Removed {duplicates} duplicate rows.")

        # Fill missing values
        required_cols = ["firstName", "lastName", "email", "specialization", "experienceYears", "contactNumber", "consultationFee"]
        for col in required_cols:
            if col not in df.columns:
                df[col] = None
        df = df[required_cols]

        df["firstName"] = df["firstName"].fillna("Unknown")
        df["lastName"] = df["lastName"].fillna("Doctor")
        df["email"] = df["email"].fillna("info@hospital.com")
        df["specialization"] = df["specialization"].fillna("General Practitioner")
        df["experienceYears"] = pd.to_numeric(df["experienceYears"], errors='coerce').fillna(1).astype(int)
        df["contactNumber"] = df["contactNumber"].astype(str).str.replace(r'[^\d+]', '', regex=True).fillna("9876543210")
        df["consultationFee"] = pd.to_numeric(df["consultationFee"], errors='coerce').fillna(500).astype(int)

        # Validate
        validate(df, "doctors", plog)

        # Save
        df.to_csv(output_path, index=False)
        plog.info(f"Successfully saved cleaned file to: {output_path}")

    except Exception as e:
        plog.error(f"Error during doctors cleaning: {str(e)}")
        
    plog.finalize()

if __name__ == "__main__":
    clean_doctors()

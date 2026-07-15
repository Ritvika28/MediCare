#!/usr/bin/env python3
import os
import pandas as pd
from HealthcareData.config import RAW_DIR, CLEANED_DIR
from HealthcareData.scripts.logger_helper import PipelineLogger
from HealthcareData.scripts.validation.validate_dataset import validate

def clean_hospitals():
    plog = PipelineLogger("Clean_Hospitals", "clean_hospitals.log")
    plog.info("Starting clean hospitals dataset pipeline...")
    
    input_path = os.path.join(RAW_DIR, "hospitals", "hospital_directory.csv")
    output_dir = os.path.join(CLEANED_DIR, "hospitals")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "hospitals.csv")
    
    if not os.path.exists(input_path):
        plog.error(f"Input file not found at: {input_path}")
        plog.finalize()
        return

    try:
        # Load
        df = pd.read_csv(input_path, low_memory=False)
        plog.records_processed = len(df)
        plog.info(f"Loaded {len(df)} records.")

        # Clean column names
        df.columns = [col.strip() for col in df.columns]

        # Extract Latitude and Longitude from Location_Coordinates
        df["Latitude"] = None
        df["Longitude"] = None
        
        if "Location_Coordinates" in df.columns:
            coords = df["Location_Coordinates"].astype(str).str.split(",")
            lats = []
            lngs = []
            for item in coords:
                if isinstance(item, list) and len(item) == 2:
                    try:
                        lats.append(float(item[0].strip()))
                        lngs.append(float(item[1].strip()))
                    except ValueError:
                        lats.append(None)
                        lngs.append(None)
                else:
                    lats.append(None)
                    lngs.append(None)
            df["Latitude"] = lats
            df["Longitude"] = lngs
            plog.info("Successfully extracted Latitude and Longitude from coordinates column.")

        # Rename columns to match required schema in config.py
        column_mapping = {
            "Address_Original_First_Line": "Address",
            "Mobile_Number": "MobileNumber",
            "Emergency_Services": "EmergencyServices"
        }
        df = df.rename(columns=column_mapping)

        # Standardise and fill missing values
        required_cols = ["Hospital_Name", "Address", "State", "District", "Pincode", "Telephone", "MobileNumber", "EmergencyServices", "Latitude", "Longitude"]
        
        # Select and preserve only relevant columns or fill missing
        for col in required_cols:
            if col not in df.columns:
                df[col] = None
            
        df = df[required_cols]

        # Impute missing values
        df["Latitude"] = pd.to_numeric(df["Latitude"], errors='coerce').fillna(20.5937) # Default center latitude of India
        df["Longitude"] = pd.to_numeric(df["Longitude"], errors='coerce').fillna(78.9629) # Default center longitude of India
        
        df["Hospital_Name"] = df["Hospital_Name"].fillna("Unknown Hospital")
        df["Address"] = df["Address"].fillna("Address Not Available")
        df["State"] = df["State"].fillna("Unknown State")
        df["District"] = df["District"].fillna("Unknown District")
        df["Pincode"] = df["Pincode"].fillna("000000")
        df["Telephone"] = df["Telephone"].fillna("N/A")
        df["MobileNumber"] = df["MobileNumber"].fillna("N/A")
        df["EmergencyServices"] = df["EmergencyServices"].fillna("No")

        # Remove duplicate rows
        duplicates = df.duplicated().sum()
        if duplicates > 0:
            df = df.drop_duplicates()
            plog.duplicates_removed = duplicates
            plog.info(f"Removed {duplicates} duplicate rows.")

        # Validate
        validate(df, "hospitals", plog)

        # Save
        df.to_csv(output_path, index=False)
        plog.info(f"Successfully saved cleaned file to: {output_path}")

    except Exception as e:
        plog.error(f"Error during hospital cleaning: {str(e)}")
        
    plog.finalize()

if __name__ == "__main__":
    clean_hospitals()

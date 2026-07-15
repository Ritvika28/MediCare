#!/usr/bin/env python3
import os
import pandas as pd
from tqdm import tqdm
from HealthcareData.config import RAW_DIR, CLEANED_DIR
from HealthcareData.scripts.logger_helper import PipelineLogger

def convert_nhanes_files():
    plog = PipelineLogger("NHANES_Converter", "nhanes_conversion.log")
    plog.info("Starting NHANES SAS XPT to CSV conversion pipeline...")
    
    raw_nhanes_dir = os.path.join(RAW_DIR, "nhanes")
    cleaned_nhanes_dir = os.path.join(CLEANED_DIR, "nhanes")
    
    if not os.path.exists(raw_nhanes_dir):
        plog.error(f"Raw NHANES directory not found at: {raw_nhanes_dir}")
        plog.finalize()
        return

    # Find all .xpt files
    xpt_files = []
    for root, _, files in os.walk(raw_nhanes_dir):
        for file in files:
            if file.lower().endswith('.xpt'):
                full_path = os.path.join(root, file)
                xpt_files.append(full_path)

    plog.info(f"Found {len(xpt_files)} XPT files to process.")
    
    # Progress bar using tqdm
    for xpt_path in tqdm(xpt_files, desc="Converting NHANES XPT to CSV"):
        try:
            # Determine relative path to maintain folder hierarchy
            rel_path = os.path.relpath(xpt_path, raw_nhanes_dir)
            csv_rel_path = os.path.splitext(rel_path)[0] + ".csv"
            csv_output_path = os.path.join(cleaned_nhanes_dir, csv_rel_path)
            
            # Skip if already exists
            if os.path.exists(csv_output_path):
                plog.info(f"Skipping already converted file: {csv_rel_path}")
                continue
                
            # Create destination folder
            os.makedirs(os.path.dirname(csv_output_path), exist_ok=True)
            
            # Read XPT and save to CSV
            plog.info(f"Converting {rel_path}...")
            df = pd.read_sas(xpt_path, format="xport", encoding="utf-8")
            
            # Clean column names (strip whitespace, decode if byte strings)
            df.columns = [str(col).strip() for col in df.columns]
            
            df.to_csv(csv_output_path, index=False)
            plog.records_processed += len(df)
            plog.info(f"Successfully converted {rel_path} to CSV ({len(df)} rows).")
            
        except Exception as e:
            plog.error(f"Error converting {xpt_path}: {str(e)}")
            
    summary = plog.finalize()
    print(f"NHANES conversion complete. Total records: {summary['records_processed']}")

if __name__ == "__main__":
    convert_nhanes_files()

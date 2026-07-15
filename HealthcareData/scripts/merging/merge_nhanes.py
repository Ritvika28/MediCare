#!/usr/bin/env python3
import os
import re
import pandas as pd
from HealthcareData.config import CLEANED_DIR, MERGED_DIR
from HealthcareData.scripts.logger_helper import PipelineLogger

def merge_nhanes_pipeline():
    plog = PipelineLogger("Merge_NHANES", "merge_nhanes.log")
    plog.info("Starting NHANES datasets merging pipeline...")
    
    cleaned_nhanes_dir = os.path.join(CLEANED_DIR, "nhanes")
    output_dir = MERGED_DIR
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "nhanes_master.csv")
    
    if not os.path.exists(cleaned_nhanes_dir):
        plog.error(f"Cleaned NHANES directory not found at: {cleaned_nhanes_dir}")
        plog.finalize()
        return

    # Find all CSV files recursively
    csv_files = []
    for root, _, files in os.walk(cleaned_nhanes_dir):
        for file in files:
            if file.lower().endswith('.csv'):
                csv_files.append(os.path.join(root, file))

    plog.info(f"Found {len(csv_files)} CSV files for merging.")

    # Group files by cycle (e.g. J, I, H, G, F, E, D, C, B, or empty/no suffix)
    # The suffix is usually _B, _C, etc. before the .csv extension.
    cycles = {}
    for filepath in csv_files:
        filename = os.path.basename(filepath)
        name_without_ext = os.path.splitext(filename)[0]
        
        # Regex to extract suffix
        match = re.search(r'_([A-L])$', name_without_ext)
        if match:
            cycle_letter = match.group(1)
        elif name_without_ext.startswith('P_'):
            cycle_letter = 'P'
        else:
            cycle_letter = 'A' # Default/first cycle
            
        if cycle_letter not in cycles:
            cycles[cycle_letter] = []
        cycles[cycle_letter].append(filepath)

    plog.info(f"Identified {len(cycles)} dataset cycles: {list(cycles.keys())}")

    cycle_dfs = []
    # Merge files within each cycle
    for cycle_letter, files in cycles.items():
        plog.info(f"Merging cycle '{cycle_letter}' containing {len(files)} files...")
        
        # We start with the demographics file if found, otherwise the first file
        demo_file = next((f for f in files if "DEMO" in os.path.basename(f).upper()), None)
        if demo_file:
            files.remove(demo_file)
            files.insert(0, demo_file)
            
        base_df = None
        for i, filepath in enumerate(files):
            try:
                df = pd.read_csv(filepath)
                if "SEQN" not in df.columns:
                    plog.warning(f"Skipping file without 'SEQN' column: {os.path.basename(filepath)}")
                    continue
                    
                # Standardise SEQN values to int
                df["SEQN"] = pd.to_numeric(df["SEQN"], errors='coerce')
                df = df.dropna(subset=["SEQN"])
                df["SEQN"] = df["SEQN"].astype(int)
                
                if base_df is None:
                    base_df = df
                else:
                    # Merge on SEQN (performing outer join so we don't drop participants)
                    # Suffix duplicate columns to avoid conflicts
                    base_df = pd.merge(base_df, df, on="SEQN", how="outer", suffixes=("", f"_{os.path.basename(filepath)[:4]}"))
            except Exception as e:
                plog.error(f"Error merging file {filepath}: {str(e)}")
                
        if base_df is not None:
            # Drop duplicate columns
            base_df = base_df.loc[:, ~base_df.columns.duplicated()]
            # Tag rows with their cycle letter
            base_df["survey_cycle"] = cycle_letter
            cycle_dfs.append(base_df)
            plog.info(f"Cycle '{cycle_letter}' merge complete. Rows: {len(base_df)}")

    if not cycle_dfs:
        plog.error("No datasets could be merged.")
        plog.finalize()
        return

    # Combine all cycle datasets together
    plog.info("Combining datasets across all cycles...")
    master_df = pd.concat(cycle_dfs, axis=0, ignore_index=True)
    
    # Sort by SEQN
    master_df = master_df.sort_values(by="SEQN")
    plog.records_processed = len(master_df)

    # Save to merged folder
    master_df.to_csv(output_path, index=False)
    plog.info(f"Successfully saved unified master NHANES dataset to: {output_path} ({len(master_df)} rows).")

    plog.finalize()

if __name__ == "__main__":
    merge_nhanes_pipeline()

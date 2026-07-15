#!/usr/bin/env python3
import os
import sys
import time

# Ensure root of hospital app (which contains HealthcareData) is in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from HealthcareData.scripts.converters.convert_nhanes import convert_nhanes_files
from HealthcareData.scripts.cleaning.clean_diabetes import clean_diabetes
from HealthcareData.scripts.cleaning.clean_heart import clean_heart
from HealthcareData.scripts.cleaning.clean_hypertension import clean_hypertension
from HealthcareData.scripts.cleaning.clean_kidney import clean_kidney
from HealthcareData.scripts.cleaning.clean_liver import clean_liver
from HealthcareData.scripts.cleaning.clean_pcos import clean_pcos
from HealthcareData.scripts.cleaning.clean_obesity import clean_obesity
from HealthcareData.scripts.cleaning.clean_sleep import clean_sleep
from HealthcareData.scripts.cleaning.clean_mental_health import clean_mental_health
from HealthcareData.scripts.cleaning.clean_hospitals import clean_hospitals
from HealthcareData.scripts.cleaning.clean_bloodbanks import clean_bloodbanks
from HealthcareData.scripts.cleaning.clean_labs import clean_labs
from HealthcareData.scripts.cleaning.clean_doctors import clean_doctors
from HealthcareData.scripts.cleaning.clean_nhanes import clean_nhanes
from HealthcareData.scripts.merging.merge_nhanes import merge_nhanes_pipeline
from HealthcareData.scripts.feature_engineering.extract_features import run_all_feature_engineering

def run_full_pipeline():
    print("==============================================================")
    print("STARTING MEDICARE HEALTHCARE DATA PREPROCESSING PIPELINE")
    print("==============================================================")
    
    start_time = time.time()
    
    # 1. NHANES SAS XPT to CSV Conversion
    print("\n--- [1/5] Running NHANES XPT to CSV Conversion ---")
    convert_nhanes_files()
    
    # 2. Cleaning datasets
    print("\n--- [2/5] Cleaning Datasets ---")
    print("Cleaning Diabetes...")
    clean_diabetes()
    print("Cleaning Cardiovascular Heart...")
    clean_heart()
    print("Cleaning Hypertension...")
    clean_hypertension()
    print("Cleaning Chronic Kidney Disease...")
    clean_kidney()
    print("Cleaning Indian Liver Patients...")
    clean_liver()
    print("Cleaning PCOS Patients...")
    clean_pcos()
    print("Cleaning Obesity...")
    clean_obesity()
    print("Cleaning Sleep Quality and Disorders...")
    clean_sleep()
    print("Cleaning Mental Health...")
    clean_mental_health()
    print("Cleaning Hospital Directory...")
    clean_hospitals()
    print("Cleaning Blood Banks...")
    clean_bloodbanks()
    print("Cleaning NABL Laboratories...")
    clean_labs()
    print("Cleaning Doctor Directories...")
    clean_doctors()
    print("Cleaning converted NHANES datasets...")
    clean_nhanes()
    
    # 3. Merging NHANES
    print("\n--- [3/5] Merging NHANES Dataset Cycles on SEQN ---")
    merge_nhanes_pipeline()
    
    # 4. Feature Engineering
    print("\n--- [4/5] Extracting Clinical Biomarkers & Risk Flags ---")
    run_all_feature_engineering()
    
    duration = time.time() - start_time
    print("\n==============================================================")
    print(f"MEDICARE DATA PREPROCESSING PIPELINE COMPLETED IN {duration:.2f}s")
    print("==============================================================")

if __name__ == "__main__":
    run_full_pipeline()

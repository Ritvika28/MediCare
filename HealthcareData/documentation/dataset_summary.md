# Dataset Summary Report

This document summarizes the characteristics and dimensions of the raw clinical datasets integrated within the MediCare analytics platform.

## Summary Table

| Dataset Name | Source Format | Key Identifiers | Primary Features | Records Count | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Diabetes** | CSV | None | Glucose, BMI, Insulin, Age, Blood Pressure, Outcome | 768 | Diabetes onset risk prediction |
| **Heart** | CSV | None | Chest Pain (cp), Age, Sex, Cholesterol, BP (trestbps), Condition | 297 | Cardiovascular risk classifier |
| **Hypertension** | CSV | None | Age, Salt Intake, Stress Score, BP History, Sleep Duration, BMI, Medication, Family History, Exercise Level, Smoking Status | 2000 | Blood pressure category prediction |
| **Kidney Disease** | CSV | id | Blood pressure (bp), Specific Gravity (sg), Albumin (al), Blood Glucose Random (bgr), Blood Urea (bu), Classification | 400 | Renal failure risk profiling |
| **Indian Liver Patient**| CSV | None | Bilirubin, Proteins, Albumin, Enzymes (ALT/AST), Dataset (Disease state) | 583 | Hepatic liver dysfunction prediction |
| **Obesity** | CSV | None | Weight, Height, Family History, Eating Habits, Activity (FAF), TUE, NObeyesdad | 2111 | Multi-class body mass category prediction |
| **PCOS** | CSV | Patient File No. | Pulse Rate, RR, Hb, Cycle regularity, Hormones (beta-HCG, FSH, LH), PCOS (Y/N) | 541 | Hormonal cyst and fertility screening |
| **Sleep Health** | CSV | Person ID | Occupation, Sleep Duration, Quality, Stress Level, Steps, sleep disorder flag | 374 | Sleep apnea and lifestyle stress tracking |
| **Mental Health** | CSV | None | Work Interfere, Treatments, Family History, Stress levels | 1259 | Psychological and stress tracking survey |
| **NHANES** | SAS XPT | SEQN | Combined Demographics, Labs, Examinations, and Questionnaires | Multi-Cycle | Baseline population health profiling |
| **Hospitals** | CSV | Sr_No | Coordinates, Address, Pincode, Telephone, Specialities | 30000+ | Nearby emergency facility lookups |
| **Blood Banks** | CSV | S.No. | Centre Name, Address, Category, Phone, Email | 3000+ | Emergency blood supply inventory locator |
| **Laboratories** | CSV | Sr. No. | Laboratory Name, Address, City, State | 10000+ | Diagnostic test centers search index |

## Missing Datasets Warning
- **Doctors**: Currently, the raw directory `raw/doctors/` is empty. The pipeline gracefully processes this by writing an empty template file `cleaned/doctors/doctors.csv` with appropriate column schemas.

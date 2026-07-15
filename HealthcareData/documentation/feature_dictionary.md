# Feature Dictionary & Clinical Engineering Reference

This document catalogs and details every engineered feature, biomarker, and risk indicator produced in the `extract_features.py` stage of the pipeline.

## Engineered Features List

### 1. BMI (Body Mass Index)
- **Formula**: `Weight (kg) / [Height (m) ^ 2]`
- **Clinical Significance**: Assesses body mass categories (underweight, normal weight, overweight, obese).

### 2. Waist-to-Height Ratio
- **Formula**: `Waist Circumference (cm) / Height (cm)`
- **Clinical Significance**: Direct indicator of abdominal obesity and cardiovascular risk. Values > 0.5 correlate with higher metabolic risks.

### 3. Pulse Pressure
- **Formula**: `Systolic Blood Pressure - Diastolic Blood Pressure`
- **Clinical Significance**: Indicates arterial stiffness. Values exceeding 60 mmHg reflect elevated cardiovascular risk.

### 4. Mean Arterial Pressure (MAP)
- **Formula**: `Diastolic Blood Pressure + (Pulse Pressure / 3)`
- **Clinical Significance**: Average arterial pressure during a single cardiac cycle. Used to assess organ perfusion quality (ideal range: 70–100 mmHg).

### 5. Blood Pressure Category
- **Categories**:
  - `Normal`: Systolic < 120 and Diastolic < 80
  - `Elevated`: Systolic 120–129 and Diastolic < 80
  - `Stage 1 Hypertension`: Systolic 130–139 or Diastolic 80–89
  - `Stage 2 Hypertension`: Systolic >= 140 or Diastolic >= 90
- **Clinical Significance**: Follows AHA (American Heart Association) diagnostic guidelines.

### 6. Age Group
- **Categories**:
  - `Youth`: Age < 18
  - `Young Adult`: Age 18–35
  - `Middle-aged`: Age 36–55
  - `Senior`: Age > 55
- **Clinical Significance**: Stratifies age-dependent physiological rates.

### 7. Glucose Category
- **Categories**:
  - `Normal`: Fasting glucose < 100 mg/dL
  - `Prediabetic`: Fasting glucose 100–125 mg/dL
  - `Diabetic`: Fasting glucose >= 126 mg/dL
- **Clinical Significance**: Aligns with ADA (American Diabetes Association) guidelines.

### 8. Sleep Score
- **Scale**: 0 to 10
- **Logic**: Favorable sleep durations (7.0 to 8.5 hours) receive a score of 10. Durations < 6 hours or > 9.5 hours are scored at 4.
- **Clinical Significance**: Rates duration suitability for circadian recovery.

### 9. Alcohol Score
- **Scale**: 0 to 10
- **Logic**: Absentees score 10, occasional/moderate social drinkers score 6, daily/heavy users score 3.

### 10. Lipid Ratios (HDL & Triglyceride Ratios)
- **HDL Ratio**: `Total Cholesterol / HDL Cholesterol` (values > 5.0 flag high cardiovascular risk)
- **Triglyceride Ratio**: `Triglycerides / HDL Cholesterol` (values > 3.0 indicate insulin resistance risk)

### 11. Cardiovascular Risk Flag
- **Logic**: Set to 1 if Systolic BP >= 140 OR Diastolic BP >= 90 OR Lipid HDL Ratio > 5.0. Otherwise 0.

### 12. Diabetic Risk Flag
- **Logic**: Set to 1 if Glucose Category is `Diabetic` (glucose >= 126 mg/dL). Otherwise 0.

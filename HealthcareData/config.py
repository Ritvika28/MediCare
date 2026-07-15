import os

# Base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(BASE_DIR, "raw")
CLEANED_DIR = os.path.join(BASE_DIR, "cleaned")
MERGED_DIR = os.path.join(BASE_DIR, "merged")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")
FEATURE_ENGINEERED_DIR = os.path.join(BASE_DIR, "feature_engineered")
LOGS_DIR = os.path.join(BASE_DIR, "logs")
DOCS_DIR = os.path.join(BASE_DIR, "documentation")

# Create directories if they do not exist
for path in [CLEANED_DIR, MERGED_DIR, PROCESSED_DIR, FEATURE_ENGINEERED_DIR, LOGS_DIR, DOCS_DIR]:
    os.makedirs(path, exist_ok=True)

# Random Seed for reproducibility
RANDOM_SEED = 42

# Column validation rules and boundary definitions
VALIDATION_RULES = {
    "diabetes": {
        "required_columns": ["Pregnancies", "Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI", "DiabetesPedigreeFunction", "Age", "Outcome"],
        "numeric_bounds": {
            "Pregnancies": (0, 20),
            "Glucose": (0, 300),
            "BloodPressure": (0, 200),
            "SkinThickness": (0, 100),
            "Insulin": (0, 1000),
            "BMI": (0.0, 80.0),
            "DiabetesPedigreeFunction": (0.0, 3.0),
            "Age": (0, 120),
            "Outcome": (0, 1)
        }
    },
    "heart": {
        "required_columns": ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal", "num"],
        "numeric_bounds": {
            "age": (0, 120),
            "sex": (0, 1),
            "cp": (1, 4),
            "trestbps": (50, 250),
            "chol": (50, 600),
            "fbs": (0, 1),
            "restecg": (0, 2),
            "thalach": (50, 250),
            "exang": (0, 1),
            "oldpeak": (0.0, 10.0),
            "slope": (1, 3),
            "ca": (0, 4),
            "thal": (3, 7),
            "num": (0, 4)
        }
    },
    "hypertension": {
        "required_columns": ["Age", "Salt_Intake", "Stress_Score", "BP_History", "Sleep_Duration", "BMI", "Medication", "Family_History", "Exercise_Level", "Smoking_Status", "Has_Hypertension"],
        "numeric_bounds": {
            "Age": (0, 120),
            "Salt_Intake": (0.0, 30.0),
            "Stress_Score": (0, 10),
            "Sleep_Duration": (0.0, 24.0),
            "BMI": (0.0, 80.0)
        }
    },
    "kidney": {
        "required_columns": ["age", "bp", "sg", "al", "su", "rbc", "pc", "pcc", "ba", "bgr", "bu", "sc", "sod", "pot", "hemo", "pcv", "wc", "rc", "htn", "dm", "cad", "appet", "pe", "ane", "classification"],
        "numeric_bounds": {
            "age": (0, 120),
            "bp": (40, 200),
            "bgr": (50, 500),
            "bu": (1, 400),
            "sc": (0.1, 50.0),
            "sod": (50, 200),
            "pot": (1.0, 15.0),
            "hemo": (2.0, 25.0)
        }
    },
    "liver": {
        "required_columns": ["Age", "Gender", "Total_Bilirubin", "Direct_Bilirubin", "Alkaline_Phosphotase", "Alamine_Aminotransferase", "Aspartate_Aminotransferase", "Total_Protiens", "Albumin", "Albumin_and_Globulin_Ratio", "Dataset"],
        "numeric_bounds": {
            "Age": (0, 120),
            "Total_Bilirubin": (0.1, 100.0),
            "Direct_Bilirubin": (0.1, 50.0),
            "Alkaline_Phosphotase": (10, 3000),
            "Alamine_Aminotransferase": (5, 2000),
            "Aspartate_Aminotransferase": (5, 3000),
            "Total_Protiens": (2.0, 15.0),
            "Albumin": (0.5, 10.0),
            "Albumin_and_Globulin_Ratio": (0.1, 10.0),
            "Dataset": (1, 2)
        }
    },
    "pcos": {
        "required_columns": ["PCOS (Y/N)", "Age (in years)", "Weight (Kg)", "Height(Cm)", "Blood Group", "Pulse rate(bpm)", "RR (breaths/min)", "Hb(g/dl)", "Cycle(R/I)", "Cycle length(days)", "Marital Status (Yrs)", "Pregnant(Y/N)", "No. of aborations"],
        "numeric_bounds": {
            "Age (in years)": (1, 100),
            "Weight (Kg)": (10, 250),
            "Height(Cm)": (50, 250),
            "Pulse rate(bpm)": (40, 200),
            "RR (breaths/min)": (8, 50),
            "Hb(g/dl)": (2, 25),
            "Cycle length(days)": (1, 100)
        }
    },
    "obesity": {
        "required_columns": ["Gender", "Age", "Height", "Weight", "family_history_with_overweight", "FAVC", "FCVC", "NCP", "CAEC", "SMOKE", "CH2O", "SCC", "FAF", "TUE", "CALC", "MTRANS", "NObeyesdad"],
        "numeric_bounds": {
            "Age": (0, 120),
            "Height": (0.5, 2.5),
            "Weight": (10, 300)
        }
    },
    "sleep": {
        "required_columns": ["Person ID", "Gender", "Age", "Occupation", "Sleep Duration", "Quality of Sleep", "Physical Activity Level", "Stress Level", "BMI Category", "Blood Pressure", "Heart Rate", "Daily Steps", "Sleep Disorder"],
        "numeric_bounds": {
            "Age": (0, 120),
            "Sleep Duration": (1.0, 24.0),
            "Quality of Sleep": (1, 10),
            "Stress Level": (1, 10),
            "Heart Rate": (30, 200),
            "Daily Steps": (0, 50000)
        }
    },
    "mental_health": {
        "required_columns": ["Gender", "Country", "self_employed", "family_history", "treatment", "work_interfere", "no_employees", "remote_work", "tech_company", "benefits", "care_options", "wellness_program", "seek_help", "anonymity", "leave", "mental_health_consequence", "phys_health_consequence", "coworkers", "supervisor", "mental_health_interview", "phys_health_interview", "mental_vs_physical", "obs_consequence"],
        "numeric_bounds": {}
    },
    "hospitals": {
        "required_columns": ["Hospital_Name", "Address", "State", "District", "Pincode", "Telephone", "MobileNumber", "EmergencyServices", "Latitude", "Longitude"],
        "numeric_bounds": {
            "Latitude": (-90.0, 90.0),
            "Longitude": (-180.0, 180.0)
        }
    },
    "bloodbanks": {
        "required_columns": ["Blood Centre Name", "Address", "State", "District", "Pincode", "Contact No", "Mobile", "Email", "Latitude", "Longitude"],
        "numeric_bounds": {
            "Latitude": (-90.0, 90.0),
            "Longitude": (-180.0, 180.0)
        }
    },
    "labs": {
        "required_columns": ["Laboratory Name", "Address", "State", "District", "Pincode", "Contact Person", "Contact No", "Mobile", "Email", "Latitude", "Longitude"],
        "numeric_bounds": {
            "Latitude": (-90.0, 90.0),
            "Longitude": (-180.0, 180.0)
        }
    },
    "doctors": {
        "required_columns": ["firstName", "lastName", "email", "specialization", "experienceYears", "contactNumber", "consultationFee"],
        "numeric_bounds": {
            "experienceYears": (0, 80),
            "consultationFee": (0, 50000)
        }
    }
}

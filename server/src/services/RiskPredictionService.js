import { Patient } from '../models/Patient.js';
import { HealthAssessment } from '../models/HealthAssessment.js';
import { HealthCalculatorHistory } from '../models/HealthCalculatorHistory.js';
import { HealthPrediction } from '../models/HealthPrediction.js';
import { runPythonInference } from '../ml/inferenceBridge.js';

export const calculateAge = (dob) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const getRiskLevel = (score) => {
  if (score < 30) return 'Low';
  if (score < 60) return 'Moderate';
  if (score < 85) return 'High';
  return 'Critical';
};

export const generatePredictionsForUser = async (userId) => {
  const patient = await Patient.findOne({ user: userId });
  if (!patient) return [];

  const [latestAssessment, calcHistory] = await Promise.all([
    HealthAssessment.findOne({ patient: patient._id }).sort('-createdAt'),
    HealthCalculatorHistory.find({ patient: patient._id }).sort('-createdAt')
  ]);

  // Group latest calculator readings by type
  const latestCalc = {};
  calcHistory.forEach((h) => {
    if (!latestCalc[h.calculatorType]) {
      latestCalc[h.calculatorType] = h;
    }
  });

  // Extract patient characteristics
  const age = calculateAge(patient.dateOfBirth) || latestAssessment?.answers?.age || 35;
  const gender = patient.gender || latestAssessment?.answers?.gender || 'other';
  const medicalHistory = patient.medicalHistory?.map(h => h.condition?.toLowerCase()) || [];
  const familyHistory = latestAssessment?.answers?.familyHistory?.map(f => f.toLowerCase()) || [];
  const smoking = latestAssessment?.answers?.smoking || 'never';
  const alcohol = latestAssessment?.answers?.alcohol || 'never';
  const exercise = latestAssessment?.answers?.exercise || 'active';

  // Extract metric values
  const bmi = latestCalc.bmi?.outputs?.bmi || 
              (latestAssessment?.answers?.weight && latestAssessment?.answers?.height ? 
                latestAssessment.answers.weight / Math.pow(latestAssessment.answers.height / 100, 2) : 22.0);

  const bpSystolic = latestCalc.blood_pressure?.outputs?.systolic || 
                     (latestAssessment?.answers?.bloodPressure === 'stage2' ? 160 :
                      latestAssessment?.answers?.bloodPressure === 'stage1' ? 140 :
                      latestAssessment?.answers?.bloodPressure === 'prehypertension' ? 130 : 120);

  const bpDiastolic = latestCalc.blood_pressure?.outputs?.diastolic || 80;

  const bloodSugar = latestCalc.blood_sugar?.outputs?.value || 
                     (latestAssessment?.answers?.diabetes ? 145 : 90);

  const cholesterol = latestCalc.cholesterol?.outputs?.total || 180;
  const egfr = latestCalc.kidney_health?.outputs?.egfr || 95;
  const fib4Score = latestCalc.liver_health?.outputs?.fib4Score || 1.0;
  const heartScore = latestCalc.heart_health?.outputs?.heartScore || 85;
  const sleepHours = latestCalc.sleep_assessment?.outputs?.sleepHours || latestAssessment?.answers?.sleep || 7.5;
  const sleepScore = latestCalc.sleep_assessment?.outputs?.sleepScore || 80;
  
  const stressTotalScore = latestCalc.stress_assessment?.outputs?.totalScore || 
                           (latestAssessment?.answers?.stress === 'high' ? 18 :
                            latestAssessment?.answers?.stress === 'moderate' ? 10 : 4);
  const stressLevel = latestCalc.stress_assessment?.outputs?.level || latestAssessment?.answers?.stress || 'low';

  // Calculate generic confidence based on available data
  let dataPointsCount = 0;
  if (latestCalc.bmi || (latestAssessment?.answers?.weight && latestAssessment?.answers?.height)) dataPointsCount += 10;
  if (latestCalc.blood_pressure || latestAssessment?.answers?.bloodPressure) dataPointsCount += 10;
  if (latestCalc.blood_sugar || latestAssessment?.answers?.diabetes) dataPointsCount += 10;
  if (latestCalc.cholesterol) dataPointsCount += 10;
  if (latestCalc.kidney_health) dataPointsCount += 10;
  if (latestCalc.liver_health) dataPointsCount += 10;
  if (latestCalc.heart_health) dataPointsCount += 10;
  if (latestCalc.sleep_assessment || latestAssessment?.answers?.sleep) dataPointsCount += 10;
  if (latestCalc.stress_assessment || latestAssessment?.answers?.stress) dataPointsCount += 10;
  if (latestAssessment) dataPointsCount += 10;
  
  const baseConfidence = Math.min(98, 40 + dataPointsCount);

  const predictionsList = [];

  // 1. Diabetes Risk Prediction
  let diabetesScore = 10;
  const diabetesFactors = [];
  const diabetesRecommendations = [];

  if (bloodSugar > 100) {
    diabetesFactors.push(`Elevated blood glucose level (${bloodSugar} mg/dL)`);
  }
  if (bloodSugar > 125 || latestAssessment?.answers?.diabetes || medicalHistory.includes('diabetes')) {
    diabetesFactors.push('Existing diabetic profile or clinical markers');
    diabetesRecommendations.push('Maintain strict adherence to diabetic diet and medication');
  }
  if (bmi > 25) {
    diabetesFactors.push(`High BMI (${bmi.toFixed(1)})`);
  }
  if (familyHistory.includes('diabetes')) {
    diabetesFactors.push('Family history of diabetes');
  }
  if (exercise === 'none') {
    diabetesFactors.push('Lack of physical exercise');
    diabetesRecommendations.push('Incorporate 150 minutes of moderate aerobic exercise weekly');
  }
  if (age > 45) {
    diabetesFactors.push('Age over 45');
  }

  let diabetesExplanation = { positive: [], negative: [] };
  let bpExplanation = { positive: [], negative: [] };
  let heartExplanation = { positive: [], negative: [] };
  let kidneyExplanation = { positive: [], negative: [] };
  let liverExplanation = { positive: [], negative: [] };
  let obesityExplanation = { positive: [], negative: [] };
  let pcosExplanation = { positive: [], negative: [] };
  let sleepExplanation = { positive: [], negative: [] };
  let stressExplanation = { positive: [], negative: [] };

  try {
    const res = await runPythonInference({
      task: 'disease',
      disease: 'diabetes',
      features: {
        Pregnancies: gender === 'female' && latestAssessment?.answers?.pregnancies ? latestAssessment.answers.pregnancies : 0,
        Glucose: bloodSugar,
        BloodPressure: bpDiastolic,
        SkinThickness: 20,
        Insulin: 80,
        BMI: bmi,
        DiabetesPedigreeFunction: 0.47,
        Age: age
      }
    });
    diabetesScore = Math.round(res.probability * 100);
    diabetesExplanation = res.explanations || diabetesExplanation;
  } catch (err) {
    console.error("Python diabetes inference error:", err);
    let fallback = 10;
    if (bloodSugar > 100) fallback += (bloodSugar - 100) * 0.7;
    if (bmi > 25) fallback += (bmi - 25) * 1.8;
    diabetesScore = Math.max(5, Math.min(98, Math.round(fallback)));
  }

  if (diabetesScore > 60) {
    diabetesRecommendations.push('Consult an endocrinologist for an HbA1c test');
    diabetesRecommendations.push('Reduce intake of simple carbohydrates and high-glycemic foods');
  } else {
    diabetesRecommendations.push('Keep a balanced low-sugar diet and stay active');
  }

  predictionsList.push({
    predictionType: 'diabetes',
    score: diabetesScore,
    riskLevel: getRiskLevel(diabetesScore),
    confidence: baseConfidence,
    contributingFactors: diabetesFactors.length ? diabetesFactors : ['Normal glycemic range'],
    recommendations: diabetesRecommendations,
    explanations: diabetesExplanation
  });

  // 2. Hypertension Risk Prediction
  let bpScore = 10;
  const bpFactors = [];
  const bpRecommendations = [];

  if (bpSystolic > 120 || bpDiastolic > 80) {
    bpFactors.push(`Elevated blood pressure (${bpSystolic}/${bpDiastolic} mmHg)`);
  }
  if (bmi > 25) {
    bpFactors.push(`High BMI (${bmi.toFixed(1)})`);
  }
  if (stressLevel === 'high' || stressTotalScore > 14) {
    bpFactors.push('High psychological stress levels');
    bpRecommendations.push('Adopt regular stress relaxation techniques like meditation or deep breathing');
  }
  if (alcohol === 'regular') {
    bpFactors.push('Regular alcohol consumption');
    bpRecommendations.push('Limit daily alcohol intake to reduce systemic vascular resistance');
  }
  if (smoking === 'heavy' || smoking === 'light') {
    bpFactors.push('Active history of smoking');
  }
  if (familyHistory.includes('hypertension') || familyHistory.includes('high_blood_pressure')) {
    bpFactors.push('Family history of hypertension');
  }

  try {
    const res = await runPythonInference({
      task: 'disease',
      disease: 'hypertension',
      features: {
        Age: age,
        Salt_Intake: latestAssessment?.answers?.saltIntake || 5,
        Stress_Score: stressTotalScore,
        BP_History: latestAssessment?.answers?.bpHistory === 'yes' ? 1 : 0,
        Sleep_Duration: sleepHours,
        BMI: bmi,
        Medication: latestAssessment?.answers?.medication === 'yes' ? 1 : 0,
        Family_History: familyHistory.includes('hypertension') || familyHistory.includes('bp') ? 1 : 0,
        Exercise_Level: exercise === 'active' ? 2 : exercise === 'occasional' ? 1 : 0,
        Smoking_Status: smoking === 'heavy' ? 2 : smoking === 'light' ? 1 : 0
      }
    });
    bpScore = Math.round(res.probability * 100);
    bpExplanation = res.explanations || bpExplanation;
  } catch (err) {
    console.error("Python hypertension inference error:", err);
    let fallback = 10;
    if (bpSystolic > 120) fallback += (bpSystolic - 120) * 0.8;
    bpScore = Math.max(5, Math.min(98, Math.round(fallback)));
  }

  if (bpScore > 60) {
    bpRecommendations.push('Limit daily sodium intake to under 2,000mg');
    bpRecommendations.push('Check blood pressure at least twice a week');
    bpRecommendations.push('Consult a physician to discuss cardiovascular wellness');
  } else {
    bpRecommendations.push('Maintain a low-sodium, potassium-rich diet');
  }

  predictionsList.push({
    predictionType: 'hypertension',
    score: bpScore,
    riskLevel: getRiskLevel(bpScore),
    confidence: baseConfidence,
    contributingFactors: bpFactors.length ? bpFactors : ['Stable normal blood pressure'],
    recommendations: bpRecommendations,
    explanations: bpExplanation
  });

  // 3. Heart Disease Risk Prediction
  let heartRisk = 10;
  const heartFactors = [];
  const heartRecommendations = [];

  if (cholesterol > 200) {
    heartFactors.push(`High total cholesterol (${cholesterol} mg/dL)`);
    heartRecommendations.push('Reduce saturated fat intake and request a lipid profile');
  }
  if (bpSystolic > 130 || bpDiastolic > 85) {
    heartFactors.push('Hypertension markers');
  }
  if (smoking === 'heavy') {
    heartFactors.push('Heavy smoking habit');
    heartRecommendations.push('Consider smoking cessation programs or nicotine replacement therapies');
  }
  if (exercise === 'none') {
    heartFactors.push('Sedentary lifestyle');
  }
  if (familyHistory.includes('heart_disease')) {
    heartFactors.push('Genetic predisposition / family heart disease');
  }

  try {
    const res = await runPythonInference({
      task: 'disease',
      disease: 'heart',
      features: {
        age: age,
        sex: gender === 'male' ? 1 : 0,
        cp: latestAssessment?.answers?.chestPain || 0,
        trestbps: bpSystolic,
        chol: cholesterol,
        fbs: bloodSugar > 120 ? 1 : 0,
        restecg: 0,
        thalach: 150,
        exang: 0,
        oldpeak: 0.0,
        slope: 1,
        ca: 0,
        thal: 2
      }
    });
    heartRisk = Math.round(res.probability * 100);
    heartExplanation = res.explanations || heartExplanation;
  } catch (err) {
    console.error("Python heart inference error:", err);
    let fallback = 10;
    if (cholesterol > 200) fallback += (cholesterol - 200) * 0.4;
    heartRisk = Math.max(5, Math.min(98, Math.round(fallback)));
  }

  if (heartRisk > 60) {
    heartRecommendations.push('Schedule an ECG or Treadmill Test (TMT) under medical supervision');
    heartRecommendations.push('Emphasize dietary soluble fiber and omega-3 fatty acids');
  } else {
    heartRecommendations.push('Regular cardiovascular exercise (e.g. brisk walking, cycling) 30 min daily');
  }

  predictionsList.push({
    predictionType: 'heart_disease',
    score: heartRisk,
    riskLevel: getRiskLevel(heartRisk),
    confidence: baseConfidence,
    contributingFactors: heartFactors.length ? heartFactors : ['Good cardiovascular fitness'],
    recommendations: heartRecommendations,
    explanations: heartExplanation
  });

  // 4. Kidney Disease Risk Prediction
  let kidneyScore = 10;
  const kidneyFactors = [];
  const kidneyRecommendations = [];

  if (egfr < 90) {
    kidneyFactors.push(`Reduced eGFR levels (${egfr.toFixed(1)} mL/min/1.73m²)`);
  }
  if (bloodSugar > 125 || latestAssessment?.answers?.diabetes) {
    kidneyFactors.push('Diabetes-induced renal strain');
    kidneyRecommendations.push('Ensure optimal glycemic index to protect nephrons');
  }
  if (bpSystolic > 140) {
    kidneyFactors.push('High blood pressure causing vascular strain');
  }

  try {
    const res = await runPythonInference({
      task: 'disease',
      disease: 'kidney',
      features: {
        age: age,
        bp: bpDiastolic,
        sg: 1.02,
        al: 0,
        su: 0,
        rbc: 1,
        pc: 1,
        pcc: 0,
        ba: 0,
        bgr: bloodSugar,
        bu: 40,
        sc: 1.0,
        sod: 138,
        pot: 4.5,
        hemo: 14.5,
        pcv: 40,
        wc: 8000,
        rc: 4.8,
        htn: bpSystolic > 140 ? 1 : 0,
        dm: bloodSugar > 126 ? 1 : 0,
        cad: 0,
        appet: 1,
        pe: 0,
        ane: 0
      }
    });
    kidneyScore = Math.round(res.probability * 100);
    kidneyExplanation = res.explanations || kidneyExplanation;
  } catch (err) {
    console.error("Python kidney inference error:", err);
    let fallback = 10;
    if (egfr < 90) fallback += (90 - egfr) * 1.6;
    kidneyScore = Math.max(5, Math.min(98, Math.round(fallback)));
  }

  if (kidneyScore > 50) {
    kidneyRecommendations.push('Conduct routine urine albumin-to-creatinine ratio (UACR) tests');
    kidneyRecommendations.push('Avoid over-the-counter NSAIDs (painkillers) which can strain kidneys');
  } else {
    kidneyRecommendations.push('Ensure adequate hydration and regular checkups');
  }

  predictionsList.push({
    predictionType: 'kidney_disease',
    score: kidneyScore,
    riskLevel: getRiskLevel(kidneyScore),
    confidence: baseConfidence,
    contributingFactors: kidneyFactors.length ? kidneyFactors : ['Healthy glomerular filtration rate'],
    recommendations: kidneyRecommendations,
    explanations: kidneyExplanation
  });

  // 5. Liver Disease Risk Prediction
  let liverScore = 10;
  const liverFactors = [];
  const liverRecommendations = [];

  if (fib4Score > 1.3) {
    liverFactors.push(`Elevated FIB-4 score (${fib4Score.toFixed(2)})`);
  }
  if (alcohol === 'regular') {
    liverFactors.push('Regular alcohol intake');
    liverRecommendations.push('Limit or completely avoid alcohol intake to prevent fatty liver');
  }
  if (bmi > 30) {
    liverFactors.push('Obesity/Non-alcoholic fatty liver risk');
    liverRecommendations.push('Work on body fat percentage reduction to prevent hepatic steatosis');
  }

  try {
    const res = await runPythonInference({
      task: 'disease',
      disease: 'liver',
      features: {
        Age: age,
        Gender: gender === 'male' ? 1 : 0,
        Total_Bilirubin: 0.8,
        Direct_Bilirubin: 0.2,
        Alkaline_Phosphotase: 80,
        Alamine_Aminotransferase: 25,
        Aspartate_Aminotransferase: 30,
        Total_Protiens: 7.0,
        Albumin: 4.0,
        Albumin_and_Globulin_Ratio: 1.2
      }
    });
    liverScore = Math.round(res.probability * 100);
    liverExplanation = res.explanations || liverExplanation;
  } catch (err) {
    console.error("Python liver inference error:", err);
    let fallback = 10;
    if (fib4Score > 1.3) fallback += (fib4Score - 1.3) * 16;
    liverScore = Math.max(5, Math.min(98, Math.round(fallback)));
  }

  if (liverScore > 50) {
    liverRecommendations.push('Consider a liver function panel (AST/ALT) and abdominal ultrasound');
    liverRecommendations.push('Reduce processed sugars and high-fructose corn syrup');
  } else {
    liverRecommendations.push('Incorporate antioxidant-rich foods and leafy greens');
  }

  predictionsList.push({
    predictionType: 'liver_disease',
    score: liverScore,
    riskLevel: getRiskLevel(liverScore),
    confidence: baseConfidence,
    contributingFactors: liverFactors.length ? liverFactors : ['Healthy liver profile markers'],
    recommendations: liverRecommendations,
    explanations: liverExplanation
  });

  // 6. Obesity Risk Prediction
  let obesityScore = 10;
  const obesityFactors = [];
  const obesityRecommendations = [];

  if (bmi > 25) {
    obesityFactors.push(`Elevated BMI (${bmi.toFixed(1)})`);
  }
  if (exercise === 'none') {
    obesityFactors.push('Sedentary behavior / no regular workouts');
  }
  if (sleepHours < 6) {
    obesityFactors.push('Short sleep duration (< 6 hours)');
    obesityRecommendations.push('Ensure 7-9 hours of sleep to stabilize leptin and ghrelin levels');
  }

  try {
    const res = await runPythonInference({
      task: 'disease',
      disease: 'obesity',
      features: {
        Age: age,
        Gender: gender === 'male' ? 1 : 0,
        Height: (latestAssessment?.answers?.height || 170) / 100.0,
        Weight: latestAssessment?.answers?.weight || 70,
        CALC: 1,
        FAVC: 1,
        FCVC: 2,
        NCP: 3,
        SCC: 0,
        SMOKE: smoking === 'never' ? 0 : 1,
        CH2O: 2,
        family_history_with_overweight: familyHistory.includes('obesity') ? 1 : 0,
        FAF: exercise === 'active' ? 2 : exercise === 'occasional' ? 1 : 0,
        TUE: 1,
        CAEC: 1,
        MTRANS: 1
      }
    });
    obesityScore = Math.round(res.probability * 100);
    obesityExplanation = res.explanations || obesityExplanation;
  } catch (err) {
    console.error("Python obesity inference error:", err);
    let fallback = 10;
    if (bmi > 25) fallback += (bmi - 25) * 6.5;
    obesityScore = Math.max(5, Math.min(98, Math.round(fallback)));
  }

  if (obesityScore > 50) {
    obesityRecommendations.push('Begin structured physical training combining cardio and weight training');
    obesityRecommendations.push('Track daily caloric intake and shift towards whole-food nutrition');
  } else {
    obesityRecommendations.push('Continue maintaining active lifestyle habits');
  }

  predictionsList.push({
    predictionType: 'obesity',
    score: obesityScore,
    riskLevel: getRiskLevel(obesityScore),
    confidence: baseConfidence,
    contributingFactors: obesityFactors.length ? obesityFactors : ['Optimal body composition parameters'],
    recommendations: obesityRecommendations,
    explanations: obesityExplanation
  });

  // 7. PCOS Risk Prediction
  let pcosScore = 5;
  const pcosFactors = [];
  const pcosRecommendations = [];

  if (gender === 'female' || gender === 'other') {
    if (bmi > 25) {
      pcosFactors.push(`High BMI / insulin resistance marker (BMI: ${bmi.toFixed(1)})`);
    }
    if (age >= 15 && age <= 40) {
      pcosFactors.push('Age group inside childbearing window');
    }
    if (stressLevel === 'high') {
      pcosFactors.push('Adrenal stress influencing hormones');
    }

    try {
      const res = await runPythonInference({
        task: 'disease',
        disease: 'pcos',
        features: {
          'Age (yrs)': age,
          'Weight (Kg)': latestAssessment?.answers?.weight || 60,
          'Height(Cm)': latestAssessment?.answers?.height || 160,
          'BMI': bmi,
          'Blood Group': 3,
          'Pulse rate(bpm)': 72,
          'RR (breaths/min)': 18,
          'Hb(g/dl)': 12.5,
          'Cycle(R/I)': 2,
          'Cycle length(days)': 28,
          'Marraige Status (Yrs)': 2,
          'Pregnant(Y/N)': 0,
          'No. of abortions': 0,
          'I   beta-HCG(mIU/mL)': 1.5,
          'II    beta-HCG(mIU/mL)': 1.5,
          'FSH(mIU/mL)': 5.0,
          'LH(mIU/mL)': 4.0,
          'FSH/LH': 1.25,
          'Hip(inch)': 36,
          'Waist(inch)': 30,
          'Waist:Hip Ratio': 0.83,
          'TSH (mIU/L)': 2.0,
          'AMH(ng/mL)': 2.5,
          'PRL(ng/mL)': 15.0,
          'Vit D3 (ng/mL)': 30,
          'PRG(ng/mL)': 0.5,
          'RBS(mg/dl)': bloodSugar,
          'Weight gain(Y/N)': bmi > 25 ? 1 : 0,
          'hair growth(Y/N)': 0,
          'Skin darkening (Y/N)': 0,
          'Hair loss(Y/N)': 0,
          'Pimples(Y/N)': 0,
          'Fast food (Y/N)': 0,
          'Reg.Exercise(Y/N)': exercise === 'active' ? 1 : 0,
          'BP _Systolic (mmHg)': bpSystolic,
          'BP _Diastolic (mmHg)': bpDiastolic,
          'Follicle No. (L)': 4,
          'Follicle No. (R)': 4,
          'Avg. F size (L) (mm)': 12,
          'Avg. F size (R) (mm)': 12,
          'Endometrium (mm)': 8
        }
      });
      pcosScore = Math.round(res.probability * 100);
      pcosExplanation = res.explanations || pcosExplanation;
    } catch (err) {
      console.error("Python PCOS inference error:", err);
      let fallback = 10;
      if (bmi > 25) fallback += (bmi - 25) * 2.0;
      pcosScore = Math.max(5, Math.min(95, Math.round(fallback)));
    }

    if (pcosScore > 45) {
      pcosRecommendations.push('Discuss symptoms with a gynecologist or endocrinologist');
      pcosRecommendations.push('Adopt a low-glycemic index diet to manage insulin sensitivity');
    } else {
      pcosRecommendations.push('Maintain balanced diet and endocrine support');
    }
  } else {
    pcosScore = 0; // Male
  }

  predictionsList.push({
    predictionType: 'pcos',
    score: pcosScore,
    riskLevel: getRiskLevel(pcosScore),
    confidence: gender === 'male' ? 98 : baseConfidence,
    contributingFactors: pcosFactors.length ? pcosFactors : gender === 'male' ? ['Not applicable for male physiology'] : ['Balanced endocrine markers'],
    recommendations: pcosRecommendations,
    explanations: pcosExplanation
  });

  // 8. Sleep Disorder Risk Prediction
  let sleepDisorderScore = 10;
  const sleepFactors = [];
  const sleepRecommendations = [];

  if (sleepHours < 6) {
    sleepFactors.push(`Chronically short sleep duration (${sleepHours} hours)`);
  } else if (sleepHours > 9.5) {
    sleepFactors.push(`Excessive hypersomnia (${sleepHours} hours)`);
  }
  if (sleepScore < 70) {
    sleepFactors.push(`Low sleep efficiency score (${sleepScore}/100)`);
  }
  if (stressLevel === 'high') {
    sleepFactors.push('High stress / hyperarousal index');
  }

  try {
    const res = await runPythonInference({
      task: 'disease',
      disease: 'sleep',
      features: {
        Gender: gender === 'male' ? 1 : 0,
        Age: age,
        Occupation: 1,
        'Sleep Duration': sleepHours,
        'Quality of Sleep': sleepScore / 10.0,
        'Physical Activity Level': exercise === 'active' ? 80 : exercise === 'occasional' ? 40 : 10,
        'Stress Level': stressLevel === 'high' ? 8 : stressLevel === 'moderate' ? 5 : 3,
        'BMI Category': bmi > 30 ? 2 : bmi > 25 ? 1 : 0,
        'Blood Pressure': bpSystolic,
        'Heart Rate': 72,
        'Daily Steps': exercise === 'active' ? 10000 : exercise === 'occasional' ? 5000 : 1000
      }
    });
    sleepDisorderScore = Math.round(res.probability * 100);
    sleepExplanation = res.explanations || sleepExplanation;
  } catch (err) {
    console.error("Python sleep inference error:", err);
    let fallback = 10;
    if (sleepHours < 6) fallback += (6 - sleepHours) * 20;
    sleepDisorderScore = Math.max(5, Math.min(98, Math.round(fallback)));
  }

  if (sleepDisorderScore > 50) {
    sleepRecommendations.push('Avoid blue light emitting screens 2 hours before bed');
    sleepRecommendations.push('Set a consistent bedtime and waking routine');
    sleepRecommendations.push('Limit caffeine consumption afternoon');
  } else {
    sleepRecommendations.push('Maintain good circadian hygiene');
  }

  predictionsList.push({
    predictionType: 'sleep_disorder',
    score: sleepDisorderScore,
    riskLevel: getRiskLevel(sleepDisorderScore),
    confidence: baseConfidence,
    contributingFactors: sleepFactors.length ? sleepFactors : ['Optimal circadian rest cycles'],
    recommendations: sleepRecommendations,
    explanations: sleepExplanation
  });

  // 9. Mental Stress Risk Prediction
  let stressScore = 10;
  const stressFactors = [];
  const stressRecommendations = [];

  if (stressLevel === 'high') {
    stressFactors.push('Self-reported high perceived stress levels');
  } else if (stressLevel === 'moderate') {
    stressFactors.push('Self-reported moderate stress levels');
  }

  try {
    const res = await runPythonInference({
      task: 'disease',
      disease: 'mental_health',
      features: {
        Gender: gender === 'male' ? 1 : 0,
        Country: 1,
        Occupation: 1,
        self_employed: 0,
        family_history: familyHistory.includes('depression') ? 1 : 0,
        Days_Indoors: 1,
        Growing_Stress: stressLevel === 'high' ? 2 : stressLevel === 'moderate' ? 1 : 0,
        Changes_Habits: 1,
        Mental_Health_History: 0,
        Mood_Swings: 1,
        Coping_Struggles: 1,
        Work_Interest: 1,
        Social_Weakness: 1,
        mental_health_interview: 0,
        care_options: 1
      }
    });
    stressScore = Math.round(res.probability * 100);
    stressExplanation = res.explanations || stressExplanation;
  } catch (err) {
    console.error("Python mental health inference error:", err);
    let fallback = 10;
    if (stressLevel === 'high') fallback += 50;
    stressScore = Math.max(5, Math.min(98, Math.round(fallback)));
  }

  if (stressScore > 50) {
    stressRecommendations.push('Incorporate mindfulness, meditation, or journaling');
    stressRecommendations.push('Discuss stress levels with a wellness counselor or therapist');
  } else {
    stressRecommendations.push('Engage in positive social, hobby, or physical activities');
  }

  predictionsList.push({
    predictionType: 'mental_stress_risk',
    score: stressScore,
    riskLevel: getRiskLevel(stressScore),
    confidence: baseConfidence,
    contributingFactors: stressFactors.length ? stressFactors : ['Low perceived stress levels'],
    recommendations: stressRecommendations,
    explanations: stressExplanation
  });

  // Save predictions to database
  await HealthPrediction.deleteMany({ userId });
  const createdPredictions = await HealthPrediction.insertMany(
    predictionsList.map(p => ({ ...p, userId }))
  );

  return createdPredictions;
};

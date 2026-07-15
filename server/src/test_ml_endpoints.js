import { runPythonInference } from './ml/inferenceBridge.js';

async function runMLInferenceTests() {
  console.log("==============================================================");
  printSuccess("STARTING BACKEND MODEL INFERENCE END-TO-END TESTS");
  console.log("==============================================================");

  let passedAll = true;

  // 1. Disease Prediction Test (diabetes)
  try {
    console.log("\nTesting [POST /api/ml/predict-disease] (diabetes)...");
    const result = await runPythonInference({
      task: "disease",
      disease: "diabetes",
      features: {
        "Pregnancies": 6,
        "Glucose": 148,
        "BloodPressure": 72,
        "SkinThickness": 35,
        "Insulin": 0,
        "BMI": 33.6,
        "DiabetesPedigreeFunction": 0.627,
        "Age": 50
      }
    });
    console.log("  Output:", JSON.stringify(result));
    if (result.probability !== undefined && result.risk_level !== undefined) {
      printSuccess("  ✅ PASS: Disease prediction (diabetes) successful.");
    } else {
      throw new Error("Missing required output fields.");
    }
  } catch (err) {
    printError(`  ❌ FAIL: Disease prediction (diabetes) failed: ${err.message}`);
    passedAll = false;
  }

  // 2. Biological Age Test
  try {
    console.log("\nTesting [POST /api/ml/biological-age]...");
    const result = await runPythonInference({
      task: "biological_age",
      features: {
        "RIDAGEYR": 50,
        "LBXSAL": 4.2,
        "LBXSCR": 0.8,
        "LBXGLU": 95,
        "LBXLYPCT": 30,
        "LBXMCVSI": 90,
        "LBXRDW": 13.0,
        "LBXSAPSI": 70,
        "LBXWBCSI": 6.0
      }
    });
    console.log("  Output:", JSON.stringify(result));
    if (result.biological_age !== undefined) {
      printSuccess(`  ✅ PASS: Biological age prediction successful. Predicted age: ${result.biological_age}`);
    } else {
      throw new Error("Missing biological_age output field.");
    }
  } catch (err) {
    printError(`  ❌ FAIL: Biological age prediction failed: ${err.message}`);
    passedAll = false;
  }

  // 3. Health Score Test
  try {
    console.log("\nTesting [POST /api/ml/health-score]...");
    const result = await runPythonInference({
      task: "health_score",
      features: {
        "Systolic_BP": 120,
        "Diastolic_BP": 80,
        "BMI": 22,
        "Sleep_Score": 8,
        "LBXGLU": 90,
        "LBDHDD": 50,
        "LBXTC": 180,
        "RIDAGEYR": 30,
        "BPXPLS": 72
      }
    });
    console.log("  Output:", JSON.stringify(result));
    if (result.health_stability_score !== undefined) {
      printSuccess(`  ✅ PASS: Health stability score prediction successful. Predicted score: ${result.health_stability_score}`);
    } else {
      throw new Error("Missing health_stability_score output field.");
    }
  } catch (err) {
    printError(`  ❌ FAIL: Health stability score prediction failed: ${err.message}`);
    passedAll = false;
  }

  // 4. Recommendation Test
  try {
    console.log("\nTesting [POST /api/ml/recommend]...");
    const result = await runPythonInference({
      task: "recommend",
      latitude: 13.08,
      longitude: 80.27,
      specialty: "Cardiology",
      user_risks: {
        "heart": 0.90
      }
    });
    console.log("  Output count:", result.length);
    if (result.length > 0) {
      printSuccess(`  ✅ PASS: Provider recommendation successful. Top recommended: ${result[0].name} (${result[0].matching_score} match)`);
    } else {
      throw new Error("Empty recommendation list returned.");
    }
  } catch (err) {
    printError(`  ❌ FAIL: Provider recommendation failed: ${err.message}`);
    passedAll = false;
  }

  // 5. Timeseries Forecasting Test
  try {
    console.log("\nTesting [POST /api/ml/forecast]...");
    const result = await runPythonInference({
      task: "forecast",
      features: {
        "systolic": [120, 122, 121],
        "diastolic": [80, 81, 80],
        "glucose": [95, 97, 96],
        "weight": [70.0, 70.2, 70.1]
      }
    });
    console.log("  Output:", JSON.stringify(result));
    if (result.systolic !== undefined && result.glucose !== undefined) {
      printSuccess("  ✅ PASS: Timeseries forecasting successful.");
    } else {
      throw new Error("Missing forecast outputs.");
    }
  } catch (err) {
    printError(`  ❌ FAIL: Timeseries forecasting failed: ${err.message}`);
    passedAll = false;
  }

  console.log("\n==============================================================");
  if (passedAll) {
    printSuccess("🎉 SUCCESS: ALL BACKEND MODEL INFERENCE BRIDGE CHECKS PASSED!");
  } else {
    printError("❌ FAIL: ONE OR MORE BACKEND MODEL INFERENCE BRIDGE CHECKS FAILED.");
    process.exit(1);
  }
  console.log("==============================================================");
}

function printSuccess(msg) {
  console.log(`\x1b[32m${msg}\x1b[0m`);
}

function printError(msg) {
  console.error(`\x1b[31m${msg}\x1b[0m`);
}

runMLInferenceTests();

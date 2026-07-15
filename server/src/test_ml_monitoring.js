import path from 'path';
import fs from 'fs';
import { runPythonInference } from './ml/inferenceBridge.js';
import { telemetry } from './ml/telemetry.js';

async function testMonitoring() {
  console.log("==============================================================");
  console.log("RUNNING PRODUCTION TELEMETRY AND MONITORING CHECKS");
  console.log("==============================================================");
  
  // 1. Run a sample prediction to populate telemetry metrics
  console.log("Firing test model prediction (diabetes)...");
  try {
    const res = await runPythonInference({
      task: 'disease',
      disease: 'diabetes',
      features: {
        Pregnancies: 2,
        Glucose: 120,
        BloodPressure: 80,
        SkinThickness: 20,
        Insulin: 80,
        BMI: 24.5,
        DiabetesPedigreeFunction: 0.45,
        Age: 35
      }
    });
    console.log("  ✅ Prediction executed successfully.");
  } catch (err) {
    console.error("  ❌ Test prediction failed:", err.message);
  }

  // 2. Fetch metrics
  const metrics = telemetry.getMetrics();
  console.log("\nTelemetry Stats:");
  console.log(`  - Uptime: ${metrics.uptimeSeconds} seconds`);
  console.log(`  - Average Latency: ${metrics.averageLatencyMs} ms`);
  console.log(`  - Memory Usage (RSS): ${metrics.memoryUsage.rss} MB`);
  console.log(`  - CPU load (1m): ${metrics.cpu.load1m}`);
  console.log(`  - Total Predictions (Disease): ${metrics.predictionCounts.disease}`);
  
  // 3. Verify telemetry log exists and has items
  const logPath = path.resolve(process.cwd(), 'server', 'logs', 'ml-telemetry.log');
  if (fs.existsSync(logPath)) {
    const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
    console.log(`  - Log File: ✅ Exists (${lines.length} logs recorded)`);
    console.log(`  - Last Log Entry: ${lines[lines.length - 1]}`);
  } else {
    console.log(`  - Log File: ❌ Missing!`);
  }

  // 4. Validate model metadata specs
  const modelsDir = path.resolve(process.cwd(), 'ml', 'models');
  let validMetadata = true;
  if (fs.existsSync(modelsDir)) {
    const folders = fs.readdirSync(modelsDir);
    for (const folder of folders) {
      const metaPath = path.join(modelsDir, folder, 'metadata.json');
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        const required = ["version", "dataset_version", "training_timestamp", "training_parameters"];
        const missing = required.filter(f => !(f in meta));
        if (missing.length > 0) {
          console.log(`  ❌ Model [${folder}] missing fields: ${missing}`);
          validMetadata = false;
        }
      }
    }
  }
  if (validMetadata) {
    console.log("  - Model Metadata Standard: ✅ All models conform to monitoring schema.");
  }

  console.log("\n==============================================================");
  if (validMetadata && fs.existsSync(logPath) && metrics.predictionCounts.disease > 0) {
    console.log("🎉 SUCCESS: ALL PRODUCTION MONITORING CHECKS PASSED!");
  } else {
    console.log("❌ FAILURE: One or more monitoring checks failed.");
  }
  console.log("==============================================================");
}

testMonitoring();

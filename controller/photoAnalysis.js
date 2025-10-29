// ─────────────────────────────────────────────────────────────────────────────
//  photoAnalysis.js (Full, Fixed Version – Height & Weight Approx Included)
// ─────────────────────────────────────────────────────────────────────────────

import * as faceapi from "face-api.js";
import canvas, { createCanvas, loadImage } from "canvas";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";

// ── ANTHROPOMETRIC CONSTANTS ───────────────────────────────────────────────
const AVG_SHOULDER_WIDTH_CM = 40;
const AVG_FACE_WIDTH_CM = 14;
const SHOULDER_FACE_MULT = 2.2;
const NECK_FACE_MULT = 3.0;

// ── HELPERS ────────────────────────────────────────────────────────────────
const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

function computePxPerCm({ pxPerCm, referenceWidthCm, referenceWidthPx }) {
  if (pxPerCm && pxPerCm > 0) return { pxPerCm, source: "provided_pxPerCm" };
  if (
    referenceWidthCm &&
    referenceWidthPx &&
    referenceWidthCm > 0 &&
    referenceWidthPx > 0
  ) {
    return { pxPerCm: referenceWidthPx / referenceWidthCm, source: "derived_from_reference" };
  }
  return { pxPerCm: null, source: "unknown" };
}

function approximatePxPerCmFromFace(faceWidthPx) {
  if (!faceWidthPx || faceWidthPx <= 0) return null;
  return faceWidthPx / AVG_FACE_WIDTH_CM;
}

function cmFromPx(px, pxPerCm) {
  if (!px || !pxPerCm) return null;
  return px / pxPerCm;
}

function bmi(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return +(weightKg / (m * m)).toFixed(1);
}

function classifyBMI(b) {
  if (b == null) return null;
  if (b < 18.5) return "underweight";
  if (b < 25) return "normal";
  if (b < 30) return "overweight";
  return "obese";
}

// ── POSE ANALYSIS (MediaPipe) ───────────────────────────────────────────────
async function runPoseAnalysis(imagePath) {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  const landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
    },
    runningMode: "IMAGE",
  });

  const img = await loadImage(imagePath);
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, img.width, img.height);

  const detections = await landmarker.detect(c);
  if (!detections.landmarks?.length) return null;

  const lms = detections.landmarks[0];
  const headTop = lms[0];
  const ankleL = lms[29];
  const ankleR = lms[30];
  const shoulderL = lms[11];
  const shoulderR = lms[12];

  if (!headTop || !ankleL || !ankleR || !shoulderL || !shoulderR) return null;

  const ankleMid = { x: (ankleL.x + ankleR.x) / 2, y: (ankleL.y + ankleR.y) / 2 };
  const bodyPxHeight = dist(headTop, ankleMid) * img.height;
  const shoulderPxWidth = dist(shoulderL, shoulderR) * img.height;

  const pxPerCm = shoulderPxWidth / AVG_SHOULDER_WIDTH_CM;
  const heightCm = +(bodyPxHeight / pxPerCm).toFixed(1);
  const shoulderWidthCm = +(shoulderPxWidth / pxPerCm).toFixed(1);

  const frameRatio = shoulderWidthCm / heightCm;
  let bmiGuess = 22;
  if (frameRatio > 0.28) bmiGuess = 25;
  if (frameRatio < 0.23) bmiGuess = 20;
  const weightKg = +(bmiGuess * Math.pow(heightCm / 100, 2)).toFixed(1);

  return { heightCm, weightKg, shoulderWidthCm, pxPerCm, source: "pose_landmarks" };
}

// ── FACE LANDMARK HELPERS ───────────────────────────────────────────────────
function faceWidthPxFromLandmarks(landmarks) {
  const left = landmarks.positions[1];
  const right = landmarks.positions[15];
  if (!left || !right) return null;
  return dist(left, right);
}

// ── RECOMMENDATIONS ────────────────────────────────────────────────────────
function recommendPillow({ sleepPosition, shoulderWidthCm, neckCircumferenceCm }) {
  let loft = "medium (5–8 cm)";
  let firmness = "medium";
  let notes = [];
  const broad = shoulderWidthCm && shoulderWidthCm >= 46;
  const slim = shoulderWidthCm && shoulderWidthCm <= 40;

  switch ((sleepPosition || "").toLowerCase()) {
    case "side":
      loft = broad ? "high (8–12 cm)" : "medium-high (6–10 cm)";
      firmness = "medium-firm to firm";
      notes.push("Aim to fill the gap from ear to outer shoulder to keep the neck neutral.");
      break;
    case "back":
      loft = "medium (5–8 cm)";
      firmness = "medium";
      notes.push("Keep head level without pushing chin forward.");
      break;
    case "stomach":
      loft = "low (3–6 cm) or soft down-alternative";
      firmness = "soft";
      notes.push("Consider a thin pillow or hug a pillow under the chest to reduce neck rotation.");
      break;
    default:
      loft = "medium";
      firmness = "medium";
      notes.push("If you rotate positions, choose adjustable loft (shredded foam or fill-zipper).");
  }

  if (neckCircumferenceCm && neckCircumferenceCm >= 40) {
    notes.push("A contoured cervical pillow can help keep the airway/neck aligned.");
  }
  return { loft, firmness, type: "adjustable shredded foam or latex (generally versatile)", notes };
}

function recommendMattress({ sleepPosition, bmiClass }) {
  let firmnessRange = "5–7 (medium to medium-firm)";
  let types = ["balanced hybrid", "latex hybrid"];
  const notes = [];

  switch ((sleepPosition || "").toLowerCase()) {
    case "side":
      firmnessRange = "4–6 (medium-soft to medium)";
      types = ["pressure-relieving foam", "plush hybrid"];
      notes.push("Look for good shoulder/hip pressure relief and zoned support.");
      break;
    case "back":
      firmnessRange = "5–7 (medium to medium-firm)";
      types = ["balanced hybrid", "latex hybrid"];
      notes.push("Lumbar support to avoid mid-back sagging.");
      break;
    case "stomach":
      firmnessRange = "6–8 (medium-firm to firm)";
      types = ["firm hybrid", "latex"];
      notes.push("Prevent hip sink to keep spine neutral.");
      break;
    default:
      notes.push("For combo sleepers, prioritize responsiveness and edge support.");
  }

  if (bmiClass === "overweight" || bmiClass === "obese") {
    notes.push("Heavier bodies often benefit from thicker comfort layers and stronger coil support.");
    if (firmnessRange.startsWith("4–6")) firmnessRange = "5–7 (medium to medium-firm)";
  }
  return { firmnessRange, types, notes };
}

// ── MAIN HANDLER ───────────────────────────────────────────────────────────
export const photoAnalysis = catchAsync(async (req, res) => {
  const { Canvas, Image, ImageData } = canvas;
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

  const {
    pxPerCm: pxPerCmInput,
    referenceWidthCm,
    referenceWidthPx,
    heightCm: heightCmInput,
    weightKg: weightKgInput,
    neckCircumferenceCm: neckCircumferenceInput,
    shoulderWidthCm: shoulderWidthInput,
    sleepPosition = "back",
  } = req.body || {};

  await faceapi.nets.ssdMobilenetv1.loadFromDisk("./models");
  await faceapi.nets.ageGenderNet.loadFromDisk("./models");
  await faceapi.nets.faceLandmark68Net.loadFromDisk("./models");

  const img = await canvas.loadImage(req.file.path);
  const faceDetections = await faceapi
    .detectAllFaces(img)
    .withFaceLandmarks()
    .withAgeAndGender();

  // ── Run pose analysis (height + weight)
  let poseResult = null;
  try {
    poseResult = await runPoseAnalysis(req.file.path);
  } catch (e) {
    console.warn("Pose analysis failed:", e);
  }

  const scaleInfo = computePxPerCm({ pxPerCm: pxPerCmInput, referenceWidthCm, referenceWidthPx });
  let pxPerCm = scaleInfo.pxPerCm || poseResult?.pxPerCm || null;

  if (!pxPerCm && faceDetections.length) {
    const fw = faceWidthPxFromLandmarks(faceDetections[0].landmarks);
    if (fw) pxPerCm = approximatePxPerCmFromFace(fw);
  }

  const results = [];

  for (const det of faceDetections) {
    const { age, gender, genderProbability, landmarks } = det;

    // Height & Weight (fallback logic)
    let heightCm = heightCmInput ?? poseResult?.heightCm ?? null;
    let weightKg = weightKgInput ?? poseResult?.weightKg ?? null;

    // If still missing, infer approximate height range based on face ratio
    if (!heightCm && pxPerCm) {
      const facePx = faceWidthPxFromLandmarks(landmarks);
      if (facePx) heightCm = +(cmFromPx(facePx, pxPerCm) * 8.5).toFixed(1);
    }
    if (!weightKg && heightCm) {
      const estBmi = 22;
      weightKg = +(estBmi * Math.pow(heightCm / 100, 2)).toFixed(1);
    }

    // Shoulder
    let shoulderWidthCm = shoulderWidthInput ?? poseResult?.shoulderWidthCm ?? null;
    if (!shoulderWidthCm && landmarks && pxPerCm) {
      const L = landmarks.positions[2];
      const R = landmarks.positions[14];
      if (L && R) {
        const upperFacePx = dist(L, R);
        shoulderWidthCm = +(cmFromPx(upperFacePx * SHOULDER_FACE_MULT, pxPerCm)?.toFixed(1)) || null;
      }
    }

    // Neck
    let neckCircumferenceCm = neckCircumferenceInput ?? null;
    if (!neckCircumferenceCm && landmarks && pxPerCm) {
      const left = landmarks.positions[3];
      const right = landmarks.positions[13];
      if (left && right) {
        const cheekPx = dist(left, right);
        neckCircumferenceCm = +(cmFromPx(cheekPx, pxPerCm) * NECK_FACE_MULT).toFixed(1);
      }
    }

    // BMI
    const bmiValue = bmi(weightKg, heightCm);
    const bmiClass = classifyBMI(bmiValue);

    const pillow = recommendPillow({ sleepPosition, shoulderWidthCm, neckCircumferenceCm });
    const mattress = recommendMattress({ sleepPosition, bmiClass });

    results.push({
      age: Math.round(age),
      gender,
      genderProbability,
      scaleSource:
        poseResult?.source || scaleInfo.source || (pxPerCm ? "approx_from_face" : "unknown"),
      measurements: {
        heightCm,
        weightKg,
        shoulderWidthCm,
        neckCircumferenceCm,
        notes:
          !referenceWidthCm && !pxPerCmInput && !poseResult
            ? "Measurements are approximate; provide pxPerCm or a reference object for accuracy."
            : undefined,
      },
      derived: { bmi: bmiValue, bmiClass },
      recommendations: { sleepPosition, pillow, mattress },
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "analysis done",
    data: results,
  });
});

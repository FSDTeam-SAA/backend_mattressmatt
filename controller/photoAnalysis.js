// ─────────────────────────────────────────────────────────────────────────────
//  photoAnalysis.js (with Chest Circumference Estimation)
// ─────────────────────────────────────────────────────────────────────────────

import * as faceapi from "face-api.js";
import canvas from "canvas";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";

// ── ANTHROPOMETRIC CONSTANTS ───────────────────────────────────────────────
const AVG_SHOULDER_WIDTH_CM = 40;
const AVG_FACE_WIDTH_CM = 14;
const SHOULDER_FACE_MULT = 2.2;
const NECK_FACE_MULT = 3.0;
const CHEST_SHOULDER_MULT_MALE = 2.7;
const CHEST_SHOULDER_MULT_FEMALE = 2.5;

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

// ── POSE ANALYSIS — face-api only (no CDN dependency) ──────────────────────
async function runPoseAnalysis(landmarks, imgWidth, imgHeight) {
  try {
    if (!landmarks) return null;

    const shoulderL = landmarks.positions[3];
    const shoulderR = landmarks.positions[13];
    if (!shoulderL || !shoulderR) return null;

    const shoulderPxWidth = dist(shoulderL, shoulderR) * 2.8;
    if (shoulderPxWidth <= 0) return null;

    const pxPerCm = shoulderPxWidth / AVG_SHOULDER_WIDTH_CM;
    const estimatedHeightPx = imgHeight * 0.85;
    const heightCm = +(estimatedHeightPx / pxPerCm).toFixed(1);
    const shoulderWidthCm = +(shoulderPxWidth / pxPerCm).toFixed(1);

    const frameRatio = shoulderWidthCm / heightCm;
    let bmiGuess = 22;
    if (frameRatio > 0.28) bmiGuess = 25;
    if (frameRatio < 0.23) bmiGuess = 20;
    const weightKg = +(bmiGuess * Math.pow(heightCm / 100, 2)).toFixed(1);

    return { heightCm, weightKg, shoulderWidthCm, pxPerCm, source: "face_landmarks_estimate" };
  } catch {
    return null;
  }
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
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No image uploaded." });
  }

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

  if (!faceDetections.length) {
    return res.status(200).json({
      success: false,
      message: "No face detected in the image. Please use a clear front-facing photo.",
      data: [],
    });
  }

  let poseResult = null;
  try {
    poseResult = await runPoseAnalysis(faceDetections[0].landmarks, img.width, img.height);
  } catch (e) {
    // pose analysis is optional, continue without it
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

    let heightCm = heightCmInput ?? poseResult?.heightCm ?? null;
    let weightKg = weightKgInput ?? poseResult?.weightKg ?? null;

    if (!heightCm && pxPerCm) {
      const facePx = faceWidthPxFromLandmarks(landmarks);
      if (facePx) heightCm = +(cmFromPx(facePx, pxPerCm) * 8.5).toFixed(1);
    }
    if (!weightKg && heightCm) {
      const estBmi = 22;
      weightKg = +(estBmi * Math.pow(heightCm / 100, 2)).toFixed(1);
    }

    let shoulderWidthCm = shoulderWidthInput ?? poseResult?.shoulderWidthCm ?? null;
    if (!shoulderWidthCm && landmarks && pxPerCm) {
      const L = landmarks.positions[2];
      const R = landmarks.positions[14];
      if (L && R) {
        const upperFacePx = dist(L, R);
        shoulderWidthCm = +(cmFromPx(upperFacePx * SHOULDER_FACE_MULT, pxPerCm)?.toFixed(1)) || null;
      }
    }

    let neckCircumferenceCm = neckCircumferenceInput ?? null;
    if (!neckCircumferenceCm && landmarks && pxPerCm) {
      const left = landmarks.positions[3];
      const right = landmarks.positions[13];
      if (left && right) {
        const cheekPx = dist(left, right);
        neckCircumferenceCm = +(cmFromPx(cheekPx, pxPerCm) * NECK_FACE_MULT).toFixed(1);
      }
    }

    // 🆕 Chest Circumference Estimation
    let chestCircumferenceCm = null;
    if (shoulderWidthCm) {
      const mult = gender === "male" ? CHEST_SHOULDER_MULT_MALE : CHEST_SHOULDER_MULT_FEMALE;
      chestCircumferenceCm = +(shoulderWidthCm * mult).toFixed(1);
    } else if (landmarks && pxPerCm) {
      // fallback from face width
      const fw = faceWidthPxFromLandmarks(landmarks);
      if (fw) {
        const faceCm = cmFromPx(fw, pxPerCm);
        chestCircumferenceCm = +(faceCm * 7.5).toFixed(1); // fallback ratio
      }
    }

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
        chestCircumferenceCm,
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

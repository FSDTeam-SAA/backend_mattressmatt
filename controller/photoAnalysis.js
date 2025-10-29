import * as faceapi from 'face-api.js';
import canvas from 'canvas';
import fs from 'fs';
import path from 'path';
import catchAsync from '../utils/catchAsync.js';
import sendResponse from '../utils/sendResponse.js';


// export const photoAnalysis = catchAsync(async (req, res) => {

//     // Required for face-api.js
//     const { Canvas, Image, ImageData } = canvas;
//     faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

//     async function analyzeImage(imagePath) {
//         await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');  // face detection
//         await faceapi.nets.ageGenderNet.loadFromDisk('./models');    // age + gender

//         const img = await canvas.loadImage(imagePath);
//         const detections = await faceapi.detectAllFaces(img).withAgeAndGender();

//         return detections.map(det => ({
//             age: det.age,
//             gender: det.gender,
//             probability: det.genderProbability
//         }));
//     }

//     const result = await analyzeImage(req.file.path);
//     console.log(result);

//     sendResponse(res,{
//         statusCode: 200,
//         success: true,
//         message : "analysis done",
//         data: result
//     })


// })


import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { createCanvas, loadImage } from "canvas";

// --- Anthropometric constants (average adult) ---
const AVG_SHOULDER_WIDTH_CM = 40; // cm, biacromial breadth
const AVG_HEIGHT_RATIO = 7.5; // body height ≈ 7.5 × head height

// --- Helper: Euclidean distance ---
function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// --- Estimate height (rough) ---
function estimateHeightCm(landmarks, imageHeight) {
  const headTop = landmarks[0]; // nose/top-of-head proxy
  const ankleLeft = landmarks[29];
  const ankleRight = landmarks[30];
  const shoulderL = landmarks[11];
  const shoulderR = landmarks[12];

  if (!ankleLeft || !ankleRight || !shoulderL || !shoulderR) return null;

  const ankleMid = { 
    x: (ankleLeft.x + ankleRight.x) / 2, 
    y: (ankleLeft.y + ankleRight.y) / 2 
  };

  const bodyPxHeight = dist(headTop, ankleMid) * imageHeight;
  const shoulderPxWidth = dist(shoulderL, shoulderR) * imageHeight;

  // Estimate pxPerCm assuming shoulder width ~40 cm
  const pxPerCm = shoulderPxWidth / AVG_SHOULDER_WIDTH_CM;
  const heightCm = bodyPxHeight / pxPerCm;

  return +heightCm.toFixed(1);
}

// --- Estimate weight from height + body width ratio (very rough BMI model) ---
function estimateWeightKg(heightCm, shoulderWidthCm, gender = "neutral") {
  if (!heightCm || !shoulderWidthCm) return null;

  // Shoulder/height ratio gives rough frame type
  const frameRatio = shoulderWidthCm / heightCm;

  let bmiGuess = 22; // average healthy
  if (frameRatio > 0.28) bmiGuess = 25; // broad build
  if (frameRatio < 0.23) bmiGuess = 20; // slender build

  const heightM = heightCm / 100;
  const weightKg = bmiGuess * heightM * heightM;
  return +weightKg.toFixed(1);
}

export async function analyzeFullBodyImage(imagePath) {
  // Load model
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
//   const landmarker = await PoseLandmarker.createFromOptions(vision, {
//     baseOptions: {
//       modelAssetPath:
//         "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
//     },
//     runningMode: "IMAGE",
//   });

  const image = await loadImage(imagePath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, image.width, image.height);

  const detections = await landmarker.detect(canvas);

  if (!detections.landmarks?.length) {
    return { success: false, message: "No full-body detected." };
  }

  const lms = detections.landmarks[0];
  const heightCm = estimateHeightCm(lms, image.height);
  const shoulderWidthCm =
    dist(lms[11], lms[12]) * image.height / (heightCm ? heightCm / AVG_SHOULDER_WIDTH_CM : 1);
  const weightKg = estimateWeightKg(heightCm, shoulderWidthCm);

  return {
    success: true,
    data: {
      heightCm,
      weightKg,
      shoulderWidthCm: +shoulderWidthCm.toFixed(1),
      estimatedBMI: +((weightKg / ((heightCm / 100) ** 2)).toFixed(1)),
    },
    notes: "Approximation based on pose landmarks — use reference scale for precision.",
  };
}



function computePxPerCm({ pxPerCm, referenceWidthCm, referenceWidthPx }) {
  if (pxPerCm && pxPerCm > 0) return { pxPerCm, source: 'provided_pxPerCm' };
  if (referenceWidthCm && referenceWidthPx && referenceWidthCm > 0 && referenceWidthPx > 0) {
    return { pxPerCm: referenceWidthPx / referenceWidthCm, source: 'derived_from_reference' };
  }
  return { pxPerCm: null, source: 'unknown' };
}

// very rough face-based fallback if no scale is provided
// Uses average adult bizygomatic width (~14 cm). THIS IS APPROXIMATE.
function approximatePxPerCmFromFace(faceWidthPx) {
  const AVG_FACE_WIDTH_CM = 14; // rough population average
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
  if (m <= 0) return null;
  return +(weightKg / (m * m)).toFixed(1);
}

function classifyBMI(b) {
  if (b == null) return null;
  if (b < 18.5) return 'underweight';
  if (b < 25) return 'normal';
  if (b < 30) return 'overweight';
  return 'obese';
}

// pillow recommendation by sleep position + shoulder width
function recommendPillow({ sleepPosition, shoulderWidthCm, neckCircumferenceCm }) {
  // Defaults
  let loft = 'medium';
  let firmness = 'medium';
  let notes = [];

  const broadShoulders = shoulderWidthCm && shoulderWidthCm >= 46; // ~18"
  const slimShoulders = shoulderWidthCm && shoulderWidthCm <= 40;  // ~16"

  switch ((sleepPosition || '').toLowerCase()) {
    case 'side':
      loft = broadShoulders ? 'high (8–12 cm)' : 'medium-high (6–10 cm)';
      firmness = 'medium-firm to firm';
      notes.push('Aim to fill the gap from ear to outer shoulder to keep the neck neutral.');
      break;
    case 'back':
      loft = 'medium (5–8 cm)';
      firmness = 'medium';
      notes.push('Keep head level without pushing chin forward.');
      break;
    case 'stomach':
      loft = 'low (3–6 cm) or soft down-alternative';
      firmness = 'soft';
      notes.push('Consider a very thin pillow or hugging a pillow under the chest to reduce neck rotation.');
      break;
    default:
      loft = 'medium';
      firmness = 'medium';
      notes.push('If you rotate positions, choose adjustable loft (shredded foam or fill-zipper).');
  }

  if (neckCircumferenceCm && neckCircumferenceCm >= 40) {
    notes.push('A contoured cervical pillow can help keep the airway/neck aligned.');
  }

  return { loft, firmness, type: 'adjustable shredded foam or latex (generally versatile)', notes };
}

// mattress recommendation by sleep position + BMI
function recommendMattress({ sleepPosition, bmiClass }) {
  // Firmness scale: 1 (softest) – 10 (firmest)
  let firmnessRange = '5–7 (medium to medium-firm)';
  let types = ['hybrid (pocketed coils + foam/latex)'];
  const notes = [];

  switch ((sleepPosition || '').toLowerCase()) {
    case 'side':
      firmnessRange = '4–6 (medium-soft to medium)';
      types = ['pressure-relieving foam', 'plush hybrid'];
      notes.push('Look for good shoulder/hip pressure relief and zoned support.');
      break;
    case 'back':
      firmnessRange = '5–7 (medium to medium-firm)';
      types = ['balanced hybrid', 'latex hybrid'];
      notes.push('Lumbar support to avoid mid-back sagging.');
      break;
    case 'stomach':
      firmnessRange = '6–8 (medium-firm to firm)';
      types = ['firm hybrid', 'latex'];
      notes.push('Prevent hip sink to keep spine neutral.');
      break;
    default:
      firmnessRange = '5–7';
      types = ['balanced hybrid'];
      notes.push('For combo sleepers, prioritize responsiveness and edge support.');
  }

  if (bmiClass === 'overweight' || bmiClass === 'obese') {
    notes.push('Heavier bodies often benefit from thicker comfort layers and stronger coil support.');
    // nudge slightly firmer for support
    if (firmnessRange === '4–6 (medium-soft to medium)') firmnessRange = '5–7 (medium to medium-firm)';
  }

  return { firmnessRange, types, notes };
}

// ---- main handler ----

export const photoAnalysis = catchAsync(async (req, res) => {
  const { Canvas, Image, ImageData } = canvas;
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

  // Optional user/context inputs
  const {
    // scale helpers (recommended you pass one of these)
    pxPerCm: pxPerCmInput,
    referenceWidthCm,
    referenceWidthPx,
    // user-provided measurements (if known)
    heightCm: heightCmInput,
    weightKg: weightKgInput,
    neckCircumferenceCm: neckCircumferenceInput,
    shoulderWidthCm: shoulderWidthInput,
    // preferences
    sleepPosition = 'back'
  } = req.body || {};



  async function analyzeImage(imagePath) {
    // Load models
    await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');         // face detection
    await faceapi.nets.ageGenderNet.loadFromDisk('./models');           // age + gender
    await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');      // landmarks (for rough face width px)

    const img = await canvas.loadImage(imagePath);

    //   const analysis = await analyzeFullBodyImage(img)
//   console.log(analysis)

    // Get detections with landmarks
    const detections = await faceapi
      .detectAllFaces(img)
      .withFaceLandmarks()
      .withAgeAndGender();

    // compute approximate face width in pixels from 68-landmark points (cheek-to-cheek)
    function faceWidthPxFromLandmarks(lms) {
      // Landmarks 1 and 15 are near left/right jawline; use them as a proxy
      const left = lms.positions[1];
      const right = lms.positions[15];
      if (!left || !right) return null;
      const dx = right.x - left.x;
      const dy = right.y - left.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    // Decide scale
    const scaleInfo = computePxPerCm({
      pxPerCm: pxPerCmInput,
      referenceWidthCm,
      referenceWidthPx
    });

    const results = [];

    for (const det of detections) {
      const { age, gender, genderProbability, landmarks } = det;
      let pxPerCm = scaleInfo.pxPerCm;

      // fallback: try approximate scale using face width
      if (!pxPerCm) {
        const fw = landmarks ? faceWidthPxFromLandmarks(landmarks) : null;
        pxPerCm = approximatePxPerCmFromFace(fw);
      }

      // Try deriving neck/shoulder pixel distances from landmarks (VERY rough).
      // NOTE: For production grade body measurements, use a full-body pose model (e.g., MediaPipe BlazePose or OpenPose).
      let neckCircumferenceCm = neckCircumferenceInput || null;
      let shoulderWidthCm = shoulderWidthInput || null;

      // If no provided values and we have scale, offer rough estimates:
      // Use inter-shoulder proxy from facial landmarks: distance between landmark 2 and 14 ~ upper face width proxy -> then scale up factor
      if (!shoulderWidthCm && landmarks && pxPerCm) {
        const L = landmarks.positions[2];
        const R = landmarks.positions[14];
        if (L && R) {
          const dx = R.x - L.x;
          const dy = R.y - L.y;
          const upperFaceWidthPx = Math.sqrt(dx * dx + dy * dy);
          // heuristic multiplier to estimate biacromial (shoulder) width from upper-face width
          const SHOULDER_MULT = 2.2; // crude average multiplier
          shoulderWidthCm = +(cmFromPx(upperFaceWidthPx * SHOULDER_MULT, pxPerCm)?.toFixed(1) || 0) || null;
        }
      }

      // Neck circumference is not derivable from frontal face alone; if scale exists, give a narrow confidence rough guess from face width.
      if (!neckCircumferenceCm && landmarks && pxPerCm) {
        const leftCheek = landmarks.positions[3];
        const rightCheek = landmarks.positions[13];
        if (leftCheek && rightCheek) {
          const dx = rightCheek.x - leftCheek.x;
          const dy = rightCheek.y - leftCheek.y;
          const cheekToCheekPx = Math.sqrt(dx * dx + dy * dy);
          // crude mapping: neck circumference ≈ 3.0 * cheek-to-cheek cm (very rough)
          const NECK_MULT = 3.0;
          neckCircumferenceCm = +(cmFromPx(cheekToCheekPx, pxPerCm) * NECK_MULT).toFixed(1);
        }
      }

      // Height/weight: prefer user-provided; otherwise leave null (do NOT guess from a face)
      const heightCm = heightCmInput || null;
      const weightKg = weightKgInput || null;

      const bmiValue = bmi(weightKg, heightCm);
      const bmiClass = classifyBMI(bmiValue);

      const pillow = recommendPillow({
        sleepPosition,
        shoulderWidthCm,
        neckCircumferenceCm
      });

      const mattress = recommendMattress({
        sleepPosition,
        bmiClass
      });

      results.push({
        age: +(age?.toFixed?.(0) ?? age),
        gender,
        genderProbability,
        scaleSource: scaleInfo.source || (pxPerCm ? 'approx_from_face' : 'none'),
        measurements: {
          heightCm: heightCm ?? null,
          weightKg: weightKg ?? null,
          shoulderWidthCm: shoulderWidthCm ?? null,
          neckCircumferenceCm: neckCircumferenceCm ?? null,
          // transparency: note that shoulder/neck are rough if derived
          notes: (!referenceWidthCm && !pxPerCmInput) ? 'Measurements are approximate; provide pxPerCm or a reference object for accuracy.' : undefined
        },
        derived: {
          bmi: bmiValue,
          bmiClass
        },
        recommendations: {
          sleepPosition: sleepPosition || 'unspecified',
          pillow,
          mattress
        }
      });
    }

    return results;
  }

  const result = await analyzeImage(req.file.path);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "analysis done",
    data: result
  });
});


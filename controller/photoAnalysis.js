import * as faceapi from 'face-api.js';
import canvas from 'canvas';
import fs from 'fs';
import path from 'path';
import catchAsync from '../utils/catchAsync.js';
import sendResponse from '../utils/sendResponse.js';

export const photoAnalysis = catchAsync(async (req, res) => {

    // Required for face-api.js
    const { Canvas, Image, ImageData } = canvas;
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

    async function analyzeImage(imagePath) {
        await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');  // face detection
        await faceapi.nets.ageGenderNet.loadFromDisk('./models');    // age + gender

        const img = await canvas.loadImage(imagePath);
        const detections = await faceapi.detectAllFaces(img).withAgeAndGender();

        return detections.map(det => ({
            age: det.age,
            gender: det.gender,
            probability: det.genderProbability
        }));
    }

    const result = await analyzeImage(req.file.path);
    console.log(result);

    sendResponse(res,{
        statusCode: 200,
        success: true,
        message : "analysis done",
        data: result
    })


})
// MediaPipe example: https://codepen.io/mediapipe-preview/pen/abRLMxN
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "./vendor/mediapipe.js";

const DEBUG = false;

const demosSection = document.getElementById("demos");
let poseLandmarker = undefined;
let runningMode = "IMAGE";
const videoHeight = "360px";
const videoWidth = "480px";
// Before we can use PoseLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createPoseLandmarker = async () => {
  //const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm");
  poseLandmarker = await PoseLandmarker.createFromOptions({
    wasmLoaderPath: "./vendor/vision_wasm_nosimd_internal.js",
    wasmBinaryPath: "./vendor/vision_wasm_nosimd_internal.wasm"
  }, {
    baseOptions: {
      modelAssetPath: "./vendor/pose_landmarker_lite.task",
      delegate: "GPU"
    },
    runningMode: runningMode,
    numPoses: 2
  });
  demosSection.classList.remove("invisible");
  start();
};
createPoseLandmarker();

function averagePoint(a, b) {
  return {
    x: (a.x + b.x)/2,
    y: (a.y + b.y)/2,
    z: (a.z + b.z)/2
  };
}

function calculateAngle(a, b, c) {
  // Define the vectors BA and BC
  const BA = {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z
  };
  const BC = {
    x: c.x - b.x,
    y: c.y - b.y,
    z: c.z - b.z
  };

  // Calculate the dot product of BA and BC
  const dotProduct = BA.x * BC.x + BA.y * BC.y + BA.z * BC.z;

  // Calculate the magnitudes of BA and BC
  const magnitudeBA = Math.sqrt(BA.x * BA.x + BA.y * BA.y + BA.z * BA.z);
  const magnitudeBC = Math.sqrt(BC.x * BC.x + BC.y * BC.y + BC.z * BC.z);

  // Calculate the cosine of the angle
  const cosTheta = dotProduct / (magnitudeBA * magnitudeBC);

  // Calculate the angle in radians
  const angleRadians = Math.acos(cosTheta);

  // Convert the angle to degrees
  const angleDegrees = angleRadians * (180 / Math.PI);

  return angleDegrees;
}

function computeAverage(arr) {
  if (arr.length === 0) {
    throw new Error('Array cannot be empty');
  }

  // Sum all the elements in the array
  const sum = arr.reduce((accumulator, currentValue) => accumulator + currentValue, 0);

  // Calculate the average
  const average = sum / arr.length;

  return average;
}

/********************************************************************
 // Demo 2: Continuously grab image from webcam stream and detect it.
 ********************************************************************/
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const drawingUtils = new DrawingUtils(canvasCtx);
// Check if webcam access is supported.
const hasGetUserMedia = () => { var _a; return !!((_a = navigator.mediaDevices) === null || _a === void 0 ? void 0 : _a.getUserMedia); };
// If webcam supported, add event listener to button for when user
// wants to activate it.
var start = function () {
  console.log("started");
  if (hasGetUserMedia()) {
    enableCam();
  }
  else {
    console.warn("getUserMedia() is not supported by your browser");
  }
}
// Enable the live webcam view and start detection.
function enableCam() {
  // getUsermedia parameters.
  const constraints = {
    video: true
  };
  // Activate the webcam stream.
  console.log("activating");
  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  }).catch((err) => {
    alert("Webcam not available");
  });
}
let lastVideoTime = -1;

window.lastAngles = [];

async function predictWebcam() {
  canvasElement.style.height = videoHeight;
  video.style.height = videoHeight;
  canvasElement.style.width = videoWidth;
  video.style.width = videoWidth;
  // Now let's start detecting the stream.
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await poseLandmarker.setOptions({ runningMode: "VIDEO" });
  }
  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      //console.log(result);
      for (const landmark of result.landmarks) {
        // landmark is array of landmarks
        // shoulder, hip, knee https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker#pose_landmarker_model
        var angle = calculateAngle(
            averagePoint(landmark[11], landmark[12]),
            averagePoint(landmark[23], landmark[24]),
            averagePoint(landmark[25], landmark[26])
        );

        window.lastAngles.push({angle: angle, ts: performance.now()});
        window.lastAngles = window.lastAngles.filter(function (obj) {
          return obj.ts >= performance.now() - 500; // msec
        });
        var smoothedAngle = computeAverage(window.lastAngles.map(function (obj) {
          return obj.angle;
        }));
        if (DEBUG) {
          document.getElementById("angle").innerText = smoothedAngle;
        }

        if ([
          landmark[11],
          landmark[12],
          landmark[23],
          landmark[24],
          landmark[25],
          landmark[26],
        ].every(function (obj) {
          return obj.x >= 0 && obj.x <= 1 && obj.y >= 0 && obj.y <= 1;
        })) {
          document.getElementById("visible").innerText = "yes";
          var phase = document.getElementById("phase").innerText;

          var newPhase;
          if (smoothedAngle < 110) {
            newPhase = "down";
          } else {
            newPhase = "up";
          }

          if (phase === "down" && newPhase === "up") {
            chrome.storage.local.get(
              ['power'],
              function(result) {
                chrome.storage.local.set({power: result.power + 1});
                chrome.action.setBadgeText({text: (result.power + 1).toString()});
                if (result.power + 1 > 0) {
                  chrome.action.setBadgeBackgroundColor({color: '#fdf6e3'});
                }
            });
          }
          document.getElementById("phase").innerText = newPhase;
        } else {
          document.getElementById("visible").innerText = "no";
          document.getElementById("phase").innerText = "?";
        }

        if (DEBUG) {
          drawingUtils.drawLandmarks(landmark, {
            radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1)
          });
          drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
        }
      }
      canvasCtx.restore();
    });
  }
  // Call this function again to keep predicting when the browser is ready.
  window.requestAnimationFrame(predictWebcam);
}


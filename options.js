const TIMERSECS = 3;

let video;
let poseNet;
let poses = [];
let chosenPose;

old_console = console.log;
console.log = function (msg) {
  if (msg.toString().includes('Could not start video source')) {
    alert('Webcam not available');
  } else {
    old_console(msg);
  }
}

function blobToDataURL(blob, callback) {
  var a = new FileReader();
  a.onload = function(e) {callback(e.target.result);}
  a.readAsDataURL(blob);
}

var logButton = document.getElementById('log');

logButton.onclick = function() {
  logButton.disabled = true;
  logButton.textContent = TIMERSECS;
  var tick = function () {
    var curVal = parseInt(logButton.textContent);
    if (curVal === 1) {
      savePose();
    } else {
      logButton.textContent = curVal - 1;
      setTimeout(tick, 1000);
    }
  };
  setTimeout(tick, 1000);
};

var savePose = function () {
  chosenPose = poses[0];
  var c = document.getElementById('defaultCanvas0');
  c.toBlob(function (blob) {
    chrome.storage.local.get('savedPoses', function(data) {
      blobToDataURL(blob, function(url) {
        data.savedPoses.push({
          posesEl: poses[0],
          imgURL: url
        });
        chrome.storage.local.set({savedPoses: data.savedPoses}, function () {
          window.location.reload(false);
        });
      });
    });
  }, 'image/webp');
};

var deletePose = function (src) {
  chrome.storage.local.get('savedPoses', function(data) {
    data.savedPoses = data.savedPoses.filter(function (savedPose) {
      return savedPose.imgURL !== src;
    });
    chrome.storage.local.set({savedPoses: data.savedPoses}, function () {
      window.location.reload(false);
    });
  });
};

chrome.storage.local.get('savedPoses', function(data) {
  data.savedPoses.forEach(function (savedPose) {
    var img = document.createElement("img");
    img.src = savedPose.imgURL;
    img.addEventListener("click", function(){deletePose(img.src);});
    img.height = 480;
    var src = document.getElementById("savedPoses");
    src.appendChild(img);
  });
});

var savePeriod = function () {
  var periodBox = document.getElementById('period');
  var val = parseInt(periodBox.value);
  if (val > 0) {
    // if multiple calls to this function are made in quick succession, is it
    // possible that setting the value will happen out or order?
    chrome.storage.local.set({period: val});
  }
};

var saveStartTime = function () {
  var startTimeBox = document.getElementById('startTime');
  var val = startTimeBox.value.split(':');
  if (val.length !== 2) return;
  var h = parseInt(val[0]);
  var m = parseInt(val[1]);
  if (0 <= h < 24 && 0 <= m < 60) {
    chrome.storage.local.set({startTime: h * 60 + m});
  }
};

var saveEndTime = function () {
  var endTimeBox = document.getElementById('endTime');
  var val = endTimeBox.value.split(':');
  if (val.length !== 2) return;
  var h = parseInt(val[0]);
  var m = parseInt(val[1]);
  if (0 <= h < 24 && 0 <= m < 60) {
    chrome.storage.local.set({endTime: h * 60 + m});
  }
};

chrome.storage.local.get(
  ['period', 'startTime', 'endTime'],
  function(result) {
    var periodBox = document.getElementById('period');
    periodBox.value = result.period;
    periodBox.oninput = savePeriod;

    var startTimeBox = document.getElementById('startTime');
    var h = floor(result.startTime / 60);
    var m = (result.startTime % 60).toString().padStart(2, '0');
    startTimeBox.value = h + ':' + m;
    startTimeBox.oninput = saveStartTime;

    var endTimeBox = document.getElementById('endTime');
    var h = floor(result.endTime / 60);
    var m = (result.endTime % 60).toString().padStart(2, '0');
    endTimeBox.value = h + ':' + m;
    endTimeBox.oninput = saveEndTime;
});

// https://p5js.org/reference/#/p5/setup
function setup() {
  // https://p5js.org/reference/#/p5/createCanvas
  var canvas = createCanvas(640, 480);
  canvas.parent('sketch-holder');
  // https://p5js.org/reference/#/p5/createCapture
  video = createCapture(VIDEO);
  video.size(width, height);

  // Create a new poseNet method with a single detection
  poseNet = ml5.poseNet(video, modelReady);
  // This sets up an event that fills the global variable "poses"
  // with an array every time new poses are detected
  poseNet.on("pose", function(result) {
    poses = result;
  });
  // Hide the video element, and just show the canvas
  video.hide();
}

function modelReady() {
  select("#status").hide();
  document.getElementById('log').disabled = false;
}

// https://p5js.org/reference/#/p5/draw
function draw() {
  // https://p5js.org/reference/#/p5/image
  image(video, 0, 0, width, height);

  // We can call both functions to draw all keypoints and the skeletons
  drawKeypoints();
  drawSkeleton();
}

// A function to draw ellipses over the detected keypoints
function drawKeypoints() {
  // Loop through all the poses detected
  for (let i = 0; i < poses.length; i += 1) {
    // For each pose detected, loop through all the keypoints
    const pose = poses[i].pose;
    for (let j = 0; j < pose.keypoints.length; j += 1) {
      // A keypoint is an object describing a body part (like rightArm or leftShoulder)
      const keypoint = pose.keypoints[j];
      // Only draw an ellipse is the pose probability is bigger than 0.2
      if (keypoint.score > 0.2) {
        fill(255, 0, 0);
        noStroke();
        ellipse(keypoint.position.x, keypoint.position.y, 10, 10);
      }
    }
  }
}

// A function to draw the skeletons
function drawSkeleton() {
  // Loop through all the skeletons detected
  for (let i = 0; i < poses.length; i += 1) {
    const skeleton = poses[i].skeleton;
    // For every skeleton, loop through all body connections
    for (let j = 0; j < skeleton.length; j += 1) {
      const partA = skeleton[j][0];
      const partB = skeleton[j][1];
      stroke(255, 0, 0);
      line(
        partA.position.x,
        partA.position.y,
        partB.position.x,
        partB.position.y
      );
    }
  }
}

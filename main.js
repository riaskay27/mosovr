"use strict";

let gl;
let surface;
let shProgram;
let spaceball;
let stereoCamera = new StereoCamera(5, 0.4, 1, 1, 4, 100);

let TextureWebCam;
let video;

const scale = 8;
const teta = Math.PI / 2;
const a0 = 0;
const r = 1;
const c = 2;
const d = 1;

let image_src = "https://www.the3rdsequence.com/texturedb/download/254/texture/jpg/1024/ice+and+snow+ground-1024x1024.jpg";
let video_src = "texture/texture_vid.mp4";
let copyVideo = false;
let texture_type = "image";

let World_X = -1;
let World_Y = 0;
let World_Z = -4;


let CanvasWidth;
let CanvasHeight;

let video_cam;

let SurfaceTexture;
let BackgroundVideoModel;

let image;

let timeStamp;
let deltaRotationMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
let alpha = 0,
    beta = 0,
    gamma = 0,
    x,
    y,
    z;
const EPSILON = 0.001;
const MS2S = 1.0 / 1000.0;

class Model {
  constructor(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.count = 0;
  }

  bufferData(vertices, textures) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textures), gl.STREAM_DRAW);

    this.count = vertices.length / 3;
  }

  draw() {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iTextureCoords);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  }
}

class ShaderProgram {
  constructor(name, program) {
    this.name = name;
    this.prog = program;
    this.iAttribVertex = -1;
    this.iNormalVertex = -1;
    this.iModelViewProjectionMatrix = -1;
    this.iTextureCoords = -1;
    this.iTexture = -1;
  }

  use() {
    gl.useProgram(this.prog);
  }
}

function StereoCamera(
  Convergence,
  EyeSeparation,
  AspectRatio,
  FOV,
  NearClippingDistance,
  FarClippingDistance
) {
  this.mConvergence = Convergence;
  this.mEyeSeparation = EyeSeparation;
  this.mAspectRatio = AspectRatio;
  this.mFOV = FOV;
  this.mNearClippingDistance = NearClippingDistance;
  this.mFarClippingDistance = FarClippingDistance;

  this.mProjectionMatrix = null;
  this.mModelViewMatrix = null;

  this.ApplyLeftFrustum = function () {
      let top, bottom, left, right;
      top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
      bottom = -top;

      let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
      let b = a - this.mEyeSeparation / 2;
      let c = a + this.mEyeSeparation / 2;

      left = (-b * this.mNearClippingDistance) / this.mConvergence;
      right = (c * this.mNearClippingDistance) / this.mConvergence;

      this.mProjectionMatrix = m4.orthographic(
          left,
          right,
          bottom,
          top,
          this.mNearClippingDistance,
          this.mFarClippingDistance
      );

      this.mModelViewMatrix = m4.translation(
          this.mEyeSeparation / 2,
          0.0,
          0.0
      );
  };

  this.ApplyRightFrustum = function () {
      let top, bottom, left, right;
      top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
      bottom = -top;

      let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
      let b = a - this.mEyeSeparation / 2;
      let c = a + this.mEyeSeparation / 2;

      left = (-c * this.mNearClippingDistance) / this.mConvergence;
      right = (b * this.mNearClippingDistance) / this.mConvergence;

      this.mProjectionMatrix = m4.orthographic(
          left,
          right,
          bottom,
          top,
          this.mNearClippingDistance,
          this.mFarClippingDistance
      );

      this.mModelViewMatrix = m4.translation(
          -this.mEyeSeparation / 2,
          0.0,
          0.0
      );
  };
}

function draw() {
  gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    getRotationMatrix();
    DrawWebCamVideo();

    gl.clear(gl.DEPTH_BUFFER_BIT);
    stereoCamera.ApplyLeftFrustum();
    gl.colorMask(true, false, false, false);
    
    let modelView = deltaRotationMatrix;
    let translateToPointZero = m4.translation(World_X, World_Y, World_Z);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, m4.multiply(stereoCamera.mModelViewMatrix, m4.multiply(m4.multiply(stereoCamera.mProjectionMatrix, translateToPointZero), modelView)));
    gl.bindTexture(gl.TEXTURE_2D, SurfaceTexture);
    gl.uniform1i(shProgram.iTexture, 0);

    surface.draw();

    gl.clear(gl.DEPTH_BUFFER_BIT);
    stereoCamera.ApplyRightFrustum();
    gl.colorMask(false, true, true, false);
    
    let modelView1 = deltaRotationMatrix;
    let translateToPointZero1 = m4.translation(World_X, World_Y, World_Z);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, m4.multiply(stereoCamera.mModelViewMatrix, m4.multiply(m4.multiply(stereoCamera.mProjectionMatrix, translateToPointZero1), modelView1)));
    gl.bindTexture(gl.TEXTURE_2D, SurfaceTexture);
    gl.uniform1i(shProgram.iTexture, 0);

    surface.draw();


    gl.colorMask(true, true, true, true);
    getRotationMatrix();
}

function CreateSurfaceData() {
  let vertexList = [];
  let normalsList = [];
  let textureList = [];

  let deltaT = 0.0005;
  let deltaA = 0.0005;

  const step = 0.1;

  for (let t = -15; t <= 15; t += step) {
    for (let a = 0; a <= 15; a += step) {
      const tNext = t + step;
      vertexList.push(getX(t, a, 10), getY(t, a, 10), getZ(t, 20));
      vertexList.push(getX(tNext, a, 10), getY(tNext, a, 10), getZ(tNext, 20));

      let result = m4.cross(calcDerT(t, a, deltaT), calcDerA(t, a, deltaA));
      normalsList.push(result[0], result[1], result[2]);

      result = m4.cross(calcDerT(tNext, a, deltaT), calcDerA(tNext, a, deltaA));
      normalsList.push(result[0], result[1], result[2]);
    }
  }

  for (let t = -15; t <= 15; t += step) {
    for (let a = 0; a <= 15; a += step) {
      const tNext = t + step;
      
      // Вычислите текстурные координаты для текущего и следующего угла
      const u = (t + 15) / 30; // Пример: от 0 до 1
      const uNext = (tNext + 15) / 30; // Пример: от 0 до 1
      const v = a / 15; // Пример: от 0 до 1
      
      // Добавьте текстурные координаты в массив textureList
      textureList.push(u, v);
      textureList.push(uNext, v);
    }
  }

  return [vertexList, normalsList, textureList];
}

function getX(t, a, param = 15) {
  return (
    ((r * Math.cos(a) -
      (r * (a0 - a) + t * Math.cos(teta) - c * Math.sin(d * t) * Math.sin(teta)) *
        Math.sin(a)) /
      param) *
    scale
  );
}

function getY(t, a, param = 15) {
  return (
    ((r * Math.sin(a) +
      (r * (a0 - a) + t * Math.cos(teta) - c * Math.sin(d * t) * Math.sin(teta)) *
        Math.cos(a)) /
      param) *
    scale
  );
}

function getZ(t, height = 15) {
  return (
    ((t * Math.sin(teta) + c * Math.sin(d * t) * Math.cos(teta)) / -height) *
    scale
  );
}

const calcDerT = (t, a, tDelta) => ([
  (getX(t + tDelta, a, 10) - getX(t, a, 10)) / degriesToRadians(tDelta),
  (getY(t + tDelta, a, 10) - getY(t, a, 10)) / degriesToRadians(tDelta),
  (getZ(t + tDelta, a) - getZ(t, a)) / degriesToRadians(tDelta),
]);

const calcDerA = (t, a, aDelta) => ([
  (getX(t, a + aDelta, 10) - getX(t, a, 10)) / degriesToRadians(aDelta),
  (getY(t, a + aDelta, 10) - getY(t, a, 10)) / degriesToRadians(aDelta),
  (getZ(t, a + aDelta) - getZ(t, a)) / degriesToRadians(aDelta),
]);

function degriesToRadians(angle) {
  return (angle * Math.PI) / 180;
}

function getRotationMatrix() {
  if (x != null) {
      let dT = (Date.now() - timeStamp) * MS2S;
      let omegaMagnitude = Math.sqrt(x * x, y * y, z * z);
      if (omegaMagnitude > EPSILON) {
          alpha += x * dT
          beta += y * dT
          gamma += z * dT
          alpha = Math.min(Math.max(alpha, -Math.PI * 0.25), Math.PI * 0.25)
          beta = Math.min(Math.max(beta, -Math.PI * 0.25), Math.PI * 0.25)
          gamma = Math.min(Math.max(gamma, -Math.PI * 0.25), Math.PI * 0.25)

          let deltaRotationVector = [];

          deltaRotationVector.push(alpha);
          deltaRotationVector.push(beta);
          deltaRotationVector.push(gamma);

          deltaRotationMatrix = getRotationMatrixFromVector(deltaRotationVector)

          timeStamp = Date.now();
      }
  }
}

function getRotationMatrixFromVector(rotationVector) {
  const q1 = rotationVector[0];
  const q2 = rotationVector[1];
  const q3 = rotationVector[2];
  let q0;

  if (rotationVector.length >= 4) {
      q0 = rotationVector[3];
  } else {
      q0 = 1 - q1 * q1 - q2 * q2 - q3 * q3;
      q0 = q0 > 0 ? Math.sqrt(q0) : 0;
  }
  const sq_q1 = 2 * q1 * q1;
  const sq_q2 = 2 * q2 * q2;
  const sq_q3 = 2 * q3 * q3;
  const q1_q2 = 2 * q1 * q2;
  const q3_q0 = 2 * q3 * q0;
  const q1_q3 = 2 * q1 * q3;
  const q2_q0 = 2 * q2 * q0;
  const q2_q3 = 2 * q2 * q3;
  const q1_q0 = 2 * q1 * q0;
  let R = [];
  R.push(1 - sq_q2 - sq_q3);
  R.push(q1_q2 - q3_q0);
  R.push(q1_q3 + q2_q0);
  R.push(0.0);
  R.push(q1_q2 + q3_q0);
  R.push(1 - sq_q1 - sq_q3);
  R.push(q2_q3 - q1_q0);
  R.push(0.0);
  R.push(q1_q3 - q2_q0);
  R.push(q2_q3 + q1_q0);
  R.push(1 - sq_q1 - sq_q2);
  R.push(0.0);
  R.push(0.0);
  R.push(0.0);
  R.push(0.0);
  R.push(1.0);
  return R;
}

function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram("Basic", prog);
  shProgram.use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(
    prog,
    "ModelViewProjectionMatrix"
  );
  shProgram.iNormalVertex = gl.getAttribLocation(prog, "normal");

  shProgram.iTextureCoords = gl.getAttribLocation(prog, "textureCoords");
  shProgram.iTextureU = gl.getUniformLocation(prog, "textureU");

  surface = new Model("Surface");
  let data = CreateSurfaceData();
  surface.bufferData(data[0], data[1], data[2]);

  BackgroundVideoModel = new Model('Camera');
  let BackgroundData = CreateBackgroundData();
  BackgroundVideoModel.bufferData(BackgroundData[0], BackgroundData[1], BackgroundData[2]);
}

function CreateBackgroundData() {
  let vertexList = [-CanvasWidth / 2.0, -CanvasHeight / 2.0, 0,
                      -CanvasWidth / 2.0, CanvasHeight / 2.0, 0,
                      CanvasWidth / 2.0, CanvasHeight / 2.0, 0,
                      -CanvasWidth / 2.0, -CanvasHeight / 2.0, 0,
                      CanvasWidth / 2.0, CanvasHeight / 2.0, 0,
                      CanvasWidth / 2.0, -CanvasHeight / 2.0, 0];
  let normalsList = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
  let textCoords = [1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1];

  return [vertexList, normalsList, textCoords];
}

function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in vertex shader: " + gl.getShaderInfoLog(vsh));
  }

  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in fragment shader: " + gl.getShaderInfoLog(fsh));
  }

  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Link error in program: " + gl.getProgramInfoLog(prog));
  }

  return prog;
}

function init() {
  let canvas;
  readGyroscope();
  getRotationMatrix();

  try {
    canvas = document.getElementById("webglcanvas");
    CanvasWidth = canvas.scrollWidth;
    CanvasHeight = canvas.scrollHeight;

    gl = canvas.getContext("webgl");

    if (!gl) {
      throw "Browser does not support WebGL";
    }
  } catch (e) {
    console.log(e);
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not get a WebGL graphics context.</p>";
    return;
  }

  try {
    initGL();
  } catch (e) {
    console.log(e);
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
    return;
  }

  video_cam = document.createElement('video');
  video_cam.setAttribute('autoplay', true);
  window.vid = video_cam;

  navigator.getUserMedia({
      video: true
  }, function (stream) {
      video_cam.srcObject = stream;
      let stream_settings = stream.getVideoTracks()[0].getSettings();
      let stream_width = stream_settings.width;
      let stream_height = stream_settings.height;
      canvas = document.querySelector('canvas');
      gl = canvas.getContext("webgl");
      canvas.width = stream_width;
      canvas.height = stream_height;
      gl.viewport(0, 0, stream_width, stream_height);

  }, function (e) {
      console.error('Rejected!', e);
  });

  SetUpWebCamTexture();
  setTimeout(function () {
      spaceball = new TrackballRotator(canvas, draw, 0);

      if (texture_type == "image") {
          var texture = loadTexture(gl, image_src);
      } else {
          var texture = initTexture(gl);
          var video = setupVideo(video_src);
          var then = 0;

          function render(now) {
              now *= 0.001;
              var deltaTime = now - then;
              then = now;
              if (copyVideo) {
                  updateTexture(gl, texture, video);
              }
              if (texture_type != "image") {
                  requestAnimationFrame(render);
              }
          }
          requestAnimationFrame(render);
      }

      playVideo();
  }, 500);
}

function playVideo() {
  draw();
  window.requestAnimationFrame(playVideo);
}

function SetUpWebCamTexture() {
  TextureWebCam = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, TextureWebCam);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function initTexture(gl) {
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 255, 255]));

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  return texture;
}

function updateTexture(gl, texture, video) {
  gl.bindTexture(gl.TEXTURE_2D, SurfaceTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
  draw();
}


function setupVideo(url) {
  video = document.createElement("video");
  video.crossOrigin = "anonymous"

  let playing = false;
  let timeupdate = false;

  video.playsInline = true;
  video.muted = true;
  video.loop = true;

  video.addEventListener(
      "playing",
      () => {
          playing = true;
          checkReady();
      },
      true
  );

  video.addEventListener(
      "timeupdate",
      () => {
          timeupdate = true;
          checkReady();
      },
      true
  );

  video.src = url;
  video.play();

  function checkReady() {
      if (playing && timeupdate) {
          copyVideo = true;
      }
  }

  return video;
}

function loadTexture(gl, url) {
  SurfaceTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, SurfaceTexture);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 255, 255]));

  image = new Image();
  image.crossOrigin = "anonymous"
  image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, SurfaceTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

      if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
          gl.generateMipmap(gl.TEXTURE_2D);
      } else {
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      draw();
  };
  image.src = url;

  return SurfaceTexture;
}

function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

function readGyroscope() {
if (window.DeviceOrientationEvent) {
    timeStamp = Date.now();
    let sensor = new Gyroscope({
        frequency: 60
    });
    sensor.addEventListener('reading', e => {
        x = sensor.x
        y = sensor.y
        z = sensor.z
    });
    sensor.start();
} else alert('Gyroscope not supported');

}

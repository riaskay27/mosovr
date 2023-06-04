"use strict";

let gl;
let surface;
let shProgram;
let spaceball;
let texture;
let stereoCamera;

let webCamTexture, webCamVideo, webCamBackground;

const texturePoint = { x: 100, y: 400 };

let orientationEvent = { alpha: 0, beta: 0, gamma: 0 };

const scale = 8;
const teta = Math.PI / 2;
const a0 = 0;
const r = 1;
const c = 2;
const d = 1;

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

    gl.enableVertexAttribArray(shProgram.iTextureCoords);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);

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
    this.iModelViewProjectionMatrix = -1;
    this.iTextureCoords = -1;
    this.iTextureU = -1;
  }

  use() {
    gl.useProgram(this.prog);
  }
}

const leftFrustum = (stereoCamera) => {
  const { eyeSeparation, convergence, aspectRatio, fov, near, far } =
    stereoCamera;
  const top = near * Math.tan(fov / 2);
  const bottom = -top;

  const a = aspectRatio * Math.tan(fov / 2) * convergence;
  const b = a - eyeSeparation / 2;
  const c = a + eyeSeparation / 2;

  const left = (-b * near) / convergence;
  const right = (c * near) / convergence;

  return m4.orthographic(left, right, bottom, top, near, far);
};

const rightFrustum = (stereoCamera) => {
  const { eyeSeparation, convergence, aspectRatio, fov, near, far } =
    stereoCamera;
  const top = near * Math.tan(fov / 2);
  const bottom = -top;

  const a = aspectRatio * Math.tan(fov / 2) * convergence;
  const b = a - eyeSeparation / 2;
  const c = a + eyeSeparation / 2;

  const left = (-c * near) / convergence;
  const right = (b * near) / convergence;

  return m4.orthographic(left, right, bottom, top, near, far);
};

function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let modelView = spaceball.getViewMatrix();
  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0);
  let projection = m4.orthographic(0, 1, 0, 1, -1, 1);
  let noRot = m4.multiply(
    rotateToPointZero,
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  );

  const stereoCamera = {
    eyeSeparation: parseFloat(document.getElementById("eyeSeparation").value),
    convergence: parseFloat(document.getElementById("convergence").value),
    aspectRatio: gl.canvas.width / gl.canvas.height,
    fov: parseFloat(document.getElementById("fov").value),
    near: parseFloat(document.getElementById("near").value),
    far: 20.0,
  };

  let projectionLeft = leftFrustum(stereoCamera);
  let projectionRight = rightFrustum(stereoCamera);

  let translateToLeft = m4.translation(-0.03, 0, -20);
  let translateToRight = m4.translation(0.03, 0, -20);

  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, noRot);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);
  gl.bindTexture(gl.TEXTURE_2D, webCamTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    webCamVideo
  );
  webCamBackground?.draw();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.clear(gl.DEPTH_BUFFER_BIT);

  if (
    orientationEvent.alpha &&
    orientationEvent.beta &&
    orientationEvent.gamma
  ) {
    let rotationMatrix = getRotationMatrix(
      orientationEvent.alpha,
      orientationEvent.beta,
      orientationEvent.gamma
    );
    let translationMatrix = m4.translation(0, 0, -1);

    modelView = m4.multiply(rotationMatrix, translationMatrix);
  }

  let matAccum = m4.multiply(rotateToPointZero, modelView);

  let matAccumLeft = m4.multiply(translateToLeft, matAccum);
  let matAccumRight = m4.multiply(translateToRight, matAccum);

  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumLeft);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionLeft);
  gl.colorMask(true, false, false, false);
  surface.draw();

  gl.clear(gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumRight);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionRight);
  gl.colorMask(false, true, true, false);
  surface.draw();

  gl.colorMask(true, true, true, true);
}

function getRotationMatrix(alpha, beta, gamma) {
  var _x = beta ? deg2rad(beta) : 0; // beta value
  var _y = gamma ? deg2rad(gamma) : 0; // gamma value
  var _z = alpha ? deg2rad(alpha) : 0; // alpha value

  var cX = Math.cos(_x);
  var cY = Math.cos(_y);
  var cZ = Math.cos(_z);
  var sX = Math.sin(_x);
  var sY = Math.sin(_y);
  var sZ = Math.sin(_z);

  var m11 = cZ * cY - sZ * sX * sY;
  var m12 = -cX * sZ;
  var m13 = cY * sZ * sX + cZ * sY;

  var m21 = cY * sZ + cZ * sX * sY;
  var m22 = cZ * cX;
  var m23 = sZ * sY - cZ * cY * sX;

  var m31 = -cX * sY;
  var m32 = sX;
  var m33 = cX * cY;

  return [m11, m12, m13, 0, m21, m22, m23, 0, m31, m32, m33, 0, 0, 0, 0, 1];
}


function CreateSurfaceData() {
  let vertexList = [];
  let normalsList = [];

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

  return [vertexList, normalsList];
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

function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram("Basic", prog);
  shProgram.use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(
    prog,
    "ModelViewProjectionMatrix"
  );
  shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
  shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");

  shProgram.iTextureCoords = gl.getAttribLocation(prog, "textureCoords");
  shProgram.iTextureU = gl.getUniformLocation(prog, "textureU");

  surface = new Model("Surface");
  let data = CreateSurfaceData();
  surface.bufferData(data[0], data[1]);

  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src =
    "https://www.the3rdsequence.com/texturedb/download/254/texture/jpg/1024/ice+and+snow+ground-1024x1024.jpg";

  image.addEventListener("load", () => {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  });

  webCamBackground = new Model("Background");
  webCamBackground.bufferData(
    [
      0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0,
      0.0, 0.0, 0.0,
    ],
    [1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1]
  );

  gl.enable(gl.DEPTH_TEST);
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
  try {
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");

    webCamVideo = document.createElement("video");
    webCamVideo.setAttribute("autoplay", true);
    webCamTexture = createWebCamTexture(gl);

    getWebcam().then((stream) => (webCamVideo.srcObject = stream));

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

  const eyeSeparationInput = document.getElementById("eyeSeparation");
  const convergenceInput = document.getElementById("convergence");
  const fovInput = document.getElementById("fov");
  const nearInput = document.getElementById("near");

  eyeSeparationInput.addEventListener("input", draw);
  convergenceInput.addEventListener("input", draw);
  fovInput.addEventListener("input", draw);
  nearInput.addEventListener("input", draw);

  spaceball = new TrackballRotator(canvas, draw, 0);

  if ("DeviceOrientationEvent" in window) {
    window.addEventListener("deviceorientation", handleOrientation);
  } 
  redraw();
}

const redraw = () => {
  draw();
  window.requestAnimationFrame(redraw);
};

const getWebcam = () => {
  return new Promise((resolve) =>
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => resolve(s))
  );
};

const createWebCamTexture = () => {
  let textureID = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureID);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return textureID;
};

const handleOrientation = (event) => {
  orientationEvent.alpha = event.alpha;
  orientationEvent.beta = event.beta;
  orientationEvent.gamma = event.gamma;
};

init();

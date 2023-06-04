"use strict";

let gl;
let surface;
let shProgram;
let spaceball;
let texture;
let stereoCamera;

let webCamTexture, webCamVideo, webCamBackground;

let orientationEvent = { alpha: 0, beta: 0, gamma: 0 };

let a = 0.5;
let b = 1;

const deg2rad = (angle) => {
  return (angle * Math.PI) / 180;
};


function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.iTextureBuffer = gl.createBuffer();
  this.count = 0;

  this.BufferData = function (vertices, textures) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textures), gl.STREAM_DRAW);

    gl.enableVertexAttribArray(shProgram.iTextureCoords);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);

    this.count = vertices.length / 3;
  };

  this.Draw = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iTextureCoords);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  };
}

function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;
  this.iAttribVertex = -1;
  this.iModelViewProjectionMatrix = -1;
  this.iModelViewMatrix = -1;
  this.iProjectionMatrix = -1;
  this.iTextureCoords = -1;
  this.iTextureU = -1;

  this.Use = function () {
    gl.useProgram(this.prog);
  };
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

function draw(alpha, beta, gamma) {
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
    far: 100.0,
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
  webCamBackground?.Draw();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.clear(gl.DEPTH_BUFFER_BIT);

  if (alpha && beta && gamma) {
    let rotationMatrix = getRotationMatrix(alpha, beta, gamma);
    let translationMatrix = m4.translation(0, 0, -1);

    modelView = m4.multiply(rotationMatrix, translationMatrix);
  }

  let matAccum = m4.multiply(rotateToPointZero, modelView);

  let matAccumLeft = m4.multiply(translateToLeft, matAccum);
  let matAccumRight = m4.multiply(translateToRight, matAccum);

  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumLeft);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionLeft);
  gl.colorMask(true, false, false, false);
  surface.Draw();

  gl.clear(gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumRight);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionRight);
  gl.colorMask(false, true, true, false);
  surface.Draw();

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

  //
  // ZXY rotation matrix construction.
  //

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

const step = (max, splines = 20) => {
  return max / (splines - 1);
};

const cos = (x) => {
  return Math.cos(x);
};

const sin = (x) => {
  return Math.sin(x);
};

const CreateSurfaceData = () => {
  let vertexList = [];
  let textureList = [];
  let splines = 20;

  let maxU = Math.PI;
  let maxV = 2 * Math.PI;
  let stepU = step(maxU, splines);
  let stepV = step(maxV, splines);

  let getU = (u) => {
    return u / maxU;
  };

  let getV = (v) => {
    return v / maxV;
  };

  for (let u = 0; u <= maxU; u += stepU) {
    for (let v = 0; v <= maxV; v += stepV) {
      vertexList.push(
        a * (b - cos(u)) * sin(u) * cos(v),
        a * (b - cos(u)) * sin(u) * sin(v),
        cos(u)
      );
      textureList.push(getU(u), getV(v));
      vertexList.push(
        a * (b - cos(u + stepU)) * sin(u + stepU) * cos(v + stepV),
        a * (b - cos(u + stepU)) * sin(u + stepU) * sin(v + stepV),
        cos(u + stepU)
      );
      textureList.push(getU(u + stepU), getV(v + stepV));
    }
  }
  return { vertexList, textureList };
}

function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram("Basic", prog);
  shProgram.Use();

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
  const { vertexList, textureList } = CreateSurfaceData();
  surface.BufferData(vertexList, textureList);

  webCamBackground = new Model("Background");
  webCamBackground.BufferData(
    [
      0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0,
      0.0, 0.0, 0.0,
    ],
    [1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1]
  );

  loadTexture();

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
  } else {
    console.log("Device orientation not supported");
  }

  reDraw();
}

const reDraw = () => {
  draw(orientationEvent.alpha, orientationEvent.beta, orientationEvent.gamma);
  window.requestAnimationFrame(reDraw);
};

const loadTexture = () => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src =
    "https://www.the3rdsequence.com/texturedb/download/200/texture/jpg/1024/stone+tile+grass-256x256.jpg";

  image.addEventListener("load", () => {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  });
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




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

let SphereTexture;
let Sphere;
let GyroscopeRotate = false;
let SpaceballCheckbox = true;

let timeStamp;

let 
    x= 0,
    y = 0,
    z = 0;

let audio = null;
let audioContext;
let audioSource;
let audioPanner;
let audioFilter;
let centerFrequencyInput = 1000;
let Q_value = 5;
let Volume = 1;
let PlaybackRate = 1;



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

  bufferData(vertices) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

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
  drawSphere() {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);
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
  if (audioPanner) {
    audioFilter.frequency.value = centerFrequencyInput;
    audioFilter.Q.value = Q_value;
    audio.volume = Volume;
    audio.playbackRate = PlaybackRate;

    if (GyroscopeRotate) {
        audioPanner.setPosition(
            (x * 1000).toFixed(2),
            (y * 1000).toFixed(2),
            (z * 1000).toFixed(2)
        );
    } else {
        audioPanner.setPosition(
            World_X * 1000,
            World_Y * 1000,
            World_Z * 1000
        );
    }
}

gl.clearColor(0, 0, 0, 1);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

if (camera_ind) {
    DrawWebCamVideo();
}

gl.clear(gl.DEPTH_BUFFER_BIT);
stereoCamera.ApplyLeftFrustum();
gl.colorMask(true, false, false, false);
DrawSurface();
DrawSphere();

gl.clear(gl.DEPTH_BUFFER_BIT);
stereoCamera.ApplyRightFrustum();
gl.colorMask(false, true, true, false);
DrawSurface();
DrawSphere();
gl.colorMask(true, true, true, true);
}

function DrawSurface() {
  let modelView;
  let translateToPointZero;
  if (rotate_spaceball) {
      modelView = spaceball.getViewMatrix();
      translateToPointZero = m4.translation(0, 0, -20);
  } else {
      modelView = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
      translateToPointZero = m4.translation(-1, 0, -20);
  }

  gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, m4.multiply(stereoCamera.mModelViewMatrix, m4.multiply(m4.multiply(stereoCamera.mProjectionMatrix, translateToPointZero), modelView)));
  gl.bindTexture(gl.TEXTURE_2D, SurfaceTexture);
  gl.uniform1i(shProgram.iTexture, 0);

  surface.draw();
}

function DrawSphere() {
  let modelView = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  let translateToPointZero;
  if (GyroscopeRotate) {
      translateToPointZero = m4.translation(x.toFixed(2), y.toFixed(2), (z - 10).toFixed(2));
  } else {
      translateToPointZero = m4.translation(World_X, World_Y, World_Z - 10);
  }

  gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, m4.multiply(stereoCamera.mModelViewMatrix, m4.multiply(m4.multiply(stereoCamera.mProjectionMatrix, translateToPointZero), modelView)));
  gl.bindTexture(gl.TEXTURE_2D, SphereTexture);
  gl.uniform1i(shProgram.iTexture, 0);

  Sphere.drawSphere();
}

function CreateSphereSurface(radius = 2) {
  const vertices = [];
  const increment = 0.5;
  const halfPi = Math.PI * 0.5;
  const fullPi = Math.PI;
  
  for (let longitude = -fullPi; longitude < fullPi; longitude += increment) {
  for (let latitude = -halfPi; latitude < halfPi; latitude += increment) {
  const lon1 = longitude;
  const lon2 = longitude + increment;
  const lat1 = latitude;
  const lat2 = latitude + increment;
  vertices.push(
    ...sphereSurfaceData(radius, lon1, lat1),
    ...sphereSurfaceData(radius, lon2, lat1),
    ...sphereSurfaceData(radius, lon1, lat2),
    ...sphereSurfaceData(radius, lon2, lat2),
    ...sphereSurfaceData(radius, lon2, lat1),
    ...sphereSurfaceData(radius, lon1, lat2)
  );
}
}
return vertices;
}


function sphereSurfaceData(radius, longitude, latitude) {
  const sinLon = Math.sin(longitude);
  const cosLon = Math.cos(longitude);
  const sinLat = Math.sin(latitude);
  const cosLat = Math.cos(latitude);
  
  const x = radius * sinLon * cosLat;
  const y = radius * sinLon * sinLat;
  const z = radius * cosLon;
  
  return [x, y, z];
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

  shProgram.iTextureCoords = gl.getAttribLocation(prog, "vTextureCoords");
  shProgram.iTexture = gl.getUniformLocation(prog, "textureU");

  surface = new Model("Surface");
  let data = CreateSurfaceData();
  surface.bufferData(data[0], data[1], data[2]);

  BackgroundVideoModel = new Model('Camera');
  let BackgroundData = CreateBackgroundData();
  BackgroundVideoModel.bufferData(BackgroundData[0], BackgroundData[1], BackgroundData[2]);

  Sphere = new Model("Sphere");
  Sphere.bufferData(CreateSphereSurface());
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

      audio = document.getElementById("audio");

      audio.addEventListener("pause", () => {
          audioContext.resume();
      });

      audio.addEventListener("play", () => {
        if (!audioContext) {
            audioContext = new(window.AudioContext || window.webkitAudioContext)();
            audioSource = audioContext.createMediaElementSource(audio);

            audioPanner = audioContext.createPanner();
            audioFilter = audioContext.createBiquadFilter();

            audioPanner.panningModel = "HRTF";
            audioPanner.distanceModel = "linear";
            audioFilter.type = "lowpass";
            audioFilter.frequency.value = centerFrequencyInput;
            audioFilter.Q.value = Q_value;

            audio.volume = Volume;
            audio.playbackRate = PlaybackRate;

            const reverbUrl = "music/favorite.mp3";
                const reverbRequest = new XMLHttpRequest();
                reverbRequest.open("GET", reverbUrl, true);
                reverbRequest.responseType = "arraybuffer";

                reverbRequest.onload = function () {
                    const audioData = reverbRequest.response;
                    audioContext.decodeAudioData(audioData, function (buffer) {
                        reverbNode.buffer = buffer;
                        audioSource.connect(audioPanner);
                        audioPanner.connect(audioFilter);
                        audioFilter.connect(reverbNode);
                        reverbNode.connect(audioContext.destination);
                    });
                };

                reverbRequest.send();

            audioContext.resume();
        }
    });

    const filter = document.getElementById("filter_check");

    filter.addEventListener("change", function () {
        if (filter.checked) {
            audioPanner.disconnect();
            audioPanner.connect(audioFilter);
            audioFilter.connect(audioContext.destination);
        } else {
            audioPanner.disconnect();
            audioPanner.connect(audioContext.destination);
        }
    });


    audio.play();


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

function LoadSphereTexture() {
  SphereTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, SphereTexture);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 255, 255]));

  const SphereImage = new Image();
  SphereImage.crossOrigin = "anonymus";
  SphereImage.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, SphereTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, SphereImage);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      draw();
  };
  SphereImage.src = "https://www.the3rdsequence.com/texturedb/download/260/texture/jpg/1024/red+hot+fire+flames-1024x1024.jpg";
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
function DrawWebCamVideo() {
  gl.bindTexture(gl.TEXTURE_2D, TextureWebCam);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video_cam);

  let ViewMatrix = m4.translation(0, 0, 0);
  let projection = m4.orthographic(-CanvasWidth / 2.0, CanvasWidth / 2.0, -CanvasHeight / 2.0, CanvasHeight / 2.0, 1.0, 20000);

  let WorldViewMatrix = m4.multiply(m4.translation(0, 0, -100), ViewMatrix);
  let ModelViewProjection = m4.multiply(projection, WorldViewMatrix);

  gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, ModelViewProjection);

  gl.uniform1i(shProgram.iTexture, 0);

  BackgroundVideoModel.draw();
}
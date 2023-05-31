const fragmentShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
#endif

varying vec2 vTextureCoords;
uniform sampler2D textureU;

void main() {
  vec4 texture = texture2D(textureU, vTextureCoords);
  gl_FragColor = texture;
}`;
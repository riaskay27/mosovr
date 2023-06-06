const vertexShaderSource = `
attribute vec3 vertex;
attribute vec2 textureCoords;

uniform mat4 ModelViewProjectionMatrix;

varying vec2 vTextureCoords;
void main() {

    gl_Position = ModelViewProjectionMatrix * vec4(vertex, 1.0);
    
    vTextureCoords = textureCoords;
}`;
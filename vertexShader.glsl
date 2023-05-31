const vertexShaderSource = `
attribute vec3 vertex;
attribute vec2 textureCoords;

uniform mat4 ModelViewProjectionMatrix;
uniform mat4 ModelViewMatrix, ProjectionMatrix;
varying vec2 vTextureCoords;

void main() {
    vec4 vertexPosition4 = ModelViewMatrix * vec4(vertex, 1.0);
    vec3 vertexPosition = vec3(vertexPosition4) / vertexPosition4.w;
    
    gl_Position = ProjectionMatrix*vertexPosition4;
    
    vTextureCoords = textureCoords;
}`;
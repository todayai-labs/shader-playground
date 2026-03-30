export const chromaBlurVertexShader = /* glsl */`
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const chromaBlurFragmentShader = /* glsl */`
uniform sampler2D tSharp;
uniform sampler2D tBlurred;
varying vec2 vUv;
void main() {
    vec4 sharp = texture2D(tSharp, vUv);
    vec4 blurred = texture2D(tBlurred, vUv);
    float lumSharp = dot(sharp.rgb, vec3(0.2126, 0.7152, 0.0722));
    float lumBlurred = dot(blurred.rgb, vec3(0.2126, 0.7152, 0.0722));
    vec3 color = blurred.rgb * (lumSharp / max(lumBlurred, 0.001));
    gl_FragColor = vec4(color, sharp.a);
}
`;

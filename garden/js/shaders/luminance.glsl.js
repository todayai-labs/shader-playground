export const luminanceVertexShader = /* glsl */`
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const luminanceFragmentShader = /* glsl */`
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() {
    vec4 texel = texture2D(tDiffuse, vUv);
    float lum = dot(texel.rgb, vec3(0.2126, 0.7152, 0.0722));
    gl_FragColor = vec4(lum, lum, lum, 1.0);
}
`;

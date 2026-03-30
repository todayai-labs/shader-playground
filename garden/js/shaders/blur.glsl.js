const basicVert = /* glsl */`
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const HorizontalBlurShader = {
    uniforms: { tDiffuse: { value: null }, h: { value: 1.0 / 512.0 } },
    vertexShader: basicVert,
    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform float h;
        varying vec2 vUv;
        void main() {
            vec4 sum = vec4(0.0);
            sum += texture2D(tDiffuse, vec2(vUv.x - 4.0*h, vUv.y)) * 0.051;
            sum += texture2D(tDiffuse, vec2(vUv.x - 3.0*h, vUv.y)) * 0.0918;
            sum += texture2D(tDiffuse, vec2(vUv.x - 2.0*h, vUv.y)) * 0.12245;
            sum += texture2D(tDiffuse, vec2(vUv.x - 1.0*h, vUv.y)) * 0.1531;
            sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y)) * 0.1633;
            sum += texture2D(tDiffuse, vec2(vUv.x + 1.0*h, vUv.y)) * 0.1531;
            sum += texture2D(tDiffuse, vec2(vUv.x + 2.0*h, vUv.y)) * 0.12245;
            sum += texture2D(tDiffuse, vec2(vUv.x + 3.0*h, vUv.y)) * 0.0918;
            sum += texture2D(tDiffuse, vec2(vUv.x + 4.0*h, vUv.y)) * 0.051;
            gl_FragColor = sum;
        }
    `,
};

export const VerticalBlurShader = {
    uniforms: { tDiffuse: { value: null }, v: { value: 1.0 / 512.0 } },
    vertexShader: basicVert,
    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform float v;
        varying vec2 vUv;
        void main() {
            vec4 sum = vec4(0.0);
            sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y - 4.0*v)) * 0.051;
            sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y - 3.0*v)) * 0.0918;
            sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y - 2.0*v)) * 0.12245;
            sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y - 1.0*v)) * 0.1531;
            sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y)) * 0.1633;
            sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y + 1.0*v)) * 0.1531;
            sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y + 2.0*v)) * 0.12245;
            sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y + 3.0*v)) * 0.0918;
            sum += texture2D(tDiffuse, vec2(vUv.x, vUv.y + 4.0*v)) * 0.051;
            gl_FragColor = sum;
        }
    `,
};

export const LuminanceShader = {
    uniforms: { tDiffuse: { value: null } },
    vertexShader: basicVert,
    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            float lum = dot(texel.rgb, vec3(0.2126, 0.7152, 0.0722));
            gl_FragColor = vec4(lum, lum, lum, 1.0);
        }
    `,
};

export const ChromaBlurCompositeShader = {
    uniforms: {
        tSharp: { value: null },
        tBlurred: { value: null },
    },
    vertexShader: basicVert,
    fragmentShader: /* glsl */`
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
    `,
};

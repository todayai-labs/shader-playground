export const ColorGradeShader = {
    uniforms: {
        tDiffuse: { value: null },
        uColor0: { value: null },
        uColor1: { value: null },
        uColor2: { value: null },
        uStopStrength0: { value: 0.4 },
        uStopStrength1: { value: 0.3 },
        uStopStrength2: { value: 3.0 },
        uBalance: { value: 0.6 },
        uStrength: { value: 0.2 },
        tBlurredLum: { value: null },
    },
    vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform vec3 uColor0;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uStopStrength0;
        uniform float uStopStrength1;
        uniform float uStopStrength2;
        uniform float uBalance;
        uniform float uStrength;
        uniform sampler2D tBlurredLum;
        varying vec2 vUv;

        vec3 lumMatch(vec3 tint, float lum) {
            vec3 w = vec3(0.2126, 0.7152, 0.0722);
            return tint * (lum / max(dot(tint, w), 0.01));
        }

        vec3 rgbToOklab(vec3 c) {
            float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
            float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
            float s = 0.0883024619 * c.r + 0.2024326610 * c.g + 0.6891580758 * c.b;
            l = pow(max(l, 0.0), 1.0 / 3.0);
            m = pow(max(m, 0.0), 1.0 / 3.0);
            s = pow(max(s, 0.0), 1.0 / 3.0);
            return vec3(
                0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
                1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
                0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
            );
        }

        vec3 oklabToRgb(vec3 lab) {
            float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
            float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
            float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
            l = l * l * l; m = m * m * m; s = s * s * s;
            return vec3(
                 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
            );
        }

        vec3 mixOklab(vec3 a, vec3 b, float t) {
            return oklabToRgb(mix(rgbToOklab(a), rgbToOklab(b), t));
        }

        float catmullRom3(float s0, float s1, float s2, float t) {
            float seg = t * 2.0;
            float idx = floor(min(seg, 1.0));
            float f = seg - idx;
            float cr0, cr1, cr2, cr3;
            if (idx < 1.0) { cr0 = s0; cr1 = s0; cr2 = s1; cr3 = s2; }
            else { cr0 = s0; cr1 = s1; cr2 = s2; cr3 = s2; }
            return 0.5 * (
                (2.0 * cr1) +
                (-cr0 + cr2) * f +
                (2.0 * cr0 - 5.0 * cr1 + 4.0 * cr2 - cr3) * f * f +
                (-cr0 + 3.0 * cr1 - 3.0 * cr2 + cr3) * f * f * f
            );
        }

        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            float lum = dot(texel.rgb, vec3(0.2126, 0.7152, 0.0722));
            float blurredLum = texture2D(tBlurredLum, vUv).r;
            float regionWeight = 1.0 - abs(lum - blurredLum);
            float effectiveStrength = uStrength * regionWeight;
            float gradLum = blurredLum;
            float t = gradLum < uBalance
                ? clamp(gradLum / (2.0 * uBalance), 0.0, 0.5)
                : clamp(0.5 + (gradLum - uBalance) / (2.0 * (1.0 - uBalance)), 0.5, 1.0);
            t = smoothstep(0.0, 1.0, t);
            float seg = t * 2.0;
            float i = floor(min(seg, 1.0));
            float f = seg - i;
            vec3 c0 = lumMatch(uColor0, lum);
            vec3 c1 = lumMatch(uColor1, lum);
            vec3 c2 = lumMatch(uColor2, lum);
            vec3 tintTarget = i < 1.0 ? mixOklab(c0, c1, f) : mixOklab(c1, c2, f);
            float tintLum = dot(tintTarget, vec3(0.2126, 0.7152, 0.0722));
            tintTarget *= lum / max(tintLum, 0.001);
            float stopStrength = catmullRom3(uStopStrength0, uStopStrength1, uStopStrength2, t);
            stopStrength = clamp(stopStrength, 0.0, 1.0);
            vec3 tinted = mix(texel.rgb, tintTarget, effectiveStrength * stopStrength);
            gl_FragColor = vec4(tinted, texel.a);
        }
    `,
};

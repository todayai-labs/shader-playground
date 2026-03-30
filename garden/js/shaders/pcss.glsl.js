import * as THREE from 'three';

const pcssGlsl = /* glsl */`
#define PENUMBRA_FILTER_SIZE float(15)
#define RGB_NOISE_FUNCTION(uv) (randRGB(uv))

vec3 randRGB(vec2 uv) {
    return vec3(
        fract(sin(dot(uv, vec2(12.75613, 38.12123))) * 13234.76575),
        fract(sin(dot(uv, vec2(19.45531, 58.46547))) * 43678.23431),
        fract(sin(dot(uv, vec2(23.67817, 78.23121))) * 93567.23423)
    );
}

vec3 lowPassRandRGB(vec2 uv) {
    vec3 result = vec3(0);
    result += RGB_NOISE_FUNCTION(uv + vec2(-1.0, -1.0));
    result += RGB_NOISE_FUNCTION(uv + vec2(-1.0,  0.0));
    result += RGB_NOISE_FUNCTION(uv + vec2(-1.0, +1.0));
    result += RGB_NOISE_FUNCTION(uv + vec2( 0.0, -1.0));
    result += RGB_NOISE_FUNCTION(uv + vec2( 0.0,  0.0));
    result += RGB_NOISE_FUNCTION(uv + vec2( 0.0, +1.0));
    result += RGB_NOISE_FUNCTION(uv + vec2(+1.0, -1.0));
    result += RGB_NOISE_FUNCTION(uv + vec2(+1.0,  0.0));
    result += RGB_NOISE_FUNCTION(uv + vec2(+1.0, +1.0));
    result *= 0.111111111;
    return result;
}

vec3 highPassRandRGB(vec2 uv) {
    return RGB_NOISE_FUNCTION(uv) - lowPassRandRGB(uv) + 0.5;
}

vec2 vogelDiskSample(int sampleIndex, int sampleCount, float angle) {
    const float goldenAngle = 2.399963f;
    float r = sqrt(float(sampleIndex) + 0.5f) / sqrt(float(sampleCount));
    float theta = float(sampleIndex) * goldenAngle + angle;
    return vec2(cos(theta), sin(theta)) * r;
}

float penumbraSize(const in float zReceiver, const in float zBlocker) {
    return (zReceiver - zBlocker) / zBlocker;
}

float findBlocker(sampler2D shadowMap, vec2 uv, float compare, float angle) {
    float texelSize = 1.0 / float(textureSize(shadowMap, 0).x);
    float blockerDepthSum = float(0);
    float blockers = 0.0;
    vec2 bOffset;
    float bDepth;
    for(int i = 0; i < 30; i++) {
        bOffset = (vogelDiskSample(i, 30, angle) * texelSize) * 2.0 * PENUMBRA_FILTER_SIZE;
        bDepth = unpackRGBAToDepth(texture2D(shadowMap, uv + bOffset));
        if (bDepth < compare) {
            blockerDepthSum += bDepth;
            blockers++;
        }
    }
    if (blockers > 0.0) return blockerDepthSum / blockers;
    return -1.0;
}

float vogelFilter(sampler2D shadowMap, vec2 uv, float zReceiver, float filterRadius, float angle) {
    float texelSize = 1.0 / float(textureSize(shadowMap, 0).x);
    float shadow = 0.0;
    vec2 vSample;
    vec2 vOffset;
    for (int i = 0; i < 30; i++) {
        vSample = vogelDiskSample(i, 30, angle) * texelSize;
        vOffset = vSample * (1.0 + filterRadius * float(15));
        shadow += step(zReceiver, unpackRGBAToDepth(texture2D(shadowMap, uv + vOffset)));
    }
    return shadow / 30.0;
}

float PCSS(sampler2D shadowMap, vec4 coords) {
    vec2 uv = coords.xy;
    float zReceiver = coords.z;
    float angle = highPassRandRGB(gl_FragCoord.xy).r * PI2;
    float avgBlockerDepth = findBlocker(shadowMap, uv, zReceiver, angle);
    if (avgBlockerDepth == -1.0) return 1.0;
    float penumbraRatio = penumbraSize(zReceiver, avgBlockerDepth);
    return vogelFilter(shadowMap, uv, zReceiver, 1.25 * penumbraRatio, angle);
}
`;

export function installPCSS() {
    THREE.ShaderChunk.shadowmap_pars_fragment = THREE.ShaderChunk.shadowmap_pars_fragment
        .replace('#ifdef USE_SHADOWMAP', '#ifdef USE_SHADOWMAP\n' + pcssGlsl)
        .replace(
            '#if defined( SHADOWMAP_TYPE_PCF )',
            '\nreturn PCSS(shadowMap, shadowCoord);\n#if defined( SHADOWMAP_TYPE_PCF )'
        );
}

export const branchWindUniforms = /* glsl */`
uniform float uTime;
uniform float uWindSpeed;
uniform float uGustStrength;
uniform float uGustFrequency;
uniform float uSeed;
uniform vec3 uWindDirWorld;

float windNoise(float t, float seed) {
    float n = sin(t * 1.0 + seed);
    n += 0.7 * sin(t * 0.7071 + seed * 1.3);
    n += 0.5 * cos(t * 0.4533 + seed * 2.1);
    n += 0.3 * sin(t * 0.2347 + seed * 3.7);
    return n / 2.5;
}
`;

export const branchWindVertex = /* glsl */`
#include <begin_vertex>
{
    float along = pow(uv.x, 2.0);
    float speedFactor = uWindSpeed / 15.0;
    float t = uTime * uGustFrequency;
    float noise = windNoise(t * 2.3 + 5.0, uSeed + 100.0);
    float gust = 1.0 + uGustStrength * sin(t * 0.31 + uSeed * 0.7);
    float amplitude = along * speedFactor * gust * 0.06;
    vec3 windLocal = normalize((vec4(uWindDirWorld, 0.0) * modelMatrix).xyz);
    transformed.x += windLocal.x * amplitude * noise;
    transformed.z += windLocal.z * amplitude * noise;
}
`;

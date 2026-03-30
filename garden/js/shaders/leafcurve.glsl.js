export const leafCurveUniforms = /* glsl */`
uniform float uCurvature;
uniform float uLeafSize;
`;

export const leafCurveVertex = /* glsl */`
#include <begin_vertex>
float halfSize = uLeafSize * 0.5;
float baseRadius = (uLeafSize / 3.14159265) * 2.0;
float bendDepth = (baseRadius - sqrt(baseRadius * baseRadius - halfSize * halfSize)) * uCurvature;
vec2 a = vec2(0.0, 0.0);
vec2 b = vec2(halfSize, bendDepth);
vec2 c = vec2(uLeafSize, 0.0);
vec2 ab = a - b;
vec2 bc = b - c;
vec2 ac = a - c;
float abLen = length(ab);
float bcLen = length(bc);
float acLen = length(ac);
float crossAC = ab.x * ac.y - ab.y * ac.x;
float circR = (abLen * bcLen * acLen) / (2.0 * abs(crossAC));
vec2 center = vec2(halfSize, bendDepth - circR);
float angleA = atan(a.y - center.y, a.x - center.x);
float angleC = atan(c.y - center.y, c.x - center.x);
float arcAngle = angleA - angleC;
float t = clamp(transformed.x / uLeafSize, 0.0, 1.0);
float angle = angleC + arcAngle * (1.0 - t);
vec2 p = center + circR * vec2(cos(angle), sin(angle));
transformed.x = p.x;
transformed.z -= p.y;
`;

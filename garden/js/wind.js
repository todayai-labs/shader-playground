import * as THREE from 'three';
import { branchAnimTargets, leafAnimTargets } from './tree.js';

const DEG2RAD = Math.PI / 180;

export const WIND_CONFIG = {
    direction: [1, 0.3],
    speed: 45,
    gustStrength: 0.4,
    gustFrequency: 0.8,
    inertia: 4,
};

const dir2d = new THREE.Vector2(...WIND_CONFIG.direction).normalize();

export const windUniforms = {
    uTime: { value: 0 },
    uWindDir: { value: dir2d },
    uWindSpeed: { value: WIND_CONFIG.speed },
    uGustStrength: { value: WIND_CONFIG.gustStrength },
    uGustFrequency: { value: WIND_CONFIG.gustFrequency },
    uSeed: { value: 0 },
    uWindDirWorld: { value: new THREE.Vector3(dir2d.x, 0, dir2d.y).normalize() },
};

function windNoise(t, seed) {
    let n = Math.sin(t * 1.0 + seed);
    n += 0.7 * Math.sin(t * 0.7071 + seed * 1.3);
    n += 0.5 * Math.cos(t * 0.4533 + seed * 2.1);
    n += 0.3 * Math.sin(t * 0.2347 + seed * 3.7);
    return n / 2.5;
}

function twigWindNoise(t, seed) {
    let n = Math.sin(1.8 * t + seed);
    n += 0.6 * Math.sin(1.27 * t + seed * 1.5);
    n += 0.4 * Math.cos(0.81 * t + seed * 2.3);
    n += 0.25 * Math.sin(0.42 * t + seed * 3.9);
    return n / 2.25;
}

export function updateWind(time, delta) {
    windUniforms.uTime.value = time;

    const speed = WIND_CONFIG.speed;
    const gustStrength = WIND_CONFIG.gustStrength;
    const gustFreq = WIND_CONFIG.gustFrequency;
    const smoothing = 1 - Math.exp(-WIND_CONFIG.inertia * delta);

    for (const target of branchAnimTargets) {
        const { ref, seed, levelFactor, stiffness, isTwig } = target;
        if (!ref) continue;

        let noise, amplitude;
        if (isTwig) {
            noise = twigWindNoise(time * gustFreq * 1.5, seed);
            amplitude = (speed / 15) * (1 + gustStrength * Math.sin(0.31 * time + 0.7 * seed)) * noise * 0.6 / stiffness;
            const targetRotX = 3.5 * amplitude * DEG2RAD;
            const targetRotY = 2.0 * amplitude * DEG2RAD;
            ref.rotation.x += (targetRotX - ref.rotation.x) * smoothing;
            ref.rotation.y += (targetRotY - ref.rotation.y) * smoothing;
        } else {
            noise = windNoise(time * gustFreq, seed);
            amplitude = (speed / 15) * (1 + gustStrength * Math.sin(0.31 * time + 0.7 * seed)) * noise
                * (0.36 + 1.44 * levelFactor) / stiffness;
            const targetRotX = 1.8 * amplitude * DEG2RAD;
            const targetRotY = 1.2 * amplitude * DEG2RAD;
            ref.rotation.x += (targetRotX - ref.rotation.x) * smoothing;
            ref.rotation.y += (targetRotY - ref.rotation.y) * smoothing;
        }
    }

    for (const target of leafAnimTargets) {
        const { mesh, curvatureUniform, leafCurve, randomOffset, randomAmplitude, stiffness } = target;
        if (!mesh) continue;
        const sway = Math.sin(time * speed / 10 + randomOffset) * (randomAmplitude / (randomAmplitude * stiffness));
        curvatureUniform.value = leafCurve * (1 + 0.4 * sway);
        const flutter = Math.sin(time * speed * 3.5 / 10 + 2 * randomOffset) * sway;
        mesh.rotation.x = 0.2094 * flutter;
        mesh.rotation.y = 0.2094 * flutter * 0.3;
    }
}

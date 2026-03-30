import * as THREE from 'three';

const FLAP_IDLE = [
    { t: 0,    angle: -0.65 * Math.PI / 2, y: 0,     curl: 0.15, tilt: 0 },
    { t: 0.15, angle: -0.5 * Math.PI / 2,  y: 0.05,  curl: 0.2,  tilt: 0.05 },
    { t: 0.35, angle: -0.1 * Math.PI / 6,  y: 0.1,   curl: 0.35, tilt: 0.1 },
    { t: 0.45, angle: 0.3 * Math.PI / 6,   y: 0.08,  curl: 0.25, tilt: 0.08 },
    { t: 0.55, angle: 0.5 * Math.PI / 6,   y: 0.05,  curl: 0.15, tilt: 0.05 },
    { t: 0.6,  angle: 0.3 * Math.PI / 6,   y: 0,     curl: 0.1,  tilt: 0 },
    { t: 0.7,  angle: -0.1 * Math.PI / 6,  y: -0.05, curl: 0.15, tilt: -0.05 },
    { t: 0.8,  angle: -0.4 * Math.PI / 2,  y: -0.08, curl: 0.2,  tilt: -0.08 },
    { t: 0.9,  angle: -0.6 * Math.PI / 2,  y: -0.05, curl: 0.15, tilt: -0.05 },
    { t: 1,    angle: -0.65 * Math.PI / 2, y: 0,     curl: 0.15, tilt: 0 },
];

const FLAP_FAST = [
    { t: 0,    angle: -0.6 * Math.PI / 2, y: 0,    curl: 0.1, tilt: 0 },
    { t: 0.25, angle: 0.3 * Math.PI / 6,  y: 0.05, curl: 0.3, tilt: 0.05 },
    { t: 0.5,  angle: 0.5 * Math.PI / 6,  y: 0.08, curl: 0.2, tilt: 0.08 },
    { t: 0.75, angle: -0.2 * Math.PI / 6, y: 0.03, curl: 0.15, tilt: 0 },
    { t: 1,    angle: -0.6 * Math.PI / 2, y: 0,    curl: 0.1, tilt: 0 },
];

function catmullRomScalar(p0, p1, p2, p3, t) {
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

function sampleFlapFrame(keyframes, normalizedT) {
    const t = normalizedT % 1;
    let idx = 0;
    for (let i = 0; i < keyframes.length - 1; i++) {
        if (t >= keyframes[i].t && t <= keyframes[i + 1].t) { idx = i; break; }
    }
    const segT = (t - keyframes[idx].t) / (keyframes[idx + 1].t - keyframes[idx].t);
    const i0 = Math.max(0, idx - 1);
    const i1 = idx;
    const i2 = Math.min(keyframes.length - 1, idx + 1);
    const i3 = Math.min(keyframes.length - 1, idx + 2);
    return {
        angle: catmullRomScalar(keyframes[i0].angle, keyframes[i1].angle, keyframes[i2].angle, keyframes[i3].angle, segT),
        y: catmullRomScalar(keyframes[i0].y, keyframes[i1].y, keyframes[i2].y, keyframes[i3].y, segT),
        curl: catmullRomScalar(keyframes[i0].curl, keyframes[i1].curl, keyframes[i2].curl, keyframes[i3].curl, segT),
        tilt: catmullRomScalar(keyframes[i0].tilt, keyframes[i1].tilt, keyframes[i2].tilt, keyframes[i3].tilt, segT),
    };
}

function buildFlightPath(from, to) {
    const pts = [from.clone()];
    const mid = new THREE.Vector3().lerpVectors(from, to, 0.5);
    const count = 5 + Math.floor(Math.random() * 3);
    for (let i = 1; i < count; i++) {
        const t = i / count;
        const p = new THREE.Vector3().lerpVectors(from, to, t);
        p.x += (Math.random() - 0.5) * 4;
        p.y += Math.sin(t * Math.PI) * (2 + Math.random() * 3) + (Math.random() - 0.5) * 2;
        p.z += (Math.random() - 0.5) * 4;
        pts.push(p);
    }
    pts.push(to.clone());
    return new THREE.CatmullRomCurve3(pts);
}

class Butterfly {
    constructor(startPos) {
        this.group = new THREE.Group();
        this.group.position.copy(startPos);
        this.group.scale.setScalar(0.12);

        const wingGeo = new THREE.PlaneGeometry(1.5, 2, 6, 6);
        wingGeo.translate(0.75, 0, 0);
        const wingMat = new THREE.MeshStandardMaterial({
            color: 0xf5f0e8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0,
        });

        this.leftWing = new THREE.Mesh(wingGeo.clone(), wingMat.clone());
        this.rightWing = new THREE.Mesh(wingGeo.clone(), wingMat.clone());
        this.rightWing.scale.x = -1;
        this.leftWing.castShadow = true;
        this.rightWing.castShadow = true;

        this.leftOrigPositions = new Float32Array(this.leftWing.geometry.attributes.position.array);
        this.rightOrigPositions = new Float32Array(this.rightWing.geometry.attributes.position.array);

        this.group.add(this.leftWing);
        this.group.add(this.rightWing);

        this.state = 'resting';
        this.restTimer = 1 + Math.random() * 3;
        this.flightPath = null;
        this.flightProgress = 0;
        this.flapTime = Math.random() * 10;
        this.flapSpeed = 2 + Math.random();
        this.flightSpeed = 0.15 + Math.random() * 0.1;
    }

    pickNewTarget(bounds) {
        return new THREE.Vector3(
            (Math.random() - 0.5) * bounds,
            0.5 + Math.random() * 3,
            (Math.random() - 0.5) * bounds,
        );
    }

    update(delta) {
        this.flapTime += delta * this.flapSpeed;

        if (this.state === 'resting') {
            const frame = sampleFlapFrame(FLAP_IDLE, (this.flapTime * 0.3) % 1);
            this.applyWingFrame(frame);
            this.restTimer -= delta;
            if (this.restTimer <= 0) {
                const target = this.pickNewTarget(20);
                this.flightPath = buildFlightPath(this.group.position, target);
                this.flightProgress = 0;
                this.state = 'flying';
            }
        } else if (this.state === 'flying') {
            const frame = sampleFlapFrame(FLAP_FAST, (this.flapTime * 2) % 1);
            this.applyWingFrame(frame);

            this.flightProgress += delta * this.flightSpeed;
            if (this.flightProgress >= 1) {
                this.flightProgress = 1;
                this.state = 'resting';
                this.restTimer = 3 + Math.random() * 2;
            }
            const pos = this.flightPath.getPointAt(Math.min(this.flightProgress, 0.999));
            const lookAhead = this.flightPath.getPointAt(Math.min(this.flightProgress + 0.01, 0.999));
            this.group.position.copy(pos);
            this.group.lookAt(lookAhead);
        }
    }

    applyWingFrame(frame) {
        this.leftWing.rotation.y = frame.angle;
        this.rightWing.rotation.y = -frame.angle;

        this.curlWing(this.leftWing, this.leftOrigPositions, frame.curl);
        this.curlWing(this.rightWing, this.rightOrigPositions, -frame.curl);
    }

    curlWing(wing, origPositions, curl) {
        const pos = wing.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const ox = origPositions[i * 3];
            const curlAngle = curl * ox * 2;
            pos.setX(i, ox * Math.cos(curlAngle));
            pos.setZ(i, ox * Math.sin(curlAngle));
        }
        pos.needsUpdate = true;
    }
}

export function createButterflies(scene, count = 4) {
    const butterflies = [];
    for (let i = 0; i < count; i++) {
        const startPos = new THREE.Vector3(
            (Math.random() - 0.5) * 16,
            1 + Math.random() * 3,
            (Math.random() - 0.5) * 16,
        );
        const b = new Butterfly(startPos);
        scene.add(b.group);
        butterflies.push(b);
    }
    return butterflies;
}

export function updateButterflies(butterflies, delta) {
    for (const b of butterflies) {
        b.update(delta);
    }
}

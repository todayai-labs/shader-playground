import * as THREE from 'three';

const DEG2RAD = Math.PI / 180;
const LIGHT_DIR_NEG = new THREE.Vector3(5, -42, 42).normalize();

export const leafAnimTargets = [];
export const branchAnimTargets = [];

export const TREE_CONFIGS = [
    {
        position: [2, -1, -16], rotation: [0, 0, 5],
        settings: {
            maxLevel: 3, startLength: 6, startRadius: 0.3,
            radiusFactor: 0.9, lengthFactor: 0.65,
            branchesPerBranch: 3, tropism: [0, -0.02, 0],
            curveTopAngle: -90, curveBottomAngle: 90,
            firstLevelTopAngle: -80,
            twigsPerBranch: 3, leavesPerTwig: 5,
            twigLength: 1, twigVariability: 0.1,
            leafSize: 1.1, leafCurve: 1,
            leafArrangement: { whorled: 2, jitterDeg: 15 },
            turnLeavesTowardsLight: true, lightFacingThresholdDeg: 30,
            leafTipTaper: 0.5, leafTipInclination: 95,
            leafTexture: 'leaves/leaf.png',
            tubularSegments: 10, radialSegments: 12, curveRes: 30,
            branchStiffness: 1, leafStiffness: 1,
        },
    },
    {
        position: [16, 5, -3], rotation: [-35, 0, 45],
        settings: {
            maxLevel: 2, startLength: 10, startRadius: 0.5,
            radiusFactor: 0.8, lengthFactor: 0.65,
            branchesPerBranch: 4, tropism: [0, -0.02, 0],
            curveTopAngle: -90, curveBottomAngle: 90,
            firstLevelTopAngle: null,
            twigsPerBranch: 3, leavesPerTwig: 10,
            twigLength: 2.5, twigVariability: 0.1,
            leafSize: 1, leafCurve: 1,
            leafArrangement: 'flat',
            turnLeavesTowardsLight: true, lightFacingThresholdDeg: 40,
            leafTipTaper: 0.5, leafTipInclination: 95,
            leafTexture: 'leaves/leaf.png',
            tubularSegments: 12, radialSegments: 12, curveRes: 30,
            branchStiffness: 10, leafStiffness: 0.5,
        },
    },
    {
        position: [-22, 18, -16], rotation: [-25, 10, -60],
        settings: {
            maxLevel: 3, startLength: 9, startRadius: 0.58,
            radiusFactor: 0.83, lengthFactor: 0.82,
            branchesPerBranch: 4, tropism: [0, -0.02, 0],
            curveTopAngle: -78, curveBottomAngle: 90,
            firstLevelTopAngle: -80,
            twigsPerBranch: 1, leavesPerTwig: 3,
            twigLength: 2.5, twigVariability: 0.1,
            leafSize: 2.6, leafCurve: 1,
            leafArrangement: 'flat',
            turnLeavesTowardsLight: true, lightFacingThresholdDeg: 50,
            leafTipTaper: 0.5, leafTipInclination: 95,
            leafTexture: 'leaves/leaves2.png',
            tubularSegments: 12, radialSegments: 12, curveRes: 30,
            branchStiffness: 3, leafStiffness: 3,
        },
    },
];

class StrongTubeGeometry extends THREE.BufferGeometry {
    constructor(path, tubularSegments = 64, radiusFn = () => 1, radialSegments = 8, closed = false) {
        super();
        const frames = path.computeFrenetFrames(tubularSegments, closed);
        const vertices = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        for (let i = 0; i <= tubularSegments; i++) {
            const t = i / tubularSegments;
            const r = radiusFn(t);
            const P = path.getPointAt(t);
            const N = frames.normals[i];
            const B = frames.binormals[i];
            for (let j = 0; j <= radialSegments; j++) {
                const v = (j / radialSegments) * Math.PI * 2;
                const sin_v = Math.sin(v);
                const cos_v = Math.cos(v);
                const nx = cos_v * N.x + sin_v * B.x;
                const ny = cos_v * N.y + sin_v * B.y;
                const nz = cos_v * N.z + sin_v * B.z;
                vertices.push(P.x + r * nx, P.y + r * ny, P.z + r * nz);
                normals.push(nx, ny, nz);
                uvs.push(t, j / radialSegments);
            }
        }

        for (let i = 0; i < tubularSegments; i++) {
            for (let j = 0; j < radialSegments; j++) {
                const a = i * (radialSegments + 1) + j;
                const b = (i + 1) * (radialSegments + 1) + j;
                const c = (i + 1) * (radialSegments + 1) + (j + 1);
                const d = i * (radialSegments + 1) + (j + 1);
                indices.push(a, b, d, b, c, d);
            }
        }

        this.setIndex(indices);
        this.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        this.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        this.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    }
}

function buildBranchCurve(length, curveRes, level, maxLevel, curveTopAngle, curveBottomAngle, curveV, tropism, firstLevelTopAngle) {
    const points = [];
    const step = length / curveRes;
    let pos = new THREE.Vector3(0, 0, 0);
    let dir = new THREE.Vector3(0, 1, 0);
    const rotAxis = new THREE.Vector3(1, 0, 0);
    const quat = new THREE.Quaternion();
    const curveVRad = curveV * DEG2RAD;

    for (let i = 0; i <= curveRes; i++) {
        let curveAngle = 0;
        if (level > 0) {
            const topAngle = (level === 1 && firstLevelTopAngle != null) ? firstLevelTopAngle : curveTopAngle;
            curveAngle = i < curveRes / 2
                ? topAngle * (1 - level / maxLevel / 4) / curveRes
                : curveBottomAngle * (1 - level / maxLevel / 4) / curveRes;
        }
        const randomCurve = Math.random() * curveVRad;
        quat.setFromAxisAngle(rotAxis, (curveAngle + randomCurve) * DEG2RAD);
        dir.applyQuaternion(quat).normalize();
        if (level > 0) {
            dir.add(new THREE.Vector3(...tropism)).normalize();
        }
        pos = pos.clone().add(dir.clone().multiplyScalar(step));
        points.push(pos);
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const baseOffset = curve.getPointAt(0);
    points.forEach(p => p.sub(baseOffset));
    return new THREE.CatmullRomCurve3(points);
}

function curveLeafGeometry(geometry, leafSize, leafCurve) {
    const halfWidth = leafSize / 2;
    const baseRadius = (leafSize / Math.PI) * 2;
    const sagitta = (baseRadius - Math.sqrt(baseRadius * baseRadius - halfWidth * halfWidth)) * leafCurve;

    const left = new THREE.Vector2(-halfWidth, 0);
    const mid = new THREE.Vector2(0, sagitta);
    const right = new THREE.Vector2(halfWidth, 0);

    const a = new THREE.Vector2().subVectors(left, mid);
    const b = new THREE.Vector2().subVectors(mid, right);
    const c = new THREE.Vector2().subVectors(left, right);
    const R = a.length() * b.length() * c.length() / (2 * Math.abs(a.cross(c)));
    const center = new THREE.Vector2(0, sagitta - R);
    const totalArc = (new THREE.Vector2().subVectors(left, center).angle() - Math.PI / 2) * 2;

    const { uv, position } = geometry.attributes;
    const point = new THREE.Vector2();
    for (let i = 0; i < uv.count; i++) {
        const u = 1 - uv.getX(i);
        const y = position.getY(i);
        point.copy(right).rotateAround(center, totalArc * u);
        position.setXYZ(i, point.x, y, -point.y);
    }
    position.needsUpdate = true;
}

const textureCache = new Map();
const geometryCache = new Map();

function getLeafTexture(path) {
    if (textureCache.has(path)) return textureCache.get(path);
    const tex = new THREE.TextureLoader().load(path);
    tex.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(path, tex);
    return tex;
}

function getLeafGeometry(leafSize, leafCurve) {
    const key = `${leafSize}_${leafCurve}`;
    if (geometryCache.has(key)) return geometryCache.get(key);
    const geo = new THREE.PlaneGeometry(leafSize, leafSize, 20, 20);
    geo.translate(leafSize / 2, 0.5, 0);
    curveLeafGeometry(geo, leafSize, leafCurve);
    geometryCache.set(key, geo);
    return geo;
}

function createLeaf(settings, parentTangent, phyllotaxisAngle, twigT, windUniforms) {
    const { leafSize, leafCurve, leafTipTaper, leafTipInclination, turnLeavesTowardsLight, lightFacingThresholdDeg } = settings;

    const size = leafSize * THREE.MathUtils.lerp(1, leafTipTaper, twigT);
    const geo = getLeafGeometry(size, leafCurve).clone();
    const tex = getLeafTexture(settings.leafTexture);

    const curvatureUniform = { value: leafCurve };
    const leafSizeUniform = { value: size };

    const mat = new THREE.MeshStandardMaterial({
        map: tex,
        side: THREE.DoubleSide,
        transparent: true,
        alphaMap: tex,
        alphaTest: 0.001,
        opacity: 0,
    });

    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uCurvature = curvatureUniform;
        shader.uniforms.uLeafSize = leafSizeUniform;
        shader.vertexShader = 'uniform float uCurvature;\nuniform float uLeafSize;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', /* glsl */`
            #include <begin_vertex>
            float halfSize = uLeafSize * 0.5;
            float baseRadius = (uLeafSize / 3.14159265) * 2.0;
            float bendDepth = (baseRadius - sqrt(baseRadius * baseRadius - halfSize * halfSize)) * uCurvature;
            vec2 va = vec2(0.0, 0.0);
            vec2 vb = vec2(halfSize, bendDepth);
            vec2 vc = vec2(uLeafSize, 0.0);
            vec2 vab = va - vb; vec2 vbc = vb - vc; vec2 vac = va - vc;
            float abLen = length(vab); float bcLen = length(vbc); float acLen = length(vac);
            float crossAC = vab.x * vac.y - vab.y * vac.x;
            float circR = (abLen * bcLen * acLen) / (2.0 * abs(crossAC));
            vec2 ctr = vec2(halfSize, bendDepth - circR);
            float angleA = atan(va.y - ctr.y, va.x - ctr.x);
            float angleC = atan(vc.y - ctr.y, vc.x - ctr.x);
            float arcAngle = angleA - angleC;
            float lt = clamp(transformed.x / uLeafSize, 0.0, 1.0);
            float la = angleC + arcAngle * (1.0 - lt);
            vec2 lp = ctr + circR * vec2(cos(la), sin(la));
            transformed.x = lp.x;
            transformed.z -= lp.y;
        `);
    };

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;

    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), parentTangent.clone().normalize());
    const rollQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), phyllotaxisAngle);
    const tiltQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), leafTipInclination * DEG2RAD);
    q.multiply(rollQ).multiply(tiltQ);
    mesh.quaternion.copy(q);

    if (turnLeavesTowardsLight) {
        const leafNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
        const angleToDot = leafNormal.dot(LIGHT_DIR_NEG);
        const thresholdCos = Math.cos(lightFacingThresholdDeg * DEG2RAD);
        if (angleToDot < thresholdCos) {
            const targetQ = new THREE.Quaternion();
            targetQ.setFromUnitVectors(new THREE.Vector3(0, 0, 1), LIGHT_DIR_NEG);
            const weight = 0.7 + Math.random() * 0.2;
            q.slerp(targetQ, weight);
            mesh.quaternion.copy(q);
        }
    }

    const randomOffset = Math.random() * Math.PI * 2;
    const randomAmplitude = 5 + 5 * Math.random();

    leafAnimTargets.push({ mesh, curvatureUniform, leafCurve, randomOffset, randomAmplitude, stiffness: settings.leafStiffness });

    return mesh;
}

function createTwig(parentCurve, parentT, parentRadius, settings, windUniforms) {
    const { twigLength, twigVariability, leavesPerTwig, leafArrangement } = settings;
    const group = new THREE.Group();
    const len = twigLength * (1 + (Math.random() - 0.5) * twigVariability * 2);

    const parentPoint = parentCurve.getPointAt(parentT);
    const parentTangent = parentCurve.getTangentAt(parentT);
    group.position.copy(parentPoint);

    const twigPoints = [];
    const step = len / 6;
    let pos = new THREE.Vector3(0, 0, 0);
    let dir = parentTangent.clone().normalize();
    const rotAxis = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    const quat = new THREE.Quaternion();

    for (let i = 0; i <= 6; i++) {
        twigPoints.push(pos.clone());
        const angle = (Math.random() - 0.5) * 10 * DEG2RAD;
        quat.setFromAxisAngle(rotAxis, angle);
        dir.applyQuaternion(quat).normalize();
        pos = pos.clone().add(dir.clone().multiplyScalar(step));
    }

    const twigCurve = new THREE.CatmullRomCurve3(twigPoints);
    const twigRadiusFn = (t) => parentRadius * 0.15 * (1 - t * 0.8);
    const twigGeo = new StrongTubeGeometry(twigCurve, 6, twigRadiusFn, 4);
    const twigMat = new THREE.ShadowMaterial({ transparent: true, opacity: 0 });
    const twigMesh = new THREE.Mesh(twigGeo, twigMat);
    twigMesh.castShadow = true;
    group.add(twigMesh);

    const seed = Math.random() * 1000;
    branchAnimTargets.push({
        ref: group,
        seed,
        levelFactor: 1.0,
        stiffness: settings.leafStiffness,
        isTwig: true,
    });

    for (let i = 0; i < leavesPerTwig; i++) {
        const t = (i + 0.5) / leavesPerTwig;
        const twigPos = twigCurve.getPointAt(Math.min(t, 0.99));
        const twigTan = twigCurve.getTangentAt(Math.min(t, 0.99));

        let phyllotaxisAngle;
        if (leafArrangement === 'flat') {
            phyllotaxisAngle = (i % 2 === 0 ? 1 : -1) * (45 + Math.random() * 20) * DEG2RAD;
        } else {
            const whorled = leafArrangement.whorled || 2;
            const jitter = (leafArrangement.jitterDeg || 15) * DEG2RAD;
            phyllotaxisAngle = (i % whorled) * (2 * Math.PI / whorled) + (Math.random() - 0.5) * jitter;
        }

        const leaf = createLeaf(settings, twigTan, phyllotaxisAngle, t, windUniforms);
        leaf.position.copy(twigPos);
        group.add(leaf);
    }

    return group;
}

function buildBranch(scene, parentGroup, level, length, radius, settings, windUniforms) {
    const {
        maxLevel, radiusFactor, lengthFactor, branchesPerBranch, tropism,
        curveTopAngle, curveBottomAngle, firstLevelTopAngle,
        twigsPerBranch,
        tubularSegments, radialSegments, curveRes, branchStiffness,
    } = settings;

    const group = new THREE.Group();
    parentGroup.add(group);

    const curve = buildBranchCurve(
        length, curveRes, level, maxLevel,
        curveTopAngle, curveBottomAngle, 0, tropism, firstLevelTopAngle
    );

    const radiusFn = (t) => radius * (1 - t * (1 - radiusFactor)) + 0.1 * Math.pow(0.5 * Math.sin(10 * t) + 0.3, 3);
    const geo = new StrongTubeGeometry(curve, tubularSegments, radiusFn, radialSegments);
    const mat = new THREE.ShadowMaterial({ transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    group.add(mesh);

    const seed = Math.random() * 1000;
    if (level > 0) {
        branchAnimTargets.push({
            ref: group,
            seed,
            levelFactor: level / maxLevel,
            stiffness: branchStiffness,
            isTwig: false,
        });
    }

    if (level > 0) {
        for (let i = 0; i < twigsPerBranch; i++) {
            const t = 0.3 + (0.65 * (i + 0.5)) / twigsPerBranch;
            const twig = createTwig(curve, Math.min(t, 0.99), radiusFn(t), settings, windUniforms);
            group.add(twig);
        }
    }

    if (level < maxLevel) {
        const numChildren = Math.max(1, branchesPerBranch - (level));
        const startT = Math.max(0.1, 0.4 - 0.4 * level / maxLevel);

        for (let i = 1; i <= numChildren; i++) {
            const jitter = (Math.random() - 0.5) * 0.05;
            const t = startT + (1 - startT - 0.05) * i / numChildren + jitter;
            const clampedT = Math.min(Math.max(t, 0.01), 0.99);
            const spawnPos = curve.getPointAt(clampedT);
            const spawnTan = curve.getTangentAt(clampedT);

            const childGroup = new THREE.Group();
            childGroup.position.copy(spawnPos);

            const yAxisQ = new THREE.Quaternion();
            const spiralAngle = 137.508 * DEG2RAD * i + (Math.random() - 0.5) * 45 * DEG2RAD;
            yAxisQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), spiralAngle);

            const alignQ = new THREE.Quaternion();
            alignQ.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spawnTan.normalize());
            childGroup.quaternion.copy(alignQ).multiply(yAxisQ);

            group.add(childGroup);

            const childLength = length * lengthFactor;
            const childRadius = radiusFn(clampedT) * 0.7;
            buildBranch(scene, childGroup, level + 1, childLength, childRadius, settings, windUniforms);
        }
    }
}

export function createTree(scene, config, windUniforms) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(...config.position);
    treeGroup.rotation.set(
        config.rotation[0] * DEG2RAD,
        config.rotation[1] * DEG2RAD,
        config.rotation[2] * DEG2RAD
    );
    scene.add(treeGroup);

    buildBranch(scene, treeGroup, 0, config.settings.startLength, config.settings.startRadius, config.settings, windUniforms);

    return treeGroup;
}

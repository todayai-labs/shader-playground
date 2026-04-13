import * as THREE from 'three';
import { createTree, TREE_CONFIGS } from './tree.js';
import { windUniforms, updateWind } from './wind.js';
import { createButterflies, updateButterflies } from './butterfly.js';
import { createPostProcessing } from './postprocessing.js';

// PCSS soft shadows - inline to avoid caching issues
(function installPCSS() {
    const pcss = `
#define PENUMBRA_FILTER_SIZE float(15)
vec3 pcssRandRGB(vec2 uv){return vec3(fract(sin(dot(uv,vec2(12.75613,38.12123)))*13234.76575),fract(sin(dot(uv,vec2(19.45531,58.46547)))*43678.23431),fract(sin(dot(uv,vec2(23.67817,78.23121)))*93567.23423));}
vec3 pcssLowPass(vec2 uv){vec3 r=vec3(0);for(int dx=-1;dx<=1;dx++)for(int dy=-1;dy<=1;dy++)r+=pcssRandRGB(uv+vec2(float(dx),float(dy)));return r*0.111111111;}
vec3 pcssHighPass(vec2 uv){return pcssRandRGB(uv)-pcssLowPass(uv)+0.5;}
vec2 pcssVogelDisk(int idx,int cnt,float ang){float r=sqrt(float(idx)+0.5)/sqrt(float(cnt));float th=float(idx)*2.399963+ang;return vec2(cos(th),sin(th))*r;}
float pcssFindBlocker(sampler2D sm,vec2 uv,float cmp,float ang){float tx=1.0/float(textureSize(sm,0).x);float bds=0.0;float bc=0.0;for(int i=0;i<30;i++){vec2 o=(pcssVogelDisk(i,30,ang)*tx)*2.0*PENUMBRA_FILTER_SIZE;float d=unpackRGBAToDepth(texture2D(sm,uv+o));if(d<cmp){bds+=d;bc++;}}if(bc>0.0)return bds/bc;return -1.0;}
float pcssVogelFilter(sampler2D sm,vec2 uv,float zr,float fr,float ang){float tx=1.0/float(textureSize(sm,0).x);float sh=0.0;for(int i=0;i<30;i++){vec2 vs=pcssVogelDisk(i,30,ang)*tx;vec2 vo=vs*(1.0+fr*15.0);sh+=step(zr,unpackRGBAToDepth(texture2D(sm,uv+vo)));}return sh/30.0;}
float PCSS(sampler2D shadowMap,vec4 coords){vec2 uv=coords.xy;float zr=coords.z;float ang=pcssHighPass(gl_FragCoord.xy).r*PI2;float ab=pcssFindBlocker(shadowMap,uv,zr,ang);if(ab==-1.0)return 1.0;float pr=(zr-ab)/ab;return pcssVogelFilter(shadowMap,uv,zr,1.25*pr,ang);}
`;
    THREE.ShaderChunk.shadowmap_pars_fragment = THREE.ShaderChunk.shadowmap_pars_fragment
        .replace('#ifdef USE_SHADOWMAP', '#ifdef USE_SHADOWMAP\n' + pcss)
        .replace('#if defined( SHADOWMAP_TYPE_PCF )', '\nreturn PCSS(shadowMap, shadowCoord);\n#if defined( SHADOWMAP_TYPE_PCF )');
})();

const container = document.getElementById('scene-container');
function readContainerSize() {
    let w = container.clientWidth;
    let h = container.clientHeight;
    if (document.documentElement.classList.contains('garden-embed')) {
        if (w < 16 || h < 16) {
            const wrap = container.closest('.canvas');
            if (wrap) {
                w = wrap.clientWidth;
                h = wrap.clientHeight;
            }
        }
        if (w < 16 || h < 16) {
            w = window.innerWidth;
            h = window.innerHeight;
        }
    }
    return { width: Math.max(w, 2), height: Math.max(h, 2) };
}
const { width, height } = readContainerSize();
const isGardenEmbed = document.documentElement.classList.contains('garden-embed');

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    /* Fewer cleared frames visible while the iframe is resizing (tradeoff: a bit more GPU memory). */
    preserveDrawingBuffer: isGardenEmbed,
});
renderer.setSize(width, height, false);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#E0D0B8');

const camera = new THREE.PerspectiveCamera(23, width / height, 0.1, 200);
camera.position.set(1.03, 34.83, 1.51);
camera.lookAt(2.31, 2.46, 0.87);

const dirLight = new THREE.DirectionalLight(0xF7EFD5, 10.5);
dirLight.position.set(-5, 42, -42);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -30;
dirLight.shadow.camera.right = 30;
dirLight.shadow.camera.top = 30;
dirLight.shadow.camera.bottom = -30;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0xF2FDC2, 1);
fillLight.position.set(-5, 25, 28);
scene.add(fillLight);

const ambientLight = new THREE.AmbientLight(0xAEB983, 1.2);
scene.add(ambientLight);

const textureLoader = new THREE.TextureLoader();
const concreteTexture = textureLoader.load('/garden/textures/concrete.webp');
concreteTexture.colorSpace = THREE.SRGBColorSpace;
concreteTexture.wrapS = concreteTexture.wrapT = THREE.RepeatWrapping;

const groundGeo = new THREE.PlaneGeometry(40, 40);
const groundMat = new THREE.MeshStandardMaterial({
    map: concreteTexture,
    color: 0x51AC55,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

for (const config of TREE_CONFIGS) {
    createTree(scene, config, windUniforms);
}

const butterflies = createButterflies(scene, 4);

const postProcessing = createPostProcessing(renderer, scene, camera);

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    updateWind(elapsed, delta);
    updateButterflies(butterflies, delta);

    postProcessing.render();
}

let lastAppliedW = Math.round(width);
let lastAppliedH = Math.round(height);

function syncSize() {
    const { width: w, height: h } = readContainerSize();
    const rw = Math.round(w);
    const rh = Math.round(h);
    if (rw < 8 || rh < 8) return;
    if (rw === lastAppliedW && rh === lastAppliedH) return;
    lastAppliedW = rw;
    lastAppliedH = rh;
    camera.aspect = rw / rh;
    camera.updateProjectionMatrix();
    renderer.setSize(rw, rh, false);
    postProcessing.resize(rw, rh);
}

/** Embed: ResizeObserver fires very often; each setSize() clears WebGL buffers → visible flash. Throttle + skip unchanged size. */
const EMBED_RESIZE_MIN_MS = 80;
let embedResizeRaf = 0;
let embedResizePending = false;
let lastEmbedResizeApply = performance.now();

function scheduleSyncSizeEmbed() {
    embedResizePending = true;
    if (embedResizeRaf) return;
    function tick() {
        const now = performance.now();
        if (embedResizePending && now - lastEmbedResizeApply >= EMBED_RESIZE_MIN_MS) {
            embedResizePending = false;
            const prevW = lastAppliedW;
            const prevH = lastAppliedH;
            syncSize();
            if (lastAppliedW !== prevW || lastAppliedH !== prevH) {
                lastEmbedResizeApply = now;
            }
        }
        if (embedResizePending) {
            embedResizeRaf = requestAnimationFrame(tick);
        } else {
            embedResizeRaf = 0;
        }
    }
    embedResizeRaf = requestAnimationFrame(tick);
}

let resizeRaf = 0;
function scheduleSyncSizeStandalone() {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        syncSize();
    });
}

const scheduleSyncSize = isGardenEmbed ? scheduleSyncSizeEmbed : scheduleSyncSizeStandalone;

window.addEventListener('resize', scheduleSyncSize);

if (isGardenEmbed) {
    const ro = new ResizeObserver(() => scheduleSyncSize());
    ro.observe(container);
    if (container.parentElement) ro.observe(container.parentElement);
    requestAnimationFrame(syncSize);
    requestAnimationFrame(() => requestAnimationFrame(syncSize));
}

animate();

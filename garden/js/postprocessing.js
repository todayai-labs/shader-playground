import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ColorGradeShader } from './shaders/colorgrade.glsl.js';
import { HorizontalBlurShader, VerticalBlurShader, LuminanceShader, ChromaBlurCompositeShader } from './shaders/blur.glsl.js';

const COLOR_GRADE_CONFIG = {
    colors: ['#272757', '#FF2828', '#FF2828'],
    strengths: [0.4, 0.3, 3],
    balance: 0.6,
    strength: 0.2,
};

export function createPostProcessing(renderer, scene, camera) {
    const size = renderer.getSize(new THREE.Vector2());
    const qw = Math.floor(size.x / 4);
    const qh = Math.floor(size.y / 4);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const lumRT = new THREE.WebGLRenderTarget(qw, qh, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
    });
    const blurHRT = new THREE.WebGLRenderTarget(qw, qh, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
    });
    const blurVRT = new THREE.WebGLRenderTarget(qw, qh, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
    });

    const lumPass = new ShaderPass(LuminanceShader);
    lumPass.renderToScreen = false;

    const hBlurPass = new ShaderPass(HorizontalBlurShader);
    hBlurPass.uniforms.h.value = 1.0 / qw;
    hBlurPass.renderToScreen = false;

    const vBlurPass = new ShaderPass(VerticalBlurShader);
    vBlurPass.uniforms.v.value = 1.0 / qh;
    vBlurPass.renderToScreen = false;

    const colorGradePass = new ShaderPass(ColorGradeShader);
    const c0 = new THREE.Color(COLOR_GRADE_CONFIG.colors[0]);
    const c1 = new THREE.Color(COLOR_GRADE_CONFIG.colors[1]);
    const c2 = new THREE.Color(COLOR_GRADE_CONFIG.colors[2]);
    colorGradePass.uniforms.uColor0.value = new THREE.Vector3(c0.r, c0.g, c0.b);
    colorGradePass.uniforms.uColor1.value = new THREE.Vector3(c1.r, c1.g, c1.b);
    colorGradePass.uniforms.uColor2.value = new THREE.Vector3(c2.r, c2.g, c2.b);
    colorGradePass.uniforms.uStopStrength0.value = COLOR_GRADE_CONFIG.strengths[0];
    colorGradePass.uniforms.uStopStrength1.value = COLOR_GRADE_CONFIG.strengths[1];
    colorGradePass.uniforms.uStopStrength2.value = COLOR_GRADE_CONFIG.strengths[2];
    colorGradePass.uniforms.uBalance.value = COLOR_GRADE_CONFIG.balance;
    colorGradePass.uniforms.uStrength.value = COLOR_GRADE_CONFIG.strength;

    const chromaBlurRT = new THREE.WebGLRenderTarget(qw, qh, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
    });

    const chromaHBlur = new ShaderPass(HorizontalBlurShader);
    chromaHBlur.uniforms.h.value = 1.0 / qw;
    chromaHBlur.renderToScreen = false;

    const chromaVBlur = new ShaderPass(VerticalBlurShader);
    chromaVBlur.uniforms.v.value = 1.0 / qh;
    chromaVBlur.renderToScreen = false;

    const chromaComposite = new ShaderPass(ChromaBlurCompositeShader);

    const outputPass = new OutputPass();

    composer.addPass(colorGradePass);
    composer.addPass(outputPass);

    const blurredLumComposer = new EffectComposer(renderer, lumRT);
    blurredLumComposer.renderToScreen = false;
    blurredLumComposer.addPass(new RenderPass(scene, camera));
    blurredLumComposer.addPass(lumPass);
    blurredLumComposer.addPass(hBlurPass);
    blurredLumComposer.addPass(vBlurPass);

    return {
        composer,
        blurredLumComposer,
        colorGradePass,
        render() {
            blurredLumComposer.render();
            colorGradePass.uniforms.tBlurredLum.value = blurredLumComposer.readBuffer.texture;
            composer.render();
        },
        resize(w, h) {
            composer.setSize(w, h);
            const nqw = Math.floor(w / 4);
            const nqh = Math.floor(h / 4);
            blurredLumComposer.setSize(nqw, nqh);
            hBlurPass.uniforms.h.value = 1.0 / nqw;
            vBlurPass.uniforms.v.value = 1.0 / nqh;
            lumRT.setSize(nqw, nqh);
        },
    };
}

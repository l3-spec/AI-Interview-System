/**
 * Live2D WebView App
 * Self-contained: loads PIXI.js + pixi-live2d-display + model from local assets.
 * Exposes window.Live2DApp with init / setMouthOpenness / setMouthForm / reset / isReady.
 * Communicates with Kotlin via window.Android.onReady() / window.Android.onError(msg).
 */
(function () {
    'use strict';

    const Live2DApp = window.Live2DApp || {};

    let app = null;
    let model = null;
    let isReady = false;

    const PARAM_MOUTH_OPEN_Y = 'ParamMouthOpenY';
    const PARAM_MOUTH_FORM = 'ParamMouthForm';

    let currentOpenY = 0.0;
    let currentForm = 0.0;

    // Speaking state
    let isSpeaking = false;
    let speakingTicker = null;

    // Placeholder graphics
    let placeholderGraphics = null;
    let placeholderT = 0;

    /** Called by Android to initialise the model */
    function init(modelPath) {
        console.log('[Live2DApp] init:', modelPath);

        const canvas = document.getElementById('canvas');
        const loading = document.getElementById('loading');

        if (!canvas) {
            notifyError('Canvas not found');
            return;
        }

        try {
            app = new PIXI.Application({
                view: canvas,
                autoStart: true,
                backgroundColor: 0x000000,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
                width: window.innerWidth,
                height: window.innerHeight
            });

            loadModel(modelPath)
                .then(() => {
                    hideLoading();
                    isReady = true;
                    notifyReady();
                    startAnimation();
                    resize();
                    console.log('[Live2DApp] Ready!');
                })
                .catch(function (err) {
                    console.error('[Live2DApp] Model load failed, showing placeholder:', err);
                    showPlaceholder();
                    hideLoading();
                    isReady = true;
                    notifyReady();
                    startAnimation();
                });

        } catch (err) {
            console.error('[Live2DApp] Init error:', err);
            notifyError(err.message);
            showPlaceholder();
            hideLoading();
            isReady = true;
            notifyReady();
        }
    }

    /** Load Live2D model via Live2DModel.from() */
    async function loadModel(modelPath) {
        const modelJsonPath = modelPath + 'haru.model3.json';
        console.log('[Live2DApp] Loading model JSON:', modelJsonPath);

        const response = await fetch(modelJsonPath);
        if (!response.ok) {
            throw new Error('Failed to load model JSON: ' + response.status);
        }

        const modelJson = await response.json();
        console.log('[Live2DApp] Model JSON loaded, creating Live2DModel...');

        // Preload textures
        const texturePaths = modelJson.FileReferences.Textures || [];
        const textures = await Promise.all(texturePaths.map(function (texPath) {
            return new Promise(function (resolve, reject) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = function () {
                    resolve(new PIXI.Texture(new PIXI.BaseTexture(img)));
                };
                img.onerror = function () { reject(new Error('Texture load failed: ' + texPath)); };
                img.src = modelPath + texPath;
            });
        }));

        console.log('[Live2DApp] Textures loaded:', textures.length);

        // Live2DModel.from handles everything from a URL
        model = await PIXI.live2d.Live2DModel.from(modelJsonPath, {
            autoInteract: false
        });

        console.log('[Live2DApp] Live2DModel created, adding to stage...');

        app.stage.addChild(model);
        resize();
    }

    /** Draw simple animated placeholder */
    function showPlaceholder() {
        placeholderGraphics = new PIXI.Graphics();
        const w = app.screen.width;
        const h = app.screen.height;

        function draw(openY) {
            placeholderGraphics.clear();
            // Head
            placeholderGraphics.beginFill(0xffe4c4);
            placeholderGraphics.drawCircle(w / 2, h / 2, Math.min(w, h) * 0.35);
            placeholderGraphics.endFill();
            // Eyes
            placeholderGraphics.beginFill(0x333333);
            placeholderGraphics.drawCircle(w / 2 - 30, h / 2 - 20, 10);
            placeholderGraphics.drawCircle(w / 2 + 30, h / 2 - 20, 10);
            placeholderGraphics.endFill();
            // Mouth
            placeholderGraphics.beginFill(0xcc4444);
            placeholderGraphics.drawEllipse(w / 2, h / 2 + 40, 30, 8 + openY * 30);
            placeholderGraphics.endFill();
        }

        draw(0);
        app.stage.addChild(placeholderGraphics);

        app.ticker.add(function () {
            placeholderT += 0.05;
            draw((Math.sin(placeholderT) + 1) / 2 * currentOpenY);
        });
    }

    function resize() {
        if (!app) return;
        app.renderer.resize(window.innerWidth, window.innerHeight);
        if (model) {
            const scale = Math.min(window.innerWidth, window.innerHeight) / 400;
            model.x = window.innerWidth / 2;
            model.y = window.innerHeight / 2;
            model.scale.set(scale);
        }
    }

    window.addEventListener('resize', resize);

    function startAnimation() {
        app.ticker.add(function () {
            if (!model) return;
            try {
                model.setParameterById(PARAM_MOUTH_OPEN_Y, currentOpenY);
            } catch (e) { /* ignore */ }
            try {
                model.setParameterById(PARAM_MOUTH_FORM, currentForm);
            } catch (e) { /* ignore */ }
        });
    }

    function setMouthOpenness(value) {
        currentOpenY = Math.max(0.0, Math.min(1.0, value));
    }

    function setMouthForm(value) {
        currentForm = Math.max(-1.0, Math.min(1.0, value));
    }

    function reset() {
        currentOpenY = 0.0;
        currentForm = 0.0;
    }

    function checkReady() {
        return isReady;
    }

    // =============================================================
    // Speaking animation
    // =============================================================

    function startSpeaking() {
        if (isSpeaking) return;
        isSpeaking = true;
        console.log('[Live2DApp] startSpeaking');

        // If model supports internal speaking motion, play it
        if (model && model.internal && model.internal.motion) {
            try {
                model.motion('haru_g_m08'); // Common idle/speaking motion
            } catch (e) {
                console.warn('[Live2DApp] No speaking motion available');
            }
        }
    }

    function stopSpeaking() {
        if (!isSpeaking) return;
        isSpeaking = false;
        console.log('[Live2DApp] stopSpeaking');

        if (model && model.internal && model.internal.motion) {
            try {
                model.motion('idle'); // Return to idle
            } catch (e) {
                console.warn('[Live2DApp] No idle motion available');
            }
        }
    }

    // =============================================================
    // Expressions
    // =============================================================

    function setExpression(expressionName) {
        console.log('[Live2DApp] setExpression:', expressionName);
        if (!model) return;
        try {
            if (model.expressions) {
                const expr = model.expressions.find(function (e) {
                    return e.name === expressionName;
                });
                if (expr) {
                    model.expression = expr;
                }
            }
        } catch (e) {
            console.warn('[Live2DApp] setExpression failed:', e);
        }
    }

    // =============================================================
    // Motion playback
    // =============================================================

    function playMotion(motionName) {
        console.log('[Live2DApp] playMotion:', motionName);
        if (!model) return;
        try {
            if (model.motions && model.motions[motionName]) {
                model.motion(motionName);
            } else {
                // Try partial match
                const keys = Object.keys(model.motions || {});
                const match = keys.find(function (k) {
                    return k.indexOf(motionName) >= 0;
                });
                if (match) {
                    model.motion(match);
                }
            }
        } catch (e) {
            console.warn('[Live2DApp] playMotion failed:', e);
        }
    }

    // =============================================================
    // Helpers
    // =============================================================

    function hideLoading() {
        const el = document.getElementById('loading');
        if (el) el.style.display = 'none';
    }

    function notifyReady() {
        if (window.Android && typeof window.Android.onReady === 'function') {
            try { window.Android.onReady(); } catch (e) { console.warn(e); }
        }
    }

    function notifyError(msg) {
        if (window.Android && typeof window.Android.onError === 'function') {
            try { window.Android.onError(msg); } catch (e) { console.warn(e); }
        }
    }

    window.Live2DApp = {
        init: init,
        setMouthOpenness: setMouthOpenness,
        setMouthForm: setMouthForm,
        reset: reset,
        isReady: checkReady,
        startSpeaking: startSpeaking,
        stopSpeaking: stopSpeaking,
        setExpression: setExpression,
        playMotion: playMotion
    };

    console.log('[Live2DApp] app.js loaded');
})();

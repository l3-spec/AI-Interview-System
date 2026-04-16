/**
 * Live2D WebView App - Debugged Version
 * Every step logs visibly and falls back gracefully.
 * Exposes window.Live2DApp with init/setMouthOpenness/setMouthForm/reset/isReady.
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

    // Placeholder circle color for debugging
    let placeholderCircle = null;

    // =============================================================
    // STEP 1: Validate PIXI is loaded
    // =============================================================
    function log(msg) {
        console.log('[Live2DApp] ' + msg);
        const el = document.getElementById('loading');
        if (el) el.innerHTML = msg;
    }

    function init(modelPath) {
        log('init() started, modelPath=' + modelPath);

        const canvas = document.getElementById('canvas');
        if (!canvas) {
            log('ERROR: canvas not found!');
            notifyError('Canvas not found');
            return;
        }

        // STEP 2: Check PIXI
        if (typeof PIXI === 'undefined') {
            log('ERROR: PIXI not loaded!');
            notifyError('PIXI not loaded');
            return;
        }
        log('PIXI detected: ' + PIXI.VERSION);

        // STEP 3: Check PIXI.live2d
        if (typeof PIXI.live2d === 'undefined') {
            log('ERROR: PIXI.live2d not available!');
            notifyError('PIXI.live2d not available');
            // Still try to show placeholder with basic PIXI
            tryPIXIOnly(canvas);
            return;
        }
        log('PIXI.live2d detected');

        // STEP 4: Try creating PIXI Application
        try {
            log('Creating PIXI.Application...');
            app = new PIXI.Application({
                view: canvas,
                autoStart: true,
                backgroundColor: 0x000000,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
                width: canvas.clientWidth || window.innerWidth,
                height: canvas.clientHeight || window.innerHeight
            });
            log('PIXI.Application created OK, renderer=' + (app.renderer ? 'OK' : 'NULL'));

            // Draw a visible diagnostic circle immediately
            drawDiagnosticCircle(app);

            // STEP 5: Try loading the model
            loadModel(modelPath)
                .then(function () {
                    log('Model loaded successfully!');
                    hideLoading();
                    isReady = true;
                    notifyReady();
                    startAnimation();
                    resize();
                })
                .catch(function (err) {
                    log('Model load failed: ' + err.message + ' — showing placeholder');
                    showPlaceholder();
                    hideLoading();
                    isReady = true;
                    notifyReady();
                    startAnimation();
                });

        } catch (err) {
            log('PIXI Application error: ' + err.message);
            notifyError(err.message);
            // Try to show something with basic PIXI
            tryPIXIOnly(canvas);
        }
    }

    /** Draw a visible YELLOW circle so we know PIXI is rendering */
    function drawDiagnosticCircle(pixiApp) {
        try {
            var g = new PIXI.Graphics();
            g.beginFill(0xFFFF00); // Yellow
            g.drawCircle(pixiApp.screen.width / 2, pixiApp.screen.height / 2, 60);
            g.endFill();
            pixiApp.stage.addChild(g);
            log('Diagnostic circle drawn');
        } catch (e) {
            log('Cannot draw circle: ' + e.message);
        }
    }

    /** Fallback: basic PIXI circle even without model */
    function tryPIXIOnly(canvas) {
        try {
            if (!app) {
                app = new PIXI.Application({
                    view: canvas,
                    autoStart: true,
                    backgroundColor: 0x222222,
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            }
            drawDiagnosticCircle(app);
            hideLoading();
            isReady = true;
            notifyReady();
            startAnimation();
        } catch (e) {
            log('Even basic PIXI failed: ' + e.message);
            hideLoading();
            isReady = true;
            notifyReady();
        }
    }

    /** Load Live2D model */
    async function loadModel(modelPath) {
        var modelJsonPath = modelPath + 'haru.model3.json';
        log('Fetching: ' + modelJsonPath);

        var response = await fetch(modelJsonPath);
        log('Fetch status: ' + response.status);

        if (!response.ok) {
            throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }

        var modelJson = await response.json();
        log('Model JSON parsed, keys: ' + Object.keys(modelJson).join(', '));

        // Log texture paths
        var textures = modelJson.FileReferences.Textures || [];
        log('Texture count: ' + textures.length);

        // Try Live2DModel.from
        log('Calling PIXI.live2d.Live2DModel.from("' + modelJsonPath + '")...');
        model = await PIXI.live2d.Live2DModel.from(modelJsonPath, {
            autoInteract: false
        });
        log('Live2DModel created');

        app.stage.addChild(model);

        // Scale to fit
        var scale = Math.min(window.innerWidth, window.innerHeight) / 400;
        model.x = window.innerWidth / 2;
        model.y = window.innerHeight / 2;
        model.scale.set(scale);
        log('Model added to stage, scale=' + scale);
    }

    /** Simple animated placeholder face */
    function showPlaceholder() {
        if (!app) return;
        log('Creating placeholder face');

        var g = new PIXI.Graphics();
        var t = 0;

        app.stage.addChild(g);

        app.ticker.add(function () {
            t += 0.05;
            g.clear();

            // Face
            g.beginFill(0xFFE4C4);
            g.drawCircle(app.screen.width / 2, app.screen.height / 2, 80);
            g.endFill();

            // Eyes
            g.beginFill(0x333333);
            g.drawCircle(app.screen.width / 2 - 25, app.screen.height / 2 - 20, 8);
            g.drawCircle(app.screen.width / 2 + 25, app.screen.height / 2 - 20, 8);
            g.endFill();

            // Mouth (animates with currentOpenY)
            var mouthOpen = currentOpenY * 25 + 5;
            g.beginFill(0xCC4444);
            g.drawEllipse(app.screen.width / 2, app.screen.height / 2 + 30, 30, mouthOpen);
            g.endFill();

            log('Placeholder tick t=' + t.toFixed(2));
        });
    }

    function startAnimation() {
        if (!app) return;
        app.ticker.add(function () {
            if (!model) return;
            try {
                model.setParameterById(PARAM_MOUTH_OPEN_Y, currentOpenY);
            } catch (e) { /* ignore param errors */ }
            try {
                model.setParameterById(PARAM_MOUTH_FORM, currentForm);
            } catch (e) { /* ignore */ }
        });
    }

    function resize() {
        if (!app) return;
        app.renderer.resize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener('resize', resize);

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

    function hideLoading() {
        var el = document.getElementById('loading');
        if (el) el.style.display = 'none';
        log('hideLoading called');
    }

    function notifyReady() {
        log('Calling Android.onReady()');
        if (window.Android && typeof window.Android.onReady === 'function') {
            try { window.Android.onReady(); } catch (e) { console.warn(e); }
        }
    }

    function notifyError(msg) {
        log('Calling Android.onError(' + msg + ')');
        if (window.Android && typeof window.Android.onError === 'function') {
            try { window.Android.onError(msg); } catch (e) { console.warn(e); }
        }
    }

    // Expose API
    window.Live2DApp = {
        init: init,
        setMouthOpenness: setMouthOpenness,
        setMouthForm: setMouthForm,
        reset: reset,
        isReady: checkReady
    };

    log('app.js loaded');
})();
/**
 * Live2D WebView App - Debug v3
 * Every critical step logs to screen + console.
 * Uses try/catch everywhere so errors never vanish silently.
 */
(function () {
    'use strict';

    var Live2DApp = {};

    var app = null;
    var model = null;
    var isReady = false;

    var PARAM_MOUTH_OPEN_Y = 'ParamMouthOpenY';
    var currentOpenY = 0.0;
    var currentForm = 0.0;

    var diagEl = null;

    function log(msg) {
        console.log('[Live2DApp] ' + msg);
        var loading = document.getElementById('loading');
        if (loading) loading.innerHTML = msg;
        if (diagEl) diagEl.innerHTML = msg;
    }

    function showDiag() {
        var el = document.getElementById('diag');
        if (el) { el.style.display = 'block'; diagEl = el; log('diag box shown'); }
    }

    function init(modelPath) {
        try {
            log('init() CALLED path=' + modelPath);

            var canvas = document.getElementById('canvas');
            if (!canvas) {
                log('ERROR: no canvas element');
                return;
            }
            log('canvas found px=' + canvas.clientWidth + ' py=' + canvas.clientHeight);

            // Check PIXI
            if (typeof PIXI === 'undefined') {
                log('ERROR: PIXI not defined!');
                return;
            }
            log('PIXI ' + PIXI.VERSION + ' OK');

            if (typeof PIXI.live2d === 'undefined') {
                log('ERROR: PIXI.live2d not defined!');
                return;
            }
            log('PIXI.live2d OK');

            // Create app with safe sizes
            var w = Math.max(canvas.clientWidth || 400, 400);
            var h = Math.max(canvas.clientHeight || 400, 400);
            log('Creating PIXI app ' + w + 'x' + h + '...');

            app = new PIXI.Application({
                view: canvas,
                autoStart: true,
                backgroundColor: 0x222222,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
                width: w,
                height: h
            });
            log('PIXI app created OK');

            // Draw bright yellow diagnostic circle
            try {
                var g = new PIXI.Graphics();
                g.beginFill(0xFFFF00);
                g.drawCircle(w / 2, h / 2, 80);
                g.endFill();
                app.stage.addChild(g);
                log('YELLOW CIRCLE drawn at ' + w + 'x' + h);

                var t = new PIXI.Text('YELLOW=PIXI OK', {
                    fill: 0xFFFF00,
                    fontSize: 14,
                    fontFamily: 'monospace'
                });
                t.x = w / 2 - 80;
                t.y = h / 2 + 100;
                app.stage.addChild(t);
                log('Label added');
            } catch (e2) {
                log('Circle draw failed: ' + e2.message);
            }

            // Now load the model
            log('Starting model load...');
            loadModel(modelPath)
                .then(function () {
                    log('>>> Model loaded OK <<<');
                    isReady = true;
                    notifyReady();
                    hideLoading();
                })
                .catch(function (err) {
                    log('>>> Model load failed: ' + err.message + ' <<<');
                    isReady = true;
                    notifyReady();
                    hideLoading();
                });

        } catch (err) {
            log('init() CRASHED: ' + err.message + ' ' + (err.stack || '').split('\n')[1]);
            try {
                window.Android && window.Android.onError && window.Android.onError(err.message);
            } catch (e3) {}
        }
    }

    function loadModel(modelPath) {
        return new Promise(function (resolve, reject) {
            var modelJsonPath = modelPath + 'haru.model3.json';
            log('fetch() ' + modelJsonPath);

            fetch(modelJsonPath, { cache: 'no-cache' })
                .then(function (resp) {
                    log('fetch status=' + resp.status);
                    if (!resp.ok) {
                        reject(new Error('HTTP ' + resp.status));
                        return;
                    }
                    return resp.json();
                })
                .then(function (modelJson) {
                    if (!modelJson) return;
                    log('JSON parsed, keys=' + Object.keys(modelJson).join(','));

                    var texPaths = modelJson.FileReferences.Textures || [];
                    log('Textures: ' + JSON.stringify(texPaths));

                    log('Calling Live2DModel.from("' + modelJsonPath + '")...');

                    PIXI.live2d.Live2DModel.from(modelJsonPath, { autoInteract: false })
                        .then(function (mdl) {
                            log('Live2DModel from() SUCCESS');
                            model = mdl;
                            if (app) app.stage.addChild(model);
                            resolve(model);
                        })
                        .catch(function (err2) {
                            log('Live2DModel.from() FAILED: ' + err2.message);
                            reject(err2);
                        });
                })
                .catch(function (err3) {
                    log('Model JSON parse FAILED: ' + err3.message);
                    reject(err3);
                });
        });
    }

    function setMouthOpenness(v) { currentOpenY = Math.max(0, Math.min(1, v)); }
    function setMouthForm(v) { currentForm = Math.max(-1, Math.min(1, v)); }
    function reset() { currentOpenY = 0; currentForm = 0; }
    function checkReady() { return isReady; }

    function hideLoading() {
        var el = document.getElementById('loading');
        if (el) el.style.display = 'none';
    }

    function notifyReady() {
        try { window.Android && window.Android.onReady && window.Android.onReady(); } catch (e) {}
    }

    // Bootstrap
    function bootstrap() {
        showDiag();
        if (typeof PIXI !== 'undefined') {
            log('PIXI ready, bootstrapping...');
            // Override the pre-init dummy
            window.Live2DApp.init = init;
            init('model/haru/');
        } else {
            log('PIXI not yet available, retrying in 500ms...');
            setTimeout(bootstrap, 500);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

    window.Live2DApp = { init: init, setMouthOpenness: setMouthOpenness, setMouthForm: setMouthForm, reset: reset, isReady: checkReady };
    log('app.js v3 loaded');
})();
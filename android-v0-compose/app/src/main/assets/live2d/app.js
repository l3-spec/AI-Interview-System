/**
 * Live2D WebView App - Debug v5
 * Absolute path to model JSON, detailed fetch error logging.
 * Diagnostic YELLOW circle shows IMMEDIATELY after PIXI app created.
 */
(function () {
    'use strict';

    var Live2DApp = {};
    var app = null;
    var model = null;
    var isReady = false;
    var currentOpenY = 0.0;
    var currentForm = 0.0;
    var diagEl = null;

    function log(msg) {
        console.log('[Live2DApp] ' + msg);
        var loading = document.getElementById('loading');
        if (loading) loading.innerHTML = msg;
        if (diagEl) diagEl.innerHTML = msg;
    }

    function init(modelPath) {
        try {
            log('init() modelPath=' + modelPath);

            var canvas = document.getElementById('canvas');
            if (!canvas) { log('ERROR: no canvas'); return; }

            if (typeof PIXI === 'undefined') { log('ERROR: PIXI undefined'); return; }
            log('PIXI ' + PIXI.VERSION);

            if (typeof PIXI.live2d === 'undefined') { log('ERROR: PIXI.live2d undefined'); return; }
            log('PIXI.live2d OK');

            if (typeof Live2DCubismCore === 'undefined') { log('WARNING: Live2DCubismCore undefined (may be bundled)'); }
            else { log('Live2DCubismCore OK'); }

            var w = canvas.clientWidth > 0 ? canvas.clientWidth : window.innerWidth;
            var h = canvas.clientHeight > 0 ? canvas.clientHeight : window.innerHeight;
            log('Creating PIXI ' + w + 'x' + h);

            app = new PIXI.Application({
                view: canvas,
                autoStart: true,
                backgroundColor: 0x333333,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
                width: w,
                height: h
            });
            log('PIXI app created');

            // Draw YELLOW circle immediately to confirm rendering
            var g = new PIXI.Graphics();
            g.beginFill(0xFFFF00);
            g.drawCircle(w / 2, h / 2, 100);
            g.endFill();
            app.stage.addChild(g);
            log('YELLOW CIRCLE added to stage');

            var t = new PIXI.Text('YELLOW CIRCLE = PIXI OK', {
                fill: 0xFFFF00, fontSize: 16, fontFamily: 'monospace'
            });
            t.x = w / 2 - 90;
            t.y = h / 2 + 120;
            app.stage.addChild(t);

            // Now load model
            log('Loading model...');
            doLoadModel(modelPath);

        } catch (err) {
            log('init() CRASHED: ' + err.message);
        }
    }

    function doLoadModel(modelPath) {
        // Use ABSOLUTE path for model JSON
        var modelJsonUrl = 'file:///android_asset/live2d/' + modelPath + 'haru.model3.json';
        log('Fetching (absolute): ' + modelJsonUrl);

        fetch(modelJsonUrl, { cache: 'no-cache' })
            .then(function (resp) {
                log('Response status: ' + resp.status + ' ' + resp.statusText);
                if (!resp.ok) {
                    log('Response not OK, dumping headers...');
                    resp.headers.forEach(function (v, k) { log('  Header: ' + k + ' = ' + v); });
                    throw new Error('HTTP ' + resp.status);
                }
                return resp.json();
            })
            .then(function (modelJson) {
                log('JSON OK, keys=' + Object.keys(modelJson).join(','));
                log('Moc: ' + (modelJson.FileReferences && modelJson.FileReferences.Moc));
                var tex = modelJson.FileReferences && modelJson.FileReferences.Textures;
                log('Textures: ' + JSON.stringify(tex || []));

                log('Calling Live2DModel.from("' + modelJsonUrl + '")...');
                return PIXI.live2d.Live2DModel.from(modelJsonUrl, { autoInteract: false });
            })
            .then(function (mdl) {
                log('Live2DModel SUCCESS');
                model = mdl;
                if (app) app.stage.addChild(model);
                isReady = true;
                notifyReady();
                hideLoading();
                log('DONE - Model visible');
            })
            .catch(function (err) {
                log('Model load FAILED: ' + err.message);
                log('Keeping YELLOW circle as fallback');
                isReady = true;
                notifyReady();
                hideLoading();
            });
    }

    function setMouthOpenness(v) { currentOpenY = Math.max(0, Math.min(1, v)); }
    function setMouthForm(v) { currentForm = Math.max(-1, Math.min(1, v)); }
    function reset() { currentOpenY = 0; currentForm = 0; }
    function checkReady() { return isReady; }

    function hideLoading() {
        var el = document.getElementById('loading');
        if (el) el.style.display = 'none';
        if (diagEl) diagEl.style.display = 'none';
    }

    function notifyReady() {
        try { if (window.Android && window.Android.onReady) window.Android.onReady(); } catch (e) {}
    }

    // Expose API
    window.Live2DApp = {
        init: init,
        setMouthOpenness: setMouthOpenness,
        setMouthForm: setMouthForm,
        reset: reset,
        isReady: checkReady
    };

    // Bootstrap
    function bootstrap() {
        var diag = document.getElementById('diag');
        if (diag) { diag.style.display = 'block'; diagEl = diag; }

        if (typeof PIXI === 'undefined') {
            log('Waiting for PIXI...');
            setTimeout(bootstrap, 300);
            return;
        }

        log('PIXI ready, calling init...');
        init('model/haru/');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

    log('app.js v5 loaded');
})();
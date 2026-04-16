/**
 * Live2D WebView App - Debug v7
 * Uses XMLHttpRequest instead of fetch() for local asset loading.
 * fetch() cannot access file:// URLs in Android WebView — XHR can.
 */
(function () {
    'use strict';

    var Live2DApp = {};
    var app = null;
    var model = null;
    var isReady = false;
    var currentOpenY = 0.0;
    var currentForm = 0.0;

    // Log to both console and on-screen PIXI text
    var statusText = null;
    function log(msg) {
        console.log('[Live2DApp] ' + msg);
        var loading = document.getElementById('loading');
        if (loading) loading.innerHTML = msg;
        if (app && app.stage) showCanvasText(msg);
    }

    function showCanvasText(msg) {
        try {
            if (!statusText) {
                statusText = new PIXI.Text('', {
                    fill: 0x00FF00,
                    fontSize: 13,
                    fontFamily: 'monospace'
                });
                statusText.x = 8;
                statusText.y = 8;
                app.stage.addChild(statusText);
            }
            statusText.text = '[' + new Date().toISOString().substr(11, 12) + '] ' + msg;
        } catch (e) {}
    }

    /**
     * Load a local file using XMLHttpRequest (works with file:// URLs in WebView).
     * Returns a Promise resolving to the response text.
     */
    function xhrLoad(url) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200 || xhr.status === 0) {
                        resolve(xhr.responseText);
                    } else {
                        reject(new Error('XHR failed: status=' + xhr.status + ' url=' + url));
                    }
                }
            };
            xhr.onerror = function () {
                reject(new Error('XHR error for: ' + url));
            };
            xhr.send(null);
        });
    }

    function init(modelPath) {
        try {
            log('init() path=' + modelPath);

            var canvas = document.getElementById('canvas');
            if (!canvas) { log('ERROR: no canvas'); return; }
            if (typeof PIXI === 'undefined') { log('ERROR: PIXI undefined'); return; }
            log('PIXI ' + PIXI.VERSION + ' OK');

            if (typeof PIXI.live2d === 'undefined') { log('ERROR: PIXI.live2d undefined'); return; }
            log('PIXI.live2d OK');

            var w = Math.max(canvas.clientWidth || 400, 400);
            var h = Math.max(canvas.clientHeight || 400, 400);

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

            // Draw YELLOW circle
            var g = new PIXI.Graphics();
            g.beginFill(0xFFFF00);
            g.drawCircle(w / 2, h / 2, 100);
            g.endFill();
            app.stage.addChild(g);

            var label = new PIXI.Text('YELLOW CIRCLE = PIXI OK', {
                fill: 0xFFFF00, fontSize: 16, fontFamily: 'monospace'
            });
            label.x = w / 2 - 100;
            label.y = h / 2 + 120;
            app.stage.addChild(label);

            log('Yellow circle OK, loading model via XHR...');
            loadModelWithXHR(modelPath);

        } catch (err) {
            log('init() CRASHED: ' + err.message);
        }
    }

    function loadModelWithXHR(modelPath) {
        // Build absolute path to model JSON
        var modelJsonUrl = 'file:///android_asset/live2d/' + modelPath + 'haru.model3.json';
        log('XHR loading: ' + modelJsonUrl);

        xhrLoad(modelJsonUrl)
            .then(function (jsonText) {
                log('XHR got ' + jsonText.length + ' bytes');
                var modelJson = JSON.parse(jsonText);
                log('JSON parsed, keys=' + Object.keys(modelJson).join(','));

                var tex = (modelJson.FileReferences && modelJson.FileReferences.Textures) || [];
                var moc = (modelJson.FileReferences && modelJson.FileReferences.Moc) || '?';
                log('Moc=' + moc + ', Textures=' + JSON.stringify(tex));

                // Now try Live2DModel.from with the absolute file:// URL
                log('Creating Live2DModel from: ' + modelJsonUrl);
                return PIXI.live2d.Live2DModel.from(modelJsonUrl, { autoInteract: false });
            })
            .then(function (mdl) {
                log('Live2DModel SUCCESS!');
                model = mdl;
                app.stage.removeChildren();
                app.stage.addChild(model);

                var scale = Math.min(app.screen.width, app.screen.height) / 400;
                model.x = app.screen.width / 2;
                model.y = app.screen.height / 2;
                model.scale.set(scale);

                isReady = true;
                notifyReady();
                log('>>> MODEL VISIBLE <<<');
            })
            .catch(function (err) {
                log('Model load FAILED: ' + err.message);
                isReady = true;
                notifyReady();
            });
    }

    function setMouthOpenness(v) { currentOpenY = Math.max(0, Math.min(1, v)); }
    function setMouthForm(v) { currentForm = Math.max(-1, Math.min(1, v)); }
    function reset() { currentOpenY = 0; currentForm = 0; }
    function checkReady() { return isReady; }

    function notifyReady() {
        try { if (window.Android && window.Android.onReady) window.Android.onReady(); } catch (e) {}
    }

    window.Live2DApp = {
        init: init,
        setMouthOpenness: setMouthOpenness,
        setMouthForm: setMouthForm,
        reset: reset,
        isReady: checkReady
    };

    function bootstrap() {
        if (typeof PIXI === 'undefined') {
            setTimeout(bootstrap, 300);
            return;
        }
        log('PIXI ready, init starting...');
        init('model/haru/');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

    log('app.js v7 loaded (XHR mode)');
})();
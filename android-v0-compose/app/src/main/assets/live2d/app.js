/**
 * Live2D WebView App - Debug v6
 * Yellow circle proves PIXI works. Model fetch now uses absolute file:// URL.
 * Loading bar + text on canvas show model loading progress.
 */
(function () {
    'use strict';

    var Live2DApp = {};
    var app = null;
    var model = null;
    var isReady = false;
    var currentOpenY = 0.0;
    var currentForm = 0.0;
    var canvasH = 0;

    function log(msg) {
        console.log('[Live2DApp] ' + msg);
        var loading = document.getElementById('loading');
        if (loading) loading.innerHTML = msg;
        showCanvasText(msg);
    }

    var statusText = null;
    function showCanvasText(msg) {
        if (!app || !app.stage) return;
        try {
            if (!statusText) {
                statusText = new PIXI.Text('', {
                    fill: 0x00FF00,
                    fontSize: 13,
                    fontFamily: 'monospace'
                });
                statusText.x = 8;
                statusText.y = 8;
                statusText.width = 500;
                app.stage.addChild(statusText);
            }
            var ts = new Date().toISOString().substr(11, 12);
            statusText.text = '[' + ts + '] ' + msg;
        } catch (e) {}
    }

    function init(modelPath) {
        try {
            log('init() path=' + modelPath);

            var canvas = document.getElementById('canvas');
            if (!canvas) { log('ERROR: no canvas'); return; }
            if (typeof PIXI === 'undefined') { log('ERROR: PIXI undefined'); return; }
            log('PIXI ' + PIXI.VERSION);

            if (typeof PIXI.live2d === 'undefined') { log('ERROR: PIXI.live2d undefined'); return; }
            log('PIXI.live2d OK');

            var w = Math.max(canvas.clientWidth || 400, 400);
            canvasH = Math.max(canvas.clientHeight || 400, 400);
            log('Canvas: ' + w + 'x' + canvasH);

            app = new PIXI.Application({
                view: canvas,
                autoStart: true,
                backgroundColor: 0x333333,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
                width: w,
                height: canvasH
            });
            log('PIXI app created');

            // Draw YELLOW circle
            var g = new PIXI.Graphics();
            g.beginFill(0xFFFF00);
            g.drawCircle(w / 2, canvasH / 2, 100);
            g.endFill();
            app.stage.addChild(g);

            var label = new PIXI.Text('YELLOW CIRCLE = PIXI OK', {
                fill: 0xFFFF00, fontSize: 16, fontFamily: 'monospace'
            });
            label.x = w / 2 - 100;
            label.y = canvasH / 2 + 120;
            app.stage.addChild(label);

            log('Yellow circle done, loading model...');

            // Proceed to load model
            doLoadModel(modelPath);

        } catch (err) {
            log('init() CRASHED: ' + err.message);
        }
    }

    function doLoadModel(modelPath) {
        var modelJsonUrl = 'file:///android_asset/live2d/' + modelPath + 'haru.model3.json';
        log('FETCH: ' + modelJsonUrl);

        // Show loading bar on canvas
        var barBg = new PIXI.Graphics();
        barBg.beginFill(0x222222);
        barBg.drawRect(20, canvasH - 80, app.screen.width - 40, 40);
        barBg.endFill();
        app.stage.addChild(barBg);

        var barFill = new PIXI.Graphics();
        barFill.beginFill(0x00AAFF);
        barFill.drawRect(20, canvasH - 80, 0, 40);
        barFill.endFill();
        app.stage.addChild(barFill);

        var loadLabel = new PIXI.Text('Fetching haru.model3.json...', {
            fill: 0xFFFFFF, fontSize: 12, fontFamily: 'monospace'
        });
        loadLabel.x = 28;
        loadLabel.y = canvasH - 72;
        app.stage.addChild(loadLabel);

        fetch(modelJsonUrl, { cache: 'no-cache' })
            .then(function (resp) {
                loadLabel.text = 'HTTP ' + resp.status + ': ' + resp.statusText;
                barFill.scale.x = resp.ok ? 0.5 : 0;
                log('HTTP ' + resp.status);
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                return resp.json();
            })
            .then(function (modelJson) {
                loadLabel.text = 'JSON parsed: ' + Object.keys(modelJson).join(', ');
                barFill.scale.x = 1.0;
                log('JSON keys: ' + Object.keys(modelJson).join(','));

                var tex = (modelJson.FileReferences && modelJson.FileReferences.Textures) || [];
                var moc = (modelJson.FileReferences && modelJson.FileReferences.Moc) || '?';
                loadLabel.text = 'Moc=' + moc + ', ' + tex.length + ' textures';
                log('Moc=' + moc + ', tex=' + JSON.stringify(tex));

                return PIXI.live2d.Live2DModel.from(modelJsonUrl, { autoInteract: false });
            })
            .then(function (mdl) {
                loadLabel.text = 'Live2DModel created!';
                log('Live2DModel SUCCESS');
                model = mdl;
                app.stage.removeChildren();
                app.stage.addChild(model);

                var scale = Math.min(app.screen.width, app.screen.height) / 400;
                model.x = app.screen.width / 2;
                model.y = app.screen.height / 2;
                model.scale.set(scale);

                isReady = true;
                notifyReady();
                log('>>> MODEL ON STAGE <<<');
            })
            .catch(function (err) {
                loadLabel.text = 'ERROR: ' + err.message;
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
        init('model/haru/');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

    log('app.js v6 loaded');
})();
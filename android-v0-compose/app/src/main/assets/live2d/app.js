/**
 * Live2D WebView App - JavaScript Interface for Android
 * Uses pixi-live2d-display for Cubism 4 model rendering
 */
(function() {
    'use strict';

    const Live2DApp = window.Live2DApp || {};

    // State
    let app = null;
    let model = null;
    let isReady = false;
    let modelPath = '';

    // Cubism parameter names
    const PARAM_MOUTH_OPEN_Y = 'ParamMouthOpenY';
    const PARAM_MOUTH_FORM = 'ParamMouthForm';

    // Current mouth values
    let currentOpenY = 0.0;
    let currentForm = 0.0;

    // Breathing animation
    let breathTime = 0;

    /**
     * Initialize Live2D app with model path
     * @param {string} path - e.g., "model/haru/"
     */
    function init(path) {
        console.log('[Live2DApp] init:', path);
        modelPath = path;

        const canvas = document.getElementById('canvas');
        const loading = document.getElementById('loading');

        if (!canvas) {
            notifyError('Canvas not found');
            return;
        }

        try {
            // Initialize PIXI Application
            const pixiOptions = {
                view: canvas,
                autoStart: true,
                backgroundColor: 0x000000,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true
            };

            app = new PIXI.Application(pixiOptions);

            // Handle resize
            const resize = () => {
                const w = window.innerWidth;
                const h = window.innerHeight;
                app.renderer.resize(w, h);
                if (model) {
                    model.x = w / 2;
                    model.y = h / 2;
                    // Scale to fit
                    const scale = Math.min(w, h) / 400;
                    model.scale.set(scale);
                }
            };
            window.addEventListener('resize', resize);

            // Load model
            loadModel(path)
                .then(() => {
                    hideLoading();
                    isReady = true;
                    notifyReady();
                    startAnimation();
                    resize();
                    console.log('[Live2DApp] Ready!');
                })
                .catch(err => {
                    console.error('[Live2DApp] Load error:', err);
                    // Show placeholder if model fails
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

    /**
     * Load Live2D model using pixi-live2d-display
     */
    async function loadModel(path) {
        const modelJsonPath = path + 'haru.model3.json';

        console.log('[Live2DApp] Loading:', modelJsonPath);

        const response = await fetch(modelJsonPath);
        if (!response.ok) {
            throw new Error('Failed to fetch model JSON: ' + response.status);
        }

        const modelJson = await response.json();

        // Preload textures
        const texturePaths = modelJson.FileReferences.Textures || [];
        const textures = [];

        for (const texPath of texturePaths) {
            const fullPath = path + texPath;
            try {
                const tex = await loadTexture(fullPath);
                textures.push(tex);
            } catch (e) {
                console.warn('[Live2DApp] Texture load failed:', fullPath, e);
                // Continue without this texture
            }
        }

        if (textures.length === 0) {
            throw new Error('No textures loaded');
        }

        // Create Live2D model using PIXI Live2D
        const { Live2DModel } = PIXI.live2d;

        model = await Live2DModel.from(modelJsonPath, {
            autoInteract: false
        });

        // Set first texture if model loaded
        if (textures.length > 0 && model.internalModel) {
            try {
                model.internalModel.setTexture(0, textures[0]);
            } catch (e) {
                console.warn('[Live2DApp] Could not set texture:', e);
            }
        }

        app.stage.addChild(model);

        console.log('[Live2DApp] Model loaded successfully');
        return model;
    }

    /**
     * Load texture as PIXI texture
     */
    function loadTexture(path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const baseTexture = PIXI.BaseTexture.from(img);
                resolve(new PIXI.Texture(baseTexture));
            };
            img.onerror = reject;
            img.src = path;
        });
    }

    /**
     * Show placeholder (simple animated face) when model fails
     */
    function showPlaceholder() {
        const g = new PIXI.Graphics();
        const w = app.screen.width;
        const h = app.screen.height;

        // Draw a simple animated placeholder
        const drawFace = (openY) => {
            g.clear();
            g.beginFill(0xFFE4C4);
            g.drawCircle(w/2, h/2, 80);
            g.endFill();

            // Eyes
            g.beginFill(0x333333);
            g.drawCircle(w/2 - 25, h/2 - 10, 8);
            g.drawCircle(w/2 + 25, h/2 - 10, 8);
            g.endFill();

            // Mouth (oval that changes with openY)
            g.beginFill(0xCC4444);
            const mouthW = 30;
            const mouthH = 10 + openY * 25;
            g.drawEllipse(w/2, h/2 + 30, mouthW, mouthH);
            g.endFill();
        };

        drawFace(0);

        app.stage.addChild(g);

        // Animate
        let t = 0;
        app.ticker.add(() => {
            t += 0.05;
            const openY = (Math.sin(t) + 1) / 2 * currentOpenY;
            drawFace(openY || 0.1);
        });
    }

    /**
     * Start idle animation loop
     */
    function startAnimation() {
        app.ticker.add(() => {
            breathTime += 0.016;
            updateMouthAnimation();
        });
    }

    /**
     * Update mouth animation based on current values
     */
    function updateMouthAnimation() {
        if (!model) return;

        try {
            // Apply mouth parameters
            model.setParameterById(PARAM_MOUTH_OPEN_Y, currentOpenY);
            model.setParameterById(PARAM_MOUTH_FORM, currentForm);

            // Subtle breathing
            const breath = Math.sin(breathTime * 1.5) * 0.02 + 0.5;
            try {
                model.setParameterById('ParamBreast', breath);
            } catch (e) { /* ignore */ }
        } catch (e) {
            // Model might not have these parameters
        }
    }

    /**
     * Set mouth openness (0.0 - 1.0)
     */
    function setMouthOpenness(value) {
        currentOpenY = Math.max(0.0, Math.min(1.0, value));
        console.log('[Live2DApp] setMouthOpenness:', currentOpenY);
    }

    /**
     * Set mouth form (-1.0 to 1.0)
     */
    function setMouthForm(value) {
        currentForm = Math.max(-1.0, Math.min(1.0, value));
        console.log('[Live2DApp] setMouthForm:', currentForm);
    }

    /**
     * Reset to neutral
     */
    function reset() {
        currentOpenY = 0.0;
        currentForm = 0.0;
        console.log('[Live2DApp] reset');
    }

    /**
     * Check if ready
     */
    function isReady() {
        return isReady;
    }

    /**
     * Hide loading indicator
     */
    function hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }

    /**
     * Notify Android that model is ready
     */
    function notifyReady() {
        if (window.Android && typeof window.Android.onReady === 'function') {
            try {
                window.Android.onReady();
            } catch (e) {
                console.warn('[Live2DApp] Android.onReady error:', e);
            }
        }
    }

    /**
     * Notify Android of error
     */
    function notifyError(msg) {
        if (window.Android && typeof window.Android.onError === 'function') {
            try {
                window.Android.onError(msg);
            } catch (e) {
                console.warn('[Live2DApp] Android.onError error:', e);
            }
        }
    }

    // Export API
    window.Live2DApp = {
        init,
        setMouthOpenness,
        setMouthForm,
        reset,
        isReady
    };

    console.log('[Live2DApp] Script loaded.');

})();
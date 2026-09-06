/**
 * ClimateGuard - Particle System
 * Canvas-based particle effects for rain, snow, etc.
 */

const ParticleSystem = (function() {
    let canvas = null;
    let ctx = null;
    let particles = [];
    let animationId = null;
    let isRunning = false;
    let currentEffect = null;
    
    // Configuration for different effects
    const EFFECTS = {
        rain: {
            count: 200,
            speed: { min: 15, max: 25 },
            length: { min: 15, max: 30 },
            width: 1.5,
            color: 'rgba(174, 194, 224, 0.6)',
            angle: 15, // degrees
            wind: 2
        },
        heavyRain: {
            count: 400,
            speed: { min: 20, max: 35 },
            length: { min: 20, max: 40 },
            width: 2,
            color: 'rgba(174, 194, 224, 0.7)',
            angle: 20,
            wind: 4
        },
        snow: {
            count: 150,
            speed: { min: 1, max: 3 },
            size: { min: 2, max: 5 },
            color: 'rgba(255, 255, 255, 0.9)',
            wobble: true,
            wind: 0.5
        },
        lightSnow: {
            count: 80,
            speed: { min: 0.5, max: 2 },
            size: { min: 1, max: 3 },
            color: 'rgba(255, 255, 255, 0.7)',
            wobble: true,
            wind: 0.3
        }
    };
    
    /**
     * Initialize the particle system
     * @param {HTMLCanvasElement} canvasElement - Canvas element
     */
    function init(canvasElement) {
        canvas = canvasElement;
        ctx = canvas.getContext('2d');
        
        // Set canvas size
        resizeCanvas();
        
        // Handle resize
        window.addEventListener('resize', debounce(resizeCanvas, 250));
        
        return {
            start,
            stop,
            setEffect,
            isActive: () => isRunning
        };
    }
    
    /**
     * Resize canvas to window size
     */
    function resizeCanvas() {
        if (!canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.scale(dpr, dpr);
        
        // Regenerate particles for new size
        if (currentEffect) {
            generateParticles(currentEffect);
        }
    }
    
    /**
     * Generate particles for an effect
     * @param {string} effectName - Effect name
     */
    function generateParticles(effectName) {
        const config = EFFECTS[effectName];
        if (!config) return;
        
        particles = [];
        currentEffect = effectName;
        
        for (let i = 0; i < config.count; i++) {
            particles.push(createParticle(config, effectName));
        }
    }
    
    /**
     * Create a single particle
     * @param {Object} config - Effect configuration
     * @param {string} type - Effect type
     */
    function createParticle(config, type) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        if (type === 'rain' || type === 'heavyRain') {
            return {
                x: Math.random() * (width + 200) - 100,
                y: Math.random() * height - height,
                speed: random(config.speed.min, config.speed.max),
                length: random(config.length.min, config.length.max),
                width: config.width,
                color: config.color,
                angle: config.angle,
                wind: config.wind
            };
        } else if (type === 'snow' || type === 'lightSnow') {
            return {
                x: Math.random() * width,
                y: Math.random() * height - height,
                speed: random(config.speed.min, config.speed.max),
                size: random(config.size.min, config.size.max),
                color: config.color,
                wobbleOffset: Math.random() * Math.PI * 2,
                wobbleSpeed: random(0.02, 0.05),
                wind: config.wind,
                opacity: random(0.4, 1)
            };
        }
    }
    
    /**
     * Start the particle animation
     * @param {string} effectName - Effect to start
     */
    function start(effectName) {
        if (!canvas || !EFFECTS[effectName]) return;
        
        stop(); // Stop any existing animation
        
        generateParticles(effectName);
        isRunning = true;
        animate();
    }
    
    /**
     * Stop the particle animation
     */
    function stop() {
        isRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        particles = [];
        currentEffect = null;
        
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    /**
     * Set effect without restart if same
     * @param {string} effectName - Effect name
     */
    function setEffect(effectName) {
        if (currentEffect === effectName && isRunning) return;
        
        if (EFFECTS[effectName]) {
            start(effectName);
        } else {
            stop();
        }
    }
    
    /**
     * Animation loop
     */
    function animate() {
        if (!isRunning) return;
        
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        
        const type = currentEffect;
        const config = EFFECTS[type];
        
        particles.forEach((particle, index) => {
            if (type === 'rain' || type === 'heavyRain') {
                updateRainParticle(particle, config);
                drawRainParticle(particle);
            } else if (type === 'snow' || type === 'lightSnow') {
                updateSnowParticle(particle, config);
                drawSnowParticle(particle);
            }
            
            // Reset particle if off screen
            if (particle.y > window.innerHeight || particle.x > window.innerWidth + 100) {
                particles[index] = createParticle(config, type);
                particles[index].y = -20;
                particles[index].x = Math.random() * (window.innerWidth + 200) - 100;
            }
        });
        
        animationId = requestAnimationFrame(animate);
    }
    
    /**
     * Update rain particle position
     */
    function updateRainParticle(particle, config) {
        const angleRad = particle.angle * Math.PI / 180;
        particle.y += particle.speed;
        particle.x += Math.sin(angleRad) * particle.speed * 0.5 + particle.wind;
    }
    
    /**
     * Draw rain particle
     */
    function drawRainParticle(particle) {
        const angleRad = particle.angle * Math.PI / 180;
        const endX = particle.x + Math.sin(angleRad) * particle.length;
        const endY = particle.y + Math.cos(angleRad) * particle.length;
        
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = particle.width;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
    
    /**
     * Update snow particle position
     */
    function updateSnowParticle(particle, config) {
        particle.y += particle.speed;
        particle.wobbleOffset += particle.wobbleSpeed;
        particle.x += Math.sin(particle.wobbleOffset) * 0.5 + particle.wind;
    }
    
    /**
     * Draw snow particle
     */
    function drawSnowParticle(particle) {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(particle.color, particle.opacity);
        ctx.fill();
        
        // Add glow effect for larger snowflakes
        if (particle.size > 3) {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size * 2
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.opacity * 0.3})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }
    
    /**
     * Utility: Rebuild an rgb()/rgba() color string with a new alpha channel.
     * (String-appending alpha produces invalid 5-component rgba() that canvas ignores.)
     */
    function withAlpha(color, alpha) {
        const m = /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(color || '');
        if (!m) return color;
        const a = Math.max(0, Math.min(1, Number(alpha)));
        return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${Number.isFinite(a) ? a : 1})`;
    }

    /**
     * Utility: Random number between min and max
     */
    function random(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    /**
     * Utility: Debounce function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    return {
        init,
        start,
        stop,
        setEffect,
        EFFECTS
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParticleSystem;
}

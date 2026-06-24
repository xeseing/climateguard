/**
 * ClimateGuard - Weather Engine
 * Controls weather states and background rendering
 */

const WeatherEngine = (function() {
    // Weather states
    const WEATHER_STATES = {
        CLEAR_DAY: 'clear_day',
        CLEAR_NIGHT: 'clear_night',
        CLOUDY: 'cloudy',
        RAIN: 'rain',
        STORM: 'storm',
        SNOW: 'snow',
        FOG: 'fog'
    };
    
    // Current state
    let currentState = null;
    let isInitialized = false;
    let particleSystem = null;
    let starsGenerated = false;
    let lightningInterval = null;
    
    // DOM references
    let elements = {
        background: null,
        sky: null,
        clouds: null,
        particles: null,
        effects: null,
        overlay: null
    };
    
    /**
     * Initialize the weather engine
     */
    function init() {
        if (isInitialized) return;
        
        createBackgroundStructure();
        initParticleSystem();
        
        isInitialized = true;
        
        // Set default weather based on time
        const hour = new Date().getHours();
        const isDay = hour >= 6 && hour < 19;
        setWeather(isDay ? WEATHER_STATES.CLEAR_DAY : WEATHER_STATES.CLEAR_NIGHT);
    }
    
    /**
     * Create background DOM structure
     */
    function createBackgroundStructure() {
        // Check if already exists
        if (document.querySelector('.weather-background')) {
            elements.background = document.querySelector('.weather-background');
            elements.sky = elements.background.querySelector('.weather-background__sky');
            elements.clouds = elements.background.querySelector('.weather-background__clouds');
            elements.particles = elements.background.querySelector('.weather-background__particles');
            elements.effects = elements.background.querySelector('.weather-background__effects');
            elements.overlay = elements.background.querySelector('.weather-background__overlay');
            return;
        }
        
        // Create structure
        const background = document.createElement('div');
        background.className = 'weather-background';
        background.innerHTML = `
            <div class="weather-background__sky"></div>
            <div class="weather-background__clouds"></div>
            <div class="weather-background__particles">
                <canvas id="particleCanvas"></canvas>
            </div>
            <div class="weather-background__effects">
                <div class="lightning"></div>
            </div>
            <div class="weather-background__overlay"></div>
        `;
        
        document.body.insertBefore(background, document.body.firstChild);
        
        // Store references
        elements.background = background;
        elements.sky = background.querySelector('.weather-background__sky');
        elements.clouds = background.querySelector('.weather-background__clouds');
        elements.particles = background.querySelector('.weather-background__particles');
        elements.effects = background.querySelector('.weather-background__effects');
        elements.overlay = background.querySelector('.weather-background__overlay');
    }
    
    /**
     * Initialize particle system
     */
    function initParticleSystem() {
        const canvas = document.getElementById('particleCanvas');
        if (canvas) {
            particleSystem = ParticleSystem.init(canvas);
        }
    }
    
    /**
     * Set weather state
     * @param {string} state - Weather state
     * @param {boolean} animate - Whether to animate transition
     */
    function setWeather(state, animate = true) {
        if (!WEATHER_STATES[state.toUpperCase().replace(' ', '_')] && 
            !Object.values(WEATHER_STATES).includes(state)) {
            console.warn('Invalid weather state:', state);
            return;
        }
        
        if (currentState === state) return;
        
        const previousState = currentState;
        currentState = state;
        
        // Update data attribute on body
        document.body.setAttribute('data-weather', state);
        
        // Animate transition
        if (animate && previousState) {
            AnimationEngine.fadeTransition(elements.background, () => {
                applyWeatherState(state);
            });
        } else {
            applyWeatherState(state);
        }
        
        // Emit event
        const event = new CustomEvent('weatherchange', { 
            detail: { previous: previousState, current: state }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Apply weather state visuals
     * @param {string} state - Weather state
     */
    function applyWeatherState(state) {
        // Clear previous state
        clearWeatherEffects();
        
        // Apply sky gradient
        applySkyGradient(state);
        
        // Apply specific effects
        switch (state) {
            case WEATHER_STATES.CLEAR_DAY:
                renderSun();
                renderClouds(2, 'light');
                break;
                
            case WEATHER_STATES.CLEAR_NIGHT:
                renderMoon();
                renderStars();
                break;
                
            case WEATHER_STATES.CLOUDY:
                renderClouds(6, 'medium');
                break;
                
            case WEATHER_STATES.RAIN:
                renderClouds(8, 'dark');
                if (particleSystem) particleSystem.start('rain');
                break;
                
            case WEATHER_STATES.STORM:
                renderClouds(10, 'dark');
                if (particleSystem) particleSystem.start('heavyRain');
                startLightning();
                break;
                
            case WEATHER_STATES.SNOW:
                renderClouds(4, 'light');
                if (particleSystem) particleSystem.start('snow');
                break;
                
            case WEATHER_STATES.FOG:
                renderFog();
                renderClouds(3, 'light');
                break;
        }
    }
    
    /**
     * Clear all weather effects
     */
    function clearWeatherEffects() {
        // Stop particles
        if (particleSystem) particleSystem.stop();
        
        // Stop lightning
        stopLightning();
        
        // Clear clouds
        if (elements.clouds) elements.clouds.innerHTML = '';
        
        // Clear effects
        if (elements.effects) {
            const lightning = elements.effects.querySelector('.lightning');
            elements.effects.innerHTML = '';
            if (lightning) elements.effects.appendChild(lightning);
        }
        
        // Clear sky extras
        if (elements.sky) elements.sky.innerHTML = '';
    }
    
    /**
     * Apply sky gradient for weather state
     */
    function applySkyGradient(state) {
        const gradients = {
            [WEATHER_STATES.CLEAR_DAY]: `linear-gradient(180deg, 
                #1e90ff 0%, 
                #87ceeb 30%, 
                #b4d7e8 60%, 
                #d4e5ed 100%)`,
            [WEATHER_STATES.CLEAR_NIGHT]: `linear-gradient(180deg, 
                #0a0a1a 0%, 
                #0d1426 30%, 
                #141e33 60%, 
                #1a2640 100%)`,
            [WEATHER_STATES.CLOUDY]: `linear-gradient(180deg, 
                #4a5568 0%, 
                #718096 40%, 
                #a0aec0 70%, 
                #cbd5e0 100%)`,
            [WEATHER_STATES.RAIN]: `linear-gradient(180deg, 
                #2d3748 0%, 
                #4a5568 30%, 
                #718096 60%, 
                #a0aec0 100%)`,
            [WEATHER_STATES.STORM]: `linear-gradient(180deg, 
                #1a1a2e 0%, 
                #2d2d44 30%, 
                #3d3d5c 60%, 
                #4d4d6a 100%)`,
            [WEATHER_STATES.SNOW]: `linear-gradient(180deg, 
                #64748b 0%, 
                #94a3b8 30%, 
                #cbd5e1 60%, 
                #e2e8f0 100%)`,
            [WEATHER_STATES.FOG]: `linear-gradient(180deg, 
                #94a3b8 0%, 
                #b8c5d1 30%, 
                #d1dae3 60%, 
                #e8eef3 100%)`
        };
        
        if (elements.sky) {
            elements.sky.style.background = gradients[state] || gradients[WEATHER_STATES.CLEAR_DAY];
        }
    }
    
    /**
     * Render sun element
     */
    function renderSun() {
        const sunHTML = `
            <div class="sun"></div>
            <div class="sun-rays">
                ${Array(12).fill('<div class="sun-ray"></div>').join('')}
            </div>
        `;
        
        if (elements.sky) {
            elements.sky.innerHTML += sunHTML;
        }
    }
    
    /**
     * Render moon element
     */
    function renderMoon() {
        const moonHTML = '<div class="moon"></div>';
        
        if (elements.sky) {
            elements.sky.innerHTML += moonHTML;
        }
    }
    
    /**
     * Render stars
     */
    function renderStars() {
        const starsContainer = document.createElement('div');
        starsContainer.className = 'stars';
        
        // Generate random stars
        const starCount = 100;
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            
            // Random size
            if (Math.random() > 0.8) {
                star.classList.add('star--large');
            } else if (Math.random() > 0.5) {
                star.classList.add('star--small');
            }
            
            // Random position
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 60}%`;
            
            // Random animation delay
            star.style.animationDelay = `${Math.random() * 3}s`;
            
            starsContainer.appendChild(star);
        }
        
        // Add shooting star occasionally
        const shootingStar = document.createElement('div');
        shootingStar.className = 'shooting-star';
        shootingStar.style.top = `${10 + Math.random() * 30}%`;
        shootingStar.style.left = `${Math.random() * 50}%`;
        shootingStar.style.animationDelay = `${Math.random() * 5}s`;
        starsContainer.appendChild(shootingStar);
        
        if (elements.sky) {
            elements.sky.appendChild(starsContainer);
        }
    }
    
    /**
     * Render clouds
     * @param {number} count - Number of clouds
     * @param {string} type - Cloud type (light, medium, dark)
     */
    function renderClouds(count, type = 'light') {
        if (!elements.clouds) return;
        
        const sizes = ['small', 'medium', 'large', 'xlarge'];
        const layers = ['back', 'mid', 'front'];
        
        for (let i = 0; i < count; i++) {
            const cloud = document.createElement('div');
            const size = sizes[Math.floor(Math.random() * sizes.length)];
            const layer = layers[Math.floor(Math.random() * layers.length)];
            
            cloud.className = `cloud cloud--${size} cloud--${i + 1} cloud--layer-${layer}`;
            
            if (type === 'dark') {
                cloud.classList.add('cloud--dark');
            }
            
            // Random vertical position
            cloud.style.top = `${5 + Math.random() * 35}%`;
            
            // Random animation duration
            const duration = 60 + Math.random() * 60;
            cloud.style.animationDuration = `${duration}s`;
            
            // Random delay
            cloud.style.animationDelay = `-${Math.random() * duration}s`;
            
            elements.clouds.appendChild(cloud);
        }
    }
    
    /**
     * Render fog effect
     */
    function renderFog() {
        if (!elements.effects) return;
        
        const fog1 = document.createElement('div');
        fog1.className = 'fog-layer';
        
        const fog2 = document.createElement('div');
        fog2.className = 'fog-layer fog-layer--2';
        
        elements.effects.appendChild(fog1);
        elements.effects.appendChild(fog2);
        
        // Add fog wisps
        for (let i = 0; i < 5; i++) {
            const wisp = document.createElement('div');
            wisp.className = 'fog-wisp';
            wisp.style.top = `${30 + Math.random() * 50}%`;
            wisp.style.left = `${Math.random() * 100}%`;
            wisp.style.animationDelay = `${Math.random() * 10}s`;
            elements.effects.appendChild(wisp);
        }
    }
    
    /**
     * Start lightning effect
     */
    function startLightning() {
        const lightning = elements.effects?.querySelector('.lightning');
        if (!lightning) return;
        
        // Random lightning flashes
        lightningInterval = setInterval(() => {
            if (Math.random() > 0.7) {
                lightning.classList.add('flash');
                setTimeout(() => lightning.classList.remove('flash'), 300);
            }
        }, 2000 + Math.random() * 5000);
    }
    
    /**
     * Stop lightning effect
     */
    function stopLightning() {
        if (lightningInterval) {
            clearInterval(lightningInterval);
            lightningInterval = null;
        }
    }
    
    /**
     * Get current weather state
     */
    function getCurrentState() {
        return currentState;
    }
    
    /**
     * Map API condition to weather state
     */
    function mapConditionToState(condition, isDay = true) {
        const mapping = {
            'sunny': isDay ? WEATHER_STATES.CLEAR_DAY : WEATHER_STATES.CLEAR_NIGHT,
            'clear': isDay ? WEATHER_STATES.CLEAR_DAY : WEATHER_STATES.CLEAR_NIGHT,
            'clear_day': WEATHER_STATES.CLEAR_DAY,
            'clear_night': WEATHER_STATES.CLEAR_NIGHT,
            'partly_cloudy': WEATHER_STATES.CLOUDY,
            'cloudy': WEATHER_STATES.CLOUDY,
            'overcast': WEATHER_STATES.CLOUDY,
            'rain': WEATHER_STATES.RAIN,
            'light_rain': WEATHER_STATES.RAIN,
            'heavy_rain': WEATHER_STATES.STORM,
            'storm': WEATHER_STATES.STORM,
            'thunderstorm': WEATHER_STATES.STORM,
            'snow': WEATHER_STATES.SNOW,
            'light_snow': WEATHER_STATES.SNOW,
            'fog': WEATHER_STATES.FOG,
            'mist': WEATHER_STATES.FOG,
            'haze': WEATHER_STATES.FOG
        };
        
        return mapping[condition.toLowerCase()] || 
               (isDay ? WEATHER_STATES.CLEAR_DAY : WEATHER_STATES.CLEAR_NIGHT);
    }
    
    /**
     * Update weather based on data
     */
    function updateFromData(weatherData) {
        if (!weatherData) return;
        
        const condition = weatherData.condition || weatherData.weather?.condition;
        const isDay = weatherData.isDay !== undefined ? weatherData.isDay : 
                      (weatherData.weather?.isDay !== undefined ? weatherData.weather.isDay : true);
        
        if (condition) {
            const state = mapConditionToState(condition, isDay);
            setWeather(state);
        }
    }
    
    return {
        init,
        setWeather,
        getCurrentState,
        mapConditionToState,
        updateFromData,
        WEATHER_STATES
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherEngine;
}

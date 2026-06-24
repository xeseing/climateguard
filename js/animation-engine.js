/**
 * ClimateGuard - Animation Engine
 * Handles transitions, micro-interactions, and animations
 */

const AnimationEngine = (function() {
    // Animation settings
    const settings = {
        enabled: true,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };
    
    /**
     * Initialize animation engine
     */
    function init() {
        // Check for reduced motion preference
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        motionQuery.addEventListener('change', (e) => {
            settings.reducedMotion = e.matches;
        });
        
        // Initialize observers
        initScrollReveal();
        initRippleEffects();
        
        // Load saved settings
        const savedSettings = Storage.getSettings();
        settings.enabled = savedSettings.animationsEnabled !== false;
    }
    
    /**
     * Enable/disable animations
     */
    function setEnabled(enabled) {
        settings.enabled = enabled;
        Storage.updateSettings({ animationsEnabled: enabled });
        
        if (!enabled) {
            document.body.classList.add('animations-disabled');
        } else {
            document.body.classList.remove('animations-disabled');
        }
    }
    
    /**
     * Check if animations are enabled
     */
    function isEnabled() {
        return settings.enabled && !settings.reducedMotion;
    }
    
    /**
     * Initialize scroll reveal animations
     */
    function initScrollReveal() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && isEnabled()) {
                    entry.target.classList.add('revealed');
                    // Optionally unobserve after reveal
                    // observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        // Observe elements with reveal class
        document.querySelectorAll('.reveal, .card').forEach(el => {
            observer.observe(el);
        });
        
        return observer;
    }
    
    /**
     * Initialize ripple effects on buttons
     */
    function initRippleEffects() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.btn, .icon-btn');
            if (!button || !isEnabled()) return;
            
            createRipple(e, button);
        });
    }
    
    /**
     * Create ripple effect
     */
    function createRipple(event, element) {
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
        
        element.appendChild(ripple);
        
        ripple.addEventListener('animationend', () => ripple.remove());
    }
    
    /**
     * Fade transition between states
     */
    function fadeTransition(element, callback, duration = 500) {
        if (!isEnabled()) {
            callback();
            return;
        }
        
        element.style.transition = `opacity ${duration / 2}ms ease`;
        element.style.opacity = '0';
        
        setTimeout(() => {
            callback();
            element.style.opacity = '1';
            
            setTimeout(() => {
                element.style.transition = '';
            }, duration / 2);
        }, duration / 2);
    }
    
    /**
     * Slide transition for pages
     */
    function slideTransition(element, direction = 'left', callback, duration = 400) {
        if (!isEnabled()) {
            callback();
            return;
        }
        
        const translateValue = direction === 'left' ? '-100%' : '100%';
        
        element.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`;
        element.style.transform = `translateX(${translateValue})`;
        element.style.opacity = '0';
        
        setTimeout(() => {
            callback();
            element.style.transform = 'translateX(0)';
            element.style.opacity = '1';
            
            setTimeout(() => {
                element.style.transition = '';
            }, duration);
        }, duration);
    }
    
    /**
     * Animate number change
     */
    function animateNumber(element, start, end, duration = 500, suffix = '') {
        if (!isEnabled()) {
            element.textContent = end + suffix;
            return;
        }
        
        const startTime = performance.now();
        const change = end - start;
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + change * eased);
            
            element.textContent = current + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    }
    
    /**
     * Stagger animation for list items
     */
    function staggerAnimation(elements, animationClass, delay = 50) {
        if (!isEnabled()) {
            elements.forEach(el => el.classList.add(animationClass, 'revealed'));
            return;
        }
        
        elements.forEach((el, index) => {
            el.style.animationDelay = `${index * delay}ms`;
            el.classList.add(animationClass);
        });
    }
    
    /**
     * Shake animation for errors
     */
    function shake(element) {
        if (!isEnabled()) return;
        
        element.classList.add('shake');
        element.addEventListener('animationend', () => {
            element.classList.remove('shake');
        }, { once: true });
    }
    
    /**
     * Pulse animation
     */
    function pulse(element, duration = 1000) {
        if (!isEnabled()) return;
        
        element.classList.add('pulse-glow');
        setTimeout(() => {
            element.classList.remove('pulse-glow');
        }, duration);
    }
    
    /**
     * Theme transition
     */
    function themeTransition(callback) {
        if (!isEnabled()) {
            callback();
            return;
        }
        
        document.body.classList.add('theme-transitioning');
        callback();
        
        setTimeout(() => {
            document.body.classList.remove('theme-transitioning');
        }, 500);
    }
    
    /**
     * Page enter animation
     */
    function pageEnter(container) {
        if (!isEnabled()) return;
        
        container.classList.add('page-transition-enter');
        
        requestAnimationFrame(() => {
            container.classList.add('page-transition-enter-active');
            container.classList.remove('page-transition-enter');
        });
        
        setTimeout(() => {
            container.classList.remove('page-transition-enter-active');
        }, 400);
    }
    
    /**
     * Card hover lift effect (for touch devices)
     */
    function setupCardHoverEffects() {
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('touchstart', function() {
                this.classList.add('touch-hover');
            }, { passive: true });
            
            card.addEventListener('touchend', function() {
                setTimeout(() => this.classList.remove('touch-hover'), 300);
            }, { passive: true });
        });
    }
    
    return {
        init,
        setEnabled,
        isEnabled,
        fadeTransition,
        slideTransition,
        animateNumber,
        staggerAnimation,
        shake,
        pulse,
        themeTransition,
        pageEnter,
        createRipple,
        setupCardHoverEffects
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationEngine;
}

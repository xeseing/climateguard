/**
 * ClimateGuard - Risk Engine
 * Weather risk analysis and scoring
 */

const RiskEngine = (function() {
    
    // Risk categories
    const RISK_CATEGORIES = {
        UV: 'uv',
        WIND: 'wind',
        HEAT: 'heat',
        STORM: 'storm',
        PRECIPITATION: 'precipitation',
        VISIBILITY: 'visibility',
        AIR_QUALITY: 'air_quality'
    };

    // Risk levels
    const RISK_LEVELS = {
        LOW: { label: 'Low', color: '#22c55e', icon: 'fa-check-circle', value: 1 },
        MODERATE: { label: 'Moderate', color: '#eab308', icon: 'fa-exclamation-circle', value: 2 },
        HIGH: { label: 'High', color: '#f97316', icon: 'fa-exclamation-triangle', value: 3 },
        EXTREME: { label: 'Extreme', color: '#ef4444', icon: 'fa-skull-crossbones', value: 4 }
    };

    /**
     * Analyze weather data and return risk report
     * @param {Object} weatherData - Weather data from API
     * @returns {Object} Risk report
     */
    function analyzeRisks(weatherData) {
        if (!weatherData) {
            weatherData = getDefaultWeatherData();
        }

        const weather = weatherData.weather || weatherData;
        
        const risks = {
            uv: analyzeUVRisk(weather.uvIndex || 6),
            wind: analyzeWindRisk(weather.windSpeed || 18),
            heat: analyzeHeatRisk(weather.temp || 28, weather.feelsLike || 30),
            storm: analyzeStormRisk(weather.condition || 'partly_cloudy', weather.precipitation || 0),
            precipitation: analyzePrecipRisk(weather.precipitation || 0, weather.humidity || 65),
            visibility: analyzeVisibilityRisk(weather.visibility || 10),
            airQuality: analyzeAirQualityRisk(weather.airQuality || 42)
        };

        const overallScore = calculateOverallRisk(risks);
        const overallLevel = getOverallLevel(overallScore);
        const recommendations = generateRecommendations(risks, weather);
        const travelAdvisory = generateTravelAdvisory(risks, overallLevel);

        return {
            risks,
            overallScore,
            overallLevel,
            recommendations,
            travelAdvisory,
            timestamp: Date.now(),
            location: weatherData.location || { name: 'San Francisco' }
        };
    }

    /**
     * Default weather data for demo
     */
    function getDefaultWeatherData() {
        return {
            location: { name: 'San Francisco', region: 'California, USA' },
            weather: {
                temp: 28, feelsLike: 30, humidity: 65, uvIndex: 6,
                windSpeed: 18, windDirection: 'SW', visibility: 10,
                airQuality: 42, pressure: 1013, precipitation: 0,
                condition: 'partly_cloudy', conditionText: 'Partly Cloudy'
            }
        };
    }

    /**
     * Analyze UV risk
     */
    function analyzeUVRisk(uvIndex) {
        let level, description, advice;
        
        if (uvIndex <= 2) {
            level = RISK_LEVELS.LOW;
            description = 'UV radiation is low. Safe for outdoor activities.';
            advice = 'No special precautions needed.';
        } else if (uvIndex <= 5) {
            level = RISK_LEVELS.MODERATE;
            description = 'Moderate UV exposure. Some risk of sunburn.';
            advice = 'Wear sunscreen SPF 30+. Seek shade during midday hours.';
        } else if (uvIndex <= 7) {
            level = RISK_LEVELS.HIGH;
            description = 'High UV radiation. Significant sunburn risk.';
            advice = 'Apply SPF 50+ sunscreen. Wear hat and sunglasses. Limit sun exposure 10am-4pm.';
        } else {
            level = RISK_LEVELS.EXTREME;
            description = 'Extreme UV levels. Burns possible in minutes.';
            advice = 'Avoid outdoor activities. Full sun protection required.';
        }

        return { category: 'UV Exposure', value: uvIndex, unit: 'index', level, description, advice, icon: 'fa-sun' };
    }

    /**
     * Analyze wind risk
     */
    function analyzeWindRisk(windSpeed) {
        let level, description, advice;
        
        if (windSpeed <= 20) {
            level = RISK_LEVELS.LOW;
            description = 'Light to moderate winds. Normal conditions.';
            advice = 'No wind-related concerns.';
        } else if (windSpeed <= 40) {
            level = RISK_LEVELS.MODERATE;
            description = 'Strong winds. Minor disruptions possible.';
            advice = 'Secure loose items. Exercise caution while driving.';
        } else if (windSpeed <= 60) {
            level = RISK_LEVELS.HIGH;
            description = 'Very strong winds. Potential for damage.';
            advice = 'Avoid open areas. Stay away from trees and structures.';
        } else {
            level = RISK_LEVELS.EXTREME;
            description = 'Dangerous wind speeds. Major damage possible.';
            advice = 'Seek shelter immediately. Do not travel.';
        }

        return { category: 'Wind Speed', value: windSpeed, unit: 'km/h', level, description, advice, icon: 'fa-wind' };
    }

    /**
     * Analyze heat risk
     */
    function analyzeHeatRisk(temp, feelsLike) {
        const effectiveTemp = Math.max(temp, feelsLike);
        let level, description, advice;
        
        if (effectiveTemp <= 25) {
            level = RISK_LEVELS.LOW;
            description = 'Comfortable temperatures. No heat stress risk.';
            advice = 'Enjoy outdoor activities freely.';
        } else if (effectiveTemp <= 32) {
            level = RISK_LEVELS.MODERATE;
            description = 'Warm conditions. Stay hydrated.';
            advice = 'Drink water regularly. Take breaks in shade.';
        } else if (effectiveTemp <= 40) {
            level = RISK_LEVELS.HIGH;
            description = 'Hot conditions. Heat exhaustion possible.';
            advice = 'Limit outdoor exertion. Stay in air conditioning. Drink plenty of water.';
        } else {
            level = RISK_LEVELS.EXTREME;
            description = 'Extreme heat. Heatstroke danger.';
            advice = 'Stay indoors. Avoid all unnecessary outdoor activity.';
        }

        return { category: 'Heat Index', value: effectiveTemp, unit: '°C', level, description, advice, icon: 'fa-temperature-high' };
    }

    /**
     * Analyze storm risk
     */
    function analyzeStormRisk(condition, precipitation) {
        let level, description, advice;
        const condLower = condition.toLowerCase();
        
        if (condLower.includes('storm') || condLower.includes('thunder')) {
            level = RISK_LEVELS.EXTREME;
            description = 'Thunderstorm activity detected. Lightning danger.';
            advice = 'Seek indoor shelter. Avoid water and tall objects.';
        } else if (condLower.includes('rain') || precipitation > 10) {
            level = RISK_LEVELS.MODERATE;
            description = 'Rain expected. Possible flooding in low areas.';
            advice = 'Carry rain gear. Drive carefully on wet roads.';
        } else if (condLower.includes('cloud') || condLower.includes('overcast')) {
            level = RISK_LEVELS.LOW;
            description = 'Cloudy but no severe weather expected.';
            advice = 'No storm-related concerns at this time.';
        } else {
            level = RISK_LEVELS.LOW;
            description = 'Clear conditions. No storm risk.';
            advice = 'Weather is favorable for all activities.';
        }

        return { category: 'Storm Risk', value: level.label, unit: '', level, description, advice, icon: 'fa-cloud-bolt' };
    }

    /**
     * Analyze precipitation risk
     */
    function analyzePrecipRisk(precipitation, humidity) {
        let level, description, advice;
        
        if (precipitation <= 2 && humidity <= 70) {
            level = RISK_LEVELS.LOW;
            description = 'Little to no precipitation expected.';
            advice = 'No rain protection needed.';
        } else if (precipitation <= 10 || humidity > 80) {
            level = RISK_LEVELS.MODERATE;
            description = 'Light rain or high humidity. Mild inconvenience.';
            advice = 'Carry an umbrella. Roads may be slippery.';
        } else if (precipitation <= 30) {
            level = RISK_LEVELS.HIGH;
            description = 'Heavy precipitation expected. Flooding possible.';
            advice = 'Avoid flood-prone areas. Limit driving.';
        } else {
            level = RISK_LEVELS.EXTREME;
            description = 'Extreme precipitation. Severe flooding likely.';
            advice = 'Move to higher ground if needed. Avoid all travel.';
        }

        return { category: 'Precipitation', value: precipitation, unit: 'mm', level, description, advice, icon: 'fa-cloud-rain' };
    }

    /**
     * Analyze visibility risk
     */
    function analyzeVisibilityRisk(visibility) {
        let level, description, advice;
        
        if (visibility >= 10) {
            level = RISK_LEVELS.LOW;
            description = 'Excellent visibility. Clear conditions.';
            advice = 'No visibility concerns.';
        } else if (visibility >= 5) {
            level = RISK_LEVELS.MODERATE;
            description = 'Reduced visibility. Exercise caution.';
            advice = 'Use headlights while driving. Reduce speed.';
        } else if (visibility >= 1) {
            level = RISK_LEVELS.HIGH;
            description = 'Poor visibility. Fog or haze conditions.';
            advice = 'Avoid driving if possible. Use fog lights.';
        } else {
            level = RISK_LEVELS.EXTREME;
            description = 'Near-zero visibility. Extremely dangerous.';
            advice = 'Do not drive. Wait for conditions to improve.';
        }

        return { category: 'Visibility', value: visibility, unit: 'km', level, description, advice, icon: 'fa-eye' };
    }

    /**
     * Analyze air quality risk
     */
    function analyzeAirQualityRisk(aqi) {
        let level, description, advice;
        
        if (aqi <= 50) {
            level = RISK_LEVELS.LOW;
            description = 'Air quality is satisfactory. No health risk.';
            advice = 'Enjoy outdoor activities.';
        } else if (aqi <= 100) {
            level = RISK_LEVELS.MODERATE;
            description = 'Acceptable air quality. Sensitive groups may be affected.';
            advice = 'People with respiratory conditions should limit prolonged outdoor exertion.';
        } else if (aqi <= 150) {
            level = RISK_LEVELS.HIGH;
            description = 'Unhealthy for sensitive groups. General public may notice effects.';
            advice = 'Reduce outdoor activities. Keep windows closed.';
        } else {
            level = RISK_LEVELS.EXTREME;
            description = 'Hazardous air quality. Health emergency.';
            advice = 'Stay indoors. Use air purifiers. Wear N95 mask if going outside.';
        }

        return { category: 'Air Quality', value: aqi, unit: 'AQI', level, description, advice, icon: 'fa-lungs' };
    }

    /**
     * Calculate overall risk score (0-100)
     */
    function calculateOverallRisk(risks) {
        const weights = {
            uv: 0.12, wind: 0.15, heat: 0.18, storm: 0.20,
            precipitation: 0.12, visibility: 0.10, airQuality: 0.13
        };

        let totalScore = 0;
        Object.keys(risks).forEach(key => {
            const riskLevel = risks[key].level.value;
            totalScore += (riskLevel / 4) * 100 * (weights[key] || 0.14);
        });

        return Math.round(totalScore);
    }

    /**
     * Get overall risk level from score
     */
    function getOverallLevel(score) {
        if (score <= 25) return RISK_LEVELS.LOW;
        if (score <= 50) return RISK_LEVELS.MODERATE;
        if (score <= 75) return RISK_LEVELS.HIGH;
        return RISK_LEVELS.EXTREME;
    }

    /**
     * Generate recommendations based on risks
     */
    function generateRecommendations(risks, weather) {
        const recs = [];
        
        Object.values(risks).forEach(risk => {
            if (risk.level.value >= 2) {
                recs.push({
                    category: risk.category,
                    icon: risk.icon,
                    advice: risk.advice,
                    level: risk.level
                });
            }
        });

        // Sort by severity (highest first)
        recs.sort((a, b) => b.level.value - a.level.value);

        // Add general recommendation
        if (recs.length === 0) {
            recs.push({
                category: 'General',
                icon: 'fa-check-circle',
                advice: 'Weather conditions are favorable. Enjoy your day!',
                level: RISK_LEVELS.LOW
            });
        }

        return recs;
    }

    /**
     * Generate travel advisory
     */
    function generateTravelAdvisory(risks, overallLevel) {
        const advisory = {
            level: overallLevel,
            summary: '',
            details: [],
            packingList: []
        };

        if (overallLevel.value <= 1) {
            advisory.summary = 'All clear! Great conditions for travel and outdoor activities.';
            advisory.packingList = ['Sunglasses', 'Water bottle', 'Comfortable clothing'];
        } else if (overallLevel.value === 2) {
            advisory.summary = 'Generally safe to travel. Take basic precautions.';
            advisory.packingList = ['Sunscreen', 'Rain jacket', 'Water bottle', 'First aid kit'];
        } else if (overallLevel.value === 3) {
            advisory.summary = 'Exercise caution. Consider postponing non-essential outdoor activities.';
            advisory.packingList = ['Rain gear', 'Extra water', 'Emergency contacts', 'Power bank', 'First aid kit'];
        } else {
            advisory.summary = 'Travel NOT recommended. Stay indoors if possible.';
            advisory.packingList = ['Emergency supplies', 'Flashlight', 'Portable radio', 'Medications', 'Emergency contacts'];
        }

        // Add specific details
        Object.values(risks).forEach(risk => {
            if (risk.level.value >= 2) {
                advisory.details.push(`${risk.category}: ${risk.description}`);
            }
        });

        return advisory;
    }

    /**
     * Generate PDF-friendly report data
     */
    function generateReportData(riskReport) {
        const now = new Date();
        return {
            title: 'ClimateGuard Weather Risk Report',
            generatedAt: now.toLocaleString(),
            location: riskReport.location?.name || 'Unknown',
            overallRisk: riskReport.overallLevel.label,
            overallScore: riskReport.overallScore,
            risks: Object.values(riskReport.risks).map(r => ({
                category: r.category,
                value: `${r.value}${r.unit ? ' ' + r.unit : ''}`,
                level: r.level.label,
                description: r.description,
                advice: r.advice
            })),
            recommendations: riskReport.recommendations,
            travelAdvisory: riskReport.travelAdvisory
        };
    }

    /**
     * Render risk summary for homepage
     */
    function renderRiskSummary(container, riskReport) {
        if (!container) return;

        const topRisks = Object.values(riskReport.risks)
            .sort((a, b) => b.level.value - a.level.value)
            .slice(0, 4);

        container.innerHTML = topRisks.map(risk => `
            <div style="flex: 1; min-width: 70px; text-align: center; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 12px;">
                <i class="fa-solid ${risk.icon}" style="color: ${risk.level.color}; font-size: 1.1rem; margin-bottom: 4px;"></i>
                <div style="font-size: 0.7rem; color: var(--color-text-secondary); margin-bottom: 2px;">${risk.category}</div>
                <div style="font-size: 0.75rem; font-weight: 700; color: ${risk.level.color};">${risk.level.label}</div>
            </div>
        `).join('');
    }

    return {
        analyzeRisks,
        generateReportData,
        renderRiskSummary,
        RISK_LEVELS,
        RISK_CATEGORIES
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RiskEngine;
}

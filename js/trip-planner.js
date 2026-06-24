/**
 * ClimateGuard - Trip Planner Module
 * Generates weather-based trip analysis
 */

(function() {
    // Trip type configurations
    const TRIP_CONFIGS = {
        leisure: {
            label: 'Leisure / Vacation',
            idealTemp: { min: 20, max: 30 },
            concerns: ['rain', 'extreme_heat', 'extreme_cold'],
            activities: ['sightseeing', 'beach', 'dining', 'shopping']
        },
        business: {
            label: 'Business',
            idealTemp: { min: 15, max: 28 },
            concerns: ['storm', 'flight_delays', 'flooding'],
            activities: ['meetings', 'conferences', 'networking']
        },
        adventure: {
            label: 'Adventure / Outdoor',
            idealTemp: { min: 10, max: 32 },
            concerns: ['storm', 'extreme_wind', 'poor_visibility', 'lightning'],
            activities: ['hiking', 'climbing', 'water_sports', 'camping']
        },
        family: {
            label: 'Family',
            idealTemp: { min: 18, max: 28 },
            concerns: ['extreme_heat', 'storm', 'air_quality', 'uv'],
            activities: ['parks', 'museums', 'gentle_walks', 'family_dining']
        }
    };

    // Weather conditions for each day simulation
    const CONDITIONS = ['sunny', 'partly_cloudy', 'cloudy', 'rain', 'storm', 'clear_night'];
    const CONDITION_LABELS = {
        'sunny': 'Sunny', 'partly_cloudy': 'Partly Cloudy', 'cloudy': 'Cloudy',
        'rain': 'Rainy', 'storm': 'Thunderstorm', 'clear_night': 'Clear'
    };
    const CONDITION_ICONS = {
        'sunny': 'fa-sun', 'partly_cloudy': 'fa-cloud-sun', 'cloudy': 'fa-cloud',
        'rain': 'fa-cloud-rain', 'storm': 'fa-cloud-bolt', 'clear_night': 'fa-moon'
    };

    // Risk colors
    function getRiskColor(level) {
        const colors = { 'Low': '#22c55e', 'Moderate': '#eab308', 'High': '#f97316', 'Extreme': '#ef4444' };
        return colors[level] || '#22c55e';
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initTripPlanner, 500);
    });

    function initTripPlanner() {
        // Set default dates
        const startDate = document.getElementById('tripStartDate');
        const endDate = document.getElementById('tripEndDate');
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        if (startDate) startDate.value = formatDateInput(today);
        if (endDate) endDate.value = formatDateInput(nextWeek);

        // Quick destinations
        document.querySelectorAll('.quick-dest').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.quick-dest').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const dest = document.getElementById('tripDestination');
                if (dest) dest.value = btn.dataset.city;
            });
        });

        // Analyze button
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', analyzeTrip);
        }

        // Download button
        const downloadBtn = document.getElementById('downloadTripBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadTripReport);
        }
    }

    function formatDateInput(date) {
        return date.toISOString().split('T')[0];
    }

    function analyzeTrip() {
        const destination = document.getElementById('tripDestination').value.trim();
        const startDate = document.getElementById('tripStartDate').value;
        const endDate = document.getElementById('tripEndDate').value;
        const tripType = document.getElementById('tripType').value;

        if (!destination) {
            if (typeof UI !== 'undefined') UI.showNotification('Please enter a destination', 'warning');
            return;
        }
        if (!startDate || !endDate) {
            if (typeof UI !== 'undefined') UI.showNotification('Please select travel dates', 'warning');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (end < start) {
            if (typeof UI !== 'undefined') UI.showNotification('End date must be after start date', 'error');
            return;
        }

        const dayCount = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        if (dayCount > 14) {
            if (typeof UI !== 'undefined') UI.showNotification('Maximum 14 days for trip analysis', 'warning');
            return;
        }

        // Generate trip forecast
        const tripData = generateTripForecast(destination, start, dayCount, tripType);
        
        // Show results
        renderTripResults(tripData, destination, tripType, start, end);
        
        // Store trip data for PDF
        window._lastTripData = { tripData, destination, tripType, start, end };
    }

    function generateTripForecast(destination, startDate, days, tripType) {
        const config = TRIP_CONFIGS[tripType];
        const forecast = [];
        
        // Generate semi-random but realistic forecast
        const seed = destination.length + startDate.getMonth();
        
        for (let i = 0; i < days; i++) {
            const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
            
            // Semi-random weather based on destination & day
            const condIndex = (seed + i * 3 + dayOfYear) % CONDITIONS.length;
            const condition = CONDITIONS[condIndex];
            
            // Temperature with seasonal variation
            const baseTemp = 22 + Math.sin(dayOfYear / 365 * Math.PI * 2) * 8;
            const temp = Math.round(baseTemp + (Math.sin(seed * i) * 5) + (Math.random() * 4 - 2));
            const feelsLike = temp + Math.round(Math.random() * 4 - 1);
            
            const humidity = 40 + Math.round(Math.random() * 40);
            const windSpeed = 5 + Math.round(Math.random() * 25);
            const uvIndex = Math.max(1, Math.min(11, Math.round(6 + Math.sin(dayOfYear / 365 * Math.PI) * 4 + (Math.random() * 2 - 1))));
            const precipitation = condition === 'rain' ? Math.round(5 + Math.random() * 20) : (condition === 'storm' ? Math.round(15 + Math.random() * 30) : 0);
            const visibility = condition === 'rain' ? 5 + Math.round(Math.random() * 5) : 10;
            const airQuality = 20 + Math.round(Math.random() * 80);

            // Analyze risks for this day
            const weatherData = {
                weather: {
                    temp, feelsLike, humidity, uvIndex, windSpeed,
                    visibility, airQuality, precipitation, condition
                }
            };
            
            const risks = RiskEngine.analyzeRisks(weatherData);
            
            // Generate day-specific tips
            const tips = generateDayTips(condition, temp, windSpeed, uvIndex, tripType);

            forecast.push({
                date,
                condition,
                conditionText: CONDITION_LABELS[condition] || 'Clear',
                conditionIcon: CONDITION_ICONS[condition] || 'fa-sun',
                temp,
                feelsLike,
                humidity,
                windSpeed,
                uvIndex,
                precipitation,
                visibility,
                airQuality,
                riskReport: risks,
                tips
            });
        }

        return forecast;
    }

    function generateDayTips(condition, temp, windSpeed, uvIndex, tripType) {
        const tips = [];
        
        if (condition === 'rain' || condition === 'storm') {
            tips.push('Carry rain gear and waterproof bag');
            if (tripType === 'adventure') tips.push('Avoid hiking on exposed trails');
            if (tripType === 'family') tips.push('Plan indoor activities like museums');
        }
        
        if (temp > 32) {
            tips.push('Stay hydrated, drink water every 30 min');
            tips.push('Avoid outdoor activities between 12-3 PM');
        }
        
        if (temp < 10) {
            tips.push('Layer clothing for warmth');
            if (tripType === 'adventure') tips.push('Check for icy trail conditions');
        }
        
        if (uvIndex >= 6) {
            tips.push(`UV is ${uvIndex >= 8 ? 'very high' : 'high'} — apply SPF 50+ sunscreen`);
        }
        
        if (windSpeed > 25) {
            tips.push('Strong winds expected — secure loose items');
        }

        if (condition === 'sunny' && tripType === 'leisure') {
            tips.push('Great day for outdoor sightseeing!');
        }

        if (tips.length === 0) {
            tips.push('Good conditions for your planned activities');
        }

        return tips;
    }

    function renderTripResults(tripData, destination, tripType, startDate, endDate) {
        const resultsEl = document.getElementById('tripResults');
        if (!resultsEl) return;

        resultsEl.style.display = 'block';
        
        // Smooth scroll to results
        setTimeout(() => {
            resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);

        // Render summary
        renderTripSummary(tripData, destination, tripType, startDate, endDate);

        // Render day cards
        renderTripDays(tripData);
    }

    function renderTripSummary(tripData, destination, tripType, startDate, endDate) {
        const container = document.getElementById('tripSummary');
        if (!container) return;

        // Calculate averages
        const avgTemp = Math.round(tripData.reduce((sum, d) => sum + d.temp, 0) / tripData.length);
        const maxTemp = Math.max(...tripData.map(d => d.temp));
        const minTemp = Math.min(...tripData.map(d => d.temp));
        const rainyDays = tripData.filter(d => d.condition === 'rain' || d.condition === 'storm').length;
        const avgRisk = Math.round(tripData.reduce((sum, d) => sum + d.riskReport.overallScore, 0) / tripData.length);
        const overallLevel = avgRisk <= 25 ? 'Low' : avgRisk <= 50 ? 'Moderate' : avgRisk <= 75 ? 'High' : 'Extreme';
        const levelColor = getRiskColor(overallLevel);

        const config = TRIP_CONFIGS[tripType];
        const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

        container.innerHTML = `
            <div class="trip-summary__header">
                <div class="trip-summary__icon" style="background: ${levelColor}20; color: ${levelColor};">
                    <i class="fa-solid fa-suitcase-rolling"></i>
                </div>
                <div>
                    <div style="font-weight: 700; font-size: 1.1rem;">${destination}</div>
                    <div style="font-size: 0.78rem; color: var(--color-text-secondary);">${dateRange} • ${tripData.length} days • ${config.label}</div>
                </div>
            </div>
            <div style="padding: 12px; background: ${levelColor}10; border-radius: var(--radius-md); border-left: 4px solid ${levelColor}; margin-bottom: 12px;">
                <div style="font-weight: 700; color: ${levelColor}; font-size: 0.85rem; margin-bottom: 4px;">Overall Trip Risk: ${overallLevel} (${avgRisk}/100)</div>
                <div style="font-size: 0.78rem; color: var(--color-text-secondary);">
                    ${overallLevel === 'Low' ? 'Excellent conditions for your trip! Enjoy!' : 
                      overallLevel === 'Moderate' ? 'Generally good. Take basic precautions for some days.' :
                      overallLevel === 'High' ? 'Some challenging days ahead. Prepare accordingly.' :
                      'Consider postponing. Severe weather expected.'}
                </div>
            </div>
            <div class="trip-summary__stats">
                <div class="trip-summary__stat">
                    <div class="trip-summary__stat-value">${avgTemp}°</div>
                    <div class="trip-summary__stat-label">Avg Temp</div>
                </div>
                <div class="trip-summary__stat">
                    <div class="trip-summary__stat-value">${maxTemp}°/${minTemp}°</div>
                    <div class="trip-summary__stat-label">High / Low</div>
                </div>
                <div class="trip-summary__stat">
                    <div class="trip-summary__stat-value">${rainyDays}</div>
                    <div class="trip-summary__stat-label">Rainy Days</div>
                </div>
                <div class="trip-summary__stat">
                    <div class="trip-summary__stat-value" style="color: ${levelColor};">${avgRisk}%</div>
                    <div class="trip-summary__stat-label">Avg Risk</div>
                </div>
            </div>
        `;
    }

    function renderTripDays(tripData) {
        const container = document.getElementById('tripDaysContainer');
        if (!container) return;

        const html = tripData.map((day, index) => {
            const risk = day.riskReport.overallLevel;
            const riskColor = getRiskColor(risk.label);
            const dayName = day.date.toLocaleDateString('en-US', { weekday: 'long' });
            const dateStr = day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return `
                <div class="trip-day-card reveal" style="animation-delay: ${index * 50}ms;">
                    <div class="trip-day-card__header">
                        <div>
                            <div class="trip-day-card__date">${dateStr}</div>
                            <div class="trip-day-card__day">${index === 0 ? 'Day 1 — Arrival' : index === tripData.length - 1 ? `Day ${index + 1} — Departure` : `Day ${index + 1}`} • ${dayName}</div>
                        </div>
                        <span class="trip-day-card__risk" style="background: ${riskColor}20; color: ${riskColor};">${risk.label} Risk</span>
                    </div>
                    <div class="trip-day-card__weather">
                        <i class="fa-solid ${day.conditionIcon} trip-day-card__condition-icon" style="color: var(--color-accent);"></i>
                        <div class="trip-day-card__temp">${day.temp}°</div>
                        <div class="trip-day-card__condition">
                            <div class="trip-day-card__condition-text">${day.conditionText}</div>
                            <div style="font-size: 0.75rem; color: var(--color-text-secondary);">Feels like ${day.feelsLike}°</div>
                        </div>
                    </div>
                    <div class="trip-day-card__details">
                        <div class="trip-day-card__detail">
                            <div class="trip-day-card__detail-label">Wind</div>
                            <div class="trip-day-card__detail-value">${day.windSpeed} km/h</div>
                        </div>
                        <div class="trip-day-card__detail">
                            <div class="trip-day-card__detail-label">Humidity</div>
                            <div class="trip-day-card__detail-value">${day.humidity}%</div>
                        </div>
                        <div class="trip-day-card__detail">
                            <div class="trip-day-card__detail-label">UV Index</div>
                            <div class="trip-day-card__detail-value">${day.uvIndex}</div>
                        </div>
                    </div>
                    <div class="trip-day-card__tips">
                        <div class="trip-day-card__tips-title">Travel Tips</div>
                        <div class="trip-day-card__tips-text">${day.tips.join(' • ')}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    function downloadTripReport() {
        if (!window._lastTripData) {
            if (typeof UI !== 'undefined') UI.showNotification('Please analyze a trip first', 'warning');
            return;
        }

        const { tripData, destination, tripType, start, end } = window._lastTripData;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const config = TRIP_CONFIGS[tripType];

        // Header
        doc.setFillColor(10, 10, 18);
        doc.rect(0, 0, 210, 45, 'F');
        doc.setTextColor(43, 212, 167);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('ClimateGuard', 20, 20);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text('Trip Weather Report', 20, 30);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${destination} • ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`, 20, 38);

        let y = 55;
        
        // Trip Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Trip Overview', 20, y);
        y += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(`Destination: ${destination}`, 20, y); y += 5;
        doc.text(`Duration: ${tripData.length} days`, 20, y); y += 5;
        doc.text(`Trip Type: ${config.label}`, 20, y); y += 5;
        
        const avgRisk = Math.round(tripData.reduce((s, d) => s + d.riskReport.overallScore, 0) / tripData.length);
        doc.text(`Average Risk Score: ${avgRisk}/100`, 20, y); y += 12;

        // Day by day
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Day-by-Day Forecast', 20, y);
        y += 10;

        tripData.forEach((day, index) => {
            if (y > 255) { doc.addPage(); y = 20; }
            
            const dateStr = day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            
            doc.setFillColor(240, 240, 240);
            doc.rect(20, y - 4, 170, 8, 'F');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`Day ${index + 1} — ${dateStr}`, 22, y + 1);
            
            const riskLabel = day.riskReport.overallLevel.label;
            doc.setTextColor(100, 100, 100);
            doc.text(`Risk: ${riskLabel}`, 155, y + 1);
            y += 10;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(60, 60, 60);
            doc.text(`${day.conditionText} | ${day.temp}°C (feels like ${day.feelsLike}°) | Wind: ${day.windSpeed} km/h | Humidity: ${day.humidity}% | UV: ${day.uvIndex}`, 24, y);
            y += 5;
            
            doc.setTextColor(43, 130, 100);
            doc.setFontSize(8);
            const tipText = 'Tips: ' + day.tips.join('. ');
            const tipLines = doc.splitTextToSize(tipText, 162);
            doc.text(tipLines, 24, y);
            y += tipLines.length * 3.5 + 6;
        });

        // Footer
        if (y > 270) { doc.addPage(); y = 20; }
        y += 5;
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(7);
        doc.text(`Generated by ClimateGuard Trip Planner on ${new Date().toLocaleString()}`, 20, y);
        doc.text('Weather data is simulated. For real-time data, configure your API key.', 20, y + 4);

        doc.save(`ClimateGuard_Trip_${destination.replace(/\s/g, '_')}_${start.toISOString().split('T')[0]}.pdf`);
        
        if (typeof UI !== 'undefined') {
            UI.showNotification('Trip report downloaded successfully!', 'success');
        }
    }
})();

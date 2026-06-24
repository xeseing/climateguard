/**
 * ClimateGuard - Internationalization Module
 * Translates UI strings into selected language
 */

const I18n = (function () {
    const LANGUAGES = {
        en: { label: 'English', dir: 'ltr' },
        hi: { label: 'हिन्दी', dir: 'ltr' },
        es: { label: 'Español', dir: 'ltr' },
        fr: { label: 'Français', dir: 'ltr' },
        ar: { label: 'العربية', dir: 'rtl' }
    };

    const STRINGS = {
        en: {
            home: 'Home', map: 'Map', risk: 'Risk', trip: 'Trip', search: 'Search',
            settings: 'Settings', darkMode: 'Dark Mode', useDarkTheme: 'Use dark theme',
            animations: 'Animations', enableEffects: 'Enable weather effects',
            temperature: 'Temperature', useCelsius: 'Use Celsius',
            autoTheme: 'Auto Weather Theme', themeFollows: 'Theme follows weather conditions',
            profile: 'Profile', displayName: 'Display Name', homeCity: 'Home City',
            avatar: 'Avatar', uploadAvatar: 'Upload Avatar',
            notifications: 'Notifications', masterToggle: 'Enable Notifications',
            weatherAlerts: 'Weather Alerts', tripReminders: 'Trip Reminders',
            dailyForecast: 'Daily Forecast', emergencyAlerts: 'Emergency Alerts',
            location: 'Location', enableGPS: 'Enable GPS Location',
            autoDetect: 'Auto-detect city on load', permissionStatus: 'Permission Status',
            granted: 'Granted', denied: 'Denied', notAsked: 'Not Asked',
            networkStatus: 'Network Status', online: 'Online', offline: 'Offline',
            youAreOffline: "You're offline. Some features may be unavailable.",
            language: 'Language', selectLanguage: 'Select Language',
            planTrip: 'Plan a Trip', destination: 'Destination', startDate: 'Start Date',
            endDate: 'End Date', tripType: 'Trip Type', analyzeRisk: 'Analyze Weather Risk',
            leisure: 'Leisure / Vacation', business: 'Business',
            adventure: 'Adventure / Outdoor', family: 'Family',
            goVerdict: 'Go', cautionVerdict: 'Caution', avoidVerdict: 'Avoid',
            myTrips: 'My Trips', tripCountdown: 'Trip Countdown',
            tomorrow: 'Tomorrow!', tripCompleted: 'Trip Completed ✓',
            daysUntilTrip: 'until your trip to',
            multiCity: 'Multi-City Comparison', addCity: 'Add City',
            compareCities: 'Compare Cities', safest: 'Safest', riskiest: 'Riskiest',
            emergencyContacts: 'Emergency Contacts', addContact: 'Add Contact',
            name: 'Name', phone: 'Phone', relationship: 'Relationship', email: 'Email',
            call: 'Call', message: 'Message', shareLocation: 'Share Location',
            globalEmergency: 'Global Emergency Numbers', selectCountry: 'Select Country',
            police: 'Police', ambulance: 'Ambulance', fire: 'Fire',
            downloadPDF: 'Download PDF Report', lastAnalysed: 'Last analysed',
            loading: 'Loading...', noResults: 'No results found',
            searchPlaceholder: 'Search any city worldwide...',
            howItWorks: 'How It Works', features: 'Features',
            popularDestinations: 'Popular Destinations Risk Today',
            overallRisk: 'Overall Risk', riskBreakdown: 'Risk Breakdown',
            recommendations: 'Recommendations', travelAdvisory: 'Travel Advisory',
            weatherRiskReport: 'Weather Risk Report', uvIndex: 'UV Index',
            airQuality: 'Air Quality', wind: 'Wind', humidity: 'Humidity',
            feelsLike: 'Feels Like', pressure: 'Pressure', visibility: 'Visibility',
            precipitation: 'Precipitation', hourlyForecast: 'Hourly Forecast',
            apiUnavailable: 'API unavailable. Please check your API key or try again later.',
            tripPurpose: 'Trip Purpose',
            exportComparison: 'Export Comparison PDF',
            previewThemes: 'Preview Weather Themes',
            clearDay: 'Clear Day', night: 'Night', cloudy: 'Cloudy',
            rain: 'Rain', storm: 'Storm', snow: 'Snow'
        },
        hi: {
            home: 'होम', map: 'मैप', risk: 'जोखिम', trip: 'यात्रा', search: 'खोजें',
            settings: 'सेटिंग्स', darkMode: 'डार्क मोड', useDarkTheme: 'डार्क थीम का उपयोग करें',
            animations: 'एनिमेशन', enableEffects: 'मौसम प्रभाव सक्षम करें',
            temperature: 'तापमान', useCelsius: 'सेल्सियस का उपयोग करें',
            autoTheme: 'ऑटो मौसम थीम', themeFollows: 'थीम मौसम की स्थिति का अनुसरण करती है',
            profile: 'प्रोफ़ाइल', displayName: 'प्रदर्शन नाम', homeCity: 'घर का शहर',
            avatar: 'अवतार', uploadAvatar: 'अवतार अपलोड करें',
            notifications: 'सूचनाएँ', masterToggle: 'सूचनाएँ सक्षम करें',
            weatherAlerts: 'मौसम अलर्ट', tripReminders: 'यात्रा अनुस्मारक',
            dailyForecast: 'दैनिक पूर्वानुमान', emergencyAlerts: 'आपातकालीन अलर्ट',
            location: 'स्थान', enableGPS: 'GPS स्थान सक्षम करें',
            autoDetect: 'लोड पर शहर का स्वतः पता लगाएं', permissionStatus: 'अनुमति स्थिति',
            granted: 'स्वीकृत', denied: 'अस्वीकृत', notAsked: 'पूछा नहीं गया',
            networkStatus: 'नेटवर्क स्थिति', online: 'ऑनलाइन', offline: 'ऑफ़लाइन',
            youAreOffline: 'आप ऑफ़लाइन हैं। कुछ सुविधाएँ अनुपलब्ध हो सकती हैं।',
            language: 'भाषा', selectLanguage: 'भाषा चुनें',
            planTrip: 'यात्रा की योजना बनाएं', destination: 'गंतव्य', startDate: 'आरंभ तिथि',
            endDate: 'अंतिम तिथि', tripType: 'यात्रा प्रकार', analyzeRisk: 'मौसम जोखिम विश्लेषण',
            leisure: 'अवकाश', business: 'व्यापार',
            adventure: 'साहसिक', family: 'परिवार',
            goVerdict: 'जाएं', cautionVerdict: 'सावधानी', avoidVerdict: 'बचें',
            myTrips: 'मेरी यात्राएँ', tripCountdown: 'यात्रा उलटी गिनती',
            tomorrow: 'कल!', tripCompleted: 'यात्रा पूर्ण ✓',
            daysUntilTrip: 'तक आपकी यात्रा',
            multiCity: 'बहु-शहर तुलना', addCity: 'शहर जोड़ें',
            compareCities: 'शहरों की तुलना करें', safest: 'सबसे सुरक्षित', riskiest: 'सबसे जोखिमपूर्ण',
            emergencyContacts: 'आपातकालीन संपर्क', addContact: 'संपर्क जोड़ें',
            name: 'नाम', phone: 'फ़ोन', relationship: 'संबंध', email: 'ईमेल',
            call: 'कॉल', message: 'संदेश', shareLocation: 'स्थान साझा करें',
            globalEmergency: 'वैश्विक आपातकालीन नंबर', selectCountry: 'देश चुनें',
            police: 'पुलिस', ambulance: 'एम्बुलेंस', fire: 'अग्निशमन',
            downloadPDF: 'पीडीएफ रिपोर्ट डाउनलोड', lastAnalysed: 'अंतिम विश्लेषण',
            loading: 'लोड हो रहा है...', noResults: 'कोई परिणाम नहीं मिला',
            searchPlaceholder: 'दुनिया भर में कोई भी शहर खोजें...',
            howItWorks: 'कैसे काम करता है', features: 'विशेषताएं',
            popularDestinations: 'लोकप्रिय गंतव्य जोखिम आज',
            overallRisk: 'समग्र जोखिम', riskBreakdown: 'जोखिम विश्लेषण',
            recommendations: 'सिफारिशें', travelAdvisory: 'यात्रा सलाह',
            weatherRiskReport: 'मौसम जोखिम रिपोर्ट', uvIndex: 'यूवी सूचकांक',
            airQuality: 'वायु गुणवत्ता', wind: 'हवा', humidity: 'नमी',
            feelsLike: 'महसूस होता है', pressure: 'दबाव', visibility: 'दृश्यता',
            precipitation: 'वर्षा', hourlyForecast: 'घंटेवार पूर्वानुमान',
            apiUnavailable: 'API अनुपलब्ध। कृपया अपनी API कुंजी जांचें।',
            tripPurpose: 'यात्रा उद्देश्य',
            exportComparison: 'तुलना पीडीएफ निर्यात करें',
            previewThemes: 'मौसम थीम पूर्वावलोकन',
            clearDay: 'साफ दिन', night: 'रात', cloudy: 'बादल',
            rain: 'बारिश', storm: 'तूफान', snow: 'बर्फ'
        },
        es: {
            home: 'Inicio', map: 'Mapa', risk: 'Riesgo', trip: 'Viaje', search: 'Buscar',
            settings: 'Configuración', darkMode: 'Modo Oscuro', useDarkTheme: 'Usar tema oscuro',
            animations: 'Animaciones', enableEffects: 'Habilitar efectos climáticos',
            temperature: 'Temperatura', useCelsius: 'Usar Celsius',
            autoTheme: 'Tema Automático', themeFollows: 'El tema sigue las condiciones',
            profile: 'Perfil', displayName: 'Nombre', homeCity: 'Ciudad de origen',
            avatar: 'Avatar', uploadAvatar: 'Subir Avatar',
            notifications: 'Notificaciones', masterToggle: 'Habilitar Notificaciones',
            weatherAlerts: 'Alertas Meteorológicas', tripReminders: 'Recordatorios de Viaje',
            dailyForecast: 'Pronóstico Diario', emergencyAlerts: 'Alertas de Emergencia',
            location: 'Ubicación', enableGPS: 'Habilitar GPS',
            autoDetect: 'Auto-detectar ciudad', permissionStatus: 'Estado de Permiso',
            granted: 'Concedido', denied: 'Denegado', notAsked: 'No Solicitado',
            networkStatus: 'Estado de Red', online: 'En Línea', offline: 'Sin Conexión',
            youAreOffline: 'Estás sin conexión. Algunas funciones no están disponibles.',
            language: 'Idioma', selectLanguage: 'Seleccionar Idioma',
            planTrip: 'Planificar Viaje', destination: 'Destino', startDate: 'Fecha Inicio',
            endDate: 'Fecha Fin', tripType: 'Tipo de Viaje', analyzeRisk: 'Analizar Riesgo',
            leisure: 'Ocio / Vacaciones', business: 'Negocios',
            adventure: 'Aventura', family: 'Familia',
            goVerdict: 'Ir', cautionVerdict: 'Precaución', avoidVerdict: 'Evitar',
            myTrips: 'Mis Viajes', tripCountdown: 'Cuenta Regresiva',
            tomorrow: '¡Mañana!', tripCompleted: 'Viaje Completado ✓',
            daysUntilTrip: 'hasta tu viaje a',
            multiCity: 'Comparación Multi-Ciudad', addCity: 'Agregar Ciudad',
            compareCities: 'Comparar Ciudades', safest: 'Más Segura', riskiest: 'Más Riesgosa',
            emergencyContacts: 'Contactos de Emergencia', addContact: 'Agregar Contacto',
            name: 'Nombre', phone: 'Teléfono', relationship: 'Relación', email: 'Correo',
            call: 'Llamar', message: 'Mensaje', shareLocation: 'Compartir Ubicación',
            globalEmergency: 'Números de Emergencia Global', selectCountry: 'Seleccionar País',
            police: 'Policía', ambulance: 'Ambulancia', fire: 'Bomberos',
            downloadPDF: 'Descargar Informe PDF', lastAnalysed: 'Último análisis',
            loading: 'Cargando...', noResults: 'Sin resultados',
            searchPlaceholder: 'Buscar cualquier ciudad del mundo...',
            howItWorks: 'Cómo Funciona', features: 'Características',
            popularDestinations: 'Riesgo de Destinos Populares Hoy',
            overallRisk: 'Riesgo General', riskBreakdown: 'Desglose de Riesgos',
            recommendations: 'Recomendaciones', travelAdvisory: 'Aviso de Viaje',
            weatherRiskReport: 'Informe de Riesgo Climático', uvIndex: 'Índice UV',
            airQuality: 'Calidad del Aire', wind: 'Viento', humidity: 'Humedad',
            feelsLike: 'Sensación', pressure: 'Presión', visibility: 'Visibilidad',
            precipitation: 'Precipitación', hourlyForecast: 'Pronóstico por Hora',
            apiUnavailable: 'API no disponible. Verifique su clave API.',
            tripPurpose: 'Propósito del Viaje',
            exportComparison: 'Exportar Comparación PDF',
            previewThemes: 'Vista previa de temas',
            clearDay: 'Día Despejado', night: 'Noche', cloudy: 'Nublado',
            rain: 'Lluvia', storm: 'Tormenta', snow: 'Nieve'
        },
        fr: {
            home: 'Accueil', map: 'Carte', risk: 'Risque', trip: 'Voyage', search: 'Rechercher',
            settings: 'Paramètres', darkMode: 'Mode Sombre', useDarkTheme: 'Utiliser le thème sombre',
            animations: 'Animations', enableEffects: 'Activer les effets météo',
            temperature: 'Température', useCelsius: 'Utiliser Celsius',
            autoTheme: 'Thème Auto', themeFollows: 'Le thème suit la météo',
            profile: 'Profil', displayName: 'Nom d\'affichage', homeCity: 'Ville d\'origine',
            avatar: 'Avatar', uploadAvatar: 'Télécharger Avatar',
            notifications: 'Notifications', masterToggle: 'Activer les Notifications',
            weatherAlerts: 'Alertes Météo', tripReminders: 'Rappels de Voyage',
            dailyForecast: 'Prévision Quotidienne', emergencyAlerts: 'Alertes d\'Urgence',
            location: 'Localisation', enableGPS: 'Activer le GPS',
            autoDetect: 'Détection auto de la ville', permissionStatus: 'Statut d\'Autorisation',
            granted: 'Accordé', denied: 'Refusé', notAsked: 'Non Demandé',
            networkStatus: 'État du Réseau', online: 'En Ligne', offline: 'Hors Ligne',
            youAreOffline: 'Vous êtes hors ligne. Certaines fonctionnalités peuvent être indisponibles.',
            language: 'Langue', selectLanguage: 'Choisir la Langue',
            planTrip: 'Planifier un Voyage', destination: 'Destination', startDate: 'Date de Début',
            endDate: 'Date de Fin', tripType: 'Type de Voyage', analyzeRisk: 'Analyser le Risque',
            leisure: 'Loisirs', business: 'Affaires',
            adventure: 'Aventure', family: 'Famille',
            goVerdict: 'Aller', cautionVerdict: 'Prudence', avoidVerdict: 'Éviter',
            myTrips: 'Mes Voyages', tripCountdown: 'Compte à Rebours',
            tomorrow: 'Demain !', tripCompleted: 'Voyage Terminé ✓',
            daysUntilTrip: 'jusqu\'à votre voyage à',
            multiCity: 'Comparaison Multi-Villes', addCity: 'Ajouter une Ville',
            compareCities: 'Comparer les Villes', safest: 'Plus Sûre', riskiest: 'Plus Risquée',
            emergencyContacts: 'Contacts d\'Urgence', addContact: 'Ajouter un Contact',
            name: 'Nom', phone: 'Téléphone', relationship: 'Relation', email: 'E-mail',
            call: 'Appeler', message: 'Message', shareLocation: 'Partager la Position',
            globalEmergency: 'Numéros d\'Urgence Mondiaux', selectCountry: 'Choisir le Pays',
            police: 'Police', ambulance: 'Ambulance', fire: 'Pompiers',
            downloadPDF: 'Télécharger le Rapport PDF', lastAnalysed: 'Dernière analyse',
            loading: 'Chargement...', noResults: 'Aucun résultat',
            searchPlaceholder: 'Rechercher une ville dans le monde...',
            howItWorks: 'Comment ça Marche', features: 'Fonctionnalités',
            popularDestinations: 'Risque des Destinations Populaires Aujourd\'hui',
            overallRisk: 'Risque Global', riskBreakdown: 'Détail des Risques',
            recommendations: 'Recommandations', travelAdvisory: 'Avis de Voyage',
            weatherRiskReport: 'Rapport de Risque Météo', uvIndex: 'Indice UV',
            airQuality: 'Qualité de l\'Air', wind: 'Vent', humidity: 'Humidité',
            feelsLike: 'Ressenti', pressure: 'Pression', visibility: 'Visibilité',
            precipitation: 'Précipitation', hourlyForecast: 'Prévisions Horaires',
            apiUnavailable: 'API indisponible. Vérifiez votre clé API.',
            tripPurpose: 'But du Voyage',
            exportComparison: 'Exporter la Comparaison PDF',
            previewThemes: 'Aperçu des thèmes',
            clearDay: 'Jour Clair', night: 'Nuit', cloudy: 'Nuageux',
            rain: 'Pluie', storm: 'Orage', snow: 'Neige'
        },
        ar: {
            home: 'الرئيسية', map: 'الخريطة', risk: 'المخاطر', trip: 'الرحلة', search: 'بحث',
            settings: 'الإعدادات', darkMode: 'الوضع الداكن', useDarkTheme: 'استخدم الثيم الداكن',
            animations: 'الرسوم المتحركة', enableEffects: 'تفعيل تأثيرات الطقس',
            temperature: 'درجة الحرارة', useCelsius: 'استخدم مئوية',
            autoTheme: 'ثيم تلقائي', themeFollows: 'الثيم يتبع حالة الطقس',
            profile: 'الملف الشخصي', displayName: 'اسم العرض', homeCity: 'المدينة الرئيسية',
            avatar: 'الصورة الرمزية', uploadAvatar: 'رفع الصورة',
            notifications: 'الإشعارات', masterToggle: 'تفعيل الإشعارات',
            weatherAlerts: 'تنبيهات الطقس', tripReminders: 'تذكيرات الرحلة',
            dailyForecast: 'التوقعات اليومية', emergencyAlerts: 'تنبيهات الطوارئ',
            location: 'الموقع', enableGPS: 'تفعيل GPS',
            autoDetect: 'كشف تلقائي للمدينة', permissionStatus: 'حالة الإذن',
            granted: 'مسموح', denied: 'مرفوض', notAsked: 'لم يُسأل',
            networkStatus: 'حالة الشبكة', online: 'متصل', offline: 'غير متصل',
            youAreOffline: 'أنت غير متصل. قد لا تتوفر بعض الميزات.',
            language: 'اللغة', selectLanguage: 'اختر اللغة',
            planTrip: 'خطط لرحلة', destination: 'الوجهة', startDate: 'تاريخ البدء',
            endDate: 'تاريخ الانتهاء', tripType: 'نوع الرحلة', analyzeRisk: 'تحليل المخاطر',
            leisure: 'ترفيه / إجازة', business: 'عمل',
            adventure: 'مغامرة', family: 'عائلية',
            goVerdict: 'انطلق', cautionVerdict: 'حذر', avoidVerdict: 'تجنب',
            myTrips: 'رحلاتي', tripCountdown: 'العد التنازلي',
            tomorrow: 'غداً!', tripCompleted: 'اكتملت الرحلة ✓',
            daysUntilTrip: 'حتى رحلتك إلى',
            multiCity: 'مقارنة المدن', addCity: 'أضف مدينة',
            compareCities: 'قارن المدن', safest: 'الأكثر أماناً', riskiest: 'الأكثر خطورة',
            emergencyContacts: 'جهات اتصال الطوارئ', addContact: 'أضف جهة اتصال',
            name: 'الاسم', phone: 'الهاتف', relationship: 'العلاقة', email: 'البريد',
            call: 'اتصال', message: 'رسالة', shareLocation: 'شارك الموقع',
            globalEmergency: 'أرقام الطوارئ العالمية', selectCountry: 'اختر البلد',
            police: 'الشرطة', ambulance: 'الإسعاف', fire: 'الإطفاء',
            downloadPDF: 'تحميل تقرير PDF', lastAnalysed: 'آخر تحليل',
            loading: 'جاري التحميل...', noResults: 'لا توجد نتائج',
            searchPlaceholder: 'ابحث عن أي مدينة في العالم...',
            howItWorks: 'كيف يعمل', features: 'الميزات',
            popularDestinations: 'مخاطر الوجهات الشهيرة اليوم',
            overallRisk: 'المخاطر الإجمالية', riskBreakdown: 'تفصيل المخاطر',
            recommendations: 'التوصيات', travelAdvisory: 'نصائح السفر',
            weatherRiskReport: 'تقرير مخاطر الطقس', uvIndex: 'مؤشر الأشعة',
            airQuality: 'جودة الهواء', wind: 'الرياح', humidity: 'الرطوبة',
            feelsLike: 'الإحساس', pressure: 'الضغط', visibility: 'الرؤية',
            precipitation: 'الهطول', hourlyForecast: 'التوقعات بالساعة',
            apiUnavailable: 'API غير متوفر. يرجى التحقق من مفتاح API.',
            tripPurpose: 'غرض الرحلة',
            exportComparison: 'تصدير مقارنة PDF',
            previewThemes: 'معاينة الثيمات',
            clearDay: 'يوم صافٍ', night: 'ليل', cloudy: 'غائم',
            rain: 'مطر', storm: 'عاصفة', snow: 'ثلج'
        }
    };

    let currentLang = 'en';

    function init() {
        const settings = Storage.getSettings();
        currentLang = settings.language || 'en';
        applyLanguage(currentLang);
    }

    function setLanguage(lang) {
        if (!LANGUAGES[lang]) return;
        currentLang = lang;
        Storage.updateSettings({ language: lang });
        applyLanguage(lang);
    }

    function applyLanguage(lang) {
        const html = document.documentElement;
        html.setAttribute('lang', lang);
        html.setAttribute('dir', LANGUAGES[lang].dir);

        // Translate all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (STRINGS[lang] && STRINGS[lang][key]) {
                el.textContent = STRINGS[lang][key];
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (STRINGS[lang] && STRINGS[lang][key]) {
                el.setAttribute('placeholder', STRINGS[lang][key]);
            }
        });

        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            if (STRINGS[lang] && STRINGS[lang][key]) {
                el.setAttribute('aria-label', STRINGS[lang][key]);
            }
        });
    }

    function t(key) {
        return (STRINGS[currentLang] && STRINGS[currentLang][key]) ||
               (STRINGS.en && STRINGS.en[key]) || key;
    }

    function getCurrentLanguage() {
        return currentLang;
    }

    return {
        init,
        setLanguage,
        t,
        getCurrentLanguage,
        LANGUAGES,
        STRINGS
    };
})();

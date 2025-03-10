document.addEventListener("DOMContentLoaded", function () {
    const COOKIE_NAME = "fs-cc-consent";
    const DEBUG_MODE = document.querySelector('script[fs-cc-debug="true"]') !== null;
    const USE_WEBFLOW_INTERACTIONS = document.querySelector('script[fs-cc-webflow="true"]') !== null;

    function logDebug(message) {
        if (DEBUG_MODE) {
            console.log("[Finsweet Cookie Consent]:", message);
        }
    }

    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            let date = new Date();
            date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    }

    function getConsent() {
        let consent = getCookie(COOKIE_NAME);
        if (!consent) {
            consent = localStorage.getItem(COOKIE_NAME);
        }
        return consent ? JSON.parse(consent) : null;
    }

    function setConsent(consent) {
        setCookie(COOKIE_NAME, JSON.stringify(consent), 180);
        localStorage.setItem(COOKIE_NAME, JSON.stringify(consent));
        logDebug("Consent opgeslagen: " + JSON.stringify(consent));
    }

    function applyConsent(consent) {
        document.querySelectorAll('script[type="fs-cc"]').forEach(script => {
            const categories = script.getAttribute("fs-cc-categories")?.split(",") || [];
            if (categories.some(cat => consent[cat])) {
                let newScript = document.createElement("script");
                newScript.type = "text/javascript";
                if (script.src) {
                    newScript.src = script.src;
                } else {
                    newScript.textContent = script.textContent;
                }
                script.parentNode.replaceChild(newScript, script);
                logDebug(`Script geactiveerd: ${script.src || "inline script"}`);
            }
        });

        // Google Consent Mode updaten
        if (typeof gtag === "function") {
            gtag('consent', 'update', {
                'ad_storage': consent.marketing ? 'granted' : 'denied',
                'ad_user_data': consent.marketing ? 'granted' : 'denied',
                'analytics_storage': consent.analytics ? 'granted' : 'denied',
                'ad_personalization': consent.personalization ? 'granted' : 'denied',
                'personalization_storage': consent.personalization ? 'granted' : 'denied',
                'functionality_storage': 'granted',
                'security_storage': 'granted',
            });
            logDebug('Google Consent Mode bijgewerkt: ' + JSON.stringify(consent));
        }

        // Google Tag Manager triggeren
        if (typeof window.dataLayer !== "undefined") {
            window.dataLayer.push({ event: "cookieConsentUpdated" });
            logDebug("DataLayer event verzonden");
        }
    }

    function handleConsentAction(action) {
        let consent = getConsent() || { essential: true, analytics: false, marketing: false, personalization: false };

        if (action === "allow") {
            consent = { essential: true, analytics: true, marketing: true, personalization: true };
        } else if (action === "deny") {
            consent = { essential: true, analytics: false, marketing: false, personalization: false };
        }

        setConsent(consent);
        applyConsent(consent);

        // Banner verbergen als Webflow interacties niet worden gebruikt
        if (!USE_WEBFLOW_INTERACTIONS) {
            document.querySelector('[fs-cc="banner"]').style.display = "none";
        }
    }

    function setupEventListeners() {
        document.querySelectorAll("[fs-cc]").forEach(element => {
            const action = element.getAttribute("fs-cc");
            element.addEventListener("click", function () {
                logDebug(`Triggered action: ${action}`);
                if (["allow", "deny"].includes(action)) {
                    handleConsentAction(action);
                } else if (action === "close") {
                    if (!USE_WEBFLOW_INTERACTIONS) {
                        document.querySelector('[fs-cc="banner"]').style.display = "none";
                    }
                } else if (action === "open-preferences") {
                    document.querySelector('[fs-cc="preferences"]').style.display = "block";
                } else if (action === "submit") {
                    const consent = { essential: true };
                    document.querySelectorAll('[fs-cc-checkbox]').forEach(checkbox => {
                        consent[checkbox.getAttribute("fs-cc-checkbox")] = checkbox.checked;
                    });
                    setConsent(consent);
                    applyConsent(consent);
                    document.querySelector('[fs-cc="preferences"]').style.display = "none";
                }
            });
        });
    }

    function init() {
        const consent = getConsent();
        if (consent) {
            applyConsent(consent);
            if (!USE_WEBFLOW_INTERACTIONS) {
                document.querySelector('[fs-cc="banner"]').style.display = "none";
            }
        } else {
            if (!USE_WEBFLOW_INTERACTIONS) {
                document.querySelector('[fs-cc="banner"]').style.display = "block";
            }
        }
        setupEventListeners();
    }

    init();
});

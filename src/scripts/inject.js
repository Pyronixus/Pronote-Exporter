// inject.js
(function() {
    console.log('[PRONOTE EXPORTER] 🚀 Super-Espion Réseau (XHR + Fetch) injecté dans le DOM.');

    // ----------------------------------------------------
    // 1. INTERCEPTION FETCH
    // ----------------------------------------------------
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const url = args[0];
        const urlString = typeof url === 'string' ? url : (url?.url || '');
        
        try {
            const response = await originalFetch.apply(this, args);
            // On clone la réponse pour pouvoir la lire sans bloquer l'application
            const clonedResponse = response.clone();
            
            clonedResponse.text().then(text => {
                if (text && text.trim().startsWith('{')) { // Si c'est un JSON
                    console.log(`[PRONOTE EXPORTER] 🌐 Requête FETCH détectée -> URL: ${urlString}`);
                    try {
                        const rawData = JSON.parse(text);
                        window.dispatchEvent(new CustomEvent('PRONOTE_DATA_INTERCEPTED', { detail: rawData }));
                    } catch(e) {}
                }
            }).catch(() => {});

            return response;
        } catch (error) {
            return originalFetch.apply(this, args);
        }
    };

    // ----------------------------------------------------
    // 2. INTERCEPTION XHR (XMLHttpRequest)
    // ----------------------------------------------------
    const XHR = XMLHttpRequest.prototype;
    const open = XHR.open;
    const send = XHR.send;

    XHR.open = function(method, url) {
        this._url = url;
        return open.apply(this, arguments);
    };

    XHR.send = function() {
        this.addEventListener('load', function() {
            try {
                if (this.responseText && this.responseText.trim().startsWith('{')) {
                    console.log(`[PRONOTE EXPORTER] 📡 Requête XHR détectée -> URL: ${this._url}`);
                    const rawData = JSON.parse(this.responseText);
                    window.dispatchEvent(new CustomEvent('PRONOTE_DATA_INTERCEPTED', { detail: rawData }));
                }
            } catch (e) {}
        });
        return send.apply(this, arguments);
    };
})();
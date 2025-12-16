/**
 * State Manager for Memo IDE
 * Handles persistence of interpreter state and screen history using cookies
 */

const MemoStateManager = {
    COOKIE_NAME: 'memo_state',
    STORAGE_KEY: 'memo_state',
    COOKIE_EXPIRY_DAYS: 365,

    /**
     * Save the current state to localStorage (and cookie as backup)
     * @param {Object} varlist - The interpreter's variable list
     * @param {Array} screenHistory - Array of screen entries (queries and responses)
     */
    saveState: function(varlist, screenHistory) {
        const state = {
            varlist: varlist,
            screenHistory: screenHistory,
            timestamp: new Date().toISOString()
        };

        const stateJson = JSON.stringify(state);
        
        // Save to localStorage (works with file:// protocol)
        try {
            localStorage.setItem(this.STORAGE_KEY, stateJson);
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }

        // Also save to cookie (for http/https)
        try {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + this.COOKIE_EXPIRY_DAYS);
            document.cookie = `${this.COOKIE_NAME}=${encodeURIComponent(stateJson)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;
        } catch (e) {
            console.error('Failed to save to cookie:', e);
        }
    },

    /**
     * Load the state from localStorage or cookie
     * @returns {Object|null} The saved state object or null if no state exists
     */
    loadState: function() {
        // Try localStorage first (works with file:// protocol)
        try {
            const stateJson = localStorage.getItem(this.STORAGE_KEY);
            if (stateJson) {
                return JSON.parse(stateJson);
            }
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
        }

        // Fallback to cookie
        const cookies = document.cookie.split(';');
        
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === this.COOKIE_NAME) {
                try {
                    const stateJson = decodeURIComponent(value);
                    return JSON.parse(stateJson);
                } catch (e) {
                    console.error('Failed to parse saved state from cookie:', e);
                    return null;
                }
            }
        }
        
        return null;
    },

    /**
     * Clear the saved state from both localStorage and cookie
     */
    clearState: function() {
        localStorage.removeItem(this.STORAGE_KEY);
        document.cookie = `${this.COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
    },

    /**
     * Check if a saved state exists
     * @returns {boolean}
     */
    hasState: function() {
        return this.loadState() !== null;
    },

    /**
     * Restore the interpreter state from saved data
     * @param {Object} memo - The memo object with interpreter
     * @param {Object} savedState - The saved state object
     */
    restoreInterpreterState: function(memo, savedState) {
        if (savedState && savedState.varlist) {
            memo.varlist = savedState.varlist;
        }
    },

    /**
     * Restore the screen history from saved data
     * @param {Object} savedState - The saved state object
     * @returns {Array} The screen history or empty array
     */
    restoreScreenHistory: function(savedState) {
        if (savedState && savedState.screenHistory) {
            return savedState.screenHistory;
        }
        return [];
    },

    /**
     * Mark the modal as having been dismissed
     */
    setModalDismissed: function() {
        // Save to localStorage
        try {
            localStorage.setItem('memo_modal_dismissed', 'true');
        } catch (e) {
            console.error('Failed to save modal state to localStorage:', e);
        }
        
        // Also save to cookie
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + this.COOKIE_EXPIRY_DAYS);
        document.cookie = `memo_modal_dismissed=true; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;
    },

    /**
     * Check if the modal has been dismissed before
     * @returns {boolean}
     */
    wasModalDismissed: function() {
        // Check localStorage first
        try {
            const localStorageValue = localStorage.getItem('memo_modal_dismissed');
            if (localStorageValue === 'true') {
                return true;
            }
        } catch (e) {
            console.error('Failed to check localStorage:', e);
        }
        
        // Fallback to cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'memo_modal_dismissed' && value === 'true') {
                return true;
            }
        }
        return false;
    }
};

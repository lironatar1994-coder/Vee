
// Simple Global Cache to make navigation feel instant (stale-while-revalidate pattern)
const cache = {
    data: (function() {
        try {
            const saved = localStorage.getItem('vee_cache_v1');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    })(),
    set(key, value) {
        this.data[key] = {
            value,
            timestamp: Date.now()
        };
        this.persist();
    },
    get(key) {
        const item = this.data[key];
        return item ? item.value : null;
    },
    persist() {
        try {
            // Keep only the last 20 cached items to prevent LS bloat
            const keys = Object.keys(this.data);
            if (keys.length > 20) {
                const sorted = keys.sort((a, b) => this.data[b].timestamp - this.data[a].timestamp);
                const toKeep = sorted.slice(0, 20);
                const newData = {};
                toKeep.forEach(k => { newData[k] = this.data[k]; });
                this.data = newData;
            }
            localStorage.setItem('vee_cache_v1', JSON.stringify(this.data));
        } catch (e) {
            console.error('Cache persistence failed', e);
        }
    },
    // Intelligent Pre-fetching Helper
    async prefetch(key, url) {
        // Don't prefetch if we recently fetched it (within 30 seconds)
        if (this.data[key] && (Date.now() - this.data[key].timestamp < 30000)) {
            return;
        }
        
        // Mark as prefetching to prevent duplicate network requests
        this.data[key] = { ...this.data[key], timestamp: Date.now(), prefetching: true };
        
        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                this.set(key, data);
            }
        } catch (e) {
            console.error(`Prefetch failed for ${url}`, e);
        } finally {
            if (this.data[key]) this.data[key].prefetching = false;
        }
    }
};

export default cache;

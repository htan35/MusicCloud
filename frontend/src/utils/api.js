import axios from 'axios';

const getBaseURL = () => {
    // If running in a mobile environment (Capacitor)
    if (window.Capacitor && window.Capacitor.getPlatform() !== 'web') {
        // IMPORTANT: Replace this IP with your computer's local IP (e.g., 192.168.1.10)
        // so the phone can reach the backend.
        return 'http://172.16.217.241/api';
    }
    return '/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
    timeout: 60000,
    withCredentials: true  // always send cookies (JWT)
});

// ── Songs ──────────────────────────────────────────────────────────────────────
export const songApi = {
    getAll: async (search = '') => {
        const params = search ? { search } : {};
        const { data } = await api.get('/songs', { params });
        return data;
    },
    getById: async (id) => {
        const { data } = await api.get(`/songs/${id}`);
        return data;
    },
    upload: async (formData, onProgress) => {
        const { data } = await api.post('/songs', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: e => {
                if (onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
            }
        });
        return data;
    },
    update: async (id, updates) => {
        const { data } = await api.patch(`/songs/${id}`, updates);
        return data;
    },
    delete: async (id) => {
        const { data } = await api.delete(`/songs/${id}`);
        return data;
    },
    like: async (id) => {
        const { data } = await api.post(`/songs/${id}/like`);
        return data;
    }
};

// ── Auth ───────────────────────────────────────────────────────────────────────
export const authApi = {
    register: async (email, username, password) => {
        const { data } = await api.post('/auth/register', { email, username, password });
        return data;
    },
    login: async (username, password) => {
        const { data } = await api.post('/auth/login', { username, password });
        return data;
    },
    logout: async () => {
        const { data } = await api.post('/auth/logout');
        return data;
    },
    me: async () => {
        const { data } = await api.get('/auth/me');
        return data;
    }
};

// ── Playlists ──────────────────────────────────────────────────────────────────
export const playlistApi = {
    getAll: async () => {
        const { data } = await api.get('/playlists');
        return data;
    },
    create: async (name) => {
        const { data } = await api.post('/playlists', { name });
        return data;
    },
    rename: async (id, name) => {
        const { data } = await api.patch(`/playlists/${id}`, { name });
        return data;
    },
    addSong: async (playlistId, songId) => {
        const { data } = await api.post(`/playlists/${playlistId}/songs`, { songId });
        return data;
    },
    removeSong: async (playlistId, songId) => {
        const { data } = await api.delete(`/playlists/${playlistId}/songs/${songId}`);
        return data;
    },
    delete: async (id) => {
        const { data } = await api.delete(`/playlists/${id}`);
        return data;
    },
    reorder: async (playlistId, songIds) => {
        const { data } = await api.put(`/playlists/${playlistId}/reorder`, { songs: songIds });
        return data;
    }
};

export default api;

// ── Lyrics ─────────────────────────────────────────────────────────────────────
export const lyricsApi = {
    search: async (query) => {
        const { data } = await api.get('/lyrics/search', { params: { q: query } });
        return data;
    },
    scrape: async (url) => {
        const { data } = await api.post('/lyrics/scrape', { url });
        return data;
    },
    save: async (songId, lyrics) => {
        const { data } = await api.post(`/lyrics/save/${songId}`, { lyrics });
        return data;
    },
    syncAI: async (songId, lyrics) => {
        const { data } = await api.post(`/lyrics/sync/${songId}`, { lyrics });
        return data;
    }
};

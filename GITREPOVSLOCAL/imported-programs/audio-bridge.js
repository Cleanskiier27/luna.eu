/**
 * NetworkBuster Audio Bridge
 * Unifies frequency analysis and synthesis across all web applications.
 * Connects to Audio Streaming Server (Port 3002).
 */

const AudioBridge = {
    AUDIO_SERVER: 'http://localhost:3002',
    currentStreamId: null,
    
    // Initialize a shared audio session
    async initSession() {
        try {
            const response = await fetch(`${this.AUDIO_SERVER}/api/audio/stream/create`, { method: 'POST' });
            const data = await response.json();
            this.currentStreamId = data.streamId;
            console.log(`[AudioBridge] Session initialized: ${this.currentStreamId}`);
            return data;
        } catch (error) {
            console.error('[AudioBridge] Failed to init session:', error);
        }
    },

    // Global Frequency Synthesis
    async playTone(frequency, duration = 1000, waveform = 'sine') {
        try {
            const response = await fetch(`${this.AUDIO_SERVER}/api/audio/synthesize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ frequency, duration, waveform })
            });
            return await response.json();
        } catch (error) {
            console.error('[AudioBridge] Synthesis error:', error);
        }
    },

    // Real-time Frequency Detection (Mock/Interface)
    async detectFrequency() {
        try {
            const response = await fetch(`${this.AUDIO_SERVER}/api/audio/detect-frequency`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioBuffer: [0] }) // Placeholder for real buffer
            });
            return await response.json();
        } catch (error) {
            console.error('[AudioBridge] Detection error:', error);
        }
    },

    // Spectrum Telemetry
    async getSpectrum() {
        if (!this.currentStreamId) return null;
        try {
            const response = await fetch(`${this.AUDIO_SERVER}/api/audio/spectrum`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ streamId: this.currentStreamId })
            });
            return await response.json();
        } catch (error) {
            console.error('[AudioBridge] Spectrum error:', error);
        }
    }
};

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioBridge;
} else {
    window.AudioBridge = AudioBridge;
}

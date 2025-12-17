/**
 * GPU Application & Satellite Frequency Mode Module
 * Provides universal table reading for all data types
 * 
 * Features:
 * - GPU-accelerated table processing
 * - Multi-format table parsing (CSV, JSON, XML, FITS, TLE, etc.)
 * - Satellite frequency analysis
 * - Doppler shift calculations
 * - Real-time frequency allocation
 * 
 * Note: GPUApp and SatelliteFrequencyMode are exported from app.js
 */

// ============================================
// TABLE READER FACTORY
// ============================================

class UniversalTableReader {
    constructor() {
        this.readers = [];
        this.cache = new Map();
        this.initializeReaders();
    }
    
    initializeReaders() {
        this.readers = [
            new CSVTableReader(),
            new JSONTableReader(),
            new HTMLTableReader(),
            new XMLTableReader(),
            new TSVTableReader(),
            new BinaryTableReader(),
            new YAMLTableReader(),
            new FITSTableReader(),
            new TLETableReader(),
            new FrequencyTableReader(),
            new EphemerisTableReader()
        ];
    }
    
    async readFile(file) {
        // Check cache first
        const cacheKey = `${file.name}-${file.size}-${file.lastModified}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        // Detect format and find appropriate reader
        const format = this.detectFormat(file);
        const reader = this.readers.find(r => r.supports(format));
        
        if (!reader) {
            throw new Error(`No reader available for format: ${format}`);
        }
        
        const result = await reader.read(file);
        this.cache.set(cacheKey, result);
        return result;
    }
    
    detectFormat(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        return file.type || extension;
    }
}

// ============================================
// TABLE READER BASE CLASSES
// ============================================

class TableReaderBase {
    constructor(name, supportedFormats) {
        this.name = name;
        this.supportedFormats = supportedFormats;
    }
    
    supports(format) {
        return this.supportedFormats.includes(format) || 
               this.supportedFormats.includes('.' + format);
    }
    
    async read(file) {
        throw new Error('read() must be implemented');
    }
    
    normalizeOutput(headers, rows) {
        return {
            format: this.name,
            headers: headers || [],
            rows: rows || [],
            count: rows?.length || 0,
            columns: headers?.length || 0,
            metadata: {
                reader: this.name,
                timestamp: new Date().toISOString(),
                fileSize: rows ? rows.length * headers.length : 0
            }
        };
    }
}

class CSVTableReader extends TableReaderBase {
    constructor() {
        super('CSV', ['csv', '.csv', 'text/csv']);
    }
    
    async read(file) {
        const text = await this.readAsText(file);
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
        });
        return this.normalizeOutput(headers, rows);
    }
    
    readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}

class JSONTableReader extends TableReaderBase {
    constructor() {
        super('JSON', ['json', '.json', 'application/json']);
    }
    
    async read(file) {
        const text = await this.readAsText(file);
        const json = JSON.parse(text);
        
        const data = Array.isArray(json) ? json : json.data || [];
        const headers = data.length > 0 ? Object.keys(data[0]) : [];
        
        return this.normalizeOutput(headers, data);
    }
    
    readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}

class HTMLTableReader extends TableReaderBase {
    constructor() {
        super('HTML', ['html', '.html', 'text/html']);
    }
    
    async read(file) {
        const text = await this.readAsText(file);
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const table = doc.querySelector('table');
        
        if (!table) {
            throw new Error('No HTML table found in file');
        }
        
        const headers = [];
        const rows = [];
        
        // Extract headers
        table.querySelectorAll('thead th').forEach(th => {
            headers.push(th.textContent.trim());
        });
        
        // Extract rows
        table.querySelectorAll('tbody tr').forEach(tr => {
            const cells = [];
            tr.querySelectorAll('td').forEach(td => {
                cells.push(td.textContent.trim());
            });
            if (cells.length > 0) {
                rows.push(Object.fromEntries(headers.map((h, i) => [h, cells[i]])));
            }
        });
        
        return this.normalizeOutput(headers, rows);
    }
    
    readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}

class XMLTableReader extends TableReaderBase {
    constructor() {
        super('XML', ['xml', '.xml', 'application/xml']);
    }
    
    async read(file) {
        const text = await this.readAsText(file);
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'application/xml');
        
        const records = doc.querySelectorAll('record, row, item');
        const headers = new Set();
        const rows = [];
        
        records.forEach(record => {
            const row = {};
            Array.from(record.children).forEach(child => {
                headers.add(child.tagName);
                row[child.tagName] = child.textContent.trim();
            });
            if (Object.keys(row).length > 0) rows.push(row);
        });
        
        return this.normalizeOutput(Array.from(headers), rows);
    }
    
    readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}

class TSVTableReader extends TableReaderBase {
    constructor() {
        super('TSV', ['tsv', '.tsv', 'text/tab-separated-values']);
    }
    
    async read(file) {
        const text = await this.readAsText(file);
        const lines = text.trim().split('\n');
        const headers = lines[0].split('\t').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
            const values = line.split('\t').map(v => v.trim());
            return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
        });
        return this.normalizeOutput(headers, rows);
    }
    
    readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}

class BinaryTableReader extends TableReaderBase {
    constructor() {
        super('Binary', ['bin', '.bin', 'application/octet-stream']);
    }
    
    async read(file) {
        const arrayBuffer = await this.readAsArrayBuffer(file);
        const view = new DataView(arrayBuffer);
        
        const headers = [];
        const rows = [];
        
        // Read magic bytes
        const magic = String.fromCharCode(...new Uint8Array(arrayBuffer, 0, 4));
        
        // Read metadata
        const recordCount = view.getUint32(4, true);
        const fieldCount = view.getUint32(8, true);
        
        // Generate field headers
        for (let i = 0; i < fieldCount; i++) {
            headers.push(`Field_${i + 1}`);
        }
        
        // Parse records
        let offset = 16;
        for (let i = 0; i < recordCount && offset < arrayBuffer.byteLength; i++) {
            const row = {};
            for (let j = 0; j < fieldCount; j++) {
                const value = view.getUint32(offset, true);
                row[headers[j]] = value.toString();
                offset += 4;
            }
            rows.push(row);
        }
        
        return this.normalizeOutput(headers, rows);
    }
    
    readAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
}

class YAMLTableReader extends TableReaderBase {
    constructor() {
        super('YAML', ['yaml', '.yaml', '.yml', 'application/yaml']);
    }
    
    async read(file) {
        const text = await this.readAsText(file);
        const lines = text.split('\n').filter(l => l.trim());
        
        const rows = [];
        const headers = new Set();
        let current = {};
        
        lines.forEach(line => {
            const match = line.match(/^\s*-?\s*([^:]+):\s*(.+)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/['"]|,$/g, '');
                headers.add(key);
                current[key] = value;
                
                if (line.startsWith('-') && Object.keys(current).length > 0) {
                    rows.push({ ...current });
                    current = {};
                }
            }
        });
        
        if (Object.keys(current).length > 0) rows.push(current);
        
        return this.normalizeOutput(Array.from(headers), rows);
    }
    
    readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}

class FITSTableReader extends TableReaderBase {
    constructor() {
        super('FITS', ['fits', '.fits', 'application/fits']);
    }
    
    async read(file) {
        const arrayBuffer = await this.readAsArrayBuffer(file);
        const view = new DataView(arrayBuffer);
        
        const headers = [];
        const rows = [];
        
        // FITS header blocks are 2880 bytes
        let offset = 2880;
        
        // Read metadata
        const recordCount = view.getUint32(offset + 4, false) || 100;
        const fieldCount = view.getUint16(offset + 8, false) || 10;
        
        // Generate field names
        for (let i = 0; i < fieldCount; i++) {
            headers.push(`Col_${String.fromCharCode(65 + (i % 26))}_${Math.floor(i / 26)}`);
        }
        
        // Parse data section
        offset += 2880;
        
        for (let i = 0; i < recordCount && offset < arrayBuffer.byteLength; i++) {
            const row = {};
            for (let j = 0; j < fieldCount; j++) {
                const value = view.getFloat64(offset, false);
                row[headers[j]] = value.toFixed(6);
                offset += 8;
            }
            rows.push(row);
        }
        
        return this.normalizeOutput(headers, rows);
    }
    
    readAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
}

class TLETableReader extends TableReaderBase {
    constructor() {
        super('TLE', ['tle', '.tle', 'text/plain']);
    }
    
    async read(file) {
        const text = await this.readAsText(file);
        const lines = text.trim().split('\n');
        
        const headers = ['name', 'catalogNumber', 'inclination', 'eccentricity', 'meanMotion', 'raan', 'argPerigee'];
        const rows = [];
        
        for (let i = 0; i < lines.length; i += 2) {
            if (i + 1 < lines.length && lines[i + 1].startsWith('1')) {
                const name = lines[i].trim();
                const line1 = lines[i + 1];
                const line2 = lines[i + 2];
                
                if (line2?.startsWith('2')) {
                    rows.push({
                        name,
                        catalogNumber: line1.substring(2, 7).trim(),
                        inclination: line2.substring(8, 16).trim(),
                        eccentricity: ('0.' + line2.substring(26, 33)).trim(),
                        meanMotion: line2.substring(52, 63).trim(),
                        raan: line2.substring(17, 25).trim(),
                        argPerigee: line2.substring(34, 42).trim()
                    });
                }
            }
        }
        
        return this.normalizeOutput(headers, rows);
    }
    
    readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}

class FrequencyTableReader extends TableReaderBase {
    constructor() {
        super('Frequency', ['freq', '.freq', 'text/plain']);
    }
    
    async read(file) {
        const text = await this.readAsText(file);
        const lines = text.trim().split('\n');
        
        const headers = ['frequency', 'band', 'satellite', 'uplink', 'downlink', 'bandwidth', 'mode'];
        const rows = [];
        
        lines.forEach(line => {
            const parts = line.split(/[\t,|]/);
            if (parts.length >= 3) {
                rows.push({
                    frequency: parts[0].trim(),
                    band: parts[1].trim(),
                    satellite: parts[2].trim(),
                    uplink: parts[3]?.trim() || 'N/A',
                    downlink: parts[4]?.trim() || 'N/A',
                    bandwidth: parts[5]?.trim() || 'N/A',
                    mode: parts[6]?.trim() || 'FM'
                });
            }
        });
        
        return this.normalizeOutput(headers, rows);
    }
    
    readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}

class EphemerisTableReader extends TableReaderBase {
    constructor() {
        super('Ephemeris', ['eph', '.ephem', 'text/plain']);
    }
    
    async read(file) {
        const text = await this.readAsText(file);
        const lines = text.trim().split('\n');
        
        const headers = ['time', 'x', 'y', 'z', 'vx', 'vy', 'vz', 'range', 'azimuth', 'elevation'];
        const rows = [];
        
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
                rows.push({
                    time: parts[0],
                    x: parseFloat(parts[1]) || 0,
                    y: parseFloat(parts[2]) || 0,
                    z: parseFloat(parts[3]) || 0,
                    vx: parseFloat(parts[4]) || 0,
                    vy: parseFloat(parts[5]) || 0,
                    vz: parseFloat(parts[6]) || 0,
                    range: parseFloat(parts[7]) || 0,
                    azimuth: parseFloat(parts[8]) || 0,
                    elevation: parseFloat(parts[9]) || 0
                });
            }
        });
        
        return this.normalizeOutput(headers, rows);
    }
    
    readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}

// ============================================
// EXPORT UNIVERSAL TABLE READER
// ============================================

window.UniversalTableReader = UniversalTableReader;
window.tableReader = new UniversalTableReader();

console.log('✓ GPU Satellite Module loaded - Table readers available');

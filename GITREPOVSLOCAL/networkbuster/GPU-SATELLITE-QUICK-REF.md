# GPU App & Satellite Frequency Mode - Quick Reference

## 🚀 Quick Start

### 1. Load the Module
```html
<script src="app.js"></script>
<script src="gpu-satellite-module.js"></script>
```

### 2. Read Any Table File
```javascript
// Automatically detects format (CSV, JSON, XML, etc.)
const tableData = await window.tableReader.readFile(fileObject);
```

### 3. Process with GPU
```javascript
const result = await GPUApp.process(tableData);
console.log(result.statistics); // Automatic statistics
```

### 4. Analyze Satellite Data
```javascript
const satData = await SatelliteFrequencyMode.readFrequencyTable(file);
const analysis = await SatelliteFrequencyMode.processFrequencyTable(satData);
```

## 📊 Supported Formats

| Format | Detect | Example |
|--------|--------|---------|
| CSV | `.csv` | `name,value\ntest,123` |
| JSON | `.json` | `[{"name":"test"}]` |
| HTML | `.html` | `<table><tr><td>value</td>` |
| XML | `.xml` | `<record><field>value</field>` |
| TSV | `.tsv` | `name\tvalue\ntest\t123` |
| FITS | `.fits` | Binary astronomy format |
| TLE | `.tle` | Two-line satellite elements |
| Frequency | `.freq` | Frequency allocation table |
| Ephemeris | `.eph` | Satellite position/velocity |

## 🎮 GPU Processing

### Automatic GPU Detection
```javascript
if (navigator.gpu) {
    // GPU available - uses WebGPU
} else {
    // GPU unavailable - falls back to CPU
}
```

### Manual Processing
```javascript
const result = await GPUApp.process(table);
// result.stats: row count, column count, cell count
// result.numeric: extracted numeric columns
// result.statistics: min, max, mean, median, sum
```

## 📡 Satellite Features

### Doppler Shift
```javascript
const shifted = SatelliteFrequencyMode.calculateDopplerShift(
    frequency,  // MHz
    velocity    // m/s
);
```

### Parse TLE Data
```javascript
const tleData = await SatelliteFrequencyMode.parseTLETable(tleString);
// Extracts: catalogNumber, inclination, eccentricity, meanMotion
```

### Frequency Analysis
```javascript
const analysis = await SatelliteFrequencyMode.processFrequencyTable(table);
// Returns: bandAllocation, frequencyRanges, modes, statistics
```

## 💾 File Operations

### Read File from Input
```javascript
const file = document.getElementById('fileInput').files[0];
const data = await window.tableReader.readFile(file);
```

### Read Multiple Files
```javascript
const files = document.getElementById('fileInput').files;
const allData = await Promise.all(
    Array.from(files).map(f => window.tableReader.readFile(f))
);
```

### Export as JSON
```javascript
const json = JSON.stringify(tableData, null, 2);
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
```

## 🔍 Data Analysis

### Calculate Statistics
```javascript
const stats = GPUApp.calculateStatistics(tableData);
Object.entries(stats).forEach(([column, columnStats]) => {
    console.log(column);
    console.log('  min:', columnStats.min);
    console.log('  max:', columnStats.max);
    console.log('  mean:', columnStats.mean);
    console.log('  median:', columnStats.median);
});
```

### Extract Numeric Columns
```javascript
const numeric = GPUApp.extractNumericColumns(tableData);
// numeric[columnName] = [values...]
```

## 🛰️ Common Satellites

### ISS
- Frequency: 145.800 MHz
- Mode: FM
- Coverage: ±51.6° latitude
- Contact: ZARYA

### NOAA Weather Satellites
- NOAA-18: 137.900 MHz (APT)
- NOAA-19: 137.100 MHz (APT)
- NOAA-20: 137.620 MHz (LRPT)

### GOES Geostationary
- GOES-16: 1694.1 MHz (HRIT)
- GOES-17: 1694.9 MHz (HRIT)
- Coverage: North America

### GPS Constellation
- Frequency: 1227.60 MHz (L2)
- Frequency: 1575.42 MHz (L1)
- Satellites: 24-31 in orbit

## 🔧 Troubleshooting

### Module Not Loaded
```javascript
if (!window.GPUApp) {
    console.error('GPU module not loaded');
    // Check: <script src="gpu-satellite-module.js"></script>
}
```

### File Format Not Recognized
```javascript
try {
    const data = await window.tableReader.readFile(file);
} catch (error) {
    console.error('Format not supported:', file.type);
    // Try renaming file with correct extension
}
```

### GPU Processing Failed
```javascript
// Automatically falls back to CPU
const result = await GPUApp.process(table);
// Check result.processingMode: 'GPU' or 'CPU'
```

### Out of Memory
```javascript
// Process in chunks for large files
const chunkSize = 50000;
for (let i = 0; i < data.rows.length; i += chunkSize) {
    const chunk = data.rows.slice(i, i + chunkSize);
    await GPUApp.process({ ...data, rows: chunk });
}
```

## 📈 Performance Tips

1. **Use GPU for large tables** (> 100K rows)
2. **Enable caching** for repeated file access
3. **Process in chunks** for files > 1GB
4. **Use TSV/CSV** for faster parsing than JSON
5. **Offload to Web Worker** for responsive UI

## 🎓 Example Workflows

### Weather Data Analysis
```javascript
// 1. Read NOAA frequency table
const freqData = await SatelliteFrequencyMode.readFrequencyTable(file);

// 2. Analyze frequency allocation
const analysis = await SatelliteFrequencyMode.processFrequencyTable(freqData);

// 3. View band distribution
console.log(analysis.analysis.bandAllocation);
```

### Satellite Tracking
```javascript
// 1. Parse TLE data
const tleData = await SatelliteFrequencyMode.parseTLETable(tleFile);

// 2. Calculate Doppler for each satellite
tleData.rows.forEach(sat => {
    const velocity = sat.meanMotion * 1000; // simplified
    const doppler = SatelliteFrequencyMode.calculateDopplerShift(145.800, velocity);
    console.log(sat.name, doppler);
});
```

### Data Processing Pipeline
```javascript
// 1. Read CSV
const table = await window.tableReader.readFile(csvFile);

// 2. Process with GPU
const processed = await GPUApp.process(table);

// 3. Export statistics
const stats = processed.statistics;
const json = JSON.stringify(stats);
// Save or display
```

## 🔗 Related Resources

### Related Repositories
- **satgpuNASA**: https://github.com/NetworkBuster/satgpuNASA - Advanced GPU satellite data processing
- **NetworkBuster**: https://networkbuster.net - Official website and resources

### Technical References
- **WebGPU**: https://gpuweb.github.io/gpuweb/
- **FITS Format**: https://fits.gsfc.nasa.gov/
- **NORAD TLE**: https://celestrak.com/
- **ITU Frequency**: https://www.itu.int/
- **NASA APIs**: https://api.nasa.gov/

## 📝 API Summary

| Function | Input | Output | Use Case |
|----------|-------|--------|----------|
| `readFile()` | File | TableData | Load any format |
| `process()` | TableData | Results | Analyze data |
| `calculateDopplerShift()` | freq, velocity | number | Satellite tracking |
| `parseFrequencyTable()` | string | TableData | Frequency analysis |
| `parseTLETable()` | string | TableData | Satellite elements |
| `calculateStatistics()` | TableData | Object | Data statistics |

## 🎯 Next Steps

1. Run example: `GPUExamples.basicTableReading()`
2. Load your data file
3. Process with GPU: `await GPUApp.process(data)`
4. Analyze results
5. Export findings

Happy analyzing! 🚀📡

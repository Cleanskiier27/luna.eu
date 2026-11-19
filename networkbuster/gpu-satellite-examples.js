/**
 * GPU App & Satellite Frequency Mode - Usage Examples
 * 
 * This file demonstrates how to use the GPU Application
 * and Satellite Frequency Mode modules
 */

// ============================================
// EXAMPLE 1: Basic Table Reading
// ============================================

async function exampleBasicTableReading() {
    console.log('=== Example 1: Basic Table Reading ===');
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        
        try {
            // Use the universal table reader
            const tableData = await window.tableReader.readFile(file);
            
            console.log('Table Format:', tableData.format);
            console.log('Row Count:', tableData.count);
            console.log('Column Count:', tableData.columns);
            console.log('Headers:', tableData.headers);
            console.log('First Row:', tableData.rows[0]);
            
            // Display results
            displayTableResults(tableData);
        } catch (error) {
            console.error('Error reading file:', error);
            alert('Error: ' + error.message);
        }
    });
    
    // Trigger file picker
    fileInput.click();
}

function displayTableResults(tableData) {
    const resultsDiv = document.createElement('div');
    resultsDiv.innerHTML = `
        <h2>Table Reading Results</h2>
        <p><strong>Format:</strong> ${tableData.format}</p>
        <p><strong>Rows:</strong> ${tableData.count}</p>
        <p><strong>Columns:</strong> ${tableData.columns}</p>
        <table border="1" style="margin-top: 20px;">
            <thead>
                <tr>
                    ${tableData.headers.map(h => `<th>${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${tableData.rows.slice(0, 10).map(row => `
                    <tr>
                        ${tableData.headers.map(h => `<td>${row[h] || 'N/A'}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <p><em>Showing first 10 rows of ${tableData.count} total</em></p>
    `;
    
    document.body.appendChild(resultsDiv);
}

// ============================================
// EXAMPLE 2: GPU Processing
// ============================================

async function exampleGPUProcessing() {
    console.log('=== Example 2: GPU Processing ===');
    
    // Sample data
    const sampleData = {
        format: 'CSV',
        headers: ['id', 'temperature', 'pressure', 'humidity'],
        rows: [
            { id: '1', temperature: '22.5', pressure: '1013.25', humidity: '65' },
            { id: '2', temperature: '23.1', pressure: '1013.42', humidity: '68' },
            { id: '3', temperature: '21.8', pressure: '1012.98', humidity: '72' },
        ],
        count: 3
    };
    
    try {
        // Process with GPU (or CPU fallback)
        const result = await GPUApp.process(sampleData);
        
        console.log('Processing Results:');
        console.log('Format:', result.format);
        console.log('Row Count:', result.stats.rowCount);
        console.log('Column Count:', result.stats.columnCount);
        
        if (result.statistics) {
            console.log('Statistics for numeric columns:');
            Object.entries(result.statistics).forEach(([col, stats]) => {
                console.log(`  ${col}: min=${stats.min}, max=${stats.max}, mean=${stats.mean.toFixed(2)}`);
            });
        }
    } catch (error) {
        console.error('GPU processing error:', error);
    }
}

// ============================================
// EXAMPLE 3: Satellite Data Reading
// ============================================

async function exampleSatelliteDataReading() {
    console.log('=== Example 3: Satellite Data Reading ===');
    
    // Example TLE data
    const tleText = `ISS (ZARYA)
1 25544U 98067A   24001.50000000  .00018269  00000-0  32486-3 0  9999
2 25544  51.6417 247.4627 0006703 130.5360 325.0288 15.54236145428785
NOAA 18
1 28654U 05018A   24001.50000000  .00000091  00000-0  71878-4 0  9995
2 28654  99.1117  34.3050 0015091  97.9478 262.2537 14.12481205836017`;
    
    try {
        // Parse TLE data
        const tleData = await SatelliteFrequencyMode.parseTLETable(tleText);
        
        console.log('Satellites found:', tleData.count);
        console.log('Headers:', tleData.headers);
        
        tleData.rows.forEach(sat => {
            console.log(`\n${sat.name}:`);
            console.log(`  Catalog Number: ${sat.catalogNumber}`);
            console.log(`  Inclination: ${sat.inclination}°`);
            console.log(`  Eccentricity: ${sat.eccentricity}`);
            console.log(`  Mean Motion: ${sat.meanMotion} rev/day`);
        });
        
        // Display in UI
        displaySatelliteData(tleData);
    } catch (error) {
        console.error('Error parsing TLE:', error);
    }
}

function displaySatelliteData(tleData) {
    const div = document.createElement('div');
    div.innerHTML = `
        <h2>Satellite Data</h2>
        <p>Found ${tleData.count} satellites</p>
        ${tleData.rows.map(sat => `
            <div style="border: 1px solid #ccc; padding: 10px; margin: 10px 0;">
                <h3>${sat.name}</h3>
                <p><strong>Catalog Number:</strong> ${sat.catalogNumber}</p>
                <p><strong>Inclination:</strong> ${sat.inclination}°</p>
                <p><strong>Eccentricity:</strong> ${sat.eccentricity}</p>
                <p><strong>Mean Motion:</strong> ${sat.meanMotion} rev/day</p>
            </div>
        `).join('')}
    `;
    document.body.appendChild(div);
}

// ============================================
// EXAMPLE 4: Frequency Analysis
// ============================================

async function exampleFrequencyAnalysis() {
    console.log('=== Example 4: Frequency Analysis ===');
    
    // Example frequency data
    const frequencyText = `145.800,VHF,ISS,144.490,145.800,10 kHz,FM
137.900,VHF,NOAA-18,N/A,137.900,40 kHz,LSB
137.100,VHF,NOAA-19,N/A,137.100,40 kHz,LSB
1694.1,L-Band,GOES-16,1695.4,1694.1,5 MHz,PSK
1694.9,L-Band,GOES-17,1695.9,1694.9,5 MHz,PSK`;
    
    try {
        // Parse frequency data
        const freqData = await SatelliteFrequencyMode.parseFrequencyTable(frequencyText);
        
        console.log('Frequencies found:', freqData.count);
        
        // Analyze frequencies
        const analysis = await SatelliteFrequencyMode.processFrequencyTable(freqData);
        
        console.log('\nFrequency Analysis:');
        console.log('Band Allocation:', analysis.analysis.bandAllocation);
        console.log('Frequency Ranges:', analysis.analysis.frequencyRanges);
        console.log('Modes:', analysis.analysis.modes);
        console.log('Statistics:', analysis.analysis.statistics);
        
        // Display in UI
        displayFrequencyAnalysis(analysis);
    } catch (error) {
        console.error('Error analyzing frequencies:', error);
    }
}

function displayFrequencyAnalysis(analysis) {
    const div = document.createElement('div');
    div.innerHTML = `
        <h2>Frequency Analysis</h2>
        <h3>Band Allocation</h3>
        <ul>
            ${Object.entries(analysis.analysis.bandAllocation).map(([band, count]) => 
                `<li>${band}: ${count} frequencies</li>`
            ).join('')}
        </ul>
        
        <h3>Frequency Ranges</h3>
        <ul>
            ${Object.entries(analysis.analysis.frequencyRanges).map(([range, data]) => 
                `<li>${range}: ${data.min.toFixed(2)} - ${data.max.toFixed(2)} MHz (${data.count} frequencies)</li>`
            ).join('')}
        </ul>
        
        <h3>Modes</h3>
        <ul>
            ${Object.entries(analysis.analysis.modes).map(([mode, count]) => 
                `<li>${mode}: ${count} frequencies</li>`
            ).join('')}
        </ul>
    `;
    document.body.appendChild(div);
}

// ============================================
// EXAMPLE 5: Doppler Shift Calculation
// ============================================

function exampleDopplerShift() {
    console.log('=== Example 5: Doppler Shift ===');
    
    // ISS frequency and velocity
    const issFrequency = 145.800; // MHz
    const issVelocity = 7660; // m/s (orbital velocity)
    
    // Calculate Doppler shift for approaching satellite
    const dopplerShifted = SatelliteFrequencyMode.calculateDopplerShift(
        issFrequency,
        issVelocity
    );
    
    const shift = dopplerShifted - issFrequency;
    const shiftPpm = (shift / issFrequency) * 1e6; // parts per million
    
    console.log(`ISS Frequency: ${issFrequency} MHz`);
    console.log(`ISS Velocity: ${issVelocity} m/s`);
    console.log(`Doppler Shifted: ${dopplerShifted.toFixed(6)} MHz`);
    console.log(`Frequency Shift: ${shift.toFixed(6)} MHz`);
    console.log(`Shift (PPM): ${shiftPpm.toFixed(2)} ppm`);
    
    // Display in UI
    const div = document.createElement('div');
    div.innerHTML = `
        <h2>Doppler Shift Calculation</h2>
        <p><strong>Original Frequency:</strong> ${issFrequency} MHz</p>
        <p><strong>Satellite Velocity:</strong> ${issVelocity} m/s</p>
        <p><strong>Doppler Shifted Frequency:</strong> ${dopplerShifted.toFixed(6)} MHz</p>
        <p><strong>Frequency Shift:</strong> ${shift.toFixed(6)} MHz</p>
        <p><strong>Shift (PPM):</strong> ${shiftPpm.toFixed(2)} ppm</p>
    `;
    document.body.appendChild(div);
}

// ============================================
// EXAMPLE 6: CSV to JSON Conversion
// ============================================

async function exampleCSVToJSON() {
    console.log('=== Example 6: CSV to JSON Conversion ===');
    
    // Example CSV data
    const csvText = `name,frequency,band,mode
ISS,145.800,VHF,FM
NOAA-18,137.900,VHF,LSB
GOES-16,1694.1,L-Band,PSK`;
    
    // Create a CSV file
    const csvFile = new File([csvText], 'satellites.csv', { type: 'text/csv' });
    
    try {
        // Read as CSV
        const csvData = await window.tableReader.readFile(csvFile);
        
        console.log('CSV Data:', csvData);
        
        // Convert to JSON
        const jsonData = JSON.stringify(csvData.rows, null, 2);
        console.log('JSON Output:\n', jsonData);
        
        // Display conversion
        const div = document.createElement('div');
        div.innerHTML = `
            <h2>CSV to JSON Conversion</h2>
            <h3>Original CSV</h3>
            <pre>${csvText}</pre>
            <h3>Converted JSON</h3>
            <pre>${jsonData}</pre>
        `;
        document.body.appendChild(div);
    } catch (error) {
        console.error('Conversion error:', error);
    }
}

// ============================================
// EXAMPLE 7: Large File Processing
// ============================================

async function exampleLargeFileProcessing() {
    console.log('=== Example 7: Large File Processing ===');
    
    // Generate large dataset
    const headers = ['id', 'timestamp', 'value1', 'value2', 'value3'];
    const rows = [];
    
    for (let i = 0; i < 10000; i++) {
        rows.push({
            id: i.toString(),
            timestamp: new Date().toISOString(),
            value1: (Math.random() * 100).toFixed(2),
            value2: (Math.random() * 100).toFixed(2),
            value3: (Math.random() * 100).toFixed(2)
        });
    }
    
    const largeData = {
        format: 'Generated',
        headers,
        rows,
        count: rows.length
    };
    
    try {
        console.time('Processing');
        
        // Process large file
        const result = await GPUApp.process(largeData);
        
        console.timeEnd('Processing');
        
        console.log('Results:');
        console.log('- Rows processed:', result.stats.rowCount);
        console.log('- Columns processed:', result.stats.columnCount);
        console.log('- Total cells:', result.stats.totalCells);
        
        if (result.statistics) {
            console.log('- Statistics calculated for', Object.keys(result.statistics).length, 'numeric columns');
        }
    } catch (error) {
        console.error('Processing error:', error);
    }
}

// ============================================
// EXAMPLE 8: Interactive Table Viewer
// ============================================

function exampleInteractiveTableViewer() {
    console.log('=== Example 8: Interactive Table Viewer ===');
    
    // Create UI
    const container = document.createElement('div');
    container.innerHTML = `
        <div style="padding: 20px;">
            <h2>Interactive Table Viewer</h2>
            <input type="file" id="tableFileInput" accept=".csv,.json,.xml,.tsv,.html" />
            <div id="tableContainer"></div>
        </div>
    `;
    
    document.body.appendChild(container);
    
    // Add event listener
    document.getElementById('tableFileInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const tableData = await window.tableReader.readFile(file);
            
            // Render table
            let html = `<h3>${tableData.format} File - ${tableData.count} rows</h3>`;
            html += '<table border="1" style="border-collapse: collapse; width: 100%; margin-top: 20px;">';
            
            // Headers
            html += '<thead><tr>';
            tableData.headers.forEach(h => {
                html += `<th style="padding: 10px; background: #f0f0f0;">${h}</th>`;
            });
            html += '</tr></thead>';
            
            // Rows (first 50)
            html += '<tbody>';
            tableData.rows.slice(0, 50).forEach(row => {
                html += '<tr>';
                tableData.headers.forEach(h => {
                    html += `<td style="padding: 8px; border: 1px solid #ddd;">${row[h] || ''}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody></table>';
            
            if (tableData.count > 50) {
                html += `<p><em>Showing 50 of ${tableData.count} rows</em></p>`;
            }
            
            document.getElementById('tableContainer').innerHTML = html;
        } catch (error) {
            document.getElementById('tableContainer').innerHTML = 
                `<p style="color: red;">Error: ${error.message}</p>`;
        }
    });
}

// ============================================
// INITIALIZATION
// ============================================

// Wait for DOM and modules to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('GPU and Satellite modules ready');
    console.log('Available examples:');
    console.log('- exampleBasicTableReading()');
    console.log('- exampleGPUProcessing()');
    console.log('- exampleSatelliteDataReading()');
    console.log('- exampleFrequencyAnalysis()');
    console.log('- exampleDopplerShift()');
    console.log('- exampleCSVToJSON()');
    console.log('- exampleLargeFileProcessing()');
    console.log('- exampleInteractiveTableViewer()');
});

// Export for use in console
window.GPUExamples = {
    basicTableReading: exampleBasicTableReading,
    gpuProcessing: exampleGPUProcessing,
    satelliteDataReading: exampleSatelliteDataReading,
    frequencyAnalysis: exampleFrequencyAnalysis,
    dopplerShift: exampleDopplerShift,
    csvToJSON: exampleCSVToJSON,
    largeFileProcessing: exampleLargeFileProcessing,
    interactiveTableViewer: exampleInteractiveTableViewer
};

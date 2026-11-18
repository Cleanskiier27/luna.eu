/**
 * GPU App & Satellite Frequency Mode - Test Suite
 * 
 * Run tests with: TestSuite.runAllTests()
 */

const TestSuite = {
    results: [],
    passCount: 0,
    failCount: 0,
    
    async runAllTests() {
        console.log('='.repeat(60));
        console.log('GPU APP & SATELLITE FREQUENCY MODE - TEST SUITE');
        console.log('='.repeat(60));
        
        this.results = [];
        this.passCount = 0;
        this.failCount = 0;
        
        // Test GPU App
        console.log('\n📱 GPU APP TESTS\n');
        await this.testGPUAppInitialization();
        await this.testGPUAppTableReaders();
        await this.testGPUAppProcessing();
        await this.testGPUAppStatistics();
        
        // Test Satellite Mode
        console.log('\n📡 SATELLITE FREQUENCY MODE TESTS\n');
        await this.testSatelliteModeInitialization();
        await this.testTLEParsing();
        await this.testFrequencyParsing();
        await this.testDopplerShift();
        
        // Test Universal Table Reader
        console.log('\n📊 UNIVERSAL TABLE READER TESTS\n');
        await this.testCSVReading();
        await this.testJSONReading();
        await this.testXMLReading();
        
        // Summary
        this.printSummary();
    },
    
    // ============================================
    // GPU APP TESTS
    // ============================================
    
    async testGPUAppInitialization() {
        console.log('Test: GPU App Initialization');
        try {
            this.assert('GPUApp exists', typeof GPUApp !== 'undefined');
            this.assert('GPUApp.init exists', typeof GPUApp.init === 'function');
            this.assert('GPUApp.process exists', typeof GPUApp.process === 'function');
            this.pass('GPU App initialized successfully');
        } catch (e) {
            this.fail('GPU App initialization: ' + e.message);
        }
    },
    
    async testGPUAppTableReaders() {
        console.log('\nTest: GPU App Table Readers');
        try {
            GPUApp.initializeTableReaders();
            this.assert('Table readers initialized', GPUApp.tableReaders.length > 0);
            this.assert('CSV reader available', 
                GPUApp.tableReaders.some(r => r.name.includes('CSV')));
            this.assert('JSON reader available', 
                GPUApp.tableReaders.some(r => r.name.includes('JSON')));
            this.pass(`Table readers loaded: ${GPUApp.tableReaders.length}`);
        } catch (e) {
            this.fail('Table readers: ' + e.message);
        }
    },
    
    async testGPUAppProcessing() {
        console.log('\nTest: GPU App Processing');
        try {
            const table = {
                format: 'Test',
                headers: ['col1', 'col2', 'col3'],
                rows: [
                    { col1: '1', col2: '10', col3: '100' },
                    { col1: '2', col2: '20', col3: '200' },
                    { col1: '3', col2: '30', col3: '300' }
                ],
                count: 3
            };
            
            const result = await GPUApp.process(table);
            this.assert('Processing returns result', result !== null);
            this.assert('Result has stats', result.stats !== undefined);
            this.assert('Correct row count', result.stats.rowCount === 3);
            this.assert('Correct column count', result.stats.columnCount === 3);
            this.pass('GPU processing completed');
        } catch (e) {
            this.fail('GPU processing: ' + e.message);
        }
    },
    
    async testGPUAppStatistics() {
        console.log('\nTest: GPU App Statistics');
        try {
            const table = {
                format: 'Test',
                headers: ['values'],
                rows: [
                    { values: '10' },
                    { values: '20' },
                    { values: '30' },
                    { values: '40' },
                    { values: '50' }
                ],
                count: 5
            };
            
            const stats = GPUApp.calculateStatistics(table);
            this.assert('Statistics calculated', Object.keys(stats).length > 0);
            
            if (stats.values) {
                this.assert('Min value correct', stats.values.min === 10);
                this.assert('Max value correct', stats.values.max === 50);
                this.assert('Mean value correct', stats.values.mean === 30);
                this.assert('Count correct', stats.values.count === 5);
            }
            
            this.pass('Statistics calculation successful');
        } catch (e) {
            this.fail('Statistics: ' + e.message);
        }
    },
    
    // ============================================
    // SATELLITE MODE TESTS
    // ============================================
    
    async testSatelliteModeInitialization() {
        console.log('\nTest: Satellite Mode Initialization');
        try {
            this.assert('SatelliteFrequencyMode exists', 
                typeof SatelliteFrequencyMode !== 'undefined');
            this.assert('init method exists', 
                typeof SatelliteFrequencyMode.init === 'function');
            
            SatelliteFrequencyMode.loadSatelliteDatabase();
            this.assert('Satellite database loaded', 
                SatelliteFrequencyMode.satellites.length > 0);
            
            this.pass(`Satellite Mode ready with ${SatelliteFrequencyMode.satellites.length} satellites`);
        } catch (e) {
            this.fail('Satellite Mode initialization: ' + e.message);
        }
    },
    
    async testTLEParsing() {
        console.log('\nTest: TLE Parsing');
        try {
            const tleData = `ISS (ZARYA)
1 25544U 98067A   24001.50000000  .00018269  00000-0  32486-3 0  9999
2 25544  51.6417 247.4627 0006703 130.5360 325.0288 15.54236145428785`;
            
            const result = await SatelliteFrequencyMode.parseTLETable(tleData);
            
            this.assert('TLE parsed', result.count > 0);
            this.assert('Headers present', result.headers.length > 0);
            
            if (result.rows.length > 0) {
                const sat = result.rows[0];
                this.assert('Satellite name extracted', sat.name === 'ISS (ZARYA)');
                this.assert('Catalog number extracted', sat.catalogNumber === '25544');
                this.assert('Inclination extracted', sat.inclination !== undefined);
            }
            
            this.pass('TLE parsing successful');
        } catch (e) {
            this.fail('TLE parsing: ' + e.message);
        }
    },
    
    async testFrequencyParsing() {
        console.log('\nTest: Frequency Parsing');
        try {
            const freqData = `145.800,VHF,ISS,144.490,145.800,10 kHz,FM
137.900,VHF,NOAA-18,N/A,137.900,40 kHz,LSB`;
            
            const result = await SatelliteFrequencyMode.parseFrequencyTable(freqData);
            
            this.assert('Frequencies parsed', result.count > 0);
            this.assert('Correct count', result.count === 2);
            this.assert('Headers present', result.headers.includes('frequency'));
            this.assert('Headers present', result.headers.includes('satellite'));
            
            this.pass('Frequency parsing successful');
        } catch (e) {
            this.fail('Frequency parsing: ' + e.message);
        }
    },
    
    async testDopplerShift() {
        console.log('\nTest: Doppler Shift Calculation');
        try {
            const freq = 145.800; // MHz
            const velocity = 7660; // m/s
            
            const shifted = SatelliteFrequencyMode.calculateDopplerShift(freq, velocity);
            
            this.assert('Shift calculated', shifted !== undefined);
            this.assert('Shift is number', typeof shifted === 'number');
            this.assert('Shift is reasonable', 
                shifted > freq * 0.99 && shifted < freq * 1.01);
            
            const shift = shifted - freq;
            const direction = velocity > 0 ? 'positive' : 'negative';
            this.pass(`Doppler shift: ${freq} MHz → ${shifted.toFixed(6)} MHz (${direction})`);
        } catch (e) {
            this.fail('Doppler shift: ' + e.message);
        }
    },
    
    // ============================================
    // UNIVERSAL TABLE READER TESTS
    // ============================================
    
    async testCSVReading() {
        console.log('\nTest: CSV Reading');
        try {
            const csvText = 'name,frequency\nISS,145.800\nNOAA,137.900';
            const file = new File([csvText], 'test.csv', { type: 'text/csv' });
            
            const result = await window.tableReader.readFile(file);
            
            this.assert('Format detected', result.format.includes('CSV'));
            this.assert('Headers extracted', result.headers.length === 2);
            this.assert('Rows parsed', result.count === 2);
            this.assert('First column correct', result.rows[0].name === 'ISS');
            
            this.pass('CSV reading successful');
        } catch (e) {
            this.fail('CSV reading: ' + e.message);
        }
    },
    
    async testJSONReading() {
        console.log('\nTest: JSON Reading');
        try {
            const jsonText = JSON.stringify([
                { name: 'ISS', frequency: 145.800 },
                { name: 'NOAA', frequency: 137.900 }
            ]);
            
            const file = new File([jsonText], 'test.json', { type: 'application/json' });
            const result = await window.tableReader.readFile(file);
            
            this.assert('Format detected', result.format.includes('JSON'));
            this.assert('Headers extracted', result.headers.length === 2);
            this.assert('Rows parsed', result.count === 2);
            this.assert('Data intact', result.rows[0].frequency === 145.8);
            
            this.pass('JSON reading successful');
        } catch (e) {
            this.fail('JSON reading: ' + e.message);
        }
    },
    
    async testXMLReading() {
        console.log('\nTest: XML Reading');
        try {
            const xmlText = `<?xml version="1.0"?>
<root>
    <record>
        <name>ISS</name>
        <frequency>145.800</frequency>
    </record>
</root>`;
            
            const file = new File([xmlText], 'test.xml', { type: 'application/xml' });
            const result = await window.tableReader.readFile(file);
            
            this.assert('Format detected', result.format.includes('XML'));
            this.assert('Headers extracted', result.headers.length > 0);
            this.assert('Data parsed', result.rows.length > 0);
            
            this.pass('XML reading successful');
        } catch (e) {
            this.fail('XML reading: ' + e.message);
        }
    },
    
    // ============================================
    // TEST UTILITIES
    // ============================================
    
    assert(description, condition) {
        if (!condition) {
            throw new Error(`Assertion failed: ${description}`);
        }
    },
    
    pass(message) {
        this.passCount++;
        console.log(`  ✅ PASS: ${message}`);
        this.results.push({ status: 'pass', message });
    },
    
    fail(message) {
        this.failCount++;
        console.log(`  ❌ FAIL: ${message}`);
        this.results.push({ status: 'fail', message });
    },
    
    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${this.passCount + this.failCount}`);
        console.log(`✅ Passed: ${this.passCount}`);
        console.log(`❌ Failed: ${this.failCount}`);
        
        const percentage = this.passCount + this.failCount > 0 
            ? ((this.passCount / (this.passCount + this.failCount)) * 100).toFixed(1)
            : 0;
        
        console.log(`Success Rate: ${percentage}%`);
        
        if (this.failCount === 0) {
            console.log('\n🎉 All tests passed!');
        } else {
            console.log(`\n⚠️  ${this.failCount} test(s) failed`);
        }
        
        console.log('='.repeat(60) + '\n');
    }
};

// Export for global access
window.TestSuite = TestSuite;

// Auto-run on document ready (optional)
document.addEventListener('DOMContentLoaded', () => {
    console.log('Test suite available: TestSuite.runAllTests()');
});

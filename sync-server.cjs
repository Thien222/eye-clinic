const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const {
    mergeSyncMeta,
    applyTombstones,
    mergePatients,
    mergeInventory,
    mergeInvoices,
    sanitizeData
} = require('./sync-helpers.cjs');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.io
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from 'dist' folder (production build)
app.use(express.static(path.join(__dirname, 'dist')));

// Data file path
const DATA_FILE = path.join(__dirname, 'data', 'database.json');
const BACKUP_DIR = path.join(__dirname, 'backups');

// Ensure data and backup directories exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Load data from file
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const content = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(content);
        }
    } catch (e) {
        console.error('Error loading data:', e);
    }
    return {
        patients: [],
        inventory: [],
        invoices: [],
        settings: null,
        syncMeta: { version: 0, lastUpdated: 0, deletedPatientIds: [] }
    };
}

function mergeClinicData(incoming) {
    const data = sanitizeData(incoming);
    const syncMeta = mergeSyncMeta(clinicData.syncMeta, data.syncMeta);
    const deletedSet = new Set(syncMeta.deletedPatientIds);

    const localSettingsTs = clinicData.settings?.settingsUpdatedAt || 0;
    const remoteSettingsTs = data.settings?.settingsUpdatedAt || 0;
    const mergedSettings = remoteSettingsTs >= localSettingsTs
        ? (data.settings || clinicData.settings)
        : (clinicData.settings || data.settings);

    const merged = {
        patients: mergePatients(
            clinicData.patients,
            (data.patients || []).filter(p => !deletedSet.has(p.id)),
            syncMeta.deletedPatientIds
        ),
        inventory: mergeInventory(clinicData.inventory, data.inventory),
        invoices: mergeInvoices(clinicData.invoices, data.invoices),
        settings: mergedSettings || null,
        syncMeta
    };
    clinicData = applyTombstones(merged);
    return clinicData;
}

function persistAndBroadcast(sourceSocket) {
    clinicData = applyTombstones(clinicData);
    clinicData.syncMeta.version = (clinicData.syncMeta.version || 0) + 1;
    clinicData.syncMeta.lastUpdated = Date.now();
    saveData(clinicData);
    const payload = applyTombstones(clinicData);
    if (sourceSocket) {
        sourceSocket.broadcast.emit('data-updated', payload);
    } else {
        io.emit('data-updated', payload);
    }
}

// Save data to file
function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('Error saving data:', e);
        return false;
    }
}

// Get backup directory from settings or use default
function getBackupDir() {
    const customPath = clinicData?.settings?.backup?.path;
    if (customPath) {
        // Ensure directory exists
        if (!fs.existsSync(customPath)) {
            try {
                fs.mkdirSync(customPath, { recursive: true });
            } catch (e) {
                console.log(`[Backup] Cannot create ${customPath}, using default`);
                return BACKUP_DIR;
            }
        }
        return customPath;
    }
    return BACKUP_DIR;
}

// Create backup
function createBackup(reason = 'manual') {
    try {
        const backupDir = getBackupDir();
        const now = new Date();
        const filename = `backup_${now.toISOString().slice(0, 10)}_${now.getHours()}h${now.getMinutes()}m_${reason}.json`;
        const backupPath = path.join(backupDir, filename);

        const backupData = {
            ...clinicData,
            backupTime: now.toISOString(),
            backupReason: reason
        };

        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
        console.log(`[Backup] ✓ Created: ${filename} -> ${backupDir}`);

        const maxFiles = clinicData?.settings?.backup?.maxFiles || 20;
        cleanOldBackups(backupDir, maxFiles);

        return { success: true, filename, path: backupPath };
    } catch (e) {
        console.error('[Backup] Error:', e);
        return { success: false, error: e.message };
    }
}

// Clean old backups
function cleanOldBackups(backupDir, keepCount = 20) {
    try {
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
            .map(f => ({
                name: f,
                path: path.join(backupDir, f),
                time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        if (files.length > keepCount) {
            const toDelete = files.slice(keepCount);
            toDelete.forEach(f => {
                fs.unlinkSync(f.path);
                console.log(`[Backup] Deleted old: ${f.name}`);
            });
        }
    } catch (e) {
        console.error('[Backup] Clean error:', e);
    }
}

// In-memory data store — luôn lọc BN đã xóa khi load
const rawLoaded = loadData();
let clinicData = applyTombstones(sanitizeData(rawLoaded));
if (clinicData.patients.length !== (rawLoaded.patients || []).length) {
    saveData(clinicData);
    console.log('[Sync] Đã dọn BN đã xóa khỏi database.json');
}

// Auto backup every 4 hours
const BACKUP_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
setInterval(() => {
    console.log('[Backup] Auto backup (4h interval)...');
    createBackup('auto_4h');
}, BACKUP_INTERVAL);

// REST API endpoints
app.get('/api/database', (req, res) => {
    res.json(applyTombstones(clinicData));
});

app.post('/api/database', (req, res) => {
    mergeClinicData(req.body);
    persistAndBroadcast(null);
    res.json({ success: true, syncMeta: clinicData.syncMeta });
});

// Xóa BN — ghi ngay vào server (tránh mất khi tắt máy/restart)
app.post('/api/sync/delete-patient/:id', (req, res) => {
    const patientId = req.params.id;
    if (!patientId) return res.status(400).json({ success: false });

    const ids = clinicData.syncMeta.deletedPatientIds || [];
    if (!ids.includes(patientId)) {
        clinicData.syncMeta.deletedPatientIds = [...ids, patientId].slice(-5000);
    }
    clinicData.patients = (clinicData.patients || []).filter(p => p.id !== patientId);
    persistAndBroadcast(null);
    console.log(`[Sync] ✓ Deleted patient ${patientId}, tombstones: ${clinicData.syncMeta.deletedPatientIds.length}`);
    res.json({ success: true, syncMeta: clinicData.syncMeta });
});

// Heartbeat — client gửi định kỳ để đảm bảo server có dữ liệu mới nhất
app.post('/api/sync/heartbeat', (req, res) => {
    if (req.body && req.body.syncMeta) {
        clinicData.syncMeta = mergeSyncMeta(clinicData.syncMeta, req.body.syncMeta);
    }
    if (req.body && req.body.lastUpdated > (clinicData.syncMeta.lastUpdated || 0)) {
        mergeClinicData(req.body);
        persistAndBroadcast(null);
    }
    res.json({ success: true, syncMeta: clinicData.syncMeta, serverTime: Date.now() });
});

// Nạp dữ liệu test
app.post('/api/test-data/load', (req, res) => {
    try {
        const testFile = path.join(__dirname, 'data', 'test-data.json');
        if (!fs.existsSync(testFile)) {
            return res.status(404).json({ success: false, message: 'Chưa có file test-data.json. Chạy: node scripts/generateTestData.js' });
        }
        const data = sanitizeData(JSON.parse(fs.readFileSync(testFile, 'utf8')));
        clinicData = data;
        clinicData = applyTombstones(clinicData);
        clinicData.syncMeta = { version: 0, lastUpdated: Date.now(), deletedPatientIds: [] };
        persistAndBroadcast(null);
        res.json({
            success: true,
            message: `Đã nạp ${data.patients?.length || 0} BN, ${data.inventory?.length || 0} SP kho`,
            data: clinicData
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Serve test-data.json for download
app.get('/data/test-data.json', (req, res) => {
    const testFile = path.join(__dirname, 'data', 'test-data.json');
    if (fs.existsSync(testFile)) {
        res.sendFile(testFile);
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// Backup endpoints
app.get('/api/backup', (req, res) => {
    res.json({
        data: applyTombstones(clinicData),
        timestamp: Date.now(),
        version: '1.0'
    });
});

app.post('/api/backup', (req, res) => {
    try {
        const { data, filename, backupPath } = req.body;

        // Determine backup directory
        let targetDir = BACKUP_DIR;
        if (backupPath && fs.existsSync(backupPath)) {
            targetDir = backupPath;
        } else if (backupPath) {
            // Try to create the directory
            try {
                fs.mkdirSync(backupPath, { recursive: true });
                targetDir = backupPath;
            } catch (e) {
                console.log('[Backup] Cannot create custom path, using default');
            }
        }

        const filePath = path.join(targetDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(2);

        res.json({
            success: true,
            filePath,
            size: `${sizeKB} KB`
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.delete('/api/backup', (req, res) => {
    try {
        const { filePath } = req.body;
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'File not found' });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get backup list
app.get('/api/backups', (req, res) => {
    try {
        const backupPath = req.query.path || BACKUP_DIR;

        if (!fs.existsSync(backupPath)) {
            return res.json({ success: true, files: [] });
        }

        const files = fs.readdirSync(backupPath)
            .filter(f => f.endsWith('.json') && f.startsWith('backup'))
            .map(f => {
                const filePath = path.join(backupPath, f);
                const stats = fs.statSync(filePath);
                return {
                    filename: f,
                    path: filePath,
                    date: stats.mtime.getTime(),
                    size: `${(stats.size / 1024).toFixed(2)} KB`
                };
            })
            .sort((a, b) => b.date - a.date);

        res.json({ success: true, files });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Restore from backup file
app.get('/api/backup/restore', (req, res) => {
    try {
        const filePath = req.query.path;
        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Backup file not found' });
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const data = sanitizeData(JSON.parse(content));

        clinicData = mergeClinicData(sanitizeData(JSON.parse(content)));
        persistAndBroadcast(null);

        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/backup/restore', (req, res) => {
    try {
        const { data } = req.body;
        if (data) {
            clinicData = mergeClinicData(sanitizeData(data));
            persistAndBroadcast(null);
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'No data provided' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Send current data to newly connected client
    socket.emit('data-updated', applyTombstones(clinicData));

    socket.on('data-changed', (data) => {
        console.log(`[Socket] Data received from ${socket.id}`);
        mergeClinicData(data);
        persistAndBroadcast(socket);
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
});

// SPA fallback - serve index.html for all non-API routes
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;

// Create backup on server start
console.log('[Backup] Creating startup backup...');
createBackup('server_start');

// Graceful shutdown with backup
function gracefulShutdown(signal) {
    console.log(`\n[Server] Received ${signal}, shutting down...`);
    console.log('[Backup] Creating shutdown backup...');
    createBackup('server_stop');

    server.close(() => {
        console.log('[Server] Closed successfully');
        process.exit(0);
    });

    // Force exit after 5 seconds
    setTimeout(() => {
        console.log('[Server] Force exit');
        process.exit(0);
    }, 5000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Windows specific
if (process.platform === 'win32') {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('SIGINT', () => gracefulShutdown('SIGINT'));
    rl.on('close', () => gracefulShutdown('close'));
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║  🏥 Eye Clinic Sync Server                           ║
╠══════════════════════════════════════════════════════╣
║  REST API:   http://localhost:${PORT}/api/database          
║  Socket.io:  http://localhost:${PORT}                       
║  Network:    http://0.0.0.0:${PORT}                         
║  Backups:    ${getBackupDir()}
╠══════════════════════════════════════════════════════╣
║  ✓ Auto backup every 4 hours                         ║
║  ✓ Backup on server start/stop                       ║
╚══════════════════════════════════════════════════════╝
    `);
});

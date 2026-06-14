/**
 * Nap du lieu test vao server (can sync-server dang chay port 3001)
 * Chay: node scripts/generateTestData.js && node scripts/loadTestData.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'test-data.json');
const API = process.env.API_URL || 'http://localhost:3001/api/database';

if (!fs.existsSync(DATA_FILE)) {
  console.error('❌ Chua co test-data.json. Chay truoc: node scripts/generateTestData.js');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

const res = await fetch(API, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

if (res.ok) {
  console.log('✅ Da nap du lieu test vao server!');
  console.log(`   ${data.patients.length} BN | ${data.inventory.length} SP | ${data.invoices.length} HD`);
  console.log('   Mo trinh duyet: http://localhost:3001');
} else {
  console.error('❌ Loi:', res.status, await res.text());
  console.log('   Dam bao server dang chay: npm run dev  hoac  release/start.bat');
  process.exit(1);
}


const fs = require('fs');
const path = require('path');

// Configuration
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const ROOT_DIR = path.resolve(__dirname, '..');
const BACKUP_ROOT = path.join(ROOT_DIR, '_backups');

// Read current version
let version = 'unknown';
try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
    version = pkg.version;
} catch (e) {}

const CHECKPOINT_NAME = `v${version}_${TIMESTAMP}`;
const DEST_DIR = path.join(BACKUP_ROOT, CHECKPOINT_NAME);
const LATEST_DIR = path.join(BACKUP_ROOT, 'latest');

// Directories/Files to backup (Whitelist approach for safety)
const INCLUDE_LIST = [
    'src',
    'electron',
    'scripts',
    'public',
    'index.html',
    'package.json',
    'tsconfig.json',
    'tsconfig.node.json',
    'vite.config.ts',
    'vite-env.d.ts',
    'tailwind.config.js',
    'postcss.config.js',
    'metadata.json',
    '.gitignore',
    '.env',
    'README.md'
];

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else if (exists) {
        fs.copyFileSync(src, dest);
    }
}

console.log('--------------------------------------------------');
console.log('🛡️  ISO AUDIT PRO - CREATING SYSTEM CHECKPOINT');
console.log('--------------------------------------------------');
console.log(`📦  Version: ${version}`);
console.log(`📂  Destination: ${DEST_DIR}`);

try {
    if (!fs.existsSync(BACKUP_ROOT)) {
        fs.mkdirSync(BACKUP_ROOT);
    }
    fs.mkdirSync(DEST_DIR);

    let count = 0;
    INCLUDE_LIST.forEach(item => {
        const sourcePath = path.join(ROOT_DIR, item);
        const destPath = path.join(DEST_DIR, item);
        
        if (fs.existsSync(sourcePath)) {
            process.stdout.write(`   - Backing up: ${item}... `);
            copyRecursiveSync(sourcePath, destPath);
            console.log('✅');
            count++;
        } else {
            console.log(`   - Skipping ${item} (Not found)`);
        }
    });

    // Create a manifest file
    const manifest = {
        version,
        timestamp: new Date().toISOString(),
        filesCount: count,
        note: "Baseline Checkpoint created via npm run checkpoint"
    };
    fs.writeFileSync(path.join(DEST_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

    // Update 'latest' pointer (copy content to latest folder for easy reference)
    if (fs.existsSync(LATEST_DIR)) {
        fs.rmSync(LATEST_DIR, { recursive: true, force: true });
    }
    copyRecursiveSync(DEST_DIR, LATEST_DIR);
    console.log(`📌  Updated 'latest' checkpoint reference.`);

    console.log('--------------------------------------------------');
    console.log('✨  CHECKPOINT CREATED SUCCESSFULLY');
    console.log('--------------------------------------------------');

} catch (err) {
    console.error('❌  Checkpoint failed:', err);
    process.exit(1);
}

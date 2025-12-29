
// update_project.js
const fs = require('fs');
const path = require('path');
const convert = require('xml-js');

const UPDATE_FILE = 'update.xml';

try {
  console.log(`Reading update file: ${UPDATE_FILE}...`);
  if (!fs.existsSync(UPDATE_FILE)) {
    throw new Error(`Error: ${UPDATE_FILE} not found. Please save the XML output from the AI to this file.`);
  }

  const xmlData = fs.readFileSync(UPDATE_FILE, 'utf8');
  const jsonData = convert.xml2js(xmlData, { compact: true, cdataKey: 'content' });

  if (!jsonData.changes || !jsonData.changes.change) {
    throw new Error('Invalid XML structure. Could not find <changes> or <change> tags.');
  }

  const changes = Array.isArray(jsonData.changes.change) ? jsonData.changes.change : [jsonData.changes.change];

  console.log(`Found ${changes.length} file(s) to update.`);

  changes.forEach(change => {
    const filePath = change.file._text;
    const description = change.description._text;
    const content = change.content.content;

    if (!filePath || content === undefined) {
      console.warn('Skipping a change due to missing file path or content.');
      return;
    }

    const fullPath = path.resolve(process.cwd(), filePath);
    const dirName = path.dirname(fullPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
      console.log(`Created directory: ${dirName}`);
    }
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated: ${filePath} - ${description}`);
  });

  console.log('\nProject update complete! ✨');

} catch (error) {
  console.error('\n❌ An error occurred:');
  console.error(error.message);
  process.exit(1);
}

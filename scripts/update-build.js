
const fs = require('fs');
const path = require('path');

// Cấu hình đường dẫn file constants
const constantsPath = path.join(__dirname, '../constants.ts');

try {
    // 1. Đọc nội dung hiện tại
    let content = fs.readFileSync(constantsPath, 'utf8');
    
    // 2. Lấy thời gian hiện tại (GMT+7 cho Việt Nam)
    const now = new Date();
    
    // Format: YYYY-MM-DD HH:mm:ss (GMT+7)
    const timeOptions = { 
        timeZone: 'Asia/Ho_Chi_Minh', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
    };
    
    // Format ngày cho Release Note: YYYY-MM-DD
    const dateOptions = {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    };

    // Tạo chuỗi time stamp mới
    const formatter = new Intl.DateTimeFormat('en-CA', timeOptions);
    const parts = formatter.formatToParts(now);
    const part = (name) => parts.find(p => p.type === name).value;
    
    // Construct YYYY-MM-DD HH:mm:ss
    const timestampStr = `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part('second')} (GMT+7)`;
    
    // Construct YYYY-MM-DD
    const dateStr = `${part('year')}-${part('month')}-${part('day')}`;

    console.log('--------------------------------------------------');
    console.log('🚀  ISO AUDIT PRO - AUTO RELEASE MECHANISM');
    console.log('--------------------------------------------------');
    console.log(`⏱️  Current System Time: ${timestampStr}`);
    console.log(`📅  Release Date:        ${dateStr}`);

    // 3. Regex Replacement - Thay thế BUILD_TIMESTAMP
    // Tìm dòng: export const BUILD_TIMESTAMP = "...";
    const timestampRegex = /export const BUILD_TIMESTAMP = ".*";/;
    if (content.match(timestampRegex)) {
        content = content.replace(timestampRegex, `export const BUILD_TIMESTAMP = "${timestampStr}";`);
        console.log('✅  Updated BUILD_TIMESTAMP.');
    } else {
        console.warn('⚠️  Could not find BUILD_TIMESTAMP in constants.ts');
    }

    // 4. Regex Replacement - Thay thế ngày của Release Note ĐẦU TIÊN (Mới nhất)
    // Tìm cụm: version: "...",\n        date: "..." (Chỉ thay cái đầu tiên tìm thấy)
    // Lưu ý: Regex này tìm property date: "..." nằm ngay sau version object
    const releaseDateRegex = /(date:\s*")(\d{4}-\d{2}-\d{2})(")/;
    
    if (content.match(releaseDateRegex)) {
        // Chỉ replace lần xuất hiện đầu tiên (Latest version)
        content = content.replace(releaseDateRegex, `$1${dateStr}$3`);
        console.log(`✅  Updated Latest Release Note Date to [${dateStr}].`);
    } else {
        console.warn('⚠️  Could not update Release Note date (Pattern not found).');
    }

    // 5. Ghi lại file
    fs.writeFileSync(constantsPath, content, 'utf8');
    console.log('--------------------------------------------------');
    console.log('✨  CONSTANTS.TS UPDATED SUCCESSFULLY!');
    console.log('--------------------------------------------------');

} catch (error) {
    console.error('❌  Error updating build info:', error);
    process.exit(1);
}

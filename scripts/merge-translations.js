const fs = require('fs');
const path = require('path');

// 语言代码映射
const languageMap = {
    'en': 'en',
    'chs': 'zhCN',
    'cht': 'zhTW',
    'jp': 'ja',
    'kr': 'ko',
    'de': 'de',
    'es': 'es',
    'fr': 'fr',
    'id': 'id',
    'pt': 'pt',
    'ru': 'ru',
    'th': 'th',
    'vi': 'vi'
};

// 检查文本是否包含HTML标签或换行符
function hasTagsOrNewlines(text) {
    if (typeof text !== 'string') return false;

    // 检查是否包含HTML标签（如<unbreak>、<color>、<i>、<u>、<RUBY_B#xxx>等）
    const hasHtmlTags = /<[^>]*>/g.test(text);

    // 检查是否包含换行符
    const hasNewlines = /\\n|\n/g.test(text);
    const hasSpecialLines = /{/g.test(text);

    return hasHtmlTags || hasNewlines || hasSpecialLines;
}

async function mergeTranslations() {
    const langsDir = path.join(__dirname, '../cache/langs');
    const outputFile = path.join(__dirname, '../translation-dictionary.json');

    try {
        // 读取所有语言文件
        const files = fs.readdirSync(langsDir).filter(file => file.endsWith('.json'));
        console.log('Found language files:', files);

        const translations = {};

        // 读取每个语言文件
        for (const file of files) {
            const langCode = path.basename(file, '.json');
            const mappedLangCode = languageMap[langCode];

            if (!mappedLangCode) {
                console.warn(`Unknown language code: ${langCode}`);
                continue;
            }

            const filePath = path.join(langsDir, file);
            const content = fs.readFileSync(filePath, 'utf8');

            try {
                const data = JSON.parse(content);
                console.log(`Processing ${file}: ${Object.keys(data).length} entries`);

                // 处理每个翻译条目
                for (const [key, value] of Object.entries(data)) {
                    // 跳过包含HTML标签、换行符或特殊字符的内容
                    if (hasTagsOrNewlines(value) || value === '{NICKNAME}' || !value || value.trim().length === 0) {
                        continue;
                    }

                    if (!translations[key]) {
                        translations[key] = {};
                    }

                    translations[key][mappedLangCode] = value.trim();
                }
            } catch (parseError) {
                console.error(`Error parsing ${file}:`, parseError.message);
            }
        }

        // 以英文为主键重新组织数据
        const englishGrouped = {};

        for (const [key, langs] of Object.entries(translations)) {
            // 只处理有英文翻译的条目
            if (langs.en) {
                const englishText = langs.en;

                if (!englishGrouped[englishText]) {
                    englishGrouped[englishText] = {};
                }

                // 合并所有语言到这个英文条目下
                Object.assign(englishGrouped[englishText], langs);
            }
        }

        // 转换为数组格式
        const result = [];
        for (const [englishText, langs] of Object.entries(englishGrouped)) {
            // 只保留至少有2种语言的条目
            if (Object.keys(langs).length >= 2) {
                result.push(langs);
            }
        }

        // 按英文字母排序
        result.sort((a, b) => {
            return a.en.localeCompare(b.en);
        });

        // 写入输出文件
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf8');

        console.log(`\n✅ Translation dictionary created successfully!`);
        console.log(`📁 Output file: ${outputFile}`);
        console.log(`📊 Total entries: ${result.length}`);
        console.log(`🌐 Languages: ${Object.values(languageMap).join(', ')}`);

        // 显示前几个条目作为示例
        console.log('\n📝 Sample entries:');
        result.slice(0, 3).forEach((entry, index) => {
            console.log(`${index + 1}.`, JSON.stringify(entry));
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// 运行脚本
if (require.main === module) {
    mergeTranslations();
}

module.exports = { mergeTranslations }; 
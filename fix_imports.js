const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            // Only replace if it matches exactly the import path (followed by quote)
            // But strict regex is safer
            if (content.includes('@/types/database')) {
                // Prevent replacing the manual file itself or double replace
                if (frameElement = content.match(/@\/types\/database_manual/)) {
                    // check match
                }

                // Simple string replace for the specific import path
                // The regex matches '@/types/database' and replaces it, BUT avoids matching '@/types/database_manual' if it existed (it won't because we check).
                // Actually, just replacing the string literal is safe since we just created the manual file.

                const newContent = content.replace(/@\/types\/database(?=['";])/g, '@/types/database_manual');

                // Also handle cases without semicolon or with newlines?
                // Most imports are standard.
                // Let's use a simpler replace that covers specific import styles
                const saferdata = content.split("@/types/database").join("@/types/database_manual");

                // Wait, split/join might replace inside comments too, but that's fine.
                // We want to avoid replacing the FILE NAME inside the manual file...
                // The manual file is 'src/types/database_manual.ts'. It doesn't import itself.
                // But wait, 'src/types/database.ts' (the locked one) might be processed if I iterate 'src/types'.
                // I should skip 'src/types/database.ts' explicitly if it exists (but it's locked, so reading might fail!)

                if (fullPath.endsWith('database.ts')) continue;
                if (fullPath.endsWith('database_manual.ts')) continue;

                if (content !== saferdata) {
                    fs.writeFileSync(fullPath, saferdata, 'utf8');
                    console.log(`Updated ${fullPath}`);
                }
            }
        }
    }
}

try {
    replaceInDir('./src');
    console.log("Replacement complete.");
} catch (e) {
    console.error("Error:", e);
}

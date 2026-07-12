const fs = require('fs');
const execSync = require('child_process').execSync;

try {
  execSync('npx tsc -b', { stdio: 'pipe' });
} catch (err) {
  const output = err.stdout.toString() + err.stderr.toString();
  const lines = output.split('\n');
  const typeRegex = /(.+\.tsx?)\(\d+,\d+\): error TS1484: '([^']+)' is a type and must be imported using a type-only import/;
  
  lines.forEach(line => {
    const match = line.match(typeRegex);
    if (match) {
      const file = match[1];
      const typeName = match[2];
      console.log(`Fixing ${typeName} in ${file}`);
      let content = fs.readFileSync(file, 'utf8');
      
      // Basic heuristic: replace `import { ..., TypeName, ... }` with `import type {` if there's only one, or move it to a type import.
      // Easiest is just replace `import { ${typeName} ` with `import type { ${typeName} ` if it's the only one.
      // But a better way: replace `import { ` with `import type { ` globally in the line that contains typeName.
      
      const fileLines = content.split('\n');
      for (let i = 0; i < fileLines.length; i++) {
        if (fileLines[i].includes(`import `) && fileLines[i].includes(typeName)) {
           if (!fileLines[i].includes('import type')) {
             fileLines[i] = fileLines[i].replace('import {', 'import type {');
           }
        }
      }
      fs.writeFileSync(file, fileLines.join('\n'));
    }
  });
}

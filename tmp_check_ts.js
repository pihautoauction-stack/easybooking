const fs = require('fs');
const ts = require('typescript');

const fileName = 'src/components/dashboard/ServicesTab.tsx';
const sourceText = fs.readFileSync(fileName, 'utf8');

const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
);

const diagnostics = sourceFile.parseDiagnostics;
if (diagnostics.length > 0) {
    console.log("Syntax errors:");
    diagnostics.forEach(d => {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(d.start);
        console.log(`Line ${line + 1}, Col ${character + 1}: ${d.messageText}`);
    });
} else {
    console.log("No syntax errors found by TypeScript parser!");
}

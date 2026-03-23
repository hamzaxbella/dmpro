import { Project, SyntaxKind } from 'ts-morph';

const project = new Project({ tsConfigFilePath: "tsconfig.json" });
const files = project.getSourceFiles(["app/**/*.ts", "app/**/*.tsx", "lib/**/*.ts", "!lib/db.ts"]);

for (const sourceFile of files) {
  let changed = false;
  
  // Find all property accesses like `.all`, `.get`, `.run`
  const propAccesses = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression).reverse();
  for (const prop of propAccesses) {
    const name = prop.getName();
    if (['all', 'get', 'run'].includes(name)) {
      const parent = prop.getParent();
      // Only modify if it's a call expression like `.all()` or `.get(...)` 
      if (parent && parent.getKind() === SyntaxKind.CallExpression) {
         // See if it is un-awaited already
         const parentOfCall = parent.getParent();
         // prevent double await
         if (parentOfCall && parentOfCall.getKind() !== SyntaxKind.AwaitExpression && parentOfCall.getKind() !== SyntaxKind.ParenthesizedExpression) {
            
            try {
                parent.replaceWithText(`(await ${parent.getText()})`);
                changed = true;

                // Walk up to make function async
                let current = parent;
                while (current) {
                if ([SyntaxKind.FunctionDeclaration, SyntaxKind.ArrowFunction, SyntaxKind.FunctionExpression].includes(current.getKind())) {
                    const funcNodes = [
                    current.asKind(SyntaxKind.FunctionDeclaration),
                    current.asKind(SyntaxKind.ArrowFunction),
                    current.asKind(SyntaxKind.FunctionExpression)
                    ].filter(Boolean);
                    if (funcNodes[0] && !funcNodes[0].isAsync()) {
                    funcNodes[0].setIsAsync(true);
                    }
                    break;
                }
                current = current.getParent();
                }
            } catch(e) {}
         }
      }
    }
  }

  if (changed) {
    sourceFile.saveSync();
    console.log("Updated", sourceFile.getFilePath());
  }
}

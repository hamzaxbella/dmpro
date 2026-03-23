import { Project, SyntaxKind, CallExpression } from 'ts-morph';

const project = new Project({ tsConfigFilePath: "tsconfig.json" });

const files = project.getSourceFiles(["app/**/*.ts", "app/**/*.tsx", "lib/**/*.ts"]);

for (const sourceFile of files) {
  let changed = false;

  // Find all CallExpressions like db.prepare(...).all(), db.prepare(...).run(), db.prepare(...).get()
  const callExprs = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).reverse();
  
  for (const call of callExprs) {
    const expr = call.getExpression();
    if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
      const propAccess = expr.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
      const name = propAccess.getName();
      const parentExpr = propAccess.getExpression();

      if (['all', 'get', 'run'].includes(name)) {
        if (parentExpr.getKind() === SyntaxKind.CallExpression) {
          const innerCall = parentExpr.asKindOrThrow(SyntaxKind.CallExpression);
          const innerExpr = innerCall.getExpression();
          if (innerExpr.getText() === 'db.prepare') {
            const sqlArg = innerCall.getArguments()[0].getText();
            const methodArgs = call.getArguments().map(a => a.getText());
            const argsStr = methodArgs.length > 0 ? `, args: [${methodArgs.join(', ')}]` : '';
            
            let replacement = '';
            if (name === 'all') {
              replacement = `(await db.execute(${argsStr ? `{ sql: ${sqlArg}${argsStr} }` : sqlArg})).rows`;
            } else if (name === 'get') {
              replacement = `(await db.execute(${argsStr ? `{ sql: ${sqlArg}${argsStr} }` : sqlArg})).rows[0]`;
            } else if (name === 'run') {
              replacement = `(await db.execute(${argsStr ? `{ sql: ${sqlArg}${argsStr} }` : sqlArg}))`;
            }
            
            // Hack to make containing function async
            let current = call.getParent();
            while (current) {
              if (current.getKind() === SyntaxKind.FunctionDeclaration || 
                  current.getKind() === SyntaxKind.ArrowFunction || 
                  current.getKind() === SyntaxKind.FunctionExpression) {
                const func = current.asKind(SyntaxKind.FunctionDeclaration) || 
                             current.asKind(SyntaxKind.ArrowFunction) || 
                             current.asKind(SyntaxKind.FunctionExpression);
                if (func && !func.isAsync()) {
                  func.setIsAsync(true);
                }
                break; // Just the closest containing function
              }
              current = current.getParent();
            }

            call.replaceWithText(replacement);
            changed = true;
          }
        } else if (parentExpr.getKind() === SyntaxKind.Identifier) {
           // For cached prepared statements like `const findLead = db.prepare(...); findLead.get(id);`
           // That is much harder, but let's see.
        }
      }
    }
  }

  if (changed) {
    sourceFile.saveSync();
    console.log("Updated", sourceFile.getFilePath());
  }
}

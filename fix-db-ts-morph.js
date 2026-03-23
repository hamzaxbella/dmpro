"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_morph_1 = require("ts-morph");
var project = new ts_morph_1.Project({ tsConfigFilePath: "tsconfig.json" });
var files = project.getSourceFiles(["app/**/*.ts", "app/**/*.tsx", "lib/**/*.ts"]);
for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
    var sourceFile = files_1[_i];
    var changed = false;
    // Find all CallExpressions like db.prepare(...).all(), db.prepare(...).run(), db.prepare(...).get()
    var callExprs = sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.CallExpression);
    for (var _a = 0, callExprs_1 = callExprs; _a < callExprs_1.length; _a++) {
        var call = callExprs_1[_a];
        var expr = call.getExpression();
        if (expr.getKind() === ts_morph_1.SyntaxKind.PropertyAccessExpression) {
            var propAccess = expr.asKindOrThrow(ts_morph_1.SyntaxKind.PropertyAccessExpression);
            var name_1 = propAccess.getName();
            var parentExpr = propAccess.getExpression();
            if (['all', 'get', 'run'].includes(name_1)) {
                if (parentExpr.getKind() === ts_morph_1.SyntaxKind.CallExpression) {
                    var innerCall = parentExpr.asKindOrThrow(ts_morph_1.SyntaxKind.CallExpression);
                    var innerExpr = innerCall.getExpression();
                    if (innerExpr.getText() === 'db.prepare') {
                        var sqlArg = innerCall.getArguments()[0].getText();
                        var methodArgs = call.getArguments().map(function (a) { return a.getText(); });
                        var argsStr = methodArgs.length > 0 ? ", args: [".concat(methodArgs.join(', '), "]") : '';
                        var replacement = '';
                        if (name_1 === 'all') {
                            replacement = "(await db.execute(".concat(argsStr ? "{ sql: ".concat(sqlArg).concat(argsStr, " }") : sqlArg, ")).rows");
                        }
                        else if (name_1 === 'get') {
                            replacement = "(await db.execute(".concat(argsStr ? "{ sql: ".concat(sqlArg).concat(argsStr, " }") : sqlArg, ")).rows[0]");
                        }
                        else if (name_1 === 'run') {
                            replacement = "(await db.execute(".concat(argsStr ? "{ sql: ".concat(sqlArg).concat(argsStr, " }") : sqlArg, "))");
                        }
                        // Hack to make containing function async
                        var current = call.getParent();
                        while (current) {
                            if (current.getKind() === ts_morph_1.SyntaxKind.FunctionDeclaration ||
                                current.getKind() === ts_morph_1.SyntaxKind.ArrowFunction ||
                                current.getKind() === ts_morph_1.SyntaxKind.FunctionExpression) {
                                var func = current.asKind(ts_morph_1.SyntaxKind.FunctionDeclaration) ||
                                    current.asKind(ts_morph_1.SyntaxKind.ArrowFunction) ||
                                    current.asKind(ts_morph_1.SyntaxKind.FunctionExpression);
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
                }
                else if (parentExpr.getKind() === ts_morph_1.SyntaxKind.Identifier) {
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

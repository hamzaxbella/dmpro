const fs = require('fs');
const files = [
"app/board/page.tsx",
"app/api/analytics/route.ts",
"app/api/settings/route.ts",
"app/api/webhook/route.ts",
"app/api/reminders/route.ts",
"app/api/leads/[id]/route.ts",
"app/api/leads/[id]/status/route.ts",
"app/api/leads/[id]/ignore/route.ts",
"app/api/leads/route.ts",
"app/api/crm/leads/route.ts",
"app/api/crm/leads/reply/route.ts",
"lib/cron.ts"
];

for(const file of files) {
  if(!fs.existsSync(file)) continue;
  let txt = fs.readFileSync(file, 'utf8');

  // Regex replacement for multi-line queries inside db.prepare
  const regexPrepareAll = /db\.prepare\(([`'"])([^]*?)([`'"])\)\.all\(\)/g;
  txt = txt.replace(regexPrepareAll, '(await db.execute($1$2$3)).rows');

  const regexPrepareGetNoArgs = /db\.prepare\(([`'"])([^]*?)([`'"])\)\.get\(\)/g;
  txt = txt.replace(regexPrepareGetNoArgs, '(await db.execute($1$2$3)).rows[0]');

  const regexPrepareGetWithArgs = /db\.prepare\(([`'"])([^]*?)([`'"])\)\.get\((.*?)\)/g;
  txt = txt.replace(regexPrepareGetWithArgs, '(await db.execute({ sql: $1$2$3, args: [$4] })).rows[0]');

  const regexPrepareRunWithArgs = /db\.prepare\(([`'"])([^]*?)([`'"])\)\.run\((.*?)\)/g;
  txt = txt.replace(regexPrepareRunWithArgs, '(await db.execute({ sql: $1$2$3, args: [$4] }))');

  const regexPrepareRunNoArgs = /db\.prepare\(([`'"])([^]*?)([`'"])\)\.run\(\)/g;
  txt = txt.replace(regexPrepareRunNoArgs, '(await db.execute($1$2$3))');

  // Handle cached prepared statements
  // const findByName = db.prepare(`SELECT ...`); findByName.get(arg) -> findByName({ args: [arg] }); ?? No.
  fs.writeFileSync(file, txt);
}

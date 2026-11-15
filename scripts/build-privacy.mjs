import fs from 'fs';
const src = fs.readFileSync('src/features/legal/privacy.ts','utf8');
const updated = src.match(/PRIVACY_UPDATED = '([^']+)'/)[1];
const arr = src.slice(src.indexOf('PRIVACY_SECTIONS'));
const body = arr.slice(arr.indexOf('= [')+2, arr.lastIndexOf('];')+1);
const sections = eval(body);
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Liftmark · Privacy policy</title>
<style>
  :root { color-scheme: light dark; --bg:#F2F3EE; --card:#fff; --text:#121316; --muted:#5B5F66; --accent:#4E7A00; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0E0F12; --card:#1A1C21; --text:#F4F5F0; --muted:#9A9EA6; --accent:#C6F432; } }
  body { margin:0; background:var(--bg); color:var(--text); font:16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main { max-width:680px; margin:0 auto; padding:48px 20px 64px; }
  h1 { font-size:40px; letter-spacing:-1px; margin:0 0 4px; }
  .date { color:var(--muted); font-size:14px; margin:0 0 32px; }
  h2 { font-size:19px; margin:32px 0 8px; }
  p { color:var(--muted); margin:0 0 10px; }
  .lead { background:var(--card); border-radius:16px; padding:4px 20px 12px; }
  .lead p { color:var(--text); }
  a { color:var(--accent); font-weight:700; }
</style>
</head>
<body>
<main>
<h1>Liftmark privacy policy</h1>
<p class="date">Last updated ${updated}</p>
${sections.map((s,i)=>`<section${i===0?' class="lead"':''}>
<h2>${esc(s.title)}</h2>
${s.body.map(p=>`<p>${esc(p)}</p>`).join('\n')}
</section>`).join('\n')}
<p style="margin-top:32px"><a href="https://github.com/borkangole/Repster---Your-progress-partner/issues">Contact via GitHub</a></p>
</main>
</body>
</html>
`;
fs.writeFileSync('docs/privacy.html', html);

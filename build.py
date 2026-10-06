from pathlib import Path
import zipfile

p = Path(__file__).resolve().parent
html = (p / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + (p / 'style.css').read_text() + '</style>')
for name in ['engine.js', 'animation.js', 'audio.js', 'view.js', 'app.js']:
    html = html.replace('<script src="' + name + '"></script>', '<script>' + (p / name).read_text().replace('</script', '<\\/script') + '</script>')
(p / 'yakumo-no-tachi.html').write_text(html)
with zipfile.ZipFile(p.parent / 'yakumo-no-tachi.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for name in ['index.html', 'style.css', 'engine.js', 'animation.js', 'audio.js', 'view.js', 'app.js', 'yakumo-no-tachi.html', 'build.py', 'README.md', 'test-game.js']:
        if (p / name).is_file():
            z.write(p / name, 'susanoo-orochi/' + name)
print('Built yakumo-no-tachi.html and /workspace/yakumo-no-tachi.zip')

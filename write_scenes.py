
with open('public/js/scenes.js', 'w', encoding='utf-8') as f:
    fetch_code = open('public/js/scenes.js', 'r', encoding='utf-8', errors='replace').read()
    print('Scenes length:', len(fetch_code))

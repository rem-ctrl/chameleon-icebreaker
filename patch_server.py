
with open('server.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('      imagData: sub.imagData,\n      duration: guessDuration\n-   });', '      imageData: sub.imageData,\n      duration: guessDuration\n    });')
text = text.replace("Spot ' + sub.artistName + ''s hidden figure!", "Spot ' + sub.artistName + '\'s hidden figure!")
text = text.replace("room.state = 'PO\n  DIUM';\n    ", "")

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('server.js patched successfully!')

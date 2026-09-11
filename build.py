import sys, base64
act, fn, data = sys.argv[1], sys.argv[2], sys.argv[3]
mode = 'wb' if act == 'new' else 'ab'
with open(fn, mode) as f:
    f.write(base64.b64decode(data))
print(act, fn, 'ok')

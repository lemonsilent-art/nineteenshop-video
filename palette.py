# 商品配色：python palette.py 去背.png → 印出 JSON 主色／副色（色相），影片字的顏色跟著商品變
import sys, json, colorsys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGBA'); im.thumbnail((200, 200))
px = [p for p in im.getdata() if p[3] > 200]
bins = {}
for r, g, b, a in px:
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if s < 0.35 or l < 0.15 or l > 0.85: continue
    k = int(h * 24) % 24
    bins.setdefault(k, []).append((h, l, s))
rank = sorted(bins.items(), key=lambda kv: -len(kv[1]))
def avg(v): return [sum(x[i] for x in v) / len(v) for i in range(3)]
out = {}
if rank:
    h1 = avg(rank[0][1])[0] * 360; out['h1'] = round(h1)
    for k, v in rank[1:]:
        h2 = avg(v)[0] * 360
        if min(abs(h2 - h1), 360 - abs(h2 - h1)) > 40 and len(v) > len(px) * 0.01: out['h2'] = round(h2); break
print(json.dumps(out))

# 商品照片去背：python cutout.py in1 out1.png in2 out2.png ...
# 每張印一行 JSON：{"out": "...", "ok": true, "frac": 0.42}（frac＝商品佔畫面多少，太小或太大就不用去背的版本）
import sys, json
try:
    from rembg import remove, new_session
    from PIL import Image
    sess = new_session('u2net')
except Exception as e:
    for i in range(1, len(sys.argv), 2):
        print(json.dumps({"out": sys.argv[i + 1], "ok": False, "err": str(e)[:200]}), flush=True)
    sys.exit(0)
args = sys.argv[1:]
for i in range(0, len(args), 2):
    src, dst = args[i], args[i + 1]
    try:
        im = Image.open(src).convert('RGB')
        im.thumbnail((1400, 1400))
        out = remove(im, session=sess)
        a = out.getchannel('A')
        hist = a.histogram()
        fg = sum(hist[128:]) / float(im.size[0] * im.size[1])
        bbox = a.point(lambda v: 255 if v > 128 else 0).getbbox()
        if bbox:
            out = out.crop(bbox)
        out.save(dst)
        print(json.dumps({"out": dst, "ok": 0.06 < fg < 0.9, "frac": round(fg, 3)}), flush=True)
    except Exception as e:
        print(json.dumps({"out": dst, "ok": False, "err": str(e)[:200]}), flush=True)

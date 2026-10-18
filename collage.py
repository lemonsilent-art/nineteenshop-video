# 19號舖子：FB 社團「分類合輯」的拼圖封面（1200×630，FB 連結預覽最大張）
# 跟小幫手拿今天的社團計畫 → 每篇還沒做過的就下載前 8 張商品圖拼成一張 → site/g/<編號>.jpg（GitHub Pages）
import io, json, os, sys, time, urllib.request
cfg = json.load(open('config.json', encoding='utf-8'))
PLAN = 'https://nineteenshopa.vercel.app/api/groupplan'
OUT = os.path.join('site', 'g')
os.makedirs(OUT, exist_ok=True)
# 舊的（10 天前）刪掉
for f in os.listdir(OUT):
    p = os.path.join(OUT, f)
    if time.time() - os.path.getmtime(p) > 10 * 86400: os.remove(p)

def get(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=40) as r:
        b = r.read()
    return b if binary else json.loads(b.decode('utf-8'))

try:
    plan = get(PLAN)
except Exception as e:
    print('拿不到計畫', e); sys.exit(0)
todo = [p for p in plan.get('posts', []) if p.get('imgs') and not os.path.exists(os.path.join(OUT, p['id'] + '.jpg'))]
if len(sys.argv) > 1 and sys.argv[1] == '--check':
    print(len(todo)); sys.exit(0)
if not todo:
    print('沒有要做的拼圖'); sys.exit(0)

from PIL import Image, ImageDraw, ImageFont, ImageOps
FONT = None
for f in ['/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc']:
    if os.path.exists(f): FONT = f; break
def font(sz):
    return ImageFont.truetype(FONT, sz) if FONT else ImageFont.load_default()

W, H, TOP = 1200, 630, 108
for p in todo:
    imgs = []
    for u in p['imgs'][:8]:
        try: imgs.append(Image.open(io.BytesIO(get(u, True))).convert('RGB'))
        except Exception as e: print('圖片下載失敗', p['id'], e)
    if not imgs: continue
    can = Image.new('RGB', (W, H), (253, 241, 236))
    d = ImageDraw.Draw(can)
    n = len(imgs)
    cols = 4 if n >= 5 else n
    rows = 2 if n >= 5 else 1
    gap = 8
    cw = (W - gap * (cols + 1)) // cols
    ch = (H - TOP - gap * (rows + 1)) // rows
    for i, im in enumerate(imgs[: cols * rows]):
        r, c = divmod(i, cols)
        tile = ImageOps.fit(im, (cw, ch), Image.LANCZOS)
        can.paste(tile, (gap + c * (cw + gap), TOP + gap + r * (ch + gap)))
    title = p.get('title', '')
    d.rectangle([0, 0, W, TOP], fill=(232, 130, 154))
    d.text((32, 22), title, font=font(46), fill=(255, 255, 255))
    d.text((W - 32, 34), '19號舖子', font=font(34), fill=(255, 241, 245), anchor='ra')
    can.save(os.path.join(OUT, p['id'] + '.jpg'), quality=86)
    print('✅ 拼圖', p['id'], title, n)

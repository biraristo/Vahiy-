"""Şamile veritabanı ZIP'ini (13 GB) diske indirmeden akış hâlinde okur.
Sunucu uzak aralık isteklerine tam dosya döndürdüğü için ZIP baştan sona tek akışta çözülür.
Kullanım: python3 shamela_stream.py list            → üye listesi (ad, boyut) /home/claude/lib/shamela/liste.tsv
          python3 shamela_stream.py extract REGEX   → adı REGEX'e uyan üyeleri /home/claude/lib/shamela/x/ altına çıkarır"""
import sys, struct, zlib, subprocess, re, os
URL = 'https://dev.shamela.ws/downloads/shamela-database-1448.zip'
OUT = '/home/claude/lib/shamela'
mode = sys.argv[1]
pat = re.compile(sys.argv[2]) if len(sys.argv) > 2 else None
start = sys.argv[3] if len(sys.argv) > 3 else '0'
p = subprocess.Popen(['curl', '-s', '--max-time', '7200', '-r', f'{start}-', URL], stdout=subprocess.PIPE, bufsize=1 << 20)
src = p.stdout
buf = bytearray()
def need(n):
    while len(buf) < n:
        c = src.read(1 << 20)
        if not c: raise EOFError
        buf.extend(c)
def take(n):
    need(n); d = bytes(buf[:n]); del buf[:n]; return d
lst = open(f'{OUT}/liste.tsv', 'w') if mode == 'list' else None
n = 0
try:
    while True:
        sig = take(4)
        if sig != b'PK\x03\x04':
            break  # merkez dizine gelindi
        ver, flag, meth, mt, md, crc, csz, usz, nl, xl = struct.unpack('<HHHHHIIIHH', take(26))
        name = take(nl).decode('utf8', 'replace'); extra = take(xl)
        if csz == 0xFFFFFFFF or usz == 0xFFFFFFFF:
            i = 0
            while i + 4 <= len(extra):
                hid, hl = struct.unpack('<HH', extra[i:i + 4])
                if hid == 1:
                    vals = extra[i + 4:i + 4 + hl]; k = 0
                    if usz == 0xFFFFFFFF: usz = struct.unpack('<Q', vals[k:k + 8])[0]; k += 8
                    if csz == 0xFFFFFFFF: csz = struct.unpack('<Q', vals[k:k + 8])[0]; k += 8
                i += 4 + hl
        want = pat is not None and pat.search(name) is not None and not name.endswith('/')
        f = None
        if want:
            path = f'{OUT}/x/{name}'; os.makedirs(os.path.dirname(path), exist_ok=True); f = open(path, 'wb')
        size_out = 0
        if flag & 8:  # boyut veri tanımlayıcısında; deflate akışının sonunu çöz
            d = zlib.decompressobj(-15)
            while not d.eof:
                need(1); chunk = bytes(buf); buf.clear()
                o = d.decompress(chunk); size_out += len(o)
                if f: f.write(o)
                if d.eof: buf.extend(d.unused_data)
            need(4)
            if bytes(buf[:4]) == b'PK\x07\x08': take(4)
            take(20 if ver >= 45 else 12)
        else:
            if meth == 8:
                d = zlib.decompressobj(-15); left = csz
                while left:
                    c = take(min(left, 1 << 22)); left -= len(c)
                    if f: o = d.decompress(c); f.write(o); size_out += len(o)
                if f: f.write(d.flush())
            else:
                left = csz
                while left:
                    c = take(min(left, 1 << 22)); left -= len(c)
                    if f: f.write(c)
            size_out = usz
        if f: f.close()
        if lst: lst.write(f'{name}\t{size_out}\t{csz}\n')
        n += 1
        if n % 2000 == 0: print(n, name, flush=True)
except EOFError:
    pass
p.kill()
print('üye', n, flush=True)

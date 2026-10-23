"""Uzak ZIP dosyasını HTTP Range istekleriyle okuyan dosya nesnesi (tamamını indirmeden üye çıkarma)."""
import io, urllib.request
UA = {'User-Agent': 'vahiy-plus-plus kisisel arastirma (curl uyumlu)'}
class HttpFile(io.RawIOBase):
    def __init__(self, url, block=1 << 20):
        self.url = url; self.pos = 0; self.block = block; self.cache = {}
        import subprocess, re
        h = subprocess.run(['curl', '-sI', '--max-time', '60', url], capture_output=True).stdout.decode()
        self.size = int(re.findall(r'(?i)content-length:\s*(\d+)', h)[-1])
    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos
    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.size + off
        return self.pos
    def _get(self, a, b):
        import subprocess
        for t in range(5):
            r = subprocess.run(['curl', '-s', '--max-time', '300', '-r', f'{a}-{b - 1}', self.url], capture_output=True)
            if len(r.stdout) == b - a: return r.stdout
        raise IOError(f'aralık okunamadı {a}-{b}')
    def read(self, n=-1):
        if n < 0: n = self.size - self.pos
        n = min(n, self.size - self.pos)
        if n <= 0: return b''
        if n > self.block:
            d = self._get(self.pos, self.pos + n); self.pos += n; return d
        bi = self.pos // self.block
        out = b''
        while len(out) < n:
            if bi not in self.cache:
                if len(self.cache) > 32: self.cache.clear()
                a = bi * self.block; self.cache[bi] = self._get(a, min(a + self.block, self.size))
            blk = self.cache[bi]; off = self.pos - bi * self.block
            take = blk[off:off + n - len(out)]; out += take; self.pos += len(take); bi += 1
            if not take: break
        return out
    def readinto(self, b):
        d = self.read(len(b)); b[:len(d)] = d; return len(d)

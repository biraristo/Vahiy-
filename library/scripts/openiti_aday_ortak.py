"""OpenITI ve Şâmile içerik karşılaştırması için ortak normalleştirme ve imza (openiti_aday.py ile aynı)."""
import re, hashlib
def norm(t):
    t = re.sub(r'[ً-ْٰـ]', '', t); t = re.sub('[أإآٱ]', 'ا', t).replace('ة', 'ه').replace('ى', 'ي')
    return re.sub(r'[^ء-يپچگکی ]+', ' ', t).split()
def imza(ws):
    return sorted({int(hashlib.md5(' '.join(ws[i:i + 5]).encode()).hexdigest()[:12], 16) for i in range(0, max(0, len(ws) - 5))})[:400]

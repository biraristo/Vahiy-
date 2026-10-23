"""Katman 2 eser kaydında kaynağın vermediği vefat/dönem bilgisini tamamlar.
Vefat yılları yalnızca iyi bilinen müellifler için girilir; çağdaş kurum/heyet eserleri 'modern' sayılır, vefat boş kalır."""
import json
P = '/home/claude/vahiy-/site/data/k2/eserler.json'
VEFAT = {'qp27758': 161, 'qp27760': 330, 'qp2919': 468, 'qp160': 1442, 'qp521': 1442, 'qul-al-jadwal-fi-i-rab-al-quran': 1376, 'qp320': 1392}
MUELLIF = {'qp2919': 'الواحدي'}
CAGDAS = ['qp10', 'qp2003', 'qp2012', 'qp2013', 'qp305', 'qp32', 'qp361', 'qp409', 'qp503', 'qp54', 'qp180', 'qp316', 'qp460',
          'qul-al-qira-at-al-mawsoo-ah-al-qur-aniyyah', 'qul-mawsoo-at-al-tafsir-al-ma-thoor', 'qul-alrab-al-quran-li-da-as', 'qul-al-i-rab-al-muyassar',
          'qul-tahlil-kalimat-al-qur-an', 'qul-al-muyassar-fi-al-gharib', 'qul-tadabbur-wa-amal', 'qul-turkish-mokhtasar']
def donem(y):
    return 'erken' if y <= 310 else 'klasik' if y <= 656 else 'orta' if y <= 922 else 'osmanli' if y <= 1342 else 'modern'
d = json.load(open(P)); E = d['eserler']
for k, y in VEFAT.items():
    if k in E and not E[k].get('vefat'):
        E[k].update(vefat=y, donem=donem(y), vefat_kaynagi='elle (bilinen vefat yılı)')
for k, m in MUELLIF.items():
    if k in E and not E[k].get('muellif'):
        E[k]['muellif'] = m
for k in CAGDAS:
    if k in E and E[k]['donem'] == 'belirsiz':
        E[k].update(donem='modern', vefat_kaynagi='çağdaş eser (vefat yılı yok)')
json.dump(d, open(P, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
import collections; print(collections.Counter(v['donem'] for v in E.values()))

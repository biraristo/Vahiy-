import json,re,collections
d=json.load(open('cc.json'))
TANAH={'Genesis':'Tekvin','Exodus':'Çıkış','Leviticus':'Levililer','Numeri':'Sayılar','Deuteronomium':'Tesniye','Richter':'Hâkimler','1 Samuel':'1. Samuel','2 Samuel':'2. Samuel','1 Könige':'1. Krallar','2 Könige':'2. Krallar','1 Chronik':'1. Tarihler','Esther':'Ester','Hiob':'Eyüp','Psalm':'Mezmurlar','Sprüche':'Süleyman’ın Özdeyişleri','Kohelet':'Vaiz','Jesaja':'Yeşaya','Jeremia':'Yeremya','Ezechiel':'Hezekiel','Hebräische Bibel, Ezechiel':'Hezekiel','Daniel':'Daniel','Hosea':'Hoşea','Jona':'Yunus','Zefanja':'Sefanya','Sacharja':'Zekeriya'}
NT={'Matthäus':'Matta','Markus':'Markos','Lukas':'Luka','Johannes':'Yuhanna','Apostelgeschichte':'Elçilerin İşleri','Brief an die Römer':'Romalılar','1. Brief an die Korinther':'1. Korintliler','2. Brief an die Korinther':'2. Korintliler','Brief an die Galater':'Galatyalılar','Brief an die Philipper':'Filipililer','Philipper':'Filipililer','Brief an die Kolosser':'Koloseliler','1. Brief an die Thessaloniker':'1. Selanikliler','1. Brief an Timotheus':'1. Timoteos','Hebräerbrief':'İbraniler','Jakobusbrief':'Yakup','1. Petrusbrief':'1. Petrus','2. Petrusbrief':'2. Petrus','Offenbarung des Johannes':'Yuhanna’nın Vahyi'}
def kitapsec(t,M):
    for k in sorted(M,key=len,reverse=True):
        if re.match(re.escape(k)+r'[ ,]\s*\d',t) or t==k or re.match(re.escape(k)+r' \d',t): return k
def sinif(x):
    t=x['baslik']; L=x['dil'] or x['dil_ad']
    if (k:=kitapsec(t,TANAH)) and 'Targum' not in t and 'Vulgata' not in t: return 'yahudi','tanah',TANAH[k]+t[len(k):]
    if (k:=kitapsec(t,NT)): return 'hristiyan','yeniahit',NT[k]+t[len(k):]
    if re.search(r'Talmud|Mischna|Rabba|Midrash|Targum|Tanchuma',t): return 'yahudi','rabbani',None
    if re.search(r'Jubiläen|Henoch|Baruch|Apokalypse Abrahams|Adams und Evas|Apokalypse des Mose|Testamente der zwölf|Sirach|Judith|Weisheit Salomos|Psalmen Salomos|4 Esra|Liber Antiquitatum|Himmelfahrt Jesajas',t): return 'yahudi','apokrif',None
    if re.match(r'De (Abrahamo|Decalogo|Vita Mosis|opificio|specialibus)|Jüdische Alt|Der Jüdische Krieg',t): return 'yahudi','helenistik',None
    if re.search(r'Jüdische Liturgie|Schema Yisrael|Yehuda Yakkuf|Synagoge',t): return 'yahudi','liturji',None
    if re.search(r'Protevangelium|Kindheitsevangelium|Pseudo-Matthäus|Visio Pauli|Apokalypse des heiligen Johannes|Lebensgeschichte der Gottesmutter|Leben des Heiligen Clemens',t): return 'hristiyan','apokrif',None
    if re.search(r'Gebet|Hymne|Liturgie|Glaubensbekenntnis|Doxologie|Stundengebet|Fürbitte|Lobpreis|Anacreontica|Vulgata',t): return 'hristiyan','liturji',None
    if re.search(r'Ardā|Dādestān|Hādōxt|Vīdēvdād|Yasna|Yašt|Pahlavi',t) or L in('pal','Awestisch'): return 'iran','zerdust',None
    if re.search(r'Mani|Sogdisch',t) or L=='sog': return 'iran','maniheist',None
    if re.search(r'Paikuli|Mešgīn|Sasanidische',t): return 'iran','yazit',None
    if re.search(r'Altarabisch|Gedicht Nr|Schulthess|Muʿallaqa|ʿAbīd',t): return 'arap','siir',None
    if re.search(r'arabische Inschrift|Abraha|Abū Yaʿfūr',t) or L in('xna','Altnordarabisch'): return 'arap','yazit',None
    if re.search(r'Inanna|Tell Fekheriye',t) or L=='sux': return 'antik','mezopotamya',None
    if re.search(r'Platon|De Iside|Galen|Geschichte \(Historiae\)|Periplus|Strategikon|Historia Alexandri|Tetradrachme|Byzantinische Silbermünze|Palmyrenische|Chronographia',t): return 'antik','yunanroma',None
    if L in('heb','arc'): return 'yahudi','diger',None
    return 'hristiyan','patristik',None
c=collections.Counter(); rest=collections.defaultdict(list)
for x in d:
    g,a,tr=sinif(x); x['gelenek'],x['alt']=g,a; x['ad']=tr or x['baslik']; c[(g,a)]+=1
    if not tr: rest[(g,a)].append((x['baslik'],x['dil'] or x['dil_ad']))
for k,v in sorted(c.items()): print(k,v)
for k in rest:
  if k[1] in('patristik','diger','liturji'): print(k, rest[k])
json.dump(d,open('cc2.json','w'),ensure_ascii=False)

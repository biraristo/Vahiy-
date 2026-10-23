// Şamile Lucene dizinindeki saklı alanları (stored fields) okur; yalnız .si/.fnm/.fdt/.fdx/.fdm dosyaları gerekir
// (postings dosyaları olmadan). Her belge bir JSON satırı olarak yazılır.
// Kullanım: java -cp lucene-core.jar:. DumpStored <dizin> <çıktı.jsonl>
import org.apache.lucene.codecs.*;
import org.apache.lucene.index.*;
import org.apache.lucene.store.*;
import java.nio.file.*;
import java.io.*;
import java.util.*;
import org.apache.lucene.util.Bits;

public class DumpStored {
  static String esc(String s) {
    StringBuilder b = new StringBuilder();
    for (char c : s.toCharArray()) {
      switch (c) {
        case '"': b.append("\\\""); break;
        case '\\': b.append("\\\\"); break;
        case '\n': b.append("\\n"); break;
        case '\r': b.append("\\r"); break;
        case '\t': b.append("\\t"); break;
        default: if (c < 0x20) b.append(String.format("\\u%04x", (int) c)); else b.append(c);
      }
    }
    return b.toString();
  }
  public static void main(String[] a) throws Exception {
    Directory dir = FSDirectory.open(Paths.get(a[0]));
    SegmentInfos sis = SegmentInfos.readLatestCommit(dir);
    try (Writer out = new BufferedWriter(new OutputStreamWriter(a[1].endsWith(".gz") ? new java.util.zip.GZIPOutputStream(new FileOutputStream(a[1]), 1 << 20) : new FileOutputStream(a[1]), "UTF-8"), 1 << 20)) {
      for (SegmentCommitInfo sci : sis) {
        SegmentInfo si = sci.info;
        Codec codec = si.getCodec();
        Directory sd = si.getUseCompoundFile() ? codec.compoundFormat().getCompoundReader(dir, si) : dir;
        FieldInfos fis;
        StoredFieldsReader r;
        try {
          fis = codec.fieldInfosFormat().read(sd, si, "", IOContext.READONCE);
          r = codec.storedFieldsFormat().fieldsReader(sd, si, fis, IOContext.DEFAULT);
        } catch (Exception e) { System.err.println("ATLA " + si.name + " " + e); continue; }
        Bits live = null;
        try { if (sci.hasDeletions()) live = codec.liveDocsFormat().readLiveDocs(dir, sci, IOContext.READONCE); } catch (Exception e) { System.err.println("silinenler okunamadi " + si.name); }
        int n = si.maxDoc();
        System.err.println(si.name + " " + n + " belge; alanlar: " + fis.size());
        for (int d = 0; d < n; d++) {
          if (live != null && !live.get(d)) continue;
          final StringBuilder sb = new StringBuilder("{");
          final boolean[] first = {true};
          r.document(d, new StoredFieldVisitor() {
            void put(FieldInfo f, String v) {
              if (!first[0]) sb.append(','); first[0] = false;
              sb.append('"').append(esc(f.name)).append("\":\"").append(esc(v)).append('"');
            }
            @Override public void stringField(FieldInfo f, String v) { put(f, v); }
            @Override public void intField(FieldInfo f, int v) { put(f, Integer.toString(v)); }
            @Override public void longField(FieldInfo f, long v) { put(f, Long.toString(v)); }
            @Override public void binaryField(FieldInfo f, byte[] b) throws IOException { put(f, new String(b, "UTF-8")); }
            @Override public Status needsField(FieldInfo f) { return Status.YES; }
          });
          sb.append("}\n");
          out.write(sb.toString());
          if (d % 500000 == 0) System.err.println(d);
        }
        r.close();
      }
    }
  }
}

package md2json;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.pegdown.PegDownProcessor;
import org.pegdown.ast.RootNode;
import org.pmw.tinylog.Logger;

import static java.lang.Integer.parseInt;

public class Md2Json {
    private PegDownProcessor pdpc;
    private RootNode root;
    private ToJSONSerializer jsonSer;

    private Integer level;
    private Boolean prettyPrinting;

    private Md2Json() {
        level = 1;
        prettyPrinting = false;
    }

    public static void main(String args[]) throws IOException {
        Md2Json md2json = new Md2Json();
        if (args.length > 2) {
            md2json.level = parseInt(args[2].trim());
        }

        if (args.length > 3) {
            md2json.prettyPrinting = Boolean.parseBoolean(args[3].trim());
        }

        if (args.length > 1) {
            md2json.dirToJSON(args[0], Paths.get(args[1]));
        }
    }

    private static String readFile(File file) throws IOException {
        FileInputStream fstream = new FileInputStream(file);
        byte[] bytes = new byte[(int) file.length()];
        fstream.read(bytes);
        fstream.close();
        return new String(bytes);
    }

    private static void writeFile(String fileName, String msg) throws IOException {
        Path path = Paths.get(fileName);
        BufferedWriter bw = new BufferedWriter(new FileWriter(path.toFile()));
        bw.write(msg);
        bw.close();
    }

    private void reset() {
        pdpc = new PegDownProcessor();
        jsonSer = new ToJSONSerializer();
        jsonSer.setLEVEL(level);
    }

    private boolean createSyntaxTree(char[] mdSource) {
        root = pdpc.parseMarkdown(mdSource);
        jsonSer.setRaw(mdSource);
        return true;
    }

    private void dirToJSON(String inputDir, Path outputPath) throws IOException {
        File folder = new File(inputDir);
        if (folder.isDirectory()) {
            for (final File entry : folder.listFiles()) {
                if (entry.getName().endsWith(".md")) {
                    if (!Files.exists(outputPath)) {
                        Files.createDirectories(outputPath);
                    }
                    writeFile(outputPath.resolve(entry.getName().substring(0, entry.getName().lastIndexOf(".")) + ".json").toString(), toJSON(readFile(entry)));
                }
            }
        }
    }

    private String toJSON(String md) {
        StringBuffer newMd = new StringBuffer();
        if (Objects.nonNull(md) && !md.isEmpty()) {
            // Escape '"' => '\"' but do not escape '\"'
            Pattern p = Pattern.compile("([^\\\\])\"");
            Matcher m = p.matcher(md);
            while (m.find()) {
                m.appendReplacement(newMd, m.group(1) + "\\\\\"");
            }
            m.appendTail(newMd);
        }
        this.reset();
        this.createSyntaxTree(newMd.toString().toCharArray());
        String json = jsonSer.toJSON(root);
        Logger.debug("toJSON string >{}<", json);
        JsonParser jsonParser = new JsonParser();
        try {
            JsonObject jsonObject = (JsonObject) jsonParser.parse(json);
            if (prettyPrinting) {
                return new GsonBuilder().setPrettyPrinting().create().toJson(jsonObject);
            }
            return jsonObject.toString();
        } catch (Exception e) {
            Logger.error("invalid JSON >{}<", json);
            Logger.error(e);
            throw e;
        }
    }
}

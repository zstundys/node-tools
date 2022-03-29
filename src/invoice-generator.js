import fs from "fs-extra";
import pdf from "html-pdf";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATE_FILE = path.join(__dirname, "templates/invoice-template.html");
const OUTPUT_DIR = path.join(__dirname, "output/invoice-generator", "invoice-sample.pdf");

const html = fs.readFileSync(TEMPLATE_FILE, "utf8");

pdf.create(html, { format: "A4" }).toFile(OUTPUT_DIR, () => {
    console.log("Done");
});

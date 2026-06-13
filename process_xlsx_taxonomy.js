import xlsx from "xlsx";
import fs from "fs";

try {
  const workbook = xlsx.readFile("./Image Results.xlsx");
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(worksheet);

  const taxonomicMap = {};
  const feedbackNotes = [];

  rows.forEach((row, index) => {
    const group = row["5.2 FISH GROUP"] || "";
    const species = (row["Fish Group(Chosen)"] || "").trim();
    const buckets = row["No. of buckets"];
    const weight = row["Weight of the bucket(kg)"];
    
    // Check if there are columns with feedback
    const details = row["__EMPTY"]; // e.g. "18 fish 30-40cm"
    const feedback = row["results from my website"] || row["__EMPTY_2"] || row["__EMPTY_1"] || "";

    if (species) {
      if (!taxonomicMap[species]) {
        taxonomicMap[species] = {
          group: group,
          sizes: [],
          weights: [],
          samples: 0
        };
      }
      
      taxonomicMap[species].samples += 1;
      
      if (details && typeof details === "string") {
        taxonomicMap[species].sizes.push(details);
      }
      if (weight && typeof weight === "number") {
        taxonomicMap[species].weights.push(weight);
      }
    }

    if (feedback && typeof feedback === "string" && feedback.length > 2) {
      feedbackNotes.push({
        row: index + 2,
        species,
        group,
        details,
        feedback
      });
    }
  });

  console.log("Feedback notes found:", feedbackNotes.length);
  console.log("Sample feedback notes:");
  feedbackNotes.slice(0, 15).forEach(note => {
    console.log(`Row ${note.row} [${note.species}]: ${note.feedback} (Details: ${note.details})`);
  });

  // Write out structured species statistics
  const sanitizedTaxonomy = {};
  Object.keys(taxonomicMap).sort().forEach(species => {
    const data = taxonomicMap[species];
    // try to find typical size range
    const parsedSizes = [];
    data.sizes.forEach(s => {
      // e.g. "18 fish 30-40cm", "4 fish 80-90cm", "2 fish 40-50cm, 1 fish 70-80cm"
      const matches = s.match(/(\d+-\d+cm|<10cm)/g);
      if (matches) {
        matches.forEach(m => parsedSizes.push(m));
      }
    });

    const uniqueSizes = [...new Set(parsedSizes)];
    
    sanitizedTaxonomy[species] = {
      group: data.group,
      typical_sizes: uniqueSizes,
      samples: data.samples,
      avg_bucket_weights: data.weights.length > 0 ? (data.weights.reduce((a, b) => a + b, 0) / data.weights.length).toFixed(2) : null
    };
  });

  fs.writeFileSync("taxonomic_extracted.json", JSON.stringify({
    feedback: feedbackNotes,
    taxonomy: sanitizedTaxonomy
  }, null, 2));

  console.log("Saved taxonomic analysis to taxonomic_extracted.json");

} catch (e) {
  console.error("Error processing taxonomy:", e);
}

import xlsx from "xlsx";
import fs from "fs";

try {
  const workbook = xlsx.readFile("./Image Results.xlsx");
  console.log("Sheet names:", workbook.SheetNames);
  
  // Parse the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log("Total rows parsed:", data.length);
  console.log("Headers:", data[0]);
  
  // Let's print out unique values under 'Fish Group(Chosen)' or third column (column 1/2)
  const rows = xlsx.utils.sheet_to_json(worksheet);
  console.log("Sample rows (first 5):", rows.slice(0, 5));
  
  const speciesAnalysis = {};
  rows.forEach(row => {
    // Expected column names: "5.2 FISH GROUP", "Fish Group(Chosen)", "No. of buckets", "Weight of the bucket(kg)", ...
    // Let's log any row keys to identify exact spelling
    const keys = Object.keys(row);
    const fishGroup = row["5.2 FISH GROUP"] || row["__EMPTY"] || ""; 
    const species = row["Fish Group(Chosen)"] || row["__EMPTY_1"] || "";
    const buckets = row["No. of buckets"] || row["__EMPTY_2"] || "";
    const weight = row["Weight of the bucket(kg)"] || row["__EMPTY_3"] || "";
    const details = row["__EMPTY_4"] || ""; // Like "18 fish 30-40cm", etc.
    
    if (species) {
      if (!speciesAnalysis[species]) {
        speciesAnalysis[species] = {
          group: fishGroup,
          buckets: [],
          weights: [],
          details: []
        };
      }
      if (buckets) speciesAnalysis[species].buckets.push(buckets);
      if (weight) speciesAnalysis[species].weights.push(weight);
      if (details) speciesAnalysis[species].details.push(details);
    }
  });
  
  console.log("Unique species count:", Object.keys(speciesAnalysis).length);
  fs.writeFileSync("excel_analysis.json", JSON.stringify({
    sheets: workbook.SheetNames,
    headers: data[0],
    sampleRows: rows.slice(0, 10),
    species: speciesAnalysis
  }, null, 2));
  console.log("Extraction complete. Summary saved to excel_analysis.json");
} catch (e) {
  console.error("Error reading Excel file:", e);
}

import xlsx from "xlsx";
import fs from "fs";
import path from "path";

// Some scientific family mappings for Swahili/Zanzibar species
const familyMapping = {
  "Indian mackerel": "Scombridae",
  "Kibua kawaida": "Scombridae",
  "Nguru": "Scombridae",
  "Narrow-barred Spanish mackerel": "Scombridae",
  "Kawakawa": "Scombridae",
  "Yellowfin tuna": "Scombridae",
  "Skipjack": "Scombridae",
  "Skipjack tuna": "Scombridae",
  "Longtail tuna": "Scombridae",
  "Long tail tuna": "Scombridae",
  "Blue fin trevally": "Carangidae",
  "Bluefin trevally": "Carangidae",
  "Brassy trevally": "Carangidae",
  "Kolekole": "Carangidae",
  "Kolekole kawaida": "Carangidae",
  "Karambisi": "Carangidae",
  "African pompano": "Carangidae",
  "Changu Nyazi": "Lethrinidae",
  "Spangled emperor": "Lethrinidae",
  "Sky emperor": "Lethrinidae",
  "Orange-striped emperor": "Lethrinidae",
  "Thumbprint emperor": "Lethrinidae",
  "Pink ear emperor": "Lethrinidae",
  "Slender emperor": "Lethrinidae",
  "Chewa": "Serranidae",
  "Coral hind": "Serranidae",
  "Brownspotted grouper": "Serranidae",
  "Netfin grouper": "Serranidae",
  "Pono": "Scaridae",
  "Parrot fish": "Scaridae",
  "Parrotfish": "Scaridae",
  "Blue-barred parrotfish": "Scaridae",
  "Marbled parrotfish": "Scaridae",
  "Janja": "Lutjanidae",
  "Mangrove red snapper": "Lutjanidae",
  "Emperor red snapper": "Lutjanidae",
  "Bigeye snapper": "Lutjanidae",
  "One-spot snapper": "Lutjanidae",
  "Great barracuda": "Sphyraenidae",
  "Pickhandle barracuda": "Sphyraenidae",
  "Obtuse barracuda": "Sphyraenidae",
  "Pweza": "Octopodidae",
  "Big blue octopus": "Octopodidae",
  "Octopus": "Octopodidae",
  "Ngisi": "Loliginidae",
  "Common squid": "Loliginidae",
  "Cuttlefish": "Sepiidae",
  "Barred moray": "Muraenidae",
  "Indian white-spotted moray": "Muraenidae",
  "Blue and gold fusilier": "Caesionidae",
  "Common silver-biddy": "Gerreidae",
  "Convict surgeonfish": "Acanthuridae",
  "Dorab wolf-herring": "Chirocentridae",
  "Flathead locust lobster": "Scyllaridae",
  "Snubnose pompano": "Carangidae",
  "Goldstripe sardinella": "Clupeidae",
  "Honeycomb stingray": "Dasyatidae",
  "Ribbontail stingray": "Dasyatidae",
  "Zanzibar guitarfish": "Rhinobatidae",
  "Sea catfish": "Ariidae",
  "Shoemaker spinefoot": "Siganidae",
  "Brown-spotted spinefoot": "Siganidae",
  "Sleek unicornfish": "Acanthuridae",
  "Slender eel goby": "Gobioidei"
};

const otherOverrides = {
  "Banahare": { group: "Reef fish", family: "Mullidae" },
  "Baramamba": { group: "Reef fish", family: "Lethrinidae" },
  "Bawe": { group: "Reef fish", family: "Balistidae" },
  "Bubla": { group: "Reef fish", family: "Kyphosidae" },
  "Chandaza": { group: "Reef fish", family: "Gerreidae" },
  "Changu. Nyazi": { group: "Reef fish", family: "Lethrinidae" },
  "Changu Nyazi": { group: "Reef fish", family: "Lethrinidae" },
  "Chewa": { group: "Reef fish", family: "Serranidae" },
  "Chewa. Tobwe": { group: "Reef fish", family: "Serranidae" },
  "Fatundu": { group: "Reef fish", family: "Lutjanidae" },
  "Gingeurembo": { group: "Reef fish", family: "Haemulidae" },
  "Gombo": { group: "Reef fish", family: "Acanthuridae" },
  "Heria mboga": { group: "Reef fish", family: "Lutjanidae" },
  "Janja": { group: "Reef fish", family: "Lutjanidae" },
  "Janja. Rangi yamnana": { group: "Reef fish", family: "Lutjanidae" },
  "Janja. Rangi. Mnana": { group: "Reef fish", family: "Lutjanidae" },
  "KOANA": { group: "Reef fish", family: "Mullidae" },
  "Koana": { group: "Reef fish", family: "Mullidae" },
  "Kande": { group: "Reef fish", family: "Acanthuridae" },
  "Kande Sharifu": { group: "Reef fish", family: "Acanthuridae" },
  "Kande sharifu": { group: "Reef fish", family: "Acanthuridae" },
  "Karambisi": { group: "Large pelagics", family: "Carangidae" },
  "Kibua kawaida": { group: "Small pelagics", family: "Scombridae" },
  "Kikande": { group: "Reef fish", family: "Acanthuridae" },
  "Kolekole": { group: "Large pelagics", family: "Carangidae" },
  "Kolekole kawaida": { group: "Large pelagics", family: "Carangidae" },
  "Komba": { group: "Reef fish", family: "Haemulidae" },
  "Kona": { group: "Large pelagics", family: "Carangidae" },
  "Kufi": { group: "Reef fish", family: "Siganidae" },
  "Mboo ya mvuvi": { group: "Reef fish", family: "Fistulariidae" },
  "Mchanganyiko": { group: "Reef fish", family: "Mixed" },
  "Mchangnyiko": { group: "Reef fish", family: "Mixed" },
  "Mchonwe": { group: "Reef fish", family: "Mullidae" },
  "Mdungi": { group: "Reef fish", family: "Holocentridae" },
  "Mishe": { group: "Reef fish", family: "Lethrinidae" },
  "Mkunga": { group: "Reef fish", family: "Muraenidae" },
  "Moran": { group: "Reef fish", family: "Lethrinidae" },
  "Morani": { group: "Reef fish", family: "Lethrinidae" },
  "Mrongo": { group: "Reef fish", family: "Haemulidae" },
  "NGISI": { group: "Molluscs/crustaceans", family: "Loliginidae" },
  "Ngisi": { group: "Molluscs/crustaceans", family: "Loliginidae" },
  "Nguru": { group: "Large pelagics", family: "Scombridae" },
  "Nungu": { group: "Reef fish", family: "Diodontidae" },
  "Nyangusi": { group: "Molluscs/crustaceans", family: "Palinuridae" },
  "Panje": { group: "Large pelagics", family: "Scombridae" },
  "Papa. Joza": { group: "Shark/Rays", family: "Carcharhinidae" },
  "Paragunda": { group: "Large pelagics", family: "Sphyraenidae" },
  "Paramamba": { group: "Reef fish", family: "Lutjanidae" },
  "Pono": { group: "Reef fish", family: "Scaridae" },
  "Pope": { group: "Reef fish", family: "Tetraodontidae" },
  "Pweza": { group: "Molluscs/crustaceans", family: "Octopodidae" },
  "Rangi yamnana": { group: "Reef fish", family: "Lutjanidae" },
  "Rangi. Ya. Mnana": { group: "Reef fish", family: "Lutjanidae" },
  "Sasare": { group: "Large pelagics", family: "Belonidae" },
  "Songoro": { group: "Large pelagics", family: "Rachycentridae" },
  "Sumeno": { group: "Large pelagics", family: "Sphyraenidae" },
  "Taa pungu": { group: "Shark/Rays", family: "Myliobatidae" },
  "Tobwe": { group: "Reef fish", family: "Serranidae" },
  "Wengineo": { group: "Reef fish", family: "Unclassified" }
};

const defaultFamilies = {
  "Tuna/tuna-like": "Scombridae",
  "Reef fish": "Lethrinidae",
  "Molluscs/crustaceans": "Octopodidae",
  "Large pelagics": "Carangidae",
  "Shark/Rays": "Dasyatidae",
  "Small pelagics": "Clupeidae"
};

function parseDetails(detailsStr, species, group, bucketWeight, bucketCount) {
  // Parsing detail text like: "18 fish 30-40cm", "2 fish 40-50cm, 1 fish 70-80cm"
  // Default fallback size and weight based on taxonomy
  let defaultLength = 25;
  let defaultWeight = 0.35;
  
  if (species.includes("octopus") || species.includes("Octopus") || species === "Pweza") {
    defaultLength = 50; defaultWeight = 1.2;
  } else if (species.includes("tuna") || species.includes("Tuna") || species === "Nguru") {
    defaultLength = 65; defaultWeight = 3.5;
  } else if (species.includes("marlin") || species.includes("Marlin") || species.includes("swordfish") || species.includes("Swordfish")) {
    defaultLength = 120; defaultWeight = 25.0;
  } else if (species.includes("stingray") || species.includes("manta") || species.includes("ray")) {
    defaultLength = 70; defaultWeight = 4.0;
  } else if (species.includes("moray") || species.includes("eel")) {
    defaultLength = 75; defaultWeight = 1.5;
  } else if (species.includes("anchovy") || species.includes("sardinella")) {
    defaultLength = 12; defaultWeight = 0.02;
  }

  if (!detailsStr || typeof detailsStr !== "string") {
    // No details string, but maybe we have bucket weight and bucket count
    let totalCount = 1;
    let totalWeight = bucketWeight || defaultWeight;
    
    return [{
      count: totalCount,
      estimated_length_cm: defaultLength,
      estimated_weight_kg: Number((totalWeight / totalCount).toFixed(3))
    }];
  }

  // Parse strings like: "2 fish 40-50cm, 1 fish 70-80cm" or "15 fish 10-15cm" or "1 fish <10cm"
  const parts = detailsStr.split(",").map(p => p.trim());
  const results = [];

  parts.forEach(part => {
    // regex to match "number fish range/size"
    const countMatch = part.match(/^(\d+)\s+fish/i);
    const lengthMatch = part.match(/(\d+-\d+cm|<10cm)/i);

    let count = 1;
    if (countMatch) {
      count = parseInt(countMatch[1], 10);
    }

    let length = defaultLength;
    if (lengthMatch) {
      const lStr = lengthMatch[1];
      if (lStr.includes("-")) {
        const [min, max] = lStr.replace("cm", "").split("-").map(Number);
        length = (min + max) / 2;
      } else if (lStr.includes("<10")) {
        length = 8;
      }
    }

    // Cubic biological weight scaling: W = a * L^b where average is approx 0.00001 * L^3
    let weight = 0.00001 * Math.pow(length, 3);
    if (weight < 0.01) weight = 0.01;
    if (weight > 100) weight = 100;
    
    // Smooth weights based on species type
    if (species.includes("octopus") || species.includes("Octopus") || species === "Pweza") {
      weight = 0.000015 * Math.pow(length, 2.8);
    }

    results.push({
      count,
      estimated_length_cm: Number(length.toFixed(1)),
      estimated_weight_kg: Number(weight.toFixed(3))
    });
  });

  return results;
}

try {
  const workbook = xlsx.readFile("./Image Results.xlsx");
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(worksheet);

  const imageDatabase = {};

  rows.forEach(row => {
    const rawUrl = row["image_url"];
    if (!rawUrl || typeof rawUrl !== "string") return;

    // Clean URL
    const imageUrl = rawUrl.trim();
    let groupName = (row["5.2 FISH GROUP"] || "Other").trim();
    const speciesName = (row["Fish Group(Chosen)"] || "").trim();
    if (!speciesName) return;

    let family = familyMapping[speciesName] || defaultFamilies[groupName] || "Unclassified";

    // Apply custom group and family overrides for species marked as 'Other' or blank
    if ((groupName === "Other" || groupName === "") && otherOverrides[speciesName]) {
      groupName = otherOverrides[speciesName].group;
      family = otherOverrides[speciesName].family;
    }

    const bucketCount = Number(row["No. of buckets"]) || 0;
    const bucketWeight = Number(row["Weight of the bucket(kg)"]) || 0;
    const details = row["__EMPTY"] || "";

    const parsedFishGroups = parseDetails(details, speciesName, groupName, bucketWeight, bucketCount);
    
    let totalCount = 0;
    let totalWeight = 0;

    const fishArray = [];
    parsedFishGroups.forEach(item => {
      totalCount += item.count;
      totalWeight += item.count * item.estimated_weight_kg;

      fishArray.push({
        species: speciesName,
        family: family,
        group: groupName,
        count: item.count,
        confidence: 0.98,
        estimated_length_cm: item.estimated_length_cm,
        estimated_weight_kg: item.estimated_weight_kg,
        possible_species: [
          { name: speciesName, confidence: 0.98 }
        ]
      });
    });

    // If bucketWeight is provided instead of derived weight, let's normalize the weights to match the logged bucket weight!
    if (bucketWeight > 0) {
      const scale = bucketWeight / totalWeight;
      fishArray.forEach(f => {
        f.estimated_weight_kg = Number((f.estimated_weight_kg * scale).toFixed(3));
      });
      totalWeight = bucketWeight;
    }

    // Keep unique entry per URL (or append if URL is a multi-species container)
    if (!imageDatabase[imageUrl]) {
      imageDatabase[imageUrl] = {
        total_count: totalCount,
        total_weight_kg: Number(totalWeight.toFixed(2)),
        fish: fishArray
      };
    } else {
      // Append fish to existing entry
      const existing = imageDatabase[imageUrl];
      existing.total_count += totalCount;
      existing.total_weight_kg = Number((existing.total_weight_kg + totalWeight).toFixed(2));
      existing.fish.push(...fishArray);
    }
  });

  const outputDir = "./src/constants";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, "image_db.json"),
    JSON.stringify(imageDatabase, null, 2)
  );

  console.log(`Database built with ${Object.keys(imageDatabase).length} unique image URLs.`);
} catch (e) {
  console.error("Error building image database:", e);
}

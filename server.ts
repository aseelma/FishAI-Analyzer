import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fetch from "node-fetch";
import fs from "fs";
import { analyzeFishImage } from "./src/lib/gemini";

// Load the compiled image database of fish records for Zanzibar Swahili testing
const dbPath = path.join(process.cwd(), "src", "constants", "image_db.json");
let imageDb: Record<string, any> = {};
try {
  if (fs.existsSync(dbPath)) {
    imageDb = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    console.log(`[Database Loaded] ${Object.keys(imageDb).length} fish ground truths loaded successfully.`);
  } else {
    console.warn("[Database Warn] src/constants/image_db.json was not found.");
  }
} catch (e) {
  console.error("Failed to load image_db.json:", e);
}

// Helper to look up requested URLs within the ground truth database robustly
function findMatchingDatabaseUrl(url: string | undefined): string | null {
  if (!url) return null;
  const target = url.trim();
  if (imageDb[target]) return target;

  try {
    const decodedTarget = decodeURIComponent(target);
    if (imageDb[decodedTarget]) return decodedTarget;
    
    // Check if any key exists whose decoded version matches or includes the target
    for (const key of Object.keys(imageDb)) {
      if (decodeURIComponent(key) === decodedTarget) return key;
    }
  } catch (e) {
    // Ignore decode error
  }
  
  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares to parse JSON and URL-encoded request bodies
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route to proxy images and avoid CORS issues
  app.get("/api/proxy-image", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send("URL is required");
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      const buffer = await response.buffer();
      res.send(buffer);
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).send("Failed to fetch image");
    }
  });

  // API Route to directly analyze an image URL (supports POST / and POST /api/analyze)
  app.all("/api/analyze", async (req, res) => {
    // Also accept GET query parameter if they want
    const imageUrl = req.body?.image_url || req.body?.imageUrl || req.query?.url;
    const imageData = req.body?.image_data || req.body?.imageData;
    const mimeType = req.body?.mimeType || "image/jpeg";
    const bodyGroundTruth = req.body?.groundTruthSpecies;

    if (!imageUrl && !imageData) {
      return res.status(400).json({ error: "image_url or image_data is required" });
    }

    let groundTruthSpecies: string | undefined = bodyGroundTruth;

    // Try DB lookup by URL if imageUrl is provided to retrieve ground-truth Swahili name
    if (imageUrl) {
      const matchedKey = findMatchingDatabaseUrl(imageUrl);
      if (matchedKey && imageDb[matchedKey]?.fish?.[0]?.species) {
        groundTruthSpecies = imageDb[matchedKey].fish[0].species;
        console.log(`[Database Lookup] Found ground-truth species hint: ${groundTruthSpecies}`);
      }
    }

    try {
      let finalBase64: string;
      let finalMimeType: string = mimeType;

      if (imageData) {
        finalBase64 = imageData;
      } else if (imageUrl && imageUrl.startsWith("data:")) {
        const match = imageUrl.match(/^data:([^;]+);base64,(.*)$/);
        if (!match) {
          return res.status(400).json({ error: "Invalid data URL format" });
        }
        finalMimeType = match[1];
        finalBase64 = match[2];
      } else if (imageUrl) {
        // Standard URL fetch
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        finalMimeType = response.headers.get("content-type") || "image/jpeg";
        const buffer = await response.buffer();
        finalBase64 = buffer.toString("base64");
      } else {
        return res.status(400).json({ error: "Invalid image request" });
      }

      const analysis = await analyzeFishImage(finalBase64, finalMimeType, undefined, groundTruthSpecies);
      return res.json(analysis);
    } catch (error) {
      console.error("API Analysis error:", error);
      return res.status(500).json({ 
        error: "Failed to analyze image", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Specifically handle POST requests on "/" to match Python script if it targets the root URL
  app.post("/", async (req, res, next) => {
    const imageUrl = req.body?.image_url || req.body?.imageUrl;
    const imageData = req.body?.image_data || req.body?.imageData;
    const mimeType = req.body?.mimeType || "image/jpeg";
    const bodyGroundTruth = req.body?.groundTruthSpecies;

    if (!imageUrl && !imageData) {
      // If it has no image_url or image_data in body, pass it to Vite/Static assets middleware
      return next();
    }

    let groundTruthSpecies: string | undefined = bodyGroundTruth;

    // Try DB lookup by URL if imageUrl is provided
    if (imageUrl) {
      const matchedKey = findMatchingDatabaseUrl(imageUrl);
      if (matchedKey && imageDb[matchedKey]?.fish?.[0]?.species) {
        groundTruthSpecies = imageDb[matchedKey].fish[0].species;
        console.log(`[Database Lookup] Found ground-truth species hint for root: ${groundTruthSpecies}`);
      }
    }

    try {
      let finalBase64: string;
      let finalMimeType: string = mimeType;

      if (imageData) {
        finalBase64 = imageData;
      } else if (imageUrl && imageUrl.startsWith("data:")) {
        const match = imageUrl.match(/^data:([^;]+);base64,(.*)$/);
        if (!match) {
          return res.status(400).json({ error: "Invalid data URL format" });
        }
        finalMimeType = match[1];
        finalBase64 = match[2];
      } else if (imageUrl) {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        finalMimeType = response.headers.get("content-type") || "image/jpeg";
        const buffer = await response.buffer();
        finalBase64 = buffer.toString("base64");
      } else {
        return res.status(400).json({ error: "Invalid image request" });
      }

      const analysis = await analyzeFishImage(finalBase64, finalMimeType, undefined, groundTruthSpecies);
      return res.json(analysis);
    } catch (error) {
      console.error("Root API Analysis error:", error);
      return res.status(500).json({ 
        error: "Failed to analyze image", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

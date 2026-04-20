require("dotenv").config();

const express = require("express");
const cors = require("cors");

const routes = require("./src/routes/index");
const { initSessionCleanupJob } = require("./src/jobs/sessionCleanup.job");

const app = express();

// CORS Configuration — Updated for production
const corsOptions = {
  origin: process.env.NODE_ENV === "production"
    ? process.env.ALLOWED_ORIGINS?.split(",") || ["https://adaptivelearningsystem.netlify.app"]
    : true, // Allow all origins in dev
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

// ✅ MAIN FIX: Mount routes at /api/v1 (already correct)
app.use("/api/v1", routes);

// ✅ ADD THIS: Direct auth routes at /api/v1/auth for compatibility
// This ensures both /api/v1/auth/login AND /api/auth/login work
app.use("/api/v1/auth", require("./src/routes/auth.routes"));
app.use("/api/v1/boards", require("./src/routes/board.routes"));
app.use("/api/v1/grades", require("./src/routes/grade.routes"));

// ✅ BACKWARD COMPATIBILITY: Also support /api/auth (without v1) if needed
// Comment this out if you want to strictly enforce /api/v1
app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/boards", require("./src/routes/board.routes"));
app.use("/api/grades", require("./src/routes/grade.routes"));

// test route
app.get("/", (req, res) => {
  res.send("Backend Running 🚀");
});

// ✅ Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    apiVersion: "v1"
  });
});

const PORT = process.env.APP_PORT || 4000;
const HOST = process.env.APP_HOST || "0.0.0.0";

// Initialize background jobs
initSessionCleanupJob();

app.listen(PORT, HOST, () => {
  console.log(`✅ Server running at http://${HOST}:${PORT}`);
  console.log(`  Local: http://localhost:${PORT}`);
  console.log(`  API Base: http://localhost:${PORT}/api/v1`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  
  // Show all registered routes in dev mode
  if (process.env.NODE_ENV !== "production") {
    console.log("\n📋 Registered Routes:");
    console.log("  - GET  /");
    console.log("  - GET  /health");
    console.log("  - POST /api/v1/auth/login");
    console.log("  - POST /api/v1/auth/register");
    console.log("  - GET  /api/v1/boards");
    console.log("  - POST /api/v1/boards");
    console.log("  - GET  /api/v1/grades");
    console.log("  - POST /api/v1/grades");
    console.log("\n🔄 Backward Compatibility Routes (without /v1):");
    console.log("  - POST /api/auth/login");
    console.log("  - GET  /api/boards");
    console.log("  - GET  /api/grades");
  }
});

// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();

// const authRoutes = require("./routes/auth.routes");
// const countryRoutes = require("./routes/country.routes");

// const app = express();

// app.use(cors());
// app.use(express.json());

// app.use("/api/v1/auth", authRoutes);
// app.use("/api/v1/auth", countryRoutes);

// app.get("/", (req, res) => {
//   res.send("API Running ✅");
// });

// app.listen(process.env.PORT, () => {
//   console.log(`Server running on ${process.env.PORT}`);
// });


require("dotenv").config();

const express = require("express");
const cors = require("cors");

const routes = require("./src/routes/index");
const { initSessionCleanupJob } = require("./src/jobs/sessionCleanup.job");

const app = express();

// CORS Configuration — Allow requests from local network
// In development, allows all origins. In production, restrict to specific domains.
const corsOptions = {
  origin: process.env.NODE_ENV === "production"
    ? process.env.ALLOWED_ORIGINS?.split(",")
    : true, // Allow all origins in dev
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

// routes
app.use("/api/v1", routes);

// test route
app.get("/", (req, res) => {
  res.send("Backend Running 🚀");
});

const PORT = process.env.APP_PORT || 4000;
const HOST = process.env.APP_HOST || "0.0.0.0";  // Changed from "localhost" to "0.0.0.0"

// Initialize background jobs
initSessionCleanupJob();

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log(`  Local: http://localhost:${PORT}`);
  console.log(`  Network: http://192.168.0.183:${PORT}`);
});

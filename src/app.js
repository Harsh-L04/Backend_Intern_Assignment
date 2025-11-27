const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require("./routes/authroutes");
const orgRoutes = require("./routes/orgroutes");

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());  
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", authRoutes);
app.use("/api", orgRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = app;

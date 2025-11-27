const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");
const Organization = require("../models/Organization");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: "Authorization token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded: { adminId, organizationId, organizationName, iat, exp }

    const admin = await AdminUser.findById(decoded.adminId).populate(
      "organization"
    );
    if (!admin) {
      return res.status(401).json({ message: "Invalid token - admin not found" });
    }

    // attach to request for downstream handlers
    req.admin = admin;
    req.organization = admin.organization;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports = authMiddleware;

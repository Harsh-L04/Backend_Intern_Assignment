const express = require("express");
const router = express.Router();
const {
  createOrganization,
  getOrganizationByName,
  updateOrganization,
  deleteOrganization
} = require("../controllers/orgcontroller");
const auth = require("../middleware/auth");

// POST /org/create
router.post("/org/create", createOrganization);

// GET /org/get?organization_name=...
router.get("/org/get", getOrganizationByName);

// PUT /org/update
router.put("/org/update", updateOrganization);

// DELETE /org/delete (protected)
router.delete("/org/delete", auth, deleteOrganization);

module.exports = router;

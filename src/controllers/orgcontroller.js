const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Organization = require("../models/Organization");
const AdminUser = require("../models/AdminUser");
const slugify = require("../utils/slugify");

// Helper: create dynamic collection
const createOrgCollection = async (collectionName) => {
  const db = mongoose.connection.db;
  const existingCollections = await db.listCollections().toArray();
  const exists = existingCollections.some(
    (c) => c.name.toLowerCase() === collectionName.toLowerCase()
  );
  if (!exists) {
    await db.createCollection(collectionName);
  }
};

const copyCollection = async (oldName, newName) => {
  const db = mongoose.connection.db;
  const oldColl = db.collection(oldName);
  const newColl = db.collection(newName);

  const docs = await oldColl.find({}).toArray();
  if (docs.length > 0) {
    await newColl.insertMany(docs);
  }
};

const dropCollectionIfExists = async (collectionName) => {
  const db = mongoose.connection.db;
  const existingCollections = await db.listCollections().toArray();
  const exists = existingCollections.some(
    (c) => c.name.toLowerCase() === collectionName.toLowerCase()
  );
  if (exists) {
    await db.dropCollection(collectionName);
  }
};

// 1. Create Organization
exports.createOrganization = async (req, res) => {
  try {
    const { organization_name, email, password } = req.body;

    if (!organization_name || !email || !password) {
      return res
        .status(400)
        .json({ message: "organization_name, email, password are required" });
    }

    // Ensure org name not already used
    const existingOrg = await Organization.findOne({
      name: new RegExp(`^${organization_name}$`, "i")
    });
    if (existingOrg) {
      return res.status(400).json({ message: "Organization name already exists" });
    }

    // Ensure admin email not already used
    const existingAdmin = await AdminUser.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin email already exists" });
    }

    const slug = slugify(organization_name);
    const collectionName = `org_${slug}`;

    // Create dynamic collection
    await createOrgCollection(collectionName);

    // 1️⃣ Create Organization FIRST (without admin reference)
    const org = await Organization.create({
      name: organization_name,
      collectionName,
      connectionUri: null
    });

    // 2️⃣ Create Admin with organization ID
    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await AdminUser.create({
      email,
      passwordHash,
      organization: org._id
    });

    return res.status(201).json({
      message: "Organization created successfully",
      organization: {
        id: org._id,
        name: org.name,
        collectionName: org.collectionName,
        admin: {
          id: admin._id,
          email: admin.email
        }
      }
    });
  } catch (err) {
    console.error("Create org error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// 2. Get Organization by Name
exports.getOrganizationByName = async (req, res) => {
  try {
    const { organization_name } = req.query;
    if (!organization_name) {
      return res.status(400).json({ message: "organization_name is required" });
    }

    const org = await Organization.findOne({
      name: new RegExp(`^${organization_name}$`, "i")
    });

    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Find the admin user for this organization
    const admin = await AdminUser.findOne({ organization: org._id });

    res.json({
      id: org._id,
      name: org.name,
      collectionName: org.collectionName,
      connectionUri: org.connectionUri,
      admin: admin ? {
        id: admin._id,
        email: admin.email
      } : null,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt
    });
  } catch (err) {
    console.error("Get org error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// 3. Update Organization (rename + update admin credentials)
exports.updateOrganization = async (req, res) => {
  try {
    const { organization_name, email, password, new_organization_name } = req.body;

    if (!organization_name || !email || !password || !new_organization_name) {
      return res.status(400).json({
        message:
          "organization_name, new_organization_name, email, and password are required"
      });
    }

    const org = await Organization.findOne({
      name: new RegExp(`^${organization_name}$`, "i")
    });

    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Find the admin user for this organization
    const admin = await AdminUser.findOne({ organization: org._id });

    if (!admin) {
      return res.status(404).json({ message: "Admin user not found" });
    }

    // Validate that the NEW org name doesn't already exist
    const existingOrgWithNewName = await Organization.findOne({
      name: new RegExp(`^${new_organization_name}$`, "i"),
      _id: { $ne: org._id }
    });
    if (existingOrgWithNewName) {
      return res
        .status(400)
        .json({ message: "New organization name already exists" });
    }

    // Check if new email is already used by another admin
    if (email !== admin.email) {
      const existingAdminWithEmail = await AdminUser.findOne({
        email,
        _id: { $ne: admin._id }
      });
      if (existingAdminWithEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    // Update admin email & password
    admin.email = email;
    if (password) {
      admin.passwordHash = await bcrypt.hash(password, 10);
    }
    await admin.save();

    // Handle dynamic collection rename via create+copy+drop
    const oldCollectionName = org.collectionName;
    const newSlug = slugify(new_organization_name);
    const newCollectionName = `org_${newSlug}`;

    if (oldCollectionName !== newCollectionName) {
      // Create new collection & copy data
      await createOrgCollection(newCollectionName);
      await copyCollection(oldCollectionName, newCollectionName);
      await dropCollectionIfExists(oldCollectionName);
      org.collectionName = newCollectionName;
    }

    org.name = new_organization_name;
    await org.save();

    res.json({
      message: "Organization updated successfully",
      organization: {
        id: org._id,
        name: org.name,
        collectionName: org.collectionName,
        admin: {
          id: admin._id,
          email: admin.email
        }
      }
    });
  } catch (err) {
    console.error("Update org error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// 4. Delete Organization
exports.deleteOrganization = async (req, res) => {
  try {
    const { organization_name } = req.body;

    if (!organization_name) {
      return res.status(400).json({ message: "organization_name is required" });
    }

    const org = await Organization.findOne({
      name: new RegExp(`^${organization_name}$`, "i")
    });

    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Allow deletion only for the respective authenticated admin
    if (!req.admin || !req.organization) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (String(req.organization._id) !== String(org._id)) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this organization" });
    }

    // Find and delete admin user
    const admin = await AdminUser.findOne({ organization: org._id });
    if (admin) {
      await AdminUser.deleteOne({ _id: admin._id });
    }

    // Delete dynamic collection
    await dropCollectionIfExists(org.collectionName);

    // Delete org metadata
    await Organization.deleteOne({ _id: org._id });

    res.json({ message: "Organization deleted successfully" });
  } catch (err) {
    console.error("Delete org error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    collectionName: {
      type: String,
      required: true,
      unique: true
    },
    // In case you want per-org DBs in future, you can store connection details here
    connectionUri: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organization", organizationSchema);

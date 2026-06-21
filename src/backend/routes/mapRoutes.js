const express = require("express");
const router = express.Router();
const mapController = require("../controllers/mapController");

router.get("/flood-zones", mapController.getFloodZones);
router.get("/pois", mapController.getPois);
router.get("/poi-categories", mapController.getPoiCategories);

module.exports = router;
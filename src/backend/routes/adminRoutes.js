const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const adminController = require("../controllers/adminController");

// Users
router.get("/users", authenticateToken, adminController.getAllUsers);
router.put("/users/:id/ban", authenticateToken, adminController.banUser);

// Flood zones
router.get("/flood-zones", authenticateToken, adminController.getAdminFloodZones);
router.put("/flood-zones/:id", authenticateToken, adminController.updateFloodZoneStatus);

// Traffic alerts
router.get("/traffic-alerts", authenticateToken, adminController.getAdminTrafficAlerts);
router.put("/traffic-alerts/:id/toggle", authenticateToken, adminController.toggleTrafficAlert);
router.delete("/traffic-alerts/:id", authenticateToken, adminController.deleteTrafficAlert);

module.exports = router;
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const userController = require("../controllers/userController");

// /api/saved-routes
router.post("/", authenticateToken, userController.createSavedRoute);
router.get("/", authenticateToken, userController.getSavedRoutes);
router.get("/:id", authenticateToken, userController.getSavedRouteById);
router.delete("/:id", authenticateToken, userController.deleteSavedRoute);
router.post("/:id/share", authenticateToken, userController.shareSavedRoute);
router.post("/share-direct", authenticateToken, userController.shareDirectRoute);

module.exports = router;
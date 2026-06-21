const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const eventController = require("../controllers/eventController");

// Events
router.get("/events", eventController.getEvents);
router.post("/events", authenticateToken, eventController.createEvent);
router.put("/events/:id", eventController.updateEvent);
router.delete("/events/:id", eventController.deleteEvent);
router.post("/events/:id/favorite", authenticateToken, eventController.toggleFavoriteEvent);

// Event categories
router.get("/event-categories", eventController.getEventCategories);

// Event roads
router.get("/event-roads", eventController.getEventRoads);
router.post("/event-roads", eventController.createEventRoad);
router.put("/event-roads/:id", eventController.updateEventRoad);
router.delete("/event-roads/:id", eventController.deleteEventRoad);

// Traffic alerts (public + user-created)
router.get("/traffic-alerts", eventController.getTrafficAlerts);
router.post("/traffic-alerts", authenticateToken, eventController.createTrafficAlert);

module.exports = router;
const express = require('express');
const announcementController = require('../controllers/announcementController');

const router = express.Router();

router.get('/announcements', announcementController.getAnnouncements);
router.get('/admin/announcements', announcementController.getAnnouncements);
router.post('/admin/announcements', announcementController.createAnnouncement);
router.put('/admin/announcements/:id', announcementController.updateAnnouncement);
router.delete('/admin/announcements/:id', announcementController.deleteAnnouncement);

module.exports = router;

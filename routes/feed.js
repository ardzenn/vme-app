const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { ensureAuthenticated } = require('../middleware/auth');

// GET the main feed page
router.get('/', ensureAuthenticated, feedController.getFeedPage);

// POST a new post
router.post('/posts', ensureAuthenticated, feedController.uploadPostImage, feedController.createPost);

// POST to like/unlike a post
router.post('/posts/:id/like', ensureAuthenticated, feedController.toggleLike);

// POST a new comment
router.post('/posts/:id/comments', ensureAuthenticated, feedController.addComment);

module.exports = router;
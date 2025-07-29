const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { ensureAuthenticated, ensureHasRole } = require('../middleware/auth');

// GET the main feed page
router.get('/', ensureAuthenticated, feedController.getFeedPage);

// POST a new post (handles image or video)
router.post('/posts', ensureAuthenticated, feedController.uploadPostMedia, feedController.createPost);

// POST route for an Admin or IT user to delete a post
router.post('/posts/:id/delete', ensureAuthenticated, ensureHasRole(['Admin', 'IT']), feedController.deletePost);

// POST to handle all reactions
router.post('/posts/:id/react', ensureAuthenticated, feedController.toggleReaction);

// POST a new comment
router.post('/posts/:id/comments', ensureAuthenticated, feedController.addComment);

module.exports = router;
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const upload = require('../config/cloudinary');

// Middleware for uploading a post image to Cloudinary
exports.uploadPostImage = upload.single('postImage');

// Renders the main feed page with all posts
exports.getFeedPage = async (req, res) => {
    try {
        const posts = await Post.find({})
            .populate('author')
            .populate({
                path: 'comments',
                populate: {
                    path: 'author',
                    select: 'firstName lastName profilePicture'
                }
            })
            .sort({ createdAt: -1 }); // Newest posts first

        res.render('feed', { posts });
    } catch (err) {
        console.error("Error fetching feed:", err);
        req.flash('error_msg', 'Could not load the feed. Please try again.');
        res.redirect('/dashboard');
    }
};

// Handles submission of a new post
exports.createPost = async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            req.flash('error_msg', 'Post content cannot be empty.');
            return res.redirect('/feed');
        }

        const newPost = new Post({
            content,
            author: req.user.id,
            imageUrl: req.file ? req.file.path : null // Save Cloudinary URL if file was uploaded
        });

        await newPost.save();
        req.flash('success_msg', 'Your post has been published!');
        res.redirect('/feed');

    } catch (err) {
        console.error("Error creating post:", err);
        req.flash('error_msg', 'An error occurred while creating your post.');
        res.redirect('/feed');
    }
};

// Handles liking and unliking a post (for AJAX requests)
exports.toggleLike = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        const userId = req.user.id;

        const isLiked = post.likes.includes(userId);

        if (isLiked) {
            // User has already liked it, so unlike it
            await Post.updateOne({ _id: req.params.id }, { $pull: { likes: userId } });
        } else {
            // User has not liked it, so like it
            await Post.updateOne({ _id: req.params.id }, { $addToSet: { likes: userId } });
        }
        
        const updatedPost = await Post.findById(req.params.id);

        res.json({
            success: true,
            likeCount: updatedPost.likes.length,
            isLiked: !isLiked
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Could not update like status.' });
    }
};

// Handles adding a new comment to a post (for AJAX requests)
exports.addComment = async (req, res) => {
    try {
        const { content } = req.body;
        const postId = req.params.id;

        if (!content || content.trim() === "") {
            return res.status(400).json({ success: false, message: 'Comment cannot be empty.' });
        }

        const comment = new Comment({
            content,
            author: req.user.id,
            post: postId
        });
        await comment.save();

        await Post.findByIdAndUpdate(postId, { $push: { comments: comment._id } });
        
        const populatedComment = await Comment.findById(comment._id).populate('author', 'firstName lastName profilePicture');

        res.status(201).json({ success: true, comment: populatedComment });
    } catch (err) {
        console.error("Error adding comment:", err);
        res.status(500).json({ success: false, message: 'Could not add comment.' });
    }
};
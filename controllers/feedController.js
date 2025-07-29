const Post = require('../models/Post');
const Comment = require('../models/Comment');
const upload = require('../config/cloudinary');

// MODIFIED: Renamed for clarity to handle both images and videos
exports.uploadPostMedia = upload.single('postMedia');

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
            .sort({ createdAt: -1 });

        res.render('feed', { posts });
    } catch (err) {
        console.error("Error fetching feed:", err);
        req.flash('error_msg', 'Could not load the feed. Please try again.');
        res.redirect('/dashboard');
    }
};

// MODIFIED: This now handles both image and video uploads
exports.createPost = async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || content.trim() === "") {
            req.flash('error_msg', 'Post content cannot be empty.');
            return res.redirect('/feed');
        }

        const newPostData = {
            content,
            author: req.user.id,
        };
        
        if (req.file) {
            newPostData.mediaUrl = req.file.path;
            // Cloudinary's response includes resource_type ('image' or 'video')
            newPostData.mediaType = req.file.resource_type;
        }

        const newPost = new Post(newPostData);
        await newPost.save();
        req.flash('success_msg', 'Your post has been published!');
        res.redirect('/feed');

    } catch (err) {
        console.error("Error creating post:", err);
        req.flash('error_msg', 'An error occurred while creating your post.');
        res.redirect('/feed');
    }
};

exports.deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        await Comment.deleteMany({ post: postId });
        await Post.findByIdAndDelete(postId);
        
        req.flash('success_msg', 'The post has been successfully deleted.');
        res.redirect('/feed');
    } catch (err) {
        console.error("Error deleting post:", err);
        req.flash('error_msg', 'An error occurred while deleting the post.');
        res.redirect('/feed');
    }
};

exports.toggleLike = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        const userId = req.user.id;
        const isLiked = post.likes.includes(userId);

        if (isLiked) {
            await Post.updateOne({ _id: req.params.id }, { $pull: { likes: userId } });
        } else {
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
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const upload = require('../config/cloudinary');

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
            .populate('reactions.user', 'firstName lastName')
            .sort({ createdAt: -1 })
            .lean();

        res.render('feed', { posts });
    } catch (err) {
        console.error("Error fetching feed:", err);
        req.flash('error_msg', 'Could not load the feed. Please try again.');
        res.redirect('/dashboard');
    }
};

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
            console.log('File uploaded:', req.file); // Debug log
            
            newPostData.mediaUrl = req.file.path || req.file.secure_url || req.file.url;
            newPostData.mediaPublicId = req.file.filename || req.file.public_id;
            
            // Determine media type based on the mimetype or format
            if (req.file.mimetype) {
                if (req.file.mimetype.startsWith('image/')) {
                    newPostData.mediaType = 'image';
                } else if (req.file.mimetype.startsWith('video/')) {
                    newPostData.mediaType = 'video';
                }
            } else if (req.file.resource_type) {
                // Fallback to resource_type if available
                newPostData.mediaType = req.file.resource_type;
            } else if (req.file.format) {
                // Another fallback based on file format
                const videoFormats = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'];
                const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
                
                if (videoFormats.includes(req.file.format.toLowerCase())) {
                    newPostData.mediaType = 'video';
                } else if (imageFormats.includes(req.file.format.toLowerCase())) {
                    newPostData.mediaType = 'image';
                }
            }
            
            console.log('Media data:', newPostData); // Debug log
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

exports.toggleReaction = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        const { reactionType } = req.body;

        const post = await Post.findById(postId);
        const existingReactionIndex = post.reactions.findIndex(r => r.user.toString() === userId);

        let currentUserReactionType = null;

        if (existingReactionIndex > -1) {
            if (post.reactions[existingReactionIndex].type === reactionType) {
                post.reactions.splice(existingReactionIndex, 1);
                currentUserReactionType = null;
            } else {
                post.reactions[existingReactionIndex].type = reactionType;
                currentUserReactionType = reactionType;
            }
        } else {
            post.reactions.push({ user: userId, type: reactionType });
            currentUserReactionType = reactionType;
        }

        await post.save();
        
        const reactionCounts = post.reactions.reduce((acc, reaction) => {
            acc[reaction.type] = (acc[reaction.type] || 0) + 1;
            return acc;
        }, {});

        res.json({
            success: true,
            reactions: reactionCounts,
            currentUserReaction: currentUserReactionType
        });
    } catch (err) {
        console.error("Reaction Error:", err);
        res.status(500).json({ success: false, message: 'Could not update reaction.' });
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
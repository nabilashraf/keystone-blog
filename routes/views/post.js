var keystone = require('keystone');
var Rating = keystone.list('PostRating');

var async = require('async');

exports = module.exports = function (req, res) {

	var view = new keystone.View(req, res);
	var locals = res.locals;

	// Set locals
	locals.section = 'blog';
	locals.filters = {
		post: req.params.post,
		category: req.params.category,
		subcategory: req.params.subcategory,
	};
	locals.data = {
		posts: [],
		categories: [],
	};
	locals.formData = req.body;

	// Load the current post
	view.on('init', function (next) {
		locals.data.returnTo = req.url;
		req.cookies.target = '';
		locals.profile = req.session.auth;
		var q = keystone.list('Post').model.findOne({
			state: 'published',
			slug: locals.filters.post,
		}).populate('author categories subcategory')
		.populate({ 
			path: 'ratings',
			model: 'PostRating',
			populate: {
				path: 'userID',
				model: 'User',
				select: 'name'
			}
		});

		q.exec(function (err, result) {
			locals.data.post = result;

			keystone.list('PostCategory').model.find().populate('subcategories').sort('name').exec(function (err, results) {

			if (err || !results.length) {
				return next(err);
			}

			locals.data.categories = results;

			// Load the counts for each category
			async.each(locals.data.categories, function (category, next) {

				keystone.list('Post').model.count().where('categories').in([category.id]).exec(function (err, count) {
					category.postCount = count;
					next(err);
				});

			}, function (err) {
				next(err);
			});

		});

		});

	});

	// Save Rating
	view.on('post', { action: 'post-rating' }, function (next) {
		
		var ratingData = {
			userID: locals.formData.userId,
			postID: locals.formData.postId,
			rating: locals.formData.rating,
		}

		locals.ratings = new Rating.model(ratingData);
		locals.ratings.save(function (err) {
			if (err) {
				next(err);
			}
			var ratingsArr = [];
			ratingsArr.push(locals.ratings._id); 
			var q = keystone.list('Post').model.findOne({
				state: 'published',
				slug: locals.filters.post,
			});

			q.exec(function (err, result) {
				result.ratings.push(locals.ratings._id);
				result.save(function (err) {
					if (err){
						next(err);
					}
					return res.redirect(req.url);
				});	
			});

		});

	});

	// Render the view
	view.render('post');
};

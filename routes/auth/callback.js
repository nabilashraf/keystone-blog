var async = require('async'),
	_ = require('underscore'),
	request = require('request');

var passport = require('passport'),
  passportFacebookStrategy = require('passport-facebook').Strategy;

var keystone = require('keystone'),
  User = keystone.list('User');

exports = module.exports = function (req, res, next) {

    var redirect = req.cookies.target;
		var locals = res.locals;

    console.log('[services.facebook] - Callback workflow detected, attempting to process data...');
		console.log('------------------------------------------------------------');

		passport.authenticate('facebook', function(err, data, info) {
			
			if (err || !data) {
				console.log("Error retrieving Facebook account data - " + JSON.stringify(err));
				return res.redirect(redirect);
			}
			
			console.log('[services.facebook] - Successfully retrieved Facebook account data, processing...');
			console.log('------------------------------------------------------------');

			var name = data.profile && data.profile.displayName ? data.profile.displayName.split(' ') : [];
			
			var auth = {
				
				name: {
					first: name.length ? name[0] : '',
					last: name.length > 1 ? name[1] : ''
				},
				email: data.profile.emails.length ? _.first(data.profile.emails).value : null,
				profileId: data.profile.id,
				avatar: 'https://graph.facebook.com/' + data.profile.id + '/picture?width=600&height=600',
				accessToken: data.accessToken,
			}
			
			locals.authUser = auth;

			// Reject request if no auth data is stored in session
			if (!locals.authUser) {
				console.log('[auth.confirm] - No auth data detected, redirecting to signin.');
				console.log('------------------------------------------------------------');
				return res.redirect(req.cookies.target);
			}
			
			// Set existing user if already logged in
			if (req.user) {
				locals.existingUser = req.user;
			}
			
			// Function to handle signin
			var doSignIn = function() {
			
				console.log('[auth.confirm] - Signing in user...');
				console.log('------------------------------------------------------------');
				
				var onSuccess = function(user) {
					console.log('[auth.confirm] - Successfully signed in.');
					console.log('------------------------------------------------------------');
					return res.redirect(req.cookies.target);
				}
				
				var onFail = function(err) {
					console.log('[auth.confirm] - Failed signing in.', err);
					console.log('------------------------------------------------------------');
					req.flash('error', 'Sorry, there was an issue signing you in, please try again.');
					return res.redirect(req.cookies.target);
				}
				
				keystone.session.signin(String(locals.existingUser._id), req, res, onSuccess, onFail);
			
			}

			// Function to check if a user already exists for this profile id (and sign them in)
			var checkExisting = function(next) {
			
				if (locals.existingUser) return checkAuth();
				
				console.log('[auth.confirm] - Searching for existing users via facebook profile id...');
				console.log('------------------------------------------------------------');
				
				var query = User.model.findOne();
				query.where('facebook.profileId', locals.authUser.profileId);
				query.exec(function(err, user) {
						if (err) {
							console.log('[auth.confirm] - Error finding existing user via profile id.', err);
							console.log('------------------------------------------------------------');
							return next({ message: 'Sorry, there was an error processing your information, please try again.' });
						}
						if (user) {
							console.log('[auth.confirm] - Found existing user via facebook profile id...');
							console.log('------------------------------------------------------------');
							locals.existingUser = user;
							return doSignIn();
						}
						return checkAuth();
					});
			
			}
						
			// Function to handle data confirmation process
			var checkAuth = function() {
			
				async.series([
					// Check for user by email (only if not signed in)
					function(next) {
						
						if (locals.existingUser) return next();
						
						console.log('[auth.confirm] - Searching for existing users via [' + locals.authUser.email + '] email address...');
						console.log('------------------------------------------------------------');
						
						var query = User.model.findOne();
							query.where('email', locals.authUser.email);
							query.exec(function(err, user) {
								if (err) {
									console.log('[auth.confirm] - Error finding existing user via email.', err);
									console.log('------------------------------------------------------------');
									return next({ message: 'Sorry, there was an error processing your information, please try again.' });
								}
								if (user) {
									console.log('[auth.confirm] - Found existing user via email address...');
									console.log('------------------------------------------------------------');
									return next({ message: 'There\'s already an account with that email address, please sign-in instead.' });
								}
								return next();
							});
					
					},
					
					// Create or update user
					function(next) {
					
						if (locals.existingUser) {
						
							console.log('[auth.confirm] - Existing user found, updating...');
							console.log('------------------------------------------------------------');
							
							var userData = {
								facebook: {
									isConfigured : true,
									profileId : locals.authUser.profileId,
									avatar : locals.authUser.avatar,
									accessToken : locals.authUser.accessToken,
								}		
							};
							
							// console.log('[auth.confirm] - Existing user data:', userData);
							
							locals.existingUser.set(userData);
							
							locals.existingUser.save(function(err) {
								if (err) {
									console.log('[auth.confirm] - Error saving existing user.', err);
									console.log('------------------------------------------------------------');
									return next({ message: 'Sorry, there was an error processing your account, please try again.' });
								}
								console.log('[auth.confirm] - Saved existing user.');
								console.log('------------------------------------------------------------');
								return next();
							});
						
						} else {
						
							console.log('[auth.confirm] - Creating new user...');
							console.log('------------------------------------------------------------');
							
							var userData = {
								name: locals.authUser.name,
								email: locals.authUser.email,
								password: Math.random().toString(36).slice(-8),
								
							};
							
							userData.facebook = {
								isConfigured: true,
								profileId: locals.authUser.profileId,
								avatar: locals.authUser.avatar,
								accessToken: locals.authUser.accessToken
							}
							
							// console.log('[auth.confirm] - New user data:', userData );
							
							locals.existingUser = new User.model(userData);
							
							locals.existingUser.save(function(err) {
								if (err) {
									console.log('[auth.confirm] - Error saving new user.', err);
									console.log('------------------------------------------------------------');
									return next({ message: 'Sorry, there was an error processing your account, please try again.' });
								}
								console.log('[auth.confirm] - Saved new user.');
								console.log('------------------------------------------------------------');
								return next();
							});
							
						}
					
					},
					
					// Session
					function() {
						if (req.user) {
							console.log('[auth.confirm] - Already signed in, skipping sign in.');
							console.log('------------------------------------------------------------');
							return res.redirect(req.cookies.target);
						}
						return doSignIn();
					}
				
				], function(err) {
					if (err) {
						console.log('[auth.confirm] - Issue signing user in.', err);
						console.log('------------------------------------------------------------');
						req.flash('error', err.message || 'Sorry, there was an issue signing you in, please try again.');
						return res.redirect(req.cookies.target);
					}
				});
		}

		checkExisting(next);

  })(req, res, next);

}
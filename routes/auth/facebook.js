var async = require('async'),
  _ = require('underscore');

var passport = require('passport'),
  passportFacebookStrategy = require('passport-facebook').Strategy;

var keystone = require('keystone'),
  User = keystone.list('User');

var credentials = {
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/facebook/callback',
  profileFields: ['id', 'displayName', 'email']
};

exports = module.exports = function (req, res, next) {

  if (req.query.target) {
    console.log('Set target as [' + req.query.target + '].');
    res.cookie('target', req.query.target);
  }

  // Begin process
  console.log('============================================================');
  console.log('[services.facebook] - Triggered authentication process...');
  console.log('------------------------------------------------------------');

  // Initalise Facebook credentials
  var facebookStrategy = new passportFacebookStrategy(credentials, function (accessToken, refreshToken, profile, done) {
    done(null, {
      accessToken: accessToken,
      profile: profile
    });
  });

  // Pass through authentication to passport
  passport.use(facebookStrategy);

  console.log('[services.facebook] - Authentication workflow detected, attempting to request access...');
  console.log('------------------------------------------------------------');

  passport.authenticate('facebook', { scope: ['email'] })(req,res,next);
  
};


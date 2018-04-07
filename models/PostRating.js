var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * PostRating Model
 * ==================
 */

var PostRating = new keystone.List('PostRating');

PostRating.add({
	userID: { type: Types.Relationship, ref: 'User' },  
  postID: { type: Types.Relationship, ref: 'Post'},
  rating: { type: Number }
});

PostRating.relationship({ ref: 'Post', path: 'posts', refPath: 'ratings' });

PostRating.register();

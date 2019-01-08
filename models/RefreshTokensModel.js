const Schema = require('mongoose').Schema;
const database = require('../database');

const schema = new Schema({
  refresh_token: String,
  access_token: String,
  client_id: String,
  user_id: String,
  scopes: [String],
  expires: Date,
  timestamp: Date
});

const RefreshTokensModel = database.getConnection().model('oauth_refresh_tokens', schema);

module.exports = RefreshTokensModel;
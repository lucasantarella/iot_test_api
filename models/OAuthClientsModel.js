const Schema = require('mongoose').Schema;
const database = require('../database');

const schema = new Schema({
  client_id: String,
  client_secret: String,
  client_name: String,
  redirect_uri: String,
  scopes: [String]
});

const OAuthClientsModel = database.getConnection().model('oauth_clients', schema);

module.exports = OAuthClientsModel;
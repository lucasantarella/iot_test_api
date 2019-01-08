const Schema = require('mongoose').Schema;
const database = require('../database');

const schema = new Schema({
  code: String,
  client_id: String,
  state: String,
  timestamp: Date
});

const AuthCodeModel = database.getConnection().model('oauth_auth_codes', schema);

module.exports = AuthCodeModel;
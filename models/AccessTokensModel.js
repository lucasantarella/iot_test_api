const Schema = require('mongoose').Schema;
const jwt = require('jsonwebtoken');
const database = require('../database');
const fs = require('fs');

const schema = new Schema({
  access_token: String,
  client_id: String,
  user_id: String,
  scopes: [String],
  expires: Date,
  timestamp: Date
});

schema.method('toJWT', function () {
  return new Promise((fulfill, err) => {
    fs.readFile(__dirname + '/../private.pem', (err, cert) => {
      fulfill(jwt.sign({
        iss: 'com.lucasantarella.iot',
        iat: Math.floor(this.timestamp / 1000),
        exp: Math.floor(this.expires / 1000),
        aud: this.client_id,
        jti: this.access_token,
        sub: this.scopes.join(',')
      }, cert, {algorithm: 'RS256'}));
    });
  })
});

schema.method('toJWTSync', function () {
  const cert = fs.readFileSync(__dirname + '/../private.pem');
  return jwt.sign({
    iss: 'com.lucasantarella.iot',
    iat: Math.floor(this.timestamp / 1000),
    exp: Math.floor(this.expires / 1000),
    aud: this.client_id,
    jti: this.access_token,
    sub: this.scopes.join(',')
  }, cert, {algorithm: 'RS256'});
});

const AccessTokensModel = database.getConnection().model('oauth_access_tokens', schema);

module.exports = AccessTokensModel;
const Backbone = require('backbone');

const Users = new Backbone.Collection([
  {
    username: 'lucasantarella',
    email: 'luca.santarella@gmail.com',
    first_name: 'Luca',
    last_name: 'Santarella',
    password: 'test123'
  }
]);

const Clients = new Backbone.Collection([
  {
    client_id: 'o9PVSlG7EK',
    client_secret: 'a5cKCS4cLj',
    name: 'Google Actions Client',
    redirect_uri: 'https://oauth-redirect.googleusercontent.com/r/santarella-studios-1'
  },
  {
    client_id: 'postmanid',
    client_secret: 'postmansecret',
    name: 'Postman',
    redirect_uri: 'https://www.getpostman.com/oauth2/callback'
  }
]);

const AccessTokens = new Backbone.Collection();
const RefreshTokens = new Backbone.Collection();
const AuthorizationCodes = new Backbone.Collection();
const Devices = new Backbone.Collection();

exports.Users = Users;
exports.Clients = Clients;
exports.AccessTokens = AccessTokens;
exports.RefreshTokens = RefreshTokens;
exports.AuthorizationCodes = AuthorizationCodes;
exports.Devices = Devices;
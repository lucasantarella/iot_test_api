const Schema = require('mongoose').Schema;
const database = require('../database');
const bcrypt = require('bcrypt');

const schema = new Schema({
  username: String,
  password: String,
  name: {
    first_name: String,
    last_name: String,
  }
});

schema.method('setPasswordAndHash', function (password) {
  return bcrypt.hash(password, 10, null);
});

schema.method('verifyPassword', function (input) {
  return bcrypt.compare(input, this.password, null);
});

const UsersModel = database.getConnection().model('users', schema);

module.exports = UsersModel;
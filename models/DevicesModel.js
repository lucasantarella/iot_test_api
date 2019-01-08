const Schema = require('mongoose').Schema;
const database = require('../database');

const schema = new Schema({
  id: String,
  type: String,
  traits: [String],
  name: {
    defaultNames: [String],
    name: String,
    nicknames: [String]
  },
  willReportState: Boolean,
  attributes: {
    type: Map,
    of: String
  },
  deviceInfo: {
    type: Map,
    of: String
  },
  customData: {
    type: Map,
    of: String
  }
});

const AuthCodeModel = database.getConnection().model('devices', schema);

module.exports = AuthCodeModel;
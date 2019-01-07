const database = require('./../database');
const uuidv4 = require('uuid/v4');
const autobahn = require('autobahn');
const _ = require('underscore');
const {smarthome} = require('actions-on-google');

// Create an app instance
const googleApp = smarthome({
  debug: true
});

// Setup DB Connection
let db;
database.getConnection().then(client => {
  db = client.db(process.env.MONGO_DB)
});

// env
const ws_host = process.env.WS_HOST || 'iot.lucasantarella.com';
const ws_realm = process.env.WS_REALM || 'com.lucasantarella.iot';
const ws_port = process.env.WS_PORT || '9443';
const ws_wss = process.env.WS_WSS || 'wss';

let connection = new autobahn.Connection({
  url: ws_wss + '://' + ws_host + ':' + ws_port + '/',
  realm: ws_realm,
  tlsConfiguration: {}
});
connection.open();

// Sync Action
googleApp.onSync((body, headers) => {
  return db.collection('devices').find({}, {projection: {_id: 0}}).toArray().then(value => {
    return new Promise(function (fulfill, reject) {
      fulfill({
        requestId: uuidv4(),
        payload: {
          agentUserId: 'lucasantarella',
          devices: value
        }
      })
    })
  })
});


// Query Action
googleApp.onQuery((body, headers) => {
  // Get the device ids from the db
  return db.collection('devices').find({}, {projection: {id: 1}}).toArray().then(docs => {
    return new Promise(function (fulfill, reject) {
      // Check all of their statuses with autobahn
      let promises = [];
      _.each(docs, function (el) {
        promises.push(connection.session.call('com.lucasantarella.iot.devices.' + el.id + '.status'));
      });

      let statuses = {};
      Promise.all(promises).then(values => {
        _.each(values, function (status, index, list) {
          statuses[docs[index].id] = {
            "online": true,
            "on": status == 1
          };
        });

        fulfill({
          requestId: uuidv4(),
          payload: {
            devices: statuses
          }
        })
      });
    })
  })
});

module.exports = googleApp;
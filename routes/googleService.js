const database = require('./../database');
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
  db = client
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
        requestId: body.requestId,
        payload: {
          agentUserId: 'lucasantarella',
          devices: value
        }
      })
    })
  })
});

// Execute Action
googleApp.onExecute((body, headers) => {
  let promises = [];

  let payload = body.inputs[0].payload;

  // Iterate over all commands and process them
  payload.commands.forEach((command, index, array) => {
    // Get the ids
    let device_ids = [];
    command.devices.forEach(value => {
      device_ids.push(value.id);
    });

    // Iterate over all devices, executing the commands on them
    promises.push(db.collection('devices').find({"id": {$in: device_ids}}, {projection: {id: 1}}).toArray().then(docs => {
      let device_promises = [];
      _.each(docs, (el, index) => {
        device_promises.push(new Promise((fulfill, reject) => {
          connection.session.call('com.lucasantarella.iot.devices.' + el.id + '.execute', command.execution).then((state) => {
            // on success, report back
            fulfill(state);
          }).catch(() => {
            // otherwise, report back that device is offline
            fulfill({
              online: false
            })
          })
        }));
      });

      // Wait for all to complete
      return Promise.all(device_promises).then(states => {
        return new Promise(fulfill => {
          let resp = [];
          _.each(states, (state, index) => {
            if (state.online)
              resp.push({
                ids: [docs[index].id],
                status: "SUCCESS",
                states: state
              });
            else
              resp.push({
                ids: [docs[index].id],
                status: "OFFLINE",
                // states: state
              });
          });
          fulfill(resp);
        })
      })
    }));
  });

  // Return a promise that resolves into the desired format
  return Promise.all(promises).then(values => {
    return new Promise(function (fulfill, reject) {
      fulfill({
        requestId: body.requestId,
        payload: {
          commands: [].concat.apply([], values)
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
        promises.push(new Promise((fulfill, reject) => {
          connection.session.call('com.lucasantarella.iot.devices.' + el.id + '.status').then((state) => {
            // on success, report back
            fulfill(state);
          }).catch(() => {
            // otherwise, report back that device is offline
            fulfill({
              online: false
            })
          })
        }));
      });

      let statuses = {};
      Promise.all(promises).then(states => {
        _.each(states, function (state, index, list) {
          statuses[docs[index].id] = state;
        });

        fulfill({
          requestId: body.requestId,
          payload: {
            devices: statuses
          }
        })
      });
    })
  })
});

module.exports = googleApp;
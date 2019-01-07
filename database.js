const MongoClient = require('mongodb').MongoClient;
let _db;
module.exports = {
  getConnection: function (callback) {
    return MongoClient.connect('mongodb://' + process.env.MONGO_USER + ':' + process.env.MONGO_PASS + '@' + process.env.MONGO_HOST, {
      reconnectTries: Number.MAX_VALUE,
      autoReconnect: true,
      useNewUrlParser: true
    }).then(client => {
      _db = client;
      if (typeof callback === "function")
        callback(undefined, client);
      else
        return new Promise(function (fulfill, error) {
          fulfill(client)
        });
    }, reason => {
      if (typeof callback === "function")
        callback(reason);
      else
        return new Promise(function (fulfill, error) {
          error(reason)
        });
    });
  },

  getDb: function () {
    return _db;
  }
};
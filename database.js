const mongoose = require('mongoose');

let _conn;

module.exports = {
  getConnection: () => {
    if (_conn === undefined) {
      _conn = mongoose.createConnection('mongodb://' + process.env.MONGO_USER + ':' + process.env.MONGO_PASS + '@' + process.env.MONGO_HOST + ':' + (process.env.MONGO_PORT || 27017),
        {
          keepAlive: true,
          keepAliveInitialDelay: 300000,
          useNewUrlParser: true,
          dbName: process.env.MONGO_DB
        });
    }
    return _conn;
  }
};
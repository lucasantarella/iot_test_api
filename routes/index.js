const express = require('express');
const router = express.Router();
const models = require('../models');

/* GET home page. */
router.get('/devices', function (req, res, next) {
  // Query devices and respond
  models.DeviceModel.find({}, {_id: 0}).exec().then(value => {
    res.json(value)
  });
});
router.get('/devices/:deviceId', function (req, res, next) {
  // Query device and respond
  models.DeviceModel.findOne({id: req.params.deviceId}, {_id: 0}).exec().then(value => {
      res.json(value)
    },
    err => {
      // TODO: Fix this
      next(err)
    });
});
router.post('/devices', function (req, res, next) {
  models.DeviceModel.findOneAndUpdate({id: req.body.id}, req.body, {
    upsert: true,
    projection: {_id: 0}
  }).then(value => {
    res.send(value)
  }, err => {
    console.log(err)
  });
});

module.exports = router;
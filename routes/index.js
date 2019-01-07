const express = require('express');
const router = express.Router();
const Backbone = require('backbone');

/* GET home page. */
router.get('/devices', function (req, res, next) {
  req.db.collection('devices').find({}, {projection: {_id: 0}}).toArray().then(value => {
    res.json(value)
  });
});
router.get('/devices/:deviceId', function (req, res, next) {
  let model = req.datastore.Devices.findWhere({uuid: req.params.deviceId});
  if (model !== undefined)
    res.json(model);
  else
    res.send('', 404);
});
router.post('/devices', function (req, res, next) {
  req.db.collection('devices').findOneAndUpdate({id: req.body.id}, req.body, {
    upsert: true,
    projection: {_id: 0}
  }).then(value => {
    res.send(value)
  }, reason => {
    console.log(reason)
  });
});

module.exports = router;
const express = require('express');
const router = express.Router();
const Backbone = require('backbone');

/* GET home page. */
router.get('/devices', function (req, res, next) {
  res.json(req.datastore.Devices);
});
router.get('/devices/:deviceId', function (req, res, next) {
  let model = req.datastore.Devices.findWhere({uuid: req.params.deviceId});
  if(model !== undefined)
    res.json(model);
  else
    res.send('', 404);
});
router.post('/devices', function (req, res, next) {
  req.datastore.Devices.add(new Backbone.Model(req.body));
  res.send('', 200);
});

module.exports = router;
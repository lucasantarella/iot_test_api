const express = require('express');
const router = express.Router();
const uuidv4 = require('uuid/v4');
const Backbone = require('backbone');
const querystring = require('querystring');
const {
  AuthCodeModel,
  AccessTokensModel,
  OAuthClientsModel,
  RefreshTokensModel,
  UsersModel
} = require('../models');

/* Oauth Routes */
router.get('/authorize', function (req, res, next) {
  // Make sure all required parameters are set
  if (
    req.query.client_id === undefined ||
    req.query.state === undefined ||
    req.query.redirect_uri === undefined ||
    req.query.response_type !== 'code'
  ) {
    console.log('400 BAD REQUEST - ' + JSON.stringify(req.query));
    return res.send('', 400);
  }

  // Get the client
  OAuthClientsModel.findOne({client_id: req.query.client_id}).exec().then((client) => {
    console.log(client);
    // Verify
    if (client.redirect_uri !== req.query.redirect_uri)
      return res.send('', 401);

    // Generate an auth code
    let authCode = new AuthCodeModel({
      code: uuidv4(),
      state: req.query.state,
      client_id: client.client_id
    });

    authCode.save().then(() => {
      // Set the state in the session
      req.session.oauth2_state = req.query.state;
      req.session.save();

      return res.redirect('/auth/login');
    }).catch(err => {
      return res.send(err, 401);
    });
  }).catch(err => {
    return res.send(err, 401);
  });
});

// oauth token route
router.post('/token', function (req, res, next) {
  // Make sure all required parameters are set
  if (
    req.body.client_id === undefined ||
    req.body.client_secret === undefined ||
    req.body.grant_type === undefined
  ) {
    console.log('400 BAD REQUEST - ' + JSON.stringify(req.query));
    return res.send('', 400);
  }

  // get the client
  OAuthClientsModel.findOne({
    client_id: req.body.client_id,
    client_secret: req.body.client_secret
  }).exec().then((client) => {
    // process each grant type
    switch (req.body.grant_type) {
      case 'authorization_code':
        // make sure a redirect uri & code are specified
        if (
          req.body.redirect_uri === undefined ||
          req.body.code === undefined
        )
          return res.send('', 400);

        // verify the client
        if (client.redirect_uri !== req.body.redirect_uri)
          return res.send('', 401);

        // get auth code
        AuthCodeModel.findOne({code: req.body.code}).exec().then(auth_code => {
          console.log(auth_code);
          // generate an access token
          let access_token = new AccessTokensModel({
            access_token: uuidv4(),
            client_id: client.client_id,
            expires: new Date(new Date().getTime() + (1000 * 60 * 60)),
            username: auth_code.username
          });
          access_token.save(); // do this in background

          // generate a refresh token
          let refresh_token = new RefreshTokensModel({
            refresh_token: uuidv4(),
            client_id: client.client_id,
            access_token: access_token.access_token,
            expires: new Date(new Date().getTime() + (7 * 24 * 1000 * 60 * 60)),
          });
          refresh_token.save(); // do this in background

          // remove the auth token (to invalidate it)
          auth_code.remove(); // do this in background

          return res.json({
            access_token: access_token.toJWTSync(),
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: refresh_token.refresh_token
          });
        }).catch(err => {
          return res.send(err, 401);
        });
        break;
      case 'refresh_token':
        // make sure a refresh token is specified
        if (
          req.body.refresh_token === undefined
        )
          return res.send('', 400);

        // find refresh token
        RefreshTokensModel.findOne({
          refresh_token: req.body.refresh_token,
          client_id: req.body.client_id
        }).exec().then(refresh_token => {
          // token expiry
          if (refresh_token.expires <= new Date())
            return res.send('The refresh token has expired', 401);

          // get the access token from the refresh token
          AccessTokensModel.findOne({
            access_token: refresh_token.access_token,
            client_id: req.body.client_id
          }).exec().then(access_token => {
            // generate an access token
            let new_access_token = new AccessTokensModel({
              access_token: uuidv4(),
              client_id: client.client_id,
              expires: new Date(new Date().getTime() + (1000 * 60 * 60)),
              username: access_token.username
            });
            new_access_token.save(); // do this in background

            // generate a refresh token
            let new_refresh_token = new RefreshTokensModel({
              refresh_token: uuidv4(),
              client_id: client.client_id,
              access_token: new_access_token.access_token,
              expires: new Date(new Date().getTime() + (7 * 24 * 1000 * 60 * 60)),
            });
            new_refresh_token.save(); // do this in background

            // Remove the old tokens (to invalidate it)
            access_token.remove();
            refresh_token.remove();

            return res.json({
              access_token: new_access_token.toJWTSync(),
              token_type: 'Bearer',
              expires_in: 3600,
              refresh_token: new_refresh_token.refresh_token
            });
          }).catch(err => {
            return res.send(err, 401);
          });
        }).catch(err => {
          return res.send(err, 401);
        });
        break;
      default:
        // unable to handle grant type
        return res.send("The server is unable to handle that grant type.", 400);
    }
  }).catch(err => {
    return res.send(err, 401);
  });
});

// frontend login routes
router.get('/login', function (req, res, next) {
  res.render('login', {title: 'Login'});
});
router.post('/login', function (req, res, next) {
  // make sure all required parameters are set
  if (
    req.body.username === undefined ||
    req.body.password === undefined
  ) {
    console.log('400 BAD REQUEST - ' + JSON.stringify(req.query));
    return res.send('', 400);
  }

  UsersModel.findOne({username: req.body.username}).exec().then(user => {
    // verify the user
    user.verifyPassword(req.body.password).then(() => {
      // password is correct
      // get the auth code by state and associate it with the user
      AuthCodeModel.findOne({state: req.session.oauth2_state}).exec().then(auth_code => {
        auth_code.username = user.username;
        auth_code.save(); // async, do this in the background

        // get the client from the auth code and redirect to the redirect uri
        OAuthClientsModel.findOne({client_id: auth_code.client_id}).exec().then(client => {
          // build up redirect uri
          let uri = client.redirect_uri + '?' + querystring.stringify({
            code: auth_code.code,
            state: auth_code.state
          });

          // remove state from session
          req.session.state = undefined;

          // send
          res.redirect(uri);
        });
      }).catch(err => {
        return res.send(err, 401);
      });
    });
  }).catch(err => {
    return res.send(err, 401);
  });


});

module.exports = router;
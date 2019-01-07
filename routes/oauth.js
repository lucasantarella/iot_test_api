const express = require('express');
const router = express.Router();
const uuidv4 = require('uuid/v4');
const Backbone = require('backbone');
const querystring = require('querystring');

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
  let client = req.datastore.Clients.findWhere({client_id: req.query.client_id});
  if (client === undefined || client.get('redirect_uri') !== req.query.redirect_uri)
    return res.send('', 401);

  // Generate an auth code
  let auth_code = uuidv4();
  req.datastore.AuthorizationCodes.add({
    code: auth_code,
    state: req.query.state,
    client_id: client.get('client_id')
  });

  // Set the state in the session
  req.session.oauth2_state = req.query.state;
  req.session.save();

  return res.redirect('/auth/login');
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

  // Get the client
  let client = req.datastore.Clients.findWhere({client_id: req.body.client_id, client_secret: req.body.client_secret});
  if (client === undefined)
    return res.send('', 401);

  // Process each grant type
  switch (req.body.grant_type) {
    case 'authorization_code':
      // Make sure a redirect uri & code are specified
      if (
        req.body.redirect_uri === undefined ||
        req.body.code === undefined
      )
        return res.send('', 400);

      if (client.get('redirect_uri') !== req.body.redirect_uri)
        return res.send('', 401);

      // Find auth code
      let auth_code = req.datastore.AuthorizationCodes.findWhere({code: req.body.code, client_id: req.body.client_id});
      if (auth_code === undefined)
        return res.send('', 401);

      // Generate an access token
      let access_token = new Backbone.Model({
        access_token: uuidv4(),
        client_id: client.get('client_id'),
        username: auth_code.get('username')
      });
      req.datastore.AccessTokens.add(access_token);

      // Generate a refresh token
      let refresh_token = new Backbone.Model({
        refresh_token: uuidv4(),
        client_id: client.get('client_id'),
        access_token: access_token.get('access_token'),
      });
      req.datastore.RefreshTokens.add(refresh_token);

      // Remove the auth token (to invalidate it)
      auth_code.destroy();

      return res.json({
        access_token: access_token.get('access_token'),
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: refresh_token.get('refresh_token')
      });

    case 'refresh_token':
      // Make sure a redirect uri & code are specified
      if (
        req.body.refresh_token === undefined
      )
        return res.send('', 400);

      // Find refresh token
      let old_refresh_token = req.datastore.RefreshTokens.findWhere({
        refresh_token: req.body.refresh_token,
        client_id: req.body.client_id
      });
      if (old_refresh_token === undefined)
        return res.send('', 401);

      // Get the access token from the refresh token
      let old_access_token = req.datastore.AccessTokens.findWhere({
        access_token: old_refresh_token.get('access_token'),
        client_id: req.body.client_id
      });
      if (old_access_token === undefined)
        return res.send('', 401);

      // Generate an access token
      let new_access_token = new Backbone.Model({
        access_token: uuidv4(),
        client_id: client.get('client_id'),
        username: old_access_token.get('username')
      });
      req.datastore.AccessTokens.add(new_access_token);

      // Generate a refresh token
      let new_refresh_token = new Backbone.Model({
        refresh_token: uuidv4(),
        client_id: client.get('client_id'),
        access_token: new_access_token.get('access_token'),
      });
      req.datastore.RefreshTokens.add(new_refresh_token);

      // Remove the old tokens (to invalidate it)
      old_access_token.destroy();
      old_refresh_token.destroy();

      return res.json({
        access_token: new_access_token.get('access_token'),
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: new_refresh_token.get('refresh_token')
      });

  }
});

// frontend login routes
router.get('/login', function (req, res, next) {
  res.render('login', {title: 'Login'});
});

router.post('/login', function (req, res, next) {
  // Make sure all required parameters are set
  if (
    req.body.username === undefined ||
    req.body.password === undefined
  ) {
    console.log('400 BAD REQUEST - ' + JSON.stringify(req.query));
    return res.send('', 400);
  }

  let user = req.datastore.Users.findWhere({
    username: req.body.username,
    password: req.body.password
  });

  if (user === undefined)
    res.send('Login failed!', 401);

  // Get the auth code by state and associate it with the user
  let auth_code = req.datastore.AuthorizationCodes.findWhere({state: req.session.oauth2_state});
  auth_code.set('username', user.get('username'));

  // Get the client from the auth code and redirect to the redirect uri
  let client = req.datastore.Clients.findWhere({client_id: auth_code.get('client_id')});

  // Build up redirect uri
  let uri = client.get('redirect_uri') + '?' + querystring.stringify({
    code: auth_code.get('code'),
    state: auth_code.get('state')
  });

  // Remove state from session
  req.session.state = undefined;

  res.redirect(uri);
});

module.exports = router;
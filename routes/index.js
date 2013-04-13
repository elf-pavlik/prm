var https = require('https'),
    cradle = require('cradle'),
    qs = require('qs');
/*
 * GET home page.
 */

exports.index = function(req, resp){
  resp.render('index', { title: 'Express', user: req.session.email, csrf: req.session._csrf })
};

exports.auth = function (audience) {
  return function(req, resp){
    function onVerifyResp(bidRes) {
      var data = "";
      bidRes.setEncoding('utf8');
      bidRes.on('data', function (chunk) {
        data += chunk;
      });
      bidRes.on('end', function () {
        var verified = JSON.parse(data);
        resp.contentType('application/json');
        if (verified.status == 'okay') {
          console.info('browserid auth successful, setting req.session.email');
          req.session.email = verified.email;
          resp.redirect('/show');
        } else {
          console.error(verified.reason);
          resp.writeHead(403);
        }
        resp.write(data);
        resp.end();
      });
    };

    var assertion = req.body.assertion;

    var body = qs.stringify({
      assertion: assertion,
      audience: audience
    });
    console.info('verifying with browserid');
    var request = https.request({
      host: 'verifier.login.persona.org',
      path: '/verify',
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'content-length': body.length
      }
    }, onVerifyResp);
    request.write(body);
    request.end();
  };
};

exports.show = function (req, resp) {
  if(req.session.email) {
    var db = new(cradle.Connection)().database('ouishare');
    db.view('peer/byEmail', { key: req.session.email }, function (err, doc) {
      if (err) {
        console.info(err);
        // Handle error
      } else {
        resp.render('show', { peer: doc[0].value, user: req.session.email, csrf: req.session._csrf })
      }
    });
  } else {
    resp.redirect('/');
  }
};

exports.logout = function (req, resp) {
  req.session.destroy();
  resp.redirect('/');
};

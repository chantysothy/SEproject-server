// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: loopback-example-ssl
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

var loopback = require('loopback');
var boot = require('loopback-boot');
var app = module.exports = loopback();
var cookieParser = require('cookie-parser');
var session = require('express-session');

var path = require('path');

var http = require('http');
var https = require('https');
var sslConfig = require('./ssl/ssl-cert');
// var httpsRedirect = require('./middleware/https-redirect');

// Passport configurators..
var loopbackPassport = require('loopback-component-passport');
var PassportConfigurator = loopbackPassport.PassportConfigurator;
var passportConfigurator = new PassportConfigurator(app);

/*
 * body-parser is a piece of express middleware that
 *   reads a form's input and stores it as a javascript
 *   object accessible through `req.body`
 *
 */
// var bodyParser = require('body-parser');

/**
 * Flash messages for passport
 *
 * Setting the failureFlash option to true instructs Passport to flash an
 * error message using the message given by the strategy's verify callback,
 * if any. This is often the best approach, because the verify callback
 * can make the most accurate determination of why authentication failed.
 */
// var flash = require('express-flash');

// attempt to build the providers/passport config
var config = {};
try {
    config = require('./providers.json');
} catch (err) {
    console.trace(err);
    process.exit(1); // fatal
}

app.set('view engine', 'ejs'); // LoopBack comes with EJS out-of-box
app.set('json spaces', 2); // format json responses for easier viewing

// boot scripts mount components like REST API
boot(app, __dirname);

// to support JSON-encoded bodies
// app.middleware('parse', bodyParser.json());
// to support URL-encoded bodies
// app.middleware('parse', bodyParser.urlencoded({
//     extended: true
// }));

// The access token is only available after boot
// app.middleware('auth', loopback.token({
//     model: app.models.AuthToken
// }));

// app.middleware("routes:before", "/", httpsRedirect({ httpsPort: app.get('https-port') }));

// app.middleware('session:before', cookieParser(app.get('cookieSecret')));
// app.middleware('session', session({
//     secret           : 'kitty',
//     saveUninitialized: true,
//     resave           : true,
//     cookie           : { httpOnly: false }
// }));
passportConfigurator.init();

// We need flash messages to see passport errors
// app.use(flash());

passportConfigurator.setupModels({
    userModel          : app.models.Profile,
    userIdentityModel  : app.models.ProfileIdentity,
    userCredentialModel: app.models.ProfileCredential
});
for (var s in config) {
    var c = config[s];
    c.session = c.session !== false;
    passportConfigurator.configureProvider(s, c);
}

app.start = function (httpOnly) {
    if (httpOnly === undefined) {
        httpOnly = process.env.HTTP;
    }
    var options = {
        key : sslConfig.privateKey,
        cert: sslConfig.certificate
    };
    http.createServer(app).listen(app.get('port'), function () {
        var baseUrl = (httpOnly ? 'http://' : 'https://') + app.get('host') + ':' + app.get('port');
        app.emit('started', baseUrl);
        console.log('LoopBack server listening @ %s%s', baseUrl, '/');
        if (app.get('loopback-component-explorer')) {
            var explorerPath = app.get('loopback-component-explorer').mountPath;
            console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
        }

        // red
    });
};

// start the server if `$ node server.js`
if (require.main === module) {
    app.start();
}

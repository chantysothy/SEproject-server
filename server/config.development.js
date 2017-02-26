/**
 * Created by popeye on 11/9/2016 AD.
 */
"use strict";

var p = require('../package.json');
var version = p.version.split('.').shift();

module.exports = {
    restApiRoot: '/api' + (version > 0 ? '/v' + version : ''),
    host       : process.env.HOST || 'localhost',
    port       : process.env.PORT || 3000
};

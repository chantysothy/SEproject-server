/**
 * Created by popeye on 1/25/2017 AD.
 */

module.exports = function () {
    
    return function (req, res, next) {
        res.set('Last-Modified', (new Date()).toUTCString());
        next();
    }
};

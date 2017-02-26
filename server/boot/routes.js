/**
 * Created by popeye on 11/16/2016 AD.
 */

var globalization = require('strong-globalize')();
var _ = require("lodash");

module.exports = function (app) {
    
    // Install a "/ping" route that returns "pong"
    app.get('/ping', function (req, res) {
        res.send('pong');
    });
    
    app.get('/auth/facebook/after-callback', function (req, res) {
        var findingKey = "; userId=",
            userId     = req.headers.cookie.substring(req.headers.cookie.indexOf(findingKey) + findingKey.length, req.headers.cookie.length);
        if (!_.isEmpty(userId)) {
            var Profile = app.models.Profile;
            Profile.findById(userId, function (err, profile) {
                if (err) return next(err);
                profile.identities({ where: { provider: "facebook" } }, function (err, identities) {
                    if (err) return throwError(res, err.status, err.code, err.message);
                    else {
                        var identity = identities[0].profile;
                        profile.firstName = identity.name.givenName;
                        profile.lastName = identity.name.familyName;
                        profile.avatarUrl = "https://graph.facebook.com/" + identity.id + "/picture?type=large";
                        profile.status = "active";
                        profile.emailVerified = true;
                        profile.email = identity.emails[0].value;
                        profile.save(function (err) {
                            if (err) return throwError(res, err.status, err.code, err.message);
                            else {
                                var Role        = app.models.Role,
                                    RoleMapping = app.models.RoleMapping;
                                
                                // Check is the user already have role
                                RoleMapping.findOne({
                                    where: {
                                        and: [
                                            { principalType: RoleMapping.USER },
                                            { principalId: profile.id }
                                        ]
                                    }
                                }, function (err, roleMapping) {
                                    if (err) return throwError(res, err.status, err.code, err.message);
                                    else if (_.isEmpty(roleMapping)) {
                                        // If Empty we create new role mapping
                                        Role.findOne({
                                            where: { name: "people" }
                                        }, function (err, role) {
                                            if (err) return throwError(res, err.status, err.code, err.message);
                                            else {
                                                console.log(role.name);
                                                role.principals.create({
                                                    principalType: RoleMapping.USER,
                                                    principalId  : profile.id,
                                                    roleId       : role.id
                                                }, function (err) {
                                                    if (err) return throwError(res, err.status, err.code, err.message);
                                                    else {
                                                        console.log("> role attached:", role);
                                                        return res.redirect("/#/auth/callback");
                                                    }
                                                });
                                            }
                                        });
                                    }
                                    else {
                                        // Already have role we redirect to login on client
                                        return res.redirect("/#/auth/callback");
                                    }
                                });
                            }
                        });
                    }
                });
            });
        }
        else {
            return throwError(res, 500, 'COOKIE_NOT_SET', 'Cookie not set');
        }
    });
    
    function throwError (res, statusCode, code, text) {
        var internal_err = new Error(globalization.f(text));
        internal_err.statusCode = statusCode;
        internal_err.code = code;
        return res.status(statusCode).json(internal_err);
    }
};

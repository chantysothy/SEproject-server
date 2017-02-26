'use strict';

var config = require('../../server/config.json');
var ejs = require('ejs');
var path = require("path");
var globalization = require('strong-globalize')();
var _ = require("lodash");

module.exports = function (Profile) {
    
    function attachRole (profileInstance, userId, next) {
        var Role        = Profile.app.models.Role,
            RoleMapping = Profile.app.models.RoleMapping;
        RoleMapping.findOne({
            where: {
                and: [
                    { principalType: RoleMapping.USER },
                    { principalId: userId }
                ]
            }
        }, function (err, roleMapping) {
            if (err) return next(err);
            Role.findOne({
                where: {
                    id: roleMapping.roleId
                }
            }, function (err, role) {
                if (err) return next(err);
                profileInstance.role = role;
                next();
            });
        });
    }
    
    function sendEmail (profileInstance, options, next) {
        if (!profileInstance.emailVerified) {
            profileInstance.verify(options, function (err, response) {
                if (err) return next(err);
                
                console.log("> verification email sent:", response);
                
                return next();
            });
        }
        else {
            return next();
        }
    }
    
    Profile.beforeRemote("findOne", function (context, profileInstance, next) {
        
        var RoleMapping = Profile.app.models.RoleMapping;
        var Role = Profile.app.models.Role;
        RoleMapping.findOne({
            where: {
                and: [
                    { principalType: RoleMapping.USER },
                    { principalId: context.req.accessToken.userId }
                ]
            }
        }, function (err, roleMapping) {
            if (err) return next(err);
            Role.findOne({
                where: {
                    id: roleMapping.roleId
                }
            }, function (err, role) {
                if (err) return next(err);
                if (role.name === "admin") next();
                else {
                    var query = context.args.filter;
                    if (typeof context.args.filter === "string") {
                        query = JSON.parse(context.args.filter);
                    }
                    if (query && context.req.accessToken.userId === query.where.id) {
                        next();
                    }
                    else {
                        var internal_err = new Error(globalization.f('Unauthorized access %s, user can only access their own data', profileInstance.userId));
                        internal_err.statusCode = 401;
                        internal_err.code = 'UNAUTHORIZED_ACCESS';
                        return next(internal_err);
                    }
                }
            });
        });
    });
    
    Profile.beforeRemote("create", function (context, profileInstance, next) {
        
        if (!context.req.body.role) {
            var internal_err = new Error(globalization.f('role %s not found', context.req.body.role));
            internal_err.statusCode = 404;
            internal_err.code = 'ROLE_NOT_FOUND';
            return next(internal_err);
        }
        
        next();
    });
    
    Profile.afterRemote("create", function (context, profileInstance, next) {
        console.log("> Profile.afterRemote crete triggered");
        
        var options = {
            type    : "email",
            port    : config["port"],
            to      : profileInstance.email,
            protocol: "http",
            from    : "noreply.cmmu@gmail.com",
            subject : "Thanks for registering.",
            template: path.resolve(__dirname, '../../server/views/verify.ejs'),
            redirect: encodeURIComponent("/#/confirmed-email"),
            user    : profileInstance
        };
        
        var Role        = Profile.app.models.Role,
            RoleMapping = Profile.app.models.RoleMapping;
        Role.findOne({
            where: {
                name: context.req.body.role
            }
        }, function (err, role) {
            if (err) return next(err);
            
            role.principals.create({
                principalType: RoleMapping.USER,
                principalId  : profileInstance.id,
                roleId       : role.id
            }, function (err) {
                if (err) return next(err);
                
                console.log("> role attached:", role);
                
                if (!_.isEmpty(context.req.accessToken)) {
                    RoleMapping.findOne({
                        where: {
                            and: [
                                { principalType: RoleMapping.USER },
                                { principalId: context.req.accessToken.userId }
                            ]
                        }
                    }, function (err, roleMapping) {
                        if (err) return next(err);
                        Role.findOne({
                            where: {
                                id: roleMapping.roleId
                            }
                        }, function (err, role) {
                            if (err) return next(err);
                            else if (role.name === "admin") {
                                // If admin adding user we'll automatically set verified email
                                profileInstance.updateAttribute("emailVerified", true, function (err) {
                                    if (err) return next(err);
                                    else sendEmail(profileInstance, options, next);
                                });
                            }
                            else sendEmail(profileInstance, options, next);
                        });
                    });
                }
                else sendEmail(profileInstance, options, next);
            });
        });
    });
    
    Profile.afterRemote("login", function (context, profileInstance, next) {
        console.log("> Profile.afterRemote login triggered");
        
        attachRole(profileInstance, profileInstance.userId, next);
    });
    
    Profile.afterRemote("findOne", function (context, profileInstance, next) {
        attachRole(profileInstance, profileInstance.id, next);
    });
    
    //send password reset link when requested
    Profile.on('resetPasswordRequest', function (info) {
        console.log("> In reset password request");
        
        var url = 'http://' + config.host + ':' + config["port"] + '/#/reset-password';
        var link = url + '?accessToken=' + info.accessToken.id;
        
        ejs.renderFile(path.resolve(__dirname, '../../server/views/resetPassword.ejs'), { link: link }, function (err, data) {
            if (err) return console.log("> error rendering email template, while sending password reset email");
            
            Profile.app.models.Email.send({
                port    : config["port"],
                to      : info.email,
                protocol: "http",
                from    : "noreply.cmmu@gmail.com",
                subject : 'Password reset',
                html    : data
            }, function (err) {
                if (err) return console.log('> error sending password reset email');
                console.log('> sending password reset email to:', info.email);
            });
        });
    });
    
    Profile.replacePassword = function (options, callback) {
        var internal_err = null;
        if (!options.accessToken) {
            internal_err = new Error(globalization.f('Invalid token: %s', options.accessToken));
            internal_err.statusCode = 400;
            internal_err.code = 'INVALID_TOKEN';
            return callback(internal_err);
        }
        
        //verify passwords match
        if (!options.password) {
            internal_err = new Error(globalization.f('Password is required'));
            internal_err.statusCode = 400;
            internal_err.code = 'PASSWORD_REQUIRED';
            return callback(internal_err);
        }
        var AccessToken = Profile.app.models.AccessToken;
        AccessToken.findById(options.accessToken, function (err, accessToken) {
            if (err) {
                console.log("Error thrown in find accessToken", err);
                internal_err = new Error(globalization.f('Access token does not exist'));
                internal_err.statusCode = 404;
                internal_err.code = 'TOKEN_NOT_FOUND';
                return callback(internal_err);
            }
            Profile.findById(accessToken.userId, function (err, profile) {
                if (err) {
                    console.log("Error thrown in find user", err);
                    internal_err = new Error(globalization.f('User with access token does not exist'));
                    internal_err.statusCode = 404;
                    internal_err.code = 'USER_NOT_FOUND';
                    return callback(internal_err);
                }
                
                profile.updateAttribute("password", options.password, function (err, profile) {
                    if (err) {
                        console.log("Error thow in update password", err);
                        internal_err = new Error(globalization.f('Internal server error'));
                        internal_err.statusCode = 500;
                        internal_err.code = 'INTERNAL_ERROR';
                        return callback(internal_err);
                    }
                    
                    console.log('> password reset processed successfully');
                    return callback(err);
                });
            });
        });
    };
    
    Profile.remoteMethod(
        "replacePassword",
        {
            http       : { path: "/replacePassword", verb: "post", status: 200 },
            accepts    : [
                {
                    arg        : "options",
                    type       : "object",
                    description: "Access token from reset password email, with new Password",
                    required   : true,
                    http       : { source: 'body' }
                }
            ],
            description: "The is endpoint for change the password with accept token"
        }
    );
    
    Profile.changePassword = function (ctx, options, cb) {
        var newErrMsg, newErr;
        try {
            Profile.findOne({ where: { id: ctx.req.accessToken.userId } }, function (err, user) {
                if (err) {
                    cb(err);
                }
                else if (!user) {
                    newErrMsg = "No match between provided current logged user";
                    newErr = new Error(newErrMsg);
                    newErr.statusCode = 404;
                    newErr.code = 'USER_NOT_FOUND';
                    cb(newErr);
                }
                else {
                    user.hasPassword(options.oldPassword, function (err, isMatch) {
                        if (isMatch) {
                            
                            user.updateAttributes({ 'password': options.newPassword }, function (err, instance) {
                                if (err) {
                                    cb(err);
                                }
                                else {
                                    cb(null, true);
                                }
                            });
                        }
                        else {
                            newErrMsg = 'User specified wrong current password !';
                            newErr = new Error(newErrMsg);
                            newErr.statusCode = 401;
                            newErr.code = 'LOGIN_FAILED_PWD';
                            return cb(newErr);
                        }
                    });
                }
            });
        } catch (err) {
            console.log("> Profile.changePassword error: ", err);
            cb(err);
        }
    };
    
    Profile.remoteMethod(
        'changePassword',
        {
            description: "Allows a logged user to change his/her password.",
            http       : { path: "/changePassword", verb: "put", status: 200 },
            accepts    : [
                { arg: 'ctx', type: 'object', http: { source: 'context' } },
                {
                    arg        : "options",
                    type       : "object",
                    description: "object with oldPassword, newPassword",
                    required   : true,
                    http       : { source: 'body' }
                }
            ],
            returns    : { arg: 'passwordChange', type: 'boolean' }
        }
    );
};

'use strict';

var _ = require("lodash");
var async = require("async");
var Promise = require("promise");

module.exports = function (InstructorCourse) {
    
    function clearUnSelectedInstructor (options, next) {
        
        var courseId = options[0].courseId;
        
        InstructorCourse.find({
            where: {
                courseId: courseId
            }
        }, function (err, instructorCourses) {
            if (err) next(err);
            else if (!_.isEmpty(instructorCourses)) {
                async.eachSeries(instructorCourses, function (object, callback) {
                    
                    var found = _.find(options, function (each) {
                        return each.instructorId === object.instructorId;
                    });
                    
                    if (_.isEmpty(found)) {
                        InstructorCourse.destroyById(object.id,
                            function (err) {
                                if (err) next(err);
                                else {
                                    callback();
                                }
                            });
                    } else {
                        callback();
                    }
                }, function () {
                    next();
                });
            }
            else {
                next();
            }
        });
    }
    
    InstructorCourse.createMultiple = function (ctx, options, next) {
        var newErrMsg, newErr;
        try {
            if (!_.isArray(options)) {
                newErrMsg = "InstructorCourse List is not an array";
                newErr = new Error(newErrMsg);
                newErr.statusCode = 403;
                newErr.code = 'EMPTY_INSTRUCTOR_COURSE_LIST';
                cb(newErr);
            }
            else {
                async.eachSeries(options, function (object, callback) {
                    
                    InstructorCourse.findOne({
                        where: {
                            and: [
                                { instructorId: object.instructorId },
                                { courseId: object.courseId }
                            ]
                        }
                    }, function (err, instructorCourse) {
                        if (err) next(err);
                        else if (_.isEmpty(instructorCourse)) {
                            InstructorCourse.create({
                                order       : object.order,
                                instructorId: object.instructorId,
                                courseId    : object.courseId
                            }, function (err) {
                                if (err) next(err);
                                else {
                                    object.markAdded = true;
                                    callback();
                                }
                            });
                        }
                        else {
                            instructorCourse.updateAttribute("order", object.order,
                                function (err) {
                                    if (err) next(err);
                                    else {
                                        object.markAdded = true;
                                        callback();
                                    }
                                });
                        }
                    });
                }, function () {
                    clearUnSelectedInstructor(options, next);
                    
                });
            }
        } catch (err) {
            console.log("> InstructorCourse.createMultiple error: ", err);
            cb(err);
        }
    };
    
    InstructorCourse.remoteMethod(
        'createMultiple',
        {
            description: "Create multiple InstructorCourses instances from array",
            http       : { path: "/createMultiple", verb: "post", status: 200 },
            accepts    : [
                { arg: 'ctx', type: 'object', http: { source: 'context' } },
                {
                    arg        : "options",
                    type       : "array",
                    description: "array of InstructorCourse",
                    required   : true,
                    http       : { source: 'body' }
                }
            ],
            returns    : { arg: 'createMultiple', type: 'boolean' }
        }
    );
};

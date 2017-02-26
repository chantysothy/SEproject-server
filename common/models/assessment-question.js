'use strict';

var _ = require('lodash');
var async = require("async");
var Promise = require("promise");

module.exports = function (AssessmentQuestion) {
    
    AssessmentQuestion.afterRemote("create", function (context, instance, next) {
        console.log("> AssessmentQuestion.afterRemote crete triggered");
        
        if (instance.__data.prev) {
            // If Add with previous object we update the link
            AssessmentQuestion.findOne({
                where: {
                    id: instance.__data.prev
                }
            }, function (err, previousObj) {
                if (err) next(err);
                else {
                    previousObj.next = instance.id;
                    previousObj.save({ validate: true, throws: false }, function (err) {
                        if (err) next(err);
                        else next();
                    });
                }
            })
        }
        else {
            next();
        }
    });
    
    AssessmentQuestion.afterRemote("deleteById", function (context, instance, next) {
        var objectId = context.req.params.id;
        fixMovedLink(objectId, next);
    });
    
    function fixMovedLink (removedId, next) {
        var promises = [];
        var previousObject;
        var nextObject;
        
        // Fetch Previous removed
        promises.push(new Promise(function (fulfil, reject) {
            AssessmentQuestion.findOne({
                where: {
                    next: removedId
                }
            }, function (err, prev) {
                if (err) reject(err);
                else {
                    previousObject = prev;
                    fulfil();
                }
            });
        }));
        // Fetch Next removed
        promises.push(new Promise(function (fulfil, reject) {
            AssessmentQuestion.findOne({
                where: {
                    prev: removedId
                }
            }, function (err, nextObj) {
                if (err) reject(err);
                else {
                    nextObject = nextObj;
                    fulfil();
                }
            });
        }));
        
        Promise.all(promises).then(
            function success () {
                updateLinkedObjects();
            }, function error (err) {
                // Proceed with error
                next(err);
            });
        
        function updateLinkedObjects () {
            var bypassLinkPromises = [];
            
            // Update link by pass the moved objectId gap
            if (previousObject !== null) {
                bypassLinkPromises.push(new Promise(function (fulfil, reject) {
                    previousObject.next = (nextObject !== null ? nextObject.id : null);
                    previousObject.save({ validate: true, throws: false }, function (err) {
                        if (err) reject(err);
                        else fulfil();
                    });
                }));
            }
            if (nextObject !== null) {
                bypassLinkPromises.push(new Promise(function (fulfil, reject) {
                    nextObject.prev = (previousObject !== null ? previousObject.id : null);
                    nextObject.save({ validate: true, throws: false }, function (err) {
                        if (err) reject(err);
                        else fulfil();
                    });
                }));
            }
            
            Promise.all(bypassLinkPromises).then(
                function success () {
                    // All success
                    next();
                },
                function error (err) {
                    // Proceed with error
                    next(err);
                }
            )
        }
    }

    AssessmentQuestion.createMultiple = function (ctx, options, next) {
        var newErrMsg, newErr;
        try {
            if (!_.isArray(options)) {
                newErrMsg = "Assessment Question List is not an array";
                newErr = new Error(newErrMsg);
                newErr.statusCode = 403;
                newErr.code = 'EMPTY_ASSESSMENT_QUESTION_LIST';
                cb(newErr);
            }
            else {
                async.eachSeries(options, function (object, callback) {
                    
                    var promises = [],
                        prev, next;
                    
                    if (!_.isEmpty(object.prevQuestionId)) {
                        promises.push(new Promise(function (fulfill, reject) {
                            AssessmentQuestion.findOne({
                                where: {
                                    questionId: object.prevQuestionId
                                }
                            }, function (err, previousAssessmentQuestion) {
                                if (err) reject();
                                else if (_.isEmpty(previousAssessmentQuestion)) {
                                    fulfill();
                                }
                                else {
                                    prev = previousAssessmentQuestion.id;
                                    fulfill();
                                }
                            })
                        }))
                    }
                    if (!_.isEmpty(object.nextQuestionId)) {
                        promises.push(new Promise(function (fulfill, reject) {
                            AssessmentQuestion.findOne({
                                where: {
                                    questionId: object.nextQuestionId
                                }
                            }, function (err, nextAssessmentQuestion) {
                                if (err) reject();
                                else if (_.isEmpty(nextAssessmentQuestion)) {
                                    fulfill();
                                }
                                else {
                                    next = nextAssessmentQuestion.id;
                                    fulfill();
                                }
                            })
                        }))
                    }
                    
                    Promise.all(promises).then(
                        function success () {
                            AssessmentQuestion.create({
                                prev: prev,
                                next: next,
                                assessmentId: object.assessmentId,
                                questionId: object.questionId
                            }, function (err, current) {
                                if (err) next(err);
                                else {
                                    if (!_.isEmpty(prev)) {
                                        // If Add with previous object we update the link
                                        AssessmentQuestion.findOne({
                                            where: {
                                                id: prev
                                            }
                                        }, function (err, previousObj) {
                                            if (err) next(err);
                                            else {
                                                previousObj.next = current.id;
                                                previousObj.save({ validate: true, throws: false }, function (err) {
                                                    if (err) next(err);
                                                    else callback();
                                                });
                                            }
                                        });
                                    } else {
                                        callback();
                                    }
                                }
                            });
                        },
                        function error (err) {
                            next(err);
                        });
                }, function () {
                    next();
                });
            }
        } catch (err) {
            console.log("> AssessmentQuestion.createMultiple error: ", err);
            cb(err);
        }
    };
    
    AssessmentQuestion.remoteMethod(
        'createMultiple',
        {
            description: "Create multiple AssessmentQuestions instances from array",
            http       : { path: "/createMultiple", verb: "post", status: 200 },
            accepts    : [
                { arg: 'ctx', type: 'object', http: { source: 'context' } },
                {
                    arg        : "options",
                    type       : "array",
                    description: "array of AssessmentQuestion with next, prev questionId",
                    required   : true,
                    http       : { source: 'body' }
                }
            ],
            returns    : { arg: 'createMultiple', type: 'boolean' }
        }
    );
};

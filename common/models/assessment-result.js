'use strict';

var Promise = require("promise");
var _ = require("lodash");

module.exports = function (AssessmentResult) {
    AssessmentResult.createMultiple = function (ctx, options, next) {
        var newErrMsg, newErr,
            AssessmentDetails = AssessmentResult.app.models.AssessmentDetails,
            Question          = AssessmentResult.app.models.Question,
            promises          = [];
        try {
            if (!_.isArray(options)) {
                newErrMsg = "Assessment Result List is not an array";
                newErr = new Error(newErrMsg);
                newErr.statusCode = 403;
                newErr.code = 'EMPTY_ASSESSMENT_RESULT_LIST';
                cb(newErr);
            }
            else {
                
                var currentScore = 0,
                    assessmentResultId;
                
                _.forEach(options, function (object) {
                    
                    promises.push(new Promise(function (fulfill, reject) {
                        AssessmentDetails.create({
                            questionId        : object.questionId,
                            assessmentResultId: object.assessmentResultId,
                            choiceId          : object.choiceId
                        }, function (err, response) {
                            if (err) reject();
                            else {
                                
                                Question.findOne({
                                    where: {
                                        id: object.questionId
                                    }
                                }, function (err, question) {
                                    if (err) reject(err);
                                    else {
                                        if (question.correctChoiceId === object.choiceId) {
                                            response.updateAttributes({ 'score': 1 }, function (err) {
                                                if (err) reject(err);
                                                else {
                                                    currentScore += response.score;
                                                    assessmentResultId = object.assessmentResultId;
                                                    fulfill();
                                                }
                                            });
                                        }
                                        else fulfill();
                                    }
                                });
                            }
                        });
                    }));
                });
                
                Promise.all(promises).then(
                    function success () {
                        AssessmentResult.findOne({
                            include: {
                                relation: 'assessment',
                                scope   : {
                                    include: {
                                        relation: 'enrollCourse',
                                        scope   : {
                                            include: {
                                                relation: 'course'
                                            }
                                        }
                                    }
                                }
                            },
                            where  : {
                                id: assessmentResultId
                            }
                        }, function (err, assessmentResult) {
                            if (err) next(err);
                            else {
                                var total      = options.length,
                                    percentage = (currentScore / total) * 100;
                                
                                if (percentage >= assessmentResult.__data.assessment.__data.enrollCourse.__data.course.__data.passTestPercent) {
                                    // Pass Test
                                    assessmentResult.updateAttribute("result", "Pass", function (err) {
                                        if (err) next(err);
                                        else {
                                            // Update Assessment as pass
                                            if (assessmentResult.__data.type === "PostTest") {
                                                assessmentResult.__data.assessment.updateAttribute("result", "Pass", function (err) {
                                                    if (err) next(err);
                                                    else next();
                                                });
                                            }
                                            else {
                                                next();
                                            }
                                        }
                                    });
                                }
                                else {
                                    // Failed Test
                                    assessmentResult.updateAttribute("result", "Fail", function (err) {
                                        if (err) next(err);
                                        else next();
                                    });
                                }
                            }
                        })
                    },
                    function error (err) {
                        next(err);
                    });
            }
        } catch (err) {
            console.log("> AssessmentResult.createMultiple error: ", err);
            next(err);
        }
    };
    
    AssessmentResult.remoteMethod(
        'createMultiple',
        {
            description: "Create multiple AssessmentDetail instances from array",
            http       : { path: "/createMultiple", verb: "post", status: 200 },
            accepts    : [
                { arg: 'ctx', type: 'object', http: { source: 'context' } },
                {
                    arg        : "options",
                    type       : "array",
                    description: "array of AssessmentDetail with choiceId, questionId, assessmentResultId",
                    required   : true,
                    http       : { source: 'body' }
                }
            ],
            returns    : { arg: 'createMultiple', type: 'boolean' }
        }
    );
};

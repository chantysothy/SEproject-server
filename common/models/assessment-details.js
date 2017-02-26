'use strict';

module.exports = function (AssessmentDetails) {
    
    AssessmentDetails.afterRemote("create", function (context, instance, next) {
        console.log("> AssessmentDetails.afterRemote crete triggered");
        
        var Question = AssessmentDetails.app.models.Question;
        Question.findOne({
            where: {
                id: context.req.body.questionId
            }
        }, function (err, question) {
            if (err) next(err);
            else {
                if (question.correctChoiceId === context.req.body.choiceId) {
                    instance.updateAttributes({ 'score': 1 }, function (err) {
                        if (err) next(err);
                        else next();
                    })
                }
                else next();
            }
        });
    });
    
};

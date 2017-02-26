'use strict';

var Promise = require("promise");

module.exports = function (Question) {
    
    Question.afterRemote("create", function (context, instance, next) {
        console.log("> Question.afterRemote crete triggered");
        
        var promises = [];
        var correctChoiceId = "";
        
        var Choice = Question.app.models.Choice;
        
        context.args.data.choices.forEach(function (choice) {
            promises.push(new Promise(function (fulfill, reject) {
                Choice.create({
                    text_en   : choice.text_en,
                    text_th   : choice.text_th,
                    questionId: instance.id
                }, function (err, response_choice) {
                    if (err) reject(err);
                    else {
                        if (choice.isCorrect) {
                            correctChoiceId = response_choice.id;
                        }
                        
                        fulfill();
                    }
                });
            }));
        });
        
        Promise.all(promises).then(
            function success () {
                instance.updateAttribute("correctChoiceId", correctChoiceId,
                    function (err) {
                        if (err) next(err);
                        else next();
                    });
            },
            function error (err) {
                next(err);
            }
        );
    });
    
    Question.afterRemote("prototype.updateAttributes", function (context, instance, next) {
        
        var promises = [];
        var correctChoiceId = "";
        
        var Choice = Question.app.models.Choice;
        
        context.args.data.choices.forEach(function (choice) {
            promises.push(new Promise(function (fulfill, reject) {
                Choice.updateAll(
                    {
                        id: choice.id
                    },
                    {
                        text_en   : choice.text_en,
                        text_th   : choice.text_th,
                        questionId: instance.id
                    }, function (err) {
                        if (err) reject(err);
                        else {
                            if (choice.isCorrect) {
                                correctChoiceId = choice.id;
                            }
                            
                            fulfill();
                        }
                    });
            }));
        });
        
        Promise.all(promises).then(
            function success () {
                instance.updateAttribute("correctChoiceId", correctChoiceId,
                    function (err) {
                        if (err) next(err);
                        else next();
                    });
            },
            function error (err) {
                next(err);
            }
        );
    });
};

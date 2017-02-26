'use strict';

var Promise = require("promise");

module.exports = function(Instructor) {
    
    Instructor.afterRemote("deleteById", function (context, profileInstance, next) {
        
        var objectId = context.req.params.id;
        var containerName = "instructor";
        var fileNames = [
            objectId + "_thumbnail.png"
        ];
        var promises = [];
        
        var Container = Instructor.app.models.Container;
        // Using the promise from: https://www.promisejs.org/
        fileNames.forEach(function (fileName) {
            promises.push(new Promise(function (fulfill, reject) {
                Container.removeFile(containerName, fileName, function (err) {
                    if (err) reject(err);
                    else fulfill();
                });
            }));
        });
        
        Promise.all(promises).then(
            function success () {
                // Remove all files success
                next();
            }, function error (err) {
                // Ignore file not found incase there are not upload the file
                if (err && err.code === "ENOENT" && (err.errno === -2 || err.errno === -4058)) {
                    next();
                }
                else {
                    // Remove files error proceed with error
                    next(err);
                }
            });
    });
    
    Instructor.afterRemote("prototype.updateAttributes", function(context, profileInstance, next) {
        
        var Container = Instructor.app.models.Container;
        var containerName = "instructor";
        var objectId = context.req.params.id;
        var fileName;
        var promises = [];
        
        if ("imageThumbnailUrl" in context.args.data && context.args.data.imageThumbnailUrl === "") {
            fileName = objectId + "_thumbnail.png";
            addPromises(promises, containerName,fileName);
        }
        
        function addPromises(promises, containerName, fileName) {
            promises.push(new Promise(function (fulfill, reject) {
                Container.removeFile(containerName, fileName, function (err) {
                    if (err) reject(err);
                    else fulfill();
                });
            }));
        }
        
        Promise.all(promises).then(
            function success () {
                // Remove all files success
                next();
            }, function error (err) {
                // Ignore file not found incase there are not upload the file
                if (err && err.code === "ENOENT" && err.errno === -2) {
                    next();
                }
                // Remove files error proceed with error
                next(err);
            });
    });
    
};

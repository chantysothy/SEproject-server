'use strict';

var Promise = require("promise");

module.exports = function(Seminar) {
    
    Seminar.afterRemote("deleteById", function (context, instance, next) {
        
        var objectId = context.req.params.id;
        var containerName = "seminar";
        var fileNames = [
            objectId + "_thumbnail.png",
            objectId + "_cover.png"
        ];
        var promises = [];
        
        var Container = Seminar.app.models.Container;
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
                if (err && err.code === "ENOENT" && err.errno === -2) {
                    next();
                }
                // Remove files error proceed with error
                next(err);
            });
    });
    
    Seminar.afterRemote("prototype.updateAttributes", function(context, instance, next) {
        
        var Container = Seminar.app.models.Container;
        var containerName = "seminar";
        var objectId = context.req.params.id;
        var fileName;
        var promises = [];
        
        if ("imageCoverUrl" in context.args.data && context.args.data.imageCoverUrl === "") {
            fileName = objectId + "_cover.png";
            addPromises(promises, containerName,fileName);
        }
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

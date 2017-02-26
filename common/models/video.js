'use strict';

var Promise = require("promise");

module.exports = function(Video) {
    
    Video.afterRemote("create", function (context, instance, next) {
        console.log("> Video.afterRemote crete triggered");
        
        if (instance.__data.prev) {
            // If Add with previous object we update the link
            Video.findOne({
                where: {
                    id: instance.__data.prev
                }
            }, function (err, previousVideo) {
                if (err) next(err);
                else {
                    previousVideo.next = instance.id;
                    previousVideo.save({ validate: true, throws: false }, function (err) {
                        if (err) next(err);
                        else next();
                    });
                }
            })
        } else {
            next();
        }
    });
    
    Video.afterRemote("deleteById", function (context, instance, next) {
        
        var objectId = context.req.params.id;
        var containerName = "video";
        var fileNames = [
            objectId + "_thumbnail.png",
            objectId + "_cover.png"
        ];
        var promises = [];
        
        var Container = Video.app.models.Container;
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
                fixMovedLink(objectId, next);
            }, function error (err) {
                // Ignore file not found
                if (err && err.code === "ENOENT" && err.errno === -2) {
                    fixMovedLink(objectId, next);
                }
                else {
                    // Remove files error proceed with error
                    next(err);
                }
            });
    });
    
    Video.afterRemote("prototype.updateAttributes", function (context, instance, next) {
        
        var Container = Video.app.models.Container;
        var containerName = "video";
        var objectId = context.req.params.id;
        var fileName;
        var promises = [];
        
        if ("imageCoverUrl" in context.args.data && context.args.data.imageCoverUrl === "") {
            fileName = objectId + "_cover.png";
            addPromises(promises, containerName, fileName);
        }
        if ("imageThumbnailUrl" in context.args.data && context.args.data.imageThumbnailUrl === "") {
            fileName = objectId + "_thumbnail.png";
            addPromises(promises, containerName, fileName);
        }
        
        function addPromises (promises, containerName, fileName) {
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
                else {
                    // Proceed with error
                    next(err);
                }
            });
    });
    
    function fixMovedLink (removedId, next) {
        var promises = [];
        var previousVideo;
        var nextVideo;
        
        // Fetch Previous removed
        promises.push(new Promise(function (fulfil, reject) {
            Video.findOne({
                where: {
                    next: removedId
                }
            }, function (err, prev) {
                if (err) reject(err);
                else {
                    previousVideo = prev;
                    fulfil();
                }
            });
        }));
        // Fetch Next removed
        promises.push(new Promise(function (fulfil, reject) {
            Video.findOne({
                where: {
                    prev: removedId
                }
            }, function (err, nextObj) {
                if (err) reject(err);
                else {
                    nextVideo = nextObj;
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
            if (previousVideo !== null) {
                bypassLinkPromises.push(new Promise(function (fulfil, reject) {
                    previousVideo.next = (nextVideo !== null ? nextVideo.id : null);
                    previousVideo.save({ validate: true, throws: false }, function (err) {
                        if (err) reject(err);
                        else fulfil();
                    });
                }));
            }
            if (nextVideo !== null) {
                bypassLinkPromises.push(new Promise(function (fulfil, reject) {
                    nextVideo.prev = (previousVideo !== null ? previousVideo.id : null);
                    nextVideo.save({ validate: true, throws: false }, function (err) {
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
};

'use strict';

var Promise = require("promise");

module.exports = function (Chapter) {
    
    Chapter.afterRemote("create", function (context, instance, next) {
        console.log("> Chapter.afterRemote crete triggered");
        
        if (instance.__data.prev) {
            // If Add with previous object we update the link
            Chapter.findOne({
                where: {
                    id: instance.__data.prev
                }
            }, function (err, previousChapter) {
                if (err) next(err);
                else {
                    previousChapter.next = instance.id;
                    previousChapter.save({ validate: true, throws: false }, function (err) {
                        if (err) next(err);
                        else next();
                    });
                }
            })
        } else {
            next();
        }
    });
    
    Chapter.beforeRemote("deleteById", function (context, instance, next) {
        var objectId = context.req.params.id;
        
        Chapter.findOne({
            where: {
                id: objectId
            }
        }, function (err, chapter) {
            if (err) next(err);
            else {
                chapter.videos.destroyAll(function (err) {
                    if (err) next(err);
                    next();
                })
            }
        });
    });
    
    Chapter.afterRemote("deleteById", function (context, instance, next) {
        
        var objectId = context.req.params.id;
        var containerName = "chapter";
        var fileNames = [
            objectId + "_thumbnail.png",
            objectId + "_cover.png"
        ];
        var promises = [];
        
        var Container = Chapter.app.models.Container;
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
    
    Chapter.afterRemote("prototype.updateAttributes", function (context, instance, next) {
        
        var Container = Chapter.app.models.Container;
        var containerName = "chapter";
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
        var previousChapter;
        var nextChapter;
        
        // Fetch Previous removed
        promises.push(new Promise(function (fulfil, reject) {
            Chapter.findOne({
                where: {
                    next: removedId
                }
            }, function (err, prev) {
                if (err) reject(err);
                else {
                    previousChapter = prev;
                    fulfil();
                }
            });
        }));
        // Fetch Next removed
        promises.push(new Promise(function (fulfil, reject) {
            Chapter.findOne({
                where: {
                    prev: removedId
                }
            }, function (err, nextObj) {
                if (err) reject(err);
                else {
                    nextChapter = nextObj;
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
            if (previousChapter !== null) {
                bypassLinkPromises.push(new Promise(function (fulfil, reject) {
                    previousChapter.next = (nextChapter !== null ? nextChapter.id : null);
                    previousChapter.save({ validate: true, throws: false }, function (err) {
                        if (err) reject(err);
                        else fulfil();
                    });
                }));
            }
            if (nextChapter !== null) {
                bypassLinkPromises.push(new Promise(function (fulfil, reject) {
                    nextChapter.prev = (previousChapter !== null ? previousChapter.id : null);
                    nextChapter.save({ validate: true, throws: false }, function (err) {
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

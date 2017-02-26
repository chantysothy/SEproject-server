/**
 * Created by popeye on 11/8/2016 AD.
 */

module.exports = function (app) {
    
    if (app.dataSources.mysqlDS.connected) {
        execute();
    }
    else {
        app.dataSources.mysqlDS.once('connected', function () {
            execute();
        });
    }
    
    function execute () {
        var Container = app.models.Container;
        Container.createContainer({ name: "avatar" },
            function (err) {
                if (err) {
                    if (err.code === "EEXIST") {
                        console.log("storage/instructor folder already exist");
                    }
                    else {
                        throw err;
                    }
                }
            
                console.log("Create avatar container");
            });
        
        Container.createContainer({ name: "category" },
            function (err) {
                if (err) {
                    if (err.code === "EEXIST") {
                        console.log("storage/instructor folder already exist");
                    }
                    else {
                        throw err;
                    }
                }
                
                console.log("Create category container");
            });
    
        Container.createContainer({ name: "course" },
            function (err) {
                if (err) {
                    if (err.code === "EEXIST") {
                        console.log("storage/instructor folder already exist");
                    }
                    else {
                        throw err;
                    }
                }
            
                console.log("Create course container");
            });
    
        Container.createContainer({ name: "instructor" },
            function (err) {
                if (err) {
                    if (err.code === "EEXIST") {
                        console.log("storage/instructor folder already exist");
                    }
                    else {
                        throw err;
                    }
                }
            
                console.log("Create instructor container");
            });
    
        Container.createContainer({ name: "chapter" },
            function (err) {
                if (err) {
                    if (err.code === "EEXIST") {
                        console.log("storage/chapter folder already exist");
                    }
                    else {
                        throw err;
                    }
                }
            
                console.log("Create course chapter");
            });
    
        Container.createContainer({ name: "video" },
            function (err) {
                if (err) {
                    if (err.code === "EEXIST") {
                        console.log("storage/video folder already exist");
                    }
                    else {
                        throw err;
                    }
                }
            
                console.log("Create video container");
            });
    
        Container.createContainer({ name: "seminar" },
            function (err) {
                if (err) {
                    if (err.code === "EEXIST") {
                        console.log("storage/seminar folder already exist");
                    }
                    else {
                        throw err;
                    }
                }
            
                console.log("Create seminar container");
            });
    }
};

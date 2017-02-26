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
        databaseSetup();
    }
    
    // Create all models' table
    function databaseSetup () {
        app.dataSources.mysqlDS.autoupdate(null, function (err) {
            if (err) throw err;
            
            console.log("Update table schemas to database");
    
            // addAdminRole();
        });
    }
    
    function addAdminRole () {
        var Role = app.models.Role;
        
        // Create people role
        Role.create({
            name       : "people",
            description: "The normal people who can access only Seminar course"
        }, function (err, role) {
            if (err) throw err;
            
            console.log("Created role:", role);
        });
        
        // Create student role
        Role.create({
            name       : "student",
            description: "The student who can access all available courses"
        }, function (err, role) {
            if (err) throw err;
            
            console.log("Created role:", role);
        });
        
        // Create admin role
        Role.create({
            name       : "admin",
            description: "The Admin role who can fully grant access all Models"
        }, function (err, role) {
            if (err) throw err;
            
            console.log("Created role:", role);
            
            var Profile = app.models.Profile;
            Profile.create({
                firstName    : 'main',
                lastName     : 'admin',
                email        : 'prutya@lannasoftworks.com',
                password     : 'admin',
                status       : 'active',
                role         : "admin",
                emailVerified: true
            }, function (err, admin) {
                if (err) throw err;
                
                console.log("Created default admin");
                var RoleMapping = app.models.RoleMapping;
                role.principals.create({
                    principalType: RoleMapping.USER,
                    principalId  : admin.id,
                    roleId       : role.id
                }, function (err) {
                    if (err) throw err;
                    
                    console.log("Assigned admin to role to default admin");
                });
            });
        });
    }
    
    function generateDiagram () {
        var fs = require('fs');
        var path = require('path');
        var index = require('../../node_modules/loopback-data-visualizer/lib/index');
        var viz = index.ModelVisualizer;
        
        var loopback = require('loopback');
        var ds = app.dataSources.mysqlDS;
        loopback.setDefaultDataSourceForType('db', ds);
        loopback.setDefaultDataSourceForType('mail', loopback.createDataSource({ connector: 'mail' }));
        loopback.autoAttach();
        
        var options = {
            excludingNulls: true,
            format        : 'svg'
        };
        
        var models = [];
        var modelReg = loopback.Model.modelBuilder.models;
        for (var m in modelReg) {
            if (m.indexOf('AnonymousModel_') === 0) {
                continue;
            }
            models.push(modelReg[m]);
        }
        console.log('Rendering diagrams ...');
        
        var schemaSvg = viz.render('Models', models, options);
        
        fs.writeFile(path.join(__dirname, 'loopback-models.svg'), schemaSvg, function (err) {
            if (err) {
                throw err;
            }
            console.log('loopback-models.svg is saved to ' + __dirname);
        });
    }
};

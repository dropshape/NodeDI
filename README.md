##NodeDI
###Description
NodeDI is a simple Dependency Injection framework for NodeJS. It has been built with testing in mind and as as such allows you to return mocks for any type of element that can be injected.

###Modules
Modules are named groups of injected items.
    
    var server  = DI.module('serverModule', ['dependency1', 'dependency2']);

###Values
Values are the simplest items that can be injected and can be injected and are normally 3rd party modules, primitives or items that do not need to be new'ed up. Values can also have dependencies as described below.

    DI.module('serverModule', [])
         .value('config', { port:3001, host:'localhost' });

###Services
Services are items that do need to be new'ed up but that should be shared between all instances that need the service within a module.

    var Passport = require('passport').Passport;
    DI.module('serverModule', [])
        .service('passport', Passport);

###Factories
Factories return a new instance every time one is needed from the dependency injector they are useful when you dynamically need to create items.

    function Model(){
        var name;
        var age;
    };

    DI.module('serverModule', [])
        .factory('model', Model);

###Dependencies.
You set an objects dependencies by defining an $inject = []; on the object for example

    //------- JobScheduler.js -----//
    //Dependencies in the constructor.
    function Job(scheduler, config) {
        var interval = config.get('job').interval;
        
        this.run = function(job){
            scheduler.scheduleJob(interval, job);
        }
    }
    //Set dependencies here.
    Job.$inject = ['scheduler', 'config'];
    return Job;

    //------ Module.js -----//

    //Simple config module for example 
    var config = {interval:new Date(Date.now() + 10000)};
    //Use 3rd party library as dependency
    var scheduler = require('node-scheduler');

    DI.module('jobModule', [])
        .value('jobScheduler', require('./JobScheduler')
        .value('scheduler', scheduler)
        .value('config', config);

###Usage
Check the test suite for full usage.
####TODO Usage examples
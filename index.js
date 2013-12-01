'use strict';

var _ = require('lodash');
var bunyan = require('bunyan');

/**
 * A simple DI Framework for node.
 * Check the Spec tests to see how it works and what it
 * can do.
 * @constructor
 */
function NodeDI(tick, loggerConfig) {

    loggerConfig = _.defaults(loggerConfig || {}, {name:'NodeDI', streams:[
        {
            level:'error',
            stream:process.stdout
        },
        {
            level:'error',
            path:'nodedi.error.log'
        }
    ]});

    var logger = bunyan.createLogger(loggerConfig);

    if(!_.isFunction(tick)){
        tick = process.nextTick;
    }

    /**
     * Containers for any mocks.
     */
    var modules = { };
    var mockModules = { };
    var mockValues = { };
    var mockServices = { };
    var mockFactories = { };

    var initialized = false;
    /**
     * Returns all modules registered under this DI container.
     */
    this.modules = modules;

    /**
     * Main DI interface.
     *
     */

    //-------------------------------------------------------------------------
    //
    // Mocking Methods. Testing is important so lets put them first!
    //
    //-------------------------------------------------------------------------

    /**
     * You can mock out any module by setting the module
     * here it will be returned instead of the actual module.
     * @param name
     * @param value
     */
    this.setMockModule = function (name, value) {
        mockModules[name] = value;
        return mockModules[name];
    };

    /**
     * You can mock out any value by setting the value
     * here it will be returned instead of the actual value.
     * @param name
     * @param value
     */
    this.setMockValue = function (name, value) {
        mockValues[name] = value;
        return mockValues[name];
    };
    /**
     * You can mock any service using this method.
     * @param name
     * @param value
     * @returns {*}
     */
    this.setMockService = function (name, value) {
        var Temp = value;
        mockServices[name] = new Temp();
        return mockServices[name];
    };

    /**
     * You can mock any factory using this method.
     * @param name
     * @param value
     * @returns {Temp}
     */
    this.setMockFactory = function (name, value) {
        mockFactories[name] = value;
        var Temp = value;
        return new Temp();
    };

    /**
     * Run the DI containers injections manually.
     * If you do not call this then the injector will
     * run automatically once setup is complete.
     * @param value Function to call once injection has completed.
     * @returns {*}
     */
    this.run = function (value) {
        runInjections(value);
        return this;
    };

    /**
     * Create a new DI module
     * @param name
     * @param dependencies
     * @returns {*}
     */
    this.module = function (name, dependencies) {
        if (modules[name] && dependencies) {
            throw new Error('You have already registered a module called: ' + name);
        }
        if (mockModules[name]) {
            return mockModules[name];
        }
        if (modules[name]) {
            return modules[name];
        }
        initialized = false;
        modules[name] = new Module(name, dependencies);
        tick(function () {
            runInjections();
        });
        return modules[name];
    };

    /**
     * Creates a new Module that you can use as the parent for injecting into.
     * @param moduleName
     * @param dependencies
     * @returns {{name: *, dependencies: *, services: {}, factories: {}, values: {},
     * value: Function, service: Function, factory: Function}}
     * @constructor
     */
    function Module(moduleName, dependencies) {

        //Services are singletons
        var services = {};
        //factories will get newed up
        var factories = {};
        //Values are primitives.
        var values = {};

        var options = {values:getValue, factories:getFactory, services:getService, modules:modules, moduleName:moduleName};
        function getValue(valueName) {
            runInjections();
            if(mockValues[valueName]){
                return mockValues[valueName];
            }
            var injectable = values[valueName];
            if (!injectable) {
                return null;
            }
            if (!injectable.injectedItem) {
                if (injectable.value.$inject) {
                    injectable.injectedItem = injectDependencies(injectable.value, options);
                } else {
                    injectable.injectedItem = injectable.value;
                }
            }
            return injectable.injectedItem;
        }

        function getService(serviceName) {
            runInjections();
            if(mockServices[serviceName]){
                return mockServices[serviceName];
            }
            var injectable = services[serviceName];
            if (!injectable) {
                return null;
            }
            if (!injectable.injectedItem) {
                if (injectable.value.$inject) {
                    injectable.injectedItem = injectDependencies(injectable.value, options);
                } else {
                    var Temp = injectable.value;
                    injectable.injectedItem = new Temp();
                }
            }
            return injectable.injectedItem;
        }

        function getFactory(factoryName) {
            runInjections();
            if(mockFactories[factoryName]){
                return  new mockServices[factoryName]();
            }
            var value = factories[factoryName];
            if (value) {
                value = injectDependencies(factories[factoryName], options);
            }
            return value;
        }

        this.name = moduleName;
        this.dependencies = dependencies;
        this.services = services;
        this.factories = factories;
        this.values = values;
        this.getServices = function () {
            return _.forIn(services, function (value, key) {
                return getService(key).injectedItem;
            });
        };
        this.getFactories = function () {
            return _.forIn(factories, function (value, key) {
                return getFactory(key).injectedItem;
            });
        };
        this.getValues = function () {
            return _.forIn(values, function (value, key) {
                return getValue(key).injectedItem;
            });
        };

        this.run = function (value) {
            runInjections(value);
            return this;
        };

        /**
         * Values are simple objects/primitives that are shared
         * between your injected components.
         * @param name
         * @param value
         * @returns {*}
         */
        this.value = function (name, value) {
            if (!value && !name) {
                return this;
            }
            if (!value && mockValues[name]) {
                return mockValues[name];
            }
            if (!value) {
                return getValue(name);
            }
            values[name] = new InjectableItem(name, value);
            return this;
        };

        /**
         * Services are Singletons that are shared among all of your
         * components. They are similar to Values except that Services
         * will be new'ed up by the DI framework before being injected.
         * @param name
         * @param value
         * @returns {*}
         */
        this.service = function (name, value) {
            if (!value && !name) {
                return this;
            }
            if (!value && mockServices[name]) {
                return mockServices[name];
            }
            if (!value) {
                return getService(name);
            }

            services[name] = new InjectableItem(name, value);
            return this;
        };
        /**
         * Factories create new instances on each injection and are not shared
         * between components.
         * @param name
         * @param value
         * @returns {*}
         */
        this.factory = function (name, value) {
            if (!value && !name) {
                return this;
            }
            if (!value && mockFactories[name]) {
                var Value = mockFactories[name];
                if (_.isFunction(Value)) {
                    return new Value();
                }
                return Value;
            }
            if (!value) {
                return getFactory(name);
            }
            this.factories[name] = value;
            return this;
        };
    }

    //-------------------------------------------------------------------------
    //
    // Private Methods
    //
    //-------------------------------------------------------------------------

    /**
     * Wrapper for items so that we can delay injecting them
     * until either they are called directly or the run() method
     * is invoked.
     * @param name
     * @param value
     * @returns {{name: *, value: *}}
     * @constructor
     * @private
     */
    function InjectableItem(name, value) {
        this.name = name;
        this.value = value;
    }

    function setupModuleDependencies() {
        _.each(modules, function (module) {
            if (!module.dependenciesInitialized) {
                module.dependenciesInitialized = true;
                var depends = _.map(module.dependencies, function (depend) {
                    var dependency = modules[depend];
                    if (!dependency) {
                        logger.error('Unable to resolve dependency ', depend, ' for module ', module.name);
                    } else {
                        module.values = _.defaults(module.values, dependency.values);
                        module.services = _.defaults(module.services, dependency.services);
                        module.factories = _.defaults(module.factories, dependency.factories);
                    }
                    return dependency;
                });
                module.dependencies = depends;
            }
        });
    }

    function runInjections(value) {
        if (!initialized) {
            initialized = true;
            setupModuleDependencies();
            _.each(modules, function (module) {
                module.getValues();
                module.getServices();
                module.getFactories();
            });
            if (_.isFunction(value)) {
                value();
            }
        } else if (_.isFunction(value)) {
            value();
        }
    }
}

exports = module.exports = new NodeDI();
exports.NodeDI = NodeDI;
exports.Module = NodeDI.Module;

//-------------------------------------------------------------------------
//
// Private Methods
//
//-------------------------------------------------------------------------

function injectDependencies(item, options) {
    var injectables = findInjectables(item, options);
    var Temp = function () {
    }; // temporary constructor
    Temp.prototype = item.prototype;
    var instance = new Temp();
    var returnedValue = item.apply(instance, injectables);
    return Object(returnedValue) === returnedValue ? returnedValue : instance;
}

function findInjectables(value, options) {

    var injectables = _.map(value.$inject, function (inject) {
        var item = options.values(inject);
        if (!item) {
            item = options.services(inject);
        }
        if (!item) {
            item = options.factories(inject);
        }
        if (!item) {
            item = options.modules[inject];
        }
        if (!item) {
            throw new Error('Unable to find injectable did you forget to register ' + inject + ' for module ' + options.moduleName);
        }
        if (item.$inject) {
            item = injectDependencies(item, options);
        }
        return item;
    });
    return injectables;
}
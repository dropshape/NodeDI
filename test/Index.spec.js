'use strict';

describe('NodeDI Tests', function () {

    var nodeDI = require('../index');

    describe('SHOULD', function () {

        var DI;
        var tick;
        beforeEach(function () {
            DI = new nodeDI.NodeDI(function (value) {
                tick = value;
            });
        });

        it('Only Run injections once the run method is called.', function (done) {
            DI.module('Dependency')
                .value('value', 1)
                .factory('factory', function Factory() {
                    expect(true).toBe(false);
                    console.log('this should never run! as injection is delayed!');
                })
                .service('service', function Service() {
                    expect(false).toBe(true);
                    console.log('this should never run! as injection is delayed!');
                });

            function Depends(value, factory, service) {
                var obj = { value: value, factory: factory, service: service };
                expect(obj).toBe(false);
                console.log('this should never run! as injection is delayed!');
            }

            Depends.$inject = ['value', 'factory', 'service'];

            DI.module('Runner', ['Dependency'])
                .service('myService', Depends);

            done();

        });

        it('Run the injector automatically if no run method is called.', function (done) {

            var spy = jasmine.createSpy();
            spy.$inject = ['value'];
            DI.module('Dependency')
                .value('value', 1)
                .service('service', spy);
            tick();
            expect(spy).toHaveBeenCalled();
            done();
        });

        it('Run the module injection when given a run method', function (done) {
            var cb = jasmine.createSpy();
            DI.module('greetings')
                .value('greeting', 'ola')
                .run(cb);
            expect(cb).toHaveBeenCalled();
            done();
        });

        it('Automatically run injections when requesting a value', function (done) {
            function MyValue(greeting) {
                this.greeting = greeting;
            }

            MyValue.$inject = ['greeting'];
            var module = DI.module('greetings')
                .value('greeting', 'ola')
                .value('greetingService', MyValue);
            //Request some value/service/factory
            var myService = module.value('greetingService');
            expect(myService.greeting).toBeTruthy('ola');
            done();
        });

        it('Automatically run injections when requesting a service', function (done) {
            function MyService(greeting) {
                this.greeting = greeting;
            }

            MyService.$inject = ['greeting'];
            var module = DI.module('greetings')
                .value('greeting', 'ola')
                .service('greetingService', MyService);
            //Request some value/service/factory
            var myService = module.service('greetingService');
            expect(myService.greeting).toBeTruthy('ola');
            done();
        });

        it('Automatically run injections when requesting a factory', function (done) {
            function MyFactory(greeting) {
                this.greeting = greeting;
            }

            MyFactory.$inject = ['greeting'];
            var module = DI.module('greetings')
                .value('greeting', 'ola')
                .factory('greetingService', MyFactory);
            //Request some value/service/factory
            var myService = module.factory('greetingService');
            expect(myService.greeting).toBeTruthy('ola');
            done();
        });

        it('Be able to register a new module without any dependencies', function (done) {
            expect(DI.module('testing')).toBeTruthy();
            done();
        });

        it('Be able to register a new module with dependencies', function (done) {
            DI.module('dependency');
            var module = DI.module('module', ['dependency']).run();
            expect(module.dependencies[0].name).toEqual('dependency');
            done();
        });

        it('Be able to get a module by name', function (done) {
            DI.module('NewModule');
            expect(DI.module('NewModule').name).toBeTruthy('NewModule');
            done();
        });

        it('Create two modules with the same dependencies should share the ' +
            'dependency with each module', function (done) {
            DI.module('dependency');
            var module = DI.module('module', ['dependency']).run();
            var module2 = DI.module('module2', ['dependency']).run();

            expect(module.dependencies[0]).toBe(module2.dependencies[0]);
            done();
        });

        it('Create two separate top level modules with the same dependencies should each create a ' +
            'new instances of each dependency within each module', function (done) {
            var newDI = new nodeDI.NodeDI(function (value) {
                tick = value;
            });
            DI.module('dependency');
            newDI.module('dependency');
            var module = DI.module('module', ['dependency']).run();
            var module2 = newDI.module('module', ['dependency']).run();
            expect(module.dependencies[0]).not.toBe(module2.dependencies[0]);
            done();
        });

        it('Be able to resolve dependencies based on an injection array', function (done) {
            function MyService(greeting) {
                this.greeting = greeting;
            }

            MyService.$inject = ['greeting'];

            var module = DI.module('greetings')
                .value('greeting', 'ola')
                .service('greetingService', MyService);
            var myService = module.service('greetingService');
            expect(myService.greeting).toBeTruthy('ola');
            done();
        });

        it('Services should be shared instances (singletons within the top level DIModule).', function (done) {
            var serviceOne;
            var serviceTwo;

            function DependencyOne(greetingService) {
                serviceOne = greetingService;
            }

            DependencyOne.$inject = ['greetingService'];
            function DependencyTwo(greetingService) {
                serviceTwo = greetingService;
            }

            DependencyTwo.$inject = ['greetingService'];

            function MyService(greeting) {
                this.greeting = greeting + Math.random();//Make sure they are the same
            }

            MyService.$inject = ['greeting'];

            var module = DI.module('greetings')
                .value('greeting', 'ola')
                .service('greetingService', MyService)
                .value('dependencyOne', DependencyOne)
                .value('dependencyTwo', DependencyTwo);

            var myService = module.service('greetingService');
            expect(myService.greeting).toBeTruthy('ola');

            var d1 = module.value('dependencyOne');
            var d2 = module.value('dependencyTwo');
            expect(d1).toBeTruthy();
            expect(d2).toBeTruthy();
            expect(serviceOne).toBeDefined();
            expect(serviceTwo).toBeDefined();
            expect(serviceOne).toBe(serviceTwo);
            done();
        });

        it('Create multiple instances of Factory', function (done) {
            var factoryOne;
            var factoryTwo;

            function DependencyOne(greetingFactory) {
                factoryOne = greetingFactory;
            }

            DependencyOne.$inject = ['greetingFactory'];
            function DependencyTwo(greetingFactory) {
                factoryTwo = greetingFactory;
            }

            DependencyTwo.$inject = ['greetingFactory'];

            function MyFactory(greeting) {
                this.greeting = greeting + Math.random();//Make sure they are not the same.
            }

            MyFactory.$inject = ['greeting'];

            var module = DI.module('greetings')
                .value('greeting', 'ola')
                .factory('greetingFactory', MyFactory)
                .value('dependencyOne', DependencyOne)
                .value('dependencyTwo', DependencyTwo);
            var myFactory = module.factory('greetingFactory');
            expect(myFactory.greeting).toBeTruthy('ola');

            var d1 = module.value('dependencyOne');
            var d2 = module.value('dependencyTwo');
            expect(d1).toBeTruthy();
            expect(d2).toBeTruthy();
            expect(factoryOne).toBeDefined();
            expect(factoryTwo).toBeDefined();
            expect(factoryOne).not.toBe(factoryTwo);
            done();
        });

        it('Allow child modules to inherit injections', function (done) {

            //Top Level module;
            DI.module('TopModule')
                .value('value', 'default')
                .factory('factory', function Factory() {
                    this.name = 'default';
                })
                .service('service', function Service() {
                    this.name = 'default';
                });

            var Middle = DI.module('MiddleModule', ['TopModule']);

            expect(Middle.value('value')).toBe('default');
            expect(Middle.factory('factory').name).toBe('default');
            expect(Middle.service('service').name).toBe('default');
            done();
        });

        it('Allow child modules to override parent injections', function (done) {

            //Top Level module;
            DI.module('TopModule')
                .value('value', 'default')
                .factory('factory', function Factory() {
                    this.name = 'default';
                })
                .service('service', function Service() {
                    this.name = 'default';
                });

            var Middle = DI.module('MiddleModule', ['TopModule'])
                .value('value', 'newDefault')
                .factory('factory', function Factory() {
                    this.name = 'newDefault';
                })
                .service('service', function Service() {
                    this.name = 'newDefault';
                });

            expect(Middle.value('value')).toBe('newDefault');
            expect(Middle.factory('factory').name).toBe('newDefault');
            expect(Middle.service('service').name).toBe('newDefault');
            done();
        });

        it('Be able to declare injections out of order', function (done) {
            var serviceValues;

            function Service(value, factory) {
                serviceValues = [value, factory];
            }

            Service.$inject = ['firstValue', 'firstFactory'];

            var factoryValues;

            function Factory(value) {
                factoryValues = [value];
                return {'factory': 'factory'};
            }

            Factory.$inject = ['firstValue'];

            DI.module('firstModule')
                .service('firstService', Service)
                .factory('firstFactory', Factory)
                .value('firstValue', 'value');
            expect(serviceValues).toBeUndefined();
            expect(factoryValues).toBeUndefined();
            tick();
            expect(serviceValues).toEqual([ 'value', { factory: 'factory' } ]);
            expect(factoryValues).toEqual([ 'value' ]);

            done();
        });

        xit('Not be able to declare a circular dependency', function (done) {

            function Service(factory) {
                console.log('Service', factory);
            }

            Service.$inject = ['factory'];
            function Factory(service) {
                console.log('Factory', service);
            }

            Factory.$inject = ['service'];

            DI.module('circles')
                .service('service', Service)
                .factory('factory', Factory)
                .run();
            done();
        });

        it('Be able to inject mocks into existing modules', function (done) {

            //Lets build our slow server module :(
            DI.module('server')
                .service('serverconnector', function SlowServer() {
                    this.name = 'slow server';
                });

            function SlowDBConnector(server) {
                this.server = server;
            }

            SlowDBConnector.$inject = ['serverconnector'];

            //Now our slow DB users our slow server .... our tests will take ages!
            var database = DI.module('database', ['server'])
                .value('port', 'realportnumber')
                .service('dbconnector', SlowDBConnector);

            //Make sure our slow dbconnector is connected correctly first.
            expect(database.service('dbconnector').server.name).toBe('slow server');

            //Now try mocking it with a super faster server
            function FastServer() {
                this.name = 'Mock ';
            }

            //And a fast db too
            function FastDBConnector(server) {
                server.name += 'faster';
                this.server = server;
            }

            FastDBConnector.$inject = ['serverconnector'];

            //Now lets setup our app as usual be replace the two
            //slow parts with fast mocks. (notice all the injection names are the same)
            var testApp = DI.module('TestApp', ['database'])
                .service('serverconnector', FastServer)
                .service('dbconnector', FastDBConnector);

            expect(testApp.service('dbconnector').server.name).toBe('Mock faster');

            done();
        });

        it('Be able to mock a whole module', function (done) {
            var module = DI.module('RealModule');
            DI.setMockModule('RealModule', {mock: 'mock'});
            var mock = DI.module('RealModule');
            expect(module).not.toBe(mock);
            expect(mock).toEqual({mock: 'mock'});
            done();
        });

        it('Be able to mock a value', function (done) {
            var module = DI.module('RealModule')
                .value('PORT', '8080');
            DI.setMockValue('PORT', '9999');
            var mock = module.value('PORT');
            expect(mock).toBe('9999');
            done();
        });

        it('Be able to mock a service', function (done) {
            function MockService() {
                return {
                    value: 'MOCK SERVICE'
                };
            }

            var module = DI.module('RealModule')
                .service('SERVICE', function Service() {
                    return {
                        value: 'REAL SERVICE'
                    };
                });
            expect(module.service('SERVICE')).toEqual({ value: 'REAL SERVICE' });
            DI.setMockService('SERVICE', MockService);
            expect(module.service('SERVICE')).toEqual({ value: 'MOCK SERVICE' });
            done();
        });

        it('Be able to mock a factory', function (done) {
            function MockFactory() {
                return {
                    value: 'MOCK FACTORY'
                };
            }

            var module = DI.module('RealModule')
                .factory('FACTORY', function Factory() {
                    return {
                        value: 'REAL FACTORY'
                    };
                });
            expect(module.factory('FACTORY')).toEqual({ value: 'REAL FACTORY' });
            var mock = DI.setMockFactory('FACTORY', MockFactory);
            expect(mock).toEqual({ value: 'MOCK FACTORY' });
            expect(mock).toEqual(module.factory('FACTORY'));
            done();
        });

    });

    describe('SHOULD NOT', function () {
        var DI;
        var tick;
        beforeEach(function () {
            DI = new nodeDI.NodeDI(function (value) {
                tick = value;
            });
        });

        it('Be able to register the same module twice', function (done) {
            DI.module('module', []);
            expect(function () {
                DI.module('module', []);
            }).toThrow();
            done();
        });
    });
});
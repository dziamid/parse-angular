(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Parse = require('parse').Parse,
  angular = require('angular'),
  moment = require('moment'),
  _ = require('lodash'),
  parseAngular = angular.module('parseAngular', []);

parseAngular.factory('parseAngular', function () {
  var conversion, parseAngular;

  conversion = {
    'Number': function (value) {
      return Number(value);
    },
    'Boolean': function (value) {
      if (typeof value === 'boolean')
        return value;
      return Boolean(Number(value));
    },
    'Date': function (value) {
      if (value instanceof Date) {
        var newDate = new Date(value.valueOf() + value.getTimezoneOffset() * 60000);
        newDate.setSeconds(0);
        newDate.setMinutes(0);
        newDate.setHours(0);
        return newDate;
      }
      return moment(value, parseAngular.dateFormat).toDate();
    },
    'Relation': function (value, fieldType) {
      if (value instanceof fieldType)
        return value;
      return new fieldType({id: value});
    }
  };

  parseAngular = function (modelName, cols) {
    if (typeof modelName === 'function' && modelName._name && modelName._name === 'Relation') {
      return modelName;
    }

    var obj;
    if (modelName === Parse.User)
      obj = modelName;
    else
      obj = Parse.Object.extend(modelName);


    // Define properties
    _.forOwn(cols, function (fieldType, fieldName) {
      var defaultValue;
      if (typeof fieldType === 'object') {
        defaultValue = fieldType.default;
        fieldType = fieldType.type;
      }

      Object.defineProperty(obj.prototype, fieldName, {
        enumerable: true,
        configurable: false,
        get: function () {
          var value = this.get(fieldName);
          value = value === undefined ? defaultValue : value;

          if (value !== undefined && fieldType.name === 'Boolean')
            return conversion['Boolean'](value);
          return value;
        },
        set: function (value) {
          this.set(fieldName, value);
        }
      });
    });

    obj = _.extend(obj, {
      _name: 'Relation',
      query: function () {
        return new Parse.Query(obj);
      },
      find: function (onSuccess, onError) {
        obj.query().find(onSuccess, onError);
        return this;
      },
      get: function (id, onSuccess, onError) {
        obj.query().get(id, onSuccess, onError);
        return this;
      }
    });

    var originalSave = Parse.Object.prototype.save;
    Parse.Object.prototype = _.extend(Parse.Object.prototype, {
      save: function (data) {
        if (typeof data === 'object') {
          this.set(data);
        }

        this.beforeSave();
        this.parseFields();

        return originalSave.apply(this, arguments);
      },

      parseFields: function () {
        var self = this;
        _.forOwn(cols, function (fieldType, fieldName) {
          var type = fieldType.name || fieldType._name;

          if (self[fieldName] !== undefined && typeof conversion[type] === 'function') {
            self[fieldName] = conversion[type](self[fieldName], fieldType);
          }
        });
        return self;
      },

      beforeSave: function () {
      }
    });

    return obj;
  };


  // parseAngular properties
  parseAngular.dateFormat = 'YYYY-MM-DD';

  return parseAngular;
});

parseAngular.run(['$q', '$window', function ($q, $window) {


  // Process only if Parse exist on the global window, do nothing otherwise
  if (!angular.isUndefined($window.Parse) && angular.isObject($window.Parse)) {

    // Keep a handy local reference
    var Parse = $window.Parse;

    //-------------------------------------
    // Structured object of what we need to update
    //-------------------------------------

    var methodsToUpdate = {
      "Object": {
        prototype: ['save', 'fetch', 'destroy'],
        static: ['saveAll', 'destroyAll']
      },
      "Collection": {
        prototype: ['fetch'],
        static: []
      },
      "Query": {
        prototype: ['find', 'first', 'count', 'get'],
        static: []
      },
      "Cloud": {
        prototype: [],
        static: ['run']
      },
      "User": {
        prototype: ['signUp'],
        static: ['requestPasswordReset', 'logIn']
      },
      "FacebookUtils": {
        prototype: [],
        static: ['logIn', 'link', 'unlink']
      }
    };

    //// Let's loop over Parse objects
    for (var k in methodsToUpdate) {

      var currentClass = k;
      var currentObject = methodsToUpdate[k];

      var currentProtoMethods = currentObject.prototype;
      var currentStaticMethods = currentObject.static;


      /// Patching prototypes
      currentProtoMethods.forEach(function (method) {

        var origMethod = Parse[currentClass].prototype[method];

        // Overwrite original function by wrapping it with $q
        Parse[currentClass].prototype[method] = function () {

          return origMethod.apply(this, arguments)
            .then(function (data) {
              var defer = $q.defer();
              defer.resolve(data);
              return defer.promise;
            }, function (err) {
              var defer = $q.defer();
              defer.reject(err);
              return defer.promise;
            });


        };

      });


      ///Patching static methods too
      currentStaticMethods.forEach(function (method) {

        var origMethod = Parse[currentClass][method];

        // Overwrite original function by wrapping it with $q
        Parse[currentClass][method] = function () {

          return origMethod.apply(this, arguments)
            .then(function (data) {
              var defer = $q.defer();
              defer.resolve(data);
              return defer.promise;
            }, function (err) {
              var defer = $q.defer();
              defer.reject(err);
              return defer.promise;
            });

        };

      });


    }
  }

}]);

},{"angular":"angular","lodash":"lodash","moment":"moment","parse":"parse"}]},{},[1]);

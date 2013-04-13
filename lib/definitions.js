var persistence = require('../persistence/dispatcher');
var tileRegistry = require('../tile/registry');
var api = require('../api');
var jiveUtil = require('./jiveutil');

function Definitions() {
}

Definitions.prototype = Object.create({}, {
    constructor: {
        value: Definitions,
        enumerable: false
    }
});

module.exports = Definitions;

var returnOne = function(found, callback ) {
    if ( found == null || found.length < 1 ) {
        callback( null );
    } else {
        // return first one
        callback( found[0] );
    }
};

Definitions.prototype.save = function (tileDefinition) {
    if (!tileDefinition.id) {
        tileDefinition.id = jiveUtil.guid();
    }

    var self = this;

    return {
        execute: function (callback) {
            persistence.save( self.getCollection(), tileDefinition.id, tileDefinition, function (saved) {
                callback(saved);
            });
        }
    };
};

Definitions.prototype.filterResults = function( results ) {
    return results;
};

Definitions.prototype.getCollection = function() {
    throw 'Must be subclassed';
};

Definitions.prototype.find = function ( keyValues, expectOne ) {
    var self = this;
    return {
        execute: function (callback) {
            persistence.find( self.getCollection(), keyValues, function( found ) {
                found = self.filterResults( found );
                if ( expectOne ) {
                    returnOne( found, callback )
                } else {
                    callback ( found );
                }
            } );
        }
    };
};

Definitions.prototype.findByID = function (tileDefinitionID) {
    return this.find( { "id": tileDefinitionID }, true );
};

Definitions.prototype.findByTileName = function (tilename) {
    return this.find( { "name": tilename }, true );
};

Definitions.prototype.findAll = function () {
    return this.find( null );
};

Definitions.prototype.remove = function (tileDefinitionID) {
    var self = this;
    return {
        execute: function (callback) {
            persistence.remove( self.getCollection(), tileDefinitionID, callback);
        }
    };
};

Definitions.prototype.addListeners = function(definitionName, listeners) {
    // register event listeners
    if ( listeners ) {
        listeners.forEach( function(listenerInfo) {
            tileRegistry.addEventListener(
                listenerInfo['event'], definitionName, listenerInfo['handler']
            );
        });
    }
};

Definitions.prototype.addTasks = function(tasks) {
    // register tasks
    if ( tasks ) {
        tasks.forEach( function( task ) {
            api.tasks.schedule(task);
        });
    }
};

Definitions.prototype.configure = function( definition, listeners, tasks, callback ) {
    var self = this;

    var definitionName = definition['name'];
    if ( !definition['id'] ) {
        definition['id'] = definitionName;
    }

    console.log("Registering", definitionName);

    // save tile definition
    // xxx todo maybe edit??
    this.save( definition ).execute(
        function(dbTile) {
            console.log("Definition saved:", definitionName );

            // register event listeners
            self.addListeners( definitionName, listeners );

            self.addTasks( tasks );

            if ( callback ) {
                callback( definition );
            }
        }
    );
};
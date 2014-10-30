'use strict';

var _ = require( 'lodash' );
var m = require( 'mithril' );

var empty = '';
var slash = '/';

module.exports = function buildRouteHash( routeMap ){
	var hash = {};

	void function buildRouteLevel( routeMap, tail, before ){
		_.each( routeMap, function buildRoute( value, key ){
			var props = routeProps( value, key, tail, before );

			if( props.redirect ){
				hash[ props.path ] = redirect( props.outcome, props.path );
			} 
			else if( props.module ){
				if( props.setup.length ){
					hash[ props.path ] = decorateModule( props.module, props.setup );
				}
				else {
					hash[ props.path ] = props.module;
				}
			}
			else if( props.subMap ){
				buildRouteLevel( props.subMap, props.path, props.setup );
			}
		} );
	}( routeMap, empty, [] );

	return hash;
};

function routeProps( value, key, tail, before ){
	var output = {};

	var prefix  = ( key || !tail ) ? slash : empty;
	var segment = prefix + key;
	var outcome = _.isArray( value ) && value.pop() || value;

	output.path     = tail + segment;
	output.setup    = _.isArray( value ) ? before.concat( value ) : before;
	output.module   = isModule( outcome ) && outcome;
	output.subMap   = !output.module && _.isPlainObject( outcome ) && outcome;
	output.redirect = _.isString( outcome );

	return output;
}

var redirect = ( function redirectScope(){
	var absolute   = /^\//;
	var ascend     = /^\.\.\//;
	var tail       = /[^\/]+\/?$/;
	var paramToken = /:([^\/]+)(\.\.\.)?/g;
	var emptyView  = function(){};

	function complete( to, from ){
		if( absolute.test( to ) ){
			return to;
		}
		while( ascend.test( to ) ){
			from = from.replace( tail, empty );
		}

		return from + to;
	}

	return function redirect( to, from ){
		var path = complete( to, from );

		return {
			controller : function redirection(){
				var endpoint = to.replace( paramToken, function insertParam( token, param ){
					return m.route.param( param );
				} );

				m.startComputation();

				m.route( endpoint );

				m.endComputation();
			},
			view       : emptyView
		};
	};
}() ); 

function decorateModule( module, setup ){
	return {
		controller : function controllerDecorator(){
			var args = _.toArray( args );

			_.each( setup, function executeSetup( fn ){
				fn.apply( module, args );
			} );

			return construct( module.controller, args );
		},
		view       : module.view
	};
}

var isModule = ( function propsContainer(){
	var props = [ 'controller', 'view' ];

	return function isModule( x ){
		return _( x ).omit( props ).isEmpty() && _( x ).pick( props ).every( _.isFunction );
	};
}() );

var construct = ( function metaConstructorFacade(){
	var bind = Function.prototype.bind;

	return bind ? function( Constructor, args ){
		return new ( bind.apply( 
			Constructor, 
			_( args )
				.concat( Constructor )
				.reverse()
				.valueOf() 
		) )();
	} : function( Constructor, args ){
		function Reconstruction( args ){
			return Constructor.apply( this, args );
		}

		Reconstruction.prototype = Constructor.prototype;

		return new Reconstruction( args );
	};
}() );

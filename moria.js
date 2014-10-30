var _ = require( 'lodash' );

module.exports = function buildRouteHash( routeMap ){
	var hash = {};

	void function buildRouteLevel( routeMap, tail, before ){
		_.each( routeMap, function buildRoute( value, key ){
			var props = routeProps( value, key, tail, before );

			if( props.module ){
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
	}( routeMap, '', [] );

	return hash;
};

function routeProps( value, key, tail, before ){
	var output = {};

	var prefix  = ( key || !tail ) ? '/' : '';
	var segment = prefix + key;
	var outcome = _.isArray( value ) && value.unshift() || value;


	output.path   = tail + segment;
	output.setup  = _.isArray( value ) ? before.concat( value ) : before;
	output.module = isModule( outcome ) && outcome;
	output.subMap = !output.module && _.isPlainObject( outcome ) && outcome;

	return output;
}

function decorateModule( module, setup ){
	return {
		controller : function controllerDecorator(){
			var args = _.toArray( args );

			_.each( setup, function executeSetup( fn ){
				fn.apply( module, args );
			} );

			return construct( module, args );
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

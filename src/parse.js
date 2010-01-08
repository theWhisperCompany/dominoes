var	// Regular expressions
	/** @const */ R_DELIM = /\s+/,
	
	// Symbols
	SYMBOLS = {},
	/** @const */ SYM_WAIT =		1,
	/** @const */ SYM_READY =		2,
	/** @const */ SYM_BEGIN =		3,
	/** @const */ SYM_END =			4,
	/** @const */ SYM_BEGIN_OPT =	5,
	/** @const */ SYM_END_OPT =		6,
	
	// Miscellaneous
	symbolsArray = "0 > >| { } {{ }}".split( R_DELIM ),
	i = symbolsArray.length;

// Initialize symbols
for (; --i ; SYMBOLS[ symbolsArray[ i ] ] = i );

/**
 * Parses a chain
 * @param expression
 * @return array
 */
function parseChain( chain ) {
	
	chain = chain.split( R_DELIM );
	
	var i = 0,
		length = chain.length,
		stack = [],
		root = [],
		current = root,
		tmp,
		item;
	
	current[ STR_PARALLEL ] = TRUE;
	
	for( ; i < length ; i++ ) {
		
		if ( item = chain[ i ] ) {
		
			if ( SYMBOLS[ item ] ) {
			
				item = SYMBOLS[ item ];
			
				if ( item === SYM_WAIT || item === SYM_READY ) {
					
					if ( item === SYM_READY ) {
						current.push( ready );
					}
					
					if ( current.length ) {
						
						tmp = current.splice( 0 , current.length );
						tmp[ STR_PARALLEL ] = current[ STR_PARALLEL ]; 
						current.push( tmp , [] );
						current[ STR_PARALLEL ] = FALSE;
						current = current[ 1 ];
						current[ STR_PARALLEL ] = TRUE;
						
					}
					
				} else if ( item === SYM_BEGIN || item === SYM_BEGIN_OPT ) {
					
					tmp = [];
					current.push( tmp );
					stack.push( current );
					current = tmp;
					current[ STR_PARALLEL ] = TRUE;
					current[ STR_OPTIONAL ] = item === SYM_BEGIN_OPT;
					
				} else if ( item === SYM_END || item === SYM_END_OPT ) {
					
					if ( stack.length ) {
						current = stack.pop();
					} else {
						error( "unexpected symbol" , chain[i] );
					}
				}
					
			} else {
			
				current.push( item );
				
			}
		}
		
	}
		
	return root;
}

/**
 * Parse a string item
 */
function parseStringItem( string , context , thread ) {

	var done,
		func,
		data = {},
		id = 0,
		tmp;
		
	function parseTemp( string ) {
		
		tmp = /^ \(\* ([0-9]+) \*\) $/.exec( string );
		
		return tmp ? data[ 1 * tmp[ 1 ] ] : string.replace( / \(\* ([0-9]+) \*\) /g , function( _ , key ) {
			
			tmp = data[ 1 * key ];
			if ( ! isString( tmp ) ) {
				error( "type mismatch" , "string expected" );
			}

			return tmp;
			
		} );
		
	}
	
	while ( ! done ) {
	
		done = TRUE;
		
		string = string.replace( /\$([^\${}]*){([^\${}]*)}/g , function( _ , name , args ) {
			
			done = FALSE;
			
			if ( name && ! ( func = functor( name ) ) ) {
				error( "unknown functor" , name );
			}
			
			args = parseTemp( args );
			
			if ( isString( args ) ) {
				args = parse ( args , context , thread );
			}
			
			data[ ++ id ] = name ? func.call( context , args , thread ) : property( args );
			
			if ( isString( data[ id ] ) ) {
				data[ id ] = parse( data[ id ] , context , thread );
			}
			
			return " (* " + id + " *) ";
			
		});
	}
	
	return parseTemp( string );
}

/**
 * Parse a string
 * @param string
 */
function parse( string , context , thread ) {
	
	var parsed;
	
	if ( R_DELIM.test( string ) ) {
		
		parsed = parseChain( string );
		
	} else if ( parsed = context[ string ] || rule( string ) ) {
			
		parsed = isString( parsed ) ? parse( parsed , context , thread ) : parsed;
			
	} else {
		
		parsed = parseStringItem( string , context , thread );
			
	}
	
	return parsed;
}


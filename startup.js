/**
 * This file is where we decide whether to initialise the modern support browser run-time.
 *
 * - Beware: This file MUST parse without errors on even the most ancient of browsers!
 */
/* eslint-disable no-implicit-globals */
/* global $CODE, RLQ:true, NORLQ:true */

/**
 * See <https://www.mediawiki.org/wiki/Compatibility#Browsers>
 *
 * Capabilities required for modern run-time:
 * - ECMAScript 5
 * - DOM Level 4 (including Selectors API)
 * - HTML5 (including Web Storage API)
 *
 * Browsers we support in our modern run-time (Grade A):
 * - Chrome 13+
 * - IE 11+
 * - Firefox 4+
 * - Safari 5+
 * - Opera 15+
 * - Mobile Safari 6.0+ (iOS 6+)
 * - Android 4.1+
 *
 * Browsers we support in our no-JavaScript, basic run-time (Grade C):
 * - Chrome 1+
 * - IE 8+
 * - Firefox 3+
 * - Safari 3+
 * - Opera 15+
 * - Mobile Safari 5.0+ (iOS 4+)
 * - Android 2.0+
 * - WebOS < 1.5
 * - PlayStation
 * - Symbian-based browsers
 * - NetFront-based browser
 * - Opera Mini
 * - Nokia's Ovi Browser
 * - MeeGo's browser
 * - Google Glass
 * - UC Mini (speed mode on)
 *
 * Other browsers that pass the check are considered unknown (Grade X).
 *
 * @private
 * @param {string} ua User agent string
 * @return {boolean} User agent is compatible with MediaWiki JS
 */
function isCompatible( ua ) {
	return !!(
		// https://caniuse.com/#feat=es5
		// https://caniuse.com/#feat=use-strict
		( function () {
			'use strict';
			return !this && Function.prototype.bind;
		}() ) &&

		// https://caniuse.com/#feat=queryselector
		'querySelector' in document &&

		// https://caniuse.com/#feat=namevalue-storage
		// https://developer.blackberry.com/html5/apis/v1_0/localstorage.html
		// https://blog.whatwg.org/this-week-in-html-5-episode-30
		'localStorage' in window &&

		// Force certain browsers into Basic mode, even if they pass the check.
		//
		// Some of the below are "remote browsers", where the webpage is actually
		// rendered remotely in a capable browser (cloud service) by the vendor,
		// with the client app receiving a graphical representation through a
		// format that is not HTML/CSS. These get a better user experience if
		// we turn JavaScript off, to avoid triggering JavaScript calls, which
		// either don't work or require a roundtrip to the server with added
		// latency. Note that remote browsers are sometimes referred to as
		// "proxy browsers", but that term is also conflated with browsers
		// that accelerate or compress web pages through a "proxy", where
		// client-side JS would generally be okay.
		//
		// Remember:
		//
		// - Add new entries on top, and document why and since when.
		// - Please extend the regex instead of adding new ones, for performance.
		// - Add a test case to startup.test.js.
		//
		// Forced into Basic mode:
		//
		// - MSIE 10: Bugs (since 2018, T187869).
		//   Low traffic. Reduce support cost by no longer having to workaround
		//   bugs in its JavaScript APIs.
		//
		// - UC Mini "Speed Mode": Improve UX, save data (since 2016, T147369).
		//   Does not have an obvious user agent, other than ending with an
		//   incomplete `Gecko/` token.
		//
		// - Google Web Light: Bugs, save data (since 2016, T152602).
		//   Proxy breaks most JavaScript.
		//
		// - MeeGo: Bugs (since 2015, T97546).
		//
		// - Opera Mini: Improve UX, save data. (since 2013, T49572).
		//   It is a remote browser.
		//
		// - Ovi Browser: Improve UX, save data (since 2013, T57600).
		//   It is a remote browser. UA contains "S40OviBrowser".
		//
		// - Google Glass: Improve UX (since 2013, T58008).
		//   Run modern browser engine, but limited UI is better served when
		//   content is expand by default, requiring little interaction.
		//
		// - NetFront: Unsupported by jQuery (since 2013, commit c46fc74).
		// - PlayStation: Unsupported by jQuery (since 2013, commit c46fc74).
		//
		!ua.match( /MSIE 10|NetFront|Opera Mini|S40OviBrowser|MeeGo|Android.+Glass|^Mozilla\/5\.0 .+ Gecko\/$|googleweblight|PLAYSTATION|PlayStation/ )
	);
}

if ( !isCompatible( navigator.userAgent ) ) {
	// Handle basic supported browsers (Grade C).
	// Undo speculative modern (Grade A) root CSS class `<html class="client-js">`.
	// See ResourceLoaderClientHtml::getDocumentAttributes().
	document.documentElement.className = document.documentElement.className
		.replace( /(^|\s)client-js(\s|$)/, '$1client-nojs$2' );

	// Process any callbacks for basic support (Grade C).
	while ( window.NORLQ && NORLQ[ 0 ] ) {
		NORLQ.shift()();
	}
	NORLQ = {
		push: function ( fn ) {
			fn();
		}
	};

	// Clear and disable the modern (Grade A) queue.
	RLQ = {
		push: function () {}
	};
} else {
	// Handle modern (Grade A).

	if ( window.performance && performance.mark ) {
		performance.mark( 'mwStartup' );
	}

	// This embeds mediawiki.js, which defines 'mw' and 'mw.loader'.
	/**
 * Base library for MediaWiki.
 *
 * Exposed globally as `mw`, with `mediaWiki` as alias.
 *
 * @class mw
 * @singleton
 */
/* global $CODE */

( function () {
	'use strict';

	var con = window.console;

	/**
	 * Log a message to window.console.
	 *
	 * Useful to force logging of some errors that are otherwise hard to detect (i.e., this logs
	 * also in production mode).
	 *
	 * @private
	 * @param {string} topic Stream name passed by mw.track
	 * @param {Object} data Data passed by mw.track
	 * @param {Error} [data.exception]
	 * @param {string} data.source Error source
	 * @param {string} [data.module] Name of module which caused the error
	 */
	function logError( topic, data ) {
		var e = data.exception;
		var msg = ( e ? 'Exception' : 'Error' ) +
			' in ' + data.source +
			( data.module ? ' in module ' + data.module : '' ) +
			( e ? ':' : '.' );

		con.log( msg );

		// If we have an exception object, log it to the warning channel to trigger
		// proper stacktraces in browsers that support it.
		if ( e ) {
			con.warn( e );
		}
	}

	/**
	 * Create an object that can be read from or written to via methods that allow
	 * interaction both with single and multiple properties at once.
	 *
	 * @private
	 * @class mw.Map
	 *
	 * @constructor
	 */
	function Map() {
		this.values = Object.create( null );
	}

	Map.prototype = {
		constructor: Map,

		/**
		 * Get the value of one or more keys.
		 *
		 * If called with no arguments, all values are returned.
		 *
		 * @param {string|Array} [selection] Key or array of keys to retrieve values for.
		 * @param {Mixed} [fallback=null] Value for keys that don't exist.
		 * @return {Mixed|Object|null} If selection was a string, returns the value,
		 *  If selection was an array, returns an object of key/values.
		 *  If no selection is passed, a new object with all key/values is returned.
		 */
		get: function ( selection, fallback ) {
			if ( arguments.length < 2 ) {
				fallback = null;
			}

			if ( typeof selection === 'string' ) {
				return selection in this.values ?
					this.values[ selection ] :
					fallback;
			}

			var results;
			if ( Array.isArray( selection ) ) {
				results = {};
				for ( var i = 0; i < selection.length; i++ ) {
					if ( typeof selection[ i ] === 'string' ) {
						results[ selection[ i ] ] = selection[ i ] in this.values ?
							this.values[ selection[ i ] ] :
							fallback;
					}
				}
				return results;
			}

			if ( selection === undefined ) {
				results = {};
				for ( var key in this.values ) {
					results[ key ] = this.values[ key ];
				}
				return results;
			}

			// Invalid selection key
			return fallback;
		},

		/**
		 * Set one or more key/value pairs.
		 *
		 * @param {string|Object} selection Key to set value for, or object mapping keys to values
		 * @param {Mixed} [value] Value to set (optional, only in use when key is a string)
		 * @return {boolean} True on success, false on failure
		 */
		set: function ( selection, value ) {
			// Use `arguments.length` because `undefined` is also a valid value.
			if ( arguments.length > 1 ) {
				// Set one key
				if ( typeof selection === 'string' ) {
					this.values[ selection ] = value;
					return true;
				}
			} else if ( typeof selection === 'object' ) {
				// Set multiple keys
				for ( var key in selection ) {
					this.values[ key ] = selection[ key ];
				}
				return true;
			}
			return false;
		},

		/**
		 * Check if a given key exists in the map.
		 *
		 * @param {string} selection Key to check
		 * @return {boolean} True if the key exists
		 */
		exists: function ( selection ) {
			return typeof selection === 'string' && selection in this.values;
		}
	};

	/**
	 * Write a verbose message to the browser's console in debug mode.
	 *
	 * This method is mainly intended for verbose logging. It is a no-op in production mode.
	 * In ResourceLoader debug mode, it will use the browser's console.
	 *
	 * See {@link mw.log} for other logging methods.
	 *
	 * @member mw
	 * @param {...string} msg Messages to output to console.
	 */
	var log = function () {
		console.log.apply( console, arguments );
	};

	/**
	 * Collection of methods to help log messages to the console.
	 *
	 * @class mw.log
	 * @singleton
	 */

	/**
	 * Write a message to the browser console's warning channel.
	 *
	 * @param {...string} msg Messages to output to console
	 */
	log.warn = Function.prototype.bind.call( con.warn, con );

	/**
	 * @class mw
	 */
	var mw = {

		/**
		 * Get the current time, measured in milliseconds since January 1, 1970 (UTC).
		 *
		 * On browsers that implement the Navigation Timing API, this function will produce
		 * floating-point values with microsecond precision that are guaranteed to be monotonic.
		 * On all other browsers, it will fall back to using `Date`.
		 *
		 * @return {number} Current time
		 */
		now: function () {
			// Optimisation: Cache and re-use the chosen implementation.
			// Optimisation: Avoid startup overhead by re-defining on first call instead of IIFE.
			var perf = window.performance;
			var navStart = perf && perf.timing && perf.timing.navigationStart;

			// Define the relevant shortcut
			mw.now = navStart && perf.now ?
				function () { return navStart + perf.now(); } :
				Date.now;

			return mw.now();
		},

		/**
		 * List of all analytic events emitted so far.
		 *
		 * Exposed only for use by mediawiki.base.
		 *
		 * @private
		 * @property {Array}
		 */
		trackQueue: [],

		track: function ( topic, data ) {
			mw.trackQueue.push( { topic: topic, data: data } );
			// This method is extended by mediawiki.base to also fire events.
		},

		/**
		 * Track an early error event via mw.track and send it to the window console.
		 *
		 * @private
		 * @param {string} topic Topic name
		 * @param {Object} data Data describing the event, encoded as an object; see mw#logError
		 */
		trackError: function ( topic, data ) {
			mw.track( topic, data );
			logError( topic, data );
		},

		// Expose Map constructor
		Map: Map,

		/**
		 * Map of configuration values.
		 *
		 * Check out [the complete list of configuration values](https://www.mediawiki.org/wiki/Manual:Interface/JavaScript#mw.config)
		 * on mediawiki.org.
		 *
		 * @property {mw.Map} config
		 */
		config: new Map(),

		/**
		 * Store for messages.
		 *
		 * @property {mw.Map}
		 */
		messages: new Map(),

		/**
		 * Store for templates associated with a module.
		 *
		 * @property {mw.Map}
		 */
		templates: new Map(),

		// Expose mw.log
		log: log

		// mw.loader is defined in a separate file that is appended to this
	};

	// Attach to window and globally alias
	window.mw = window.mediaWiki = mw;
}() );
/*!
 * Defines mw.loader, the infrastructure for loading ResourceLoader
 * modules.
 *
 * This file is appended directly to the code in startup/mediawiki.js
 */
/* global $VARS, $CODE, mw */

/* eslint-disable es-x/no-set, es-x/no-promise-prototype-finally, es-x/no-regexp-prototype-flags */

( function () {
	'use strict';

	var StringSet,
		store,
		hasOwn = Object.hasOwnProperty;

	function defineFallbacks() {
		// <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set>
		/**
		 * @private
		 * @class StringSet
		 */
		StringSet = window.Set || function () {
			var set = Object.create( null );
			return {
				add: function ( value ) {
					set[ value ] = true;
				},
				has: function ( value ) {
					return value in set;
				}
			};
		};
	}

	defineFallbacks();

	// In test mode, this generates `mw.redefineFallbacksForTest = defineFallbacks;`.
	// Otherwise, it produces nothing. See also ResourceLoader\StartUpModule::getScript().
	

	/**
	 * Client for ResourceLoader server end point.
	 *
	 * This client is in charge of maintaining the module registry and state
	 * machine, initiating network (batch) requests for loading modules, as
	 * well as dependency resolution and execution of source code.
	 *
	 * For more information, refer to
	 * <https://www.mediawiki.org/wiki/ResourceLoader/Features>
	 *
	 * @class mw.loader
	 * @singleton
	 */

	/**
	 * FNV132 hash function
	 *
	 * This function implements the 32-bit version of FNV-1.
	 * It is equivalent to hash( 'fnv132', ... ) in PHP, except
	 * its output is base 36 rather than hex.
	 * See <https://en.wikipedia.org/wiki/Fowler–Noll–Vo_hash_function>
	 *
	 * @private
	 * @param {string} str String to hash
	 * @return {string} hash as an five-character base 36 string
	 */
	function fnv132( str ) {
		var hash = 0x811C9DC5;

		/* eslint-disable no-bitwise */
		for ( var i = 0; i < str.length; i++ ) {
			hash += ( hash << 1 ) + ( hash << 4 ) + ( hash << 7 ) + ( hash << 8 ) + ( hash << 24 );
			hash ^= str.charCodeAt( i );
		}

		hash = ( hash >>> 0 ).toString( 36 ).slice( 0, 5 );
		/* eslint-enable no-bitwise */

		while ( hash.length < 5 ) {
			hash = '0' + hash;
		}
		return hash;
	}

	// Check whether the browser supports ES6.
	// We are feature detecting Promises and Arrow Functions with default params
	// (which are good indicators of overall support). An additional test for
	// regex behavior filters out Android 4.4.4 and Edge 18 or lower.
	// This check doesn't quite guarantee full ES6 support: Safari 11-13 don't
	// support non-BMP characters in identifiers, but support all other ES6
	// features we care about. To guard against accidentally breaking these
	// Safari versions with code they can't parse, we have an eslint rule
	// prohibiting non-BMP characters from being used in identifiers.
	var isES6Supported =
		// Check for Promise support (filters out most non-ES6 browsers)
		typeof Promise === 'function' &&
		// eslint-disable-next-line no-undef
		Promise.prototype.finally &&

		// Check for RegExp.prototype.flags (filters out Android 4.4.4 and Edge <= 18)
		/./g.flags === 'g' &&

		// Test for arrow functions and default arguments, a good proxy for a
		// wide range of ES6 support. Borrowed from Benjamin De Cock's snippet here:
		// https://gist.github.com/bendc/d7f3dbc83d0f65ca0433caf90378cd95
		// This will exclude Safari and Mobile Safari prior to version 10.
		( function () {
			try {
				// eslint-disable-next-line no-new, no-new-func
				new Function( '(a = 0) => a' );
				return true;
			} catch ( e ) {
				return false;
			}
		}() );

	/**
	 * Fired via mw.track on various resource loading errors.
	 *
	 * @event resourceloader_exception
	 * @param {Error|Mixed} e The error that was thrown. Almost always an Error
	 *   object, but in theory module code could manually throw something else, and that
	 *   might also end up here.
	 * @param {string} [module] Name of the module which caused the error. Omitted if the
	 *   error is not module-related or the module cannot be easily identified due to
	 *   batched handling.
	 * @param {string} source Source of the error. Possible values:
	 *
	 *   - load-callback: exception thrown by user callback
	 *   - module-execute: exception thrown by module code
	 *   - resolve: failed to sort dependencies for a module in mw.loader.load
	 *   - store-eval: could not evaluate module code cached in localStorage
	 *   - store-localstorage-json: JSON conversion error in mw.loader.store
	 *   - store-localstorage-update: localStorage conversion error in mw.loader.store.
	 */

	/**
	 * Mapping of registered modules.
	 *
	 * See #implement and #execute for exact details on support for script, style and messages.
	 *
	 *     @example Format:
	 *
	 *     {
	 *         'moduleName': {
	 *             // From mw.loader.register()
	 *             'version': '#####' (five-character hash)
	 *             'dependencies': ['required.foo', 'bar.also', ...]
	 *             'group': string, integer, (or) null
	 *             'source': 'local', (or) 'anotherwiki'
	 *             'skip': 'return !!window.Example;', (or) null, (or) boolean result of skip
	 *             'module': export Object
	 *
	 *             // Set from execute() or mw.loader.state()
	 *             'state': 'registered', 'loading', 'loaded', 'executing', 'ready', 'error', or 'missing'
	 *
	 *             // Optionally added at run-time by mw.loader.implement()
	 *             'script': closure, array of urls, or string
	 *             'style': { ... } (see #execute)
	 *             'messages': { 'key': 'value', ... }
	 *         }
	 *     }
	 *
	 * State machine:
	 *
	 * - `registered`:
	 *    The module is known to the system but not yet required.
	 *    Meta data is registered via mw.loader#register. Calls to that method are
	 *    generated server-side by the startup module.
	 * - `loading`:
	 *    The module was required through mw.loader (either directly or as dependency of
	 *    another module). The client will fetch module contents from the server.
	 *    The contents are then stashed in the registry via mw.loader#implement.
	 * - `loaded`:
	 *    The module has been loaded from the server and stashed via mw.loader#implement.
	 *    Once the module has no more dependencies in-flight, the module will be executed,
	 *    controlled via #setAndPropagate and #doPropagation.
	 * - `executing`:
	 *    The module is being executed.
	 * - `ready`:
	 *    The module has been successfully executed.
	 * - `error`:
	 *    The module (or one of its dependencies) produced an error during execution.
	 * - `missing`:
	 *    The module was registered client-side and requested, but the server denied knowledge
	 *    of the module's existence.
	 *
	 * @property {Object}
	 * @private
	 */
	var registry = Object.create( null ),
		// Mapping of sources, keyed by source-id, values are strings.
		//
		// Format:
		//
		//     {
		//         'sourceId': 'http://example.org/w/load.php'
		//     }
		//
		sources = Object.create( null ),

		// For queueModuleScript()
		handlingPendingRequests = false,
		pendingRequests = [],

		// List of modules to be loaded
		queue = [],

		/**
		 * List of callback jobs waiting for modules to be ready.
		 *
		 * Jobs are created by #enqueue() and run by #doPropagation().
		 * Typically when a job is created for a module, the job's dependencies contain
		 * both the required module and all its recursive dependencies.
		 *
		 *     @example Format:
		 *
		 *     {
		 *         'dependencies': [ module names ],
		 *         'ready': Function callback
		 *         'error': Function callback
		 *     }
		 *
		 * @property {Object[]} jobs
		 * @private
		 */
		jobs = [],

		// For #setAndPropagate() and #doPropagation()
		willPropagate = false,
		errorModules = [],

		/**
		 * @private
		 * @property {Array} baseModules
		 */
		baseModules = [
    "jquery",
    "mediawiki.base"
],

		/**
		 * For #addEmbeddedCSS() and #addLink()
		 *
		 * @private
		 * @property {HTMLElement|null} marker
		 */
		marker = document.querySelector( 'meta[name="ResourceLoaderDynamicStyles"]' ),

		// For #addEmbeddedCSS()
		lastCssBuffer,
		rAF = window.requestAnimationFrame || setTimeout;

	/**
	 * Append an HTML element to `document.head` or before a specified node.
	 *
	 * @private
	 * @param {HTMLElement} el
	 * @param {Node|null} [nextNode]
	 */
	function addToHead( el, nextNode ) {
		if ( nextNode && nextNode.parentNode ) {
			nextNode.parentNode.insertBefore( el, nextNode );
		} else {
			document.head.appendChild( el );
		}
	}

	/**
	 * Create a new style element and add it to the DOM.
	 *
	 * @private
	 * @param {string} text CSS text
	 * @param {Node|null} [nextNode] The element where the style tag
	 *  should be inserted before
	 * @return {HTMLElement} Reference to the created style element
	 */
	function newStyleTag( text, nextNode ) {
		var el = document.createElement( 'style' );
		el.appendChild( document.createTextNode( text ) );
		addToHead( el, nextNode );
		return el;
	}

	/**
	 * @private
	 * @param {Object} cssBuffer
	 */
	function flushCssBuffer( cssBuffer ) {
		// Make sure the next call to addEmbeddedCSS() starts a new buffer.
		// This must be done before we run the callbacks, as those may end up
		// queueing new chunks which would be lost otherwise (T105973).
		//
		// There can be more than one buffer in-flight (given "@import", and
		// generally due to race conditions). Only tell addEmbeddedCSS() to
		// start a new buffer if we're currently flushing the last one that it
		// started. If we're flushing an older buffer, keep the last one open.
		if ( cssBuffer === lastCssBuffer ) {
			lastCssBuffer = null;
		}
		newStyleTag( cssBuffer.cssText, marker );
		for ( var i = 0; i < cssBuffer.callbacks.length; i++ ) {
			cssBuffer.callbacks[ i ]();
		}
	}

	/**
	 * Add a bit of CSS text to the current browser page.
	 *
	 * The creation and insertion of the `<style>` element is debounced for two reasons:
	 *
	 * - Performing the insertion before the next paint round via requestAnimationFrame
	 *   avoids forced or wasted style recomputations, which are expensive in browsers.
	 * - Reduce how often new stylesheets are inserted by letting additional calls to this
	 *   function accumulate into a buffer for at least one JavaScript tick. Modules are
	 *   received from the server in batches, which means there is likely going to be many
	 *   calls to this function in a row within the same tick / the same call stack.
	 *   See also T47810.
	 *
	 * @private
	 * @param {string} cssText CSS text to be added in a `<style>` tag.
	 * @param {Function} callback Called after the insertion has occurred.
	 */
	function addEmbeddedCSS( cssText, callback ) {
		// Start a new buffer if one of the following is true:
		// - We've never started a buffer before, this will be our first.
		// - The last buffer we created was flushed meanwhile, so start a new one.
		// - The next CSS chunk syntactically needs to be at the start of a stylesheet (T37562).
		//
		// Optimization: Avoid computing the string length each time ('@import'.length === 7)
		if ( !lastCssBuffer || cssText.slice( 0, 7 ) === '@import' ) {
			lastCssBuffer = {
				cssText: '',
				callbacks: []
			};
			rAF( flushCssBuffer.bind( null, lastCssBuffer ) );
		}

		// Linebreak for somewhat distinguishable sections
		lastCssBuffer.cssText += '\n' + cssText;
		lastCssBuffer.callbacks.push( callback );
	}

	/**
	 * See also `ResourceLoader.php#makeVersionQuery` on the server.
	 *
	 * @private
	 * @param {string[]} modules List of module names
	 * @return {string} Hash of concatenated version hashes.
	 */
	function getCombinedVersion( modules ) {
		var hashes = modules.reduce( function ( result, module ) {
			return result + registry[ module ].version;
		}, '' );
		return fnv132( hashes );
	}

	/**
	 * Determine whether all dependencies are in state 'ready', which means we may
	 * execute the module or job now.
	 *
	 * @private
	 * @param {string[]} modules Names of modules to be checked
	 * @return {boolean} True if all modules are in state 'ready', false otherwise
	 */
	function allReady( modules ) { return true;
		for ( var i = 0; i < modules.length; i++ ) {
			if ( mw.loader.getState( modules[ i ] ) !== 'ready' ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Determine whether all direct and base dependencies are in state 'ready'
	 *
	 * @private
	 * @param {string} module Name of the module to be checked
	 * @return {boolean} True if all direct/base dependencies are in state 'ready'; false otherwise
	 */
	function allWithImplicitReady( module ) {
		return allReady( registry[ module ].dependencies ) &&
			( baseModules.indexOf( module ) !== -1 || allReady( baseModules ) );
	}

	/**
	 * Determine whether all dependencies are in state 'ready', which means we may
	 * execute the module or job now.
	 *
	 * @private
	 * @param {string[]} modules Names of modules to be checked
	 * @return {boolean|string} False if no modules are in state 'error' or 'missing';
	 *  failed module otherwise
	 */
	function anyFailed( modules ) {
		for ( var i = 0; i < modules.length; i++ ) {
			var state = mw.loader.getState( modules[ i ] );
			if ( state === 'error' || state === 'missing' ) {
				return modules[ i ];
			}
		}
		return false;
	}

	/**
	 * Handle propagation of module state changes and reactions to them.
	 *
	 * - When a module reaches a failure state, this should be propagated to
	 *   modules that depend on the failed module.
	 * - When a module reaches a final state, pending job callbacks for the
	 *   module from mw.loader.using() should be called.
	 * - When a module reaches the 'ready' state from #execute(), consider
	 *   executing dependent modules now having their dependencies satisfied.
	 * - When a module reaches the 'loaded' state from mw.loader.implement,
	 *   consider executing it, if it has no unsatisfied dependencies.
	 *
	 * @private
	 */
	function doPropagation() {
		var didPropagate = true;
		var module;

		// Keep going until the last iteration performed no actions.
		while ( didPropagate ) {
			didPropagate = false;

			// Stage 1: Propagate failures
			while ( errorModules.length ) {
				var errorModule = errorModules.shift(),
					baseModuleError = baseModules.indexOf( errorModule ) !== -1;
				for ( module in registry ) {
					if ( registry[ module ].state !== 'error' && registry[ module ].state !== 'missing' ) {
						if ( baseModuleError && baseModules.indexOf( module ) === -1 ) {
							// Propate error from base module to all regular (non-base) modules
							registry[ module ].state = 'error';
							didPropagate = true;
						} else if ( registry[ module ].dependencies.indexOf( errorModule ) !== -1 ) {
							// Propagate error from dependency to depending module
							registry[ module ].state = 'error';
							// .. and propagate it further
							errorModules.push( module );
							didPropagate = true;
						}
					}
				}
			}

			// Stage 2: Execute 'loaded' modules with no unsatisfied dependencies
			for ( module in registry ) {
				if ( registry[ module ].state === 'loaded' && allWithImplicitReady( module ) ) {
					// Recursively execute all dependent modules that were already loaded
					// (waiting for execution) and no longer have unsatisfied dependencies.
					// Base modules may have dependencies amongst eachother to ensure correct
					// execution order. Regular modules wait for all base modules.
					execute( module );
					didPropagate = true;
				}
			}

			// Stage 3: Invoke job callbacks that are no longer blocked
			for ( var i = 0; i < jobs.length; i++ ) {
				var job = jobs[ i ];
				var failed = anyFailed( job.dependencies );
				if ( failed !== false || allReady( job.dependencies ) ) {
					jobs.splice( i, 1 );
					i -= 1;
					try {
						if ( failed !== false && job.error ) {
							job.error( new Error( 'Failed dependency: ' + failed ), job.dependencies );
						} else if ( failed === false && job.ready ) {
							job.ready();
						}
					} catch ( e ) {
						// A user-defined callback raised an exception.
						// Swallow it to protect our state machine!
						mw.trackError( 'resourceloader.exception', {
							exception: e,
							source: 'load-callback'
						} );
					}
					didPropagate = true;
				}
			}
		}

		willPropagate = false;
	}

	/**
	 * Update a module's state in the registry and make sure any necessary
	 * propagation will occur, by adding a (debounced) call to doPropagation().
	 * See #doPropagation for more about propagation.
	 * See #registry for more about how states are used.
	 *
	 * @private
	 * @param {string} module
	 * @param {string} state
	 */
	function setAndPropagate( module, state ) {
		registry[ module ].state = state;
		if ( state === 'ready' ) {
			// Queue to later be synced to the local module store.
			store.add( module );
		} else if ( state === 'error' || state === 'missing' ) {
			errorModules.push( module );
		} else if ( state !== 'loaded' ) {
			// We only have something to do in doPropagation for the
			// 'loaded', 'ready', 'error', and 'missing' states.
			// Avoid scheduling and propagation cost for frequent and short-lived
			// transition states, such as 'loading' and 'executing'.
			return;
		}
		if ( willPropagate ) {
			// Already scheduled, or, we're already in a doPropagation stack.
			return;
		}
		willPropagate = true;
		// Yield for two reasons:
		// * Allow successive calls to mw.loader.implement() from the same
		//   load.php response, or from the same asyncEval() to be in the
		//   propagation batch.
		// * Allow the browser to breathe between the reception of
		//   module source code and the execution of it.
		//
		// Use a high priority because the user may be waiting for interactions
		// to start being possible. But, first provide a moment (up to 'timeout')
		// for native input event handling (e.g. scrolling/typing/clicking).
		doPropagation();
	}

	/**
	 * Resolve dependencies and detect circular references.
	 *
	 * @private
	 * @param {string} module Name of the top-level module whose dependencies shall be
	 *  resolved and sorted.
	 * @param {Array} resolved Returns a topological sort of the given module and its
	 *  dependencies, such that later modules depend on earlier modules. The array
	 *  contains the module names. If the array contains already some module names,
	 *  this function appends its result to the pre-existing array.
	 * @param {StringSet} [unresolved] Used to detect loops in the dependency graph.
	 * @throws {Error} If an unknown module or a circular dependency is encountered
	 */
	function sortDependencies( module, resolved, unresolved ) {
		if ( !( module in registry ) ) {
			throw new Error( 'Unknown module: ' + module );
		}

		if ( typeof registry[ module ].skip === 'string' ) {
			// eslint-disable-next-line no-new-func
			var skip = ( new Function( registry[ module ].skip )() );
			registry[ module ].skip = !!skip;
			if ( skip ) {
				registry[ module ].dependencies = [];
				setAndPropagate( module, 'ready' );
				return;
			}
		}

		// Create unresolved if not passed in
		if ( !unresolved ) {
			unresolved = new StringSet();
		}

		// Track down dependencies
		var deps = registry[ module ].dependencies;
		unresolved.add( module );
		for ( var i = 0; i < deps.length; i++ ) {
			if ( resolved.indexOf( deps[ i ] ) === -1 ) {
				if ( unresolved.has( deps[ i ] ) ) {
					throw new Error(
						'Circular reference detected: ' + module + ' -> ' + deps[ i ]
					);
				}

				sortDependencies( deps[ i ], resolved, unresolved );
			}
		}

		resolved.push( module );
	}

	/**
	 * Get names of module that a module depends on, in their proper dependency order.
	 *
	 * @private
	 * @param {string[]} modules Array of string module names
	 * @return {Array} List of dependencies, including 'module'.
	 * @throws {Error} If an unregistered module or a dependency loop is encountered
	 */
	function resolve( modules ) {
		// Always load base modules
		var resolved = baseModules.slice();
		for ( var i = 0; i < modules.length; i++ ) {
			sortDependencies( modules[ i ], resolved );
		}
		return resolved;
	}

	/**
	 * Like #resolve(), except it will silently ignore modules that
	 * are missing or have missing dependencies.
	 *
	 * @private
	 * @param {string[]} modules Array of string module names
	 * @return {Array} List of dependencies.
	 */
	function resolveStubbornly( modules ) {
		// Always load base modules
		var resolved = baseModules.slice();
		for ( var i = 0; i < modules.length; i++ ) {
			var saved = resolved.slice();
			try {
				sortDependencies( modules[ i ], resolved );
			} catch ( err ) {
				resolved = saved;
				// This module is not currently known, or has invalid dependencies.
				//
				// Most likely due to a cached reference after the module was
				// removed, otherwise made redundant, or omitted from the registry
				// by the ResourceLoader "target" system or "requiresES6" flag.
				//
				// These errors can be common, e.g. queuing an ES6-only module
				// unconditionally from the server-side is OK and should fail gracefully
				// in ES5 browsers.
				mw.log.warn( 'Skipped unavailable module ' + modules[ i ] );
				// Do not track this error as an exception when the module:
				// - Is valid, but gracefully filtered out by target system.
				// - Is valid, but gracefully filtered out by requiresES6 flag.
				// - Was recently valid, but is still referenced in stale cache.
				//
				// Basically the only reason to track this as exception is when the error
				// was circular or invalid dependencies. What the above scenarios have in
				// common is that they don't register the module client-side.
				if ( modules[ i ] in registry ) {
					mw.trackError( 'resourceloader.exception', {
						exception: err,
						source: 'resolve'
					} );
				}
			}
		}
		return resolved;
	}

	/**
	 * Resolve a relative file path.
	 *
	 * For example, resolveRelativePath( '../foo.js', 'resources/src/bar/bar.js' )
	 * returns 'resources/src/foo.js'.
	 *
	 * @private
	 * @param {string} relativePath Relative file path, starting with ./ or ../
	 * @param {string} basePath Path of the file (not directory) relativePath is relative to
	 * @return {string|null} Resolved path, or null if relativePath does not start with ./ or ../
	 */
	function resolveRelativePath( relativePath, basePath ) {
		var relParts = relativePath.match( /^((?:\.\.?\/)+)(.*)$/ );
		if ( !relParts ) {
			return null;
		}

		var baseDirParts = basePath.split( '/' );
		// basePath looks like 'foo/bar/baz.js', so baseDirParts looks like [ 'foo', 'bar, 'baz.js' ]
		// Remove the file component at the end, so that we are left with only the directory path
		baseDirParts.pop();

		var prefixes = relParts[ 1 ].split( '/' );
		// relParts[ 1 ] looks like '../../', so prefixes looks like [ '..', '..', '' ]
		// Remove the empty element at the end
		prefixes.pop();

		// For every ../ in the path prefix, remove one directory level from baseDirParts
		var prefix;
		while ( ( prefix = prefixes.pop() ) !== undefined ) {
			if ( prefix === '..' ) {
				baseDirParts.pop();
			}
		}

		// If there's anything left of the base path, prepend it to the file path
		return ( baseDirParts.length ? baseDirParts.join( '/' ) + '/' : '' ) + relParts[ 2 ];
	}

	/**
	 * Make a require() function scoped to a package file
	 *
	 * @private
	 * @param {Object} moduleObj Module object from the registry
	 * @param {string} basePath Path of the file this is scoped to. Used for relative paths.
	 * @return {Function}
	 */
	function makeRequireFunction( moduleObj, basePath ) {
		return function require( moduleName ) {
			var fileName = resolveRelativePath( moduleName, basePath );
			if ( fileName === null ) {
				// Not a relative path, so it's a module name
				return mw.loader.require( moduleName );
			}

			if ( hasOwn.call( moduleObj.packageExports, fileName ) ) {
				// File has already been executed, return the cached result
				return moduleObj.packageExports[ fileName ];
			}

			var scriptFiles = moduleObj.script.files;
			if ( !hasOwn.call( scriptFiles, fileName ) ) {
				throw new Error( 'Cannot require undefined file ' + fileName );
			}

			var result,
				fileContent = scriptFiles[ fileName ];
			if ( typeof fileContent === 'function' ) {
				var moduleParam = { exports: {} };
				fileContent( makeRequireFunction( moduleObj, fileName ), moduleParam, moduleParam.exports );
				result = moduleParam.exports;
			} else {
				// fileContent is raw data (such as a JSON object), just pass it through
				result = fileContent;
			}
			moduleObj.packageExports[ fileName ] = result;
			return result;
		};
	}

	/**
	 * Load and execute a script.
	 *
	 * @private
	 * @param {string} src URL to script, will be used as the src attribute in the script tag
	 * @param {Function} [callback] Callback to run after request resolution
	 * @return {HTMLElement}
	 */
	function addScript( src, callback ) {
		// Use a <script> element rather than XHR. Using XHR changes the request
		// headers (potentially missing a cache hit), and reduces caching in general
		// since browsers cache XHR much less (if at all). And XHR means we retrieve
		// text, so we'd need to eval, which then messes up line numbers.
		// The drawback is that <script> does not offer progress events, feedback is
		// only given after downloading, parsing, and execution have completed.
		var script = document.createElement( 'script' );
		script.src = src;
		script.onload = script.onerror = function () {
			if ( script.parentNode ) {
				script.parentNode.removeChild( script );
			}
			if ( callback ) {
				callback();
				callback = null;
			}
		};
		document.head.appendChild( script );
		return script;
	}

	/**
	 * Queue the loading and execution of a script for a particular module.
	 *
	 * This does for legacy debug mode what runScript() does for production.
	 *
	 * @private
	 * @param {string} src URL of the script
	 * @param {string} moduleName Name of currently executing module
	 * @param {Function} callback Callback to run after addScript() resolution
	 */
	function queueModuleScript( src, moduleName, callback ) {
		pendingRequests.push( function () {
			// Keep in sync with execute()/runScript().
			if ( moduleName !== 'jquery' ) {
				window.require = mw.loader.require;
				window.module = registry[ moduleName ].module;
			}
			addScript( src, function () {
				// 'module.exports' should not persist after the file is executed to
				// avoid leakage to unrelated code. 'require' should be kept, however,
				// as asynchronous access to 'require' is allowed and expected. (T144879)
				delete window.module;
				callback();
				// Start the next one (if any)
				if ( pendingRequests[ 0 ] ) {
					pendingRequests.shift()();
				} else {
					handlingPendingRequests = false;
				}
			} );
		} );
		if ( !handlingPendingRequests && pendingRequests[ 0 ] ) {
			handlingPendingRequests = true;
			pendingRequests.shift()();
		}
	}

	/**
	 * Utility function for execute()
	 *
	 * @ignore
	 * @param {string} url URL
	 * @param {string} [media] Media attribute
	 * @param {Node|null} [nextNode]
	 * @return {HTMLElement}
	 */
	function addLink( url, media, nextNode ) {
		var el = document.createElement( 'link' );

		el.rel = 'stylesheet';
		if ( media ) {
			el.media = media;
		}
		// If you end up here from an IE exception "SCRIPT: Invalid property value.",
		// see #addEmbeddedCSS, T33676, T43331, and T49277 for details.
		el.href = url;

		addToHead( el, nextNode );
		return el;
	}

	/**
	 * @private
	 * @param {string} code JavaScript code
	 */
	function domEval( code ) {
		var script = document.createElement( 'script' );
		if ( mw.config.get( 'wgCSPNonce' ) !== false ) {
			script.nonce = mw.config.get( 'wgCSPNonce' );
		}
		script.text = code;
		document.head.appendChild( script );
		script.parentNode.removeChild( script );
	}

	/**
	 * Add one or more modules to the module load queue.
	 *
	 * See also #work().
	 *
	 * @private
	 * @param {string[]} dependencies Array of module names in the registry
	 * @param {Function} [ready] Callback to execute when all dependencies are ready
	 * @param {Function} [error] Callback to execute when any dependency fails
	 */
	function enqueue( dependencies, ready, error ) {
		if ( allReady( dependencies ) ) {
			// Run ready immediately
			if ( ready ) {
				ready();
			}
			return;
		}

		var failed = anyFailed( dependencies );
		if ( failed !== false ) {
			if ( error ) {
				// Execute error immediately if any dependencies have errors
				error(
					new Error( 'Dependency ' + failed + ' failed to load' ),
					dependencies
				);
			}
			return;
		}

		// Not all dependencies are ready, add to the load queue...

		// Add ready and error callbacks if they were given
		if ( ready || error ) {
			jobs.push( {
				// Narrow down the list to modules that are worth waiting for
				dependencies: dependencies.filter( function ( module ) {
					var state = registry[ module ].state;
					return state === 'registered' || state === 'loaded' || state === 'loading' || state === 'executing';
				} ),
				ready: ready,
				error: error
			} );
		}

		dependencies.forEach( function ( module ) {
			// Only queue modules that are still in the initial 'registered' state
			// (e.g. not ones already loading or loaded etc.).
			if ( registry[ module ].state === 'registered' && queue.indexOf( module ) === -1 ) {
				queue.push( module );
			}
		} );

		mw.loader.work();
	}

	/**
	 * Executes a loaded module, making it ready to use
	 *
	 * @private
	 * @param {string} module Module name to execute
	 */
	function execute( module ) {
		if ( registry[ module ].state !== 'loaded' ) {
			throw new Error( 'Module in state "' + registry[ module ].state + '" may not execute: ' + module );
		}

		registry[ module ].state = 'executing';
		

		var runScript = function () {
			
			var script = registry[ module ].script;
			var markModuleReady = function () {
				
				setAndPropagate( module, 'ready' );
			};
			var nestedAddScript = function ( arr, offset ) {
				// Recursively call queueModuleScript() in its own callback
				// for each element of arr.
				if ( offset >= arr.length ) {
					// We're at the end of the array
					markModuleReady();
					return;
				}

				queueModuleScript( arr[ offset ], module, function () {
					nestedAddScript( arr, offset + 1 );
				} );
			};

			try {
				if ( Array.isArray( script ) ) {
					nestedAddScript( script, 0 );
				} else if ( typeof script === 'function' ) {
					// Keep in sync with queueModuleScript() for debug mode
					if ( module === 'jquery' ) {
						// This is a special case for when 'jquery' itself is being loaded.
						// - The standard jquery.js distribution does not set `window.jQuery`
						//   in CommonJS-compatible environments (Node.js, AMD, RequireJS, etc.).
						// - MediaWiki's 'jquery' module also bundles jquery.migrate.js, which
						//   in a CommonJS-compatible environment, will use require('jquery'),
						//   but that can't work when we're still inside that module.
						script();
					} else {
						// Pass jQuery twice so that the signature of the closure which wraps
						// the script can bind both '$' and 'jQuery'.
						script( window.$, window.$, mw.loader.require, registry[ module ].module );
					}
					markModuleReady();
				} else if ( typeof script === 'object' && script !== null ) {
					var mainScript = script.files[ script.main ];
					if ( typeof mainScript !== 'function' ) {
						throw new Error( 'Main file in module ' + module + ' must be a function' );
					}
					// jQuery parameters are not passed for multi-file modules
					mainScript(
						makeRequireFunction( registry[ module ], script.main ),
						registry[ module ].module,
						registry[ module ].module.exports
					);
					markModuleReady();
				} else if ( typeof script === 'string' ) {
					// Site and user modules are legacy scripts that run in the global scope.
					// This is transported as a string instead of a function to avoid needing
					// to use string manipulation to undo the function wrapper.
					domEval( script );
					markModuleReady();

				} else {
					// Module without script
					markModuleReady();
				}
			} catch ( e ) {
				// Use mw.track instead of mw.log because these errors are common in production mode
				// (e.g. undefined variable), and mw.log is only enabled in debug mode.
				setAndPropagate( module, 'error' );
				
				mw.trackError( 'resourceloader.exception', {
					exception: e,
					module: module,
					source: 'module-execute'
				} );
			}
		};

		// Add localizations to message system
		if ( registry[ module ].messages ) {
			mw.messages.set( registry[ module ].messages );
		}

		// Initialise templates
		if ( registry[ module ].templates ) {
			mw.templates.set( module, registry[ module ].templates );
		}

		// Adding of stylesheets is asynchronous via addEmbeddedCSS().
		// The below function uses a counting semaphore to make sure we don't call
		// runScript() until after this module's stylesheets have been inserted
		// into the DOM.
		var cssPending = 0;
		var cssHandle = function () {
			// Increase semaphore, when creating a callback for addEmbeddedCSS.
			cssPending++;
			return function () {
				// Decrease semaphore, when said callback is invoked.
				cssPending--;
				if ( cssPending === 0 ) {
					// Paranoia:
					// This callback is exposed to addEmbeddedCSS, which is outside the execute()
					// function and is not concerned with state-machine integrity. In turn,
					// addEmbeddedCSS() actually exposes stuff further into the browser (rAF).
					// If increment and decrement callbacks happen in the wrong order, or start
					// again afterwards, then this branch could be reached multiple times.
					// To protect the integrity of the state-machine, prevent that from happening
					// by making runScript() cannot be called more than once.  We store a private
					// reference when we first reach this branch, then deference the original, and
					// call our reference to it.
					var runScriptCopy = runScript;
					runScript = undefined;
					runScriptCopy();
				}
			};
		};

		// Process styles (see also mw.loader.implement)
		// * { "css": [css, ..] }
		// * { "url": { <media>: [url, ..] } }
		var style = registry[ module ].style;
		if ( style ) {
			// Array of CSS strings under key 'css'
			// { "css": [css, ..] }
			if ( 'css' in style ) {
				for ( var i = 0; i < style.css.length; i++ ) {
					addEmbeddedCSS( style.css[ i ], cssHandle() );
				}
			}

			// Plain object with array of urls under a media-type key
			// { "url": { <media>: [url, ..] } }
			if ( 'url' in style ) {
				for ( var media in style.url ) {
					var urls = style.url[ media ];
					for ( var j = 0; j < urls.length; j++ ) {
						addLink( urls[ j ], media, marker );
					}
				}
			}
		}

		// End profiling of execute()-self before we call runScript(),
		// which we want to measure separately without overlap.
		

		if ( module === 'user' ) {
			// Implicit dependency on the site module. Not a real dependency because it should
			// run after 'site' regardless of whether it succeeds or fails.
			// Note: This is a simplified version of mw.loader.using(), inlined here because
			// mw.loader.using() is part of mediawiki.base (depends on jQuery; T192623).
			var siteDeps;
			var siteDepErr;
			try {
				siteDeps = resolve( [ 'site' ] );
			} catch ( e ) {
				siteDepErr = e;
				runScript();
			}
			if ( !siteDepErr ) {
				enqueue( siteDeps, runScript, runScript );
			}
		} else if ( cssPending === 0 ) {
			// Regular module without styles
			runScript();
		}
		// else: runScript will get called via cssHandle()
	}

	function sortQuery( o ) {
		var sorted = {};
		var list = [];

		for ( var key in o ) {
			list.push( key );
		}
		list.sort();
		for ( var i = 0; i < list.length; i++ ) {
			sorted[ list[ i ] ] = o[ list[ i ] ];
		}
		return sorted;
	}

	/**
	 * Converts a module map of the form `{ foo: [ 'bar', 'baz' ], bar: [ 'baz, 'quux' ] }`
	 * to a query string of the form `foo.bar,baz|bar.baz,quux`.
	 *
	 * See `ResourceLoader::makePackedModulesString()` in PHP, of which this is a port.
	 * On the server, unpacking is done by `ResourceLoader::expandModuleNames()`.
	 *
	 * Note: This is only half of the logic, the other half has to be in #batchRequest(),
	 * because its implementation needs to keep track of potential string size in order
	 * to decide when to split the requests due to url size.
	 *
	 * @private
	 * @param {Object} moduleMap Module map
	 * @return {Object}
	 * @return {string} return.str Module query string
	 * @return {Array} return.list List of module names in matching order
	 */
	function buildModulesString( moduleMap ) {
		var str = [];
		var list = [];
		var p;

		function restore( suffix ) {
			return p + suffix;
		}

		for ( var prefix in moduleMap ) {
			p = prefix === '' ? '' : prefix + '.';
			str.push( p + moduleMap[ prefix ].join( ',' ) );
			list.push.apply( list, moduleMap[ prefix ].map( restore ) );
		}
		return {
			str: str.join( '|' ),
			list: list
		};
	}

	/**
	 * @private
	 * @param {Object} params Map of parameter names to values
	 * @return {string}
	 */
	function makeQueryString( params ) {
		// Optimisation: This is a fairly hot code path with batchRequest() loops.
		// Avoid overhead from Object.keys and Array.forEach.
		// String concatenation is faster than array pushing and joining, see
		// https://phabricator.wikimedia.org/P19931
		var str = '';
		for ( var key in params ) {
			// Parameters are separated by &, added before all parameters other than
			// the first
			str += ( str ? '&' : '' ) + encodeURIComponent( key ) + '=' +
				encodeURIComponent( params[ key ] );
		}
		return str;
	}

	/**
	 * Create network requests for a batch of modules.
	 *
	 * This is an internal method for #work(). This must not be called directly
	 * unless the modules are already registered, and no request is in progress,
	 * and the module state has already been set to `loading`.
	 *
	 * @private
	 * @param {string[]} batch
	 */
	function batchRequest( batch ) {
		if ( !batch.length ) {
			return;
		}

		var sourceLoadScript, currReqBase, moduleMap;

		/**
		 * Start the currently drafted request to the server.
		 *
		 * @ignore
		 */
		function doRequest() {
			// Optimisation: Inherit (Object.create), not copy ($.extend)
			var query = Object.create( currReqBase ),
				packed = buildModulesString( moduleMap );
			query.modules = packed.str;
			// The packing logic can change the effective order, even if the input was
			// sorted. As such, the call to getCombinedVersion() must use this
			// effective order to ensure that the combined version will match the hash
			// expected by the server based on combining versions from the module
			// query string in-order. (T188076)
			query.version = getCombinedVersion( packed.list );
			query = sortQuery( query );
			addScript( sourceLoadScript + '?' + makeQueryString( query ) );
		}

		// Always order modules alphabetically to help reduce cache
		// misses for otherwise identical content.
		batch.sort();

		// Query parameters common to all requests
		var reqBase = {
    "lang": "en",
    "skin": "vector",
    "debug": "1"
};

		// Split module list by source and by group.
		var splits = Object.create( null );
		for ( var b = 0; b < batch.length; b++ ) {
			var bSource = registry[ batch[ b ] ].source;
			var bGroup = registry[ batch[ b ] ].group;
			if ( !splits[ bSource ] ) {
				splits[ bSource ] = Object.create( null );
			}
			if ( !splits[ bSource ][ bGroup ] ) {
				splits[ bSource ][ bGroup ] = [];
			}
			splits[ bSource ][ bGroup ].push( batch[ b ] );
		}

		for ( var source in splits ) {
			sourceLoadScript = sources[ source ];

			for ( var group in splits[ source ] ) {

				// Cache access to currently selected list of
				// modules for this group from this source.
				var modules = splits[ source ][ group ];

				// Query parameters common to requests for this module group
				// Optimisation: Inherit (Object.create), not copy ($.extend)
				currReqBase = Object.create( reqBase );
				// User modules require a user name in the query string.
				if ( group === 0 && mw.config.get( 'wgUserName' ) !== null ) {
					currReqBase.user = mw.config.get( 'wgUserName' );
				}

				// In addition to currReqBase, doRequest() will also add 'modules' and 'version'.
				// > '&modules='.length === 9
				// > '&version=12345'.length === 14
				// > 9 + 14 = 23
				var currReqBaseLength = makeQueryString( currReqBase ).length + 23;

				// We may need to split up the request to honor the query string length limit,
				// so build it piece by piece. `length` does not include the characters from
				// the request base, see below
				var length = 0;
				moduleMap = Object.create( null ); // { prefix: [ suffixes ] }

				for ( var i = 0; i < modules.length; i++ ) {
					// Determine how many bytes this module would add to the query string
					var lastDotIndex = modules[ i ].lastIndexOf( '.' ),
						prefix = modules[ i ].slice( 0, Math.max( 0, lastDotIndex ) ),
						suffix = modules[ i ].slice( lastDotIndex + 1 ),
						bytesAdded = moduleMap[ prefix ] ?
							suffix.length + 3 : // '%2C'.length == 3
							modules[ i ].length + 3; // '%7C'.length == 3

					// If the url would become too long, create a new one, but don't create empty requests.
					// The value of `length` only reflects the request-specific bytes relating to the
					// accumulated entries in moduleMap so far. It does not include the base length,
					// which we account for separately with `currReqBaseLength` so that length is 0
					// when moduleMap is empty.
					if ( length && length + currReqBaseLength + bytesAdded > mw.loader.maxQueryLength ) {
						// Dispatch what we've got...
						doRequest();
						// .. and start preparing a new request.
						length = 0;
						moduleMap = Object.create( null );
					}
					if ( !moduleMap[ prefix ] ) {
						moduleMap[ prefix ] = [];
					}
					length += bytesAdded;
					moduleMap[ prefix ].push( suffix );
				}
				// Optimization: Skip `length` check.
				// moduleMap will contain at least one module here. The loop above leaves the last module
				// undispatched (and maybe some before it), so for moduleMap to be empty here, there must
				// have been no modules to iterate in the current group to start with, but we only create
				// a group in `splits` when the first module in the group is seen, so there are always
				// modules in the group when this code is reached.
				doRequest();
			}
		}
	}

	/**
	 * @private
	 * @param {string[]} implementations Array containing pieces of JavaScript code in the
	 *  form of calls to mw.loader#implement().
	 * @param {Function} cb Callback in case of failure
	 * @param {Error} cb.err
	 */
	function asyncEval( implementations, cb ) {
		if ( !implementations.length ) {
			return;
		}
		mw.requestIdleCallback( function () {
			try {
				domEval( implementations.join( ';' ) );
			} catch ( err ) {
				cb( err );
			}
		} );
	}

	/**
	 * Make a versioned key for a specific module.
	 *
	 * @private
	 * @param {string} module Module name
	 * @return {string|null} Module key in format '`[name]@[version]`',
	 *  or null if the module does not exist
	 */
	function getModuleKey( module ) {
		return module in registry ? ( module + '@' + registry[ module ].version ) : null;
	}

	/**
	 * @private
	 * @param {string} key Module name or '`[name]@[version]`'
	 * @return {Object}
	 */
	function splitModuleKey( key ) {
		// Module names may contain '@' but version strings may not, so the last '@' is the delimiter
		var index = key.lastIndexOf( '@' );
		// If the key doesn't contain '@' or starts with it, the whole thing is the module name
		if ( index === -1 || index === 0 ) {
			return {
				name: key,
				version: ''
			};
		}
		return {
			name: key.slice( 0, index ),
			version: key.slice( index + 1 )
		};
	}

	/**
	 * @private
	 * @param {string} module
	 * @param {string|number} [version]
	 * @param {string[]} [dependencies]
	 * @param {string} [group]
	 * @param {string} [source]
	 * @param {string} [skip]
	 */
	function registerOne( module, version, dependencies, group, source, skip ) {
		if ( module in registry ) {
			throw new Error( 'module already registered: ' + module );
		}

		version = String( version || '' );

		// requiresES6 is encoded as a ! at the end of version
		if ( version.slice( -1 ) === '!' ) {
			if ( !isES6Supported ) {
				// Exclude ES6-only modules from the registry in ES5 browsers.
				//
				// These must:
				// - be gracefully skipped if a top-level page module, in resolveStubbornly().
				// - fail hard when otherwise used or depended on, in sortDependencies().
				// - be detectable in the public API, per T299677.
				return;
			}
			// Remove the ! at the end to get the real version
			version = version.slice( 0, -1 );
		}

		registry[ module ] = {
			// Exposed to execute() for mw.loader.implement() closures.
			// Import happens via require().
			module: {
				exports: {}
			},
			// module.export objects for each package file inside this module
			packageExports: {},
			version: version,
			dependencies: dependencies || [],
			group: typeof group === 'undefined' ? null : group,
			source: typeof source === 'string' ? source : 'local',
			state: 'registered',
			skip: typeof skip === 'string' ? skip : null
		};
	}

	/* Public Members */

	mw.loader = {
		/**
		 * The module registry is exposed as an aid for debugging and inspecting page
		 * state; it is not a public interface for modifying the registry.
		 *
		 * @see #registry
		 * @property {Object}
		 * @private
		 */
		moduleRegistry: registry,

		/**
		 * Exposed for testing and debugging only.
		 *
		 * @see #batchRequest
		 * @property {number}
		 * @private
		 */
		maxQueryLength: 5000,

		/**
		 * @inheritdoc #newStyleTag
		 * @method
		 */
		addStyleTag: newStyleTag,

		// Exposed for internal use only. Documented as @private.
		addScriptTag: addScript,
		addLinkTag: addLink,

		enqueue: enqueue,

		resolve: resolve,

		/**
		 * Start loading of all queued module dependencies.
		 *
		 * @private
		 */
		work: function () {
			store.init();

			var q = queue.length,
				storedImplementations = [],
				storedNames = [],
				requestNames = [],
				batch = new StringSet();

			// Iterate the list of requested modules, and do one of three things:
			// - 1) Nothing (if already loaded or being loaded).
			// - 2) Eval the cached implementation from the module store.
			// - 3) Request from network.
			while ( q-- ) {
				var module = queue[ q ];
				// Only consider modules which are the initial 'registered' state,
				// and ignore duplicates
				if ( mw.loader.getState( module ) === 'registered' &&
					!batch.has( module )
				) {
					// Progress the state machine
					registry[ module ].state = 'loading';
					batch.add( module );

					var implementation = store.get( module );
					if ( implementation ) {
						// Module store enabled and contains this module/version
						storedImplementations.push( implementation );
						storedNames.push( module );
					} else {
						// Module store disabled or doesn't have this module/version
						requestNames.push( module );
					}
				}
			}

			// Now that the queue has been processed into a batch, clear the queue.
			// This MUST happen before we initiate any eval or network request. Otherwise,
			// it is possible for a cached script to instantly trigger the same work queue
			// again; all before we've cleared it causing each request to include modules
			// which are already loaded.
			queue = [];

			asyncEval( storedImplementations, function ( err ) {
				// Not good, the cached mw.loader.implement calls failed! This should
				// never happen, barring ResourceLoader bugs, browser bugs and PEBKACs.
				// Depending on how corrupt the string is, it is likely that some
				// modules' implement() succeeded while the ones after the error will
				// never run and leave their modules in the 'loading' state forever.
				store.stats.failed++;

				// Since this is an error not caused by an individual module but by
				// something that infected the implement call itself, don't take any
				// risks and clear everything in this cache.
				store.clear();

				mw.trackError( 'resourceloader.exception', {
					exception: err,
					source: 'store-eval'
				} );
				// For any failed ones, fallback to requesting from network
				var failed = storedNames.filter( function ( name ) {
					return registry[ name ].state === 'loading';
				} );
				batchRequest( failed );
			} );

			batchRequest( requestNames );
		},

		/**
		 * Register a source.
		 *
		 * The #work() method will use this information to split up requests by source.
		 *
		 *     @example
		 *     mw.loader.addSource( { mediawikiwiki: 'https://www.mediawiki.org/w/load.php' } );
		 *
		 * @private
		 * @param {Object} ids An object mapping ids to load.php end point urls
		 * @throws {Error} If source id is already registered
		 */
		addSource: function ( ids ) {
			for ( var id in ids ) {
				if ( id in sources ) {
					throw new Error( 'source already registered: ' + id );
				}
				sources[ id ] = ids[ id ];
			}
		},

		/**
		 * Register a module, letting the system know about it and its properties.
		 *
		 * The startup module calls this method.
		 *
		 * When using multiple module registration by passing an array, dependencies that
		 * are specified as references to modules within the array will be resolved before
		 * the modules are registered.
		 *
		 * @param {string|Array} modules Module name or array of arrays, each containing
		 *  a list of arguments compatible with this method
		 * @param {string|number} [version] Module version hash (falls backs to empty string)
		 *  Can also be a number (timestamp) for compatibility with MediaWiki 1.25 and earlier.
		 *  A version string that ends with '!' signifies that the module requires ES6 support.
		 * @param {string[]} [dependencies] Array of module names on which this module depends.
		 * @param {string} [group=null] Group which the module is in
		 * @param {string} [source='local'] Name of the source
		 * @param {string} [skip=null] Script body of the skip function
		 */
		register: function ( modules ) {
			if ( typeof modules !== 'object' ) {
				registerOne.apply( null, arguments );
				return;
			}
			// Need to resolve indexed dependencies:
			// ResourceLoader uses an optimisation to save space which replaces module
			// names in dependency lists with the index of that module within the
			// array of module registration data if it exists. The benefit is a significant
			// reduction in the data size of the startup module. This loop changes
			// those dependency lists back to arrays of strings.
			function resolveIndex( dep ) {
				return typeof dep === 'number' ? modules[ dep ][ 0 ] : dep;
			}

			for ( var i = 0; i < modules.length; i++ ) {
				var deps = modules[ i ][ 2 ];
				if ( deps ) {
					for ( var j = 0; j < deps.length; j++ ) {
						deps[ j ] = resolveIndex( deps[ j ] );
					}
				}
				// Optimisation: Up to 55% faster.
				// Typically register() is called exactly once on a page, and with a batch.
				// See <https://gist.github.com/Krinkle/f06fdb3de62824c6c16f02a0e6ce0e66>
				// Benchmarks taught us that the code for adding an object to `registry`
				// should be in a function that has only one signature and does no arguments
				// manipulation.
				// JS semantics make it hard to optimise recursion to a different
				// signature of itself, hence we moved this out.
				registerOne.apply( null, modules[ i ] );
			}
		},

		/**
		 * Implement a module given the components that make up the module.
		 *
		 * When #load() or #using() requests one or more modules, the server
		 * response contain calls to this function.
		 *
		 * @param {string} module Name of module and current module version. Formatted
		 *  as '`[name]@[version]`". This version should match the requested version
		 *  (from #batchRequest and #registry). This avoids race conditions (T117587).
		 *  For back-compat with MediaWiki 1.27 and earlier, the version may be omitted.
		 * @param {Function|Array|string|Object} [script] Module code. This can be a function,
		 *  a list of URLs to load via `<script src>`, a string for `domEval()`, or an
		 *  object like {"files": {"foo.js":function, "bar.js": function, ...}, "main": "foo.js"}.
		 *  If an object is provided, the main file will be executed immediately, and the other
		 *  files will only be executed if loaded via require(). If a function or string is
		 *  provided, it will be executed/evaluated immediately. If an array is provided, all
		 *  URLs in the array will be loaded immediately, and executed as soon as they arrive.
		 * @param {Object} [style] Should follow one of the following patterns:
		 *
		 *     { "css": [css, ..] }
		 *     { "url": { <media>: [url, ..] } }
		 *
		 * The reason css strings are not concatenated anymore is T33676. We now check
		 * whether it's safe to extend the stylesheet.
		 *
		 * @private
		 * @param {Object} [messages] List of key/value pairs to be added to mw#messages.
		 * @param {Object} [templates] List of key/value pairs to be added to mw#templates.
		 */
		implement: function ( module, script, style, messages, templates ) {
			var split = splitModuleKey( module ),
				name = split.name,
				version = split.version;
			// Automatically register module
			if ( !( name in registry ) ) {
				mw.loader.register( name );
			}
			// Check for duplicate implementation
			if ( registry[ name ].script !== undefined ) {
				throw new Error( 'module already implemented: ' + name );
			}
			if ( version ) {
				// Without this reset, if there is a version mismatch between the
				// requested and received module version, then mw.loader.store would
				// cache the response under the requested key. Thus poisoning the cache
				// indefinitely with a stale value. (T117587)
				registry[ name ].version = version;
			}
			// Attach components
			registry[ name ].script = script || null;
			registry[ name ].style = style || null;
			registry[ name ].messages = messages || null;
			registry[ name ].templates = templates || null;
			// The module may already have been marked as erroneous
			if ( registry[ name ].state !== 'error' && registry[ name ].state !== 'missing' ) {
				setAndPropagate( name, 'loaded' );
			}
		},

		/**
		 * Load an external script or one or more modules.
		 *
		 * This method takes a list of unrelated modules. Use cases:
		 *
		 * - A web page will be composed of many different widgets. These widgets independently
		 *   queue their ResourceLoader modules (`OutputPage::addModules()`). If any of them
		 *   have problems, or are no longer known (e.g. cached HTML), the other modules
		 *   should still be loaded.
		 * - This method is used for preloading, which must not throw. Later code that
		 *   calls #using() will handle the error.
		 *
		 * @param {string|Array} modules Either the name of a module, array of modules,
		 *  or a URL of an external script or style
		 * @param {string} [type='text/javascript'] MIME type to use if calling with a URL of an
		 *  external script or style; acceptable values are "text/css" and
		 *  "text/javascript"; if no type is provided, text/javascript is assumed.
		 * @throws {Error} If type is invalid
		 */
		load: function ( modules, type ) {
			if ( typeof modules === 'string' && /^(https?:)?\/?\//.test( modules ) ) {
				// Called with a url like so:
				// - "https://example.org/x.js"
				// - "http://example.org/x.js"
				// - "//example.org/x.js"
				// - "/x.js"
				if ( type === 'text/css' ) {
					addLink( modules );
				} else if ( type === 'text/javascript' || type === undefined ) {
					addScript( modules );
				} else {
					// Unknown type
					throw new Error( 'Invalid type ' + type );
				}
			} else {
				// One or more modules
				modules = typeof modules === 'string' ? [ modules ] : modules;
				// Resolve modules into a flat list for internal queuing.
				// This also filters out unknown modules and modules with
				// unknown dependencies, allowing the rest to continue. (T36853)
				// Omit ready and error parameters, we don't have callbacks
				enqueue( resolveStubbornly( modules ) );
			}
		},

		/**
		 * Change the state of one or more modules.
		 *
		 * @param {Object} states Object of module name/state pairs
		 */
		state: function ( states ) {
			for ( var module in states ) {
				if ( !( module in registry ) ) {
					mw.loader.register( module );
				}
				setAndPropagate( module, states[ module ] );
			}
		},

		/**
		 * Get the state of a module.
		 *
		 * @param {string} module Name of module
		 * @return {string|null} The state, or null if the module (or its state) is not
		 *  in the registry.
		 */
		getState: function ( module ) {
			return module in registry ? registry[ module ].state : null;
		},

		/**
		 * Get the exported value of a module.
		 *
		 * This static method is publicly exposed for debugging purposes
		 * only and must not be used in production code. In production code,
		 * please use the dynamically provided `require()` function instead.
		 *
		 * In case of lazy-loaded modules via mw.loader#using(), the returned
		 * Promise provides the function, see #using() for examples.
		 *
		 * @private
		 * @since 1.27
		 * @param {string} moduleName Module name
		 * @return {Mixed} Exported value
		 */
		require: function ( moduleName ) {
			// Only ready modules can be required
			if ( mw.loader.getState( moduleName ) !== 'ready' ) {
				// Module may've forgotten to declare a dependency
				throw new Error( 'Module "' + moduleName + '" is not loaded' );
			}

			return registry[ moduleName ].module.exports;
		}
	};

	/**
	 * On browsers that implement the localStorage API, the module store serves as a
	 * smart complement to the browser cache. Unlike the browser cache, the module store
	 * can slice a concatenated response from ResourceLoader into its constituent
	 * modules and cache each of them separately, using each module's versioning scheme
	 * to determine when the cache should be invalidated.
	 *
	 * @private
	 * @singleton
	 * @class mw.loader.store
	 */

	// Whether we have already triggered a timer for flushWrites
	var hasPendingWrites = false;

	/**
	 * Actually update the store
	 *
	 * @see #requestUpdate
	 * @private
	 */
	function flushWrites() {
		// Remove anything from the in-memory store that came from previous page
		// loads that no longer corresponds with current module names and versions.
		store.prune();
		// Process queued module names, serialise their contents to the in-memory store.
		while ( store.queue.length ) {
			store.set( store.queue.shift() );
		}

		try {
			// Replacing the content of the module store might fail if the new
			// contents would exceed the browser's localStorage size limit. To
			// avoid clogging the browser with stale data, always remove the old
			// value before attempting to set the new one.
			localStorage.removeItem( store.key );
			var data = JSON.stringify( store );
			localStorage.setItem( store.key, data );
		} catch ( e ) {
			mw.trackError( 'resourceloader.exception', {
				exception: e,
				source: 'store-localstorage-update'
			} );
		}

		// Let the next call to requestUpdate() create a new timer.
		hasPendingWrites = false;
	}

	// We use a local variable `store` so that its easier to access, but also need to set
	// this in mw.loader so its exported - combine the two
	mw.loader.store = store = {
		// Whether the store is in use on this page.
		enabled: null,

		// The contents of the store, mapping '[name]@[version]' keys
		// to module implementations.
		items: {},

		// Names of modules to be stored during the next update.
		// See add() and update().
		queue: [],

		// Cache hit stats
		stats: { hits: 0, misses: 0, expired: 0, failed: 0 },

		/**
		 * Construct a JSON-serializable object representing the content of the store.
		 *
		 * @return {Object} Module store contents.
		 */
		toJSON: function () {
			return {
				items: store.items,
				vary: store.vary,
				// Store with 1e7 ms accuracy (1e4 seconds, or ~ 2.7 hours),
				// which is enough for the purpose of expiring after ~ 30 days.
				asOf: Math.ceil( Date.now() / 1e7 )
			};
		},

		/**
		 * The localStorage key for the entire module store. The key references
		 * $wgDBname to prevent clashes between wikis which share a common host.
		 *
		 * @property {string}
		 */
		key: "MediaWikiModuleStore:zhwiki",

		/**
		 * A string containing various factors by which the module cache should vary.
		 *
		 * Defined by ResourceLoader\StartupModule::getStoreVary() in PHP.
		 *
		 * @property {string}
		 */
		vary: "vector:1-3:en",

		/**
		 * Initialize the store.
		 *
		 * Retrieves store from localStorage and (if successfully retrieved) decoding
		 * the stored JSON value to a plain object.
		 */
		init: function () {
			// Init only once per page
			if ( this.enabled === null ) {
				this.enabled = false;
				if ( false ) {
					this.load();
				} else {
					// Clear any previous store to free up space. (T66721)
					this.clear();
				}

			}
		},

		/**
		 * Internal helper for init(). Separated for ease of testing.
		 */
		load: function () {
			// These are the scenarios to think about:
			//
			// 1. localStorage is disallowed by the browser.
			//    This means `localStorage.getItem` throws.
			//    The store stays disabled.
			//
			// 2. localStorage did not contain our store key.
			//    This usually means the browser has a cold cache for this site,
			//    and thus localStorage.getItem returns null.
			//    The store will be enabled, and `items` starts fresh.
			//
			// 3. localStorage contains parseable data, but it's not usable.
			//    This means the data is too old, or is not valid for mw.loader.store.vary
			//    (e.g. user switched skin or language).
			//    The store will be enabled, and `items` starts fresh.
			//
			// 4. localStorage contains invalid JSON data.
			//    This means the data was corrupted, and `JSON.parse` throws.
			//    The store will be enabled, and `items` starts fresh.
			//
			// 5. localStorage contains valid and usable JSON.
			//    This means we have a warm cache from a previous visit.
			//    The store will be enabled, and `items` starts with the stored data.

			try {
				var raw = localStorage.getItem( this.key );

				// If we make it here, localStorage is enabled and available.
				// The rest of the function may fail, but that only affects what we load from
				// the cache. We'll still enable the store to allow storing new modules.
				this.enabled = true;

				// If getItem returns null, JSON.parse() will cast to string and re-parse, still null.
				var data = JSON.parse( raw );
				if ( data &&
					data.vary === this.vary &&
					data.items &&
					// Only use if it's been less than 30 days since the data was written
					// 30 days = 2,592,000 s = 2,592,000,000 ms = ± 259e7 ms
					Date.now() < ( data.asOf * 1e7 ) + 259e7
				) {
					// The data is not corrupt, matches our vary context, and has not expired.
					this.items = data.items;
				}
			} catch ( e ) {
				// Ignore error from localStorage or JSON.parse.
				// Don't print any warning (T195647).
			}
		},

		/**
		 * Retrieve a module from the store and update cache hit stats.
		 *
		 * @param {string} module Module name
		 * @return {string|boolean} Module implementation or false if unavailable
		 */
		get: function ( module ) {
			if ( this.enabled ) {
				var key = getModuleKey( module );
				if ( key in this.items ) {
					this.stats.hits++;
					return this.items[ key ];
				}

				this.stats.misses++;
			}

			return false;
		},

		/**
		 * Queue the name of a module that the next update should consider storing.
		 *
		 * @since 1.32
		 * @param {string} module Module name
		 */
		add: function ( module ) {
			if ( this.enabled ) {
				this.queue.push( module );
				this.requestUpdate();
			}
		},

		/**
		 * Add the contents of the named module to the in-memory store.
		 *
		 * This method does not guarantee that the module will be stored.
		 * Inspection of the module's meta data and size will ultimately decide that.
		 *
		 * This method is considered internal to mw.loader.store and must only
		 * be called if the store is enabled.
		 *
		 * @private
		 * @param {string} module Module name
		 */
		set: function ( module ) {
			var args,
				encodedScript,
				descriptor = registry[ module ],
				key = getModuleKey( module );

			if (
				// Already stored a copy of this exact version
				key in this.items ||
				// Module failed to load
				!descriptor ||
				descriptor.state !== 'ready' ||
				// Unversioned, private, or site-/user-specific
				!descriptor.version ||
				descriptor.group === 1 ||
				descriptor.group === 0 ||
				// Partial descriptor
				// (e.g. skipped module, or style module with state=ready)
				[ descriptor.script, descriptor.style, descriptor.messages,
					descriptor.templates ].indexOf( undefined ) !== -1
			) {
				// Decline to store
				return;
			}

			try {
				if ( typeof descriptor.script === 'function' ) {
					// Function literal: cast to string
					encodedScript = String( descriptor.script );
				} else if (
					// Plain object: serialise as object literal (not JSON),
					// making sure to preserve the functions.
					typeof descriptor.script === 'object' &&
					descriptor.script &&
					!Array.isArray( descriptor.script )
				) {
					encodedScript = '{' +
						'main:' + JSON.stringify( descriptor.script.main ) + ',' +
						'files:{' +
						Object.keys( descriptor.script.files ).map( function ( file ) {
							var value = descriptor.script.files[ file ];
							return JSON.stringify( file ) + ':' +
								( typeof value === 'function' ? value : JSON.stringify( value ) );
						} ).join( ',' ) +
						'}}';
				} else {
					// Array of urls, or null.
					encodedScript = JSON.stringify( descriptor.script );
				}
				args = [
					JSON.stringify( key ),
					encodedScript,
					JSON.stringify( descriptor.style ),
					JSON.stringify( descriptor.messages ),
					JSON.stringify( descriptor.templates )
				];
			} catch ( e ) {
				mw.trackError( 'resourceloader.exception', {
					exception: e,
					source: 'store-localstorage-json'
				} );
				return;
			}

			var src = 'mw.loader.implement(' + args.join( ',' ) + ');';

			// Modules whose serialised form exceeds 100 kB won't be stored (T66721).
			if ( src.length > 1e5 ) {
				return;
			}
			this.items[ key ] = src;
		},

		/**
		 * Iterate through the module store, removing any item that does not correspond
		 * (in name and version) to an item in the module registry.
		 */
		prune: function () {
			for ( var key in this.items ) {
				// key is in the form [name]@[version], slice to get just the name
				// to provide to getModuleKey, which will return a key in the same
				// form but with the latest version
				if ( getModuleKey( splitModuleKey( key ).name ) !== key ) {
					this.stats.expired++;
					delete this.items[ key ];
				}
			}
		},

		/**
		 * Clear the entire module store right now.
		 */
		clear: function () {
			this.items = {};
			try {
				localStorage.removeItem( this.key );
			} catch ( e ) {}
		},

		/**
		 * Request a sync of the in-memory store back to persisted localStorage.
		 *
		 * This function debounces updates. The debouncing logic should account
		 * for the following factors:
		 *
		 * - Writing to localStorage is an expensive operation that must not happen
		 *   during the critical path of initialising and executing module code.
		 *   Instead, it should happen at a later time after modules have been given
		 *   time and priority to do their thing first.
		 *
		 * - This method is called from mw.loader.store.add(), which will be called
		 *   hundreds of times on a typical page, including within the same call-stack
		 *   and eventloop-tick. This is because responses from load.php happen in
		 *   batches. As such, we want to allow all modules from the same load.php
		 *   response to be written to disk with a single flush, not many.
		 *
		 * - Repeatedly deleting and creating timers is non-trivial.
		 *
		 * - localStorage is shared by all pages from the same origin, if multiple
		 *   pages are loaded with different module sets, the possibility exists that
		 *   modules saved by one page will be clobbered by another. The impact of
		 *   this is minor, it merely causes a less efficient cache use, and the
		 *   problem would be corrected by subsequent page views.
		 *
		 * This method is considered internal to mw.loader.store and must only
		 * be called if the store is enabled.
		 *
		 * @private
		 * @method
		 */
		requestUpdate: function () {
			// On the first call to requestUpdate(), create a timer that
			// waits at least two seconds, then calls onTimeout.
			// The main purpose is to allow the current batch of load.php
			// responses to complete before we do anything. This batch can
			// trigger many hundreds of calls to requestUpdate().
			if ( !hasPendingWrites ) {
				hasPendingWrites = true;
				setTimeout(
					// Defer the actual write via requestIdleCallback
					function () {
						mw.requestIdleCallback( flushWrites );
					},
					2000
				);
			}
		}
	};

}() );
/* global mw */
mw.requestIdleCallbackInternal = function ( callback ) {
	setTimeout( function () {
		var start = mw.now();
		callback( {
			didTimeout: false,
			timeRemaining: function () {
				// Hard code a target maximum busy time of 50 milliseconds
				return Math.max( 0, 50 - ( mw.now() - start ) );
			}
		} );
	}, 1 );
};

/**
 * Schedule a deferred task to run in the background.
 *
 * This allows code to perform tasks in the main thread without impacting
 * time-critical operations such as animations and response to input events.
 *
 * Basic logic is as follows:
 *
 * - User input event should be acknowledged within 100ms per [RAIL].
 * - Idle work should be grouped in blocks of upto 50ms so that enough time
 *   remains for the event handler to execute and any rendering to take place.
 * - Whenever a native event happens (e.g. user input), the deadline for any
 *   running idle callback drops to 0.
 * - As long as the deadline is non-zero, other callbacks pending may be
 *   executed in the same idle period.
 *
 * See also:
 *
 * - <https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback>
 * - <https://w3c.github.io/requestidlecallback/>
 * - <https://developers.google.com/web/updates/2015/08/using-requestidlecallback>
 * [RAIL]: https://developers.google.com/web/fundamentals/performance/rail
 *
 * @member mw
 * @param {Function} callback
 * @param {Object} [options]
 * @param {number} [options.timeout] If set, the callback will be scheduled for
 *  immediate execution after this amount of time (in milliseconds) if it didn't run
 *  by that time.
 */
mw.requestIdleCallback = window.requestIdleCallback ?
	// Bind because it throws TypeError if context is not window
	window.requestIdleCallback.bind( window ) :
	mw.requestIdleCallbackInternal;
// Note: Polyfill was previously disabled due to
// https://bugs.chromium.org/p/chromium/issues/detail?id=647870
// See also <http://codepen.io/Krinkle/full/XNGEvv>


	/**
	 * The $CODE placeholder is substituted in ResourceLoaderStartUpModule.php.
	 */
	( function () {
		/* global mw */
		var queue;

		mw.loader.addSource({
    "local": "/w/load.php",
    "metawiki": "//meta.wikimedia.org/w/load.php"
});
mw.loader.register([
    [
        "site",
        "",
        [
            1
        ]
    ],
    [
        "site.styles",
        "",
        [],
        2
    ],
    [
        "filepage",
        ""
    ],
    [
        "user",
        "",
        [],
        0
    ],
    [
        "user.styles",
        "",
        [],
        0
    ],
    [
        "user.options",
        "",
        [],
        1
    ],
    [
        "mediawiki.skinning.interface",
        ""
    ],
    [
        "jquery.makeCollapsible.styles",
        ""
    ],
    [
        "mediawiki.skinning.content.parsoid",
        ""
    ],
    [
        "jquery",
        ""
    ],
    [
        "es6-polyfills",
        "",
        [],
        null,
        null,
        "return Array.prototype.find \u0026\u0026\n\tArray.prototype.findIndex \u0026\u0026\n\tArray.prototype.includes \u0026\u0026\n\ttypeof Promise === 'function' \u0026\u0026\n\tPromise.prototype.finally;\n"
    ],
    [
        "web2017-polyfills",
        "",
        [
            10
        ],
        null,
        null,
        "return 'IntersectionObserver' in window \u0026\u0026\n    typeof fetch === 'function' \u0026\u0026\n    // Ensure:\n    // - standards compliant URL\n    // - standards compliant URLSearchParams\n    // - URL#toJSON method (came later)\n    //\n    // Facts:\n    // - All browsers with URL also have URLSearchParams, don't need to check.\n    // - Safari \u003C= 7 and Chrome \u003C= 31 had a buggy URL implementations.\n    // - Firefox 29-43 had an incomplete URLSearchParams implementation. https://caniuse.com/urlsearchparams\n    // - URL#toJSON was released in Firefox 54, Safari 11, and Chrome 71. https://caniuse.com/mdn-api_url_tojson\n    //   Thus we don't need to check for buggy URL or incomplete URLSearchParams.\n    typeof URL === 'function' \u0026\u0026 'toJSON' in URL.prototype;\n"
    ],
    [
        "mediawiki.base",
        "",
        [
            9
        ]
    ],
    [
        "jquery.chosen",
        ""
    ],
    [
        "jquery.client",
        ""
    ],
    [
        "jquery.color",
        ""
    ],
    [
        "jquery.confirmable",
        "",
        [
            107
        ]
    ],
    [
        "jquery.cookie",
        ""
    ],
    [
        "jquery.form",
        ""
    ],
    [
        "jquery.fullscreen",
        ""
    ],
    [
        "jquery.highlightText",
        "",
        [
            82
        ]
    ],
    [
        "jquery.hoverIntent",
        ""
    ],
    [
        "jquery.i18n",
        "",
        [
            106
        ]
    ],
    [
        "jquery.lengthLimit",
        "",
        [
            66
        ]
    ],
    [
        "jquery.makeCollapsible",
        "",
        [
            7,
            82
        ]
    ],
    [
        "jquery.spinner",
        "",
        [
            26
        ]
    ],
    [
        "jquery.spinner.styles",
        ""
    ],
    [
        "jquery.suggestions",
        "",
        [
            20
        ]
    ],
    [
        "jquery.tablesorter",
        "",
        [
            29,
            108,
            82
        ]
    ],
    [
        "jquery.tablesorter.styles",
        ""
    ],
    [
        "jquery.textSelection",
        "",
        [
            14
        ]
    ],
    [
        "jquery.tipsy",
        ""
    ],
    [
        "jquery.ui",
        ""
    ],
    [
        "moment",
        "",
        [
            104,
            82
        ]
    ],
    [
        "vue",
        "!"
    ],
    [
        "@vue/composition-api",
        "!",
        [
            34
        ]
    ],
    [
        "vuex",
        "!",
        [
            34
        ]
    ],
    [
        "wvui",
        "!",
        [
            35
        ]
    ],
    [
        "wvui-search",
        "!",
        [
            34
        ]
    ],
    [
        "@wikimedia/codex",
        "!",
        [
            34
        ]
    ],
    [
        "@wikimedia/codex-search",
        "!",
        [
            34
        ]
    ],
    [
        "mediawiki.template",
        ""
    ],
    [
        "mediawiki.template.mustache",
        "",
        [
            41
        ]
    ],
    [
        "mediawiki.apipretty",
        ""
    ],
    [
        "mediawiki.api",
        "",
        [
            72,
            107
        ]
    ],
    [
        "mediawiki.content.json",
        ""
    ],
    [
        "mediawiki.confirmCloseWindow",
        ""
    ],
    [
        "mediawiki.debug",
        "",
        [
            191
        ]
    ],
    [
        "mediawiki.diff",
        ""
    ],
    [
        "mediawiki.diff.styles",
        ""
    ],
    [
        "mediawiki.feedback",
        "",
        [
            879,
            199
        ]
    ],
    [
        "mediawiki.feedlink",
        ""
    ],
    [
        "mediawiki.filewarning",
        "",
        [
            191,
            203
        ]
    ],
    [
        "mediawiki.ForeignApi",
        "",
        [
            292
        ]
    ],
    [
        "mediawiki.ForeignApi.core",
        "",
        [
            79,
            44,
            187
        ]
    ],
    [
        "mediawiki.helplink",
        ""
    ],
    [
        "mediawiki.hlist",
        ""
    ],
    [
        "mediawiki.htmlform",
        "",
        [
            23,
            82
        ]
    ],
    [
        "mediawiki.htmlform.ooui",
        "",
        [
            191
        ]
    ],
    [
        "mediawiki.htmlform.styles",
        ""
    ],
    [
        "mediawiki.htmlform.ooui.styles",
        ""
    ],
    [
        "mediawiki.icon",
        ""
    ],
    [
        "mediawiki.inspect",
        "",
        [
            66,
            82
        ]
    ],
    [
        "mediawiki.notification",
        "",
        [
            82,
            88
        ]
    ],
    [
        "mediawiki.notification.convertmessagebox",
        "",
        [
            63
        ]
    ],
    [
        "mediawiki.notification.convertmessagebox.styles",
        ""
    ],
    [
        "mediawiki.String",
        ""
    ],
    [
        "mediawiki.pager.styles",
        ""
    ],
    [
        "mediawiki.pager.tablePager",
        ""
    ],
    [
        "mediawiki.pulsatingdot",
        ""
    ],
    [
        "mediawiki.searchSuggest",
        "",
        [
            27,
            44
        ]
    ],
    [
        "mediawiki.storage",
        "",
        [
            82
        ]
    ],
    [
        "mediawiki.Title",
        "",
        [
            66,
            82
        ]
    ],
    [
        "mediawiki.Upload",
        "",
        [
            44
        ]
    ],
    [
        "mediawiki.ForeignUpload",
        "",
        [
            53,
            73
        ]
    ],
    [
        "mediawiki.Upload.Dialog",
        "",
        [
            76
        ]
    ],
    [
        "mediawiki.Upload.BookletLayout",
        "",
        [
            73,
            80,
            33,
            194,
            199,
            204,
            205
        ]
    ],
    [
        "mediawiki.ForeignStructuredUpload.BookletLayout",
        "",
        [
            74,
            76,
            111,
            170,
            164
        ]
    ],
    [
        "mediawiki.toc",
        "",
        [
            85
        ]
    ],
    [
        "mediawiki.Uri",
        "",
        [
            82
        ]
    ],
    [
        "mediawiki.user",
        "",
        [
            44,
            85
        ]
    ],
    [
        "mediawiki.userSuggest",
        "",
        [
            27,
            44
        ]
    ],
    [
        "mediawiki.util",
        "",
        [
            14,
            11
        ]
    ],
    [
        "mediawiki.checkboxtoggle",
        ""
    ],
    [
        "mediawiki.checkboxtoggle.styles",
        ""
    ],
    [
        "mediawiki.cookie",
        "",
        [
            17
        ]
    ],
    [
        "mediawiki.experiments",
        ""
    ],
    [
        "mediawiki.editfont.styles",
        ""
    ],
    [
        "mediawiki.visibleTimeout",
        ""
    ],
    [
        "mediawiki.action.delete",
        "",
        [
            23,
            191
        ]
    ],
    [
        "mediawiki.action.edit",
        "",
        [
            30,
            91,
            44,
            87,
            166
        ]
    ],
    [
        "mediawiki.action.edit.styles",
        ""
    ],
    [
        "mediawiki.action.edit.collapsibleFooter",
        "",
        [
            24,
            61,
            71
        ]
    ],
    [
        "mediawiki.action.edit.preview",
        "",
        [
            25,
            117,
            80
        ]
    ],
    [
        "mediawiki.action.history",
        "",
        [
            24
        ]
    ],
    [
        "mediawiki.action.history.styles",
        ""
    ],
    [
        "mediawiki.action.protect",
        "",
        [
            23,
            191
        ]
    ],
    [
        "mediawiki.action.view.metadata",
        "",
        [
            102
        ]
    ],
    [
        "mediawiki.action.view.postEdit",
        "",
        [
            107,
            63,
            191,
            210
        ]
    ],
    [
        "mediawiki.action.view.redirect",
        ""
    ],
    [
        "mediawiki.action.view.redirectPage",
        ""
    ],
    [
        "mediawiki.action.edit.editWarning",
        "",
        [
            30,
            46,
            107
        ]
    ],
    [
        "mediawiki.action.view.filepage",
        ""
    ],
    [
        "mediawiki.action.styles",
        ""
    ],
    [
        "mediawiki.language",
        "",
        [
            105
        ]
    ],
    [
        "mediawiki.cldr",
        "",
        [
            106
        ]
    ],
    [
        "mediawiki.libs.pluralruleparser",
        ""
    ],
    [
        "mediawiki.jqueryMsg",
        "",
        [
            66,
            104,
            82,
            5
        ]
    ],
    [
        "mediawiki.language.months",
        "",
        [
            104
        ]
    ],
    [
        "mediawiki.language.names",
        "",
        [
            104
        ]
    ],
    [
        "mediawiki.language.specialCharacters",
        "",
        [
            104
        ]
    ],
    [
        "mediawiki.libs.jpegmeta",
        ""
    ],
    [
        "mediawiki.page.gallery",
        "",
        [
            113,
            82
        ]
    ],
    [
        "mediawiki.page.gallery.styles",
        ""
    ],
    [
        "mediawiki.page.gallery.slideshow",
        "",
        [
            44,
            194,
            213,
            215
        ]
    ],
    [
        "mediawiki.page.ready",
        "",
        [
            44
        ]
    ],
    [
        "mediawiki.page.watch.ajax",
        "",
        [
            44
        ]
    ],
    [
        "mediawiki.page.preview",
        "",
        [
            24,
            30,
            44,
            48,
            49,
            191
        ]
    ],
    [
        "mediawiki.page.image.pagination",
        "",
        [
            25,
            82
        ]
    ],
    [
        "mediawiki.rcfilters.filters.base.styles",
        ""
    ],
    [
        "mediawiki.rcfilters.highlightCircles.seenunseen.styles",
        ""
    ],
    [
        "mediawiki.rcfilters.filters.ui",
        "",
        [
            24,
            79,
            80,
            161,
            200,
            207,
            209,
            210,
            211,
            213,
            214
        ]
    ],
    [
        "mediawiki.interface.helpers.styles",
        ""
    ],
    [
        "mediawiki.special",
        ""
    ],
    [
        "mediawiki.special.apisandbox",
        "",
        [
            24,
            79,
            181,
            167,
            190
        ]
    ],
    [
        "mediawiki.special.block",
        "",
        [
            57,
            164,
            180,
            171,
            181,
            178,
            207
        ]
    ],
    [
        "mediawiki.misc-authed-ooui",
        "",
        [
            58,
            161,
            166
        ]
    ],
    [
        "mediawiki.misc-authed-pref",
        "",
        [
            5
        ]
    ],
    [
        "mediawiki.misc-authed-curate",
        "",
        [
            16,
            25,
            44
        ]
    ],
    [
        "mediawiki.special.changeslist",
        ""
    ],
    [
        "mediawiki.special.changeslist.watchlistexpiry",
        "",
        [
            123,
            210
        ]
    ],
    [
        "mediawiki.special.changeslist.enhanced",
        ""
    ],
    [
        "mediawiki.special.changeslist.legend",
        ""
    ],
    [
        "mediawiki.special.changeslist.legend.js",
        "",
        [
            24,
            85
        ]
    ],
    [
        "mediawiki.special.contributions",
        "",
        [
            24,
            107,
            164,
            190
        ]
    ],
    [
        "mediawiki.special.edittags",
        "",
        [
            13,
            23
        ]
    ],
    [
        "mediawiki.special.import.styles.ooui",
        ""
    ],
    [
        "mediawiki.special.changecredentials",
        ""
    ],
    [
        "mediawiki.special.changeemail",
        ""
    ],
    [
        "mediawiki.special.preferences.ooui",
        "",
        [
            46,
            87,
            64,
            71,
            171,
            166,
            199
        ]
    ],
    [
        "mediawiki.special.preferences.styles.ooui",
        ""
    ],
    [
        "mediawiki.special.revisionDelete",
        "",
        [
            23,
            191
        ]
    ],
    [
        "mediawiki.special.search",
        "",
        [
            183
        ]
    ],
    [
        "mediawiki.special.search.commonsInterwikiWidget",
        "",
        [
            79,
            44
        ]
    ],
    [
        "mediawiki.special.search.interwikiwidget.styles",
        ""
    ],
    [
        "mediawiki.special.search.styles",
        ""
    ],
    [
        "mediawiki.special.unwatchedPages",
        "",
        [
            44
        ]
    ],
    [
        "mediawiki.special.upload",
        "",
        [
            25,
            44,
            46,
            111,
            123,
            41
        ]
    ],
    [
        "mediawiki.special.userlogin.common.styles",
        ""
    ],
    [
        "mediawiki.special.userlogin.login.styles",
        ""
    ],
    [
        "mediawiki.special.createaccount",
        "",
        [
            44
        ]
    ],
    [
        "mediawiki.special.userlogin.signup.styles",
        ""
    ],
    [
        "mediawiki.special.userrights",
        "",
        [
            23,
            64
        ]
    ],
    [
        "mediawiki.special.watchlist",
        "",
        [
            44,
            191,
            210
        ]
    ],
    [
        "mediawiki.ui",
        ""
    ],
    [
        "mediawiki.ui.checkbox",
        ""
    ],
    [
        "mediawiki.ui.radio",
        ""
    ],
    [
        "mediawiki.ui.anchor",
        ""
    ],
    [
        "mediawiki.ui.button",
        ""
    ],
    [
        "mediawiki.ui.input",
        ""
    ],
    [
        "mediawiki.ui.icon",
        ""
    ],
    [
        "mediawiki.widgets",
        "",
        [
            44,
            162,
            194,
            204,
            205
        ]
    ],
    [
        "mediawiki.widgets.styles",
        ""
    ],
    [
        "mediawiki.widgets.AbandonEditDialog",
        "",
        [
            199
        ]
    ],
    [
        "mediawiki.widgets.DateInputWidget",
        "",
        [
            165,
            33,
            194,
            215
        ]
    ],
    [
        "mediawiki.widgets.DateInputWidget.styles",
        ""
    ],
    [
        "mediawiki.widgets.visibleLengthLimit",
        "",
        [
            23,
            191
        ]
    ],
    [
        "mediawiki.widgets.datetime",
        "",
        [
            82,
            191,
            210,
            214,
            215
        ]
    ],
    [
        "mediawiki.widgets.expiry",
        "",
        [
            167,
            33,
            194
        ]
    ],
    [
        "mediawiki.widgets.CheckMatrixWidget",
        "",
        [
            191
        ]
    ],
    [
        "mediawiki.widgets.CategoryMultiselectWidget",
        "",
        [
            53,
            194
        ]
    ],
    [
        "mediawiki.widgets.SelectWithInputWidget",
        "",
        [
            172,
            194
        ]
    ],
    [
        "mediawiki.widgets.SelectWithInputWidget.styles",
        ""
    ],
    [
        "mediawiki.widgets.SizeFilterWidget",
        "",
        [
            174,
            194
        ]
    ],
    [
        "mediawiki.widgets.SizeFilterWidget.styles",
        ""
    ],
    [
        "mediawiki.widgets.MediaSearch",
        "",
        [
            53,
            80,
            194
        ]
    ],
    [
        "mediawiki.widgets.Table",
        "",
        [
            194
        ]
    ],
    [
        "mediawiki.widgets.TagMultiselectWidget",
        "",
        [
            194
        ]
    ],
    [
        "mediawiki.widgets.UserInputWidget",
        "",
        [
            44,
            194
        ]
    ],
    [
        "mediawiki.widgets.UsersMultiselectWidget",
        "",
        [
            44,
            194
        ]
    ],
    [
        "mediawiki.widgets.NamespacesMultiselectWidget",
        "",
        [
            194
        ]
    ],
    [
        "mediawiki.widgets.TitlesMultiselectWidget",
        "",
        [
            161
        ]
    ],
    [
        "mediawiki.widgets.TagMultiselectWidget.styles",
        ""
    ],
    [
        "mediawiki.widgets.SearchInputWidget",
        "",
        [
            70,
            161,
            210
        ]
    ],
    [
        "mediawiki.widgets.SearchInputWidget.styles",
        ""
    ],
    [
        "mediawiki.watchstar.widgets",
        "",
        [
            190
        ]
    ],
    [
        "mediawiki.deflate",
        ""
    ],
    [
        "oojs",
        ""
    ],
    [
        "mediawiki.router",
        "",
        [
            189
        ]
    ],
    [
        "oojs-router",
        "",
        [
            187
        ]
    ],
    [
        "oojs-ui",
        "",
        [
            197,
            194,
            199
        ]
    ],
    [
        "oojs-ui-core",
        "",
        [
            104,
            187,
            193,
            192,
            201
        ]
    ],
    [
        "oojs-ui-core.styles",
        ""
    ],
    [
        "oojs-ui-core.icons",
        ""
    ],
    [
        "oojs-ui-widgets",
        "",
        [
            191,
            196
        ]
    ],
    [
        "oojs-ui-widgets.styles",
        ""
    ],
    [
        "oojs-ui-widgets.icons",
        ""
    ],
    [
        "oojs-ui-toolbars",
        "",
        [
            191,
            198
        ]
    ],
    [
        "oojs-ui-toolbars.icons",
        ""
    ],
    [
        "oojs-ui-windows",
        "",
        [
            191,
            200
        ]
    ],
    [
        "oojs-ui-windows.icons",
        ""
    ],
    [
        "oojs-ui.styles.indicators",
        ""
    ],
    [
        "oojs-ui.styles.icons-accessibility",
        ""
    ],
    [
        "oojs-ui.styles.icons-alerts",
        ""
    ],
    [
        "oojs-ui.styles.icons-content",
        ""
    ],
    [
        "oojs-ui.styles.icons-editing-advanced",
        ""
    ],
    [
        "oojs-ui.styles.icons-editing-citation",
        ""
    ],
    [
        "oojs-ui.styles.icons-editing-core",
        ""
    ],
    [
        "oojs-ui.styles.icons-editing-list",
        ""
    ],
    [
        "oojs-ui.styles.icons-editing-styling",
        ""
    ],
    [
        "oojs-ui.styles.icons-interactions",
        ""
    ],
    [
        "oojs-ui.styles.icons-layout",
        ""
    ],
    [
        "oojs-ui.styles.icons-location",
        ""
    ],
    [
        "oojs-ui.styles.icons-media",
        ""
    ],
    [
        "oojs-ui.styles.icons-moderation",
        ""
    ],
    [
        "oojs-ui.styles.icons-movement",
        ""
    ],
    [
        "oojs-ui.styles.icons-user",
        ""
    ],
    [
        "oojs-ui.styles.icons-wikimedia",
        ""
    ],
    [
        "skins.vector.user",
        "",
        [],
        0
    ],
    [
        "skins.vector.user.styles",
        "",
        [],
        0
    ],
    [
        "skins.vector.search",
        "!",
        [
            40,
            79
        ]
    ],
    [
        "skins.vector.styles.legacy",
        ""
    ],
    [
        "skins.vector.styles",
        ""
    ],
    [
        "skins.vector.icons.js",
        ""
    ],
    [
        "skins.vector.icons",
        ""
    ],
    [
        "skins.vector.es6",
        "!",
        [
            86,
            115,
            116,
            71,
            80,
            223
        ]
    ],
    [
        "skins.vector.js",
        "",
        [
            115,
            223
        ]
    ],
    [
        "skins.vector.legacy.js",
        "",
        [
            115
        ]
    ],
    [
        "skins.monobook.styles",
        ""
    ],
    [
        "skins.monobook.scripts",
        "",
        [
            80,
            203
        ]
    ],
    [
        "skins.modern",
        ""
    ],
    [
        "skins.cologneblue",
        ""
    ],
    [
        "skins.timeless",
        ""
    ],
    [
        "skins.timeless.js",
        ""
    ],
    [
        "ext.timeline.styles",
        ""
    ],
    [
        "ext.wikihiero",
        ""
    ],
    [
        "ext.wikihiero.special",
        "",
        [
            235,
            25,
            191
        ]
    ],
    [
        "ext.wikihiero.visualEditor",
        "",
        [
            401
        ]
    ],
    [
        "ext.charinsert",
        "",
        [
            30
        ]
    ],
    [
        "ext.charinsert.styles",
        ""
    ],
    [
        "ext.cite.styles",
        ""
    ],
    [
        "ext.cite.style",
        ""
    ],
    [
        "ext.cite.visualEditor.core",
        "",
        [
            409
        ]
    ],
    [
        "ext.cite.visualEditor",
        "",
        [
            241,
            240,
            242,
            203,
            206,
            210
        ]
    ],
    [
        "ext.cite.ux-enhancements",
        ""
    ],
    [
        "ext.citeThisPage",
        ""
    ],
    [
        "ext.inputBox.styles",
        ""
    ],
    [
        "ext.pygments",
        ""
    ],
    [
        "ext.pygments.linenumbers",
        "",
        [
            82
        ]
    ],
    [
        "ext.geshi.visualEditor",
        "",
        [
            401
        ]
    ],
    [
        "ext.categoryTree",
        "",
        [
            44
        ]
    ],
    [
        "ext.categoryTree.styles",
        ""
    ],
    [
        "ext.spamBlacklist.visualEditor",
        ""
    ],
    [
        "mediawiki.api.titleblacklist",
        "",
        [
            44
        ]
    ],
    [
        "ext.titleblacklist.visualEditor",
        ""
    ],
    [
        "ext.quiz",
        ""
    ],
    [
        "ext.quiz.styles",
        ""
    ],
    [
        "ext.tmh.video-js",
        "!"
    ],
    [
        "ext.tmh.videojs-ogvjs",
        "!",
        [
            266,
            257
        ]
    ],
    [
        "ext.tmh.player",
        "!",
        [
            265,
            262,
            72
        ]
    ],
    [
        "ext.tmh.player.dialog",
        "!",
        [
            261,
            199
        ]
    ],
    [
        "ext.tmh.player.inline",
        "!",
        [
            257,
            72
        ]
    ],
    [
        "ext.tmh.player.styles",
        ""
    ],
    [
        "ext.tmh.transcodetable",
        "",
        [
            44,
            190
        ]
    ],
    [
        "ext.tmh.timedtextpage.styles",
        ""
    ],
    [
        "ext.tmh.OgvJsSupport",
        "!"
    ],
    [
        "ext.tmh.OgvJs",
        "!",
        [
            265
        ]
    ],
    [
        "embedPlayerIframeStyle",
        ""
    ],
    [
        "ext.urlShortener.special",
        "",
        [
            79,
            58,
            161,
            190
        ]
    ],
    [
        "ext.urlShortener.toolbar",
        "",
        [
            44
        ]
    ],
    [
        "ext.securepoll.htmlform",
        "",
        [
            25,
            178
        ]
    ],
    [
        "ext.securepoll",
        ""
    ],
    [
        "ext.securepoll.special",
        ""
    ],
    [
        "ext.score.visualEditor",
        "",
        [
            274,
            401
        ]
    ],
    [
        "ext.score.visualEditor.icons",
        ""
    ],
    [
        "ext.score.popup",
        "",
        [
            44
        ]
    ],
    [
        "ext.score.errors",
        ""
    ],
    [
        "ext.cirrus.serp",
        "",
        [
            79,
            188
        ]
    ],
    [
        "ext.cirrus.explore-similar",
        "",
        [
            44,
            42
        ]
    ],
    [
        "ext.nuke.confirm",
        "",
        [
            107
        ]
    ],
    [
        "ext.confirmEdit.editPreview.ipwhitelist.styles",
        ""
    ],
    [
        "ext.confirmEdit.visualEditor",
        "",
        [
            864
        ]
    ],
    [
        "ext.confirmEdit.simpleCaptcha",
        ""
    ],
    [
        "ext.confirmEdit.fancyCaptcha.styles",
        ""
    ],
    [
        "ext.confirmEdit.fancyCaptcha",
        "",
        [
            44
        ]
    ],
    [
        "ext.confirmEdit.fancyCaptchaMobile",
        "",
        [
            462
        ]
    ],
    [
        "ext.centralauth",
        "",
        [
            25,
            82
        ]
    ],
    [
        "ext.centralauth.centralautologin",
        "",
        [
            107
        ]
    ],
    [
        "ext.centralauth.centralautologin.clearcookie",
        ""
    ],
    [
        "ext.centralauth.misc.styles",
        ""
    ],
    [
        "ext.centralauth.globaluserautocomplete",
        "",
        [
            27,
            44
        ]
    ],
    [
        "ext.centralauth.globalrenameuser",
        "",
        [
            82
        ]
    ],
    [
        "ext.centralauth.ForeignApi",
        "",
        [
            54
        ]
    ],
    [
        "ext.widgets.GlobalUserInputWidget",
        "",
        [
            44,
            194
        ]
    ],
    [
        "ext.GlobalUserPage",
        ""
    ],
    [
        "ext.apifeatureusage",
        ""
    ],
    [
        "ext.dismissableSiteNotice",
        "",
        [
            17,
            82
        ]
    ],
    [
        "ext.dismissableSiteNotice.styles",
        ""
    ],
    [
        "ext.centralNotice.startUp",
        "",
        [
            300
        ]
    ],
    [
        "ext.centralNotice.geoIP",
        "",
        [
            17
        ]
    ],
    [
        "ext.centralNotice.choiceData",
        "",
        [
            304
        ]
    ],
    [
        "ext.centralNotice.display",
        "",
        [
            299,
            302,
            566,
            79,
            71
        ]
    ],
    [
        "ext.centralNotice.kvStore",
        ""
    ],
    [
        "ext.centralNotice.bannerHistoryLogger",
        "",
        [
            301
        ]
    ],
    [
        "ext.centralNotice.impressionDiet",
        "",
        [
            301
        ]
    ],
    [
        "ext.centralNotice.largeBannerLimit",
        "",
        [
            301
        ]
    ],
    [
        "ext.centralNotice.legacySupport",
        "",
        [
            301
        ]
    ],
    [
        "ext.centralNotice.bannerSequence",
        "",
        [
            301
        ]
    ],
    [
        "ext.centralNotice.freegeoipLookup",
        "",
        [
            299
        ]
    ],
    [
        "ext.centralNotice.impressionEventsSampleRate",
        "",
        [
            301
        ]
    ],
    [
        "ext.centralNotice.cspViolationAlert",
        ""
    ],
    [
        "ext.wikimediamessages.contactpage",
        ""
    ],
    [
        "mediawiki.special.block.feedback.request",
        ""
    ],
    [
        "ext.ElectronPdfService.print.styles",
        ""
    ],
    [
        "ext.ElectronPdfService.special.styles",
        ""
    ],
    [
        "ext.ElectronPdfService.special.selectionImages",
        ""
    ],
    [
        "ext.advancedSearch.initialstyles",
        ""
    ],
    [
        "ext.advancedSearch.styles",
        ""
    ],
    [
        "ext.advancedSearch.searchtoken",
        "",
        [],
        1
    ],
    [
        "ext.advancedSearch.elements",
        "",
        [
            317,
            79,
            80,
            194,
            210,
            211
        ]
    ],
    [
        "ext.advancedSearch.init",
        "",
        [
            319,
            318
        ]
    ],
    [
        "ext.advancedSearch.SearchFieldUI",
        "",
        [
            72,
            194
        ]
    ],
    [
        "ext.abuseFilter",
        ""
    ],
    [
        "ext.abuseFilter.edit",
        "",
        [
            25,
            30,
            44,
            46,
            194
        ]
    ],
    [
        "ext.abuseFilter.tools",
        "",
        [
            25,
            44
        ]
    ],
    [
        "ext.abuseFilter.examine",
        "",
        [
            25,
            44
        ]
    ],
    [
        "ext.abuseFilter.ace",
        "",
        [
            546
        ]
    ],
    [
        "ext.abuseFilter.visualEditor",
        ""
    ],
    [
        "pdfhandler.messages",
        ""
    ],
    [
        "ext.wikiEditor",
        "",
        [
            30,
            32,
            110,
            80,
            161,
            206,
            207,
            208,
            209,
            213,
            41
        ],
        3
    ],
    [
        "ext.wikiEditor.styles",
        "",
        [],
        3
    ],
    [
        "ext.wikiEditor.images",
        ""
    ],
    [
        "ext.wikiEditor.realtimepreview",
        "",
        [
            329,
            331,
            117,
            69,
            71,
            210
        ]
    ],
    [
        "ext.CodeMirror",
        "",
        [
            334,
            30,
            32,
            80,
            209
        ]
    ],
    [
        "ext.CodeMirror.data",
        ""
    ],
    [
        "ext.CodeMirror.lib",
        ""
    ],
    [
        "ext.CodeMirror.addons",
        "",
        [
            335
        ]
    ],
    [
        "ext.CodeMirror.mode.mediawiki",
        "",
        [
            335
        ]
    ],
    [
        "ext.CodeMirror.lib.mode.css",
        "",
        [
            335
        ]
    ],
    [
        "ext.CodeMirror.lib.mode.javascript",
        "",
        [
            335
        ]
    ],
    [
        "ext.CodeMirror.lib.mode.xml",
        "",
        [
            335
        ]
    ],
    [
        "ext.CodeMirror.lib.mode.htmlmixed",
        "",
        [
            338,
            339,
            340
        ]
    ],
    [
        "ext.CodeMirror.lib.mode.clike",
        "",
        [
            335
        ]
    ],
    [
        "ext.CodeMirror.lib.mode.php",
        "",
        [
            342,
            341
        ]
    ],
    [
        "ext.CodeMirror.visualEditor.init",
        ""
    ],
    [
        "ext.CodeMirror.visualEditor",
        "",
        [
            401
        ]
    ],
    [
        "ext.MassMessage.styles",
        ""
    ],
    [
        "ext.MassMessage.special.js",
        "",
        [
            23,
            107
        ]
    ],
    [
        "ext.MassMessage.content",
        "",
        [
            16,
            161,
            190
        ]
    ],
    [
        "ext.MassMessage.create",
        "",
        [
            46,
            58,
            161
        ]
    ],
    [
        "ext.MassMessage.edit",
        "",
        [
            46,
            166,
            190
        ]
    ],
    [
        "ext.betaFeatures",
        "",
        [
            14,
            191
        ]
    ],
    [
        "ext.betaFeatures.styles",
        ""
    ],
    [
        "mmv",
        "",
        [
            15,
            19,
            31,
            79,
            358
        ]
    ],
    [
        "mmv.ui.ondemandshareddependencies",
        "",
        [
            353,
            190
        ]
    ],
    [
        "mmv.ui.download.pane",
        "",
        [
            154,
            161,
            354
        ]
    ],
    [
        "mmv.ui.reuse.shareembed",
        "",
        [
            161,
            354
        ]
    ],
    [
        "mmv.ui.tipsyDialog",
        "",
        [
            353
        ]
    ],
    [
        "mmv.bootstrap",
        "",
        [
            158,
            160,
            360,
            189
        ]
    ],
    [
        "mmv.bootstrap.autostart",
        "",
        [
            358
        ]
    ],
    [
        "mmv.head",
        "",
        [
            71,
            80
        ]
    ],
    [
        "ext.popups.icons",
        ""
    ],
    [
        "ext.popups.images",
        ""
    ],
    [
        "ext.popups",
        "!"
    ],
    [
        "ext.popups.main",
        "!",
        [
            361,
            362,
            79,
            86,
            71,
            158,
            155,
            160,
            80
        ]
    ],
    [
        "ext.linter.edit",
        "",
        [
            30
        ]
    ],
    [
        "socket.io",
        ""
    ],
    [
        "dompurify",
        ""
    ],
    [
        "color-picker",
        ""
    ],
    [
        "unicodejs",
        ""
    ],
    [
        "papaparse",
        ""
    ],
    [
        "rangefix",
        ""
    ],
    [
        "spark-md5",
        ""
    ],
    [
        "ext.visualEditor.supportCheck",
        "",
        [],
        4
    ],
    [
        "ext.visualEditor.sanitize",
        "",
        [
            367,
            390
        ],
        4
    ],
    [
        "ext.visualEditor.progressBarWidget",
        "",
        [],
        4
    ],
    [
        "ext.visualEditor.tempWikitextEditorWidget",
        "",
        [
            87,
            80
        ],
        4
    ],
    [
        "ext.visualEditor.desktopArticleTarget.init",
        "",
        [
            375,
            373,
            376,
            387,
            30,
            79,
            115,
            71
        ],
        4
    ],
    [
        "ext.visualEditor.desktopArticleTarget.noscript",
        ""
    ],
    [
        "ext.visualEditor.targetLoader",
        "",
        [
            389,
            387,
            30,
            71,
            80
        ],
        4
    ],
    [
        "ext.visualEditor.desktopTarget",
        "",
        [],
        4
    ],
    [
        "ext.visualEditor.desktopArticleTarget",
        "",
        [
            393,
            398,
            380,
            403
        ],
        4
    ],
    [
        "ext.visualEditor.collabTarget",
        "",
        [
            391,
            397,
            87,
            161,
            210,
            211
        ],
        4
    ],
    [
        "ext.visualEditor.collabTarget.desktop",
        "",
        [
            382,
            398,
            380,
            403
        ],
        4
    ],
    [
        "ext.visualEditor.collabTarget.init",
        "",
        [
            373,
            161,
            190
        ],
        4
    ],
    [
        "ext.visualEditor.collabTarget.init.styles",
        ""
    ],
    [
        "ext.visualEditor.ve",
        "",
        [],
        4
    ],
    [
        "ext.visualEditor.track",
        "",
        [
            386
        ],
        4
    ],
    [
        "ext.visualEditor.core.utils",
        "",
        [
            387,
            190
        ],
        4
    ],
    [
        "ext.visualEditor.core.utils.parsing",
        "",
        [
            386
        ],
        4
    ],
    [
        "ext.visualEditor.base",
        "",
        [
            388,
            389,
            369
        ],
        4
    ],
    [
        "ext.visualEditor.mediawiki",
        "",
        [
            390,
            379,
            28,
            593
        ],
        4
    ],
    [
        "ext.visualEditor.mwsave",
        "",
        [
            401,
            23,
            25,
            48,
            49,
            210
        ],
        4
    ],
    [
        "ext.visualEditor.articleTarget",
        "",
        [
            402,
            392,
            163
        ],
        4
    ],
    [
        "ext.visualEditor.data",
        "",
        [
            391
        ]
    ],
    [
        "ext.visualEditor.core",
        "",
        [
            374,
            373,
            14,
            370,
            371,
            372
        ],
        4
    ],
    [
        "ext.visualEditor.commentAnnotation",
        "",
        [
            395
        ],
        4
    ],
    [
        "ext.visualEditor.rebase",
        "",
        [
            368,
            412,
            396,
            216,
            366
        ],
        4
    ],
    [
        "ext.visualEditor.core.desktop",
        "",
        [
            395
        ],
        4
    ],
    [
        "ext.visualEditor.welcome",
        "",
        [
            190
        ],
        4
    ],
    [
        "ext.visualEditor.switching",
        "",
        [
            44,
            190,
            202,
            205,
            207
        ],
        4
    ],
    [
        "ext.visualEditor.mwcore",
        "",
        [
            413,
            391,
            400,
            399,
            122,
            69,
            8,
            161
        ],
        4
    ],
    [
        "ext.visualEditor.mwextensions",
        "",
        [
            394,
            424,
            417,
            419,
            404,
            421,
            406,
            418,
            407,
            409
        ],
        4
    ],
    [
        "ext.visualEditor.mwextensions.desktop",
        "",
        [
            402,
            408,
            77
        ],
        4
    ],
    [
        "ext.visualEditor.mwformatting",
        "",
        [
            401
        ],
        4
    ],
    [
        "ext.visualEditor.mwimage.core",
        "",
        [
            401
        ],
        4
    ],
    [
        "ext.visualEditor.mwimage",
        "",
        [
            425,
            405,
            175,
            33,
            213
        ],
        4
    ],
    [
        "ext.visualEditor.mwlink",
        "",
        [
            401
        ],
        4
    ],
    [
        "ext.visualEditor.mwmeta",
        "",
        [
            407,
            100
        ],
        4
    ],
    [
        "ext.visualEditor.mwtransclusion",
        "",
        [
            401,
            178
        ],
        4
    ],
    [
        "treeDiffer",
        ""
    ],
    [
        "diffMatchPatch",
        ""
    ],
    [
        "ext.visualEditor.checkList",
        "",
        [
            395
        ],
        4
    ],
    [
        "ext.visualEditor.diffing",
        "",
        [
            411,
            395,
            410
        ],
        4
    ],
    [
        "ext.visualEditor.diffPage.init.styles",
        ""
    ],
    [
        "ext.visualEditor.diffLoader",
        "",
        [
            379
        ],
        4
    ],
    [
        "ext.visualEditor.diffPage.init",
        "",
        [
            415,
            190,
            202,
            205
        ],
        4
    ],
    [
        "ext.visualEditor.language",
        "",
        [
            395,
            593,
            109
        ],
        4
    ],
    [
        "ext.visualEditor.mwlanguage",
        "",
        [
            395
        ],
        4
    ],
    [
        "ext.visualEditor.mwalienextension",
        "",
        [
            401
        ],
        4
    ],
    [
        "ext.visualEditor.mwwikitext",
        "",
        [
            407,
            87
        ],
        4
    ],
    [
        "ext.visualEditor.mwgallery",
        "",
        [
            401,
            113,
            175,
            213
        ],
        4
    ],
    [
        "ext.visualEditor.mwsignature",
        "",
        [
            409
        ],
        4
    ],
    [
        "ext.visualEditor.experimental",
        "",
        [],
        4
    ],
    [
        "ext.visualEditor.icons",
        "",
        [
            426,
            427,
            203,
            204,
            205,
            207,
            208,
            209,
            210,
            211,
            214,
            215,
            216,
            201
        ],
        4
    ],
    [
        "ext.visualEditor.icons-licenses",
        ""
    ],
    [
        "ext.visualEditor.moduleIcons",
        ""
    ],
    [
        "ext.visualEditor.moduleIndicators",
        ""
    ],
    [
        "ext.citoid.visualEditor",
        "",
        [
            243,
            429
        ]
    ],
    [
        "ext.citoid.visualEditor.data",
        "",
        [
            391
        ]
    ],
    [
        "ext.citoid.wikibase.init",
        ""
    ],
    [
        "ext.citoid.wikibase",
        "",
        [
            430,
            32,
            190
        ]
    ],
    [
        "ext.templateData",
        ""
    ],
    [
        "ext.templateDataGenerator.editPage",
        ""
    ],
    [
        "ext.templateDataGenerator.data",
        "",
        [
            187
        ]
    ],
    [
        "ext.templateDataGenerator.editTemplatePage.loading",
        ""
    ],
    [
        "ext.templateDataGenerator.editTemplatePage",
        "",
        [
            432,
            437,
            434,
            30,
            593,
            80,
            194,
            199,
            210,
            211,
            214
        ]
    ],
    [
        "ext.templateData.images",
        ""
    ],
    [
        "ext.TemplateWizard",
        "",
        [
            30,
            161,
            164,
            178,
            197,
            199,
            210
        ]
    ],
    [
        "ext.wikiLove.icon",
        ""
    ],
    [
        "ext.wikiLove.startup",
        "",
        [
            32,
            44,
            158
        ]
    ],
    [
        "ext.wikiLove.local",
        ""
    ],
    [
        "ext.wikiLove.init",
        "",
        [
            440
        ]
    ],
    [
        "mediawiki.libs.guiders",
        ""
    ],
    [
        "ext.guidedTour.styles",
        "",
        [
            443,
            158
        ]
    ],
    [
        "ext.guidedTour.lib.internal",
        "",
        [
            82
        ]
    ],
    [
        "ext.guidedTour.lib",
        "",
        [
            445,
            444,
            80
        ]
    ],
    [
        "ext.guidedTour.launcher",
        ""
    ],
    [
        "ext.guidedTour",
        "",
        [
            446
        ]
    ],
    [
        "ext.guidedTour.tour.firstedit",
        "",
        [
            448
        ]
    ],
    [
        "ext.guidedTour.tour.test",
        "",
        [
            448
        ]
    ],
    [
        "ext.guidedTour.tour.onshow",
        "",
        [
            448
        ]
    ],
    [
        "ext.guidedTour.tour.uprightdownleft",
        "",
        [
            448
        ]
    ],
    [
        "mobile.pagelist.styles",
        ""
    ],
    [
        "mobile.pagesummary.styles",
        ""
    ],
    [
        "mobile.placeholder.images",
        ""
    ],
    [
        "mobile.userpage.styles",
        ""
    ],
    [
        "mobile.startup.images",
        ""
    ],
    [
        "mobile.init.styles",
        ""
    ],
    [
        "mobile.init",
        "",
        [
            79,
            462
        ]
    ],
    [
        "mobile.ooui.icons",
        ""
    ],
    [
        "mobile.user.icons",
        ""
    ],
    [
        "mobile.startup",
        "",
        [
            116,
            188,
            71,
            42,
            158,
            160,
            80,
            460,
            453,
            454,
            455,
            457
        ]
    ],
    [
        "mobile.editor.overlay",
        "",
        [
            46,
            87,
            63,
            159,
            163,
            464,
            462,
            461,
            190,
            207
        ]
    ],
    [
        "mobile.editor.images",
        ""
    ],
    [
        "mobile.talk.overlays",
        "",
        [
            157,
            463
        ]
    ],
    [
        "mobile.mediaViewer",
        "",
        [
            462
        ]
    ],
    [
        "mobile.languages.structured",
        "",
        [
            462
        ]
    ],
    [
        "mobile.special.mobileoptions.styles",
        ""
    ],
    [
        "mobile.special.mobileoptions.scripts",
        "",
        [
            462
        ]
    ],
    [
        "mobile.special.userlogin.scripts",
        ""
    ],
    [
        "mobile.special.mobilediff.images",
        ""
    ],
    [
        "skins.minerva.base.styles",
        ""
    ],
    [
        "skins.minerva.content.styles.images",
        ""
    ],
    [
        "skins.minerva.icons.loggedin",
        ""
    ],
    [
        "skins.minerva.amc.styles",
        ""
    ],
    [
        "skins.minerva.overflow.icons",
        ""
    ],
    [
        "skins.minerva.icons.wikimedia",
        ""
    ],
    [
        "skins.minerva.icons.images.scripts.misc",
        ""
    ],
    [
        "skins.minerva.icons.page.issues.uncolored",
        ""
    ],
    [
        "skins.minerva.icons.page.issues.default.color",
        ""
    ],
    [
        "skins.minerva.icons.page.issues.medium.color",
        ""
    ],
    [
        "skins.minerva.mainPage.styles",
        ""
    ],
    [
        "skins.minerva.userpage.styles",
        ""
    ],
    [
        "skins.minerva.talk.styles",
        ""
    ],
    [
        "skins.minerva.personalMenu.icons",
        ""
    ],
    [
        "skins.minerva.mainMenu.advanced.icons",
        ""
    ],
    [
        "skins.minerva.mainMenu.icons",
        ""
    ],
    [
        "skins.minerva.mainMenu.styles",
        ""
    ],
    [
        "skins.minerva.loggedin.styles",
        ""
    ],
    [
        "skins.minerva.scripts",
        "",
        [
            79,
            86,
            157,
            462,
            478,
            480,
            481,
            479,
            487,
            488,
            491
        ]
    ],
    [
        "skins.minerva.messageBox.styles",
        ""
    ],
    [
        "skins.minerva.categories.styles",
        ""
    ],
    [
        "ext.math.styles",
        ""
    ],
    [
        "ext.math.scripts",
        ""
    ],
    [
        "ext.math.popup",
        "!",
        [
            44
        ]
    ],
    [
        "mw.widgets.MathWbEntitySelector",
        "",
        [
            53,
            161,
            749,
            199
        ]
    ],
    [
        "ext.math.visualEditor",
        "",
        [
            493,
            401
        ]
    ],
    [
        "ext.math.visualEditor.mathSymbols",
        ""
    ],
    [
        "ext.math.visualEditor.chemSymbols",
        ""
    ],
    [
        "ext.babel",
        ""
    ],
    [
        "ext.vipsscaler",
        "",
        [
            502
        ]
    ],
    [
        "jquery.ucompare",
        ""
    ],
    [
        "ext.interwiki.specialpage",
        ""
    ],
    [
        "ext.echo.logger",
        "",
        [
            80,
            187
        ]
    ],
    [
        "ext.echo.ui.desktop",
        "",
        [
            512,
            506
        ]
    ],
    [
        "ext.echo.ui",
        "",
        [
            507,
            504,
            872,
            194,
            203,
            204,
            210,
            214,
            215,
            216
        ]
    ],
    [
        "ext.echo.dm",
        "",
        [
            510,
            33
        ]
    ],
    [
        "ext.echo.api",
        "",
        [
            53
        ]
    ],
    [
        "ext.echo.mobile",
        "",
        [
            506,
            188,
            42
        ]
    ],
    [
        "ext.echo.init",
        "",
        [
            508
        ]
    ],
    [
        "ext.echo.centralauth",
        ""
    ],
    [
        "ext.echo.styles.badge",
        ""
    ],
    [
        "ext.echo.styles.notifications",
        ""
    ],
    [
        "ext.echo.styles.alert",
        ""
    ],
    [
        "ext.echo.special",
        "",
        [
            516,
            506
        ]
    ],
    [
        "ext.echo.styles.special",
        ""
    ],
    [
        "ext.thanks.images",
        ""
    ],
    [
        "ext.thanks",
        "",
        [
            44,
            85
        ]
    ],
    [
        "ext.thanks.corethank",
        "",
        [
            518,
            16,
            199
        ]
    ],
    [
        "ext.thanks.mobilediff",
        "",
        [
            517,
            462
        ]
    ],
    [
        "ext.thanks.flowthank",
        "",
        [
            518,
            199
        ]
    ],
    [
        "ext.flow.contributions",
        ""
    ],
    [
        "ext.flow.contributions.styles",
        ""
    ],
    [
        "ext.flow.templating",
        "",
        [
            527,
            80,
            33
        ]
    ],
    [
        "ext.flow.mediawiki.ui.form",
        ""
    ],
    [
        "ext.flow.styles.base",
        ""
    ],
    [
        "mediawiki.template.handlebars",
        "",
        [
            41
        ]
    ],
    [
        "ext.flow.components",
        "",
        [
            534,
            524,
            79,
            187
        ]
    ],
    [
        "ext.flow.ui",
        "",
        [
            532,
            373,
            87,
            71,
            80,
            190,
            205,
            208,
            216
        ]
    ],
    [
        "ext.flow",
        "",
        [
            528,
            533,
            529
        ]
    ],
    [
        "ext.flow.visualEditor",
        "",
        [
            532,
            398,
            380,
            403,
            420
        ]
    ],
    [
        "ext.flow.visualEditor.icons",
        ""
    ],
    [
        "ext.flow.jquery.conditionalScroll",
        ""
    ],
    [
        "ext.flow.jquery.findWithParent",
        ""
    ],
    [
        "ext.disambiguator",
        "!",
        [
            44,
            63
        ]
    ],
    [
        "ext.disambiguator.visualEditor",
        "",
        [
            408
        ]
    ],
    [
        "ext.discussionTools.init.styles",
        ""
    ],
    [
        "ext.discussionTools.init",
        "",
        [
            537,
            389,
            71,
            80,
            33,
            199,
            371
        ]
    ],
    [
        "ext.discussionTools.debug",
        "",
        [
            538
        ]
    ],
    [
        "ext.discussionTools.ReplyWidget",
        "",
        [
            864,
            538,
            163,
            166,
            194
        ]
    ],
    [
        "ext.discussionTools.ReplyWidgetPlain",
        "",
        [
            540,
            400,
            87
        ]
    ],
    [
        "ext.discussionTools.ReplyWidgetVisual",
        "",
        [
            540,
            393,
            422,
            420
        ]
    ],
    [
        "ext.codeEditor",
        "",
        [
            544
        ],
        3
    ],
    [
        "jquery.codeEditor",
        "",
        [
            546,
            545,
            329,
            199
        ],
        3
    ],
    [
        "ext.codeEditor.icons",
        ""
    ],
    [
        "ext.codeEditor.ace",
        "",
        [],
        5
    ],
    [
        "ext.codeEditor.ace.modes",
        "",
        [
            546
        ],
        5
    ],
    [
        "ext.scribunto.errors",
        "",
        [
            194
        ]
    ],
    [
        "ext.scribunto.logs",
        ""
    ],
    [
        "ext.scribunto.edit",
        "",
        [
            25,
            44
        ]
    ],
    [
        "ext.relatedArticles.styles",
        ""
    ],
    [
        "ext.relatedArticles.readMore.bootstrap",
        "!",
        [
            79,
            80
        ]
    ],
    [
        "ext.relatedArticles.readMore",
        "!",
        [
            82,
            187
        ]
    ],
    [
        "ext.RevisionSlider.lazyCss",
        ""
    ],
    [
        "ext.RevisionSlider.lazyJs",
        "",
        [
            558,
            215
        ]
    ],
    [
        "ext.RevisionSlider.init",
        "",
        [
            558,
            559,
            214
        ]
    ],
    [
        "ext.RevisionSlider.noscript",
        ""
    ],
    [
        "ext.RevisionSlider.Settings",
        "",
        [
            71,
            80
        ]
    ],
    [
        "ext.RevisionSlider.Slider",
        "",
        [
            560,
            32,
            79,
            33,
            190,
            210,
            215
        ]
    ],
    [
        "ext.RevisionSlider.dialogImages",
        ""
    ],
    [
        "ext.TwoColConflict.SplitJs",
        "",
        [
            563,
            564,
            69,
            71,
            80,
            190,
            210
        ]
    ],
    [
        "ext.TwoColConflict.SplitCss",
        ""
    ],
    [
        "ext.TwoColConflict.Split.TourImages",
        ""
    ],
    [
        "ext.TwoColConflict.Util",
        ""
    ],
    [
        "ext.TwoColConflict.JSCheck",
        ""
    ],
    [
        "ext.eventLogging",
        "",
        [
            80
        ]
    ],
    [
        "ext.eventLogging.debug",
        ""
    ],
    [
        "ext.eventLogging.jsonSchema",
        ""
    ],
    [
        "ext.eventLogging.jsonSchema.styles",
        ""
    ],
    [
        "ext.wikimediaEvents",
        "",
        [
            566,
            79,
            86,
            71,
            88
        ]
    ],
    [
        "ext.wikimediaEvents.wikibase",
        "",
        [
            566,
            86
        ]
    ],
    [
        "ext.navigationTiming",
        "",
        [
            566
        ]
    ],
    [
        "ext.uls.common",
        "",
        [
            593,
            71,
            80
        ]
    ],
    [
        "ext.uls.compactlinks",
        "",
        [
            573,
            158
        ]
    ],
    [
        "ext.uls.ime",
        "",
        [
            583,
            591
        ]
    ],
    [
        "ext.uls.displaysettings",
        "",
        [
            575,
            582,
            155,
            156
        ]
    ],
    [
        "ext.uls.geoclient",
        "",
        [
            85
        ]
    ],
    [
        "ext.uls.i18n",
        "",
        [
            22,
            82
        ]
    ],
    [
        "ext.uls.interface",
        "",
        [
            589,
            187
        ]
    ],
    [
        "ext.uls.interlanguage",
        ""
    ],
    [
        "ext.uls.languagenames",
        ""
    ],
    [
        "ext.uls.languagesettings",
        "",
        [
            584,
            585,
            594,
            158
        ]
    ],
    [
        "ext.uls.mediawiki",
        "",
        [
            573,
            581,
            584,
            589,
            592
        ]
    ],
    [
        "ext.uls.messages",
        "",
        [
            578
        ]
    ],
    [
        "ext.uls.preferences",
        "",
        [
            71,
            80
        ]
    ],
    [
        "ext.uls.preferencespage",
        ""
    ],
    [
        "ext.uls.pt",
        ""
    ],
    [
        "ext.uls.setlang",
        "",
        [
            79,
            44,
            158
        ]
    ],
    [
        "ext.uls.webfonts",
        "",
        [
            585
        ]
    ],
    [
        "ext.uls.webfonts.repository",
        ""
    ],
    [
        "jquery.ime",
        ""
    ],
    [
        "jquery.uls",
        "",
        [
            22,
            593,
            594
        ]
    ],
    [
        "jquery.uls.data",
        ""
    ],
    [
        "jquery.uls.grid",
        ""
    ],
    [
        "rangy.core",
        ""
    ],
    [
        "ext.cx.contributions",
        "",
        [
            82,
            191,
            204,
            205
        ]
    ],
    [
        "ext.cx.model",
        ""
    ],
    [
        "ext.cx.icons",
        ""
    ],
    [
        "ext.cx.dashboard",
        "",
        [
            624,
            27,
            161,
            33,
            602,
            634,
            603,
            207,
            213,
            214
        ]
    ],
    [
        "sx.publishing.followup",
        "!",
        [
            602,
            601,
            34
        ]
    ],
    [
        "mw.cx.util",
        "",
        [
            597,
            80
        ]
    ],
    [
        "mw.cx.SiteMapper",
        "",
        [
            597,
            53,
            80
        ]
    ],
    [
        "mw.cx.ui.LanguageFilter",
        "",
        [
            583,
            158,
            628,
            601,
            210
        ]
    ],
    [
        "ext.cx.wikibase.link",
        ""
    ],
    [
        "ext.cx.uls.quick.actions",
        "!",
        [
            573,
            579,
            602,
            210
        ]
    ],
    [
        "ext.cx.eventlogging.campaigns",
        "",
        [
            80
        ]
    ],
    [
        "ext.cx.interlanguagelink.init",
        "",
        [
            573
        ]
    ],
    [
        "ext.cx.interlanguagelink",
        "",
        [
            573,
            602,
            194,
            210
        ]
    ],
    [
        "ext.cx.translation.conflict",
        "",
        [
            107
        ]
    ],
    [
        "ext.cx.stats",
        "",
        [
            611,
            625,
            624,
            593,
            33,
            602
        ]
    ],
    [
        "chart.js",
        ""
    ],
    [
        "ext.cx.entrypoints.recentedit",
        "!",
        [
            593,
            602,
            601,
            34
        ]
    ],
    [
        "ext.cx.entrypoints.recenttranslation",
        "!",
        [
            593,
            602,
            601,
            34
        ]
    ],
    [
        "ext.cx.entrypoints.newarticle",
        "!",
        [
            625,
            107,
            158,
            191
        ]
    ],
    [
        "ext.cx.entrypoints.newarticle.veloader",
        "!"
    ],
    [
        "ext.cx.entrypoints.languagesearcher.init",
        "!"
    ],
    [
        "ext.cx.entrypoints.languagesearcher",
        "!",
        [
            593,
            602
        ]
    ],
    [
        "ext.cx.entrypoints.mffrequentlanguages",
        "!",
        [
            602
        ]
    ],
    [
        "ext.cx.entrypoints.ulsrelevantlanguages",
        "!",
        [
            573,
            602,
            34
        ]
    ],
    [
        "ext.cx.entrypoints.newbytranslation",
        "!",
        [
            602,
            601,
            194,
            204,
            210
        ]
    ],
    [
        "ext.cx.entrypoints.newbytranslation.mobile",
        "!",
        [
            602,
            601,
            204
        ]
    ],
    [
        "ext.cx.betafeature.init",
        ""
    ],
    [
        "ext.cx.entrypoints.contributionsmenu",
        "!",
        [
            598,
            625,
            107,
            160
        ]
    ],
    [
        "ext.cx.widgets.spinner",
        "",
        [
            597
        ]
    ],
    [
        "ext.cx.widgets.callout",
        ""
    ],
    [
        "mw.cx.dm",
        "",
        [
            597,
            187
        ]
    ],
    [
        "mw.cx.dm.Translation",
        "",
        [
            626
        ]
    ],
    [
        "mw.cx.ui",
        "",
        [
            597,
            190
        ]
    ],
    [
        "mw.cx.visualEditor",
        "",
        [
            243,
            398,
            380,
            403,
            630,
            631
        ]
    ],
    [
        "ve.ce.CXLintableNode",
        "",
        [
            395
        ]
    ],
    [
        "ve.dm.CXLintableNode",
        "",
        [
            395,
            626
        ]
    ],
    [
        "mw.cx.init",
        "",
        [
            624,
            408,
            638,
            634,
            630,
            631,
            633
        ]
    ],
    [
        "ve.init.mw.CXTarget",
        "",
        [
            398,
            602,
            627,
            628,
            601
        ]
    ],
    [
        "mw.cx.ui.Infobar",
        "",
        [
            628,
            601,
            203,
            210
        ]
    ],
    [
        "mw.cx.ui.CaptchaDialog",
        "",
        [
            755,
            628
        ]
    ],
    [
        "mw.cx.ui.LoginDialog",
        "",
        [
            82,
            628
        ]
    ],
    [
        "mw.cx.tools.InstructionsTool",
        "",
        [
            107,
            638,
            42
        ]
    ],
    [
        "mw.cx.tools.TranslationTool",
        "",
        [
            628
        ]
    ],
    [
        "mw.cx.ui.FeatureDiscoveryWidget",
        "",
        [
            69,
            628
        ]
    ],
    [
        "mw.cx.skin",
        ""
    ],
    [
        "mw.externalguidance.init",
        "",
        [
            79
        ]
    ],
    [
        "mw.externalguidance",
        "",
        [
            53,
            462,
            643,
            207
        ]
    ],
    [
        "mw.externalguidance.icons",
        ""
    ],
    [
        "mw.externalguidance.special",
        "",
        [
            593,
            53,
            156,
            462,
            643
        ]
    ],
    [
        "wikibase.client.init",
        ""
    ],
    [
        "wikibase.client.miscStyles",
        ""
    ],
    [
        "wikibase.client.vector-2022",
        ""
    ],
    [
        "wikibase.client.linkitem.init",
        "",
        [
            25
        ]
    ],
    [
        "jquery.wikibase.linkitem",
        "",
        [
            25,
            31,
            32,
            53,
            749,
            748,
            873
        ]
    ],
    [
        "wikibase.client.action.edit.collapsibleFooter",
        "",
        [
            24,
            61,
            71
        ]
    ],
    [
        "ext.wikimediaBadges",
        ""
    ],
    [
        "ext.TemplateSandbox.top",
        ""
    ],
    [
        "ext.TemplateSandbox",
        "",
        [
            652
        ]
    ],
    [
        "ext.TemplateSandbox.visualeditor",
        "",
        [
            161,
            190
        ]
    ],
    [
        "ext.pageassessments.special",
        "",
        [
            27,
            191
        ]
    ],
    [
        "ext.jsonConfig",
        ""
    ],
    [
        "ext.jsonConfig.edit",
        "",
        [
            30,
            176,
            199
        ]
    ],
    [
        "ext.graph.styles",
        ""
    ],
    [
        "ext.graph.data",
        ""
    ],
    [
        "ext.graph.loader",
        "",
        [
            44
        ]
    ],
    [
        "ext.graph.vega1",
        "",
        [
            659,
            79
        ]
    ],
    [
        "ext.graph.vega2",
        "",
        [
            659,
            79
        ]
    ],
    [
        "ext.graph.sandbox",
        "",
        [
            543,
            662,
            46
        ]
    ],
    [
        "ext.graph.visualEditor",
        "",
        [
            659,
            405,
            176
        ]
    ],
    [
        "ext.MWOAuth.styles",
        ""
    ],
    [
        "ext.MWOAuth.AuthorizeDialog",
        "",
        [
            199
        ]
    ],
    [
        "ext.oath.totp.showqrcode",
        ""
    ],
    [
        "ext.oath.totp.showqrcode.styles",
        ""
    ],
    [
        "ext.webauthn.ui.base",
        "",
        [
            107,
            190
        ]
    ],
    [
        "ext.webauthn.register",
        "",
        [
            669,
            44
        ]
    ],
    [
        "ext.webauthn.login",
        "",
        [
            669
        ]
    ],
    [
        "ext.webauthn.manage",
        "",
        [
            669,
            44
        ]
    ],
    [
        "ext.webauthn.disable",
        "",
        [
            669
        ]
    ],
    [
        "ext.ores.highlighter",
        ""
    ],
    [
        "ext.ores.styles",
        ""
    ],
    [
        "ext.ores.api",
        ""
    ],
    [
        "ext.checkUser",
        "",
        [
            28,
            79,
            67,
            71,
            161,
            207,
            210,
            212,
            214,
            216
        ]
    ],
    [
        "ext.checkUser.styles",
        ""
    ],
    [
        "ext.guidedTour.tour.checkuserinvestigateform",
        "",
        [
            448
        ]
    ],
    [
        "ext.guidedTour.tour.checkuserinvestigate",
        "",
        [
            677,
            448
        ]
    ],
    [
        "ext.ipInfo",
        "",
        [
            57,
            71,
            80,
            194,
            204
        ]
    ],
    [
        "ext.ipInfo.styles",
        ""
    ],
    [
        "ext.quicksurveys.lib",
        "!",
        [
            25,
            79,
            86,
            71,
            80
        ]
    ],
    [
        "ext.quicksurveys.lib.vue",
        "!",
        [
            39,
            683
        ]
    ],
    [
        "ext.quicksurveys.init",
        "!"
    ],
    [
        "ext.kartographer",
        ""
    ],
    [
        "ext.kartographer.style",
        ""
    ],
    [
        "ext.kartographer.site",
        ""
    ],
    [
        "mapbox",
        ""
    ],
    [
        "leaflet.draw",
        "",
        [
            689
        ]
    ],
    [
        "ext.kartographer.link",
        "",
        [
            693,
            188
        ]
    ],
    [
        "ext.kartographer.box",
        "",
        [
            694,
            706,
            688,
            687,
            697,
            79,
            44,
            213
        ]
    ],
    [
        "ext.kartographer.linkbox",
        "",
        [
            697
        ]
    ],
    [
        "ext.kartographer.data",
        ""
    ],
    [
        "ext.kartographer.dialog",
        "",
        [
            689,
            72,
            188,
            194,
            199
        ]
    ],
    [
        "ext.kartographer.dialog.sidebar",
        "",
        [
            71,
            210,
            215
        ]
    ],
    [
        "ext.kartographer.util",
        "",
        [
            686
        ]
    ],
    [
        "ext.kartographer.frame",
        "",
        [
            692,
            188
        ]
    ],
    [
        "ext.kartographer.staticframe",
        "",
        [
            693,
            188,
            213
        ]
    ],
    [
        "ext.kartographer.preview",
        ""
    ],
    [
        "ext.kartographer.editing",
        "",
        [
            44
        ]
    ],
    [
        "ext.kartographer.editor",
        "",
        [
            692,
            690
        ]
    ],
    [
        "ext.kartographer.visualEditor",
        "",
        [
            697,
            401,
            212
        ]
    ],
    [
        "ext.kartographer.lib.leaflet.markercluster",
        "",
        [
            689
        ]
    ],
    [
        "ext.kartographer.lib.prunecluster",
        "",
        [
            689
        ]
    ],
    [
        "ext.kartographer.lib.topojson",
        "",
        [
            689
        ]
    ],
    [
        "ext.kartographer.wv",
        "",
        [
            705,
            207
        ]
    ],
    [
        "ext.kartographer.specialMap",
        ""
    ],
    [
        "ext.pageviewinfo",
        "",
        [
            662,
            190
        ]
    ],
    [
        "ext.3d",
        "",
        [
            25
        ]
    ],
    [
        "ext.3d.styles",
        ""
    ],
    [
        "mmv.3d",
        "",
        [
            710,
            353
        ]
    ],
    [
        "mmv.3d.head",
        "",
        [
            710,
            191,
            202,
            204
        ]
    ],
    [
        "ext.3d.special.upload",
        "",
        [
            715,
            147
        ]
    ],
    [
        "ext.3d.special.upload.styles",
        ""
    ],
    [
        "special.readinglist.styles",
        ""
    ],
    [
        "special.readinglist.scripts",
        "!",
        [
            39,
            80
        ]
    ],
    [
        "ext.GlobalPreferences.global",
        "",
        [
            161,
            169,
            179
        ]
    ],
    [
        "ext.GlobalPreferences.global-nojs",
        ""
    ],
    [
        "ext.GlobalPreferences.local-nojs",
        ""
    ],
    [
        "ext.growthExperiments.mobileMenu.icons",
        ""
    ],
    [
        "ext.growthExperiments.SuggestedEditSession",
        "",
        [
            79,
            71,
            80,
            187
        ]
    ],
    [
        "ext.growthExperiments.HelpPanelCta.styles",
        ""
    ],
    [
        "ext.growthExperiments.HomepageDiscovery.styles",
        ""
    ],
    [
        "ext.growthExperiments.Homepage",
        "",
        [
            79,
            80,
            199
        ]
    ],
    [
        "ext.growthExperiments.Homepage.NewImpact",
        "!",
        [
            39,
            80,
            33
        ]
    ],
    [
        "ext.growthExperiments.Homepage.Mentorship",
        "",
        [
            733,
            722,
            188
        ]
    ],
    [
        "ext.growthExperiments.Homepage.SuggestedEdits",
        "",
        [
            743,
            722,
            69,
            188,
            194,
            199,
            204,
            207,
            213
        ]
    ],
    [
        "ext.growthExperiments.Homepage.styles",
        ""
    ],
    [
        "ext.growthExperiments.StructuredTask",
        "",
        [
            732,
            739,
            407,
            188,
            213,
            214,
            215
        ]
    ],
    [
        "ext.growthExperiments.StructuredTask.desktop",
        "",
        [
            730,
            381
        ]
    ],
    [
        "ext.growthExperiments.StructuredTask.PreEdit",
        "",
        [
            743,
            722,
            194,
            199
        ]
    ],
    [
        "ext.growthExperiments.Help",
        "",
        [
            743,
            739,
            79,
            71,
            194,
            199,
            203,
            205,
            206,
            207,
            210,
            216
        ]
    ],
    [
        "ext.growthExperiments.HelpPanel",
        "",
        [
            733,
            723,
            732,
            69,
            215
        ]
    ],
    [
        "ext.growthExperiments.HelpPanel.init",
        "",
        [
            722
        ]
    ],
    [
        "ext.growthExperiments.PostEdit",
        "",
        [
            743,
            722,
            739,
            199,
            215
        ]
    ],
    [
        "ext.growthExperiments.Account",
        "",
        [
            188,
            194
        ]
    ],
    [
        "ext.growthExperiments.Account.styles",
        ""
    ],
    [
        "ext.growthExperiments.icons",
        ""
    ],
    [
        "ext.growthExperiments.MentorDashboard",
        "!",
        [
            39,
            739,
            109,
            178,
            199,
            206,
            207,
            210,
            213,
            214,
            215,
            216,
            36
        ]
    ],
    [
        "ext.growthExperiments.MentorDashboard.styles",
        ""
    ],
    [
        "ext.growthExperiments.MentorDashboard.Discovery",
        "",
        [
            69
        ]
    ],
    [
        "ext.growthExperiments.DataStore",
        "",
        [
            80,
            191
        ]
    ],
    [
        "ext.growthExperiments.MidEditSignup",
        "",
        [
            71,
            199
        ]
    ],
    [
        "ext.nearby.styles",
        ""
    ],
    [
        "ext.nearby.scripts",
        "!",
        [
            39,
            44,
            188,
            158
        ]
    ],
    [
        "ext.nearby.images",
        ""
    ],
    [
        "mw.config.values.wbSiteDetails",
        ""
    ],
    [
        "mw.config.values.wbRepo",
        ""
    ],
    [
        "ext.centralauth.globalrenamequeue",
        ""
    ],
    [
        "ext.centralauth.globalrenamequeue.styles",
        ""
    ],
    [
        "ext.guidedTour.tour.firsteditve",
        "",
        [
            448
        ]
    ],
    [
        "ext.guidedTour.tour.flowOptIn",
        "",
        [
            448
        ]
    ],
    [
        "ext.wikimediaEvents.visualEditor",
        "",
        [
            379
        ]
    ],
    [
        "mw.cx.externalmessages",
        ""
    ],
    [
        "ext.gadget.edit0",
        "",
        [
            82
        ],
        2
    ],
    [
        "ext.gadget.HotCat",
        "",
        [],
        2
    ],
    [
        "ext.gadget.Cat-a-lot",
        "",
        [
            82
        ],
        2
    ],
    [
        "ext.gadget.wikEd",
        "",
        [],
        2
    ],
    [
        "ext.gadget.ProveIt",
        "",
        [],
        2
    ],
    [
        "ext.gadget.specialchars",
        "",
        [],
        2
    ],
    [
        "ext.gadget.PreviewWithVariant",
        "",
        [
            857,
            190,
            79,
            80
        ],
        2
    ],
    [
        "ext.gadget.PreviewWithVariant2017",
        "",
        [
            857,
            190
        ],
        2
    ],
    [
        "ext.gadget.EditTextboxWrapping",
        "",
        [
            857
        ],
        2
    ],
    [
        "ext.gadget.CX-Template_Translated_page",
        "",
        [
            44
        ],
        2
    ],
    [
        "ext.gadget.ToolsRedirect",
        "",
        [
            857,
            32
        ],
        2
    ],
    [
        "ext.gadget.ToolsRedirect-opt-bolds",
        "",
        [
            766
        ],
        2
    ],
    [
        "ext.gadget.ToolsRedirect-bio-latin-names",
        "",
        [
            766
        ],
        2
    ],
    [
        "ext.gadget.ToolsRedirect-courtesy-and-art-names",
        "",
        [
            766
        ],
        2
    ],
    [
        "ext.gadget.Wordcount",
        "",
        [],
        2
    ],
    [
        "ext.gadget.fixlinkstyle",
        "",
        [
            82,
            32
        ],
        2
    ],
    [
        "ext.gadget.dykc-nomination",
        "",
        [
            82,
            32
        ],
        2
    ],
    [
        "ext.gadget.WikidataDesc",
        "",
        [],
        2
    ],
    [
        "ext.gadget.link-ts",
        "",
        [],
        2
    ],
    [
        "ext.gadget.easy-archive",
        "",
        [],
        2
    ],
    [
        "ext.gadget.edit-count",
        "",
        [],
        2
    ],
    [
        "ext.gadget.dcparticipant",
        "",
        [
            857,
            32,
            199
        ],
        2
    ],
    [
        "ext.gadget.Edittools-vector",
        "",
        [
            80
        ],
        2
    ],
    [
        "ext.gadget.Edittools-vplus",
        "",
        [
            857,
            778
        ],
        2
    ],
    [
        "ext.gadget.Edittools-vote",
        "",
        [
            778
        ],
        2
    ],
    [
        "ext.gadget.Edittools-delh",
        "",
        [
            857,
            778
        ],
        2
    ],
    [
        "ext.gadget.Edittools-refToolbar",
        "",
        [
            857,
            80
        ],
        2
    ],
    [
        "ext.gadget.Navigation_popups",
        "",
        [
            857
        ],
        2
    ],
    [
        "ext.gadget.removeAccessKeys",
        "",
        [
            82
        ],
        2
    ],
    [
        "ext.gadget.UTCLiveClock",
        "",
        [],
        2
    ],
    [
        "ext.gadget.contribsrange",
        "",
        [
            25,
            857
        ],
        2
    ],
    [
        "ext.gadget.shareTool",
        "",
        [
            857
        ],
        2
    ],
    [
        "ext.gadget.WikiMiniAtlas",
        "",
        [],
        2
    ],
    [
        "ext.gadget.fullwidth-search-fix",
        "",
        [
            82
        ],
        2
    ],
    [
        "ext.gadget.ExternalLinkNewWin",
        "",
        [],
        2
    ],
    [
        "ext.gadget.ReferenceTooltips",
        "",
        [
            857
        ],
        2
    ],
    [
        "ext.gadget.UnihanTooltips",
        "",
        [
            857,
            17
        ],
        2
    ],
    [
        "ext.gadget.variant-link-fix",
        "",
        [
            79
        ],
        2
    ],
    [
        "ext.gadget.OSMMap",
        "",
        [
            857,
            860
        ],
        2
    ],
    [
        "ext.gadget.confirm-logout",
        "",
        [
            861,
            857,
            44,
            199
        ],
        2
    ],
    [
        "ext.gadget.shortURL",
        "",
        [
            857,
            199,
            161,
            53
        ],
        2
    ],
    [
        "ext.gadget.Difflink",
        "",
        [],
        2
    ],
    [
        "ext.gadget.pseudonamespace-UI",
        "",
        [
            857
        ],
        2
    ],
    [
        "ext.gadget.SpecialWikitext",
        "",
        [
            857,
            44
        ],
        2
    ],
    [
        "ext.gadget.preserve-variant",
        "",
        [
            79
        ],
        2
    ],
    [
        "ext.gadget.switcher",
        "",
        [],
        2
    ],
    [
        "ext.gadget.AdvancedSiteNotices",
        "",
        [
            857,
            17,
            44
        ],
        2
    ],
    [
        "ext.gadget.RedirectSubTipAtBottom",
        "",
        [],
        2
    ],
    [
        "ext.gadget.hantsect",
        "",
        [],
        2
    ],
    [
        "ext.gadget.ExternalSearch",
        "",
        [],
        2
    ],
    [
        "ext.gadget.hideConversionTab",
        "",
        [],
        2
    ],
    [
        "ext.gadget.Blackskin",
        "",
        [],
        2
    ],
    [
        "ext.gadget.moveEditsectionBack",
        "",
        [],
        2
    ],
    [
        "ext.gadget.ViewSourceMode",
        "",
        [
            82
        ],
        2
    ],
    [
        "ext.gadget.ImageAnnotator",
        "",
        [],
        2
    ],
    [
        "ext.gadget.markblocked",
        "",
        [
            82
        ],
        2
    ],
    [
        "ext.gadget.disableAnimationCollapse",
        "",
        [],
        2
    ],
    [
        "ext.gadget.CommentsinLocalTime",
        "",
        [
            857
        ],
        2
    ],
    [
        "ext.gadget.SimplifyRefNotesTag",
        "",
        [],
        2
    ],
    [
        "ext.gadget.HideRefLinks",
        "",
        [],
        2
    ],
    [
        "ext.gadget.large-font",
        "",
        [],
        2
    ],
    [
        "ext.gadget.OldDiff",
        "",
        [],
        2
    ],
    [
        "ext.gadget.OldIlh",
        "",
        [],
        2
    ],
    [
        "ext.gadget.internalLinkHelper-redonly",
        "",
        [],
        2
    ],
    [
        "ext.gadget.internalLinkHelper-redtipsy",
        "",
        [
            31,
            857
        ],
        2
    ],
    [
        "ext.gadget.internalLinkHelper-redplain",
        "",
        [
            82
        ],
        2
    ],
    [
        "ext.gadget.internalLinkHelper-external",
        "",
        [
            82
        ],
        2
    ],
    [
        "ext.gadget.internalLinkHelper-suffix",
        "",
        [
            82
        ],
        2
    ],
    [
        "ext.gadget.internalLinkHelper-cravix",
        "",
        [
            857
        ],
        2
    ],
    [
        "ext.gadget.internalLinkHelper-altcolor",
        "",
        [
            31,
            857
        ],
        2
    ],
    [
        "ext.gadget.internalLinkHelper-ilbluehl",
        "",
        [
            31,
            857
        ],
        2
    ],
    [
        "ext.gadget.noteTA",
        "",
        [
            32,
            44,
            857,
            24
        ],
        2
    ],
    [
        "ext.gadget.noteTAvector",
        "",
        [
            0,
            857
        ],
        2
    ],
    [
        "ext.gadget.NavFrame",
        "",
        [
            857
        ],
        2
    ],
    [
        "ext.gadget.collapsibleTables",
        "",
        [
            857
        ],
        2
    ],
    [
        "ext.gadget.RTRC",
        "",
        [],
        2
    ],
    [
        "ext.gadget.DisambiguationLinks",
        "",
        [],
        2
    ],
    [
        "ext.gadget.NotifCountTitle",
        "",
        [
            104
        ],
        2
    ],
    [
        "ext.gadget.MarkRights",
        "",
        [
            44
        ],
        2
    ],
    [
        "ext.gadget.OnlineAdmins",
        "",
        [
            857,
            44
        ],
        2
    ],
    [
        "ext.gadget.RemoveCustomSigns",
        "",
        [],
        2
    ],
    [
        "ext.gadget.HideEditSpecialChars",
        "",
        [],
        2
    ],
    [
        "ext.gadget.HideWarnings",
        "",
        [],
        2
    ],
    [
        "ext.gadget.notifyConversion",
        "",
        [
            861,
            71
        ],
        2
    ],
    [
        "ext.gadget.CollapsibleSidebar",
        "",
        [
            71
        ],
        2
    ],
    [
        "ext.gadget.scrollUpButton",
        "",
        [],
        2
    ],
    [
        "ext.gadget.dark-mode-toggle",
        "",
        [
            44,
            79,
            71
        ],
        2
    ],
    [
        "ext.gadget.dark-mode-toggle-pagestyles",
        "",
        [],
        2
    ],
    [
        "ext.gadget.dark-mode",
        "",
        [],
        2
    ],
    [
        "ext.gadget.Twinkle",
        "!",
        [
            846,
            848
        ],
        6
    ],
    [
        "ext.gadget.morebits",
        "!",
        [
            857,
            80,
            32
        ],
        6
    ],
    [
        "ext.gadget.Twinkle-pagestyles",
        "",
        [],
        2
    ],
    [
        "ext.gadget.select2",
        "",
        [],
        2
    ],
    [
        "ext.gadget.PatrollCount",
        "",
        [
            857
        ],
        2
    ],
    [
        "ext.gadget.RCPatrol",
        "",
        [
            44,
            22
        ],
        2
    ],
    [
        "ext.gadget.rollback-summary",
        "",
        [
            857,
            190,
            207
        ],
        2
    ],
    [
        "ext.gadget.CleanDeleteReasons",
        "",
        [],
        2
    ],
    [
        "ext.gadget.dyktool",
        "",
        [
            857
        ],
        2
    ],
    [
        "ext.gadget.SettingsUI",
        "",
        [
            32,
            80,
            856
        ],
        2
    ],
    [
        "ext.gadget.SettingsManager",
        "",
        [
            80
        ],
        2
    ],
    [
        "ext.gadget.libJQuery",
        "",
        [],
        2
    ],
    [
        "ext.gadget.site-lib",
        "",
        [
            82
        ],
        2
    ],
    [
        "ext.gadget.HanAssist",
        "",
        [],
        2
    ],
    [
        "ext.gadget.EditorAPIs",
        "",
        [
            82
        ],
        2
    ],
    [
        "ext.gadget.MoveResizeAbsolute",
        "",
        [],
        2
    ],
    [
        "ext.gadget.ding",
        "",
        [],
        2
    ],
    [
        "ext.gadget.searchFocus",
        "",
        [],
        2
    ],
    [
        "ext.gadget.mainpage-localtime",
        "",
        [
            82
        ],
        2
    ],
    [
        "ext.confirmEdit.CaptchaInputWidget",
        "",
        [
            191
        ]
    ],
    [
        "ext.globalCssJs.user",
        "",
        [],
        0,
        "metawiki"
    ],
    [
        "ext.globalCssJs.user.styles",
        "",
        [],
        0,
        "metawiki"
    ],
    [
        "ext.guidedTour.tour.RcFiltersIntro",
        "",
        [
            448
        ]
    ],
    [
        "ext.guidedTour.tour.WlFiltersIntro",
        "",
        [
            448
        ]
    ],
    [
        "ext.guidedTour.tour.RcFiltersHighlight",
        "",
        [
            448
        ]
    ],
    [
        "ext.wikimediaMessages.ipInfo.hooks",
        "",
        [
            681,
            210
        ]
    ],
    [
        "ext.echo.emailicons",
        ""
    ],
    [
        "ext.echo.secondaryicons",
        ""
    ],
    [
        "wikibase.Site",
        "",
        [
            583
        ]
    ],
    [
        "ext.guidedTour.tour.helppanel",
        "",
        [
            448
        ]
    ],
    [
        "ext.guidedTour.tour.homepage_mentor",
        "",
        [
            448
        ]
    ],
    [
        "ext.guidedTour.tour.homepage_welcome",
        "",
        [
            448
        ]
    ],
    [
        "ext.guidedTour.tour.homepage_discovery",
        "",
        [
            448
        ]
    ],
    [
        "ext.guidedTour.tour.newimpact_discovery",
        "",
        [
            448
        ]
    ],
    [
        "mediawiki.messagePoster",
        "",
        [
            53
        ]
    ]
]);

		// First set page-specific config needed by mw.loader (wgCSPNonce, wgUserName)
		mw.config.set( window.RLCONF || {} );
		mw.loader.state( window.RLSTATE || {} );
		mw.loader.load( window.RLPAGEMODULES || [] );

		// Process RLQ callbacks
		//
		// The code in these callbacks could've been exposed from load.php and
		// requested client-side. Instead, they are pushed by the server directly
		// (from ResourceLoaderClientHtml and other parts of MediaWiki). This
		// saves the need for additional round trips. It also allows load.php
		// to remain stateless and sending personal data in the HTML instead.
		//
		// The HTML inline script lazy-defines the 'RLQ' array. Now that we are
		// processing it, replace it with an implementation where 'push' actually
		// considers executing the code directly. This is to ensure any late
		// arrivals will also be processed. Late arrival can happen because
		// startup.js is executed asynchronously, concurrently with the streaming
		// response of the HTML.
		queue = window.RLQ || [];
		// Replace RLQ with an empty array, then process the things that were
		// in RLQ previously. We have to do this to avoid an infinite loop:
		// non-function items are added back to RLQ by the processing step.
		RLQ = [];
		RLQ.push = function ( fn ) {
			if ( typeof fn === 'function' ) {
				fn();
			} else {
				// If the first parameter is not a function, then it is an array
				// containing a list of required module names and a function.
				// Do an actual push for now, as this signature is handled
				// later by mediawiki.base.js.
				RLQ[ RLQ.length ] = fn;
			}
		};
		while ( queue[ 0 ] ) {
			// Process all values gathered so far
			RLQ.push( queue.shift() );
		}

		// Clear and disable the basic (Grade C) queue.
		NORLQ = {
			push: function () {}
		};
	}() );
}
mw.loader.state({
    "startup": "ready"
});
var __FOLIA_BRIDGE_VM__ = (function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region src/webBridge/vendor/crypto-es.mjs
	var module = { exports: {} };
	var exports$1 = module.exports;
	(function(root, factory) {
		if (typeof exports$1 === "object") module.exports = exports$1 = factory();
		else if (typeof define === "function" && define.amd) define([], factory);
		else root.CryptoJS = factory();
	})(void 0, function() {
		/**
		* CryptoJS core components.
		*/
		var CryptoJS = CryptoJS || function(Math, undefined) {
			var crypto;
			if (typeof window !== "undefined" && window.crypto) crypto = window.crypto;
			if (typeof self !== "undefined" && self.crypto) crypto = self.crypto;
			if (typeof globalThis !== "undefined" && globalThis.crypto) crypto = globalThis.crypto;
			if (!crypto && typeof window !== "undefined" && window.msCrypto) crypto = window.msCrypto;
			if (!crypto && typeof global !== "undefined" && global.crypto) crypto = global.crypto;
			if (!crypto && typeof require === "function") try {
				crypto = require("crypto");
			} catch (err) {}
			var cryptoSecureRandomInt = function() {
				if (crypto) {
					if (typeof crypto.getRandomValues === "function") try {
						return crypto.getRandomValues(/* @__PURE__ */ new Uint32Array(1))[0];
					} catch (err) {}
					if (typeof crypto.randomBytes === "function") try {
						return crypto.randomBytes(4).readInt32LE();
					} catch (err) {}
				}
				throw new Error("Native crypto module could not be used to get secure random number.");
			};
			var create = Object.create || function() {
				function F() {}
				return function(obj) {
					var subtype;
					F.prototype = obj;
					subtype = new F();
					F.prototype = null;
					return subtype;
				};
			}();
			/**
			* CryptoJS namespace.
			*/
			var C = {};
			/**
			* Library namespace.
			*/
			var C_lib = C.lib = {};
			/**
			* Base object for prototypal inheritance.
			*/
			var Base = C_lib.Base = function() {
				return {
					/**
					* Creates a new object that inherits from this object.
					*
					* @param {Object} overrides Properties to copy into the new object.
					*
					* @return {Object} The new object.
					*
					* @static
					*
					* @example
					*
					*     var MyType = CryptoJS.lib.Base.extend({
					*         field: 'value',
					*
					*         method: function () {
					*         }
					*     });
					*/
					extend: function(overrides) {
						var subtype = create(this);
						if (overrides) subtype.mixIn(overrides);
						if (!subtype.hasOwnProperty("init") || this.init === subtype.init) subtype.init = function() {
							subtype.$super.init.apply(this, arguments);
						};
						subtype.init.prototype = subtype;
						subtype.$super = this;
						return subtype;
					},
					/**
					* Extends this object and runs the init method.
					* Arguments to create() will be passed to init().
					*
					* @return {Object} The new object.
					*
					* @static
					*
					* @example
					*
					*     var instance = MyType.create();
					*/
					create: function() {
						var instance = this.extend();
						instance.init.apply(instance, arguments);
						return instance;
					},
					/**
					* Initializes a newly created object.
					* Override this method to add some logic when your objects are created.
					*
					* @example
					*
					*     var MyType = CryptoJS.lib.Base.extend({
					*         init: function () {
					*             // ...
					*         }
					*     });
					*/
					init: function() {},
					/**
					* Copies properties into this object.
					*
					* @param {Object} properties The properties to mix in.
					*
					* @example
					*
					*     MyType.mixIn({
					*         field: 'value'
					*     });
					*/
					mixIn: function(properties) {
						for (var propertyName in properties) if (properties.hasOwnProperty(propertyName)) this[propertyName] = properties[propertyName];
						if (properties.hasOwnProperty("toString")) this.toString = properties.toString;
					},
					/**
					* Creates a copy of this object.
					*
					* @return {Object} The clone.
					*
					* @example
					*
					*     var clone = instance.clone();
					*/
					clone: function() {
						return this.init.prototype.extend(this);
					}
				};
			}();
			/**
			* An array of 32-bit words.
			*
			* @property {Array} words The array of 32-bit words.
			* @property {number} sigBytes The number of significant bytes in this word array.
			*/
			var WordArray = C_lib.WordArray = Base.extend({
				/**
				* Initializes a newly created word array.
				*
				* @param {Array} words (Optional) An array of 32-bit words.
				* @param {number} sigBytes (Optional) The number of significant bytes in the words.
				*
				* @example
				*
				*     var wordArray = CryptoJS.lib.WordArray.create();
				*     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607]);
				*     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607], 6);
				*/
				init: function(words, sigBytes) {
					words = this.words = words || [];
					if (sigBytes != undefined) this.sigBytes = sigBytes;
					else this.sigBytes = words.length * 4;
				},
				/**
				* Converts this word array to a string.
				*
				* @param {Encoder} encoder (Optional) The encoding strategy to use. Default: CryptoJS.enc.Hex
				*
				* @return {string} The stringified word array.
				*
				* @example
				*
				*     var string = wordArray + '';
				*     var string = wordArray.toString();
				*     var string = wordArray.toString(CryptoJS.enc.Utf8);
				*/
				toString: function(encoder) {
					return (encoder || Hex).stringify(this);
				},
				/**
				* Concatenates a word array to this word array.
				*
				* @param {WordArray} wordArray The word array to append.
				*
				* @return {WordArray} This word array.
				*
				* @example
				*
				*     wordArray1.concat(wordArray2);
				*/
				concat: function(wordArray) {
					var thisWords = this.words;
					var thatWords = wordArray.words;
					var thisSigBytes = this.sigBytes;
					var thatSigBytes = wordArray.sigBytes;
					this.clamp();
					if (thisSigBytes % 4) for (var i = 0; i < thatSigBytes; i++) {
						var thatByte = thatWords[i >>> 2] >>> 24 - i % 4 * 8 & 255;
						thisWords[thisSigBytes + i >>> 2] |= thatByte << 24 - (thisSigBytes + i) % 4 * 8;
					}
					else for (var j = 0; j < thatSigBytes; j += 4) thisWords[thisSigBytes + j >>> 2] = thatWords[j >>> 2];
					this.sigBytes += thatSigBytes;
					return this;
				},
				/**
				* Removes insignificant bits.
				*
				* @example
				*
				*     wordArray.clamp();
				*/
				clamp: function() {
					var words = this.words;
					var sigBytes = this.sigBytes;
					words[sigBytes >>> 2] &= 4294967295 << 32 - sigBytes % 4 * 8;
					words.length = Math.ceil(sigBytes / 4);
				},
				/**
				* Creates a copy of this word array.
				*
				* @return {WordArray} The clone.
				*
				* @example
				*
				*     var clone = wordArray.clone();
				*/
				clone: function() {
					var clone = Base.clone.call(this);
					clone.words = this.words.slice(0);
					return clone;
				},
				/**
				* Creates a word array filled with random bytes.
				*
				* @param {number} nBytes The number of random bytes to generate.
				*
				* @return {WordArray} The random word array.
				*
				* @static
				*
				* @example
				*
				*     var wordArray = CryptoJS.lib.WordArray.random(16);
				*/
				random: function(nBytes) {
					var words = [];
					for (var i = 0; i < nBytes; i += 4) words.push(cryptoSecureRandomInt());
					return new WordArray.init(words, nBytes);
				}
			});
			/**
			* Encoder namespace.
			*/
			var C_enc = C.enc = {};
			/**
			* Hex encoding strategy.
			*/
			var Hex = C_enc.Hex = {
				/**
				* Converts a word array to a hex string.
				*
				* @param {WordArray} wordArray The word array.
				*
				* @return {string} The hex string.
				*
				* @static
				*
				* @example
				*
				*     var hexString = CryptoJS.enc.Hex.stringify(wordArray);
				*/
				stringify: function(wordArray) {
					var words = wordArray.words;
					var sigBytes = wordArray.sigBytes;
					var hexChars = [];
					for (var i = 0; i < sigBytes; i++) {
						var bite = words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
						hexChars.push((bite >>> 4).toString(16));
						hexChars.push((bite & 15).toString(16));
					}
					return hexChars.join("");
				},
				/**
				* Converts a hex string to a word array.
				*
				* @param {string} hexStr The hex string.
				*
				* @return {WordArray} The word array.
				*
				* @static
				*
				* @example
				*
				*     var wordArray = CryptoJS.enc.Hex.parse(hexString);
				*/
				parse: function(hexStr) {
					var hexStrLength = hexStr.length;
					var words = [];
					for (var i = 0; i < hexStrLength; i += 2) words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << 24 - i % 8 * 4;
					return new WordArray.init(words, hexStrLength / 2);
				}
			};
			/**
			* Latin1 encoding strategy.
			*/
			var Latin1 = C_enc.Latin1 = {
				/**
				* Converts a word array to a Latin1 string.
				*
				* @param {WordArray} wordArray The word array.
				*
				* @return {string} The Latin1 string.
				*
				* @static
				*
				* @example
				*
				*     var latin1String = CryptoJS.enc.Latin1.stringify(wordArray);
				*/
				stringify: function(wordArray) {
					var words = wordArray.words;
					var sigBytes = wordArray.sigBytes;
					var latin1Chars = [];
					for (var i = 0; i < sigBytes; i++) {
						var bite = words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
						latin1Chars.push(String.fromCharCode(bite));
					}
					return latin1Chars.join("");
				},
				/**
				* Converts a Latin1 string to a word array.
				*
				* @param {string} latin1Str The Latin1 string.
				*
				* @return {WordArray} The word array.
				*
				* @static
				*
				* @example
				*
				*     var wordArray = CryptoJS.enc.Latin1.parse(latin1String);
				*/
				parse: function(latin1Str) {
					var latin1StrLength = latin1Str.length;
					var words = [];
					for (var i = 0; i < latin1StrLength; i++) words[i >>> 2] |= (latin1Str.charCodeAt(i) & 255) << 24 - i % 4 * 8;
					return new WordArray.init(words, latin1StrLength);
				}
			};
			/**
			* UTF-8 encoding strategy.
			*/
			var Utf8 = C_enc.Utf8 = {
				/**
				* Converts a word array to a UTF-8 string.
				*
				* @param {WordArray} wordArray The word array.
				*
				* @return {string} The UTF-8 string.
				*
				* @static
				*
				* @example
				*
				*     var utf8String = CryptoJS.enc.Utf8.stringify(wordArray);
				*/
				stringify: function(wordArray) {
					try {
						return decodeURIComponent(escape(Latin1.stringify(wordArray)));
					} catch (e) {
						throw new Error("Malformed UTF-8 data");
					}
				},
				/**
				* Converts a UTF-8 string to a word array.
				*
				* @param {string} utf8Str The UTF-8 string.
				*
				* @return {WordArray} The word array.
				*
				* @static
				*
				* @example
				*
				*     var wordArray = CryptoJS.enc.Utf8.parse(utf8String);
				*/
				parse: function(utf8Str) {
					return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
				}
			};
			/**
			* Abstract buffered block algorithm template.
			*
			* The property blockSize must be implemented in a concrete subtype.
			*
			* @property {number} _minBufferSize The number of blocks that should be kept unprocessed in the buffer. Default: 0
			*/
			var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm = Base.extend({
				/**
				* Resets this block algorithm's data buffer to its initial state.
				*
				* @example
				*
				*     bufferedBlockAlgorithm.reset();
				*/
				reset: function() {
					this._data = new WordArray.init();
					this._nDataBytes = 0;
				},
				/**
				* Adds new data to this block algorithm's buffer.
				*
				* @param {WordArray|string} data The data to append. Strings are converted to a WordArray using UTF-8.
				*
				* @example
				*
				*     bufferedBlockAlgorithm._append('data');
				*     bufferedBlockAlgorithm._append(wordArray);
				*/
				_append: function(data) {
					if (typeof data == "string") data = Utf8.parse(data);
					this._data.concat(data);
					this._nDataBytes += data.sigBytes;
				},
				/**
				* Processes available data blocks.
				*
				* This method invokes _doProcessBlock(offset), which must be implemented by a concrete subtype.
				*
				* @param {boolean} doFlush Whether all blocks and partial blocks should be processed.
				*
				* @return {WordArray} The processed data.
				*
				* @example
				*
				*     var processedData = bufferedBlockAlgorithm._process();
				*     var processedData = bufferedBlockAlgorithm._process(!!'flush');
				*/
				_process: function(doFlush) {
					var processedWords;
					var data = this._data;
					var dataWords = data.words;
					var dataSigBytes = data.sigBytes;
					var blockSize = this.blockSize;
					var nBlocksReady = dataSigBytes / (blockSize * 4);
					if (doFlush) nBlocksReady = Math.ceil(nBlocksReady);
					else nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
					var nWordsReady = nBlocksReady * blockSize;
					var nBytesReady = Math.min(nWordsReady * 4, dataSigBytes);
					if (nWordsReady) {
						for (var offset = 0; offset < nWordsReady; offset += blockSize) this._doProcessBlock(dataWords, offset);
						processedWords = dataWords.splice(0, nWordsReady);
						data.sigBytes -= nBytesReady;
					}
					return new WordArray.init(processedWords, nBytesReady);
				},
				/**
				* Creates a copy of this object.
				*
				* @return {Object} The clone.
				*
				* @example
				*
				*     var clone = bufferedBlockAlgorithm.clone();
				*/
				clone: function() {
					var clone = Base.clone.call(this);
					clone._data = this._data.clone();
					return clone;
				},
				_minBufferSize: 0
			});
			C_lib.Hasher = BufferedBlockAlgorithm.extend({
				/**
				* Configuration options.
				*/
				cfg: Base.extend(),
				/**
				* Initializes a newly created hasher.
				*
				* @param {Object} cfg (Optional) The configuration options to use for this hash computation.
				*
				* @example
				*
				*     var hasher = CryptoJS.algo.SHA256.create();
				*/
				init: function(cfg) {
					this.cfg = this.cfg.extend(cfg);
					this.reset();
				},
				/**
				* Resets this hasher to its initial state.
				*
				* @example
				*
				*     hasher.reset();
				*/
				reset: function() {
					BufferedBlockAlgorithm.reset.call(this);
					this._doReset();
				},
				/**
				* Updates this hasher with a message.
				*
				* @param {WordArray|string} messageUpdate The message to append.
				*
				* @return {Hasher} This hasher.
				*
				* @example
				*
				*     hasher.update('message');
				*     hasher.update(wordArray);
				*/
				update: function(messageUpdate) {
					this._append(messageUpdate);
					this._process();
					return this;
				},
				/**
				* Finalizes the hash computation.
				* Note that the finalize operation is effectively a destructive, read-once operation.
				*
				* @param {WordArray|string} messageUpdate (Optional) A final message update.
				*
				* @return {WordArray} The hash.
				*
				* @example
				*
				*     var hash = hasher.finalize();
				*     var hash = hasher.finalize('message');
				*     var hash = hasher.finalize(wordArray);
				*/
				finalize: function(messageUpdate) {
					if (messageUpdate) this._append(messageUpdate);
					return this._doFinalize();
				},
				blockSize: 16,
				/**
				* Creates a shortcut function to a hasher's object interface.
				*
				* @param {Hasher} hasher The hasher to create a helper for.
				*
				* @return {Function} The shortcut function.
				*
				* @static
				*
				* @example
				*
				*     var SHA256 = CryptoJS.lib.Hasher._createHelper(CryptoJS.algo.SHA256);
				*/
				_createHelper: function(hasher) {
					return function(message, cfg) {
						return new hasher.init(cfg).finalize(message);
					};
				},
				/**
				* Creates a shortcut function to the HMAC's object interface.
				*
				* @param {Hasher} hasher The hasher to use in this HMAC helper.
				*
				* @return {Function} The shortcut function.
				*
				* @static
				*
				* @example
				*
				*     var HmacSHA256 = CryptoJS.lib.Hasher._createHmacHelper(CryptoJS.algo.SHA256);
				*/
				_createHmacHelper: function(hasher) {
					return function(message, key) {
						return new C_algo.HMAC.init(hasher, key).finalize(message);
					};
				}
			});
			/**
			* Algorithm namespace.
			*/
			var C_algo = C.algo = {};
			return C;
		}(Math);
		(function(undefined) {
			var C = CryptoJS;
			var C_lib = C.lib;
			var Base = C_lib.Base;
			var X32WordArray = C_lib.WordArray;
			/**
			* x64 namespace.
			*/
			var C_x64 = C.x64 = {};
			C_x64.Word = Base.extend({ 
			/**
			* Initializes a newly created 64-bit word.
			*
			* @param {number} high The high 32 bits.
			* @param {number} low The low 32 bits.
			*
			* @example
			*
			*     var x64Word = CryptoJS.x64.Word.create(0x00010203, 0x04050607);
			*/
init: function(high, low) {
				this.high = high;
				this.low = low;
			} });
			C_x64.WordArray = Base.extend({
				/**
				* Initializes a newly created word array.
				*
				* @param {Array} words (Optional) An array of CryptoJS.x64.Word objects.
				* @param {number} sigBytes (Optional) The number of significant bytes in the words.
				*
				* @example
				*
				*     var wordArray = CryptoJS.x64.WordArray.create();
				*
				*     var wordArray = CryptoJS.x64.WordArray.create([
				*         CryptoJS.x64.Word.create(0x00010203, 0x04050607),
				*         CryptoJS.x64.Word.create(0x18191a1b, 0x1c1d1e1f)
				*     ]);
				*
				*     var wordArray = CryptoJS.x64.WordArray.create([
				*         CryptoJS.x64.Word.create(0x00010203, 0x04050607),
				*         CryptoJS.x64.Word.create(0x18191a1b, 0x1c1d1e1f)
				*     ], 10);
				*/
				init: function(words, sigBytes) {
					words = this.words = words || [];
					if (sigBytes != undefined) this.sigBytes = sigBytes;
					else this.sigBytes = words.length * 8;
				},
				/**
				* Converts this 64-bit word array to a 32-bit word array.
				*
				* @return {CryptoJS.lib.WordArray} This word array's data as a 32-bit word array.
				*
				* @example
				*
				*     var x32WordArray = x64WordArray.toX32();
				*/
				toX32: function() {
					var x64Words = this.words;
					var x64WordsLength = x64Words.length;
					var x32Words = [];
					for (var i = 0; i < x64WordsLength; i++) {
						var x64Word = x64Words[i];
						x32Words.push(x64Word.high);
						x32Words.push(x64Word.low);
					}
					return X32WordArray.create(x32Words, this.sigBytes);
				},
				/**
				* Creates a copy of this word array.
				*
				* @return {X64WordArray} The clone.
				*
				* @example
				*
				*     var clone = x64WordArray.clone();
				*/
				clone: function() {
					var clone = Base.clone.call(this);
					var words = clone.words = this.words.slice(0);
					var wordsLength = words.length;
					for (var i = 0; i < wordsLength; i++) words[i] = words[i].clone();
					return clone;
				}
			});
		})();
		(function() {
			if (typeof ArrayBuffer != "function") return;
			var WordArray = CryptoJS.lib.WordArray;
			var superInit = WordArray.init;
			var subInit = WordArray.init = function(typedArray) {
				if (typedArray instanceof ArrayBuffer) typedArray = new Uint8Array(typedArray);
				if (typedArray instanceof Int8Array || typeof Uint8ClampedArray !== "undefined" && typedArray instanceof Uint8ClampedArray || typedArray instanceof Int16Array || typedArray instanceof Uint16Array || typedArray instanceof Int32Array || typedArray instanceof Uint32Array || typedArray instanceof Float32Array || typedArray instanceof Float64Array) typedArray = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
				if (typedArray instanceof Uint8Array) {
					var typedArrayByteLength = typedArray.byteLength;
					var words = [];
					for (var i = 0; i < typedArrayByteLength; i++) words[i >>> 2] |= typedArray[i] << 24 - i % 4 * 8;
					superInit.call(this, words, typedArrayByteLength);
				} else superInit.apply(this, arguments);
			};
			subInit.prototype = WordArray;
		})();
		(function() {
			var C = CryptoJS;
			var WordArray = C.lib.WordArray;
			var C_enc = C.enc;
			C_enc.Utf16 = C_enc.Utf16BE = {
				/**
				* Converts a word array to a UTF-16 BE string.
				*
				* @param {WordArray} wordArray The word array.
				*
				* @return {string} The UTF-16 BE string.
				*
				* @static
				*
				* @example
				*
				*     var utf16String = CryptoJS.enc.Utf16.stringify(wordArray);
				*/
				stringify: function(wordArray) {
					var words = wordArray.words;
					var sigBytes = wordArray.sigBytes;
					var utf16Chars = [];
					for (var i = 0; i < sigBytes; i += 2) {
						var codePoint = words[i >>> 2] >>> 16 - i % 4 * 8 & 65535;
						utf16Chars.push(String.fromCharCode(codePoint));
					}
					return utf16Chars.join("");
				},
				/**
				* Converts a UTF-16 BE string to a word array.
				*
				* @param {string} utf16Str The UTF-16 BE string.
				*
				* @return {WordArray} The word array.
				*
				* @static
				*
				* @example
				*
				*     var wordArray = CryptoJS.enc.Utf16.parse(utf16String);
				*/
				parse: function(utf16Str) {
					var utf16StrLength = utf16Str.length;
					var words = [];
					for (var i = 0; i < utf16StrLength; i++) words[i >>> 1] |= utf16Str.charCodeAt(i) << 16 - i % 2 * 16;
					return WordArray.create(words, utf16StrLength * 2);
				}
			};
			/**
			* UTF-16 LE encoding strategy.
			*/
			C_enc.Utf16LE = {
				/**
				* Converts a word array to a UTF-16 LE string.
				*
				* @param {WordArray} wordArray The word array.
				*
				* @return {string} The UTF-16 LE string.
				*
				* @static
				*
				* @example
				*
				*     var utf16Str = CryptoJS.enc.Utf16LE.stringify(wordArray);
				*/
				stringify: function(wordArray) {
					var words = wordArray.words;
					var sigBytes = wordArray.sigBytes;
					var utf16Chars = [];
					for (var i = 0; i < sigBytes; i += 2) {
						var codePoint = swapEndian(words[i >>> 2] >>> 16 - i % 4 * 8 & 65535);
						utf16Chars.push(String.fromCharCode(codePoint));
					}
					return utf16Chars.join("");
				},
				/**
				* Converts a UTF-16 LE string to a word array.
				*
				* @param {string} utf16Str The UTF-16 LE string.
				*
				* @return {WordArray} The word array.
				*
				* @static
				*
				* @example
				*
				*     var wordArray = CryptoJS.enc.Utf16LE.parse(utf16Str);
				*/
				parse: function(utf16Str) {
					var utf16StrLength = utf16Str.length;
					var words = [];
					for (var i = 0; i < utf16StrLength; i++) words[i >>> 1] |= swapEndian(utf16Str.charCodeAt(i) << 16 - i % 2 * 16);
					return WordArray.create(words, utf16StrLength * 2);
				}
			};
			function swapEndian(word) {
				return word << 8 & 4278255360 | word >>> 8 & 16711935;
			}
		})();
		(function() {
			var C = CryptoJS;
			var WordArray = C.lib.WordArray;
			var C_enc = C.enc;
			C_enc.Base64 = {
				/**
				* Converts a word array to a Base64 string.
				*
				* @param {WordArray} wordArray The word array.
				*
				* @return {string} The Base64 string.
				*
				* @static
				*
				* @example
				*
				*     var base64String = CryptoJS.enc.Base64.stringify(wordArray);
				*/
				stringify: function(wordArray) {
					var words = wordArray.words;
					var sigBytes = wordArray.sigBytes;
					var map = this._map;
					wordArray.clamp();
					var base64Chars = [];
					for (var i = 0; i < sigBytes; i += 3) {
						var byte1 = words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
						var byte2 = words[i + 1 >>> 2] >>> 24 - (i + 1) % 4 * 8 & 255;
						var byte3 = words[i + 2 >>> 2] >>> 24 - (i + 2) % 4 * 8 & 255;
						var triplet = byte1 << 16 | byte2 << 8 | byte3;
						for (var j = 0; j < 4 && i + j * .75 < sigBytes; j++) base64Chars.push(map.charAt(triplet >>> 6 * (3 - j) & 63));
					}
					var paddingChar = map.charAt(64);
					if (paddingChar) while (base64Chars.length % 4) base64Chars.push(paddingChar);
					return base64Chars.join("");
				},
				/**
				* Converts a Base64 string to a word array.
				*
				* @param {string} base64Str The Base64 string.
				*
				* @return {WordArray} The word array.
				*
				* @static
				*
				* @example
				*
				*     var wordArray = CryptoJS.enc.Base64.parse(base64String);
				*/
				parse: function(base64Str) {
					var base64StrLength = base64Str.length;
					var map = this._map;
					var reverseMap = this._reverseMap;
					if (!reverseMap) {
						reverseMap = this._reverseMap = [];
						for (var j = 0; j < map.length; j++) reverseMap[map.charCodeAt(j)] = j;
					}
					var paddingChar = map.charAt(64);
					if (paddingChar) {
						var paddingIndex = base64Str.indexOf(paddingChar);
						if (paddingIndex !== -1) base64StrLength = paddingIndex;
					}
					return parseLoop(base64Str, base64StrLength, reverseMap);
				},
				_map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
			};
			function parseLoop(base64Str, base64StrLength, reverseMap) {
				var words = [];
				var nBytes = 0;
				for (var i = 0; i < base64StrLength; i++) if (i % 4) {
					var bitsCombined = reverseMap[base64Str.charCodeAt(i - 1)] << i % 4 * 2 | reverseMap[base64Str.charCodeAt(i)] >>> 6 - i % 4 * 2;
					words[nBytes >>> 2] |= bitsCombined << 24 - nBytes % 4 * 8;
					nBytes++;
				}
				return WordArray.create(words, nBytes);
			}
		})();
		(function() {
			var C = CryptoJS;
			var WordArray = C.lib.WordArray;
			var C_enc = C.enc;
			C_enc.Base64url = {
				/**
				* Converts a word array to a Base64url string.
				*
				* @param {WordArray} wordArray The word array.
				*
				* @param {boolean} urlSafe Whether to use url safe
				*
				* @return {string} The Base64url string.
				*
				* @static
				*
				* @example
				*
				*     var base64String = CryptoJS.enc.Base64url.stringify(wordArray);
				*/
				stringify: function(wordArray, urlSafe) {
					if (urlSafe === void 0) urlSafe = true;
					var words = wordArray.words;
					var sigBytes = wordArray.sigBytes;
					var map = urlSafe ? this._safe_map : this._map;
					wordArray.clamp();
					var base64Chars = [];
					for (var i = 0; i < sigBytes; i += 3) {
						var byte1 = words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
						var byte2 = words[i + 1 >>> 2] >>> 24 - (i + 1) % 4 * 8 & 255;
						var byte3 = words[i + 2 >>> 2] >>> 24 - (i + 2) % 4 * 8 & 255;
						var triplet = byte1 << 16 | byte2 << 8 | byte3;
						for (var j = 0; j < 4 && i + j * .75 < sigBytes; j++) base64Chars.push(map.charAt(triplet >>> 6 * (3 - j) & 63));
					}
					var paddingChar = map.charAt(64);
					if (paddingChar) while (base64Chars.length % 4) base64Chars.push(paddingChar);
					return base64Chars.join("");
				},
				/**
				* Converts a Base64url string to a word array.
				*
				* @param {string} base64Str The Base64url string.
				*
				* @param {boolean} urlSafe Whether to use url safe
				*
				* @return {WordArray} The word array.
				*
				* @static
				*
				* @example
				*
				*     var wordArray = CryptoJS.enc.Base64url.parse(base64String);
				*/
				parse: function(base64Str, urlSafe) {
					if (urlSafe === void 0) urlSafe = true;
					var base64StrLength = base64Str.length;
					var map = urlSafe ? this._safe_map : this._map;
					var reverseMap = this._reverseMap;
					if (!reverseMap) {
						reverseMap = this._reverseMap = [];
						for (var j = 0; j < map.length; j++) reverseMap[map.charCodeAt(j)] = j;
					}
					var paddingChar = map.charAt(64);
					if (paddingChar) {
						var paddingIndex = base64Str.indexOf(paddingChar);
						if (paddingIndex !== -1) base64StrLength = paddingIndex;
					}
					return parseLoop(base64Str, base64StrLength, reverseMap);
				},
				_map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
				_safe_map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
			};
			function parseLoop(base64Str, base64StrLength, reverseMap) {
				var words = [];
				var nBytes = 0;
				for (var i = 0; i < base64StrLength; i++) if (i % 4) {
					var bitsCombined = reverseMap[base64Str.charCodeAt(i - 1)] << i % 4 * 2 | reverseMap[base64Str.charCodeAt(i)] >>> 6 - i % 4 * 2;
					words[nBytes >>> 2] |= bitsCombined << 24 - nBytes % 4 * 8;
					nBytes++;
				}
				return WordArray.create(words, nBytes);
			}
		})();
		(function(Math) {
			var C = CryptoJS;
			var C_lib = C.lib;
			var WordArray = C_lib.WordArray;
			var Hasher = C_lib.Hasher;
			var C_algo = C.algo;
			var T = [];
			(function() {
				for (var i = 0; i < 64; i++) T[i] = Math.abs(Math.sin(i + 1)) * 4294967296 | 0;
			})();
			/**
			* MD5 hash algorithm.
			*/
			var MD5 = C_algo.MD5 = Hasher.extend({
				_doReset: function() {
					this._hash = new WordArray.init([
						1732584193,
						4023233417,
						2562383102,
						271733878
					]);
				},
				_doProcessBlock: function(M, offset) {
					for (var i = 0; i < 16; i++) {
						var offset_i = offset + i;
						var M_offset_i = M[offset_i];
						M[offset_i] = (M_offset_i << 8 | M_offset_i >>> 24) & 16711935 | (M_offset_i << 24 | M_offset_i >>> 8) & 4278255360;
					}
					var H = this._hash.words;
					var M_offset_0 = M[offset + 0];
					var M_offset_1 = M[offset + 1];
					var M_offset_2 = M[offset + 2];
					var M_offset_3 = M[offset + 3];
					var M_offset_4 = M[offset + 4];
					var M_offset_5 = M[offset + 5];
					var M_offset_6 = M[offset + 6];
					var M_offset_7 = M[offset + 7];
					var M_offset_8 = M[offset + 8];
					var M_offset_9 = M[offset + 9];
					var M_offset_10 = M[offset + 10];
					var M_offset_11 = M[offset + 11];
					var M_offset_12 = M[offset + 12];
					var M_offset_13 = M[offset + 13];
					var M_offset_14 = M[offset + 14];
					var M_offset_15 = M[offset + 15];
					var a = H[0];
					var b = H[1];
					var c = H[2];
					var d = H[3];
					a = FF(a, b, c, d, M_offset_0, 7, T[0]);
					d = FF(d, a, b, c, M_offset_1, 12, T[1]);
					c = FF(c, d, a, b, M_offset_2, 17, T[2]);
					b = FF(b, c, d, a, M_offset_3, 22, T[3]);
					a = FF(a, b, c, d, M_offset_4, 7, T[4]);
					d = FF(d, a, b, c, M_offset_5, 12, T[5]);
					c = FF(c, d, a, b, M_offset_6, 17, T[6]);
					b = FF(b, c, d, a, M_offset_7, 22, T[7]);
					a = FF(a, b, c, d, M_offset_8, 7, T[8]);
					d = FF(d, a, b, c, M_offset_9, 12, T[9]);
					c = FF(c, d, a, b, M_offset_10, 17, T[10]);
					b = FF(b, c, d, a, M_offset_11, 22, T[11]);
					a = FF(a, b, c, d, M_offset_12, 7, T[12]);
					d = FF(d, a, b, c, M_offset_13, 12, T[13]);
					c = FF(c, d, a, b, M_offset_14, 17, T[14]);
					b = FF(b, c, d, a, M_offset_15, 22, T[15]);
					a = GG(a, b, c, d, M_offset_1, 5, T[16]);
					d = GG(d, a, b, c, M_offset_6, 9, T[17]);
					c = GG(c, d, a, b, M_offset_11, 14, T[18]);
					b = GG(b, c, d, a, M_offset_0, 20, T[19]);
					a = GG(a, b, c, d, M_offset_5, 5, T[20]);
					d = GG(d, a, b, c, M_offset_10, 9, T[21]);
					c = GG(c, d, a, b, M_offset_15, 14, T[22]);
					b = GG(b, c, d, a, M_offset_4, 20, T[23]);
					a = GG(a, b, c, d, M_offset_9, 5, T[24]);
					d = GG(d, a, b, c, M_offset_14, 9, T[25]);
					c = GG(c, d, a, b, M_offset_3, 14, T[26]);
					b = GG(b, c, d, a, M_offset_8, 20, T[27]);
					a = GG(a, b, c, d, M_offset_13, 5, T[28]);
					d = GG(d, a, b, c, M_offset_2, 9, T[29]);
					c = GG(c, d, a, b, M_offset_7, 14, T[30]);
					b = GG(b, c, d, a, M_offset_12, 20, T[31]);
					a = HH(a, b, c, d, M_offset_5, 4, T[32]);
					d = HH(d, a, b, c, M_offset_8, 11, T[33]);
					c = HH(c, d, a, b, M_offset_11, 16, T[34]);
					b = HH(b, c, d, a, M_offset_14, 23, T[35]);
					a = HH(a, b, c, d, M_offset_1, 4, T[36]);
					d = HH(d, a, b, c, M_offset_4, 11, T[37]);
					c = HH(c, d, a, b, M_offset_7, 16, T[38]);
					b = HH(b, c, d, a, M_offset_10, 23, T[39]);
					a = HH(a, b, c, d, M_offset_13, 4, T[40]);
					d = HH(d, a, b, c, M_offset_0, 11, T[41]);
					c = HH(c, d, a, b, M_offset_3, 16, T[42]);
					b = HH(b, c, d, a, M_offset_6, 23, T[43]);
					a = HH(a, b, c, d, M_offset_9, 4, T[44]);
					d = HH(d, a, b, c, M_offset_12, 11, T[45]);
					c = HH(c, d, a, b, M_offset_15, 16, T[46]);
					b = HH(b, c, d, a, M_offset_2, 23, T[47]);
					a = II(a, b, c, d, M_offset_0, 6, T[48]);
					d = II(d, a, b, c, M_offset_7, 10, T[49]);
					c = II(c, d, a, b, M_offset_14, 15, T[50]);
					b = II(b, c, d, a, M_offset_5, 21, T[51]);
					a = II(a, b, c, d, M_offset_12, 6, T[52]);
					d = II(d, a, b, c, M_offset_3, 10, T[53]);
					c = II(c, d, a, b, M_offset_10, 15, T[54]);
					b = II(b, c, d, a, M_offset_1, 21, T[55]);
					a = II(a, b, c, d, M_offset_8, 6, T[56]);
					d = II(d, a, b, c, M_offset_15, 10, T[57]);
					c = II(c, d, a, b, M_offset_6, 15, T[58]);
					b = II(b, c, d, a, M_offset_13, 21, T[59]);
					a = II(a, b, c, d, M_offset_4, 6, T[60]);
					d = II(d, a, b, c, M_offset_11, 10, T[61]);
					c = II(c, d, a, b, M_offset_2, 15, T[62]);
					b = II(b, c, d, a, M_offset_9, 21, T[63]);
					H[0] = H[0] + a | 0;
					H[1] = H[1] + b | 0;
					H[2] = H[2] + c | 0;
					H[3] = H[3] + d | 0;
				},
				_doFinalize: function() {
					var data = this._data;
					var dataWords = data.words;
					var nBitsTotal = this._nDataBytes * 8;
					var nBitsLeft = data.sigBytes * 8;
					dataWords[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
					var nBitsTotalH = Math.floor(nBitsTotal / 4294967296);
					var nBitsTotalL = nBitsTotal;
					dataWords[(nBitsLeft + 64 >>> 9 << 4) + 15] = (nBitsTotalH << 8 | nBitsTotalH >>> 24) & 16711935 | (nBitsTotalH << 24 | nBitsTotalH >>> 8) & 4278255360;
					dataWords[(nBitsLeft + 64 >>> 9 << 4) + 14] = (nBitsTotalL << 8 | nBitsTotalL >>> 24) & 16711935 | (nBitsTotalL << 24 | nBitsTotalL >>> 8) & 4278255360;
					data.sigBytes = (dataWords.length + 1) * 4;
					this._process();
					var hash = this._hash;
					var H = hash.words;
					for (var i = 0; i < 4; i++) {
						var H_i = H[i];
						H[i] = (H_i << 8 | H_i >>> 24) & 16711935 | (H_i << 24 | H_i >>> 8) & 4278255360;
					}
					return hash;
				},
				clone: function() {
					var clone = Hasher.clone.call(this);
					clone._hash = this._hash.clone();
					return clone;
				}
			});
			function FF(a, b, c, d, x, s, t) {
				var n = a + (b & c | ~b & d) + x + t;
				return (n << s | n >>> 32 - s) + b;
			}
			function GG(a, b, c, d, x, s, t) {
				var n = a + (b & d | c & ~d) + x + t;
				return (n << s | n >>> 32 - s) + b;
			}
			function HH(a, b, c, d, x, s, t) {
				var n = a + (b ^ c ^ d) + x + t;
				return (n << s | n >>> 32 - s) + b;
			}
			function II(a, b, c, d, x, s, t) {
				var n = a + (c ^ (b | ~d)) + x + t;
				return (n << s | n >>> 32 - s) + b;
			}
			/**
			* Shortcut function to the hasher's object interface.
			*
			* @param {WordArray|string} message The message to hash.
			*
			* @return {WordArray} The hash.
			*
			* @static
			*
			* @example
			*
			*     var hash = CryptoJS.MD5('message');
			*     var hash = CryptoJS.MD5(wordArray);
			*/
			C.MD5 = Hasher._createHelper(MD5);
			/**
			* Shortcut function to the HMAC's object interface.
			*
			* @param {WordArray|string} message The message to hash.
			* @param {WordArray|string} key The secret key.
			*
			* @return {WordArray} The HMAC.
			*
			* @static
			*
			* @example
			*
			*     var hmac = CryptoJS.HmacMD5(message, key);
			*/
			C.HmacMD5 = Hasher._createHmacHelper(MD5);
		})(Math);
		(function() {
			var C = CryptoJS;
			var C_lib = C.lib;
			var WordArray = C_lib.WordArray;
			var Hasher = C_lib.Hasher;
			var C_algo = C.algo;
			var W = [];
			/**
			* SHA-1 hash algorithm.
			*/
			var SHA1 = C_algo.SHA1 = Hasher.extend({
				_doReset: function() {
					this._hash = new WordArray.init([
						1732584193,
						4023233417,
						2562383102,
						271733878,
						3285377520
					]);
				},
				_doProcessBlock: function(M, offset) {
					var H = this._hash.words;
					var a = H[0];
					var b = H[1];
					var c = H[2];
					var d = H[3];
					var e = H[4];
					for (var i = 0; i < 80; i++) {
						if (i < 16) W[i] = M[offset + i] | 0;
						else {
							var n = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
							W[i] = n << 1 | n >>> 31;
						}
						var t = (a << 5 | a >>> 27) + e + W[i];
						if (i < 20) t += (b & c | ~b & d) + 1518500249;
						else if (i < 40) t += (b ^ c ^ d) + 1859775393;
						else if (i < 60) t += (b & c | b & d | c & d) - 1894007588;
						else t += (b ^ c ^ d) - 899497514;
						e = d;
						d = c;
						c = b << 30 | b >>> 2;
						b = a;
						a = t;
					}
					H[0] = H[0] + a | 0;
					H[1] = H[1] + b | 0;
					H[2] = H[2] + c | 0;
					H[3] = H[3] + d | 0;
					H[4] = H[4] + e | 0;
				},
				_doFinalize: function() {
					var data = this._data;
					var dataWords = data.words;
					var nBitsTotal = this._nDataBytes * 8;
					var nBitsLeft = data.sigBytes * 8;
					dataWords[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
					dataWords[(nBitsLeft + 64 >>> 9 << 4) + 14] = Math.floor(nBitsTotal / 4294967296);
					dataWords[(nBitsLeft + 64 >>> 9 << 4) + 15] = nBitsTotal;
					data.sigBytes = dataWords.length * 4;
					this._process();
					return this._hash;
				},
				clone: function() {
					var clone = Hasher.clone.call(this);
					clone._hash = this._hash.clone();
					return clone;
				}
			});
			/**
			* Shortcut function to the hasher's object interface.
			*
			* @param {WordArray|string} message The message to hash.
			*
			* @return {WordArray} The hash.
			*
			* @static
			*
			* @example
			*
			*     var hash = CryptoJS.SHA1('message');
			*     var hash = CryptoJS.SHA1(wordArray);
			*/
			C.SHA1 = Hasher._createHelper(SHA1);
			/**
			* Shortcut function to the HMAC's object interface.
			*
			* @param {WordArray|string} message The message to hash.
			* @param {WordArray|string} key The secret key.
			*
			* @return {WordArray} The HMAC.
			*
			* @static
			*
			* @example
			*
			*     var hmac = CryptoJS.HmacSHA1(message, key);
			*/
			C.HmacSHA1 = Hasher._createHmacHelper(SHA1);
		})();
		(function(Math) {
			var C = CryptoJS;
			var C_lib = C.lib;
			var WordArray = C_lib.WordArray;
			var Hasher = C_lib.Hasher;
			var C_algo = C.algo;
			var H = [];
			var K = [];
			(function() {
				function isPrime(n) {
					var sqrtN = Math.sqrt(n);
					for (var factor = 2; factor <= sqrtN; factor++) if (!(n % factor)) return false;
					return true;
				}
				function getFractionalBits(n) {
					return (n - (n | 0)) * 4294967296 | 0;
				}
				var n = 2;
				var nPrime = 0;
				while (nPrime < 64) {
					if (isPrime(n)) {
						if (nPrime < 8) H[nPrime] = getFractionalBits(Math.pow(n, 1 / 2));
						K[nPrime] = getFractionalBits(Math.pow(n, 1 / 3));
						nPrime++;
					}
					n++;
				}
			})();
			var W = [];
			/**
			* SHA-256 hash algorithm.
			*/
			var SHA256 = C_algo.SHA256 = Hasher.extend({
				_doReset: function() {
					this._hash = new WordArray.init(H.slice(0));
				},
				_doProcessBlock: function(M, offset) {
					var H = this._hash.words;
					var a = H[0];
					var b = H[1];
					var c = H[2];
					var d = H[3];
					var e = H[4];
					var f = H[5];
					var g = H[6];
					var h = H[7];
					for (var i = 0; i < 64; i++) {
						if (i < 16) W[i] = M[offset + i] | 0;
						else {
							var gamma0x = W[i - 15];
							var gamma0 = (gamma0x << 25 | gamma0x >>> 7) ^ (gamma0x << 14 | gamma0x >>> 18) ^ gamma0x >>> 3;
							var gamma1x = W[i - 2];
							var gamma1 = (gamma1x << 15 | gamma1x >>> 17) ^ (gamma1x << 13 | gamma1x >>> 19) ^ gamma1x >>> 10;
							W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16];
						}
						var ch = e & f ^ ~e & g;
						var maj = a & b ^ a & c ^ b & c;
						var sigma0 = (a << 30 | a >>> 2) ^ (a << 19 | a >>> 13) ^ (a << 10 | a >>> 22);
						var sigma1 = (e << 26 | e >>> 6) ^ (e << 21 | e >>> 11) ^ (e << 7 | e >>> 25);
						var t1 = h + sigma1 + ch + K[i] + W[i];
						var t2 = sigma0 + maj;
						h = g;
						g = f;
						f = e;
						e = d + t1 | 0;
						d = c;
						c = b;
						b = a;
						a = t1 + t2 | 0;
					}
					H[0] = H[0] + a | 0;
					H[1] = H[1] + b | 0;
					H[2] = H[2] + c | 0;
					H[3] = H[3] + d | 0;
					H[4] = H[4] + e | 0;
					H[5] = H[5] + f | 0;
					H[6] = H[6] + g | 0;
					H[7] = H[7] + h | 0;
				},
				_doFinalize: function() {
					var data = this._data;
					var dataWords = data.words;
					var nBitsTotal = this._nDataBytes * 8;
					var nBitsLeft = data.sigBytes * 8;
					dataWords[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
					dataWords[(nBitsLeft + 64 >>> 9 << 4) + 14] = Math.floor(nBitsTotal / 4294967296);
					dataWords[(nBitsLeft + 64 >>> 9 << 4) + 15] = nBitsTotal;
					data.sigBytes = dataWords.length * 4;
					this._process();
					return this._hash;
				},
				clone: function() {
					var clone = Hasher.clone.call(this);
					clone._hash = this._hash.clone();
					return clone;
				}
			});
			/**
			* Shortcut function to the hasher's object interface.
			*
			* @param {WordArray|string} message The message to hash.
			*
			* @return {WordArray} The hash.
			*
			* @static
			*
			* @example
			*
			*     var hash = CryptoJS.SHA256('message');
			*     var hash = CryptoJS.SHA256(wordArray);
			*/
			C.SHA256 = Hasher._createHelper(SHA256);
			/**
			* Shortcut function to the HMAC's object interface.
			*
			* @param {WordArray|string} message The message to hash.
			* @param {WordArray|string} key The secret key.
			*
			* @return {WordArray} The HMAC.
			*
			* @static
			*
			* @example
			*
			*     var hmac = CryptoJS.HmacSHA256(message, key);
			*/
			C.HmacSHA256 = Hasher._createHmacHelper(SHA256);
		})(Math);
		(function() {
			var C = CryptoJS;
			var WordArray = C.lib.WordArray;
			var C_algo = C.algo;
			var SHA256 = C_algo.SHA256;
			/**
			* SHA-224 hash algorithm.
			*/
			var SHA224 = C_algo.SHA224 = SHA256.extend({
				_doReset: function() {
					this._hash = new WordArray.init([
						3238371032,
						914150663,
						812702999,
						4144912697,
						4290775857,
						1750603025,
						1694076839,
						3204075428
					]);
				},
				_doFinalize: function() {
					var hash = SHA256._doFinalize.call(this);
					hash.sigBytes -= 4;
					return hash;
				}
			});
			/**
			* Shortcut function to the hasher's object interface.
			*
			* @param {WordArray|string} message The message to hash.
			*
			* @return {WordArray} The hash.
			*
			* @static
			*
			* @example
			*
			*     var hash = CryptoJS.SHA224('message');
			*     var hash = CryptoJS.SHA224(wordArray);
			*/
			C.SHA224 = SHA256._createHelper(SHA224);
			/**
			* Shortcut function to the HMAC's object interface.
			*
			* @param {WordArray|string} message The message to hash.
			* @param {WordArray|string} key The secret key.
			*
			* @return {WordArray} The HMAC.
			*
			* @static
			*
			* @example
			*
			*     var hmac = CryptoJS.HmacSHA224(message, key);
			*/
			C.HmacSHA224 = SHA256._createHmacHelper(SHA224);
		})();
		(function() {
			var C = CryptoJS;
			var Hasher = C.lib.Hasher;
			var C_x64 = C.x64;
			var X64Word = C_x64.Word;
			var X64WordArray = C_x64.WordArray;
			var C_algo = C.algo;
			function X64Word_create() {
				return X64Word.create.apply(X64Word, arguments);
			}
			var K = [
				X64Word_create(1116352408, 3609767458),
				X64Word_create(1899447441, 602891725),
				X64Word_create(3049323471, 3964484399),
				X64Word_create(3921009573, 2173295548),
				X64Word_create(961987163, 4081628472),
				X64Word_create(1508970993, 3053834265),
				X64Word_create(2453635748, 2937671579),
				X64Word_create(2870763221, 3664609560),
				X64Word_create(3624381080, 2734883394),
				X64Word_create(310598401, 1164996542),
				X64Word_create(607225278, 1323610764),
				X64Word_create(1426881987, 3590304994),
				X64Word_create(1925078388, 4068182383),
				X64Word_create(2162078206, 991336113),
				X64Word_create(2614888103, 633803317),
				X64Word_create(3248222580, 3479774868),
				X64Word_create(3835390401, 2666613458),
				X64Word_create(4022224774, 944711139),
				X64Word_create(264347078, 2341262773),
				X64Word_create(604807628, 2007800933),
				X64Word_create(770255983, 1495990901),
				X64Word_create(1249150122, 1856431235),
				X64Word_create(1555081692, 3175218132),
				X64Word_create(1996064986, 2198950837),
				X64Word_create(2554220882, 3999719339),
				X64Word_create(2821834349, 766784016),
				X64Word_create(2952996808, 2566594879),
				X64Word_create(3210313671, 3203337956),
				X64Word_create(3336571891, 1034457026),
				X64Word_create(3584528711, 2466948901),
				X64Word_create(113926993, 3758326383),
				X64Word_create(338241895, 168717936),
				X64Word_create(666307205, 1188179964),
				X64Word_create(773529912, 1546045734),
				X64Word_create(1294757372, 1522805485),
				X64Word_create(1396182291, 2643833823),
				X64Word_create(1695183700, 2343527390),
				X64Word_create(1986661051, 1014477480),
				X64Word_create(2177026350, 1206759142),
				X64Word_create(2456956037, 344077627),
				X64Word_create(2730485921, 1290863460),
				X64Word_create(2820302411, 3158454273),
				X64Word_create(3259730800, 3505952657),
				X64Word_create(3345764771, 106217008),
				X64Word_create(3516065817, 3606008344),
				X64Word_create(3600352804, 1432725776),
				X64Word_create(4094571909, 1467031594),
				X64Word_create(275423344, 851169720),
				X64Word_create(430227734, 3100823752),
				X64Word_create(506948616, 1363258195),
				X64Word_create(659060556, 3750685593),
				X64Word_create(883997877, 3785050280),
				X64Word_create(958139571, 3318307427),
				X64Word_create(1322822218, 3812723403),
				X64Word_create(1537002063, 2003034995),
				X64Word_create(1747873779, 3602036899),
				X64Word_create(1955562222, 1575990012),
				X64Word_create(2024104815, 1125592928),
				X64Word_create(2227730452, 2716904306),
				X64Word_create(2361852424, 442776044),
				X64Word_create(2428436474, 593698344),
				X64Word_create(2756734187, 3733110249),
				X64Word_create(3204031479, 2999351573),
				X64Word_create(3329325298, 3815920427),
				X64Word_create(3391569614, 3928383900),
				X64Word_create(3515267271, 566280711),
				X64Word_create(3940187606, 3454069534),
				X64Word_create(4118630271, 4000239992),
				X64Word_create(116418474, 1914138554),
				X64Word_create(174292421, 2731055270),
				X64Word_create(289380356, 3203993006),
				X64Word_create(460393269, 320620315),
				X64Word_create(685471733, 587496836),
				X64Word_create(852142971, 1086792851),
				X64Word_create(1017036298, 365543100),
				X64Word_create(1126000580, 2618297676),
				X64Word_create(1288033470, 3409855158),
				X64Word_create(1501505948, 4234509866),
				X64Word_create(1607167915, 987167468),
				X64Word_create(1816402316, 1246189591)
			];
			var W = [];
			(function() {
				for (var i = 0; i < 80; i++) W[i] = X64Word_create();
			})();
			/**
			* SHA-512 hash algorithm.
			*/
			var SHA512 = C_algo.SHA512 = Hasher.extend({
				_doReset: function() {
					this._hash = new X64WordArray.init([
						new X64Word.init(1779033703, 4089235720),
						new X64Word.init(3144134277, 2227873595),
						new X64Word.init(1013904242, 4271175723),
						new X64Word.init(2773480762, 1595750129),
						new X64Word.init(1359893119, 2917565137),
						new X64Word.init(2600822924, 725511199),
						new X64Word.init(528734635, 4215389547),
						new X64Word.init(1541459225, 327033209)
					]);
				},
				_doProcessBlock: function(M, offset) {
					var H = this._hash.words;
					var H0 = H[0];
					var H1 = H[1];
					var H2 = H[2];
					var H3 = H[3];
					var H4 = H[4];
					var H5 = H[5];
					var H6 = H[6];
					var H7 = H[7];
					var H0h = H0.high;
					var H0l = H0.low;
					var H1h = H1.high;
					var H1l = H1.low;
					var H2h = H2.high;
					var H2l = H2.low;
					var H3h = H3.high;
					var H3l = H3.low;
					var H4h = H4.high;
					var H4l = H4.low;
					var H5h = H5.high;
					var H5l = H5.low;
					var H6h = H6.high;
					var H6l = H6.low;
					var H7h = H7.high;
					var H7l = H7.low;
					var ah = H0h;
					var al = H0l;
					var bh = H1h;
					var bl = H1l;
					var ch = H2h;
					var cl = H2l;
					var dh = H3h;
					var dl = H3l;
					var eh = H4h;
					var el = H4l;
					var fh = H5h;
					var fl = H5l;
					var gh = H6h;
					var gl = H6l;
					var hh = H7h;
					var hl = H7l;
					for (var i = 0; i < 80; i++) {
						var Wil;
						var Wih;
						var Wi = W[i];
						if (i < 16) {
							Wih = Wi.high = M[offset + i * 2] | 0;
							Wil = Wi.low = M[offset + i * 2 + 1] | 0;
						} else {
							var gamma0x = W[i - 15];
							var gamma0xh = gamma0x.high;
							var gamma0xl = gamma0x.low;
							var gamma0h = (gamma0xh >>> 1 | gamma0xl << 31) ^ (gamma0xh >>> 8 | gamma0xl << 24) ^ gamma0xh >>> 7;
							var gamma0l = (gamma0xl >>> 1 | gamma0xh << 31) ^ (gamma0xl >>> 8 | gamma0xh << 24) ^ (gamma0xl >>> 7 | gamma0xh << 25);
							var gamma1x = W[i - 2];
							var gamma1xh = gamma1x.high;
							var gamma1xl = gamma1x.low;
							var gamma1h = (gamma1xh >>> 19 | gamma1xl << 13) ^ (gamma1xh << 3 | gamma1xl >>> 29) ^ gamma1xh >>> 6;
							var gamma1l = (gamma1xl >>> 19 | gamma1xh << 13) ^ (gamma1xl << 3 | gamma1xh >>> 29) ^ (gamma1xl >>> 6 | gamma1xh << 26);
							var Wi7 = W[i - 7];
							var Wi7h = Wi7.high;
							var Wi7l = Wi7.low;
							var Wi16 = W[i - 16];
							var Wi16h = Wi16.high;
							var Wi16l = Wi16.low;
							Wil = gamma0l + Wi7l;
							Wih = gamma0h + Wi7h + (Wil >>> 0 < gamma0l >>> 0 ? 1 : 0);
							Wil = Wil + gamma1l;
							Wih = Wih + gamma1h + (Wil >>> 0 < gamma1l >>> 0 ? 1 : 0);
							Wil = Wil + Wi16l;
							Wih = Wih + Wi16h + (Wil >>> 0 < Wi16l >>> 0 ? 1 : 0);
							Wi.high = Wih;
							Wi.low = Wil;
						}
						var chh = eh & fh ^ ~eh & gh;
						var chl = el & fl ^ ~el & gl;
						var majh = ah & bh ^ ah & ch ^ bh & ch;
						var majl = al & bl ^ al & cl ^ bl & cl;
						var sigma0h = (ah >>> 28 | al << 4) ^ (ah << 30 | al >>> 2) ^ (ah << 25 | al >>> 7);
						var sigma0l = (al >>> 28 | ah << 4) ^ (al << 30 | ah >>> 2) ^ (al << 25 | ah >>> 7);
						var sigma1h = (eh >>> 14 | el << 18) ^ (eh >>> 18 | el << 14) ^ (eh << 23 | el >>> 9);
						var sigma1l = (el >>> 14 | eh << 18) ^ (el >>> 18 | eh << 14) ^ (el << 23 | eh >>> 9);
						var Ki = K[i];
						var Kih = Ki.high;
						var Kil = Ki.low;
						var t1l = hl + sigma1l;
						var t1h = hh + sigma1h + (t1l >>> 0 < hl >>> 0 ? 1 : 0);
						var t1l = t1l + chl;
						var t1h = t1h + chh + (t1l >>> 0 < chl >>> 0 ? 1 : 0);
						var t1l = t1l + Kil;
						var t1h = t1h + Kih + (t1l >>> 0 < Kil >>> 0 ? 1 : 0);
						var t1l = t1l + Wil;
						var t1h = t1h + Wih + (t1l >>> 0 < Wil >>> 0 ? 1 : 0);
						var t2l = sigma0l + majl;
						var t2h = sigma0h + majh + (t2l >>> 0 < sigma0l >>> 0 ? 1 : 0);
						hh = gh;
						hl = gl;
						gh = fh;
						gl = fl;
						fh = eh;
						fl = el;
						el = dl + t1l | 0;
						eh = dh + t1h + (el >>> 0 < dl >>> 0 ? 1 : 0) | 0;
						dh = ch;
						dl = cl;
						ch = bh;
						cl = bl;
						bh = ah;
						bl = al;
						al = t1l + t2l | 0;
						ah = t1h + t2h + (al >>> 0 < t1l >>> 0 ? 1 : 0) | 0;
					}
					H0l = H0.low = H0l + al;
					H0.high = H0h + ah + (H0l >>> 0 < al >>> 0 ? 1 : 0);
					H1l = H1.low = H1l + bl;
					H1.high = H1h + bh + (H1l >>> 0 < bl >>> 0 ? 1 : 0);
					H2l = H2.low = H2l + cl;
					H2.high = H2h + ch + (H2l >>> 0 < cl >>> 0 ? 1 : 0);
					H3l = H3.low = H3l + dl;
					H3.high = H3h + dh + (H3l >>> 0 < dl >>> 0 ? 1 : 0);
					H4l = H4.low = H4l + el;
					H4.high = H4h + eh + (H4l >>> 0 < el >>> 0 ? 1 : 0);
					H5l = H5.low = H5l + fl;
					H5.high = H5h + fh + (H5l >>> 0 < fl >>> 0 ? 1 : 0);
					H6l = H6.low = H6l + gl;
					H6.high = H6h + gh + (H6l >>> 0 < gl >>> 0 ? 1 : 0);
					H7l = H7.low = H7l + hl;
					H7.high = H7h + hh + (H7l >>> 0 < hl >>> 0 ? 1 : 0);
				},
				_doFinalize: function() {
					var data = this._data;
					var dataWords = data.words;
					var nBitsTotal = this._nDataBytes * 8;
					var nBitsLeft = data.sigBytes * 8;
					dataWords[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
					dataWords[(nBitsLeft + 128 >>> 10 << 5) + 30] = Math.floor(nBitsTotal / 4294967296);
					dataWords[(nBitsLeft + 128 >>> 10 << 5) + 31] = nBitsTotal;
					data.sigBytes = dataWords.length * 4;
					this._process();
					return this._hash.toX32();
				},
				clone: function() {
					var clone = Hasher.clone.call(this);
					clone._hash = this._hash.clone();
					return clone;
				},
				blockSize: 32
			});
			/**
			* Shortcut function to the hasher's object interface.
			*
			* @param {WordArray|string} message The message to hash.
			*
			* @return {WordArray} The hash.
			*
			* @static
			*
			* @example
			*
			*     var hash = CryptoJS.SHA512('message');
			*     var hash = CryptoJS.SHA512(wordArray);
			*/
			C.SHA512 = Hasher._createHelper(SHA512);
			/**
			* Shortcut function to the HMAC's object interface.
			*
			* @param {WordArray|string} message The message to hash.
			* @param {WordArray|string} key The secret key.
			*
			* @return {WordArray} The HMAC.
			*
			* @static
			*
			* @example
			*
			*     var hmac = CryptoJS.HmacSHA512(message, key);
			*/
			C.HmacSHA512 = Hasher._createHmacHelper(SHA512);
		})();
		(function() {
			var C = CryptoJS;
			var C_x64 = C.x64;
			var X64Word = C_x64.Word;
			var X64WordArray = C_x64.WordArray;
			var C_algo = C.algo;
			var SHA512 = C_algo.SHA512;
			/**
			* SHA-384 hash algorithm.
			*/
			var SHA384 = C_algo.SHA384 = SHA512.extend({
				_doReset: function() {
					this._hash = new X64WordArray.init([
						new X64Word.init(3418070365, 3238371032),
						new X64Word.init(1654270250, 914150663),
						new X64Word.init(2438529370, 812702999),
						new X64Word.init(355462360, 4144912697),
						new X64Word.init(1731405415, 4290775857),
						new X64Word.init(2394180231, 1750603025),
						new X64Word.init(3675008525, 1694076839),
						new X64Word.init(1203062813, 3204075428)
					]);
				},
				_doFinalize: function() {
					var hash = SHA512._doFinalize.call(this);
					hash.sigBytes -= 16;
					return hash;
				}
			});
			/**
			* Shortcut function to the hasher's object interface.
			*
			* @param {WordArray|string} message The message to hash.
			*
			* @return {WordArray} The hash.
			*
			* @static
			*
			* @example
			*
			*     var hash = CryptoJS.SHA384('message');
			*     var hash = CryptoJS.SHA384(wordArray);
			*/
			C.SHA384 = SHA512._createHelper(SHA384);
			/**
			* Shortcut function to the HMAC's object interface.
			*
			* @param {WordArray|string} message The message to hash.
			* @param {WordArray|string} key The secret key.
			*
			* @return {WordArray} The HMAC.
			*
			* @static
			*
			* @example
			*
			*     var hmac = CryptoJS.HmacSHA384(message, key);
			*/
			C.HmacSHA384 = SHA512._createHmacHelper(SHA384);
		})();
		(function(Math) {
			var C = CryptoJS;
			var C_lib = C.lib;
			var WordArray = C_lib.WordArray;
			var Hasher = C_lib.Hasher;
			var X64Word = C.x64.Word;
			var C_algo = C.algo;
			var RHO_OFFSETS = [];
			var PI_INDEXES = [];
			var ROUND_CONSTANTS = [];
			(function() {
				var x = 1, y = 0;
				for (var t = 0; t < 24; t++) {
					RHO_OFFSETS[x + 5 * y] = (t + 1) * (t + 2) / 2 % 64;
					var newX = y % 5;
					var newY = (2 * x + 3 * y) % 5;
					x = newX;
					y = newY;
				}
				for (var x = 0; x < 5; x++) for (var y = 0; y < 5; y++) PI_INDEXES[x + 5 * y] = y + (2 * x + 3 * y) % 5 * 5;
				var LFSR = 1;
				for (var i = 0; i < 24; i++) {
					var roundConstantMsw = 0;
					var roundConstantLsw = 0;
					for (var j = 0; j < 7; j++) {
						if (LFSR & 1) {
							var bitPosition = (1 << j) - 1;
							if (bitPosition < 32) roundConstantLsw ^= 1 << bitPosition;
							else roundConstantMsw ^= 1 << bitPosition - 32;
						}
						if (LFSR & 128) LFSR = LFSR << 1 ^ 113;
						else LFSR <<= 1;
					}
					ROUND_CONSTANTS[i] = X64Word.create(roundConstantMsw, roundConstantLsw);
				}
			})();
			var T = [];
			(function() {
				for (var i = 0; i < 25; i++) T[i] = X64Word.create();
			})();
			/**
			* SHA-3 hash algorithm.
			*/
			var SHA3 = C_algo.SHA3 = Hasher.extend({
				/**
				* Configuration options.
				*
				* @property {number} outputLength
				*   The desired number of bits in the output hash.
				*   Only values permitted are: 224, 256, 384, 512.
				*   Default: 512
				*/
				cfg: Hasher.cfg.extend({ outputLength: 512 }),
				_doReset: function() {
					var state = this._state = [];
					for (var i = 0; i < 25; i++) state[i] = new X64Word.init();
					this.blockSize = (1600 - 2 * this.cfg.outputLength) / 32;
				},
				_doProcessBlock: function(M, offset) {
					var state = this._state;
					var nBlockSizeLanes = this.blockSize / 2;
					for (var i = 0; i < nBlockSizeLanes; i++) {
						var M2i = M[offset + 2 * i];
						var M2i1 = M[offset + 2 * i + 1];
						M2i = (M2i << 8 | M2i >>> 24) & 16711935 | (M2i << 24 | M2i >>> 8) & 4278255360;
						M2i1 = (M2i1 << 8 | M2i1 >>> 24) & 16711935 | (M2i1 << 24 | M2i1 >>> 8) & 4278255360;
						var lane = state[i];
						lane.high ^= M2i1;
						lane.low ^= M2i;
					}
					for (var round = 0; round < 24; round++) {
						for (var x = 0; x < 5; x++) {
							var tMsw = 0, tLsw = 0;
							for (var y = 0; y < 5; y++) {
								var lane = state[x + 5 * y];
								tMsw ^= lane.high;
								tLsw ^= lane.low;
							}
							var Tx = T[x];
							Tx.high = tMsw;
							Tx.low = tLsw;
						}
						for (var x = 0; x < 5; x++) {
							var Tx4 = T[(x + 4) % 5];
							var Tx1 = T[(x + 1) % 5];
							var Tx1Msw = Tx1.high;
							var Tx1Lsw = Tx1.low;
							var tMsw = Tx4.high ^ (Tx1Msw << 1 | Tx1Lsw >>> 31);
							var tLsw = Tx4.low ^ (Tx1Lsw << 1 | Tx1Msw >>> 31);
							for (var y = 0; y < 5; y++) {
								var lane = state[x + 5 * y];
								lane.high ^= tMsw;
								lane.low ^= tLsw;
							}
						}
						for (var laneIndex = 1; laneIndex < 25; laneIndex++) {
							var tMsw;
							var tLsw;
							var lane = state[laneIndex];
							var laneMsw = lane.high;
							var laneLsw = lane.low;
							var rhoOffset = RHO_OFFSETS[laneIndex];
							if (rhoOffset < 32) {
								tMsw = laneMsw << rhoOffset | laneLsw >>> 32 - rhoOffset;
								tLsw = laneLsw << rhoOffset | laneMsw >>> 32 - rhoOffset;
							} else {
								tMsw = laneLsw << rhoOffset - 32 | laneMsw >>> 64 - rhoOffset;
								tLsw = laneMsw << rhoOffset - 32 | laneLsw >>> 64 - rhoOffset;
							}
							var TPiLane = T[PI_INDEXES[laneIndex]];
							TPiLane.high = tMsw;
							TPiLane.low = tLsw;
						}
						var T0 = T[0];
						var state0 = state[0];
						T0.high = state0.high;
						T0.low = state0.low;
						for (var x = 0; x < 5; x++) for (var y = 0; y < 5; y++) {
							var laneIndex = x + 5 * y;
							var lane = state[laneIndex];
							var TLane = T[laneIndex];
							var Tx1Lane = T[(x + 1) % 5 + 5 * y];
							var Tx2Lane = T[(x + 2) % 5 + 5 * y];
							lane.high = TLane.high ^ ~Tx1Lane.high & Tx2Lane.high;
							lane.low = TLane.low ^ ~Tx1Lane.low & Tx2Lane.low;
						}
						var lane = state[0];
						var roundConstant = ROUND_CONSTANTS[round];
						lane.high ^= roundConstant.high;
						lane.low ^= roundConstant.low;
					}
				},
				_doFinalize: function() {
					var data = this._data;
					var dataWords = data.words;
					this._nDataBytes * 8;
					var nBitsLeft = data.sigBytes * 8;
					var blockSizeBits = this.blockSize * 32;
					dataWords[nBitsLeft >>> 5] |= 1 << 24 - nBitsLeft % 32;
					dataWords[(Math.ceil((nBitsLeft + 1) / blockSizeBits) * blockSizeBits >>> 5) - 1] |= 128;
					data.sigBytes = dataWords.length * 4;
					this._process();
					var state = this._state;
					var outputLengthBytes = this.cfg.outputLength / 8;
					var outputLengthLanes = outputLengthBytes / 8;
					var hashWords = [];
					for (var i = 0; i < outputLengthLanes; i++) {
						var lane = state[i];
						var laneMsw = lane.high;
						var laneLsw = lane.low;
						laneMsw = (laneMsw << 8 | laneMsw >>> 24) & 16711935 | (laneMsw << 24 | laneMsw >>> 8) & 4278255360;
						laneLsw = (laneLsw << 8 | laneLsw >>> 24) & 16711935 | (laneLsw << 24 | laneLsw >>> 8) & 4278255360;
						hashWords.push(laneLsw);
						hashWords.push(laneMsw);
					}
					return new WordArray.init(hashWords, outputLengthBytes);
				},
				clone: function() {
					var clone = Hasher.clone.call(this);
					var state = clone._state = this._state.slice(0);
					for (var i = 0; i < 25; i++) state[i] = state[i].clone();
					return clone;
				}
			});
			/**
			* Shortcut function to the hasher's object interface.
			*
			* @param {WordArray|string} message The message to hash.
			*
			* @return {WordArray} The hash.
			*
			* @static
			*
			* @example
			*
			*     var hash = CryptoJS.SHA3('message');
			*     var hash = CryptoJS.SHA3(wordArray);
			*/
			C.SHA3 = Hasher._createHelper(SHA3);
			/**
			* Shortcut function to the HMAC's object interface.
			*
			* @param {WordArray|string} message The message to hash.
			* @param {WordArray|string} key The secret key.
			*
			* @return {WordArray} The HMAC.
			*
			* @static
			*
			* @example
			*
			*     var hmac = CryptoJS.HmacSHA3(message, key);
			*/
			C.HmacSHA3 = Hasher._createHmacHelper(SHA3);
		})(Math);
		/** @preserve
		(c) 2012 by Cédric Mesnil. All rights reserved.
		
		Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
		
		- Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
		- Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
		
		THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
		*/
		(function(Math) {
			var C = CryptoJS;
			var C_lib = C.lib;
			var WordArray = C_lib.WordArray;
			var Hasher = C_lib.Hasher;
			var C_algo = C.algo;
			var _zl = WordArray.create([
				0,
				1,
				2,
				3,
				4,
				5,
				6,
				7,
				8,
				9,
				10,
				11,
				12,
				13,
				14,
				15,
				7,
				4,
				13,
				1,
				10,
				6,
				15,
				3,
				12,
				0,
				9,
				5,
				2,
				14,
				11,
				8,
				3,
				10,
				14,
				4,
				9,
				15,
				8,
				1,
				2,
				7,
				0,
				6,
				13,
				11,
				5,
				12,
				1,
				9,
				11,
				10,
				0,
				8,
				12,
				4,
				13,
				3,
				7,
				15,
				14,
				5,
				6,
				2,
				4,
				0,
				5,
				9,
				7,
				12,
				2,
				10,
				14,
				1,
				3,
				8,
				11,
				6,
				15,
				13
			]);
			var _zr = WordArray.create([
				5,
				14,
				7,
				0,
				9,
				2,
				11,
				4,
				13,
				6,
				15,
				8,
				1,
				10,
				3,
				12,
				6,
				11,
				3,
				7,
				0,
				13,
				5,
				10,
				14,
				15,
				8,
				12,
				4,
				9,
				1,
				2,
				15,
				5,
				1,
				3,
				7,
				14,
				6,
				9,
				11,
				8,
				12,
				2,
				10,
				0,
				4,
				13,
				8,
				6,
				4,
				1,
				3,
				11,
				15,
				0,
				5,
				12,
				2,
				13,
				9,
				7,
				10,
				14,
				12,
				15,
				10,
				4,
				1,
				5,
				8,
				7,
				6,
				2,
				13,
				14,
				0,
				3,
				9,
				11
			]);
			var _sl = WordArray.create([
				11,
				14,
				15,
				12,
				5,
				8,
				7,
				9,
				11,
				13,
				14,
				15,
				6,
				7,
				9,
				8,
				7,
				6,
				8,
				13,
				11,
				9,
				7,
				15,
				7,
				12,
				15,
				9,
				11,
				7,
				13,
				12,
				11,
				13,
				6,
				7,
				14,
				9,
				13,
				15,
				14,
				8,
				13,
				6,
				5,
				12,
				7,
				5,
				11,
				12,
				14,
				15,
				14,
				15,
				9,
				8,
				9,
				14,
				5,
				6,
				8,
				6,
				5,
				12,
				9,
				15,
				5,
				11,
				6,
				8,
				13,
				12,
				5,
				12,
				13,
				14,
				11,
				8,
				5,
				6
			]);
			var _sr = WordArray.create([
				8,
				9,
				9,
				11,
				13,
				15,
				15,
				5,
				7,
				7,
				8,
				11,
				14,
				14,
				12,
				6,
				9,
				13,
				15,
				7,
				12,
				8,
				9,
				11,
				7,
				7,
				12,
				7,
				6,
				15,
				13,
				11,
				9,
				7,
				15,
				11,
				8,
				6,
				6,
				14,
				12,
				13,
				5,
				14,
				13,
				13,
				7,
				5,
				15,
				5,
				8,
				11,
				14,
				14,
				6,
				14,
				6,
				9,
				12,
				9,
				12,
				5,
				15,
				8,
				8,
				5,
				12,
				9,
				12,
				5,
				14,
				6,
				8,
				13,
				6,
				5,
				15,
				13,
				11,
				11
			]);
			var _hl = WordArray.create([
				0,
				1518500249,
				1859775393,
				2400959708,
				2840853838
			]);
			var _hr = WordArray.create([
				1352829926,
				1548603684,
				1836072691,
				2053994217,
				0
			]);
			/**
			* RIPEMD160 hash algorithm.
			*/
			var RIPEMD160 = C_algo.RIPEMD160 = Hasher.extend({
				_doReset: function() {
					this._hash = WordArray.create([
						1732584193,
						4023233417,
						2562383102,
						271733878,
						3285377520
					]);
				},
				_doProcessBlock: function(M, offset) {
					for (var i = 0; i < 16; i++) {
						var offset_i = offset + i;
						var M_offset_i = M[offset_i];
						M[offset_i] = (M_offset_i << 8 | M_offset_i >>> 24) & 16711935 | (M_offset_i << 24 | M_offset_i >>> 8) & 4278255360;
					}
					var H = this._hash.words;
					var hl = _hl.words;
					var hr = _hr.words;
					var zl = _zl.words;
					var zr = _zr.words;
					var sl = _sl.words;
					var sr = _sr.words;
					var al, bl, cl, dl, el;
					var ar = al = H[0], br = bl = H[1], cr = cl = H[2], dr = dl = H[3], er = el = H[4];
					var t;
					for (var i = 0; i < 80; i += 1) {
						t = al + M[offset + zl[i]] | 0;
						if (i < 16) t += f1(bl, cl, dl) + hl[0];
						else if (i < 32) t += f2(bl, cl, dl) + hl[1];
						else if (i < 48) t += f3(bl, cl, dl) + hl[2];
						else if (i < 64) t += f4(bl, cl, dl) + hl[3];
						else t += f5(bl, cl, dl) + hl[4];
						t = t | 0;
						t = rotl(t, sl[i]);
						t = t + el | 0;
						al = el;
						el = dl;
						dl = rotl(cl, 10);
						cl = bl;
						bl = t;
						t = ar + M[offset + zr[i]] | 0;
						if (i < 16) t += f5(br, cr, dr) + hr[0];
						else if (i < 32) t += f4(br, cr, dr) + hr[1];
						else if (i < 48) t += f3(br, cr, dr) + hr[2];
						else if (i < 64) t += f2(br, cr, dr) + hr[3];
						else t += f1(br, cr, dr) + hr[4];
						t = t | 0;
						t = rotl(t, sr[i]);
						t = t + er | 0;
						ar = er;
						er = dr;
						dr = rotl(cr, 10);
						cr = br;
						br = t;
					}
					t = H[1] + cl + dr | 0;
					H[1] = H[2] + dl + er | 0;
					H[2] = H[3] + el + ar | 0;
					H[3] = H[4] + al + br | 0;
					H[4] = H[0] + bl + cr | 0;
					H[0] = t;
				},
				_doFinalize: function() {
					var data = this._data;
					var dataWords = data.words;
					var nBitsTotal = this._nDataBytes * 8;
					var nBitsLeft = data.sigBytes * 8;
					dataWords[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
					dataWords[(nBitsLeft + 64 >>> 9 << 4) + 14] = (nBitsTotal << 8 | nBitsTotal >>> 24) & 16711935 | (nBitsTotal << 24 | nBitsTotal >>> 8) & 4278255360;
					data.sigBytes = (dataWords.length + 1) * 4;
					this._process();
					var hash = this._hash;
					var H = hash.words;
					for (var i = 0; i < 5; i++) {
						var H_i = H[i];
						H[i] = (H_i << 8 | H_i >>> 24) & 16711935 | (H_i << 24 | H_i >>> 8) & 4278255360;
					}
					return hash;
				},
				clone: function() {
					var clone = Hasher.clone.call(this);
					clone._hash = this._hash.clone();
					return clone;
				}
			});
			function f1(x, y, z) {
				return x ^ y ^ z;
			}
			function f2(x, y, z) {
				return x & y | ~x & z;
			}
			function f3(x, y, z) {
				return (x | ~y) ^ z;
			}
			function f4(x, y, z) {
				return x & z | y & ~z;
			}
			function f5(x, y, z) {
				return x ^ (y | ~z);
			}
			function rotl(x, n) {
				return x << n | x >>> 32 - n;
			}
			/**
			* Shortcut function to the hasher's object interface.
			*
			* @param {WordArray|string} message The message to hash.
			*
			* @return {WordArray} The hash.
			*
			* @static
			*
			* @example
			*
			*     var hash = CryptoJS.RIPEMD160('message');
			*     var hash = CryptoJS.RIPEMD160(wordArray);
			*/
			C.RIPEMD160 = Hasher._createHelper(RIPEMD160);
			/**
			* Shortcut function to the HMAC's object interface.
			*
			* @param {WordArray|string} message The message to hash.
			* @param {WordArray|string} key The secret key.
			*
			* @return {WordArray} The HMAC.
			*
			* @static
			*
			* @example
			*
			*     var hmac = CryptoJS.HmacRIPEMD160(message, key);
			*/
			C.HmacRIPEMD160 = Hasher._createHmacHelper(RIPEMD160);
		})(Math);
		(function() {
			var C = CryptoJS;
			var Base = C.lib.Base;
			var Utf8 = C.enc.Utf8;
			var C_algo = C.algo;
			C_algo.HMAC = Base.extend({
				/**
				* Initializes a newly created HMAC.
				*
				* @param {Hasher} hasher The hash algorithm to use.
				* @param {WordArray|string} key The secret key.
				*
				* @example
				*
				*     var hmacHasher = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, key);
				*/
				init: function(hasher, key) {
					hasher = this._hasher = new hasher.init();
					if (typeof key == "string") key = Utf8.parse(key);
					var hasherBlockSize = hasher.blockSize;
					var hasherBlockSizeBytes = hasherBlockSize * 4;
					if (key.sigBytes > hasherBlockSizeBytes) key = hasher.finalize(key);
					key.clamp();
					var oKey = this._oKey = key.clone();
					var iKey = this._iKey = key.clone();
					var oKeyWords = oKey.words;
					var iKeyWords = iKey.words;
					for (var i = 0; i < hasherBlockSize; i++) {
						oKeyWords[i] ^= 1549556828;
						iKeyWords[i] ^= 909522486;
					}
					oKey.sigBytes = iKey.sigBytes = hasherBlockSizeBytes;
					this.reset();
				},
				/**
				* Resets this HMAC to its initial state.
				*
				* @example
				*
				*     hmacHasher.reset();
				*/
				reset: function() {
					var hasher = this._hasher;
					hasher.reset();
					hasher.update(this._iKey);
				},
				/**
				* Updates this HMAC with a message.
				*
				* @param {WordArray|string} messageUpdate The message to append.
				*
				* @return {HMAC} This HMAC instance.
				*
				* @example
				*
				*     hmacHasher.update('message');
				*     hmacHasher.update(wordArray);
				*/
				update: function(messageUpdate) {
					this._hasher.update(messageUpdate);
					return this;
				},
				/**
				* Finalizes the HMAC computation.
				* Note that the finalize operation is effectively a destructive, read-once operation.
				*
				* @param {WordArray|string} messageUpdate (Optional) A final message update.
				*
				* @return {WordArray} The HMAC.
				*
				* @example
				*
				*     var hmac = hmacHasher.finalize();
				*     var hmac = hmacHasher.finalize('message');
				*     var hmac = hmacHasher.finalize(wordArray);
				*/
				finalize: function(messageUpdate) {
					var hasher = this._hasher;
					var innerHash = hasher.finalize(messageUpdate);
					hasher.reset();
					return hasher.finalize(this._oKey.clone().concat(innerHash));
				}
			});
		})();
		(function() {
			var C = CryptoJS;
			var C_lib = C.lib;
			var Base = C_lib.Base;
			var WordArray = C_lib.WordArray;
			var C_algo = C.algo;
			var SHA256 = C_algo.SHA256;
			var HMAC = C_algo.HMAC;
			/**
			* Password-Based Key Derivation Function 2 algorithm.
			*/
			var PBKDF2 = C_algo.PBKDF2 = Base.extend({
				/**
				* Configuration options.
				*
				* @property {number} keySize The key size in words to generate. Default: 4 (128 bits)
				* @property {Hasher} hasher The hasher to use. Default: SHA256
				* @property {number} iterations The number of iterations to perform. Default: 250000
				*/
				cfg: Base.extend({
					keySize: 4,
					hasher: SHA256,
					iterations: 25e4
				}),
				/**
				* Initializes a newly created key derivation function.
				*
				* @param {Object} cfg (Optional) The configuration options to use for the derivation.
				*
				* @example
				*
				*     var kdf = CryptoJS.algo.PBKDF2.create();
				*     var kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8 });
				*     var kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8, iterations: 1000 });
				*/
				init: function(cfg) {
					this.cfg = this.cfg.extend(cfg);
				},
				/**
				* Computes the Password-Based Key Derivation Function 2.
				*
				* @param {WordArray|string} password The password.
				* @param {WordArray|string} salt A salt.
				*
				* @return {WordArray} The derived key.
				*
				* @example
				*
				*     var key = kdf.compute(password, salt);
				*/
				compute: function(password, salt) {
					var cfg = this.cfg;
					var hmac = HMAC.create(cfg.hasher, password);
					var derivedKey = WordArray.create();
					var blockIndex = WordArray.create([1]);
					var derivedKeyWords = derivedKey.words;
					var blockIndexWords = blockIndex.words;
					var keySize = cfg.keySize;
					var iterations = cfg.iterations;
					while (derivedKeyWords.length < keySize) {
						var block = hmac.update(salt).finalize(blockIndex);
						hmac.reset();
						var blockWords = block.words;
						var blockWordsLength = blockWords.length;
						var intermediate = block;
						for (var i = 1; i < iterations; i++) {
							intermediate = hmac.finalize(intermediate);
							hmac.reset();
							var intermediateWords = intermediate.words;
							for (var j = 0; j < blockWordsLength; j++) blockWords[j] ^= intermediateWords[j];
						}
						derivedKey.concat(block);
						blockIndexWords[0]++;
					}
					derivedKey.sigBytes = keySize * 4;
					return derivedKey;
				}
			});
			/**
			* Computes the Password-Based Key Derivation Function 2.
			*
			* @param {WordArray|string} password The password.
			* @param {WordArray|string} salt A salt.
			* @param {Object} cfg (Optional) The configuration options to use for this computation.
			*
			* @return {WordArray} The derived key.
			*
			* @static
			*
			* @example
			*
			*     var key = CryptoJS.PBKDF2(password, salt);
			*     var key = CryptoJS.PBKDF2(password, salt, { keySize: 8 });
			*     var key = CryptoJS.PBKDF2(password, salt, { keySize: 8, iterations: 1000 });
			*/
			C.PBKDF2 = function(password, salt, cfg) {
				return PBKDF2.create(cfg).compute(password, salt);
			};
		})();
		(function() {
			var C = CryptoJS;
			var C_lib = C.lib;
			var Base = C_lib.Base;
			var WordArray = C_lib.WordArray;
			var C_algo = C.algo;
			var MD5 = C_algo.MD5;
			/**
			* This key derivation function is meant to conform with EVP_BytesToKey.
			* www.openssl.org/docs/crypto/EVP_BytesToKey.html
			*/
			var EvpKDF = C_algo.EvpKDF = Base.extend({
				/**
				* Configuration options.
				*
				* @property {number} keySize The key size in words to generate. Default: 4 (128 bits)
				* @property {Hasher} hasher The hash algorithm to use. Default: MD5
				* @property {number} iterations The number of iterations to perform. Default: 1
				*/
				cfg: Base.extend({
					keySize: 4,
					hasher: MD5,
					iterations: 1
				}),
				/**
				* Initializes a newly created key derivation function.
				*
				* @param {Object} cfg (Optional) The configuration options to use for the derivation.
				*
				* @example
				*
				*     var kdf = CryptoJS.algo.EvpKDF.create();
				*     var kdf = CryptoJS.algo.EvpKDF.create({ keySize: 8 });
				*     var kdf = CryptoJS.algo.EvpKDF.create({ keySize: 8, iterations: 1000 });
				*/
				init: function(cfg) {
					this.cfg = this.cfg.extend(cfg);
				},
				/**
				* Derives a key from a password.
				*
				* @param {WordArray|string} password The password.
				* @param {WordArray|string} salt A salt.
				*
				* @return {WordArray} The derived key.
				*
				* @example
				*
				*     var key = kdf.compute(password, salt);
				*/
				compute: function(password, salt) {
					var block;
					var cfg = this.cfg;
					var hasher = cfg.hasher.create();
					var derivedKey = WordArray.create();
					var derivedKeyWords = derivedKey.words;
					var keySize = cfg.keySize;
					var iterations = cfg.iterations;
					while (derivedKeyWords.length < keySize) {
						if (block) hasher.update(block);
						block = hasher.update(password).finalize(salt);
						hasher.reset();
						for (var i = 1; i < iterations; i++) {
							block = hasher.finalize(block);
							hasher.reset();
						}
						derivedKey.concat(block);
					}
					derivedKey.sigBytes = keySize * 4;
					return derivedKey;
				}
			});
			/**
			* Derives a key from a password.
			*
			* @param {WordArray|string} password The password.
			* @param {WordArray|string} salt A salt.
			* @param {Object} cfg (Optional) The configuration options to use for this computation.
			*
			* @return {WordArray} The derived key.
			*
			* @static
			*
			* @example
			*
			*     var key = CryptoJS.EvpKDF(password, salt);
			*     var key = CryptoJS.EvpKDF(password, salt, { keySize: 8 });
			*     var key = CryptoJS.EvpKDF(password, salt, { keySize: 8, iterations: 1000 });
			*/
			C.EvpKDF = function(password, salt, cfg) {
				return EvpKDF.create(cfg).compute(password, salt);
			};
		})();
		/**
		* Cipher core components.
		*/
		CryptoJS.lib.Cipher || function(undefined) {
			var C = CryptoJS;
			var C_lib = C.lib;
			var Base = C_lib.Base;
			var WordArray = C_lib.WordArray;
			var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm;
			var C_enc = C.enc;
			C_enc.Utf8;
			var Base64 = C_enc.Base64;
			var EvpKDF = C.algo.EvpKDF;
			/**
			* Abstract base cipher template.
			*
			* @property {number} keySize This cipher's key size. Default: 4 (128 bits)
			* @property {number} ivSize This cipher's IV size. Default: 4 (128 bits)
			* @property {number} _ENC_XFORM_MODE A constant representing encryption mode.
			* @property {number} _DEC_XFORM_MODE A constant representing decryption mode.
			*/
			var Cipher = C_lib.Cipher = BufferedBlockAlgorithm.extend({
				/**
				* Configuration options.
				*
				* @property {WordArray} iv The IV to use for this operation.
				*/
				cfg: Base.extend(),
				/**
				* Creates this cipher in encryption mode.
				*
				* @param {WordArray} key The key.
				* @param {Object} cfg (Optional) The configuration options to use for this operation.
				*
				* @return {Cipher} A cipher instance.
				*
				* @static
				*
				* @example
				*
				*     var cipher = CryptoJS.algo.AES.createEncryptor(keyWordArray, { iv: ivWordArray });
				*/
				createEncryptor: function(key, cfg) {
					return this.create(this._ENC_XFORM_MODE, key, cfg);
				},
				/**
				* Creates this cipher in decryption mode.
				*
				* @param {WordArray} key The key.
				* @param {Object} cfg (Optional) The configuration options to use for this operation.
				*
				* @return {Cipher} A cipher instance.
				*
				* @static
				*
				* @example
				*
				*     var cipher = CryptoJS.algo.AES.createDecryptor(keyWordArray, { iv: ivWordArray });
				*/
				createDecryptor: function(key, cfg) {
					return this.create(this._DEC_XFORM_MODE, key, cfg);
				},
				/**
				* Initializes a newly created cipher.
				*
				* @param {number} xformMode Either the encryption or decryption transormation mode constant.
				* @param {WordArray} key The key.
				* @param {Object} cfg (Optional) The configuration options to use for this operation.
				*
				* @example
				*
				*     var cipher = CryptoJS.algo.AES.create(CryptoJS.algo.AES._ENC_XFORM_MODE, keyWordArray, { iv: ivWordArray });
				*/
				init: function(xformMode, key, cfg) {
					this.cfg = this.cfg.extend(cfg);
					this._xformMode = xformMode;
					this._key = key;
					this.reset();
				},
				/**
				* Resets this cipher to its initial state.
				*
				* @example
				*
				*     cipher.reset();
				*/
				reset: function() {
					BufferedBlockAlgorithm.reset.call(this);
					this._doReset();
				},
				/**
				* Adds data to be encrypted or decrypted.
				*
				* @param {WordArray|string} dataUpdate The data to encrypt or decrypt.
				*
				* @return {WordArray} The data after processing.
				*
				* @example
				*
				*     var encrypted = cipher.process('data');
				*     var encrypted = cipher.process(wordArray);
				*/
				process: function(dataUpdate) {
					this._append(dataUpdate);
					return this._process();
				},
				/**
				* Finalizes the encryption or decryption process.
				* Note that the finalize operation is effectively a destructive, read-once operation.
				*
				* @param {WordArray|string} dataUpdate The final data to encrypt or decrypt.
				*
				* @return {WordArray} The data after final processing.
				*
				* @example
				*
				*     var encrypted = cipher.finalize();
				*     var encrypted = cipher.finalize('data');
				*     var encrypted = cipher.finalize(wordArray);
				*/
				finalize: function(dataUpdate) {
					if (dataUpdate) this._append(dataUpdate);
					return this._doFinalize();
				},
				keySize: 4,
				ivSize: 4,
				_ENC_XFORM_MODE: 1,
				_DEC_XFORM_MODE: 2,
				/**
				* Creates shortcut functions to a cipher's object interface.
				*
				* @param {Cipher} cipher The cipher to create a helper for.
				*
				* @return {Object} An object with encrypt and decrypt shortcut functions.
				*
				* @static
				*
				* @example
				*
				*     var AES = CryptoJS.lib.Cipher._createHelper(CryptoJS.algo.AES);
				*/
				_createHelper: function() {
					function selectCipherStrategy(key) {
						if (typeof key == "string") return PasswordBasedCipher;
						else return SerializableCipher;
					}
					return function(cipher) {
						return {
							encrypt: function(message, key, cfg) {
								return selectCipherStrategy(key).encrypt(cipher, message, key, cfg);
							},
							decrypt: function(ciphertext, key, cfg) {
								return selectCipherStrategy(key).decrypt(cipher, ciphertext, key, cfg);
							}
						};
					};
				}()
			});
			C_lib.StreamCipher = Cipher.extend({
				_doFinalize: function() {
					return this._process(true);
				},
				blockSize: 1
			});
			/**
			* Mode namespace.
			*/
			var C_mode = C.mode = {};
			/**
			* Abstract base block cipher mode template.
			*/
			var BlockCipherMode = C_lib.BlockCipherMode = Base.extend({
				/**
				* Creates this mode for encryption.
				*
				* @param {Cipher} cipher A block cipher instance.
				* @param {Array} iv The IV words.
				*
				* @static
				*
				* @example
				*
				*     var mode = CryptoJS.mode.CBC.createEncryptor(cipher, iv.words);
				*/
				createEncryptor: function(cipher, iv) {
					return this.Encryptor.create(cipher, iv);
				},
				/**
				* Creates this mode for decryption.
				*
				* @param {Cipher} cipher A block cipher instance.
				* @param {Array} iv The IV words.
				*
				* @static
				*
				* @example
				*
				*     var mode = CryptoJS.mode.CBC.createDecryptor(cipher, iv.words);
				*/
				createDecryptor: function(cipher, iv) {
					return this.Decryptor.create(cipher, iv);
				},
				/**
				* Initializes a newly created mode.
				*
				* @param {Cipher} cipher A block cipher instance.
				* @param {Array} iv The IV words.
				*
				* @example
				*
				*     var mode = CryptoJS.mode.CBC.Encryptor.create(cipher, iv.words);
				*/
				init: function(cipher, iv) {
					this._cipher = cipher;
					this._iv = iv;
				}
			});
			/**
			* Cipher Block Chaining mode.
			*/
			var CBC = C_mode.CBC = function() {
				/**
				* Abstract base CBC mode.
				*/
				var CBC = BlockCipherMode.extend();
				/**
				* CBC encryptor.
				*/
				CBC.Encryptor = CBC.extend({ 
				/**
				* Processes the data block at offset.
				*
				* @param {Array} words The data words to operate on.
				* @param {number} offset The offset where the block starts.
				*
				* @example
				*
				*     mode.processBlock(data.words, offset);
				*/
processBlock: function(words, offset) {
					var cipher = this._cipher;
					var blockSize = cipher.blockSize;
					xorBlock.call(this, words, offset, blockSize);
					cipher.encryptBlock(words, offset);
					this._prevBlock = words.slice(offset, offset + blockSize);
				} });
				/**
				* CBC decryptor.
				*/
				CBC.Decryptor = CBC.extend({ 
				/**
				* Processes the data block at offset.
				*
				* @param {Array} words The data words to operate on.
				* @param {number} offset The offset where the block starts.
				*
				* @example
				*
				*     mode.processBlock(data.words, offset);
				*/
processBlock: function(words, offset) {
					var cipher = this._cipher;
					var blockSize = cipher.blockSize;
					var thisBlock = words.slice(offset, offset + blockSize);
					cipher.decryptBlock(words, offset);
					xorBlock.call(this, words, offset, blockSize);
					this._prevBlock = thisBlock;
				} });
				function xorBlock(words, offset, blockSize) {
					var block;
					var iv = this._iv;
					if (iv) {
						block = iv;
						this._iv = undefined;
					} else block = this._prevBlock;
					for (var i = 0; i < blockSize; i++) words[offset + i] ^= block[i];
				}
				return CBC;
			}();
			/**
			* Padding namespace.
			*/
			var C_pad = C.pad = {};
			/**
			* PKCS #5/7 padding strategy.
			*/
			var Pkcs7 = C_pad.Pkcs7 = {
				/**
				* Pads data using the algorithm defined in PKCS #5/7.
				*
				* @param {WordArray} data The data to pad.
				* @param {number} blockSize The multiple that the data should be padded to.
				*
				* @static
				*
				* @example
				*
				*     CryptoJS.pad.Pkcs7.pad(wordArray, 4);
				*/
				pad: function(data, blockSize) {
					var blockSizeBytes = blockSize * 4;
					var nPaddingBytes = blockSizeBytes - data.sigBytes % blockSizeBytes;
					var paddingWord = nPaddingBytes << 24 | nPaddingBytes << 16 | nPaddingBytes << 8 | nPaddingBytes;
					var paddingWords = [];
					for (var i = 0; i < nPaddingBytes; i += 4) paddingWords.push(paddingWord);
					var padding = WordArray.create(paddingWords, nPaddingBytes);
					data.concat(padding);
				},
				/**
				* Unpads data that had been padded using the algorithm defined in PKCS #5/7.
				*
				* @param {WordArray} data The data to unpad.
				*
				* @static
				*
				* @example
				*
				*     CryptoJS.pad.Pkcs7.unpad(wordArray);
				*/
				unpad: function(data) {
					var nPaddingBytes = data.words[data.sigBytes - 1 >>> 2] & 255;
					data.sigBytes -= nPaddingBytes;
				}
			};
			C_lib.BlockCipher = Cipher.extend({
				/**
				* Configuration options.
				*
				* @property {Mode} mode The block mode to use. Default: CBC
				* @property {Padding} padding The padding strategy to use. Default: Pkcs7
				*/
				cfg: Cipher.cfg.extend({
					mode: CBC,
					padding: Pkcs7
				}),
				reset: function() {
					var modeCreator;
					Cipher.reset.call(this);
					var cfg = this.cfg;
					var iv = cfg.iv;
					var mode = cfg.mode;
					if (this._xformMode == this._ENC_XFORM_MODE) modeCreator = mode.createEncryptor;
					else {
						modeCreator = mode.createDecryptor;
						this._minBufferSize = 1;
					}
					if (this._mode && this._mode.__creator == modeCreator) this._mode.init(this, iv && iv.words);
					else {
						this._mode = modeCreator.call(mode, this, iv && iv.words);
						this._mode.__creator = modeCreator;
					}
				},
				_doProcessBlock: function(words, offset) {
					this._mode.processBlock(words, offset);
				},
				_doFinalize: function() {
					var finalProcessedBlocks;
					var padding = this.cfg.padding;
					if (this._xformMode == this._ENC_XFORM_MODE) {
						padding.pad(this._data, this.blockSize);
						finalProcessedBlocks = this._process(true);
					} else {
						finalProcessedBlocks = this._process(true);
						padding.unpad(finalProcessedBlocks);
					}
					return finalProcessedBlocks;
				},
				blockSize: 4
			});
			/**
			* A collection of cipher parameters.
			*
			* @property {WordArray} ciphertext The raw ciphertext.
			* @property {WordArray} key The key to this ciphertext.
			* @property {WordArray} iv The IV used in the ciphering operation.
			* @property {WordArray} salt The salt used with a key derivation function.
			* @property {Cipher} algorithm The cipher algorithm.
			* @property {Mode} mode The block mode used in the ciphering operation.
			* @property {Padding} padding The padding scheme used in the ciphering operation.
			* @property {number} blockSize The block size of the cipher.
			* @property {Format} formatter The default formatting strategy to convert this cipher params object to a string.
			*/
			var CipherParams = C_lib.CipherParams = Base.extend({
				/**
				* Initializes a newly created cipher params object.
				*
				* @param {Object} cipherParams An object with any of the possible cipher parameters.
				*
				* @example
				*
				*     var cipherParams = CryptoJS.lib.CipherParams.create({
				*         ciphertext: ciphertextWordArray,
				*         key: keyWordArray,
				*         iv: ivWordArray,
				*         salt: saltWordArray,
				*         algorithm: CryptoJS.algo.AES,
				*         mode: CryptoJS.mode.CBC,
				*         padding: CryptoJS.pad.PKCS7,
				*         blockSize: 4,
				*         formatter: CryptoJS.format.OpenSSL
				*     });
				*/
				init: function(cipherParams) {
					this.mixIn(cipherParams);
				},
				/**
				* Converts this cipher params object to a string.
				*
				* @param {Format} formatter (Optional) The formatting strategy to use.
				*
				* @return {string} The stringified cipher params.
				*
				* @throws Error If neither the formatter nor the default formatter is set.
				*
				* @example
				*
				*     var string = cipherParams + '';
				*     var string = cipherParams.toString();
				*     var string = cipherParams.toString(CryptoJS.format.OpenSSL);
				*/
				toString: function(formatter) {
					return (formatter || this.formatter).stringify(this);
				}
			});
			/**
			* Format namespace.
			*/
			var C_format = C.format = {};
			/**
			* OpenSSL formatting strategy.
			*/
			var OpenSSLFormatter = C_format.OpenSSL = {
				/**
				* Converts a cipher params object to an OpenSSL-compatible string.
				*
				* @param {CipherParams} cipherParams The cipher params object.
				*
				* @return {string} The OpenSSL-compatible string.
				*
				* @static
				*
				* @example
				*
				*     var openSSLString = CryptoJS.format.OpenSSL.stringify(cipherParams);
				*/
				stringify: function(cipherParams) {
					var wordArray;
					var ciphertext = cipherParams.ciphertext;
					var salt = cipherParams.salt;
					if (salt) wordArray = WordArray.create([1398893684, 1701076831]).concat(salt).concat(ciphertext);
					else wordArray = ciphertext;
					return wordArray.toString(Base64);
				},
				/**
				* Converts an OpenSSL-compatible string to a cipher params object.
				*
				* @param {string} openSSLStr The OpenSSL-compatible string.
				*
				* @return {CipherParams} The cipher params object.
				*
				* @static
				*
				* @example
				*
				*     var cipherParams = CryptoJS.format.OpenSSL.parse(openSSLString);
				*/
				parse: function(openSSLStr) {
					var salt;
					var ciphertext = Base64.parse(openSSLStr);
					var ciphertextWords = ciphertext.words;
					if (ciphertextWords[0] == 1398893684 && ciphertextWords[1] == 1701076831) {
						salt = WordArray.create(ciphertextWords.slice(2, 4));
						ciphertextWords.splice(0, 4);
						ciphertext.sigBytes -= 16;
					}
					return CipherParams.create({
						ciphertext,
						salt
					});
				}
			};
			/**
			* A cipher wrapper that returns ciphertext as a serializable cipher params object.
			*/
			var SerializableCipher = C_lib.SerializableCipher = Base.extend({
				/**
				* Configuration options.
				*
				* @property {Formatter} format The formatting strategy to convert cipher param objects to and from a string. Default: OpenSSL
				*/
				cfg: Base.extend({ format: OpenSSLFormatter }),
				/**
				* Encrypts a message.
				*
				* @param {Cipher} cipher The cipher algorithm to use.
				* @param {WordArray|string} message The message to encrypt.
				* @param {WordArray} key The key.
				* @param {Object} cfg (Optional) The configuration options to use for this operation.
				*
				* @return {CipherParams} A cipher params object.
				*
				* @static
				*
				* @example
				*
				*     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key);
				*     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key, { iv: iv });
				*     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key, { iv: iv, format: CryptoJS.format.OpenSSL });
				*/
				encrypt: function(cipher, message, key, cfg) {
					cfg = this.cfg.extend(cfg);
					var encryptor = cipher.createEncryptor(key, cfg);
					var ciphertext = encryptor.finalize(message);
					var cipherCfg = encryptor.cfg;
					return CipherParams.create({
						ciphertext,
						key,
						iv: cipherCfg.iv,
						algorithm: cipher,
						mode: cipherCfg.mode,
						padding: cipherCfg.padding,
						blockSize: cipher.blockSize,
						formatter: cfg.format
					});
				},
				/**
				* Decrypts serialized ciphertext.
				*
				* @param {Cipher} cipher The cipher algorithm to use.
				* @param {CipherParams|string} ciphertext The ciphertext to decrypt.
				* @param {WordArray} key The key.
				* @param {Object} cfg (Optional) The configuration options to use for this operation.
				*
				* @return {WordArray} The plaintext.
				*
				* @static
				*
				* @example
				*
				*     var plaintext = CryptoJS.lib.SerializableCipher.decrypt(CryptoJS.algo.AES, formattedCiphertext, key, { iv: iv, format: CryptoJS.format.OpenSSL });
				*     var plaintext = CryptoJS.lib.SerializableCipher.decrypt(CryptoJS.algo.AES, ciphertextParams, key, { iv: iv, format: CryptoJS.format.OpenSSL });
				*/
				decrypt: function(cipher, ciphertext, key, cfg) {
					cfg = this.cfg.extend(cfg);
					ciphertext = this._parse(ciphertext, cfg.format);
					return cipher.createDecryptor(key, cfg).finalize(ciphertext.ciphertext);
				},
				/**
				* Converts serialized ciphertext to CipherParams,
				* else assumed CipherParams already and returns ciphertext unchanged.
				*
				* @param {CipherParams|string} ciphertext The ciphertext.
				* @param {Formatter} format The formatting strategy to use to parse serialized ciphertext.
				*
				* @return {CipherParams} The unserialized ciphertext.
				*
				* @static
				*
				* @example
				*
				*     var ciphertextParams = CryptoJS.lib.SerializableCipher._parse(ciphertextStringOrParams, format);
				*/
				_parse: function(ciphertext, format) {
					if (typeof ciphertext == "string") return format.parse(ciphertext, this);
					else return ciphertext;
				}
			});
			/**
			* Key derivation function namespace.
			*/
			var C_kdf = C.kdf = {};
			/**
			* OpenSSL key derivation function.
			*/
			var OpenSSLKdf = C_kdf.OpenSSL = { 
			/**
			* Derives a key and IV from a password.
			*
			* @param {string} password The password to derive from.
			* @param {number} keySize The size in words of the key to generate.
			* @param {number} ivSize The size in words of the IV to generate.
			* @param {WordArray|string} salt (Optional) A 64-bit salt to use. If omitted, a salt will be generated randomly.
			*
			* @return {CipherParams} A cipher params object with the key, IV, and salt.
			*
			* @static
			*
			* @example
			*
			*     var derivedParams = CryptoJS.kdf.OpenSSL.execute('Password', 256/32, 128/32);
			*     var derivedParams = CryptoJS.kdf.OpenSSL.execute('Password', 256/32, 128/32, 'saltsalt');
			*/
execute: function(password, keySize, ivSize, salt, hasher) {
				if (!salt) salt = WordArray.random(8);
				if (!hasher) var key = EvpKDF.create({ keySize: keySize + ivSize }).compute(password, salt);
				else var key = EvpKDF.create({
					keySize: keySize + ivSize,
					hasher
				}).compute(password, salt);
				var iv = WordArray.create(key.words.slice(keySize), ivSize * 4);
				key.sigBytes = keySize * 4;
				return CipherParams.create({
					key,
					iv,
					salt
				});
			} };
			/**
			* A serializable cipher wrapper that derives the key from a password,
			* and returns ciphertext as a serializable cipher params object.
			*/
			var PasswordBasedCipher = C_lib.PasswordBasedCipher = SerializableCipher.extend({
				/**
				* Configuration options.
				*
				* @property {KDF} kdf The key derivation function to use to generate a key and IV from a password. Default: OpenSSL
				*/
				cfg: SerializableCipher.cfg.extend({ kdf: OpenSSLKdf }),
				/**
				* Encrypts a message using a password.
				*
				* @param {Cipher} cipher The cipher algorithm to use.
				* @param {WordArray|string} message The message to encrypt.
				* @param {string} password The password.
				* @param {Object} cfg (Optional) The configuration options to use for this operation.
				*
				* @return {CipherParams} A cipher params object.
				*
				* @static
				*
				* @example
				*
				*     var ciphertextParams = CryptoJS.lib.PasswordBasedCipher.encrypt(CryptoJS.algo.AES, message, 'password');
				*     var ciphertextParams = CryptoJS.lib.PasswordBasedCipher.encrypt(CryptoJS.algo.AES, message, 'password', { format: CryptoJS.format.OpenSSL });
				*/
				encrypt: function(cipher, message, password, cfg) {
					cfg = this.cfg.extend(cfg);
					var derivedParams = cfg.kdf.execute(password, cipher.keySize, cipher.ivSize, cfg.salt, cfg.hasher);
					cfg.iv = derivedParams.iv;
					var ciphertext = SerializableCipher.encrypt.call(this, cipher, message, derivedParams.key, cfg);
					ciphertext.mixIn(derivedParams);
					return ciphertext;
				},
				/**
				* Decrypts serialized ciphertext using a password.
				*
				* @param {Cipher} cipher The cipher algorithm to use.
				* @param {CipherParams|string} ciphertext The ciphertext to decrypt.
				* @param {string} password The password.
				* @param {Object} cfg (Optional) The configuration options to use for this operation.
				*
				* @return {WordArray} The plaintext.
				*
				* @static
				*
				* @example
				*
				*     var plaintext = CryptoJS.lib.PasswordBasedCipher.decrypt(CryptoJS.algo.AES, formattedCiphertext, 'password', { format: CryptoJS.format.OpenSSL });
				*     var plaintext = CryptoJS.lib.PasswordBasedCipher.decrypt(CryptoJS.algo.AES, ciphertextParams, 'password', { format: CryptoJS.format.OpenSSL });
				*/
				decrypt: function(cipher, ciphertext, password, cfg) {
					cfg = this.cfg.extend(cfg);
					ciphertext = this._parse(ciphertext, cfg.format);
					var derivedParams = cfg.kdf.execute(password, cipher.keySize, cipher.ivSize, ciphertext.salt, cfg.hasher);
					cfg.iv = derivedParams.iv;
					return SerializableCipher.decrypt.call(this, cipher, ciphertext, derivedParams.key, cfg);
				}
			});
		}();
		/**
		* Cipher Feedback block mode.
		*/
		CryptoJS.mode.CFB = function() {
			var CFB = CryptoJS.lib.BlockCipherMode.extend();
			CFB.Encryptor = CFB.extend({ processBlock: function(words, offset) {
				var cipher = this._cipher;
				var blockSize = cipher.blockSize;
				generateKeystreamAndEncrypt.call(this, words, offset, blockSize, cipher);
				this._prevBlock = words.slice(offset, offset + blockSize);
			} });
			CFB.Decryptor = CFB.extend({ processBlock: function(words, offset) {
				var cipher = this._cipher;
				var blockSize = cipher.blockSize;
				var thisBlock = words.slice(offset, offset + blockSize);
				generateKeystreamAndEncrypt.call(this, words, offset, blockSize, cipher);
				this._prevBlock = thisBlock;
			} });
			function generateKeystreamAndEncrypt(words, offset, blockSize, cipher) {
				var keystream;
				var iv = this._iv;
				if (iv) {
					keystream = iv.slice(0);
					this._iv = void 0;
				} else keystream = this._prevBlock;
				cipher.encryptBlock(keystream, 0);
				for (var i = 0; i < blockSize; i++) words[offset + i] ^= keystream[i];
			}
			return CFB;
		}();
		/**
		* Counter block mode.
		*/
		CryptoJS.mode.CTR = function() {
			var CTR = CryptoJS.lib.BlockCipherMode.extend();
			CTR.Decryptor = CTR.Encryptor = CTR.extend({ processBlock: function(words, offset) {
				var cipher = this._cipher;
				var blockSize = cipher.blockSize;
				var iv = this._iv;
				var counter = this._counter;
				if (iv) {
					counter = this._counter = iv.slice(0);
					this._iv = void 0;
				}
				var keystream = counter.slice(0);
				cipher.encryptBlock(keystream, 0);
				counter[blockSize - 1] = counter[blockSize - 1] + 1 | 0;
				for (var i = 0; i < blockSize; i++) words[offset + i] ^= keystream[i];
			} });
			return CTR;
		}();
		/** @preserve
		* Counter block mode compatible with  Dr Brian Gladman fileenc.c
		* derived from CryptoJS.mode.CTR
		* Jan Hruby jhruby.web@gmail.com
		*/
		CryptoJS.mode.CTRGladman = function() {
			var CTRGladman = CryptoJS.lib.BlockCipherMode.extend();
			function incWord(word) {
				if ((word >> 24 & 255) === 255) {
					var b1 = word >> 16 & 255;
					var b2 = word >> 8 & 255;
					var b3 = word & 255;
					if (b1 === 255) {
						b1 = 0;
						if (b2 === 255) {
							b2 = 0;
							if (b3 === 255) b3 = 0;
							else ++b3;
						} else ++b2;
					} else ++b1;
					word = 0;
					word += b1 << 16;
					word += b2 << 8;
					word += b3;
				} else word += 1 << 24;
				return word;
			}
			function incCounter(counter) {
				if ((counter[0] = incWord(counter[0])) === 0) counter[1] = incWord(counter[1]);
				return counter;
			}
			CTRGladman.Decryptor = CTRGladman.Encryptor = CTRGladman.extend({ processBlock: function(words, offset) {
				var cipher = this._cipher;
				var blockSize = cipher.blockSize;
				var iv = this._iv;
				var counter = this._counter;
				if (iv) {
					counter = this._counter = iv.slice(0);
					this._iv = void 0;
				}
				incCounter(counter);
				var keystream = counter.slice(0);
				cipher.encryptBlock(keystream, 0);
				for (var i = 0; i < blockSize; i++) words[offset + i] ^= keystream[i];
			} });
			return CTRGladman;
		}();
		/**
		* Output Feedback block mode.
		*/
		CryptoJS.mode.OFB = function() {
			var OFB = CryptoJS.lib.BlockCipherMode.extend();
			OFB.Decryptor = OFB.Encryptor = OFB.extend({ processBlock: function(words, offset) {
				var cipher = this._cipher;
				var blockSize = cipher.blockSize;
				var iv = this._iv;
				var keystream = this._keystream;
				if (iv) {
					keystream = this._keystream = iv.slice(0);
					this._iv = void 0;
				}
				cipher.encryptBlock(keystream, 0);
				for (var i = 0; i < blockSize; i++) words[offset + i] ^= keystream[i];
			} });
			return OFB;
		}();
		/**
		* Electronic Codebook block mode.
		*/
		CryptoJS.mode.ECB = function() {
			var ECB = CryptoJS.lib.BlockCipherMode.extend();
			ECB.Encryptor = ECB.extend({ processBlock: function(words, offset) {
				this._cipher.encryptBlock(words, offset);
			} });
			ECB.Decryptor = ECB.extend({ processBlock: function(words, offset) {
				this._cipher.decryptBlock(words, offset);
			} });
			return ECB;
		}();
		/**
		* ANSI X.923 padding strategy.
		*/
		CryptoJS.pad.AnsiX923 = {
			pad: function(data, blockSize) {
				var dataSigBytes = data.sigBytes;
				var blockSizeBytes = blockSize * 4;
				var nPaddingBytes = blockSizeBytes - dataSigBytes % blockSizeBytes;
				var lastBytePos = dataSigBytes + nPaddingBytes - 1;
				data.clamp();
				data.words[lastBytePos >>> 2] |= nPaddingBytes << 24 - lastBytePos % 4 * 8;
				data.sigBytes += nPaddingBytes;
			},
			unpad: function(data) {
				var nPaddingBytes = data.words[data.sigBytes - 1 >>> 2] & 255;
				data.sigBytes -= nPaddingBytes;
			}
		};
		/**
		* ISO 10126 padding strategy.
		*/
		CryptoJS.pad.Iso10126 = {
			pad: function(data, blockSize) {
				var blockSizeBytes = blockSize * 4;
				var nPaddingBytes = blockSizeBytes - data.sigBytes % blockSizeBytes;
				data.concat(CryptoJS.lib.WordArray.random(nPaddingBytes - 1)).concat(CryptoJS.lib.WordArray.create([nPaddingBytes << 24], 1));
			},
			unpad: function(data) {
				var nPaddingBytes = data.words[data.sigBytes - 1 >>> 2] & 255;
				data.sigBytes -= nPaddingBytes;
			}
		};
		/**
		* ISO/IEC 9797-1 Padding Method 2.
		*/
		CryptoJS.pad.Iso97971 = {
			pad: function(data, blockSize) {
				data.concat(CryptoJS.lib.WordArray.create([2147483648], 1));
				CryptoJS.pad.ZeroPadding.pad(data, blockSize);
			},
			unpad: function(data) {
				CryptoJS.pad.ZeroPadding.unpad(data);
				data.sigBytes--;
			}
		};
		/**
		* Zero padding strategy.
		*/
		CryptoJS.pad.ZeroPadding = {
			pad: function(data, blockSize) {
				var blockSizeBytes = blockSize * 4;
				data.clamp();
				data.sigBytes += blockSizeBytes - (data.sigBytes % blockSizeBytes || blockSizeBytes);
			},
			unpad: function(data) {
				var dataWords = data.words;
				var i = data.sigBytes - 1;
				for (var i = data.sigBytes - 1; i >= 0; i--) if (dataWords[i >>> 2] >>> 24 - i % 4 * 8 & 255) {
					data.sigBytes = i + 1;
					break;
				}
			}
		};
		/**
		* A noop padding strategy.
		*/
		CryptoJS.pad.NoPadding = {
			pad: function() {},
			unpad: function() {}
		};
		(function(undefined) {
			var C = CryptoJS;
			var CipherParams = C.lib.CipherParams;
			var Hex = C.enc.Hex;
			var C_format = C.format;
			C_format.Hex = {
				/**
				* Converts the ciphertext of a cipher params object to a hexadecimally encoded string.
				*
				* @param {CipherParams} cipherParams The cipher params object.
				*
				* @return {string} The hexadecimally encoded string.
				*
				* @static
				*
				* @example
				*
				*     var hexString = CryptoJS.format.Hex.stringify(cipherParams);
				*/
				stringify: function(cipherParams) {
					return cipherParams.ciphertext.toString(Hex);
				},
				/**
				* Converts a hexadecimally encoded ciphertext string to a cipher params object.
				*
				* @param {string} input The hexadecimally encoded string.
				*
				* @return {CipherParams} The cipher params object.
				*
				* @static
				*
				* @example
				*
				*     var cipherParams = CryptoJS.format.Hex.parse(hexString);
				*/
				parse: function(input) {
					var ciphertext = Hex.parse(input);
					return CipherParams.create({ ciphertext });
				}
			};
		})();
		(function() {
			var C = CryptoJS;
			var BlockCipher = C.lib.BlockCipher;
			var C_algo = C.algo;
			var SBOX = [];
			var INV_SBOX = [];
			var SUB_MIX_0 = [];
			var SUB_MIX_1 = [];
			var SUB_MIX_2 = [];
			var SUB_MIX_3 = [];
			var INV_SUB_MIX_0 = [];
			var INV_SUB_MIX_1 = [];
			var INV_SUB_MIX_2 = [];
			var INV_SUB_MIX_3 = [];
			(function() {
				var d = [];
				for (var i = 0; i < 256; i++) if (i < 128) d[i] = i << 1;
				else d[i] = i << 1 ^ 283;
				var x = 0;
				var xi = 0;
				for (var i = 0; i < 256; i++) {
					var sx = xi ^ xi << 1 ^ xi << 2 ^ xi << 3 ^ xi << 4;
					sx = sx >>> 8 ^ sx & 255 ^ 99;
					SBOX[x] = sx;
					INV_SBOX[sx] = x;
					var x2 = d[x];
					var x4 = d[x2];
					var x8 = d[x4];
					var t = d[sx] * 257 ^ sx * 16843008;
					SUB_MIX_0[x] = t << 24 | t >>> 8;
					SUB_MIX_1[x] = t << 16 | t >>> 16;
					SUB_MIX_2[x] = t << 8 | t >>> 24;
					SUB_MIX_3[x] = t;
					var t = x8 * 16843009 ^ x4 * 65537 ^ x2 * 257 ^ x * 16843008;
					INV_SUB_MIX_0[sx] = t << 24 | t >>> 8;
					INV_SUB_MIX_1[sx] = t << 16 | t >>> 16;
					INV_SUB_MIX_2[sx] = t << 8 | t >>> 24;
					INV_SUB_MIX_3[sx] = t;
					if (!x) x = xi = 1;
					else {
						x = x2 ^ d[d[d[x8 ^ x2]]];
						xi ^= d[d[xi]];
					}
				}
			})();
			var RCON = [
				0,
				1,
				2,
				4,
				8,
				16,
				32,
				64,
				128,
				27,
				54
			];
			/**
			* AES block cipher algorithm.
			*/
			var AES = C_algo.AES = BlockCipher.extend({
				_doReset: function() {
					var t;
					if (this._nRounds && this._keyPriorReset === this._key) return;
					var key = this._keyPriorReset = this._key;
					var keyWords = key.words;
					var keySize = key.sigBytes / 4;
					var ksRows = ((this._nRounds = keySize + 6) + 1) * 4;
					var keySchedule = this._keySchedule = [];
					for (var ksRow = 0; ksRow < ksRows; ksRow++) if (ksRow < keySize) keySchedule[ksRow] = keyWords[ksRow];
					else {
						t = keySchedule[ksRow - 1];
						if (!(ksRow % keySize)) {
							t = t << 8 | t >>> 24;
							t = SBOX[t >>> 24] << 24 | SBOX[t >>> 16 & 255] << 16 | SBOX[t >>> 8 & 255] << 8 | SBOX[t & 255];
							t ^= RCON[ksRow / keySize | 0] << 24;
						} else if (keySize > 6 && ksRow % keySize == 4) t = SBOX[t >>> 24] << 24 | SBOX[t >>> 16 & 255] << 16 | SBOX[t >>> 8 & 255] << 8 | SBOX[t & 255];
						keySchedule[ksRow] = keySchedule[ksRow - keySize] ^ t;
					}
					var invKeySchedule = this._invKeySchedule = [];
					for (var invKsRow = 0; invKsRow < ksRows; invKsRow++) {
						var ksRow = ksRows - invKsRow;
						if (invKsRow % 4) var t = keySchedule[ksRow];
						else var t = keySchedule[ksRow - 4];
						if (invKsRow < 4 || ksRow <= 4) invKeySchedule[invKsRow] = t;
						else invKeySchedule[invKsRow] = INV_SUB_MIX_0[SBOX[t >>> 24]] ^ INV_SUB_MIX_1[SBOX[t >>> 16 & 255]] ^ INV_SUB_MIX_2[SBOX[t >>> 8 & 255]] ^ INV_SUB_MIX_3[SBOX[t & 255]];
					}
				},
				encryptBlock: function(M, offset) {
					this._doCryptBlock(M, offset, this._keySchedule, SUB_MIX_0, SUB_MIX_1, SUB_MIX_2, SUB_MIX_3, SBOX);
				},
				decryptBlock: function(M, offset) {
					var t = M[offset + 1];
					M[offset + 1] = M[offset + 3];
					M[offset + 3] = t;
					this._doCryptBlock(M, offset, this._invKeySchedule, INV_SUB_MIX_0, INV_SUB_MIX_1, INV_SUB_MIX_2, INV_SUB_MIX_3, INV_SBOX);
					var t = M[offset + 1];
					M[offset + 1] = M[offset + 3];
					M[offset + 3] = t;
				},
				_doCryptBlock: function(M, offset, keySchedule, SUB_MIX_0, SUB_MIX_1, SUB_MIX_2, SUB_MIX_3, SBOX) {
					var nRounds = this._nRounds;
					var s0 = M[offset] ^ keySchedule[0];
					var s1 = M[offset + 1] ^ keySchedule[1];
					var s2 = M[offset + 2] ^ keySchedule[2];
					var s3 = M[offset + 3] ^ keySchedule[3];
					var ksRow = 4;
					for (var round = 1; round < nRounds; round++) {
						var t0 = SUB_MIX_0[s0 >>> 24] ^ SUB_MIX_1[s1 >>> 16 & 255] ^ SUB_MIX_2[s2 >>> 8 & 255] ^ SUB_MIX_3[s3 & 255] ^ keySchedule[ksRow++];
						var t1 = SUB_MIX_0[s1 >>> 24] ^ SUB_MIX_1[s2 >>> 16 & 255] ^ SUB_MIX_2[s3 >>> 8 & 255] ^ SUB_MIX_3[s0 & 255] ^ keySchedule[ksRow++];
						var t2 = SUB_MIX_0[s2 >>> 24] ^ SUB_MIX_1[s3 >>> 16 & 255] ^ SUB_MIX_2[s0 >>> 8 & 255] ^ SUB_MIX_3[s1 & 255] ^ keySchedule[ksRow++];
						var t3 = SUB_MIX_0[s3 >>> 24] ^ SUB_MIX_1[s0 >>> 16 & 255] ^ SUB_MIX_2[s1 >>> 8 & 255] ^ SUB_MIX_3[s2 & 255] ^ keySchedule[ksRow++];
						s0 = t0;
						s1 = t1;
						s2 = t2;
						s3 = t3;
					}
					var t0 = (SBOX[s0 >>> 24] << 24 | SBOX[s1 >>> 16 & 255] << 16 | SBOX[s2 >>> 8 & 255] << 8 | SBOX[s3 & 255]) ^ keySchedule[ksRow++];
					var t1 = (SBOX[s1 >>> 24] << 24 | SBOX[s2 >>> 16 & 255] << 16 | SBOX[s3 >>> 8 & 255] << 8 | SBOX[s0 & 255]) ^ keySchedule[ksRow++];
					var t2 = (SBOX[s2 >>> 24] << 24 | SBOX[s3 >>> 16 & 255] << 16 | SBOX[s0 >>> 8 & 255] << 8 | SBOX[s1 & 255]) ^ keySchedule[ksRow++];
					var t3 = (SBOX[s3 >>> 24] << 24 | SBOX[s0 >>> 16 & 255] << 16 | SBOX[s1 >>> 8 & 255] << 8 | SBOX[s2 & 255]) ^ keySchedule[ksRow++];
					M[offset] = t0;
					M[offset + 1] = t1;
					M[offset + 2] = t2;
					M[offset + 3] = t3;
				},
				keySize: 8
			});
			/**
			* Shortcut functions to the cipher's object interface.
			*
			* @example
			*
			*     var ciphertext = CryptoJS.AES.encrypt(message, key, cfg);
			*     var plaintext  = CryptoJS.AES.decrypt(ciphertext, key, cfg);
			*/
			C.AES = BlockCipher._createHelper(AES);
		})();
		(function() {
			var C = CryptoJS;
			var C_lib = C.lib;
			var WordArray = C_lib.WordArray;
			var BlockCipher = C_lib.BlockCipher;
			var C_algo = C.algo;
			var PC1 = [
				57,
				49,
				41,
				33,
				25,
				17,
				9,
				1,
				58,
				50,
				42,
				34,
				26,
				18,
				10,
				2,
				59,
				51,
				43,
				35,
				27,
				19,
				11,
				3,
				60,
				52,
				44,
				36,
				63,
				55,
				47,
				39,
				31,
				23,
				15,
				7,
				62,
				54,
				46,
				38,
				30,
				22,
				14,
				6,
				61,
				53,
				45,
				37,
				29,
				21,
				13,
				5,
				28,
				20,
				12,
				4
			];
			var PC2 = [
				14,
				17,
				11,
				24,
				1,
				5,
				3,
				28,
				15,
				6,
				21,
				10,
				23,
				19,
				12,
				4,
				26,
				8,
				16,
				7,
				27,
				20,
				13,
				2,
				41,
				52,
				31,
				37,
				47,
				55,
				30,
				40,
				51,
				45,
				33,
				48,
				44,
				49,
				39,
				56,
				34,
				53,
				46,
				42,
				50,
				36,
				29,
				32
			];
			var BIT_SHIFTS = [
				1,
				2,
				4,
				6,
				8,
				10,
				12,
				14,
				15,
				17,
				19,
				21,
				23,
				25,
				27,
				28
			];
			var SBOX_P = [
				{
					0: 8421888,
					268435456: 32768,
					536870912: 8421378,
					805306368: 2,
					1073741824: 512,
					1342177280: 8421890,
					1610612736: 8389122,
					1879048192: 8388608,
					2147483648: 514,
					2415919104: 8389120,
					2684354560: 33280,
					2952790016: 8421376,
					3221225472: 32770,
					3489660928: 8388610,
					3758096384: 0,
					4026531840: 33282,
					134217728: 0,
					402653184: 8421890,
					671088640: 33282,
					939524096: 32768,
					1207959552: 8421888,
					1476395008: 512,
					1744830464: 8421378,
					2013265920: 2,
					2281701376: 8389120,
					2550136832: 33280,
					2818572288: 8421376,
					3087007744: 8389122,
					3355443200: 8388610,
					3623878656: 32770,
					3892314112: 514,
					4160749568: 8388608,
					1: 32768,
					268435457: 2,
					536870913: 8421888,
					805306369: 8388608,
					1073741825: 8421378,
					1342177281: 33280,
					1610612737: 512,
					1879048193: 8389122,
					2147483649: 8421890,
					2415919105: 8421376,
					2684354561: 8388610,
					2952790017: 33282,
					3221225473: 514,
					3489660929: 8389120,
					3758096385: 32770,
					4026531841: 0,
					134217729: 8421890,
					402653185: 8421376,
					671088641: 8388608,
					939524097: 512,
					1207959553: 32768,
					1476395009: 8388610,
					1744830465: 2,
					2013265921: 33282,
					2281701377: 32770,
					2550136833: 8389122,
					2818572289: 514,
					3087007745: 8421888,
					3355443201: 8389120,
					3623878657: 0,
					3892314113: 33280,
					4160749569: 8421378
				},
				{
					0: 1074282512,
					16777216: 16384,
					33554432: 524288,
					50331648: 1074266128,
					67108864: 1073741840,
					83886080: 1074282496,
					100663296: 1073758208,
					117440512: 16,
					134217728: 540672,
					150994944: 1073758224,
					167772160: 1073741824,
					184549376: 540688,
					201326592: 524304,
					218103808: 0,
					234881024: 16400,
					251658240: 1074266112,
					8388608: 1073758208,
					25165824: 540688,
					41943040: 16,
					58720256: 1073758224,
					75497472: 1074282512,
					92274688: 1073741824,
					109051904: 524288,
					125829120: 1074266128,
					142606336: 524304,
					159383552: 0,
					176160768: 16384,
					192937984: 1074266112,
					209715200: 1073741840,
					226492416: 540672,
					243269632: 1074282496,
					260046848: 16400,
					268435456: 0,
					285212672: 1074266128,
					301989888: 1073758224,
					318767104: 1074282496,
					335544320: 1074266112,
					352321536: 16,
					369098752: 540688,
					385875968: 16384,
					402653184: 16400,
					419430400: 524288,
					436207616: 524304,
					452984832: 1073741840,
					469762048: 540672,
					486539264: 1073758208,
					503316480: 1073741824,
					520093696: 1074282512,
					276824064: 540688,
					293601280: 524288,
					310378496: 1074266112,
					327155712: 16384,
					343932928: 1073758208,
					360710144: 1074282512,
					377487360: 16,
					394264576: 1073741824,
					411041792: 1074282496,
					427819008: 1073741840,
					444596224: 1073758224,
					461373440: 524304,
					478150656: 0,
					494927872: 16400,
					511705088: 1074266128,
					528482304: 540672
				},
				{
					0: 260,
					1048576: 0,
					2097152: 67109120,
					3145728: 65796,
					4194304: 65540,
					5242880: 67108868,
					6291456: 67174660,
					7340032: 67174400,
					8388608: 67108864,
					9437184: 67174656,
					10485760: 65792,
					11534336: 67174404,
					12582912: 67109124,
					13631488: 65536,
					14680064: 4,
					15728640: 256,
					524288: 67174656,
					1572864: 67174404,
					2621440: 0,
					3670016: 67109120,
					4718592: 67108868,
					5767168: 65536,
					6815744: 65540,
					7864320: 260,
					8912896: 4,
					9961472: 256,
					11010048: 67174400,
					12058624: 65796,
					13107200: 65792,
					14155776: 67109124,
					15204352: 67174660,
					16252928: 67108864,
					16777216: 67174656,
					17825792: 65540,
					18874368: 65536,
					19922944: 67109120,
					20971520: 256,
					22020096: 67174660,
					23068672: 67108868,
					24117248: 0,
					25165824: 67109124,
					26214400: 67108864,
					27262976: 4,
					28311552: 65792,
					29360128: 67174400,
					30408704: 260,
					31457280: 65796,
					32505856: 67174404,
					17301504: 67108864,
					18350080: 260,
					19398656: 67174656,
					20447232: 0,
					21495808: 65540,
					22544384: 67109120,
					23592960: 256,
					24641536: 67174404,
					25690112: 65536,
					26738688: 67174660,
					27787264: 65796,
					28835840: 67108868,
					29884416: 67109124,
					30932992: 67174400,
					31981568: 4,
					33030144: 65792
				},
				{
					0: 2151682048,
					65536: 2147487808,
					131072: 4198464,
					196608: 2151677952,
					262144: 0,
					327680: 4198400,
					393216: 2147483712,
					458752: 4194368,
					524288: 2147483648,
					589824: 4194304,
					655360: 64,
					720896: 2147487744,
					786432: 2151678016,
					851968: 4160,
					917504: 4096,
					983040: 2151682112,
					32768: 2147487808,
					98304: 64,
					163840: 2151678016,
					229376: 2147487744,
					294912: 4198400,
					360448: 2151682112,
					425984: 0,
					491520: 2151677952,
					557056: 4096,
					622592: 2151682048,
					688128: 4194304,
					753664: 4160,
					819200: 2147483648,
					884736: 4194368,
					950272: 4198464,
					1015808: 2147483712,
					1048576: 4194368,
					1114112: 4198400,
					1179648: 2147483712,
					1245184: 0,
					1310720: 4160,
					1376256: 2151678016,
					1441792: 2151682048,
					1507328: 2147487808,
					1572864: 2151682112,
					1638400: 2147483648,
					1703936: 2151677952,
					1769472: 4198464,
					1835008: 2147487744,
					1900544: 4194304,
					1966080: 64,
					2031616: 4096,
					1081344: 2151677952,
					1146880: 2151682112,
					1212416: 0,
					1277952: 4198400,
					1343488: 4194368,
					1409024: 2147483648,
					1474560: 2147487808,
					1540096: 64,
					1605632: 2147483712,
					1671168: 4096,
					1736704: 2147487744,
					1802240: 2151678016,
					1867776: 4160,
					1933312: 2151682048,
					1998848: 4194304,
					2064384: 4198464
				},
				{
					0: 128,
					4096: 17039360,
					8192: 262144,
					12288: 536870912,
					16384: 537133184,
					20480: 16777344,
					24576: 553648256,
					28672: 262272,
					32768: 16777216,
					36864: 537133056,
					40960: 536871040,
					45056: 553910400,
					49152: 553910272,
					53248: 0,
					57344: 17039488,
					61440: 553648128,
					2048: 17039488,
					6144: 553648256,
					10240: 128,
					14336: 17039360,
					18432: 262144,
					22528: 537133184,
					26624: 553910272,
					30720: 536870912,
					34816: 537133056,
					38912: 0,
					43008: 553910400,
					47104: 16777344,
					51200: 536871040,
					55296: 553648128,
					59392: 16777216,
					63488: 262272,
					65536: 262144,
					69632: 128,
					73728: 536870912,
					77824: 553648256,
					81920: 16777344,
					86016: 553910272,
					90112: 537133184,
					94208: 16777216,
					98304: 553910400,
					102400: 553648128,
					106496: 17039360,
					110592: 537133056,
					114688: 262272,
					118784: 536871040,
					122880: 0,
					126976: 17039488,
					67584: 553648256,
					71680: 16777216,
					75776: 17039360,
					79872: 537133184,
					83968: 536870912,
					88064: 17039488,
					92160: 128,
					96256: 553910272,
					100352: 262272,
					104448: 553910400,
					108544: 0,
					112640: 553648128,
					116736: 16777344,
					120832: 262144,
					124928: 537133056,
					129024: 536871040
				},
				{
					0: 268435464,
					256: 8192,
					512: 270532608,
					768: 270540808,
					1024: 268443648,
					1280: 2097152,
					1536: 2097160,
					1792: 268435456,
					2048: 0,
					2304: 268443656,
					2560: 2105344,
					2816: 8,
					3072: 270532616,
					3328: 2105352,
					3584: 8200,
					3840: 270540800,
					128: 270532608,
					384: 270540808,
					640: 8,
					896: 2097152,
					1152: 2105352,
					1408: 268435464,
					1664: 268443648,
					1920: 8200,
					2176: 2097160,
					2432: 8192,
					2688: 268443656,
					2944: 270532616,
					3200: 0,
					3456: 270540800,
					3712: 2105344,
					3968: 268435456,
					4096: 268443648,
					4352: 270532616,
					4608: 270540808,
					4864: 8200,
					5120: 2097152,
					5376: 268435456,
					5632: 268435464,
					5888: 2105344,
					6144: 2105352,
					6400: 0,
					6656: 8,
					6912: 270532608,
					7168: 8192,
					7424: 268443656,
					7680: 270540800,
					7936: 2097160,
					4224: 8,
					4480: 2105344,
					4736: 2097152,
					4992: 268435464,
					5248: 268443648,
					5504: 8200,
					5760: 270540808,
					6016: 270532608,
					6272: 270540800,
					6528: 270532616,
					6784: 8192,
					7040: 2105352,
					7296: 2097160,
					7552: 0,
					7808: 268435456,
					8064: 268443656
				},
				{
					0: 1048576,
					16: 33555457,
					32: 1024,
					48: 1049601,
					64: 34604033,
					80: 0,
					96: 1,
					112: 34603009,
					128: 33555456,
					144: 1048577,
					160: 33554433,
					176: 34604032,
					192: 34603008,
					208: 1025,
					224: 1049600,
					240: 33554432,
					8: 34603009,
					24: 0,
					40: 33555457,
					56: 34604032,
					72: 1048576,
					88: 33554433,
					104: 33554432,
					120: 1025,
					136: 1049601,
					152: 33555456,
					168: 34603008,
					184: 1048577,
					200: 1024,
					216: 34604033,
					232: 1,
					248: 1049600,
					256: 33554432,
					272: 1048576,
					288: 33555457,
					304: 34603009,
					320: 1048577,
					336: 33555456,
					352: 34604032,
					368: 1049601,
					384: 1025,
					400: 34604033,
					416: 1049600,
					432: 1,
					448: 0,
					464: 34603008,
					480: 33554433,
					496: 1024,
					264: 1049600,
					280: 33555457,
					296: 34603009,
					312: 1,
					328: 33554432,
					344: 1048576,
					360: 1025,
					376: 34604032,
					392: 33554433,
					408: 34603008,
					424: 0,
					440: 34604033,
					456: 1049601,
					472: 1024,
					488: 33555456,
					504: 1048577
				},
				{
					0: 134219808,
					1: 131072,
					2: 134217728,
					3: 32,
					4: 131104,
					5: 134350880,
					6: 134350848,
					7: 2048,
					8: 134348800,
					9: 134219776,
					10: 133120,
					11: 134348832,
					12: 2080,
					13: 0,
					14: 134217760,
					15: 133152,
					2147483648: 2048,
					2147483649: 134350880,
					2147483650: 134219808,
					2147483651: 134217728,
					2147483652: 134348800,
					2147483653: 133120,
					2147483654: 133152,
					2147483655: 32,
					2147483656: 134217760,
					2147483657: 2080,
					2147483658: 131104,
					2147483659: 134350848,
					2147483660: 0,
					2147483661: 134348832,
					2147483662: 134219776,
					2147483663: 131072,
					16: 133152,
					17: 134350848,
					18: 32,
					19: 2048,
					20: 134219776,
					21: 134217760,
					22: 134348832,
					23: 131072,
					24: 0,
					25: 131104,
					26: 134348800,
					27: 134219808,
					28: 134350880,
					29: 133120,
					30: 2080,
					31: 134217728,
					2147483664: 131072,
					2147483665: 2048,
					2147483666: 134348832,
					2147483667: 133152,
					2147483668: 32,
					2147483669: 134348800,
					2147483670: 134217728,
					2147483671: 134219808,
					2147483672: 134350880,
					2147483673: 134217760,
					2147483674: 134219776,
					2147483675: 0,
					2147483676: 133120,
					2147483677: 2080,
					2147483678: 131104,
					2147483679: 134350848
				}
			];
			var SBOX_MASK = [
				4160749569,
				528482304,
				33030144,
				2064384,
				129024,
				8064,
				504,
				2147483679
			];
			/**
			* DES block cipher algorithm.
			*/
			var DES = C_algo.DES = BlockCipher.extend({
				_doReset: function() {
					var keyWords = this._key.words;
					var keyBits = [];
					for (var i = 0; i < 56; i++) {
						var keyBitPos = PC1[i] - 1;
						keyBits[i] = keyWords[keyBitPos >>> 5] >>> 31 - keyBitPos % 32 & 1;
					}
					var subKeys = this._subKeys = [];
					for (var nSubKey = 0; nSubKey < 16; nSubKey++) {
						var subKey = subKeys[nSubKey] = [];
						var bitShift = BIT_SHIFTS[nSubKey];
						for (var i = 0; i < 24; i++) {
							subKey[i / 6 | 0] |= keyBits[(PC2[i] - 1 + bitShift) % 28] << 31 - i % 6;
							subKey[4 + (i / 6 | 0)] |= keyBits[28 + (PC2[i + 24] - 1 + bitShift) % 28] << 31 - i % 6;
						}
						subKey[0] = subKey[0] << 1 | subKey[0] >>> 31;
						for (var i = 1; i < 7; i++) subKey[i] = subKey[i] >>> (i - 1) * 4 + 3;
						subKey[7] = subKey[7] << 5 | subKey[7] >>> 27;
					}
					var invSubKeys = this._invSubKeys = [];
					for (var i = 0; i < 16; i++) invSubKeys[i] = subKeys[15 - i];
				},
				encryptBlock: function(M, offset) {
					this._doCryptBlock(M, offset, this._subKeys);
				},
				decryptBlock: function(M, offset) {
					this._doCryptBlock(M, offset, this._invSubKeys);
				},
				_doCryptBlock: function(M, offset, subKeys) {
					this._lBlock = M[offset];
					this._rBlock = M[offset + 1];
					exchangeLR.call(this, 4, 252645135);
					exchangeLR.call(this, 16, 65535);
					exchangeRL.call(this, 2, 858993459);
					exchangeRL.call(this, 8, 16711935);
					exchangeLR.call(this, 1, 1431655765);
					for (var round = 0; round < 16; round++) {
						var subKey = subKeys[round];
						var lBlock = this._lBlock;
						var rBlock = this._rBlock;
						var f = 0;
						for (var i = 0; i < 8; i++) f |= SBOX_P[i][((rBlock ^ subKey[i]) & SBOX_MASK[i]) >>> 0];
						this._lBlock = rBlock;
						this._rBlock = lBlock ^ f;
					}
					var t = this._lBlock;
					this._lBlock = this._rBlock;
					this._rBlock = t;
					exchangeLR.call(this, 1, 1431655765);
					exchangeRL.call(this, 8, 16711935);
					exchangeRL.call(this, 2, 858993459);
					exchangeLR.call(this, 16, 65535);
					exchangeLR.call(this, 4, 252645135);
					M[offset] = this._lBlock;
					M[offset + 1] = this._rBlock;
				},
				keySize: 2,
				ivSize: 2,
				blockSize: 2
			});
			function exchangeLR(offset, mask) {
				var t = (this._lBlock >>> offset ^ this._rBlock) & mask;
				this._rBlock ^= t;
				this._lBlock ^= t << offset;
			}
			function exchangeRL(offset, mask) {
				var t = (this._rBlock >>> offset ^ this._lBlock) & mask;
				this._lBlock ^= t;
				this._rBlock ^= t << offset;
			}
			/**
			* Shortcut functions to the cipher's object interface.
			*
			* @example
			*
			*     var ciphertext = CryptoJS.DES.encrypt(message, key, cfg);
			*     var plaintext  = CryptoJS.DES.decrypt(ciphertext, key, cfg);
			*/
			C.DES = BlockCipher._createHelper(DES);
			/**
			* Triple-DES block cipher algorithm.
			*/
			var TripleDES = C_algo.TripleDES = BlockCipher.extend({
				_doReset: function() {
					var keyWords = this._key.words;
					if (keyWords.length !== 2 && keyWords.length !== 4 && keyWords.length < 6) throw new Error("Invalid key length - 3DES requires the key length to be 64, 128, 192 or >192.");
					var key1 = keyWords.slice(0, 2);
					var key2 = keyWords.length < 4 ? keyWords.slice(0, 2) : keyWords.slice(2, 4);
					var key3 = keyWords.length < 6 ? keyWords.slice(0, 2) : keyWords.slice(4, 6);
					this._des1 = DES.createEncryptor(WordArray.create(key1));
					this._des2 = DES.createEncryptor(WordArray.create(key2));
					this._des3 = DES.createEncryptor(WordArray.create(key3));
				},
				encryptBlock: function(M, offset) {
					this._des1.encryptBlock(M, offset);
					this._des2.decryptBlock(M, offset);
					this._des3.encryptBlock(M, offset);
				},
				decryptBlock: function(M, offset) {
					this._des3.decryptBlock(M, offset);
					this._des2.encryptBlock(M, offset);
					this._des1.decryptBlock(M, offset);
				},
				keySize: 6,
				ivSize: 2,
				blockSize: 2
			});
			/**
			* Shortcut functions to the cipher's object interface.
			*
			* @example
			*
			*     var ciphertext = CryptoJS.TripleDES.encrypt(message, key, cfg);
			*     var plaintext  = CryptoJS.TripleDES.decrypt(ciphertext, key, cfg);
			*/
			C.TripleDES = BlockCipher._createHelper(TripleDES);
		})();
		(function() {
			var C = CryptoJS;
			var StreamCipher = C.lib.StreamCipher;
			var C_algo = C.algo;
			/**
			* RC4 stream cipher algorithm.
			*/
			var RC4 = C_algo.RC4 = StreamCipher.extend({
				_doReset: function() {
					var key = this._key;
					var keyWords = key.words;
					var keySigBytes = key.sigBytes;
					var S = this._S = [];
					for (var i = 0; i < 256; i++) S[i] = i;
					for (var i = 0, j = 0; i < 256; i++) {
						var keyByteIndex = i % keySigBytes;
						var keyByte = keyWords[keyByteIndex >>> 2] >>> 24 - keyByteIndex % 4 * 8 & 255;
						j = (j + S[i] + keyByte) % 256;
						var t = S[i];
						S[i] = S[j];
						S[j] = t;
					}
					this._i = this._j = 0;
				},
				_doProcessBlock: function(M, offset) {
					M[offset] ^= generateKeystreamWord.call(this);
				},
				keySize: 8,
				ivSize: 0
			});
			function generateKeystreamWord() {
				var S = this._S;
				var i = this._i;
				var j = this._j;
				var keystreamWord = 0;
				for (var n = 0; n < 4; n++) {
					i = (i + 1) % 256;
					j = (j + S[i]) % 256;
					var t = S[i];
					S[i] = S[j];
					S[j] = t;
					keystreamWord |= S[(S[i] + S[j]) % 256] << 24 - n * 8;
				}
				this._i = i;
				this._j = j;
				return keystreamWord;
			}
			/**
			* Shortcut functions to the cipher's object interface.
			*
			* @example
			*
			*     var ciphertext = CryptoJS.RC4.encrypt(message, key, cfg);
			*     var plaintext  = CryptoJS.RC4.decrypt(ciphertext, key, cfg);
			*/
			C.RC4 = StreamCipher._createHelper(RC4);
			/**
			* Modified RC4 stream cipher algorithm.
			*/
			var RC4Drop = C_algo.RC4Drop = RC4.extend({
				/**
				* Configuration options.
				*
				* @property {number} drop The number of keystream words to drop. Default 192
				*/
				cfg: RC4.cfg.extend({ drop: 192 }),
				_doReset: function() {
					RC4._doReset.call(this);
					for (var i = this.cfg.drop; i > 0; i--) generateKeystreamWord.call(this);
				}
			});
			/**
			* Shortcut functions to the cipher's object interface.
			*
			* @example
			*
			*     var ciphertext = CryptoJS.RC4Drop.encrypt(message, key, cfg);
			*     var plaintext  = CryptoJS.RC4Drop.decrypt(ciphertext, key, cfg);
			*/
			C.RC4Drop = StreamCipher._createHelper(RC4Drop);
		})();
		(function() {
			var C = CryptoJS;
			var StreamCipher = C.lib.StreamCipher;
			var C_algo = C.algo;
			var S = [];
			var C_ = [];
			var G = [];
			/**
			* Rabbit stream cipher algorithm
			*/
			var Rabbit = C_algo.Rabbit = StreamCipher.extend({
				_doReset: function() {
					var K = this._key.words;
					var iv = this.cfg.iv;
					for (var i = 0; i < 4; i++) K[i] = (K[i] << 8 | K[i] >>> 24) & 16711935 | (K[i] << 24 | K[i] >>> 8) & 4278255360;
					var X = this._X = [
						K[0],
						K[3] << 16 | K[2] >>> 16,
						K[1],
						K[0] << 16 | K[3] >>> 16,
						K[2],
						K[1] << 16 | K[0] >>> 16,
						K[3],
						K[2] << 16 | K[1] >>> 16
					];
					var C = this._C = [
						K[2] << 16 | K[2] >>> 16,
						K[0] & 4294901760 | K[1] & 65535,
						K[3] << 16 | K[3] >>> 16,
						K[1] & 4294901760 | K[2] & 65535,
						K[0] << 16 | K[0] >>> 16,
						K[2] & 4294901760 | K[3] & 65535,
						K[1] << 16 | K[1] >>> 16,
						K[3] & 4294901760 | K[0] & 65535
					];
					this._b = 0;
					for (var i = 0; i < 4; i++) nextState.call(this);
					for (var i = 0; i < 8; i++) C[i] ^= X[i + 4 & 7];
					if (iv) {
						var IV = iv.words;
						var IV_0 = IV[0];
						var IV_1 = IV[1];
						var i0 = (IV_0 << 8 | IV_0 >>> 24) & 16711935 | (IV_0 << 24 | IV_0 >>> 8) & 4278255360;
						var i2 = (IV_1 << 8 | IV_1 >>> 24) & 16711935 | (IV_1 << 24 | IV_1 >>> 8) & 4278255360;
						var i1 = i0 >>> 16 | i2 & 4294901760;
						var i3 = i2 << 16 | i0 & 65535;
						C[0] ^= i0;
						C[1] ^= i1;
						C[2] ^= i2;
						C[3] ^= i3;
						C[4] ^= i0;
						C[5] ^= i1;
						C[6] ^= i2;
						C[7] ^= i3;
						for (var i = 0; i < 4; i++) nextState.call(this);
					}
				},
				_doProcessBlock: function(M, offset) {
					var X = this._X;
					nextState.call(this);
					S[0] = X[0] ^ X[5] >>> 16 ^ X[3] << 16;
					S[1] = X[2] ^ X[7] >>> 16 ^ X[5] << 16;
					S[2] = X[4] ^ X[1] >>> 16 ^ X[7] << 16;
					S[3] = X[6] ^ X[3] >>> 16 ^ X[1] << 16;
					for (var i = 0; i < 4; i++) {
						S[i] = (S[i] << 8 | S[i] >>> 24) & 16711935 | (S[i] << 24 | S[i] >>> 8) & 4278255360;
						M[offset + i] ^= S[i];
					}
				},
				blockSize: 4,
				ivSize: 2
			});
			function nextState() {
				var X = this._X;
				var C = this._C;
				for (var i = 0; i < 8; i++) C_[i] = C[i];
				C[0] = C[0] + 1295307597 + this._b | 0;
				C[1] = C[1] + 3545052371 + (C[0] >>> 0 < C_[0] >>> 0 ? 1 : 0) | 0;
				C[2] = C[2] + 886263092 + (C[1] >>> 0 < C_[1] >>> 0 ? 1 : 0) | 0;
				C[3] = C[3] + 1295307597 + (C[2] >>> 0 < C_[2] >>> 0 ? 1 : 0) | 0;
				C[4] = C[4] + 3545052371 + (C[3] >>> 0 < C_[3] >>> 0 ? 1 : 0) | 0;
				C[5] = C[5] + 886263092 + (C[4] >>> 0 < C_[4] >>> 0 ? 1 : 0) | 0;
				C[6] = C[6] + 1295307597 + (C[5] >>> 0 < C_[5] >>> 0 ? 1 : 0) | 0;
				C[7] = C[7] + 3545052371 + (C[6] >>> 0 < C_[6] >>> 0 ? 1 : 0) | 0;
				this._b = C[7] >>> 0 < C_[7] >>> 0 ? 1 : 0;
				for (var i = 0; i < 8; i++) {
					var gx = X[i] + C[i];
					var ga = gx & 65535;
					var gb = gx >>> 16;
					var gh = ((ga * ga >>> 17) + ga * gb >>> 15) + gb * gb;
					var gl = ((gx & 4294901760) * gx | 0) + ((gx & 65535) * gx | 0);
					G[i] = gh ^ gl;
				}
				X[0] = G[0] + (G[7] << 16 | G[7] >>> 16) + (G[6] << 16 | G[6] >>> 16) | 0;
				X[1] = G[1] + (G[0] << 8 | G[0] >>> 24) + G[7] | 0;
				X[2] = G[2] + (G[1] << 16 | G[1] >>> 16) + (G[0] << 16 | G[0] >>> 16) | 0;
				X[3] = G[3] + (G[2] << 8 | G[2] >>> 24) + G[1] | 0;
				X[4] = G[4] + (G[3] << 16 | G[3] >>> 16) + (G[2] << 16 | G[2] >>> 16) | 0;
				X[5] = G[5] + (G[4] << 8 | G[4] >>> 24) + G[3] | 0;
				X[6] = G[6] + (G[5] << 16 | G[5] >>> 16) + (G[4] << 16 | G[4] >>> 16) | 0;
				X[7] = G[7] + (G[6] << 8 | G[6] >>> 24) + G[5] | 0;
			}
			/**
			* Shortcut functions to the cipher's object interface.
			*
			* @example
			*
			*     var ciphertext = CryptoJS.Rabbit.encrypt(message, key, cfg);
			*     var plaintext  = CryptoJS.Rabbit.decrypt(ciphertext, key, cfg);
			*/
			C.Rabbit = StreamCipher._createHelper(Rabbit);
		})();
		(function() {
			var C = CryptoJS;
			var StreamCipher = C.lib.StreamCipher;
			var C_algo = C.algo;
			var S = [];
			var C_ = [];
			var G = [];
			/**
			* Rabbit stream cipher algorithm.
			*
			* This is a legacy version that neglected to convert the key to little-endian.
			* This error doesn't affect the cipher's security,
			* but it does affect its compatibility with other implementations.
			*/
			var RabbitLegacy = C_algo.RabbitLegacy = StreamCipher.extend({
				_doReset: function() {
					var K = this._key.words;
					var iv = this.cfg.iv;
					var X = this._X = [
						K[0],
						K[3] << 16 | K[2] >>> 16,
						K[1],
						K[0] << 16 | K[3] >>> 16,
						K[2],
						K[1] << 16 | K[0] >>> 16,
						K[3],
						K[2] << 16 | K[1] >>> 16
					];
					var C = this._C = [
						K[2] << 16 | K[2] >>> 16,
						K[0] & 4294901760 | K[1] & 65535,
						K[3] << 16 | K[3] >>> 16,
						K[1] & 4294901760 | K[2] & 65535,
						K[0] << 16 | K[0] >>> 16,
						K[2] & 4294901760 | K[3] & 65535,
						K[1] << 16 | K[1] >>> 16,
						K[3] & 4294901760 | K[0] & 65535
					];
					this._b = 0;
					for (var i = 0; i < 4; i++) nextState.call(this);
					for (var i = 0; i < 8; i++) C[i] ^= X[i + 4 & 7];
					if (iv) {
						var IV = iv.words;
						var IV_0 = IV[0];
						var IV_1 = IV[1];
						var i0 = (IV_0 << 8 | IV_0 >>> 24) & 16711935 | (IV_0 << 24 | IV_0 >>> 8) & 4278255360;
						var i2 = (IV_1 << 8 | IV_1 >>> 24) & 16711935 | (IV_1 << 24 | IV_1 >>> 8) & 4278255360;
						var i1 = i0 >>> 16 | i2 & 4294901760;
						var i3 = i2 << 16 | i0 & 65535;
						C[0] ^= i0;
						C[1] ^= i1;
						C[2] ^= i2;
						C[3] ^= i3;
						C[4] ^= i0;
						C[5] ^= i1;
						C[6] ^= i2;
						C[7] ^= i3;
						for (var i = 0; i < 4; i++) nextState.call(this);
					}
				},
				_doProcessBlock: function(M, offset) {
					var X = this._X;
					nextState.call(this);
					S[0] = X[0] ^ X[5] >>> 16 ^ X[3] << 16;
					S[1] = X[2] ^ X[7] >>> 16 ^ X[5] << 16;
					S[2] = X[4] ^ X[1] >>> 16 ^ X[7] << 16;
					S[3] = X[6] ^ X[3] >>> 16 ^ X[1] << 16;
					for (var i = 0; i < 4; i++) {
						S[i] = (S[i] << 8 | S[i] >>> 24) & 16711935 | (S[i] << 24 | S[i] >>> 8) & 4278255360;
						M[offset + i] ^= S[i];
					}
				},
				blockSize: 4,
				ivSize: 2
			});
			function nextState() {
				var X = this._X;
				var C = this._C;
				for (var i = 0; i < 8; i++) C_[i] = C[i];
				C[0] = C[0] + 1295307597 + this._b | 0;
				C[1] = C[1] + 3545052371 + (C[0] >>> 0 < C_[0] >>> 0 ? 1 : 0) | 0;
				C[2] = C[2] + 886263092 + (C[1] >>> 0 < C_[1] >>> 0 ? 1 : 0) | 0;
				C[3] = C[3] + 1295307597 + (C[2] >>> 0 < C_[2] >>> 0 ? 1 : 0) | 0;
				C[4] = C[4] + 3545052371 + (C[3] >>> 0 < C_[3] >>> 0 ? 1 : 0) | 0;
				C[5] = C[5] + 886263092 + (C[4] >>> 0 < C_[4] >>> 0 ? 1 : 0) | 0;
				C[6] = C[6] + 1295307597 + (C[5] >>> 0 < C_[5] >>> 0 ? 1 : 0) | 0;
				C[7] = C[7] + 3545052371 + (C[6] >>> 0 < C_[6] >>> 0 ? 1 : 0) | 0;
				this._b = C[7] >>> 0 < C_[7] >>> 0 ? 1 : 0;
				for (var i = 0; i < 8; i++) {
					var gx = X[i] + C[i];
					var ga = gx & 65535;
					var gb = gx >>> 16;
					var gh = ((ga * ga >>> 17) + ga * gb >>> 15) + gb * gb;
					var gl = ((gx & 4294901760) * gx | 0) + ((gx & 65535) * gx | 0);
					G[i] = gh ^ gl;
				}
				X[0] = G[0] + (G[7] << 16 | G[7] >>> 16) + (G[6] << 16 | G[6] >>> 16) | 0;
				X[1] = G[1] + (G[0] << 8 | G[0] >>> 24) + G[7] | 0;
				X[2] = G[2] + (G[1] << 16 | G[1] >>> 16) + (G[0] << 16 | G[0] >>> 16) | 0;
				X[3] = G[3] + (G[2] << 8 | G[2] >>> 24) + G[1] | 0;
				X[4] = G[4] + (G[3] << 16 | G[3] >>> 16) + (G[2] << 16 | G[2] >>> 16) | 0;
				X[5] = G[5] + (G[4] << 8 | G[4] >>> 24) + G[3] | 0;
				X[6] = G[6] + (G[5] << 16 | G[5] >>> 16) + (G[4] << 16 | G[4] >>> 16) | 0;
				X[7] = G[7] + (G[6] << 8 | G[6] >>> 24) + G[5] | 0;
			}
			/**
			* Shortcut functions to the cipher's object interface.
			*
			* @example
			*
			*     var ciphertext = CryptoJS.RabbitLegacy.encrypt(message, key, cfg);
			*     var plaintext  = CryptoJS.RabbitLegacy.decrypt(ciphertext, key, cfg);
			*/
			C.RabbitLegacy = StreamCipher._createHelper(RabbitLegacy);
		})();
		(function() {
			var C = CryptoJS;
			var BlockCipher = C.lib.BlockCipher;
			var C_algo = C.algo;
			const N = 16;
			const ORIG_P = [
				608135816,
				2242054355,
				320440878,
				57701188,
				2752067618,
				698298832,
				137296536,
				3964562569,
				1160258022,
				953160567,
				3193202383,
				887688300,
				3232508343,
				3380367581,
				1065670069,
				3041331479,
				2450970073,
				2306472731
			];
			const ORIG_S = [
				[
					3509652390,
					2564797868,
					805139163,
					3491422135,
					3101798381,
					1780907670,
					3128725573,
					4046225305,
					614570311,
					3012652279,
					134345442,
					2240740374,
					1667834072,
					1901547113,
					2757295779,
					4103290238,
					227898511,
					1921955416,
					1904987480,
					2182433518,
					2069144605,
					3260701109,
					2620446009,
					720527379,
					3318853667,
					677414384,
					3393288472,
					3101374703,
					2390351024,
					1614419982,
					1822297739,
					2954791486,
					3608508353,
					3174124327,
					2024746970,
					1432378464,
					3864339955,
					2857741204,
					1464375394,
					1676153920,
					1439316330,
					715854006,
					3033291828,
					289532110,
					2706671279,
					2087905683,
					3018724369,
					1668267050,
					732546397,
					1947742710,
					3462151702,
					2609353502,
					2950085171,
					1814351708,
					2050118529,
					680887927,
					999245976,
					1800124847,
					3300911131,
					1713906067,
					1641548236,
					4213287313,
					1216130144,
					1575780402,
					4018429277,
					3917837745,
					3693486850,
					3949271944,
					596196993,
					3549867205,
					258830323,
					2213823033,
					772490370,
					2760122372,
					1774776394,
					2652871518,
					566650946,
					4142492826,
					1728879713,
					2882767088,
					1783734482,
					3629395816,
					2517608232,
					2874225571,
					1861159788,
					326777828,
					3124490320,
					2130389656,
					2716951837,
					967770486,
					1724537150,
					2185432712,
					2364442137,
					1164943284,
					2105845187,
					998989502,
					3765401048,
					2244026483,
					1075463327,
					1455516326,
					1322494562,
					910128902,
					469688178,
					1117454909,
					936433444,
					3490320968,
					3675253459,
					1240580251,
					122909385,
					2157517691,
					634681816,
					4142456567,
					3825094682,
					3061402683,
					2540495037,
					79693498,
					3249098678,
					1084186820,
					1583128258,
					426386531,
					1761308591,
					1047286709,
					322548459,
					995290223,
					1845252383,
					2603652396,
					3431023940,
					2942221577,
					3202600964,
					3727903485,
					1712269319,
					422464435,
					3234572375,
					1170764815,
					3523960633,
					3117677531,
					1434042557,
					442511882,
					3600875718,
					1076654713,
					1738483198,
					4213154764,
					2393238008,
					3677496056,
					1014306527,
					4251020053,
					793779912,
					2902807211,
					842905082,
					4246964064,
					1395751752,
					1040244610,
					2656851899,
					3396308128,
					445077038,
					3742853595,
					3577915638,
					679411651,
					2892444358,
					2354009459,
					1767581616,
					3150600392,
					3791627101,
					3102740896,
					284835224,
					4246832056,
					1258075500,
					768725851,
					2589189241,
					3069724005,
					3532540348,
					1274779536,
					3789419226,
					2764799539,
					1660621633,
					3471099624,
					4011903706,
					913787905,
					3497959166,
					737222580,
					2514213453,
					2928710040,
					3937242737,
					1804850592,
					3499020752,
					2949064160,
					2386320175,
					2390070455,
					2415321851,
					4061277028,
					2290661394,
					2416832540,
					1336762016,
					1754252060,
					3520065937,
					3014181293,
					791618072,
					3188594551,
					3933548030,
					2332172193,
					3852520463,
					3043980520,
					413987798,
					3465142937,
					3030929376,
					4245938359,
					2093235073,
					3534596313,
					375366246,
					2157278981,
					2479649556,
					555357303,
					3870105701,
					2008414854,
					3344188149,
					4221384143,
					3956125452,
					2067696032,
					3594591187,
					2921233993,
					2428461,
					544322398,
					577241275,
					1471733935,
					610547355,
					4027169054,
					1432588573,
					1507829418,
					2025931657,
					3646575487,
					545086370,
					48609733,
					2200306550,
					1653985193,
					298326376,
					1316178497,
					3007786442,
					2064951626,
					458293330,
					2589141269,
					3591329599,
					3164325604,
					727753846,
					2179363840,
					146436021,
					1461446943,
					4069977195,
					705550613,
					3059967265,
					3887724982,
					4281599278,
					3313849956,
					1404054877,
					2845806497,
					146425753,
					1854211946
				],
				[
					1266315497,
					3048417604,
					3681880366,
					3289982499,
					290971e4,
					1235738493,
					2632868024,
					2414719590,
					3970600049,
					1771706367,
					1449415276,
					3266420449,
					422970021,
					1963543593,
					2690192192,
					3826793022,
					1062508698,
					1531092325,
					1804592342,
					2583117782,
					2714934279,
					4024971509,
					1294809318,
					4028980673,
					1289560198,
					2221992742,
					1669523910,
					35572830,
					157838143,
					1052438473,
					1016535060,
					1802137761,
					1753167236,
					1386275462,
					3080475397,
					2857371447,
					1040679964,
					2145300060,
					2390574316,
					1461121720,
					2956646967,
					4031777805,
					4028374788,
					33600511,
					2920084762,
					1018524850,
					629373528,
					3691585981,
					3515945977,
					2091462646,
					2486323059,
					586499841,
					988145025,
					935516892,
					3367335476,
					2599673255,
					2839830854,
					265290510,
					3972581182,
					2759138881,
					3795373465,
					1005194799,
					847297441,
					406762289,
					1314163512,
					1332590856,
					1866599683,
					4127851711,
					750260880,
					613907577,
					1450815602,
					3165620655,
					3734664991,
					3650291728,
					3012275730,
					3704569646,
					1427272223,
					778793252,
					1343938022,
					2676280711,
					2052605720,
					1946737175,
					3164576444,
					3914038668,
					3967478842,
					3682934266,
					1661551462,
					3294938066,
					4011595847,
					840292616,
					3712170807,
					616741398,
					312560963,
					711312465,
					1351876610,
					322626781,
					1910503582,
					271666773,
					2175563734,
					1594956187,
					70604529,
					3617834859,
					1007753275,
					1495573769,
					4069517037,
					2549218298,
					2663038764,
					504708206,
					2263041392,
					3941167025,
					2249088522,
					1514023603,
					1998579484,
					1312622330,
					694541497,
					2582060303,
					2151582166,
					1382467621,
					776784248,
					2618340202,
					3323268794,
					2497899128,
					2784771155,
					503983604,
					4076293799,
					907881277,
					423175695,
					432175456,
					1378068232,
					4145222326,
					3954048622,
					3938656102,
					3820766613,
					2793130115,
					2977904593,
					26017576,
					3274890735,
					3194772133,
					1700274565,
					1756076034,
					4006520079,
					3677328699,
					720338349,
					1533947780,
					354530856,
					688349552,
					3973924725,
					1637815568,
					332179504,
					3949051286,
					53804574,
					2852348879,
					3044236432,
					1282449977,
					3583942155,
					3416972820,
					4006381244,
					1617046695,
					2628476075,
					3002303598,
					1686838959,
					431878346,
					2686675385,
					1700445008,
					1080580658,
					1009431731,
					832498133,
					3223435511,
					2605976345,
					2271191193,
					2516031870,
					1648197032,
					4164389018,
					2548247927,
					300782431,
					375919233,
					238389289,
					3353747414,
					2531188641,
					2019080857,
					1475708069,
					455242339,
					2609103871,
					448939670,
					3451063019,
					1395535956,
					2413381860,
					1841049896,
					1491858159,
					885456874,
					4264095073,
					4001119347,
					1565136089,
					3898914787,
					1108368660,
					540939232,
					1173283510,
					2745871338,
					3681308437,
					4207628240,
					3343053890,
					4016749493,
					1699691293,
					1103962373,
					3625875870,
					2256883143,
					3830138730,
					1031889488,
					3479347698,
					1535977030,
					4236805024,
					3251091107,
					2132092099,
					1774941330,
					1199868427,
					1452454533,
					157007616,
					2904115357,
					342012276,
					595725824,
					1480756522,
					206960106,
					497939518,
					591360097,
					863170706,
					2375253569,
					3596610801,
					1814182875,
					2094937945,
					3421402208,
					1082520231,
					3463918190,
					2785509508,
					435703966,
					3908032597,
					1641649973,
					2842273706,
					3305899714,
					1510255612,
					2148256476,
					2655287854,
					3276092548,
					4258621189,
					236887753,
					3681803219,
					274041037,
					1734335097,
					3815195456,
					3317970021,
					1899903192,
					1026095262,
					4050517792,
					356393447,
					2410691914,
					3873677099,
					3682840055
				],
				[
					3913112168,
					2491498743,
					4132185628,
					2489919796,
					1091903735,
					1979897079,
					3170134830,
					3567386728,
					3557303409,
					857797738,
					1136121015,
					1342202287,
					507115054,
					2535736646,
					337727348,
					3213592640,
					1301675037,
					2528481711,
					1895095763,
					1721773893,
					3216771564,
					62756741,
					2142006736,
					835421444,
					2531993523,
					1442658625,
					3659876326,
					2882144922,
					676362277,
					1392781812,
					170690266,
					3921047035,
					1759253602,
					3611846912,
					1745797284,
					664899054,
					1329594018,
					3901205900,
					3045908486,
					2062866102,
					2865634940,
					3543621612,
					3464012697,
					1080764994,
					553557557,
					3656615353,
					3996768171,
					991055499,
					499776247,
					1265440854,
					648242737,
					3940784050,
					980351604,
					3713745714,
					1749149687,
					3396870395,
					4211799374,
					3640570775,
					1161844396,
					3125318951,
					1431517754,
					545492359,
					4268468663,
					3499529547,
					1437099964,
					2702547544,
					3433638243,
					2581715763,
					2787789398,
					1060185593,
					1593081372,
					2418618748,
					4260947970,
					69676912,
					2159744348,
					86519011,
					2512459080,
					3838209314,
					1220612927,
					3339683548,
					133810670,
					1090789135,
					1078426020,
					1569222167,
					845107691,
					3583754449,
					4072456591,
					1091646820,
					628848692,
					1613405280,
					3757631651,
					526609435,
					236106946,
					48312990,
					2942717905,
					3402727701,
					1797494240,
					859738849,
					992217954,
					4005476642,
					2243076622,
					3870952857,
					3732016268,
					765654824,
					3490871365,
					2511836413,
					1685915746,
					3888969200,
					1414112111,
					2273134842,
					3281911079,
					4080962846,
					172450625,
					2569994100,
					980381355,
					4109958455,
					2819808352,
					2716589560,
					2568741196,
					3681446669,
					3329971472,
					1835478071,
					660984891,
					3704678404,
					4045999559,
					3422617507,
					3040415634,
					1762651403,
					1719377915,
					3470491036,
					2693910283,
					3642056355,
					3138596744,
					1364962596,
					2073328063,
					1983633131,
					926494387,
					3423689081,
					2150032023,
					4096667949,
					1749200295,
					3328846651,
					309677260,
					2016342300,
					1779581495,
					3079819751,
					111262694,
					1274766160,
					443224088,
					298511866,
					1025883608,
					3806446537,
					1145181785,
					168956806,
					3641502830,
					3584813610,
					1689216846,
					3666258015,
					3200248200,
					1692713982,
					2646376535,
					4042768518,
					1618508792,
					1610833997,
					3523052358,
					4130873264,
					2001055236,
					3610705100,
					2202168115,
					4028541809,
					2961195399,
					1006657119,
					2006996926,
					3186142756,
					1430667929,
					3210227297,
					1314452623,
					4074634658,
					4101304120,
					2273951170,
					1399257539,
					3367210612,
					3027628629,
					1190975929,
					2062231137,
					2333990788,
					2221543033,
					2438960610,
					1181637006,
					548689776,
					2362791313,
					3372408396,
					3104550113,
					3145860560,
					296247880,
					1970579870,
					3078560182,
					3769228297,
					1714227617,
					3291629107,
					3898220290,
					166772364,
					1251581989,
					493813264,
					448347421,
					195405023,
					2709975567,
					677966185,
					3703036547,
					1463355134,
					2715995803,
					1338867538,
					1343315457,
					2802222074,
					2684532164,
					233230375,
					2599980071,
					2000651841,
					3277868038,
					1638401717,
					4028070440,
					3237316320,
					6314154,
					819756386,
					300326615,
					590932579,
					1405279636,
					3267499572,
					3150704214,
					2428286686,
					3959192993,
					3461946742,
					1862657033,
					1266418056,
					963775037,
					2089974820,
					2263052895,
					1917689273,
					448879540,
					3550394620,
					3981727096,
					150775221,
					3627908307,
					1303187396,
					508620638,
					2975983352,
					2726630617,
					1817252668,
					1876281319,
					1457606340,
					908771278,
					3720792119,
					3617206836,
					2455994898,
					1729034894,
					1080033504
				],
				[
					976866871,
					3556439503,
					2881648439,
					1522871579,
					1555064734,
					1336096578,
					3548522304,
					2579274686,
					3574697629,
					3205460757,
					3593280638,
					3338716283,
					3079412587,
					564236357,
					2993598910,
					1781952180,
					1464380207,
					3163844217,
					3332601554,
					1699332808,
					1393555694,
					1183702653,
					3581086237,
					1288719814,
					691649499,
					2847557200,
					2895455976,
					3193889540,
					2717570544,
					1781354906,
					1676643554,
					2592534050,
					3230253752,
					1126444790,
					2770207658,
					2633158820,
					2210423226,
					2615765581,
					2414155088,
					3127139286,
					673620729,
					2805611233,
					1269405062,
					4015350505,
					3341807571,
					4149409754,
					1057255273,
					2012875353,
					2162469141,
					2276492801,
					2601117357,
					993977747,
					3918593370,
					2654263191,
					753973209,
					36408145,
					2530585658,
					25011837,
					3520020182,
					2088578344,
					530523599,
					2918365339,
					1524020338,
					1518925132,
					3760827505,
					3759777254,
					1202760957,
					3985898139,
					3906192525,
					674977740,
					4174734889,
					2031300136,
					2019492241,
					3983892565,
					4153806404,
					3822280332,
					352677332,
					2297720250,
					60907813,
					90501309,
					3286998549,
					1016092578,
					2535922412,
					2839152426,
					457141659,
					509813237,
					4120667899,
					652014361,
					1966332200,
					2975202805,
					55981186,
					2327461051,
					676427537,
					3255491064,
					2882294119,
					3433927263,
					1307055953,
					942726286,
					933058658,
					2468411793,
					3933900994,
					4215176142,
					1361170020,
					2001714738,
					2830558078,
					3274259782,
					1222529897,
					1679025792,
					2729314320,
					3714953764,
					1770335741,
					151462246,
					3013232138,
					1682292957,
					1483529935,
					471910574,
					1539241949,
					458788160,
					3436315007,
					1807016891,
					3718408830,
					978976581,
					1043663428,
					3165965781,
					1927990952,
					4200891579,
					2372276910,
					3208408903,
					3533431907,
					1412390302,
					2931980059,
					4132332400,
					1947078029,
					3881505623,
					4168226417,
					2941484381,
					1077988104,
					1320477388,
					886195818,
					18198404,
					3786409e3,
					2509781533,
					112762804,
					3463356488,
					1866414978,
					891333506,
					18488651,
					661792760,
					1628790961,
					3885187036,
					3141171499,
					876946877,
					2693282273,
					1372485963,
					791857591,
					2686433993,
					3759982718,
					3167212022,
					3472953795,
					2716379847,
					445679433,
					3561995674,
					3504004811,
					3574258232,
					54117162,
					3331405415,
					2381918588,
					3769707343,
					4154350007,
					1140177722,
					4074052095,
					668550556,
					3214352940,
					367459370,
					261225585,
					2610173221,
					4209349473,
					3468074219,
					3265815641,
					314222801,
					3066103646,
					3808782860,
					282218597,
					3406013506,
					3773591054,
					379116347,
					1285071038,
					846784868,
					2669647154,
					3771962079,
					3550491691,
					2305946142,
					453669953,
					1268987020,
					3317592352,
					3279303384,
					3744833421,
					2610507566,
					3859509063,
					266596637,
					3847019092,
					517658769,
					3462560207,
					3443424879,
					370717030,
					4247526661,
					2224018117,
					4143653529,
					4112773975,
					2788324899,
					2477274417,
					1456262402,
					2901442914,
					1517677493,
					1846949527,
					2295493580,
					3734397586,
					2176403920,
					1280348187,
					1908823572,
					3871786941,
					846861322,
					1172426758,
					3287448474,
					3383383037,
					1655181056,
					3139813346,
					901632758,
					1897031941,
					2986607138,
					3066810236,
					3447102507,
					1393639104,
					373351379,
					950779232,
					625454576,
					3124240540,
					4148612726,
					2007998917,
					544563296,
					2244738638,
					2330496472,
					2058025392,
					1291430526,
					424198748,
					50039436,
					29584100,
					3605783033,
					2429876329,
					2791104160,
					1057563949,
					3255363231,
					3075367218,
					3463963227,
					1469046755,
					985887462
				]
			];
			var BLOWFISH_CTX = {
				pbox: [],
				sbox: []
			};
			function F(ctx, x) {
				let a = x >> 24 & 255;
				let b = x >> 16 & 255;
				let c = x >> 8 & 255;
				let d = x & 255;
				let y = ctx.sbox[0][a] + ctx.sbox[1][b];
				y = y ^ ctx.sbox[2][c];
				y = y + ctx.sbox[3][d];
				return y;
			}
			function BlowFish_Encrypt(ctx, left, right) {
				let Xl = left;
				let Xr = right;
				let temp;
				for (let i = 0; i < N; ++i) {
					Xl = Xl ^ ctx.pbox[i];
					Xr = F(ctx, Xl) ^ Xr;
					temp = Xl;
					Xl = Xr;
					Xr = temp;
				}
				temp = Xl;
				Xl = Xr;
				Xr = temp;
				Xr = Xr ^ ctx.pbox[N];
				Xl = Xl ^ ctx.pbox[17];
				return {
					left: Xl,
					right: Xr
				};
			}
			function BlowFish_Decrypt(ctx, left, right) {
				let Xl = left;
				let Xr = right;
				let temp;
				for (let i = 17; i > 1; --i) {
					Xl = Xl ^ ctx.pbox[i];
					Xr = F(ctx, Xl) ^ Xr;
					temp = Xl;
					Xl = Xr;
					Xr = temp;
				}
				temp = Xl;
				Xl = Xr;
				Xr = temp;
				Xr = Xr ^ ctx.pbox[1];
				Xl = Xl ^ ctx.pbox[0];
				return {
					left: Xl,
					right: Xr
				};
			}
			/**
			* Initialization ctx's pbox and sbox.
			*
			* @param {Object} ctx The object has pbox and sbox.
			* @param {Array} key An array of 32-bit words.
			* @param {int} keysize The length of the key.
			*
			* @example
			*
			*     BlowFishInit(BLOWFISH_CTX, key, 128/32);
			*/
			function BlowFishInit(ctx, key, keysize) {
				for (let Row = 0; Row < 4; Row++) {
					ctx.sbox[Row] = [];
					for (let Col = 0; Col < 256; Col++) ctx.sbox[Row][Col] = ORIG_S[Row][Col];
				}
				let keyIndex = 0;
				for (let index = 0; index < 18; index++) {
					ctx.pbox[index] = ORIG_P[index] ^ key[keyIndex];
					keyIndex++;
					if (keyIndex >= keysize) keyIndex = 0;
				}
				let Data1 = 0;
				let Data2 = 0;
				let res = 0;
				for (let i = 0; i < 18; i += 2) {
					res = BlowFish_Encrypt(ctx, Data1, Data2);
					Data1 = res.left;
					Data2 = res.right;
					ctx.pbox[i] = Data1;
					ctx.pbox[i + 1] = Data2;
				}
				for (let i = 0; i < 4; i++) for (let j = 0; j < 256; j += 2) {
					res = BlowFish_Encrypt(ctx, Data1, Data2);
					Data1 = res.left;
					Data2 = res.right;
					ctx.sbox[i][j] = Data1;
					ctx.sbox[i][j + 1] = Data2;
				}
				return true;
			}
			/**
			* Blowfish block cipher algorithm.
			*/
			var Blowfish = C_algo.Blowfish = BlockCipher.extend({
				_doReset: function() {
					if (this._keyPriorReset === this._key) return;
					var key = this._keyPriorReset = this._key;
					var keyWords = key.words;
					BlowFishInit(BLOWFISH_CTX, keyWords, key.sigBytes / 4);
				},
				encryptBlock: function(M, offset) {
					var res = BlowFish_Encrypt(BLOWFISH_CTX, M[offset], M[offset + 1]);
					M[offset] = res.left;
					M[offset + 1] = res.right;
				},
				decryptBlock: function(M, offset) {
					var res = BlowFish_Decrypt(BLOWFISH_CTX, M[offset], M[offset + 1]);
					M[offset] = res.left;
					M[offset + 1] = res.right;
				},
				blockSize: 2,
				keySize: 4,
				ivSize: 2
			});
			/**
			* Shortcut functions to the cipher's object interface.
			*
			* @example
			*
			*     var ciphertext = CryptoJS.Blowfish.encrypt(message, key, cfg);
			*     var plaintext  = CryptoJS.Blowfish.decrypt(ciphertext, key, cfg);
			*/
			C.Blowfish = BlockCipher._createHelper(Blowfish);
		})();
		return CryptoJS;
	});
	var crypto_es_default = module.exports;
	//#endregion
	//#region src/webBridge/api/cookies.js
	const NETEASE_DOMAINS = [
		"music.163.com",
		".music.163.com",
		"www.music.163.com",
		".163.com",
		"163.com",
		"interface.music.163.com",
		"interface3.music.163.com",
		".126.net"
	];
	const NETEASE_URLS = [
		"https://music.163.com/",
		"https://music.163.com",
		"https://www.music.163.com/",
		"https://interface.music.163.com/",
		"https://interface3.music.163.com/"
	];
	const QQ_DOMAINS = [
		"y.qq.com",
		".y.qq.com",
		".qq.com",
		"qq.com",
		"i.y.qq.com",
		"graph.qq.com",
		".graph.qq.com",
		"u.y.qq.com",
		".tencent.com"
	];
	const QQ_URLS = [
		"https://y.qq.com/",
		"https://y.qq.com",
		"https://i.y.qq.com/",
		"https://u.y.qq.com/",
		"https://graph.qq.com/",
		"https://qq.com/"
	];
	const QQ_COOKIE_KEYS = [
		"uin",
		"p_uin",
		"wxuin",
		"qqmusic_uin",
		"qm_keyst",
		"qqmusic_key",
		"music_key",
		"p_skey",
		"skey",
		"wxskey",
		"login_type",
		"vipType",
		"vip_type",
		"green_vip_level",
		"luxury_vip_level",
		"music_vip_level",
		"psrf_qqaccess_token",
		"psrf_qqrefresh_token",
		"wxuin",
		"wxopenid",
		"tmeLoginType"
	];
	const KG_DOMAINS = [
		"kugou.com",
		".kugou.com",
		"www.kugou.com",
		"m.kugou.com",
		".kugou.net"
	];
	const KG_URLS = [
		"https://www.kugou.com/",
		"https://kugou.com/",
		"https://m.kugou.com/"
	];
	const KG_COOKIE_KEYS = [
		"userid",
		"token",
		"KugooID",
		"KuGoo",
		"Kugoo",
		"NickName",
		"nickname",
		"kg_mid",
		"kugouid",
		"pic",
		"user_pic",
		"avatar",
		"headpic",
		"userpic",
		"dfid",
		"DFID",
		"KToken",
		"t",
		"t1",
		"KugooPwd",
		"vip_type",
		"vip_token",
		"VIPType",
		"VipType",
		"musicvip",
		"MusicPack",
		"musicpack",
		"is_vip",
		"IsVIP",
		"isVIP",
		"su_vip",
		"m_type",
		"y_type",
		"music_vip",
		"VipLevel",
		"vip_level",
		"vip_endtime",
		"vip_end_time",
		"su_vip_end_time",
		"m_end_time",
		"KUGOU_API_PLATFORM",
		"KUGOU_API_GUID",
		"KUGOU_API_MID",
		"KUGOU_API_DEV",
		"KUGOU_API_MAC",
		"KUGOU_API_WEBGL"
	];
	const NETEASE_KEY_NAMES = [
		"MUSIC_U",
		"MUSIC_A",
		"__csrf",
		"NMTID",
		"WNMCID",
		"WEVNSM",
		"_ntes_nuid",
		"_ntes_nnid",
		"MUSIC_R_U"
	];
	const COOKIE_CACHE_TTL_MS = 2500;
	const PERSISTENT_COOKIE_MAX_AGE_SEC = 3456e4;
	const cookieCache = /* @__PURE__ */ new Map();
	const BRIDGE_COOKIE_STORAGE_KEYS = {
		netease: "foliaBridgeNeteaseCookie",
		qq: "foliaBridgeQqCookie",
		kg: "foliaBridgeKgCookie"
	};
	/** 桥对外的 provider 名 → 上面那张表的内部名（酷狗在表里叫 `kg`）。 */
	const BRIDGE_PROVIDER_STORAGE_IDS = {
		netease: "netease",
		qq: "qq",
		kugou: "kg"
	};
	/**
	* 请求带来的会话：页面 localStorage 里的那一份。
	*
	* 在这之前，会话只活在**这个桥进程的内存里** —— `chrome.cookies` 罐加 `chrome.storage.local`
	* 垫片，进程一重启（`pm2 restart`）就全没了；页面侧除了扫码确认那一次（803），再没有把会话
	* 交回来的通道。于是桥重启后页面明明还存着会话，桥却一律当游客：播放地址、歌单、账号信息
	* 全都退回未登录的形状。
	*
	* 现在会话的所有者是页面：每次请求把那份会话带进来（请求里的 `sessionCookies`），
	* 处理这次请求期间它**优先**于罐里那份（`readStoredProviderCookie` 先看这里），
	* 答复里再把最新的会话交回页面（`__foliaBridgeSession`，见 folia.js）。
	*
	* 这张表只在一次请求里有效，请求结束就清掉（`dropRequestSession`）—— 跨请求的持久化由页面
	* 负责，这个进程不再假装自己记得谁登录过。请求没带会话时行为与以前完全一样。
	*/
	const requestSessions = /* @__PURE__ */ new Map();
	/** 把客户端带来的一串 / 一组 / 一个对象归一成 `name=value; name=value`。 */
	function cookieHeaderFromClient(value) {
		if (typeof value === "string") return value.trim();
		if (Array.isArray(value)) return value.map((item) => {
			const name = item && item.name;
			const itemValue = normalizeCookieValue(item);
			return name && itemValue ? `${name}=${itemValue}` : "";
		}).filter(Boolean).join("; ");
		if (value && typeof value === "object") return Object.entries(value).map(([name, itemValue]) => {
			const normalized = normalizeCookieValue(itemValue);
			return name && normalized ? `${name}=${normalized}` : "";
		}).filter(Boolean).join("; ");
		return "";
	}
	/**
	* 请求开始时收下客户端带来的会话。
	*
	* `provider` 用桥对外的名字（`qq` / `netease` / `kugou`）；`cookies` 可以是 Cookie 头字符串、
	* `[{ name, value }]`，或者 `{ name: value }`。空值不覆盖已有的那份 —— 请求没带不等于要把
	* 会话清掉。认不出 provider 时什么都不做（`bodian` 这类没有会话的）。
	*/
	function adoptRequestSession(provider, cookies) {
		const storageProvider = BRIDGE_PROVIDER_STORAGE_IDS[String(provider || "").toLowerCase()];
		const header = cookieHeaderFromClient(cookies);
		if (!storageProvider || !header) return "";
		requestSessions.set(storageProvider, header);
		clearCookieCache();
		return header;
	}
	/** 请求结束：会话不留在进程里，下一份从下一个请求来。 */
	function dropRequestSession() {
		if (!requestSessions.size) return;
		requestSessions.clear();
		clearCookieCache();
	}
	/**
	* 这次请求手里那份会话：客户端带来的（优先），或这个进程存着的那份。
	*
	* 注意这里**只读会话**，不并 cookie 罐里那些搬运 cookie（ptcz / RK / qrsig 之类）。答复里交给
	* 页面的就是它：页面存的是「登录凭据」这件事，不是这个进程的罐。罐里的东西留在桥这边合并，
	* 未登录时也就不会拿一串搬运 cookie 把页面存的会话顶掉（那会让页面以为自己是登录的）。
	*/
	async function currentProviderSession(provider) {
		const storageProvider = BRIDGE_PROVIDER_STORAGE_IDS[String(provider || "").toLowerCase()];
		if (!storageProvider) return "";
		const carried = requestSessions.get(storageProvider);
		if (carried) return carried;
		return await readStoredProviderCookie(storageProvider);
	}
	function persistentCookieExpirationDate() {
		return Math.floor(Date.now() / 1e3) + PERSISTENT_COOKIE_MAX_AGE_SEC;
	}
	function cookieDomainForUrl(baseUrl) {
		try {
			const host = new URL(baseUrl).hostname.toLowerCase();
			if (host === "kugou.com" || host.endsWith(".kugou.com")) return ".kugou.com";
			if (host === "kugou.net" || host.endsWith(".kugou.net")) return ".kugou.net";
			if (host.endsWith(".qq.com")) return ".qq.com";
			if (host.endsWith(".163.com")) return ".163.com";
		} catch (_) {}
	}
	/**
	* cookie 的值只能是可见 ASCII（0x20–0x7E）。
	*
	* 之前昵称是原样写进去的：中文昵称会进到 `NickName` 与那个用 `&` 拼起来的整包值里，
	* 而它落在整站共用的域上，于是这个域下**每一个**请求都带着它。原生侧把 cookie 库里的值
	* 拼成 Cookie 头时逐个检查字符，遇到范围外的当场抛
	* `Unexpected char 0x4e1c at 414 in Cookie value` —— 请求连发出去的机会都没有，
	* 页面侧看到的就是登录第一步立刻失败、错误码还标成 `network`。
	*
	* 只把范围外的字符按 UTF-8 百分号编码：token、签名、`;` `=` `&` 这些分隔符一个字节都不动，
	* 读回来的方向由 decodeKGCookieValue 那一路负责（它本来就在解码）。
	*/
	function encodeCookieValue(value) {
		const text = String(value == null ? "" : value);
		if (!/[^\x20-\x7E]/.test(text)) return text;
		return text.replace(/[^\x20-\x7E]/g, (char) => encodeURIComponent(char));
	}
	function buildPersistentCookieSetOptions(baseUrl, name, value) {
		const domain = cookieDomainForUrl(baseUrl);
		return {
			url: baseUrl,
			name,
			value: encodeCookieValue(value),
			path: "/",
			secure: true,
			expirationDate: persistentCookieExpirationDate(),
			...domain ? { domain } : {}
		};
	}
	function clearCookieCache() {
		cookieCache.clear();
	}
	async function saveProviderCookie(provider, cookieHeader) {
		const storageKey = BRIDGE_COOKIE_STORAGE_KEYS[provider];
		const cookie = typeof cookieHeader === "string" ? cookieHeader.trim() : Array.isArray(cookieHeader) ? cookieHeader.map((item) => {
			const name = item?.name;
			const value = normalizeCookieValue(item);
			return name && value ? `${name}=${value}` : "";
		}).filter(Boolean).join("; ") : cookieHeader && typeof cookieHeader === "object" ? Object.entries(cookieHeader).map(([name, value]) => {
			const normalized = normalizeCookieValue(value);
			return name && normalized ? `${name}=${normalized}` : "";
		}).filter(Boolean).join("; ") : "";
		if (cookie && requestSessions.has(provider)) {
			requestSessions.set(provider, mergeCookieHeaders(requestSessions.get(provider), cookie));
			clearCookieCache();
		}
		if (!storageKey || !cookie || !chrome.storage?.local) return;
		try {
			const merged = mergeCookieHeaders((await chrome.storage.local.get([storageKey]))?.[storageKey] || "", cookie);
			await chrome.storage.local.set({ [storageKey]: merged });
		} catch (_) {}
		clearCookieCache();
	}
	async function readStoredProviderCookie(provider) {
		const carried = requestSessions.get(provider);
		if (carried) return carried;
		const storageKey = BRIDGE_COOKIE_STORAGE_KEYS[provider];
		if (!storageKey || !chrome.storage?.local) return "";
		try {
			const stored = await chrome.storage.local.get([storageKey]);
			return String(stored?.[storageKey] || "");
		} catch (_) {
			return "";
		}
	}
	function mergeCookieHeaders(...headers) {
		const merged = /* @__PURE__ */ new Map();
		headers.forEach((header) => {
			Object.entries(parseCookieString(header)).forEach(([name, value]) => {
				if (name && value !== "") merged.set(name, value);
			});
		});
		return Array.from(merged, ([name, value]) => `${name}=${value}`).join("; ");
	}
	const QQ_SESSION_AUTHORITY_COOKIE_NAMES = /* @__PURE__ */ new Set([
		"uin",
		"p_uin",
		"qqmusic_uin",
		"qm_keyst",
		"qqmusic_key",
		"music_key",
		"p_skey",
		"skey",
		"wxuin",
		"wxopenid",
		"wxskey",
		"wxrefresh_token",
		"str_musicid",
		"login_type",
		"tmeLoginType"
	]);
	/**
	* QQ 的会话头：cookie 罐提供传输类 cookie，账号凭据以本次登录落下的会话为准。
	* 没存过会话时（例如还没登录）行为与整罐合并一致。
	*/
	function mergeQQSessionCookieHeader(stored, collected) {
		const sessionCookies = parseCookieString(stored);
		const merged = /* @__PURE__ */ new Map();
		Object.entries(parseCookieString(collected)).forEach(([name, value]) => {
			if (name && value !== "") merged.set(name, value);
		});
		Object.entries(sessionCookies).forEach(([name, value]) => {
			if (!name || value === "") return;
			if (QQ_SESSION_AUTHORITY_COOKIE_NAMES.has(name)) merged.set(name, value);
			else if (!merged.has(name)) merged.set(name, value);
		});
		return Array.from(merged, ([name, value]) => `${name}=${value}`).join("; ");
	}
	async function withStoredCookie(provider, build) {
		const [collected, stored] = await Promise.all([build(), readStoredProviderCookie(provider)]);
		return mergeCookieHeaders(stored, collected);
	}
	async function withCookieCache(key, build) {
		const hit = cookieCache.get(key);
		const now = Date.now();
		if (hit && now - hit.at < COOKIE_CACHE_TTL_MS) return hit.value;
		const value = await build();
		cookieCache.set(key, {
			value,
			at: now
		});
		return value;
	}
	async function collectCookieHeader(domains, urls, keyNames, keyUrl) {
		const picked = /* @__PURE__ */ new Map();
		await Promise.all([
			...(domains || []).map(async (domain) => {
				try {
					await mergeCookieList(picked, await chrome.cookies.getAll({ domain }));
				} catch (_) {}
			}),
			...(urls || []).map(async (url) => {
				try {
					await mergeCookieList(picked, await chrome.cookies.getAll({ url }));
				} catch (_) {}
			}),
			...(keyNames || []).map(async (name) => {
				try {
					const item = await chrome.cookies.get({
						url: keyUrl,
						name
					});
					if (item && item.value) picked.set(name, item.value);
				} catch (_) {}
			})
		]);
		return Array.from(picked.entries()).map(([name, value]) => `${name}=${value}`).join("; ");
	}
	async function mergeCookieList(picked, list) {
		(list || []).forEach((item) => {
			if (item && item.name && item.value != null && item.value !== "") picked.set(item.name, item.value);
		});
	}
	async function getNeteaseCookie() {
		return withCookieCache("netease", () => withStoredCookie("netease", () => collectCookieHeader(NETEASE_DOMAINS, NETEASE_URLS, NETEASE_KEY_NAMES, "https://music.163.com/")));
	}
	async function getQQCookie() {
		return withCookieCache("qq", async () => {
			const [collected, stored] = await Promise.all([collectCookieHeader(QQ_DOMAINS, QQ_URLS, QQ_COOKIE_KEYS, "https://y.qq.com/"), readStoredProviderCookie("qq")]);
			return mergeQQSessionCookieHeader(stored, collected);
		});
	}
	async function getKGCookie$1() {
		return withCookieCache("kg", () => withStoredCookie("kg", () => collectCookieHeader(KG_DOMAINS, KG_URLS, KG_COOKIE_KEYS, "https://www.kugou.com/")));
	}
	function parseCookieString(header) {
		const out = {};
		String(header || "").split(";").forEach((part) => {
			const idx = part.indexOf("=");
			if (idx <= 0) return;
			const key = part.slice(0, idx).trim();
			const value = part.slice(idx + 1).trim();
			if (key) out[key] = value;
		});
		return out;
	}
	function normalizeCookieValue(value) {
		if (value == null) return "";
		if (typeof value === "object" && value.value != null) return String(value.value);
		return String(value);
	}
	async function setBrowserCookies(baseUrl, cookieInput) {
		const tasks = [];
		if (typeof cookieInput === "string") Object.entries(parseCookieString(cookieInput)).forEach(([name, value]) => {
			tasks.push(chrome.cookies.set(buildPersistentCookieSetOptions(baseUrl, name, value)).catch(() => null));
		});
		else if (Array.isArray(cookieInput)) cookieInput.forEach((item) => {
			const name = item && item.name;
			const value = normalizeCookieValue(item);
			if (!name || !value) return;
			tasks.push(chrome.cookies.set(buildPersistentCookieSetOptions(baseUrl, name, value)).catch(() => null));
		});
		else if (cookieInput && typeof cookieInput === "object") Object.entries(cookieInput).forEach(([name, value]) => {
			const v = normalizeCookieValue(value);
			if (!name || !v) return;
			tasks.push(chrome.cookies.set(buildPersistentCookieSetOptions(baseUrl, name, v)).catch(() => null));
		});
		await Promise.all(tasks);
		clearCookieCache();
	}
	/**
	* 删除指定域下的若干 cookie。
	*
	* 用于登录通道之间清理残留：微信扫码会写下 login_type / wxuin / tmeLoginType，
	* 它们留在同一个 cookie jar 里，切回 QQ 登录时会被当成微信通道解析，导致 QQ 凭证被上游拒收。
	*/
	async function removeBrowserCookies(baseUrl, names) {
		const list = (Array.isArray(names) ? names : [names]).filter(Boolean);
		if (!list.length || !baseUrl) return;
		if (!chrome?.cookies?.remove) return;
		await Promise.all(list.map((name) => chrome.cookies.remove({
			url: baseUrl,
			name
		}).catch(() => null)));
		clearCookieCache();
	}
	/**
	* 一次删掉多个 host × 多个 cookie 名。
	*
	* 逐条删除在安卓上每条都要过一次桥、并在原生侧 flush 一次，几十条下来就超过清理的截止时间，
	* 结果是「以为清了、其实还剩一半」——旧账号的 uin / 登录通道标记就是这么留下来的。
	* 宿主支持批量时改成一次调用（原生侧循环 + 一次 flush）。
	*/
	async function removeBrowserCookiesForHosts(hosts, names) {
		const nameList = (Array.isArray(names) ? names : [names]).filter(Boolean);
		const hostList = (Array.isArray(hosts) ? hosts : [hosts]).filter(Boolean);
		if (!nameList.length || !hostList.length) return;
		const batch = chrome?.cookies?.removeBatch;
		if (typeof batch === "function") try {
			if (await batch(hostList.flatMap((url) => nameList.map((name) => ({
				url,
				name
			}))))) {
				clearCookieCache();
				return;
			}
		} catch (_) {}
		for (const host of hostList) await removeBrowserCookies(host, nameList);
	}
	function hasNeteaseLogin(cookieHeader) {
		const obj = parseCookieString(cookieHeader);
		return !!(obj.MUSIC_U || obj.MUSIC_A || obj.__csrf);
	}
	function qqCookiePlaybackKey(cookieHeader) {
		const obj = parseCookieString(cookieHeader);
		return obj.qm_keyst || obj.qqmusic_key || obj.music_key || obj.wxskey || "";
	}
	function qqCookieMusicKey(cookieHeader) {
		const obj = parseCookieString(cookieHeader);
		return obj.qm_keyst || obj.qqmusic_key || obj.music_key || obj.p_skey || obj.skey || obj.psrf_qqaccess_token || obj.psrf_qqrefresh_token || obj.wxrefresh_token || obj.wxskey || "";
	}
	function normalizeQQUin(raw) {
		const digits = String(raw || "").replace(/\D/g, "");
		return digits.replace(/^0+/, "") || digits;
	}
	function decodeQQCookieValue(value) {
		try {
			return decodeURIComponent(String(value || "").replace(/\+/g, "%20")).trim();
		} catch (_) {
			return String(value || "").trim();
		}
	}
	function qqCookieUin(cookieHeader) {
		const obj = parseCookieString(cookieHeader);
		return normalizeQQUin(Number(obj.login_type) === 2 ? obj.wxuin || obj.uin || obj.p_uin : obj.uin || obj.qqmusic_uin || obj.wxuin || obj.p_uin);
	}
	function qqCookieNickname(cookieHeader, uin) {
		const obj = parseCookieString(cookieHeader);
		uin = normalizeQQUin(uin || qqCookieUin(cookieHeader));
		const padded = uin ? `0${uin}` : "";
		const keys = [
			uin && `ptnick_${uin}`,
			padded && `ptnick_${padded}`,
			"ptnick",
			"nick",
			"nickname",
			"qq_nickname"
		].filter(Boolean);
		for (const key of keys) if (obj[key]) {
			const nick = decodeQQCookieValue(obj[key]);
			if (nick) return nick;
		}
		const nickKey = Object.keys(obj).find((k) => /^ptnick_/i.test(k) && obj[k]);
		return nickKey ? decodeQQCookieValue(obj[nickKey]) : uin ? `QQ ${uin}` : "";
	}
	function qqCookieAvatar(cookieHeader, uin) {
		const obj = parseCookieString(cookieHeader);
		const direct = obj.qqmusic_avatar || obj.avatar || obj.avatarUrl || obj.headpic || "";
		if (direct) return decodeQQCookieValue(direct);
		uin = normalizeQQUin(uin || qqCookieUin(cookieHeader));
		return uin ? `https://q1.qlogo.cn/g?b=qq&nk=${encodeURIComponent(uin)}&s=100` : "";
	}
	function decodeKGUnicodeEscapes(value) {
		return String(value || "").replace(/%u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
	}
	function decodeKGCookieValue(value) {
		value = String(value || "").trim();
		if (!value) return "";
		if (/%u[0-9a-fA-F]{4}/.test(value)) value = decodeKGUnicodeEscapes(value);
		try {
			return decodeURIComponent(value.replace(/\+/g, "%20")).trim();
		} catch (_) {
			return value.trim();
		}
	}
	function expandKGCookieObject(obj) {
		obj = Object.assign({}, obj || {});
		for (const key of [
			"KuGoo",
			"Kugoo",
			"KGLogin",
			"kguser"
		]) {
			let raw = obj[key];
			if (!raw) continue;
			try {
				raw = decodeURIComponent(String(raw).replace(/\+/g, "%20"));
			} catch (_) {
				raw = String(raw);
			}
			const kuGooFields = {};
			String(raw).split("&").forEach((pair) => {
				const idx = pair.indexOf("=");
				if (idx <= 0) return;
				const k = pair.slice(0, idx).trim();
				const v = pair.slice(idx + 1).trim();
				if (k) kuGooFields[k] = v;
			});
			[
				"KugooID",
				"userid",
				"kugouid",
				"t",
				"t1",
				"token",
				"KToken",
				"KugooPwd",
				"NickName",
				"Pic",
				"UserName",
				"vip_type",
				"VIPType",
				"VipType",
				"vip_token",
				"VipToken",
				"VIPToken",
				"viptoken",
				"MusicPack",
				"musicpack",
				"is_vip",
				"IsVIP",
				"isVIP",
				"su_vip",
				"m_type",
				"y_type",
				"music_vip",
				"VipLevel",
				"vip_level",
				"vip_endtime",
				"vip_end_time"
			].forEach((k) => {
				if (kuGooFields[k]) obj[k] = kuGooFields[k];
			});
			Object.entries(kuGooFields).forEach(([k, v]) => {
				if (obj[k] == null || obj[k] === "") obj[k] = v;
			});
		}
		return obj;
	}
	function parseKGCookieObject(cookieHeader) {
		return expandKGCookieObject(parseCookieString(cookieHeader));
	}
	function kgCookieUserId(cookieHeader) {
		const obj = parseKGCookieObject(cookieHeader);
		return String(obj.KugooID || obj.userid || obj.kugouid || "").trim();
	}
	function kgCookieToken(cookieHeader) {
		const parts = String(cookieHeader || "").split(";");
		for (let i = parts.length - 1; i >= 0; i--) {
			const part = parts[i].trim();
			const idx = part.indexOf("=");
			if (idx <= 0) continue;
			const key = part.slice(0, idx).trim();
			const value = part.slice(idx + 1).trim();
			if ((key === "token" || key === "t" || key === "KToken") && value) return value;
		}
		const obj = parseKGCookieObject(cookieHeader);
		return String(obj.t || obj.token || obj.KToken || obj.kg_token || "").trim();
	}
	/** Always read web session token from KuGoo blob (ignore appended android appToken). */
	function kgCookieWebToken(cookieHeader) {
		const obj = parseKGCookieObject(cookieHeader);
		return String(obj.t || obj.token || obj.KToken || obj.kg_token || "").trim();
	}
	function kgCookieVipType(cookieHeader) {
		const obj = parseKGCookieObject(cookieHeader);
		const direct = Number(obj.vip_type || obj.VIPType || obj.VipType || obj.vipType || obj.musicvip || obj.MusicPack || obj.musicpack || obj.VipLevel || obj.vip_level || 0) || 0;
		if (direct > 0) return direct;
		if (Number(obj.su_vip) > 0) return 33;
		if (Number(obj.m_type) > 0) return 3;
		if (Number(obj.y_type) > 0 || Number(obj.music_vip) > 0) return 6;
		if (String(obj.vip_token || obj.vipToken || "").trim()) return 6;
		if (Number(obj.is_vip) === 1 || Number(obj.IsVIP) === 1 || Number(obj.isVIP) === 1 || Number(obj.MusicPack) === 1) return 6;
		const vipEndRaw = obj.vip_endtime || obj.vip_end_time || "";
		if (vipEndRaw) {
			const endMs = Date.parse(String(vipEndRaw).replace(/-/g, "/"));
			if (Number.isFinite(endMs) && endMs > Date.now()) return 6;
		}
		return 0;
	}
	function kgCookieHasVipSession(cookieHeader) {
		return kgCookieVipType(cookieHeader) > 0 || !!kgCookieVipToken(cookieHeader);
	}
	function analyzeKGCookieSession(cookieHeader) {
		const obj = parseKGCookieObject(cookieHeader || "");
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		const foundSessionKeys = [
			"KuGoo",
			"Kugoo",
			"userid",
			"KugooID",
			"token",
			"t",
			"vip_token",
			"vip_type",
			"dfid",
			"kg_mid"
		].filter((key) => {
			const value = obj[key];
			return value != null && String(value).trim() !== "";
		});
		const hasKuGoo = !!(obj.KuGoo || obj.Kugoo);
		return {
			loggedIn: !!(userId && token),
			userId: userId || "",
			hasKuGoo,
			hasToken: !!token,
			hasVipToken: !!kgCookieVipToken(cookieHeader),
			foundSessionKeys,
			trackingOnly: foundSessionKeys.length === 0 && Object.keys(obj).length > 0
		};
	}
	function kgCookieLoginPwd(cookieHeader) {
		const obj = parseKGCookieObject(cookieHeader);
		return String(obj.KugooPwd || obj.kugoo_pwd || obj.pwd || "").trim();
	}
	function kgCookieVipToken(cookieHeader) {
		const obj = parseKGCookieObject(cookieHeader);
		return String(obj.vip_token || obj.vipToken || obj.VipToken || obj.VIPToken || obj.viptoken || obj.vip_key || "").trim();
	}
	function kgCookieDfid(cookieHeader) {
		const obj = parseKGCookieObject(cookieHeader);
		return String(obj.dfid || obj.DFID || "-").trim() || "-";
	}
	function kgCookieNickname(cookieHeader) {
		const obj = parseKGCookieObject(cookieHeader);
		return decodeKGCookieValue(obj.NickName || obj.nickname || obj.username || obj.uname || obj.UserName || "");
	}
	function kgCookieAvatar(cookieHeader) {
		const obj = parseKGCookieObject(cookieHeader);
		let url = decodeKGCookieValue(obj.pic || obj.Pic || obj.user_pic || obj.avatar || obj.headpic || obj.userpic || "");
		if (url && url.startsWith("//")) url = "http:" + url;
		return url;
	}
	async function getNeteaseMusicU() {
		try {
			const item = await chrome.cookies.get({
				url: "https://music.163.com/",
				name: "MUSIC_U"
			});
			return item && item.value ? item.value : "";
		} catch (_) {
			return "";
		}
	}
	//#endregion
	//#region src/webBridge/api/setCookieHeaders.js
	/**
	* 读取响应里的 Set-Cookie。
	*
	* `Set-Cookie` 是浏览器禁止暴露给 JS 的响应头（Fetch 规范里的 forbidden response-header name），
	* 安卓桥构造 Response 时写进去也会被静默丢掉。原生侧因此把同一批值镜像到 `x-folia-set-cookie`
	* （见 src/services/nativeAndroidBridge.ts），这里把三处来源合并：
	*   - 浏览器 / 扩展能用的 `headers.getSetCookie()`；
	*   - 扩展页面里能直接读到的 `Set-Cookie`；
	*   - 安卓桥的镜像头。
	*
	* 少了这条通路，扫码登录只能从 cookie 罐里回捞 qrsig / p_skey，而罐里可能是上一次会话留下的旧值 ——
	* 表现就是新建的二维码第一次轮询就「已失效」。
	*/
	const SET_COOKIE_MIRROR_HEADER = "x-folia-set-cookie";
	/** 原始 Set-Cookie 头值（可能一条里含多个 cookie，调用方负责拆分）。 */
	function readRawSetCookies(resp) {
		const list = [];
		const headers = resp && resp.headers;
		if (!headers) return list;
		try {
			if (typeof headers.getSetCookie === "function") {
				const values = headers.getSetCookie();
				if (Array.isArray(values)) list.push(...values.filter(Boolean).map(String));
			}
		} catch (_) {}
		try {
			const single = headers.get("Set-Cookie");
			if (single) list.push(String(single));
		} catch (_) {}
		try {
			const mirrored = headers.get(SET_COOKIE_MIRROR_HEADER);
			if (mirrored) list.push(String(mirrored));
		} catch (_) {}
		return list;
	}
	//#endregion
	//#region src/webBridge/api/eapi.js
	const EAPI_KEY = "e82ckenh8dichen8";
	const EAPI_BASE = "https://interface.music.163.com";
	const EAPI_UA = "NeteaseMusic 9.0.90/5038 (iPhone; iOS 16.2; zh_CN)";
	const EAPI_COOKIE_KEYS = [
		"MUSIC_U",
		"MUSIC_A",
		"__csrf",
		"NMTID",
		"WNMCID",
		"WEVNSM",
		"_ntes_nuid",
		"_ntes_nnid",
		"MUSIC_R_U",
		"deviceId",
		"sDeviceId",
		"WM_TID",
		"WM_NI",
		"WM_NIKE"
	];
	function eapiEncrypt(url, object) {
		const text = typeof object === "object" ? JSON.stringify(object) : String(object || "");
		const message = `nobody${url}use${text}md5forencrypt`;
		const payload = `${url}-36cd479b6b5-${text}-36cd479b6b5-${crypto_es_default.MD5(message).toString()}`;
		return { params: crypto_es_default.AES.encrypt(crypto_es_default.enc.Utf8.parse(payload), crypto_es_default.enc.Utf8.parse(EAPI_KEY), {
			mode: crypto_es_default.mode.ECB,
			padding: crypto_es_default.pad.Pkcs7
		}).ciphertext.toString().toUpperCase() };
	}
	function safeDecodeCookieValue(value) {
		const raw = String(value || "");
		try {
			return decodeURIComponent(raw);
		} catch (_) {
			return raw;
		}
	}
	function encodeCookiePair(key, value) {
		return `${encodeURIComponent(key)}=${encodeURIComponent(safeDecodeCookieValue(value))}`;
	}
	/**
	* eapi 需要一组「跨请求稳定」的客户端标识：deviceId、NMTID、_ntes_nuid、WNMCID。
	*
	* deviceId 每次随机换会被风控判成「设备环境异常」（8821）；NMTID 更是官方客户端 cookie 的
	* 一部分（上游注释：服务端会给不带 NMTID 的 eapi 请求下发一个，之后要求带上）。这些值都存本机，
	* 只在缺失时生成一次。
	*/
	const EAPI_STATE_KEYS = {
		deviceId: "neteaseDeviceId",
		nmtid: "neteaseNmtid",
		nuid: "neteaseNuid",
		wnmcid: "neteaseWnmcid"
	};
	const randomChars = (length, alphabet) => {
		let out = "";
		for (let index = 0; index < length; index += 1) out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
		return out;
	};
	async function readEapiState() {
		const keys = Object.values(EAPI_STATE_KEYS);
		let stored = {};
		try {
			stored = await chrome.storage.local.get(keys) || {};
		} catch (_) {
			stored = {};
		}
		const next = {};
		const deviceId = String(stored[EAPI_STATE_KEYS.deviceId] || "").trim();
		next.deviceId = deviceId || randomChars(16, "abcdefghijklmnopqrstuvwxyz0123456789");
		const nuid = String(stored[EAPI_STATE_KEYS.nuid] || "").trim();
		next.nuid = nuid || randomChars(32, "0123456789abcdef");
		next.nmtid = String(stored[EAPI_STATE_KEYS.nmtid] || "").trim();
		const wnmcid = String(stored[EAPI_STATE_KEYS.wnmcid] || "").trim();
		next.wnmcid = wnmcid || `${randomChars(6, "abcdefghijklmnopqrstuvwxyz")}.${Date.now()}.01.0`;
		const patch = {};
		if (!deviceId) patch[EAPI_STATE_KEYS.deviceId] = next.deviceId;
		if (!nuid) patch[EAPI_STATE_KEYS.nuid] = next.nuid;
		if (!wnmcid) patch[EAPI_STATE_KEYS.wnmcid] = next.wnmcid;
		if (Object.keys(patch).length > 0) try {
			await chrome.storage.local.set(patch);
		} catch (_) {}
		return next;
	}
	/** 服务端在第一个不带 NMTID 的 eapi 响应里下发 NMTID，后续请求要带上它。 */
	async function rememberEapiNmtid(setCookies) {
		if (!Array.isArray(setCookies) || setCookies.length === 0) return;
		for (const entry of setCookies) {
			const match = String(entry || "").match(/(?:^|;\s*)NMTID=([^;]+)/);
			if (!match) continue;
			const value = String(match[1] || "").trim();
			if (!value) continue;
			try {
				await chrome.storage.local.set({ [EAPI_STATE_KEYS.nmtid]: value });
			} catch (_) {}
			return;
		}
	}
	/**
	* 官方客户端的 eapi body 里带一个 header 块（deviceId / appver / requestId …）。
	* 之前只把设备信息塞进 Cookie、body 里没有 header，服务端会按「非官方客户端」判风控，
	* 登录接口直接回 8821「环境异常」。这里按官方客户端的字段补上。
	*/
	async function buildEapiHeader(parsed) {
		const state = await readEapiState();
		const header = {
			osver: parsed.osver || "16.2",
			deviceId: parsed.deviceId || state.deviceId,
			appver: parsed.appver || "9.0.90",
			versioncode: parsed.versioncode || "140",
			mobilename: parsed.mobilename || "",
			buildver: parsed.buildver || String(Date.now()).slice(0, 10),
			resolution: parsed.resolution || "1920x1080",
			__csrf: parsed.__csrf || "",
			os: parsed.os || "iPhone OS",
			channel: parsed.channel || "distribution",
			requestId: `${Date.now()}_${String(Math.floor(Math.random() * 1e3)).padStart(4, "0")}`
		};
		header._ntes_nuid = parsed._ntes_nuid || state.nuid;
		header._ntes_nnid = parsed._ntes_nnid || `${header._ntes_nuid},${Date.now()}`;
		header.WNMCID = parsed.WNMCID || state.wnmcid;
		header.WEVNSM = parsed.WEVNSM || "1.0.0";
		header.__remember_me = "true";
		header.ntes_kaola_ad = "1";
		const nmtid = parsed.NMTID || state.nmtid;
		if (nmtid) header.NMTID = nmtid;
		if (parsed.MUSIC_U) header.MUSIC_U = parsed.MUSIC_U;
		if (parsed.MUSIC_A) header.MUSIC_A = parsed.MUSIC_A;
		EAPI_COOKIE_KEYS.forEach((key) => {
			if (parsed[key] && header[key] === void 0) header[key] = parsed[key];
		});
		return header;
	}
	async function resolveEapiCookieMap(cookieHeader) {
		const parsed = parseCookieString(cookieHeader);
		if (!parsed.MUSIC_U) {
			const musicU = await getNeteaseMusicU();
			if (musicU) parsed.MUSIC_U = musicU;
		}
		return parsed;
	}
	function formatEapiCookieHeader(header) {
		return Object.entries(header).filter(([, value]) => value != null && String(value) !== "").map(([key, value]) => encodeCookiePair(key, value)).join("; ");
	}
	async function eapiRequest(path, data, cookieHeader) {
		const uri = path.startsWith("/api/") ? path : `/api/${path.replace(/^\//, "")}`;
		const apiPath = uri.slice(5);
		const header = await buildEapiHeader(await resolveEapiCookieMap(cookieHeader));
		const encrypted = eapiEncrypt(uri, Object.assign({}, data || {}, { header }));
		const resp = await fetch(`${EAPI_BASE}/eapi/${apiPath}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"User-Agent": EAPI_UA,
				Cookie: formatEapiCookieHeader(header)
			},
			body: new URLSearchParams(encrypted).toString(),
			credentials: "include"
		});
		let body = {};
		try {
			body = await resp.json();
		} catch (_) {
			body = {};
		}
		const setCookies = readRawSetCookies(resp);
		await rememberEapiNmtid(setCookies);
		return {
			status: resp.status,
			body,
			setCookies
		};
	}
	//#endregion
	//#region src/webBridge/api/weapi.js
	const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
	const IV = "0102030405060708";
	const PRESET_KEY = "0CoJUm6Qyw8W8jud";
	const BASE62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	const RSA_MODULUS$1 = BigInt("0x00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7");
	const RSA_EXP = BigInt(65537);
	function modPow$1(base, exp, mod) {
		let result = BigInt(1);
		let b = base % mod;
		let e = exp;
		while (e > BigInt(0)) {
			if (e % BigInt(2) === BigInt(1)) result = result * b % mod;
			b = b * b % mod;
			e /= BigInt(2);
		}
		return result;
	}
	function rsaEncrypt(text) {
		const reversed = String(text || "").split("").reverse().join("");
		let x = BigInt(0);
		for (let i = 0; i < reversed.length; i++) x = (x << BigInt(8)) + BigInt(reversed.charCodeAt(i));
		return modPow$1(x, RSA_EXP, RSA_MODULUS$1).toString(16).padStart(256, "0");
	}
	function aesEncrypt$1(text, key, iv) {
		return crypto_es_default.AES.encrypt(crypto_es_default.enc.Utf8.parse(text), crypto_es_default.enc.Utf8.parse(key), {
			iv: crypto_es_default.enc.Utf8.parse(iv),
			mode: crypto_es_default.mode.CBC,
			padding: crypto_es_default.pad.Pkcs7
		}).toString();
	}
	function weapiEncrypt(object) {
		const text = JSON.stringify(object || {});
		let secretKey = "";
		for (let i = 0; i < 16; i++) secretKey += BASE62.charAt(Math.floor(Math.random() * 62));
		return {
			params: aesEncrypt$1(aesEncrypt$1(text, PRESET_KEY, IV), secretKey, IV),
			encSecKey: rsaEncrypt(secretKey)
		};
	}
	async function weapiRequest(path, data, cookieHeader) {
		const apiPath = String(path || "").replace(/^\/+/, "").replace(/^weapi\//, "").replace(/^api\//, "");
		const encrypted = weapiEncrypt(data || {});
		const resp = await fetch(`https://music.163.com/weapi/${apiPath}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"User-Agent": UA,
				Referer: "https://music.163.com/",
				Cookie: cookieHeader || ""
			},
			body: new URLSearchParams(encrypted).toString()
		});
		try {
			return await resp.json();
		} catch (_) {
			return {};
		}
	}
	//#endregion
	//#region src/webBridge/api/libraryTrace.js
	/**
	* 在线曲库加载的追踪记录。
	*
	* 只记录「请求了什么、上游回了什么形态、解析出多少条」，不记录 cookie / token。
	* 设置 → 帮助 → 复制诊断数据 会把它一起导出。
	*/
	const MAX_ENTRIES = 60;
	const MAX_AGE_MS = 9e5;
	let entries$1 = [];
	let startedAt$1 = 0;
	function push(step, detail) {
		const at = Date.now();
		if (!startedAt$1 || at - startedAt$1 > MAX_AGE_MS) {
			startedAt$1 = at;
			entries$1 = [];
		}
		entries$1.push({
			at,
			step,
			detail: detail || {}
		});
		if (entries$1.length > MAX_ENTRIES) entries$1 = entries$1.slice(-60);
	}
	/** provider 例如 qq / kugou / netease。 */
	function noteLibraryStep(provider, step, detail = {}) {
		push(`${provider}:${step}`, detail);
	}
	function describePayload(payload) {
		if (payload === null || payload === void 0) return "null";
		if (Array.isArray(payload)) return `array(${payload.length})`;
		if (typeof payload !== "object") return typeof payload;
		const keys = Object.keys(payload);
		return `object{${keys.slice(0, 12).join(",")}${keys.length > 12 ? ",…" : ""}}`;
	}
	//#endregion
	//#region src/webBridge/api/netease/anonimous.js
	/** 与上游 ID_XOR_KEY_1 一致：设备 id 先跟它逐位异或，再取 MD5。 */
	const ID_XOR_KEY = "3go8&$8*3*3h0k(2)2";
	const HEX = "0123456789ABCDEF";
	/** 上游 generateDeviceId()：52 个十六进制字符。 */
	function deviceId$1() {
		let out = "";
		for (let index = 0; index < 52; index += 1) out += HEX[Math.floor(Math.random() * 16)];
		return out;
	}
	/** 上游 cloudmusic_dll_encode_id：异或 → MD5 → Base64。 */
	function encodeId(id) {
		let xored = "";
		for (let index = 0; index < id.length; index += 1) xored += String.fromCharCode(id.charCodeAt(index) ^ ID_XOR_KEY.charCodeAt(index % 18));
		return crypto_es_default.enc.Base64.stringify(crypto_es_default.MD5(crypto_es_default.enc.Utf8.parse(xored)));
	}
	const base64 = (text) => crypto_es_default.enc.Base64.stringify(crypto_es_default.enc.Utf8.parse(text));
	/**
	* 一条 Set-Cookie 里的 `name=value`（分号后面的属性不要）。
	*
	* 上游是把整批 cookie 拼起来交回去的（result.cookie.join(';')）；这里只有响应头，所以自己拆。
	*/
	function pairsOf(setCookies) {
		const out = [];
		(setCookies || []).forEach((raw) => {
			String(raw || "").split(/,(?=\s*[^;]+=)/).forEach((part) => {
				const head = String(part || "").split(";")[0] || "";
				const at = head.indexOf("=");
				if (at <= 0) return;
				const name = head.slice(0, at).trim();
				const value = head.slice(at + 1).trim();
				if (name && value) out.push(`${name}=${value}`);
			});
		});
		return out;
	}
	/** 注册成功的判据：上游回了 200，而且真给了一份能用的 cookie。 */
	function isGuestCookie(cookie) {
		return typeof cookie === "string" && /MUSIC_A=|__csrf=/.test(cookie);
	}
	/**
	* 走 weapi。
	*
	* 不用 weapiRequest 是因为它只把响应体交回来（`resp.json()`），而这次要的 cookie 在
	* Set-Cookie 里 —— 头被丢掉就拿不到了。所以自己发一次，头自己读。
	*/
	async function byWeapi(username) {
		const encrypted = weapiEncrypt({ username });
		const resp = await fetch("https://music.163.com/weapi/register/anonimous", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"User-Agent": UA,
				Referer: "https://music.163.com/",
				Cookie: ""
			},
			body: new URLSearchParams(encrypted).toString()
		});
		let body = {};
		try {
			body = await resp.json();
		} catch (_) {
			body = {};
		}
		return {
			code: body && body.code,
			cookie: pairsOf(readRawSetCookies(resp)).join("; ")
		};
	}
	async function byEapi(username) {
		const answer = await eapiRequest("/api/register/anonimous", { username }, "");
		const body = answer && answer.body || {};
		return {
			code: body.code,
			cookie: pairsOf(answer && answer.setCookies).join("; ") || (typeof body.cookie === "string" ? body.cookie : "")
		};
	}
	/**
	* 注册一个游客，把它那份 cookie 交回去。
	*
	* 拿不到（上游拒了、Set-Cookie 没镜像回来、两条路都不通）就回空串 —— 与早先那个空壳的
	* 结果一样，并不比现在更差。生效的那条路会留痕，失败时把 code 也留下。
	*/
	async function registerAnonymousCookie() {
		const id = deviceId$1();
		const username = base64(`${id} ${encodeId(id)}`);
		const routes = [{
			name: "eapi",
			ask: byEapi
		}, {
			name: "weapi",
			ask: byWeapi
		}];
		for (const route of routes) try {
			const answer = await route.ask(username);
			if (isGuestCookie(answer.cookie)) {
				noteLibraryStep("netease", "auth:anonimous:source", { route: route.name });
				return answer.cookie;
			}
			noteLibraryStep("netease", "auth:anonimous:rejected", {
				route: route.name,
				code: answer.code ?? null
			});
		} catch (error) {
			noteLibraryStep("netease", "auth:anonimous:failed", {
				route: route.name,
				message: error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120)
			});
		}
		return "";
	}
	//#endregion
	//#region src/webBridge/api/qrLoginTrace.js
	const MAX_ENTRY_AGE_MS = 6e5;
	let entries = [];
	let startedAt = 0;
	function resetQrLoginTrace() {
		entries = [];
		startedAt = Date.now();
	}
	function noteQrLoginStep(step, detail = {}) {
		const at = Date.now();
		if (!startedAt || at - startedAt > MAX_ENTRY_AGE_MS) {
			startedAt = at;
			entries = [];
		}
		entries = [...entries, {
			at,
			step,
			detail
		}].slice(-40);
	}
	//#endregion
	//#region src/webBridge/api/qq-login-qr.js
	/**
	* QQ Music QR login — port of sansenjian/qq-music-api
	* Docs: https://sansenjian.github.io/qq-music-api/api/user.html
	*
	* Flow:
	*  1. GET  ptqrshow  → qrsig + qr image + ptqrtoken(=hash33(qrsig))
	*  2. GET  ptqrlogin → wait / scanned / success(+checkSigUrl)
	*  3. GET  checkSigUrl (manual) → p_skey
	*  4. POST graph.qq.com/oauth2.0/authorize → Location?code=
	*  5. POST u.y.qq.com musicu QQLogin → qm_keyst session cookies
	*
	* Extension fetch cannot send Cookie headers; we inject them via
	* declarativeNetRequest for the duration of each privileged request.
	*/
	const QQ_PT_APPID = "716027609";
	const QQ_PT_DAID = "383";
	const QQ_PT_AID = "100497308";
	const QQ_PT_U1 = "https://graph.qq.com/oauth2.0/login_jump";
	const QQ_AUTHORIZE_REDIRECT = "https://y.qq.com/portal/wx_redirect.html?login_type=1&surl=https://y.qq.com/";
	const retryableCheckFailure$1 = (message, error, extra = {}) => ({
		isOk: false,
		code: 801,
		refresh: false,
		message,
		error,
		provider: "qq",
		status: "wait",
		retryable: true,
		...extra
	});
	const TICKET_EXCHANGE_MAX_FAILURES = 3;
	const TICKET_EXCHANGE_TRACKED_SESSIONS = 32;
	const ticketExchangeFailures = /* @__PURE__ */ new Map();
	function countTicketExchangeFailure(qrsig) {
		const key = String(qrsig || "").slice(0, 64);
		const attempts = (ticketExchangeFailures.get(key) || 0) + 1;
		ticketExchangeFailures.delete(key);
		ticketExchangeFailures.set(key, attempts);
		while (ticketExchangeFailures.size > TICKET_EXCHANGE_TRACKED_SESSIONS) ticketExchangeFailures.delete(ticketExchangeFailures.keys().next().value);
		return attempts;
	}
	function clearTicketExchangeFailures(qrsig) {
		ticketExchangeFailures.delete(String(qrsig || "").slice(0, 64));
	}
	/**
	* 换票阶段的失败。前几次仍按「等待」返回让前端继续轮询，连续失败到上限就交出终态错误，
	* 前端据此弹出可操作的失败界面（附带阶段与原因），而不是一直转圈。
	*/
	function ticketExchangeFailure(qrsig, message, error, extra = {}) {
		const attempts = countTicketExchangeFailure(qrsig);
		const detail = {
			...extra,
			failureStage: "qq-ticket-exchange",
			failureReason: extra.failureReason || message,
			ticketExchangeAttempts: attempts
		};
		if (attempts <= TICKET_EXCHANGE_MAX_FAILURES) {
			noteQrLoginStep("qr:exchange:retry", {
				attempts,
				message
			});
			return {
				...retryableCheckFailure$1(message, error, detail),
				status: "wait"
			};
		}
		noteQrLoginStep("qr:exchange:failed", {
			attempts,
			message
		});
		return {
			isOk: false,
			code: 0,
			refresh: false,
			message,
			error,
			provider: "qq",
			status: "error",
			retryable: false,
			...detail
		};
	}
	const DNR_COOKIE_RULE_ID = 917027609;
	let dnrCookieSerial = 0;
	const WECHAT_COOKIE_HOSTS = [
		"https://y.qq.com/",
		"https://qq.com/",
		"https://graph.qq.com/"
	];
	const WECHAT_CHANNEL_COOKIE_NAMES = [
		"login_type",
		"wxuin",
		"wxopenid",
		"wxskey",
		"wxrefresh_token",
		"str_musicid",
		"tmeLoginType"
	];
	const QQ_PLATFORM_CREDENTIAL_COOKIE_NAMES = [
		"uin",
		"p_uin",
		"qqmusic_uin",
		"qm_keyst",
		"qqmusic_key",
		"music_key",
		"p_skey",
		"skey",
		"psrf_qqaccess_token",
		"psrf_qqrefresh_token",
		"psrf_qqunionid",
		"euin",
		...WECHAT_CHANNEL_COOKIE_NAMES
	];
	/** 这些名字只能由本次登录流程产生，绝不能从上一条会话的残留里捡回来。 */
	const SESSION_CREDENTIAL_NAMES = new Set(QQ_PLATFORM_CREDENTIAL_COOKIE_NAMES.map((name) => String(name).toLowerCase()));
	const CROSS_CHANNEL_COOKIE_NAMES = new Set([
		"uin",
		"p_uin",
		"qqmusic_uin",
		"qm_keyst",
		"qqmusic_key",
		"music_key",
		...WECHAT_CHANNEL_COOKIE_NAMES
	].map((name) => String(name).toLowerCase()));
	const COOKIE_HYGIENE_TIMEOUT_MS = 2500;
	const COOKIE_WRITE_TIMEOUT_MS = 5e3;
	/** 给一段收尾工作加上截止时间；无论成功、失败还是超时都会结算成 fallback。 */
	function settleWithin(promise, ms, fallback, label) {
		let timer = null;
		const work = Promise.resolve(promise).catch((err) => {
			noteQrLoginStep(`${label}:failed`, { message: err?.message || String(err) });
			return fallback;
		});
		const deadline = new Promise((resolve) => {
			timer = setTimeout(() => {
				noteQrLoginStep(`${label}:timeout`, { ms });
				resolve(fallback);
			}, ms);
		});
		return Promise.race([work, deadline]).finally(() => {
			if (timer) clearTimeout(timer);
		});
	}
	/**
	* 清掉上一条通道留下的平台凭据。扫码开始前、登出时、写新会话前都要走一遍。
	* 这只是会话切换的卫生工作：读不到结果也照常放行，绝不阻塞登录。
	*/
	async function clearQQPlatformSessionCookies() {
		await settleWithin(removeBrowserCookiesForHosts(WECHAT_COOKIE_HOSTS, QQ_PLATFORM_CREDENTIAL_COOKIE_NAMES), COOKIE_HYGIENE_TIMEOUT_MS, void 0, "qr:clean-platform-cookies");
	}
	function hash33(qrsig) {
		let e = 0;
		const t = String(qrsig || "");
		for (let n = 0, o = t.length; n < o; n += 1) e += (e << 5) + t.charCodeAt(n);
		return 2147483647 & e;
	}
	function getGtk(pSkey) {
		const str = String(pSkey || "");
		let hash = 5381;
		for (let i = 0, len = str.length; i < len; i += 1) hash += (hash << 5) + str.charCodeAt(i);
		return hash & 2147483647;
	}
	function getGuid() {
		return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
			const r = Math.random() * 16 | 0;
			return (c === "x" ? r : r & 3 | 8).toString(16);
		}).toUpperCase();
	}
	function parseSetCookieRaw(setCookieHeader) {
		if (!setCookieHeader) return [];
		if (Array.isArray(setCookieHeader)) return setCookieHeader.map((part) => String(part || "").split(";")[0].trim()).filter((pair) => pair.includes("=") && pair.split("=")[1]);
		const cookies = [];
		const parts = String(setCookieHeader).split(/,(?=\s*[a-zA-Z_][\w-]*=)/);
		for (const part of parts) {
			const cookiePair = part.split(";")[0].trim();
			if (cookiePair && cookiePair.includes("=") && cookiePair.split("=")[1]) cookies.push(cookiePair);
		}
		return cookies;
	}
	function collectSetCookies(resp) {
		const list = [];
		readRawSetCookies(resp).forEach((raw) => {
			list.push(...parseSetCookieRaw(raw));
		});
		return list;
	}
	function cookiePairsToHeader(pairs) {
		return (pairs || []).filter(Boolean).join("; ");
	}
	function cookiePairsToObject(pairs) {
		const obj = {};
		(pairs || []).forEach((pair) => {
			const eq = String(pair).indexOf("=");
			if (eq <= 0) return;
			const key = pair.slice(0, eq).trim();
			const value = pair.slice(eq + 1).trim();
			if (key && value) obj[key] = value;
		});
		return obj;
	}
	async function readJarCookiePairs(url) {
		try {
			return (await chrome.cookies.getAll({ url }) || []).filter((item) => item && item.name && item.value).map((item) => `${item.name}=${item.value}`);
		} catch (_) {
			return [];
		}
	}
	async function readJarCookieValue(url, name) {
		try {
			const item = await chrome.cookies.get({
				url,
				name
			});
			return item && item.value ? item.value : "";
		} catch (_) {
			return "";
		}
	}
	function mergeCookieHeader(...headers) {
		const merged = /* @__PURE__ */ new Map();
		for (const header of headers) for (const pair of String(header || "").split(";")) {
			const eq = pair.indexOf("=");
			if (eq <= 0) continue;
			const name = pair.slice(0, eq).trim();
			const value = pair.slice(eq + 1).trim();
			if (name && value) merged.set(name, value);
		}
		return Array.from(merged, ([name, value]) => `${name}=${value}`).join("; ");
	}
	const cookiePairName = (pair) => {
		const eq = String(pair).indexOf("=");
		return eq <= 0 ? "" : String(pair).slice(0, eq).trim().toLowerCase();
	};
	/** 上一条通道留下的账号 cookie 不能带进本次请求。 */
	const isCrossChannelCookiePair = (pair) => CROSS_CHANNEL_COOKIE_NAMES.has(cookiePairName(pair));
	/** 会话凭据只能由本次流程产生：读 jar 时全部跳过。 */
	const isSessionCredentialPair = (pair) => SESSION_CREDENTIAL_NAMES.has(cookiePairName(pair));
	async function buildRequestCookieHeader(url, pairs) {
		return mergeCookieHeader(cookiePairsToHeader((await readJarCookiePairs(url)).filter((pair) => !isCrossChannelCookiePair(pair))), cookiePairsToHeader(pairs));
	}
	function mergeCookiePairs(map, pairs) {
		for (const pair of pairs || []) {
			const eq = String(pair).indexOf("=");
			if (eq <= 0) continue;
			const name = pair.slice(0, eq).trim();
			if (name) map.set(name, pair.trim());
		}
		return map;
	}
	/** 把 jar 读回来的 cookie 并进本次会话，但跳过所有会话凭据。 */
	function mergeJarCookiePairs(map, pairs) {
		return mergeCookiePairs(map, (pairs || []).filter((pair) => !isSessionCredentialPair(pair)));
	}
	function buildLoginSession(cookie) {
		const cookieList = String(cookie || "").split(";").map((item) => item.trim()).filter(Boolean);
		const cookieObject = cookiePairsToObject(cookieList);
		const loginUin = cookieObject.uin || cookieObject.p_uin || "";
		return {
			loginUin,
			uin: loginUin,
			cookie: cookieList.join("; "),
			cookieList,
			cookieObject
		};
	}
	async function withInjectedCookie(cookieHeader, urlFilters, run) {
		const cookie = String(cookieHeader || "").trim();
		const filters = (urlFilters || []).filter(Boolean);
		if (!cookie || !filters.length || !chrome.declarativeNetRequest?.updateSessionRules) return run();
		dnrCookieSerial = (dnrCookieSerial + 1) % 1e3;
		const baseId = DNR_COOKIE_RULE_ID + dnrCookieSerial * 10;
		const ruleIds = filters.map((_, i) => baseId + i);
		const addRules = filters.map((urlFilter, i) => ({
			id: ruleIds[i],
			priority: 100,
			action: {
				type: "modifyHeaders",
				requestHeaders: [{
					header: "cookie",
					operation: "set",
					value: cookie
				}]
			},
			condition: {
				urlFilter,
				resourceTypes: ["xmlhttprequest", "other"]
			}
		}));
		try {
			await chrome.declarativeNetRequest.updateSessionRules({
				removeRuleIds: ruleIds,
				addRules
			});
		} catch (err) {
			console.warn("[Mineradio Bridge] QQ cookie DNR inject failed", err);
			return run();
		}
		try {
			return await run();
		} finally {
			try {
				await chrome.declarativeNetRequest.updateSessionRules({
					removeRuleIds: ruleIds,
					addRules: []
				});
			} catch (_) {}
		}
	}
	async function fetchWithTimeout(input, init = {}, timeout = 1e4) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeout);
		try {
			return await fetch(input, {
				...init,
				signal: controller.signal
			});
		} finally {
			clearTimeout(timer);
		}
	}
	async function writeSessionCookies(session) {
		const raw = session && session.cookie || "";
		if (!raw) return;
		await clearQQPlatformSessionCookies();
		noteQrLoginStep("qr:session:write:start", { cookieCount: raw.split(";").filter(Boolean).length });
		noteQrLoginStep(await settleWithin((async () => {
			await setBrowserCookies("https://y.qq.com/", raw);
			await setBrowserCookies("https://qq.com/", raw);
			await setBrowserCookies("https://graph.qq.com/", raw);
			clearCookieCache();
			return true;
		})(), COOKIE_WRITE_TIMEOUT_MS, false, "qr:session:write") ? "qr:session:write:ok" : "qr:session:write:skipped");
	}
	/** GET /user/getQQLoginQr equivalent */
	async function qqGetLoginQr() {
		resetQrLoginTrace();
		noteQrLoginStep("qr:create:start");
		await clearQQPlatformSessionCookies().catch(() => void 0);
		const u = new URL("https://ssl.ptlogin2.qq.com/ptqrshow");
		u.searchParams.set("appid", QQ_PT_APPID);
		u.searchParams.set("e", "2");
		u.searchParams.set("l", "M");
		u.searchParams.set("s", "3");
		u.searchParams.set("d", "72");
		u.searchParams.set("v", "4");
		u.searchParams.set("t", String(Math.random()));
		u.searchParams.set("daid", QQ_PT_DAID);
		u.searchParams.set("pt_3rd_aid", QQ_PT_AID);
		u.searchParams.set("u1", QQ_PT_U1);
		await removeBrowserCookies("https://ssl.ptlogin2.qq.com/", ["qrsig"]).catch(() => void 0);
		await removeBrowserCookies("https://qq.com/", ["qrsig"]).catch(() => void 0);
		const response = await fetchWithTimeout(u.toString(), {
			method: "GET",
			credentials: "include",
			headers: {
				"User-Agent": UA,
				Referer: "https://xui.ptlogin2.qq.com/",
				Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
			}
		});
		if (!response.ok) {
			noteQrLoginStep("qr:create:http", { status: response.status });
			throw new Error("Failed to fetch QQ login QR");
		}
		const pairs = collectSetCookies(response);
		let qrsig = "";
		for (const pair of pairs) if (pair.startsWith("qrsig=")) {
			qrsig = pair.slice(6);
			break;
		}
		if (!qrsig) try {
			const item = await chrome.cookies.get({
				url: "https://ssl.ptlogin2.qq.com/",
				name: "qrsig"
			});
			if (item && item.value) qrsig = item.value;
		} catch (_) {}
		if (!qrsig) throw new Error("Failed to get qrsig from response");
		noteQrLoginStep("qr:create:ok", {
			status: response.status,
			setCookieCount: pairs.length
		});
		try {
			await chrome.cookies.set({
				url: "https://ssl.ptlogin2.qq.com/",
				name: "qrsig",
				value: qrsig,
				path: "/",
				secure: true
			});
		} catch (_) {}
		const buf = await response.arrayBuffer();
		const bytes = new Uint8Array(buf);
		let binary = "";
		for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
		const img = `data:image/png;base64,${btoa(binary)}`;
		const ptqrtoken = String(hash33(qrsig));
		return {
			img,
			qrsig,
			ptqrtoken,
			provider: "qq",
			qrimg: img
		};
	}
	/** POST /user/checkQQLoginQr equivalent */
	async function qqCheckLoginQr(params = {}) {
		const qrsig = String(params.qrsig || "").trim();
		let ptqrtoken = String(params.ptqrtoken || "").trim();
		if (!qrsig) return {
			isOk: false,
			code: 65,
			refresh: true,
			message: "参数错误：缺少 qrsig",
			provider: "qq"
		};
		if (!ptqrtoken) ptqrtoken = String(hash33(qrsig));
		const cookieMap = /* @__PURE__ */ new Map();
		cookieMap.set("qrsig", `qrsig=${qrsig}`);
		const pollUrl = new URL("https://ssl.ptlogin2.qq.com/ptqrlogin");
		pollUrl.searchParams.set("u1", QQ_PT_U1);
		pollUrl.searchParams.set("ptqrtoken", ptqrtoken);
		pollUrl.searchParams.set("ptredirect", "0");
		pollUrl.searchParams.set("h", "1");
		pollUrl.searchParams.set("t", "1");
		pollUrl.searchParams.set("g", "1");
		pollUrl.searchParams.set("from_ui", "1");
		pollUrl.searchParams.set("ptlang", "2052");
		pollUrl.searchParams.set("action", `0-0-${Date.now()}`);
		pollUrl.searchParams.set("js_ver", "23111510");
		pollUrl.searchParams.set("js_type", "1");
		pollUrl.searchParams.set("login_sig", "");
		pollUrl.searchParams.set("pt_uistyle", "40");
		pollUrl.searchParams.set("aid", QQ_PT_APPID);
		pollUrl.searchParams.set("daid", QQ_PT_DAID);
		pollUrl.searchParams.set("pt_3rd_aid", QQ_PT_AID);
		const runPoll = async () => {
			const cookieHeader = await buildRequestCookieHeader(pollUrl.toString(), Array.from(cookieMap.values()));
			const res = await withInjectedCookie(cookieHeader, ["||ssl.ptlogin2.qq.com"], () => fetchWithTimeout(pollUrl.toString(), {
				method: "GET",
				credentials: "include",
				headers: {
					"User-Agent": UA,
					Referer: "https://xui.ptlogin2.qq.com/",
					Accept: "*/*",
					Cookie: cookieHeader
				}
			}));
			return {
				res,
				body: await res.text() || ""
			};
		};
		let response;
		let data = "";
		try {
			({res: response, body: data} = await runPoll());
			if (response.status === 403 || response.status >= 400 && !String(data).trim()) {
				noteQrLoginStep("qr:poll:forbidden-retry", { status: response.status });
				await writeSessionCookies({ cookie: cookiePairsToHeader(Array.from(cookieMap.values())) });
				const retry = await runPoll();
				response = retry.res;
				data = retry.body;
			}
		} catch (err) {
			noteQrLoginStep("qr:poll:exception", {
				name: err?.name || "Error",
				message: err?.message || String(err)
			});
			if (err && err.name === "AbortError") return {
				isOk: false,
				code: 0,
				message: "登录检查超时",
				error: "登录检查超时",
				provider: "qq"
			};
			return {
				isOk: false,
				code: 0,
				message: err && err.message || "登录检查失败",
				error: err && err.message || "登录检查失败",
				provider: "qq"
			};
		}
		const pollSetCookies = collectSetCookies(response);
		mergeCookiePairs(cookieMap, pollSetCookies);
		const refresh = /已失效|已过期/.test(data) && !/未失效/.test(data);
		const scanned = /二维码认证中|扫描成功|已扫描/.test(data);
		const waiting = /二维码未失效|等待扫码|未失效/.test(data);
		const success = /登录成功|登陆成功/.test(data);
		const responseHead = String(data).replace(/\s+/g, " ").trim().slice(0, 80);
		noteQrLoginStep("qr:poll", {
			status: response.status,
			scanned,
			success,
			refresh,
			waiting,
			body: responseHead,
			setCookieCount: pollSetCookies.length
		});
		if (!success) {
			if (refresh) return {
				isOk: false,
				code: 65,
				refresh: true,
				message: "二维码已失效",
				provider: "qq",
				status: "expired"
			};
			if (scanned) return {
				isOk: false,
				code: 67,
				refresh: false,
				message: "已扫码，请在手机确认",
				provider: "qq",
				status: "scanned"
			};
			return {
				isOk: false,
				code: waiting ? 66 : 66,
				refresh: false,
				message: waiting ? "请用手机 QQ 扫码" : "未扫描二维码",
				provider: "qq",
				status: "wait",
				raw: data.slice(0, 160)
			};
		}
		const quotedUrlMatch = data.match(/(?:'((?:https?|ftp):\/\/[^\s/$.?#].[^\s]*)')/g);
		const bareUrlMatch = data.match(/https?:\/\/(?:ptlogin2|ssl\.ptlogin2)\.qq\.com\/[^\s'"]+/);
		const rawCheckSigUrl = quotedUrlMatch && quotedUrlMatch[0] ? quotedUrlMatch[0].replace(/'/g, "") : bareUrlMatch && bareUrlMatch[0] || "";
		if (!rawCheckSigUrl) {
			noteQrLoginStep("qr:check-sig:missing-url", { body: responseHead });
			return ticketExchangeFailure(qrsig, "登录检查失败：未拿到 checkSigUrl", "提取不到 checkSigUrl");
		}
		const checkSigUrl = rawCheckSigUrl.replace(/[;,'"]+$/, "");
		const checkSigUin = (() => {
			try {
				return (new URL(checkSigUrl).searchParams.get("uin") || "").replace(/\D/g, "");
			} catch {
				return "";
			}
		})();
		let checkSigRes;
		let checkSigFinalUrl = checkSigUrl;
		try {
			const checkSigCookieHeader = await buildRequestCookieHeader(checkSigUrl, Array.from(cookieMap.values()));
			checkSigRes = await withInjectedCookie(checkSigCookieHeader, ["||ptlogin2.qq.com", "||qq.com"], () => fetchWithTimeout(checkSigUrl, {
				method: "GET",
				redirect: "manual",
				credentials: "include",
				headers: {
					"User-Agent": UA,
					Referer: "https://xui.ptlogin2.qq.com/",
					Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
					Cookie: checkSigCookieHeader
				}
			}, 12e3));
			if (checkSigRes.status >= 300 && checkSigRes.status < 400) {
				const redirectTarget = checkSigRes.headers.get("Location") || checkSigRes.headers.get("location") || "";
				if (redirectTarget) {
					const resolvedTarget = new URL(redirectTarget, checkSigUrl).toString();
					noteQrLoginStep("qr:check-sig:redirect", { toHost: (() => {
						try {
							return new URL(resolvedTarget).host;
						} catch {
							return "";
						}
					})() });
					mergeCookiePairs(cookieMap, collectSetCookies(checkSigRes));
					try {
						const followCookieHeader = await buildRequestCookieHeader(resolvedTarget, Array.from(cookieMap.values()));
						const followed = await fetchWithTimeout(resolvedTarget, {
							method: "GET",
							credentials: "include",
							headers: {
								"User-Agent": UA,
								Referer: checkSigUrl,
								Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
								Cookie: followCookieHeader
							}
						}, 12e3);
						mergeCookiePairs(cookieMap, collectSetCookies(followed));
						checkSigRes = followed;
						checkSigFinalUrl = resolvedTarget;
					} catch (_) {}
				}
			}
		} catch (err) {
			noteQrLoginStep("qr:check-sig:exception", { message: err?.message || String(err) });
			return ticketExchangeFailure(qrsig, err && err.message || "登录检查失败", "check_sig 请求失败");
		}
		const checkSigCookies = collectSetCookies(checkSigRes);
		mergeCookiePairs(cookieMap, checkSigCookies);
		const checkSigJarPairs = await readJarCookiePairs(checkSigFinalUrl);
		mergeJarCookiePairs(cookieMap, checkSigJarPairs);
		noteQrLoginStep("qr:check-sig", {
			status: checkSigRes.status,
			setCookieCount: checkSigCookies.length,
			jarCookieCount: checkSigJarPairs.length
		});
		const checkSigCookieHeader = cookiePairsToHeader(checkSigCookies);
		const jarPSkey = await readJarCookieValue(checkSigFinalUrl, "p_skey");
		const pSkeyMatch = checkSigCookieHeader.match(/p_skey=([^;]+)/) || cookiePairsToHeader(Array.from(cookieMap.values())).match(/p_skey=([^;]+)/) || (jarPSkey ? [null, jarPSkey] : null);
		if (!pSkeyMatch || !pSkeyMatch[1]) {
			noteQrLoginStep("qr:check-sig:no-p-skey", { cookieCount: checkSigCookies.length });
			return ticketExchangeFailure(qrsig, "登录检查失败：缺少 p_skey", "提取不到 p_skey");
		}
		const pSkey = pSkeyMatch[1];
		const gtk = getGtk(pSkey);
		const form = new URLSearchParams();
		form.append("response_type", "code");
		form.append("client_id", QQ_PT_AID);
		form.append("redirect_uri", QQ_AUTHORIZE_REDIRECT);
		form.append("scope", "get_user_info,get_app_friends");
		form.append("state", "state");
		form.append("switch", "");
		form.append("from_ptlogin", "1");
		form.append("src", "1");
		form.append("update_auth", "1");
		form.append("openapi", "1010_1030");
		form.append("g_tk", String(gtk));
		form.append("auth_time", String(Date.now()));
		form.append("ui", getGuid());
		let authorizeRes;
		try {
			const authorizeCookieHeader = await buildRequestCookieHeader("https://graph.qq.com/oauth2.0/authorize", Array.from(cookieMap.values()));
			authorizeRes = await withInjectedCookie(authorizeCookieHeader, ["||graph.qq.com"], () => fetchWithTimeout("https://graph.qq.com/oauth2.0/authorize", {
				method: "POST",
				redirect: "manual",
				credentials: "include",
				headers: {
					"User-Agent": UA,
					Referer: "https://graph.qq.com/",
					Origin: "https://graph.qq.com",
					Cookie: authorizeCookieHeader
				},
				body: form
			}, 12e3));
		} catch (err) {
			noteQrLoginStep("qr:authorize:exception", { message: err?.message || String(err) });
			return ticketExchangeFailure(qrsig, err && err.message || "授权请求失败", "授权响应异常");
		}
		mergeCookiePairs(cookieMap, collectSetCookies(authorizeRes));
		let location = authorizeRes.headers.get("Location") || authorizeRes.headers.get("location") || "";
		noteQrLoginStep("qr:authorize:first", {
			status: authorizeRes.status,
			location: String(location).slice(0, 200)
		});
		let authorizeRedirectHops = 0;
		while (authorizeRes.status >= 300 && authorizeRes.status < 400 && location && !/[?&]code=/.test(String(location)) && authorizeRedirectHops < 4) {
			authorizeRedirectHops += 1;
			let nextUrl;
			try {
				nextUrl = new URL(String(location), "https://graph.qq.com/").toString();
			} catch (_) {
				break;
			}
			noteQrLoginStep("qr:authorize:hop", {
				hop: authorizeRedirectHops,
				toHost: new URL(nextUrl).host,
				location: String(location).slice(0, 160)
			});
			try {
				const hopCookieHeader = await buildRequestCookieHeader(nextUrl, Array.from(cookieMap.values()));
				const hopRes = await fetchWithTimeout(nextUrl, {
					method: "GET",
					redirect: "manual",
					credentials: "include",
					headers: {
						"User-Agent": UA,
						Referer: "https://graph.qq.com/",
						Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
						Cookie: hopCookieHeader
					}
				}, 12e3);
				mergeCookiePairs(cookieMap, collectSetCookies(hopRes));
				mergeJarCookiePairs(cookieMap, await readJarCookiePairs(nextUrl));
				authorizeRes = hopRes;
				location = hopRes.headers.get("Location") || hopRes.headers.get("location") || "";
				noteQrLoginStep("qr:authorize:hop:result", {
					hop: authorizeRedirectHops,
					status: hopRes.status,
					hasLocation: Boolean(location),
					locationHost: (() => {
						try {
							return location ? new URL(String(location), nextUrl).host : "";
						} catch {
							return "";
						}
					})(),
					hasCode: /[?&]code=/.test(String(location))
				});
				if (!/[?&]code=/.test(String(location))) try {
					const bodyCode = (await hopRes.clone().text()).match(/[?&]code=([^&"'\s]+)/);
					if (bodyCode && bodyCode[1]) {
						location = `x?code=${bodyCode[1]}`;
						noteQrLoginStep("qr:authorize:code-in-body", { hop: authorizeRedirectHops });
					}
				} catch (_) {}
			} catch (err) {
				noteQrLoginStep("qr:authorize:hop:exception", {
					hop: authorizeRedirectHops,
					message: err?.message || String(err)
				});
				break;
			}
		}
		let authorizeBodyHead = "";
		const authorizeOk = authorizeRes.status >= 300 && authorizeRes.status < 400 && Boolean(location);
		if (!authorizeOk) try {
			authorizeBodyHead = String(await authorizeRes.clone().text()).replace(/\s+/g, " ").trim().slice(0, 160);
		} catch (_) {}
		noteQrLoginStep("qr:authorize", {
			status: authorizeRes.status,
			hasLocation: Boolean(location),
			hops: authorizeRedirectHops,
			locationHost: (() => {
				try {
					return new URL(String(location)).host;
				} catch {
					return "";
				}
			})(),
			hasCode: /[?&]code=/.test(String(location)),
			body: authorizeBodyHead || void 0
		});
		if (authorizeBodyHead) noteQrLoginStep("qr:authorize:body", { body: authorizeBodyHead });
		if (!authorizeOk) return ticketExchangeFailure(qrsig, "授权响应异常，未返回跳转地址", "授权响应异常，未返回跳转地址", { authorizeStatus: authorizeRes.status });
		const codeMatch = String(location).match(/[?&]code=([^&]+)/);
		if (!codeMatch || !codeMatch[1]) return ticketExchangeFailure(qrsig, "授权跳转缺少 code", "授权跳转缺少 code", { location: String(location).slice(0, 200) });
		const code = decodeURIComponent(codeMatch[1]);
		const fcgBody = JSON.stringify({
			comm: {
				g_tk: gtk,
				platform: "yqq",
				ct: 24,
				cv: 0
			},
			req: {
				module: "QQConnectLogin.LoginServer",
				method: "QQLogin",
				param: { code }
			}
		});
		let loginRes;
		try {
			const musicuCookieHeader = await buildRequestCookieHeader("https://u.y.qq.com/cgi-bin/musicu.fcg", Array.from(cookieMap.values()));
			loginRes = await withInjectedCookie(musicuCookieHeader, ["||u.y.qq.com", "||y.qq.com"], () => fetchWithTimeout("https://u.y.qq.com/cgi-bin/musicu.fcg", {
				method: "POST",
				credentials: "include",
				headers: {
					"User-Agent": UA,
					Referer: "https://y.qq.com/",
					"Content-Type": "application/x-www-form-urlencoded",
					Origin: "https://y.qq.com",
					Cookie: musicuCookieHeader
				},
				body: fcgBody
			}, 12e3));
		} catch (err) {
			noteQrLoginStep("qr:musicu:exception", { message: err?.message || String(err) });
			return ticketExchangeFailure(qrsig, err && err.message || "QQLogin 失败", "QQLogin 失败");
		}
		mergeCookiePairs(cookieMap, collectSetCookies(loginRes));
		noteQrLoginStep("qr:musicu", {
			status: loginRes.status,
			setCookieCount: collectSetCookies(loginRes).length
		});
		try {
			const json = await loginRes.clone().json();
			const dataNode = json && json.req && json.req.data;
			if (dataNode && typeof dataNode === "object") {
				if (dataNode.musickey) cookieMap.set("qm_keyst", `qm_keyst=${dataNode.musickey}`);
				if (dataNode.qqmusic_key) cookieMap.set("qqmusic_key", `qqmusic_key=${dataNode.qqmusic_key}`);
				const musicId = String(dataNode.musicid || dataNode.uin || "").replace(/\D/g, "");
				if (musicId && !cookieMap.has("uin") && !cookieMap.has("p_uin")) cookieMap.set("uin", `uin=o${musicId}`);
				if (musicId && !cookieMap.has("str_musicid")) cookieMap.set("str_musicid", `str_musicid=${musicId}`);
			}
		} catch (_) {}
		cookieMap.delete("tmeLoginType");
		cookieMap.set("login_type", "login_type=1");
		if (checkSigUin) {
			const musicIdTail = String(cookieMap.get("uin") || cookieMap.get("p_uin") || "").replace(/\D/g, "").slice(-4);
			cookieMap.set("uin", `uin=o${checkSigUin}`);
			if (!cookieMap.has("qqmusic_uin")) cookieMap.set("qqmusic_uin", `qqmusic_uin=o${checkSigUin}`);
			noteQrLoginStep("qr:session:uin-from-check-sig", {
				uinTail: checkSigUin.slice(-4),
				...musicIdTail && musicIdTail !== checkSigUin.slice(-4) ? { replacedTail: musicIdTail } : {}
			});
		}
		const session = buildLoginSession(cookiePairsToHeader(Array.from(cookieMap.values())));
		noteQrLoginStep("qr:session", {
			hasMusicKey: Boolean(session.cookieObject.qm_keyst || session.cookieObject.qqmusic_key),
			hasUin: Boolean(session.cookieObject.uin || session.cookieObject.p_uin),
			cookieCount: session.cookieList.length
		});
		if (!session.cookieObject.qm_keyst && !session.cookieObject.qqmusic_key) return ticketExchangeFailure(qrsig, "登录成功但未拿到 qm_keyst", "登录成功但未拿到 qm_keyst", { session });
		await writeSessionCookies(session);
		clearTicketExchangeFailures(qrsig);
		noteQrLoginStep("qr:done:ok");
		return {
			isOk: true,
			message: "登录成功",
			session,
			provider: "qq",
			code: 0,
			status: "ok",
			loggedIn: true,
			hasCookie: true,
			userId: String(session.uin || "").replace(/\D/g, ""),
			uin: String(session.uin || "").replace(/\D/g, ""),
			nickname: session.cookieObject.nick || session.cookieObject.nickname || `QQ ${String(session.uin || "").replace(/\D/g, "")}`
		};
	}
	//#endregion
	//#region src/webBridge/api/qq/explore.js
	/** 只认纯数字的正整数；小数、带字母、0、负数一律不算。 */
	const positiveId = (value) => typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : void 0;
	/** 上游的计数。不是正常整数就不给，调用方据此决定报不报「还有下一页」。 */
	const countOf = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : void 0;
	/** 上游的文字字段：只收非空字符串。 */
	const textOf$1 = (value) => typeof value === "string" && value.length > 0 ? value : void 0;
	const dictOf = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
	/** 上游的清单：null / 缺省当作没有，其他非数组是格式变了。 */
	const listOf = (value) => Array.isArray(value) ? value : [];
	/** 分页参数：不是正整数用默认值，超过上限压到上限。 */
	const pageSizeOf = (value, fallback, max) => {
		const parsed = Number.parseInt(String(value ?? ""), 10);
		if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback;
		return Math.min(max, parsed);
	};
	const offsetOf = (value) => {
		const parsed = Number.parseInt(String(value ?? ""), 10);
		return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
	};
	/** 必填的 id：只认纯数字正整数。 */
	const requiredId = (value) => {
		const raw = String(value ?? "").trim();
		if (!/^\d{1,15}$/.test(raw)) return void 0;
		return positiveId(Number(raw));
	};
	/** 会话里的 uin；没有会话返回空串。 */
	const numericUin = (cookieHeader) => {
		const uin = qqCookieUin(cookieHeader);
		return uin ? Number(uin) || uin : "";
	};
	/** 需要登录的那几条：没有 uin 就回 AUTH_REQUIRED。 */
	const needsLogin = (where, cookieHeader) => qqCookieUin(cookieHeader) ? null : qqAuthRequired(where);
	/** 分类是 `get_hot_category`：上游给的是分组，每组里才是分类。 */
	async function readPlaylistCategories(cookieHeader) {
		const result = await qqMusicuCall("music.web_category_svr", "get_hot_category", { qq: "" }, cookieHeader);
		if (!result.ok) return result.loginRequired ? qqAuthRequired("playlist-categories") : {
			code: 0,
			groups: []
		};
		return {
			code: 0,
			groups: listOf(dictOf(result.data).category).map((entry) => {
				const group = dictOf(entry);
				const categories = listOf(group.items).map((item) => {
					const id = positiveId(dictOf(item).item_id);
					return id === void 0 ? null : {
						id,
						name: String(dictOf(item).item_name || "")
					};
				}).filter(Boolean);
				const groupId = positiveId(group.group_id);
				return categories.length && groupId !== void 0 ? {
					id: groupId,
					name: String(group.group_name || ""),
					categories
				} : null;
			}).filter(Boolean)
		};
	}
	/** 与推荐歌单同一套字段名；没有可用 tid 的跳过。 */
	const toPlaylist = (entry) => {
		const item = dictOf(dictOf(entry).basic);
		const tid = positiveId(item.tid);
		if (tid === void 0) return null;
		const playCount = countOf(item.play_cnt);
		const cover = dictOf(item.cover);
		const creator = dictOf(item.creator);
		return {
			tid,
			title: String(item.title || ""),
			desc: String(item.desc || ""),
			picurl: [
				cover.big_url,
				cover.medium_url,
				cover.small_url,
				cover.default_url
			].map(textOf$1).find((url) => url !== void 0) ?? "",
			...playCount === void 0 ? {} : { play_cnt: playCount },
			creator: {
				...creator.uin !== void 0 ? { uin: creator.uin } : {},
				...textOf$1(creator.nick) ? { nick: creator.nick } : {},
				...textOf$1(creator.avatar) ? { avatar: creator.avatar } : {}
			}
		};
	};
	/** `page` 对外从 1 起，上游减 1；total 只看 content.total_cnt。 */
	async function readCategoryPlaylists(params, cookieHeader) {
		const id = requiredId(params.id);
		if (id === void 0) return {
			code: 0,
			playlists: []
		};
		const page = pageSizeOf(params.page, 1);
		const size = pageSizeOf(params.limit, 20, 40);
		const result = await qqMusicuCall("music.playlist.PlayListCategory", "get_category_content", {
			caller: "0",
			category_id: id,
			page: page - 1,
			size,
			use_page: 1
		}, cookieHeader, { uin: 0 });
		if (!result.ok) return result.loginRequired ? qqAuthRequired("category-playlists") : {
			code: 0,
			playlists: []
		};
		const data = dictOf(result.data);
		const content = dictOf(data.content);
		const playlists = listOf(content.v_item).map(toPlaylist).filter(Boolean);
		const total = countOf(content.total_cnt);
		return {
			code: 0,
			playlists,
			...total === void 0 ? {} : { total },
			more: total !== void 0 && page * size < total
		};
	}
	/** 上游的「最新」是地区 5；`lanlist` 是地区清单。 */
	const DEFAULT_NEW_SONG_AREA = 5;
	/** 歌曲条目原样交出去（与 track_info 同形），由前端自己正规化。 */
	async function readNewSongs(params, cookieHeader) {
		const area = params.area === void 0 || params.area === null || params.area === "" ? DEFAULT_NEW_SONG_AREA : requiredId(params.area) ?? DEFAULT_NEW_SONG_AREA;
		const result = await qqMusicuCall("newsong.NewSongServer", "get_new_song_info", { type: area }, cookieHeader);
		if (!result.ok) return result.loginRequired ? qqAuthRequired("new-songs") : {
			code: 0,
			songs: [],
			areas: []
		};
		const data = dictOf(result.data);
		const areas = listOf(data.lanlist).map((entry) => {
			const id = positiveId(dictOf(entry).type);
			return id === void 0 ? null : {
				id,
				name: String(dictOf(entry).name || "")
			};
		}).filter(Boolean);
		return {
			code: 0,
			area: positiveId(data.type) ?? area,
			songs: listOf(data.songlist),
			areas
		};
	}
	/** 地区清单没有「最新」，默认 1；专辑翻页用 `start`，`sin` 一律 0。 */
	const DEFAULT_NEW_ALBUM_AREA = 1;
	const toAlbum = (entry) => {
		const item = dictOf(entry);
		const mid = textOf$1(item.mid);
		if (mid === void 0) return null;
		const trackCount = countOf(dictOf(item.ex).track_nums);
		return {
			mid,
			name: String(item.name || ""),
			singers: listOf(item.singers).map((singer) => {
				const singerMid = textOf$1(dictOf(singer).mid);
				return singerMid === void 0 ? null : {
					mid: singerMid,
					name: String(dictOf(singer).name || "")
				};
			}).filter(Boolean),
			...positiveId(item.id) === void 0 ? {} : { id: positiveId(item.id) },
			...textOf$1(item.release_time) === void 0 ? {} : { publishDate: textOf$1(item.release_time) },
			...trackCount === void 0 ? {} : { trackCount }
		};
	};
	/** 两支放在同一次请求里：地区清单读不到不影响专辑。 */
	async function readNewAlbums(params, cookieHeader) {
		const area = params.area === void 0 || params.area === null || params.area === "" ? DEFAULT_NEW_ALBUM_AREA : requiredId(params.area) ?? DEFAULT_NEW_ALBUM_AREA;
		const start = offsetOf(params.offset);
		const [areas, albums] = await qqMusicuBatch([{
			module: "newalbum.NewAlbumServer",
			method: "get_new_album_area",
			param: {}
		}, {
			module: "newalbum.NewAlbumServer",
			method: "get_new_album_info",
			param: {
				area,
				sin: 0,
				start,
				num: pageSizeOf(params.limit, 20, 40)
			}
		}], cookieHeader);
		if (!albums.ok) return albums.loginRequired ? qqAuthRequired("new-albums") : {
			code: 0,
			albums: [],
			areas: []
		};
		const data = dictOf(albums.data);
		const entries = listOf(data.albums);
		const total = countOf(data.total);
		return {
			code: 0,
			area,
			albums: entries.map(toAlbum).filter(Boolean),
			areas: areas.ok ? listOf(dictOf(areas.data).area).map((entry) => {
				const id = positiveId(dictOf(entry).id);
				return id === void 0 ? null : {
					id,
					name: String(dictOf(entry).name || "")
				};
			}).filter(Boolean) : [],
			...total === void 0 ? {} : { total },
			more: total !== void 0 && start + entries.length < total
		};
	}
	/** 榜单的公开资料；缺字段或型别不对的就不给。 */
	const toChart = (entry) => {
		const item = dictOf(entry);
		const id = positiveId(item.topId);
		if (id === void 0) return null;
		const optional = [
			["intro", textOf$1(item.intro)],
			["period", textOf$1(item.period)],
			["updateType", countOf(item.updateType)],
			["updateTime", textOf$1(item.updateTime)],
			["total", countOf(item.totalNum)],
			["listenNum", countOf(item.listenNum)],
			["cover", textOf$1(item.headPicUrl) ?? textOf$1(item.frontPicUrl) ?? textOf$1(item.musichallPicUrl)]
		];
		return {
			id,
			title: String(item.title || ""),
			...Object.fromEntries(optional.filter(([, value]) => value !== void 0))
		};
	};
	const toPreview = (entry) => {
		const item = dictOf(entry);
		const rank = positiveId(item.rank);
		return rank === void 0 ? null : {
			rank,
			title: String(item.title || ""),
			singer: String(item.singerName || "")
		};
	};
	/** 清单是 `GetAll`（分组 → 榜），每组带几首预览。 */
	async function readToplists(cookieHeader) {
		const result = await qqMusicuCall("musicToplist.ToplistInfoServer", "GetAll", {}, cookieHeader);
		if (!result.ok) return result.loginRequired ? qqAuthRequired("toplists") : {
			code: 0,
			groups: []
		};
		return {
			code: 0,
			groups: listOf(dictOf(result.data).group).map((entry) => {
				const group = dictOf(entry);
				const charts = listOf(group.toplist).map((item) => {
					const info = toChart(item);
					if (!info) return null;
					return {
						...info,
						preview: listOf(dictOf(item).song).map(toPreview).filter(Boolean)
					};
				}).filter(Boolean);
				const groupId = positiveId(group.groupId);
				return charts.length && groupId !== void 0 ? {
					id: groupId,
					name: String(group.groupName || ""),
					toplists: charts
				} : null;
			}).filter(Boolean)
		};
	}
	/** 单榜是 `GetDetail`；参数要全小写的 `topid`，大写的 `topId` 会被忽略。 */
	async function readToplistSongs(params, cookieHeader) {
		const id = requiredId(params.id);
		if (id === void 0) return {
			code: 0,
			songs: []
		};
		const rawPeriod = params.period === void 0 || params.period === null ? "" : String(params.period);
		if (!/^[0-9_-]{0,20}$/.test(rawPeriod)) return {
			code: 0,
			songs: []
		};
		const offset = offsetOf(params.offset);
		const result = await qqMusicuCall("musicToplist.ToplistInfoServer", "GetDetail", {
			topid: id,
			offset,
			num: pageSizeOf(params.limit, 20, 100),
			period: rawPeriod
		}, cookieHeader);
		if (!result.ok) return result.loginRequired ? qqAuthRequired("toplist") : {
			code: 0,
			songs: []
		};
		const data = dictOf(result.data);
		const info = toChart(data.data);
		if (!info) return {
			code: 0,
			songs: []
		};
		const songs = listOf(data.songInfoList);
		const total = countOf(info.total);
		return {
			code: 0,
			toplist: info,
			songs,
			...total === void 0 ? {} : { total },
			more: total !== void 0 && offset + songs.length < total
		};
	}
	/** 歌在 `VecSongs[].Track`；`HasMore` 是布尔。 */
	async function readRadar(params, cookieHeader) {
		const parsed = Number.parseInt(String(params.page ?? ""), 10);
		const page = Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(100, parsed) : 1;
		const result = await qqMusicuCall("music.recommend.TrackRelationServer", "GetRadarSong", {
			Page: page,
			ReqType: 0,
			FavSongs: [],
			EntranceSongs: []
		}, cookieHeader);
		if (!result.ok) return result.loginRequired ? qqAuthRequired("radar") : {
			code: 0,
			songs: []
		};
		const data = dictOf(result.data);
		const entries = listOf(data.VecSongs);
		const songs = entries.map((entry) => {
			const box = dictOf(entry);
			const track = dictOf(box.Track || box.track || box.TrackInfo || box.track_info || box);
			const mid = textOf$1(track.mid) ?? textOf$1(track.songmid) ?? textOf$1(track.songMid);
			return mid === void 0 ? null : {
				...track,
				mid
			};
		}).filter(Boolean);
		noteLibraryStep("qq", "radar:decode", {
			entries: entries.length,
			songs: songs.length
		});
		return {
			code: 0,
			page,
			songs,
			more: data.HasMore === true
		};
	}
	/** 猜你喜欢（id 99）走自己的接口，其他电台走 `GetRadiosonglist`。 */
	const PERSONAL_RADIO_ID = 99;
	const toRadio = (entry) => {
		const radio = dictOf(entry);
		const id = positiveId(radio.id);
		if (id === void 0) return null;
		const listenNum = countOf(radio.listenNum);
		return {
			id,
			title: String(radio.title || ""),
			picurl: String(radio.pic_url || ""),
			...listenNum === void 0 ? {} : { listenNum }
		};
	};
	/** 清单是 `GetRadiolist`（分组 → `list[]` 电台）。空分组（还没听过的「最近」）照样保留。 */
	async function readRadioList(cookieHeader) {
		const login = needsLogin("radio-list", cookieHeader);
		if (login) return login;
		const result = await qqMusicuCall("pf.radiosvr", "GetRadiolist", { uin: numericUin(cookieHeader) }, cookieHeader);
		if (!result.ok) return result.loginRequired ? qqAuthRequired("radio-list") : {
			code: 0,
			groups: []
		};
		return {
			code: 0,
			groups: listOf(dictOf(result.data).radio_list).map((entry) => {
				const group = dictOf(entry);
				const id = positiveId(group.id);
				if (id === void 0) return null;
				return {
					id,
					title: String(group.title || ""),
					radios: listOf(group.list).map(toRadio).filter(Boolean)
				};
			}).filter(Boolean)
		};
	}
	/** 一次给一批（约 9 首），没有下一页。 */
	async function readRadioTracks(params, cookieHeader) {
		const login = needsLogin("radio-tracks", cookieHeader);
		if (login) return login;
		const id = requiredId(params.id);
		if (id === void 0) return {
			code: 0,
			songs: []
		};
		const result = id === PERSONAL_RADIO_ID ? await qqMusicuCall("music.radioProxy.MbTrackRadioSvr", "get_radio_track", {
			id: PERSONAL_RADIO_ID,
			firstplay: 1,
			num: 15
		}, cookieHeader) : await qqMusicuCall("pf.radiosvr", "GetRadiosonglist", {
			id,
			firstplay: 0,
			num: 9
		}, cookieHeader);
		if (!result.ok) return result.loginRequired ? qqAuthRequired("radio-tracks") : {
			code: 0,
			songs: []
		};
		const data = dictOf(result.data);
		return {
			code: 0,
			songs: listOf(data.tracks && data.tracks.length ? data.tracks : data.track_list),
			...Array.isArray(data.extras) ? { extras: data.extras } : {}
		};
	}
	/** 匿名时上游回 code 0 但清单是空的，所以这条要登录；资料在 `vecSongNew[].songs[].track`。 */
	async function readSimilarSongs(params, cookieHeader) {
		const login = needsLogin("similar-songs", cookieHeader);
		if (login) return login;
		const songId = requiredId(params.id);
		if (songId === void 0) return {
			code: 0,
			songs: []
		};
		const result = await qqMusicuCall("music.recommend.TrackRelationServer", "GetSimilarSongs", { songid: songId }, cookieHeader);
		if (!result.ok) return result.loginRequired ? qqAuthRequired("similar-songs") : {
			code: 0,
			songs: []
		};
		return {
			code: 0,
			songs: listOf(dictOf(result.data).vecSongNew).flatMap((group) => listOf(dictOf(group).songs)).map((row) => dictOf(row).track).filter((track) => typeof dictOf(track).mid === "string" && dictOf(track).mid.length > 0)
		};
	}
	/** 只有三级：HugeVip 为 1 是超级会员；为 0 时 iVipFlag 为 1 是绿钻、为 0 是免费。 */
	const vipLevelOf = (flags) => {
		if (flags.HugeVip === 1) return "super";
		if (flags.HugeVip !== 0) return "unknown";
		if (flags.iVipFlag === 1) return "green";
		return flags.iVipFlag === 0 ? "free" : "unknown";
	};
	/** 已观察的会员旗标按原值保留；账号与未知字段不带出去。 */
	const VIP_FIELDS = [
		"iVipFlag",
		"iSuperVip",
		"iNewSuperVip",
		"iNewVip",
		"HugeVip",
		"AdVipFlag",
		"AdActiveFlag",
		"AdSigned",
		"AdGotVipTs",
		"MainAdsFreeEndTs",
		"OverseaFlag",
		"iYellowVip",
		"iMusicLevel",
		"iCurLevel",
		"UnionFreeEndTs",
		"SongTiyanEndts"
	];
	async function readUserVip(cookieHeader) {
		const login = needsLogin("user-vip", cookieHeader);
		if (login) return login;
		const uin = numericUin(cookieHeader);
		const result = await qqMusicuCall("userInfo.VipQueryServer", "SRFVipQuery_V2", { uin_list: [uin] }, cookieHeader);
		if (!result.ok) return result.loginRequired ? qqAuthRequired("user-vip") : {
			code: 0,
			vipLevel: "unknown"
		};
		const info = dictOf(dictOf(dictOf(result.data).infoMap)[uin]);
		if (typeof info.iVipFlag !== "number" || !Number.isSafeInteger(info.iVipFlag)) return {
			code: 0,
			vipLevel: "unknown"
		};
		const upstream = Object.fromEntries(VIP_FIELDS.flatMap((key) => typeof info[key] === "string" || typeof info[key] === "boolean" || typeof info[key] === "number" && Number.isFinite(info[key]) ? [[key, info[key]]] : []));
		return {
			code: 0,
			isVip: info.iVipFlag === 1,
			vipLevel: vipLevelOf(upstream),
			upstream
		};
	}
	/** 上游的页长；外面要的分页在本地切，所以一般一次请求只打一次上游。 */
	const CLOUD_PAGE_SIZE = 2e3;
	/** 最多接着读几页（2 万首）。 */
	const CLOUD_MAX_PAGES = 10;
	/** 这个值表示按原文件处理、不是曲库里的歌，放不了。 */
	const MATCHED_ORIGINAL_FILE = 2;
	const BASE64 = /^(?:[A-Za-z0-9+/]{4})+(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$|^[A-Za-z0-9+/]{2}==$|^[A-Za-z0-9+/]{3}=$/;
	/** 文件名是 base64 编码的 UTF-8；解不出来就照原样给，不猜别的编码。 */
	const cloudFileNameOf = (value) => {
		if (typeof value !== "string") return "";
		if (!BASE64.test(value)) return value;
		try {
			const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
			const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
			return decoded && !/[\u0000-\u001f\u007f]/.test(decoded) ? decoded : value;
		} catch (_) {
			return value;
		}
	};
	/** 只交出歌曲、文件名、加入时间和能不能播；文件 id 与上传用的字段不带出去。 */
	const toCloudSong = (entry) => {
		const row = dictOf(entry);
		const song = dictOf(row.song_info);
		const mid = typeof song.mid === "string" ? song.mid.trim() : "";
		const addTime = typeof row.timestamp === "number" && Number.isSafeInteger(row.timestamp) && row.timestamp > 0 ? row.timestamp < 1e11 ? row.timestamp * 1e3 : row.timestamp : null;
		return {
			song: row.song_info,
			fileName: cloudFileNameOf(row.filename),
			addTime,
			playable: mid !== "" && row.matched !== MATCHED_ORIGINAL_FILE
		};
	};
	async function readUserCloud(params, cookieHeader) {
		const login = needsLogin("user-cloud", cookieHeader);
		if (login) return login;
		const offset = Math.max(0, offsetOf(params.offset));
		const limit = Math.min(1e3, Math.max(1, Number.parseInt(String(params.limit ?? ""), 10) || 200));
		const uin = numericUin(cookieHeader);
		const entries = [];
		let total;
		let hasMore = true;
		for (let page = 1; page <= CLOUD_MAX_PAGES && hasMore; page += 1) {
			const result = await qqMusicuCall("music.WeiyunMusic.WeiyunMusicRead", "GetMatchAudio", {
				uin,
				file_id: "",
				page_no: page,
				page_size: CLOUD_PAGE_SIZE
			}, cookieHeader);
			if (!result.ok) return entries.length ? {
				code: 0,
				data: [],
				count: entries.length,
				hasMore: false
			} : result.loginRequired ? qqAuthRequired("user-cloud") : {
				code: 0,
				data: [],
				count: 0
			};
			const data = dictOf(result.data);
			if (total === void 0) total = countOf(data.total);
			entries.push(...listOf(data.info_list));
			hasMore = data.has_more === 1 && listOf(data.info_list).length > 0;
			if (entries.length >= offset + limit) break;
		}
		const count = Math.max(total ?? 0, entries.length);
		const slice = entries.slice(offset, offset + limit).filter((entry) => entry && typeof entry === "object").map(toCloudSong);
		const end = Math.min(offset + limit, entries.length);
		return {
			code: 0,
			data: slice,
			count,
			hasMore: end < count || hasMore && end >= entries.length
		};
	}
	/** 写入回包要 `retCode` 为 0 才算成功。 */
	const playlistWriteResult = (data) => {
		const result = dictOf(data);
		if (result.retCode !== 0 || !dictOf(result.result).tid) return null;
		return result.result;
	};
	/**
	* 建一张空歌单：写一次、从自建清单读回才回成功。读不回来说失败而不重送 ——
	* 可能已经建好了，重送会建出第二张。名称用读回来的那个。
	*/
	async function createPlaylist(params, cookieHeader) {
		const login = needsLogin("playlist-create", cookieHeader);
		if (login) return login;
		const name = String(params.name ?? "").trim();
		if (!name || [...name].length > 20) return {
			__foliaBridgeError: "UNSUPPORTED",
			message: "QQ playlist create: bad name"
		};
		const uin = numericUin(cookieHeader);
		const write = await qqMusicuCall("music.musicasset.PlaylistBaseWrite", "AddPlaylist", { dirName: name }, cookieHeader);
		if (!write.ok) return write.loginRequired ? qqAuthRequired("playlist-create") : qqBridgeFailure("playlist-create", write.code);
		const written = playlistWriteResult(write.data);
		const tid = positiveId(written && written.tid);
		const dirId = positiveId(written && written.dirId);
		if (tid === void 0 || dirId === void 0 || dirId >= 200) return qqBridgeFailure("playlist-create", write.data && write.data.retCode || "unconfirmed");
		const owned = await qqMusicuCall("music.musicasset.PlaylistBaseRead", "GetPlaylistByUin", { uin }, cookieHeader);
		if (owned.ok) {
			const row = listOf(dictOf(owned.data).v_playlist).find((item) => positiveId(dictOf(item).tid) === tid);
			if (row && typeof dictOf(row).dirName === "string") return {
				code: 0,
				tid,
				dirId,
				name: dictOf(row).dirName,
				verified: true
			};
		}
		return {
			code: 0,
			tid,
			dirId,
			name,
			verified: false
		};
	}
	const SEARCH_TYPES = {
		song: 0,
		singer: 1,
		album: 2,
		playlist: 3
	};
	/** 精简版把各类型的条目直接放在 `body` 下的数组里；歌手那组没有 `item_` 前缀。 */
	const SEARCH_LIST_KEYS = {
		song: "item_song",
		singer: "singer",
		album: "item_album",
		playlist: "item_songlist"
	};
	/** 不登录搜歌要送 7：上游已经不认 0，送 0 一律回 2001。带会话照旧送 0。 */
	const ANONYMOUS_SONG_SEARCH_TYPE = 7;
	/** 精简版客户端的匿名身份：只放协议需要的应用与版本常数，不带设备指纹。 */
	const ANONYMOUS_LITE_COMM = {
		ct: 11,
		cv: "1003006",
		v: "1003006",
		tmeAppID: "qqmusiclight",
		nettype: "NETWORK_WIFI",
		udid: "0",
		uid: "0"
	};
	/** 标头里的 `tmeLoginType=-1` 表示未登录。 */
	const ANONYMOUS_LITE_COOKIE = "tmeLoginType=-1";
	/** 每次搜索带一个随机数字串；不需要密码学强度。 */
	const searchIdOf = () => `${Math.floor(Math.random() * 9 + 1)}${Array.from({ length: 17 }, () => Math.floor(Math.random() * 10)).join("")}`;
	/**
	* 有会话就带会话搜（匿名搜歌常被上游以 2001 拒绝），没有会话用精简版的匿名身份。
	* 条目原样交出去（保留各种 MID），由前端自己正规化。
	*/
	async function searchCatalog(params, cookieHeader) {
		const type = typeof params.type === "string" && SEARCH_TYPES[params.type] !== void 0 ? params.type : "song";
		const keyword = String(params.keyword ?? "").trim();
		if (!keyword || keyword.length > 60) return {
			code: 0,
			type,
			items: [],
			more: false
		};
		const page = pageSizeOf(params.page, 1);
		const limit = pageSizeOf(params.limit, 10, 20);
		const signedIn = Boolean(qqCookieUin(cookieHeader));
		const result = await qqMusicuCall("music.search.SearchCgiService", "DoSearchForQQMusicLite", {
			search_id: searchIdOf(),
			remoteplace: "search.android.keyboard",
			query: keyword,
			search_type: !signedIn && type === "song" ? ANONYMOUS_SONG_SEARCH_TYPE : SEARCH_TYPES[type],
			num_per_page: limit,
			page_num: page,
			highlight: 0,
			nqc_flag: 0,
			page_id: 1,
			grp: 1
		}, signedIn ? cookieHeader : ANONYMOUS_LITE_COOKIE, signedIn ? void 0 : ANONYMOUS_LITE_COMM);
		if (!result.ok) return result.loginRequired ? qqAuthRequired("search") : {
			code: 0,
			type,
			items: [],
			more: false
		};
		const data = dictOf(result.data);
		const items = listOf(dictOf(data.body)[SEARCH_LIST_KEYS[type]]).filter((item) => item && typeof item === "object");
		const meta = dictOf(data.meta);
		const total = countOf(meta.sum);
		return {
			code: 0,
			type,
			page,
			limit,
			items,
			...total === void 0 ? {} : { total },
			more: typeof meta.nextpage === "number" && Number.isSafeInteger(meta.nextpage) && meta.nextpage > 0
		};
	}
	//#endregion
	//#region src/webBridge/api/qq.js
	const noteQQLibraryStep = (step, detail) => noteLibraryStep("qq", step, detail);
	/** QQ 上游表示「不认这个凭据」的业务码。 */
	const QQ_AUTH_REJECTED_CODES = /* @__PURE__ */ new Set([1e3, 301]);
	const isQQAuthRejectedCode = (code) => QQ_AUTH_REJECTED_CODES.has(Number(code));
	const isQQAuthRejectedResponse = (json) => isQQAuthRejectedCode(Number(json && json.code)) || isQQAuthRejectedCode(Number(json && json.req_0 && json.req_0.code));
	function qqLoginRequiredError(where, code) {
		const error = /* @__PURE__ */ new Error(`QQ ${where}: login required (code ${Number(code) || "unknown"})`);
		error.loginRequired = true;
		return error;
	}
	const swallowUnlessLoginRequired = (error) => {
		if (error && error.loginRequired) throw error;
		return [];
	};
	/**
	* Bridge wrappers around sansenjian/qq-music-api QR login:
	* GET  /user/getQQLoginQr  → handleQQLoginQrCreate
	* POST /user/checkQQLoginQr → handleQQLoginQrCheck
	* Docs: https://sansenjian.github.io/qq-music-api/api/user.html
	*/
	async function handleQQLoginQrCreate() {
		return qqGetLoginQr();
	}
	async function handleQQLoginQrCheck(qrsig, ptqrtoken) {
		const result = await qqCheckLoginQr({
			qrsig,
			ptqrtoken
		});
		if (result?.session?.cookie) await saveProviderCookie("qq", result.session.cookie);
		if (result && result.isOk && result.loggedIn) try {
			clearCookieCache();
			const status = await getQQLoginStatus(await getQQCookie());
			if (status && status.loggedIn) return {
				...result,
				...status,
				isOk: true,
				code: 0,
				status: "ok",
				message: "登录成功",
				loggedIn: true,
				session: result.session
			};
		} catch (_) {}
		if (result && result.retryable === false && result.status === "error") try {
			clearCookieCache();
			const status = await getQQLoginStatus(await getQQCookie());
			if (status && status.loggedIn) {
				noteQQLibraryStep("qr:exchange:recovered", { hasUserId: Boolean(status.uin || status.userId) });
				return {
					...result,
					...status,
					isOk: true,
					code: 0,
					status: "ok",
					message: "登录成功",
					loggedIn: true,
					hasCookie: true,
					retryable: true
				};
			}
		} catch (_) {}
		return result;
	}
	const QQ_MUSICU_URL = "https://u.y.qq.com/cgi-bin/musicu.fcg";
	function normalizeQualityPreference$2(value) {
		const raw = String(value || "").toLowerCase().trim();
		if ([
			"jymaster",
			"master",
			"studio",
			"svip",
			"highest"
		].includes(raw)) return "jymaster";
		if ([
			"hires",
			"hi-res",
			"highres",
			"zhenyin",
			"spatial"
		].includes(raw)) return "hires";
		if ([
			"lossless",
			"flac",
			"sq"
		].includes(raw)) return "lossless";
		if ([
			"exhigh",
			"high",
			"320",
			"320k",
			"hq"
		].includes(raw)) return "exhigh";
		if ([
			"standard",
			"normal",
			"128",
			"128k",
			"std"
		].includes(raw)) return "standard";
		return "hires";
	}
	const QQ_QUALITY_CANDIDATE_TEMPLATES = [
		{
			prefix: "RS01",
			ext: ".flac",
			level: "hires",
			label: "Hi-Res FLAC"
		},
		{
			prefix: "F000",
			ext: ".flac",
			level: "lossless",
			label: "无损 FLAC"
		},
		{
			prefix: "M800",
			ext: ".mp3",
			level: "exhigh",
			label: "320k MP3"
		},
		{
			prefix: "M500",
			ext: ".mp3",
			level: "standard",
			label: "128k MP3"
		},
		{
			prefix: "C400",
			ext: ".m4a",
			level: "aac",
			label: "AAC/M4A"
		}
	];
	function qualityCandidatesFrom$1(target, candidates) {
		target = normalizeQualityPreference$2(target);
		let start = candidates.findIndex((item) => item.level === target);
		if (start < 0) start = 0;
		return candidates.slice(start);
	}
	function playbackRestriction$1(provider, category, message, action, extra) {
		return Object.assign({
			provider,
			category,
			message,
			action: action || "none"
		}, extra || {});
	}
	function classifyQQPlaybackRestriction(info, session) {
		const hasSession = typeof session === "object" ? !!session.hasSession : !!session;
		const hasPlaybackKey = typeof session === "object" ? !!session.hasPlaybackKey : hasSession;
		const rawMsg = String(info && (info.msg || info.tips || info.errmsg || info.message) || "").trim();
		const code = Number(info && (info.result || info.code || info.errtype) || 0);
		const lower = rawMsg.toLowerCase();
		if (!hasSession) return playbackRestriction$1("qq", "login_required", "QQ 音乐需要登录或授权后才能获取播放地址", "login", {
			code,
			rawMessage: rawMsg
		});
		if (!hasPlaybackKey && code === 104003) return playbackRestriction$1("qq", "login_required", "QQ 音乐当前只拿到了网页登录状态，还缺少播放授权，请重新打开 y.qq.com 完成登录", "login", {
			code,
			rawMessage: rawMsg,
			missingPlaybackKey: true
		});
		if (code === 104003) return playbackRestriction$1("qq", "copyright_unavailable", "QQ 音乐没有给当前版本返回播放地址，通常是版权、会员或官方版本限制", "switch_source", {
			code,
			rawMessage: rawMsg
		});
		if (/vip|会员|付费|购买|数字专辑|专辑|pay/.test(lower + rawMsg)) return playbackRestriction$1("qq", "vip_required", "QQ 音乐歌曲需要会员、购买或数字专辑权限", "upgrade", {
			code,
			rawMessage: rawMsg
		});
		if (code && code !== 0) return playbackRestriction$1("qq", "copyright_unavailable", rawMsg || "QQ 音乐版权暂不可播或仅官方客户端可播", "switch_source", {
			code,
			rawMessage: rawMsg
		});
		return playbackRestriction$1("qq", "url_unavailable", "QQ 音乐没有返回播放地址，可能受版权、会员或官方客户端限制", "switch_source", {
			code,
			rawMessage: rawMsg
		});
	}
	function parseJSONText(text) {
		const raw = String(text || "").trim();
		return JSON.parse(raw.replace(/^callback\(([\s\S]*)\);?$/, "$1"));
	}
	function qqOfficialCoverSize(size) {
		const want = Math.max(1, Number(size) || 300);
		const allowed = [
			68,
			90,
			126,
			150,
			180,
			300,
			500,
			800
		];
		let best = allowed[0];
		let bestDiff = Math.abs(want - best);
		for (let i = 1; i < allowed.length; i++) {
			const px = allowed[i];
			const diff = Math.abs(want - px);
			if (diff < bestDiff || diff === bestDiff && px > best) {
				best = px;
				bestDiff = diff;
			}
		}
		return best;
	}
	function qqAlbumCover(albumMid, size) {
		if (!albumMid) return "";
		const px = qqOfficialCoverSize(size || 300);
		return `https://y.gtimg.cn/music/photo_new/T002R${px}x${px}M000${albumMid}.jpg?max_age=2592000`;
	}
	function qqFeeFromPay(pay) {
		pay = pay || {};
		if (Number(pay.time_free) === 1) return 0;
		if (Number(pay.pay_play) === 1 || Number(pay.pay_month) === 1) return 1;
		return 0;
	}
	function qqFeeFromTrack(track) {
		track = track || {};
		if (track.pay && typeof track.pay === "object") return qqFeeFromPay(track.pay);
		const fnote = Number(track.fnote || 0);
		if (fnote === 4009 || fnote === 8012 || fnote === 8013) return 1;
		return 0;
	}
	function mergeQQSearchEnrich(item, detail) {
		if (!item || !detail) return item;
		if (!item.name && detail.name) item.name = detail.name;
		if (!item.artist && detail.artist) item.artist = detail.artist;
		if ((!item.artists || !item.artists.length) && Array.isArray(detail.artists) && detail.artists.length) item.artists = detail.artists;
		if (!item.album && detail.album) item.album = detail.album;
		if (!item.duration && detail.duration) item.duration = detail.duration;
		if (!item.interval && detail.interval) item.interval = detail.interval;
		if (!item.songmid && detail.songmid) item.songmid = detail.songmid;
		if (detail.mediaMid) item.mediaMid = detail.mediaMid;
		if (detail.cover && !item.cover) item.cover = detail.cover;
		if (detail.albumMid && !item.albumMid) item.albumMid = detail.albumMid;
		if (detail.artistMid && !item.artistMid) item.artistMid = detail.artistMid;
		if (detail.fee != null) item.fee = detail.fee;
		return item;
	}
	async function qqSongDetailsBatch(items, cookieHeader) {
		items = (items || []).filter((item) => item && item.mid);
		if (!items.length) return items;
		if (items.length === 1) {
			try {
				mergeQQSearchEnrich(items[0], await qqSongDetail(items[0].mid, items[0], cookieHeader));
			} catch (_) {}
			return items;
		}
		const CHUNK_SIZE = 50;
		const MAX_PARALLEL = 4;
		const chunks = [];
		for (let index = 0; index < items.length; index += CHUNK_SIZE) chunks.push(items.slice(index, index + CHUNK_SIZE));
		for (let index = 0; index < chunks.length; index += MAX_PARALLEL) await Promise.all(chunks.slice(index, index + MAX_PARALLEL).map(async (chunk) => {
			try {
				const json = await qqMusicRequest({
					comm: {
						ct: 24,
						cv: 0
					},
					songinfo: {
						module: "music.pf_song_detail_svr",
						method: "get_song_detail_yqq",
						param: { song_mid: chunk.map((item) => item.mid).join(",") }
					}
				}, cookieHeader);
				const data = json && json.songinfo && json.songinfo.data;
				let rawTracks = [];
				if (Array.isArray(data && data.track_info)) rawTracks = data.track_info;
				else if (data && data.track_info) rawTracks = [data.track_info];
				else if (Array.isArray(data)) rawTracks = data;
				const byMid = {};
				rawTracks.forEach((raw) => {
					const mapped = mapQQTrack(raw && (raw.track_info || raw.songInfo || raw.songinfo || raw), {});
					if (mapped && mapped.mid) byMid[mapped.mid] = mapped;
				});
				chunk.forEach((item) => {
					if (byMid[item.mid]) mergeQQSearchEnrich(item, byMid[item.mid]);
				});
			} catch (_) {}
		}));
		const missing = items.filter((item) => !item.name || !item.mediaMid && item.fee == null);
		noteQQLibraryStep("song-details:batch", {
			requested: items.length,
			named: items.filter((item) => Boolean(item.name)).length,
			chunks: chunks.length,
			fallback: Math.min(missing.length, 30)
		});
		await Promise.all(missing.slice(0, 30).map(async (item) => {
			try {
				mergeQQSearchEnrich(item, await qqSongDetail(item.mid, item, cookieHeader));
			} catch (_) {}
		}));
		return items;
	}
	function mapQQArtists(raw) {
		return (raw || []).map((a) => ({
			id: a && a.id,
			mid: a && a.mid,
			name: a && (a.name || a.title) || ""
		})).filter((a) => a.name);
	}
	function mapQQTrack(track, fallback) {
		track = track || {};
		fallback = fallback || {};
		const albumObj = track.album && typeof track.album === "object" ? track.album : {};
		const artists = mapQQArtists(track.singer || track.singerInfo || []);
		let artistText = artists.map((a) => a.name).join(" / ");
		if (!artistText && typeof track.singer === "string") artistText = track.singer;
		if (!artistText && track.singername) artistText = track.singername;
		const mid = track.mid || track.songmid || track.songMid || fallback.mid || fallback.songmid || "";
		const albumMid = albumObj.mid || albumObj.pmid || track.albummid || track.albumMid || fallback.albumMid || fallback.albummid || "";
		const albumName = albumObj.name || albumObj.title || (typeof track.album === "string" ? track.album : "") || track.albumname || track.albumName || fallback.album || "";
		const qqId = track.id || track.songid || track.songId || track.songID || fallback.qqId || fallback.id || "";
		const interval = Number(track.interval || track.songInterval || track.duration || fallback.interval || 0) || 0;
		return {
			provider: "qq",
			source: "qq",
			type: "qq",
			id: mid || String(qqId || ""),
			qqId: String(qqId || ""),
			mid,
			songmid: mid,
			mediaMid: track.file && track.file.media_mid || track.strMediaMid || track.media_mid || track.mediaMid || fallback.mediaMid || "",
			name: track.name || track.title || track.songname || track.songName || fallback.name || "",
			artist: artistText || fallback.artist || "",
			artists: artists.length ? artists : artistText ? [{ name: artistText }] : fallback.artists || [],
			artistId: artists[0] && (artists[0].id || artists[0].mid),
			artistMid: artists[0] && artists[0].mid,
			album: albumName,
			albumMid,
			cover: qqAlbumCover(albumMid, 300) || normalizeQQPlaylistCover(track.albumimg || track.albumImg || track.albumpic || track.albumPic || track.pic || albumObj.pic || albumObj.picurl || albumObj.cover || fallback.cover || fallback.albumimg || ""),
			duration: interval > 1e3 ? interval : interval * 1e3 || fallback.duration || 0,
			fee: qqFeeFromTrack(track),
			playable: false
		};
	}
	async function qqMusicRequest(payload, cookieHeader) {
		return (await fetch(`${QQ_MUSICU_URL}?format=json`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json;charset=UTF-8",
				Referer: "https://y.qq.com/",
				"User-Agent": UA,
				Cookie: cookieHeader || ""
			},
			body: JSON.stringify(payload)
		})).json();
	}
	async function qqGetJSON(url, params, cookieHeader) {
		const u = new URL(url);
		Object.entries(params || {}).forEach(([k, v]) => u.searchParams.set(k, String(v)));
		return parseJSONText(await (await fetch(u.toString(), { headers: {
			Referer: "https://y.qq.com/",
			"User-Agent": UA,
			Cookie: cookieHeader || ""
		} })).text());
	}
	async function qqSongDetail(mid, fallback, cookieHeader) {
		if (!mid) return fallback;
		const json = await qqMusicRequest({
			comm: {
				ct: 24,
				cv: 0
			},
			songinfo: {
				module: "music.pf_song_detail_svr",
				method: "get_song_detail_yqq",
				param: { song_mid: mid }
			}
		}, cookieHeader);
		const data = json && json.songinfo && json.songinfo.data;
		return mapQQTrack(data && data.track_info, fallback);
	}
	function firstPositiveNumberFrom$1(objects, keys) {
		for (const obj of objects) {
			if (!obj || typeof obj !== "object") continue;
			for (const key of keys) {
				const value = Number(obj[key]);
				if (Number.isFinite(value) && value > 0) return value;
			}
		}
		return 0;
	}
	function normalizeQQVipFields(profileBody, vipQueryBody, cookieHeader) {
		const cookieObj = parseCookieString(cookieHeader);
		const data = profileBody && (profileBody.data || profileBody.profile || profileBody.creator || profileBody.result) || {};
		const creator = data.creator || data.user || data.profile || data || {};
		const vipInfo = data.vipInfo || data.vipinfo || data.vip || creator.vipInfo || creator.vipinfo || {};
		const vipQueryData = vipQueryBody && vipQueryBody.req_0 && vipQueryBody.req_0.data || vipQueryBody || {};
		const infoMap = vipQueryData.infoMap || vipQueryData.map_userinfo || vipQueryData.mapUserInfo || {};
		const uin = qqCookieUin(cookieHeader);
		const uinKeys = [
			String(uin),
			uin ? `0${uin}` : "",
			...Object.keys(infoMap || {})
		];
		let queryInfo = null;
		for (const key of uinKeys) if (key && infoMap && infoMap[key]) {
			queryInfo = infoMap[key];
			break;
		}
		if (!queryInfo && infoMap && typeof infoMap === "object") {
			const values = Object.values(infoMap);
			queryInfo = values.length ? values[0] : null;
		}
		const objects = [
			cookieObj,
			data,
			creator,
			vipInfo,
			queryInfo,
			vipQueryData
		].filter(Boolean);
		let vipType = firstPositiveNumberFrom$1(objects, [
			"vipType",
			"vip_type",
			"viptype",
			"musicVipType",
			"music_vip_type",
			"music_vip_level",
			"green_vip_level",
			"luxury_vip_level",
			"iGreenDiamondLevel",
			"iVipLevel",
			"iSuperVip",
			"iHugeVip",
			"uHugeVipMask",
			"uVipMask"
		]);
		const vipFlag = objects.some((obj) => {
			if (!obj) return false;
			const flag = obj.isVip ?? obj.is_vip ?? obj.vipFlag ?? obj.vipflag ?? obj.iVipFlag;
			return flag === true || Number(flag) > 0 || String(flag || "").toLowerCase() === "true";
		});
		const hugeVip = objects.some((obj) => obj && Number(obj.uHugeVipMask || obj.iHugeVip || obj.huge_vip || obj.iSuperVip || 0) > 0);
		if (!vipType && (vipFlag || hugeVip)) vipType = hugeVip ? 7 : 1;
		const isVip = vipType > 0 || vipFlag || hugeVip;
		return {
			vipType: vipType || (isVip ? 1 : 0),
			vipLevel: isVip ? "vip" : "none",
			isVip,
			isSvip: false,
			vipLabel: isVip ? "QQ VIP" : "无VIP"
		};
	}
	function normalizeQQProfile(body, cookieHeader) {
		const uin = qqCookieUin(cookieHeader);
		const data = body && (body.data || body.profile || body.creator || body.result) || {};
		const creator = data.creator || data.user || data.profile || data || {};
		const profileNick = creator.nick || creator.nickname || creator.name || creator.hostname || creator.title || "";
		const profileAvatar = creator.headpic || creator.avatar || creator.avatarUrl || creator.logo || "";
		const cookieNick = qqCookieNickname(cookieHeader, uin);
		const nick = profileNick || cookieNick || "";
		const avatar = profileAvatar || qqCookieAvatar(cookieHeader, uin);
		const vip = normalizeQQVipFields(body, null, cookieHeader);
		return {
			provider: "qq",
			loggedIn: !!(uin && qqCookieMusicKey(cookieHeader)),
			preview: false,
			userId: uin,
			uin,
			nickname: nick || (uin ? `QQ ${uin}` : "QQ 音乐"),
			avatar,
			...vip,
			hasCookie: !!cookieHeader,
			playbackKeyReady: !!qqCookiePlaybackKey(cookieHeader),
			profileSource: profileNick || profileAvatar ? "qq-profile" : cookieNick || avatar ? "cookie" : "fallback"
		};
	}
	async function fetchQQProfileHomepage(uin, cookieHeader) {
		const u = new URL("https://c.y.qq.com/rsc/fcgi-bin/fcg_get_profile_homepage.fcg");
		u.searchParams.set("cid", "205360838");
		u.searchParams.set("userid", uin);
		u.searchParams.set("reqfrom", "1");
		u.searchParams.set("g_tk", "5381");
		u.searchParams.set("loginUin", uin);
		u.searchParams.set("hostUin", "0");
		u.searchParams.set("format", "json");
		u.searchParams.set("inCharset", "utf8");
		u.searchParams.set("outCharset", "utf-8");
		u.searchParams.set("notice", "0");
		u.searchParams.set("platform", "yqq.json");
		u.searchParams.set("needNewCode", "0");
		return qqGetJSON(u.origin + u.pathname, Object.fromEntries(u.searchParams.entries()), cookieHeader);
	}
	async function fetchQQVipQuery(uin, cookieHeader) {
		const musicKey = qqCookieMusicKey(cookieHeader);
		const comm = {
			uin,
			format: "json",
			ct: musicKey ? 19 : 24,
			cv: 0
		};
		if (musicKey) comm.authst = musicKey;
		return qqMusicRequest({
			comm,
			req_0: {
				module: "userInfo.VipQueryServer",
				method: "SRFVipQuery_V2",
				param: { uin_list: [String(uin)] }
			}
		}, cookieHeader);
	}
	async function warmQQLoginCookies() {
		try {
			await fetch("https://y.qq.com/", {
				method: "GET",
				credentials: "include",
				redirect: "follow",
				headers: {
					"User-Agent": UA,
					Referer: "https://y.qq.com/"
				}
			});
		} catch (_) {}
		clearCookieCache();
		return getQQCookie();
	}
	async function getQQLoginStatus(cookieHeader) {
		if (!cookieHeader) try {
			cookieHeader = await warmQQLoginCookies();
		} catch (_) {
			cookieHeader = "";
		}
		const uin = qqCookieUin(cookieHeader);
		const musicKey = qqCookieMusicKey(cookieHeader);
		const fallback = normalizeQQProfile(null, cookieHeader);
		if (!uin || !musicKey) return {
			...fallback,
			loggedIn: false,
			missing: {
				uin: !uin,
				musicKey: !musicKey
			},
			message: !uin && !musicKey ? "未检测到 QQ 音乐登录 Cookie，请先在 y.qq.com 扫码登录" : !musicKey ? "已检测到 QQ 账号，但缺少 qm_keyst 播放票据，请在 y.qq.com 重新登录" : "缺少 QQ uin"
		};
		let profileBody = null;
		let vipQueryBody = null;
		try {
			[profileBody, vipQueryBody] = await Promise.all([fetchQQProfileHomepage(uin, cookieHeader).catch(() => null), fetchQQVipQuery(uin, cookieHeader).catch(() => null)]);
		} catch (_) {}
		const info = normalizeQQProfile(profileBody, cookieHeader);
		const vip = normalizeQQVipFields(profileBody, vipQueryBody, cookieHeader);
		const merged = {
			...info,
			...vip,
			vipType: Math.max(Number(info.vipType || 0), Number(vip.vipType || 0)) || (vip.isVip ? 1 : 0),
			isVip: !!(info.isVip || vip.isVip),
			vipLevel: info.isVip || vip.isVip ? "vip" : "none",
			vipLabel: info.isVip || vip.isVip ? "QQ VIP" : "无VIP"
		};
		if (profileBody && (isQQAuthRejectedCode(profileBody.code) || isQQAuthRejectedCode(profileBody.result))) {
			noteQQLibraryStep("login-status:credential-rejected", { code: Number(profileBody.code ?? profileBody.result) });
			return {
				...merged,
				loggedIn: false,
				loginExpired: true,
				profileUnavailable: true,
				message: "QQ 登录已失效，请重新登录"
			};
		}
		if (!merged.vipType && !merged.isVip && vipQueryBody) merged.vipSource = "vip-query";
		else if (merged.vipType > 0) merged.vipSource = profileBody ? "qq-profile" : "cookie";
		return merged;
	}
	async function handleQQSongUrl(mid, mediaMid, qualityPreference, cookieHeader) {
		const songmid = String(mid || "").trim();
		if (!songmid) return {
			provider: "qq",
			url: "",
			error: "MISSING_MID",
			message: "Missing QQ song mid"
		};
		const guid = String(1e7 + Math.floor(Math.random() * 9e7));
		const uin = qqCookieUin(cookieHeader) || "0";
		const musicKey = qqCookieMusicKey(cookieHeader);
		const playbackKey = qqCookiePlaybackKey(cookieHeader);
		let fileMediaMid = String(mediaMid || "").trim();
		let detailMeta = null;
		if (!fileMediaMid) try {
			const detail = await qqSongDetail(songmid, {}, cookieHeader);
			detailMeta = detail || null;
			fileMediaMid = String(detail && detail.mediaMid || "").trim();
		} catch (_) {}
		if (!detailMeta) try {
			detailMeta = await qqSongDetail(songmid, {}, cookieHeader);
		} catch (_) {}
		const requestedQuality = normalizeQualityPreference$2(qualityPreference);
		const mediaIds = [];
		if (fileMediaMid) mediaIds.push(fileMediaMid);
		if (songmid && !mediaIds.includes(songmid)) mediaIds.push(songmid);
		const fileCandidates = mediaIds.flatMap((mediaId) => qualityCandidatesFrom$1(requestedQuality, QQ_QUALITY_CANDIDATE_TEMPLATES).map((item) => ({
			...item,
			mediaId,
			filename: item.prefix + mediaId + item.ext
		})));
		const filenames = fileCandidates.map((item) => item.filename);
		const param = {
			guid,
			songmid: filenames.length ? filenames.map(() => songmid) : [songmid],
			songtype: filenames.length ? filenames.map(() => 0) : [0],
			uin,
			loginflag: 1,
			platform: "20"
		};
		if (filenames.length) param.filename = filenames;
		const comm = {
			uin,
			format: "json",
			ct: musicKey ? 19 : 24,
			cv: 0,
			platform: "yqq.json"
		};
		if (musicKey) comm.authst = musicKey;
		const json = await qqMusicRequest({
			comm,
			req_0: {
				module: "vkey.GetVkeyServer",
				method: "CgiGetVkey",
				param
			}
		}, cookieHeader);
		const data = json && json.req_0 && json.req_0.data;
		const infos = data && Array.isArray(data.midurlinfo) ? data.midurlinfo : [];
		const info = infos.find((item) => item && item.purl) || infos[0];
		const purl = info && info.purl;
		if (purl) {
			const sip = data.sip && data.sip[0] || "https://ws.stream.qqmusic.qq.com/";
			const fileMeta = fileCandidates.find((item) => item.filename === info.filename) || {};
			return {
				provider: "qq",
				url: sip + purl,
				trial: false,
				playable: true,
				level: fileMeta.level || info.filename || "",
				quality: fileMeta.label || info.filename || "",
				filename: info.filename || "",
				requestedQuality,
				playbackKeyReady: !!(uin && playbackKey),
				loggedIn: !!(uin && musicKey),
				cover: detailMeta && detailMeta.cover || "",
				albumMid: detailMeta && detailMeta.albumMid || "",
				mid: songmid
			};
		}
		const restriction = classifyQQPlaybackRestriction(info, {
			hasSession: !!(uin && musicKey),
			hasPlaybackKey: !!(uin && playbackKey)
		});
		return {
			provider: "qq",
			url: "",
			playable: false,
			error: "QQ_URL_UNAVAILABLE",
			loggedIn: !!(uin && musicKey),
			playbackKeyReady: !!(uin && playbackKey),
			restriction,
			reason: restriction.category,
			message: restriction.message,
			qqCode: info && (info.result || info.code || info.errtype),
			rawMessage: info && (info.msg || info.tips || info.errmsg || ""),
			tried: fileCandidates.map((item) => item.label + " · " + item.filename),
			requestedQuality
		};
	}
	async function resolveQQSongNumericId(id, mid, cookieHeader) {
		let songId = "";
		const rawId = String(id || "").trim();
		if (rawId && !isQQSongMid(rawId)) songId = rawId.replace(/\D/g, "");
		if (!songId && mid) try {
			const detail = await qqSongDetail(mid, { mid }, cookieHeader);
			const fromQqId = String(detail && detail.qqId || "").replace(/\D/g, "");
			if (fromQqId) songId = fromQqId;
			else {
				const detailId = String(detail && detail.id || "").trim();
				if (detailId && !isQQSongMid(detailId)) songId = detailId.replace(/\D/g, "");
			}
		} catch (_) {}
		return songId;
	}
	function qqGtk$1(cookieHeader) {
		const obj = parseCookieString(cookieHeader);
		const key = obj.qm_keyst || obj.qqmusic_key || obj.skey || obj.p_skey || "";
		if (!key) return 5381;
		let hash = 5381;
		for (let i = 0; i < key.length; i++) {
			hash += (hash << 5) + key.charCodeAt(i);
			hash &= 2147483647;
		}
		return hash & 2147483647;
	}
	function isQQSongMid(value) {
		const raw = String(value || "").trim();
		return /^[0-9A-Za-z]{10,20}$/.test(raw) && !/^\d+$/.test(raw);
	}
	function collectQQFavSets(body) {
		const idSet = /* @__PURE__ */ new Set();
		const midSet = /* @__PURE__ */ new Set();
		const idMap = body && (body.map || body.data && body.data.map) || {};
		const midMap = body && (body.mapmid || body.data && body.data.mapmid) || {};
		if (Array.isArray(idMap)) idMap.forEach((id) => {
			if (id != null) idSet.add(String(id));
		});
		else if (idMap && typeof idMap === "object") {
			Object.keys(idMap).forEach((key) => {
				idSet.add(String(key));
				if (idMap[key] != null) idSet.add(String(idMap[key]));
			});
			Object.values(idMap).forEach((val) => {
				if (val != null) idSet.add(String(val));
			});
		}
		if (midMap && typeof midMap === "object") {
			Object.keys(midMap).forEach((mid) => {
				midSet.add(String(mid));
				if (midMap[mid] != null) idSet.add(String(midMap[mid]));
			});
			Object.values(midMap).forEach((val) => {
				if (val != null) idSet.add(String(val));
			});
		}
		return {
			idSet,
			midSet,
			idMap,
			midMap
		};
	}
	async function fetchQQFavCatalog(cookieHeader) {
		const uin = qqCookieUin(cookieHeader);
		const gtk = qqGtk$1(cookieHeader);
		let body = null;
		try {
			body = await qqGetJSON("https://c.y.qq.com/splcloud/fcgi-bin/fcg_musiclist_getmyfav.fcg", {
				dirid: 201,
				dirinfo: 1,
				g_tk: gtk,
				format: "json",
				loginUin: uin,
				hostUin: uin
			}, cookieHeader);
		} catch (_) {}
		const sets = collectQQFavSets(body || {});
		if (!sets.idSet.size && !sets.midSet.size) try {
			const json = await qqMusicRequest({
				comm: {
					uin,
					format: "json"
				},
				req_0: {
					module: "music.musicasset.SongFavRead",
					method: "GetSongIdList",
					param: {
						uin: Number(uin) || uin,
						dirId: 201
					}
				}
			}, cookieHeader);
			(((json.req_0 || {}).data || {}).songIds || ((json.req_0 || {}).data || {}).songIdList || []).map(String).forEach((id) => sets.idSet.add(id));
		} catch (_) {}
		return sets;
	}
	function qqLikeWriteResult(json) {
		const block = json && json.req_0 || {};
		const data = block.data || {};
		const code = Number(block.code ?? data.code ?? (json && json.code) ?? 0);
		if (code === 1e3) return {
			ok: false,
			loginRequired: true,
			code,
			block,
			data
		};
		if (code && code !== 0 && code !== 200) return {
			ok: false,
			code,
			block,
			data
		};
		const business = Number(data.ret ?? data.resultCode ?? data.errCode ?? 0);
		if (typeof data.result === "number" && data.result !== 0 && data.result !== 200) return {
			ok: false,
			code: data.result,
			block,
			data
		};
		if (business && business !== 0 && business !== 200 && typeof data.result !== "object") return {
			ok: false,
			code: business,
			block,
			data
		};
		const failed = data.v_failedSongId || data.v_failSongId || data.vFailedSongId || data.failedSongIds;
		if (Array.isArray(failed) && failed.length) return {
			ok: false,
			code: business || -1,
			block,
			data
		};
		return {
			ok: true,
			code: code || 0,
			block,
			data
		};
	}
	async function qqPlaylistDetailWrite(method, songId, cookieHeader, songType) {
		const sid = Number(songId);
		if (!Number.isFinite(sid) || sid <= 0) return null;
		const json = await qqMusicRequest({
			comm: buildQQAuthComm(cookieHeader),
			req_0: {
				module: "music.musicasset.PlaylistDetailWrite",
				method,
				param: {
					dirId: 201,
					v_songInfo: [{
						songId: sid,
						songType: songType == null ? 0 : Number(songType)
					}]
				}
			}
		}, cookieHeader);
		return {
			json,
			...qqLikeWriteResult(json)
		};
	}
	async function qqSongFavWrite(method, songId, cookieHeader, songType) {
		const sid = Number(songId);
		if (!Number.isFinite(sid) || sid <= 0) return null;
		const uin = qqCookieUin(cookieHeader);
		const json = await qqMusicRequest({
			comm: buildQQAuthComm(cookieHeader),
			req_0: {
				module: "music.musicasset.SongFavWrite",
				method,
				param: {
					uin: Number(uin) || uin,
					v_uin: Number(uin) || uin,
					dirId: 201,
					ids: [sid],
					songTypes: [songType == null ? 0 : Number(songType)]
				}
			}
		}, cookieHeader);
		return {
			json,
			...qqLikeWriteResult(json)
		};
	}
	async function qqAddToFavByMid(songMid, cookieHeader) {
		const uin = qqCookieUin(cookieHeader);
		const gtk = qqGtk$1(cookieHeader);
		const mid = String(songMid || "").trim();
		if (!mid) return null;
		const body = await qqGetJSON("https://c.y.qq.com/splcloud/fcgi-bin/fcg_music_add2songdir.fcg", {
			midlist: mid,
			typelist: "13",
			dirid: 201,
			addtype: "",
			formsender: 4,
			r2: 0,
			r3: 1,
			utf8: 1,
			g_tk: gtk,
			loginUin: uin,
			hostUin: uin,
			format: "json"
		}, cookieHeader);
		const code = Number(body && (body.code ?? body.ret ?? body.retCode ?? 0));
		if (code === 1e3) return {
			ok: false,
			loginRequired: true,
			code,
			body
		};
		if (!code) return {
			ok: true,
			code: 0,
			body
		};
		return {
			ok: false,
			code,
			body
		};
	}
	async function qqDelFromFavById(songId, cookieHeader) {
		const uin = qqCookieUin(cookieHeader);
		const gtk = qqGtk$1(cookieHeader);
		const id = String(songId || "").replace(/\D/g, "");
		if (!id) return null;
		const body = await qqGetJSON("https://c.y.qq.com/qzone/fcgi-bin/fcg_music_delbatchsong.fcg", {
			loginUin: uin,
			hostUin: uin,
			uin,
			dirid: 201,
			ids: id,
			types: "3",
			source: 103,
			formsender: 4,
			flag: 2,
			from: 3,
			utf8: 1,
			format: "json",
			inCharset: "utf8",
			outCharset: "utf-8",
			notice: 0,
			platform: "yqq.post",
			needNewCode: 0,
			g_tk: gtk
		}, cookieHeader);
		const code = Number(body && (body.code ?? body.ret ?? body.retCode ?? 0));
		if (code === 1e3) return {
			ok: false,
			loginRequired: true,
			code,
			body
		};
		if (!code) return {
			ok: true,
			code: 0,
			body
		};
		return {
			ok: false,
			code,
			body
		};
	}
	async function handleQQSongLike(id, mid, like, cookieHeader) {
		if (!(await getQQLoginStatus(cookieHeader)).loggedIn) return {
			provider: "qq",
			error: "LOGIN_REQUIRED",
			loggedIn: false
		};
		const songMid = String(mid || (isQQSongMid(id) ? id : "") || "").trim();
		const songId = await resolveQQSongNumericId(isQQSongMid(id) ? "" : id, songMid, cookieHeader);
		if (!songId && !songMid) return {
			provider: "qq",
			error: "MISSING_QQ_SONG_ID",
			loggedIn: true
		};
		const fail = (res, wantLiked, extra) => ({
			provider: "qq",
			error: res && res.data && (res.data.msg || res.data.message || res.data.errMsg) || res && res.block && (res.block.msg || res.block.message || res.block.errMsg) || res && res.body && (res.body.msg || res.body.message) || (wantLiked ? "QQ_UNLIKE_FAILED" : "QQ_LIKE_FAILED"),
			loggedIn: true,
			id: songId || "",
			mid: songMid,
			liked: !!wantLiked,
			code: res && res.code,
			...extra || {}
		});
		if (like !== false) {
			if (songId) {
				for (const songType of [0, 13]) try {
					const res = await qqPlaylistDetailWrite("AddSonglist", songId, cookieHeader, songType);
					if (res && res.loginRequired) return {
						provider: "qq",
						error: "LOGIN_REQUIRED",
						loggedIn: false,
						mid: songMid
					};
					if (res && res.ok) return {
						provider: "qq",
						loggedIn: true,
						id: songId,
						mid: songMid,
						liked: true,
						code: res.code || 0,
						via: "PlaylistDetailWrite"
					};
				} catch (_) {}
				for (const songType of [0, 13]) try {
					const res = await qqSongFavWrite("AddSong", songId, cookieHeader, songType);
					if (res && res.loginRequired) return {
						provider: "qq",
						error: "LOGIN_REQUIRED",
						loggedIn: false,
						mid: songMid
					};
					if (res && res.ok) return {
						provider: "qq",
						loggedIn: true,
						id: songId,
						mid: songMid,
						liked: true,
						code: res.code || 0,
						via: "SongFavWrite"
					};
				} catch (_) {}
			}
			if (songMid) try {
				const res = await qqAddToFavByMid(songMid, cookieHeader);
				if (res && res.loginRequired) return {
					provider: "qq",
					error: "LOGIN_REQUIRED",
					loggedIn: false,
					mid: songMid
				};
				if (res && res.ok) return {
					provider: "qq",
					loggedIn: true,
					id: songId || "",
					mid: songMid,
					liked: true,
					code: 0,
					via: "add2songdir"
				};
				if (res && !res.ok) return fail(res, false, {
					mid: songMid,
					via: "add2songdir"
				});
			} catch (err) {
				return {
					provider: "qq",
					error: err.message || "QQ_LIKE_FAILED",
					loggedIn: true,
					mid: songMid,
					liked: false
				};
			}
			return fail(null, false, { mid: songMid });
		}
		let delId = songId;
		if (!delId && songMid) {
			const catalog = await fetchQQFavCatalog(cookieHeader);
			if (catalog.midMap && catalog.midMap[songMid] != null) delId = String(catalog.midMap[songMid]);
		}
		if (delId) {
			for (const songType of [0, 13]) try {
				const res = await qqPlaylistDetailWrite("DelSonglist", delId, cookieHeader, songType);
				if (res && res.loginRequired) return {
					provider: "qq",
					error: "LOGIN_REQUIRED",
					loggedIn: false,
					mid: songMid
				};
				if (res && res.ok) return {
					provider: "qq",
					loggedIn: true,
					id: delId,
					mid: songMid,
					liked: false,
					code: res.code || 0,
					via: "PlaylistDetailWrite"
				};
			} catch (_) {}
			for (const songType of [0, 13]) try {
				const res = await qqSongFavWrite("DelSong", delId, cookieHeader, songType);
				if (res && res.loginRequired) return {
					provider: "qq",
					error: "LOGIN_REQUIRED",
					loggedIn: false,
					mid: songMid
				};
				if (res && res.ok) return {
					provider: "qq",
					loggedIn: true,
					id: delId,
					mid: songMid,
					liked: false,
					code: res.code || 0,
					via: "SongFavWrite"
				};
			} catch (_) {}
			try {
				const res = await qqDelFromFavById(delId, cookieHeader);
				if (res && res.loginRequired) return {
					provider: "qq",
					error: "LOGIN_REQUIRED",
					loggedIn: false,
					mid: songMid
				};
				if (res && res.ok) return {
					provider: "qq",
					loggedIn: true,
					id: delId,
					mid: songMid,
					liked: false,
					code: 0,
					via: "delbatchsong"
				};
				if (res && !res.ok) return fail(res, true, {
					id: delId,
					via: "delbatchsong"
				});
			} catch (err) {
				return {
					provider: "qq",
					error: err.message || "QQ_UNLIKE_FAILED",
					loggedIn: true,
					mid: songMid,
					liked: true
				};
			}
		}
		return fail(null, true, {
			mid: songMid,
			id: delId || songId || "",
			error: "FAVORITE_ITEM_NOT_FOUND"
		});
	}
	function buildQQAuthComm(cookieHeader, extra) {
		const uin = qqCookieUin(cookieHeader) || "0";
		const musicKey = qqCookieMusicKey(cookieHeader);
		const comm = Object.assign({
			uin,
			format: "json",
			ct: musicKey ? 19 : 24,
			cv: 0,
			platform: "yqq.json"
		}, extra || {});
		if (musicKey) comm.authst = musicKey;
		const loginType = Number(parseCookieString(cookieHeader).tmeLoginType);
		if (Number.isFinite(loginType) && loginType > 0) comm.tmeLoginType = loginType;
		return comm;
	}
	function normalizeQQPlaylistCover(cover) {
		let url = String(cover || "").trim();
		if (!url) return "";
		if (url.startsWith("//")) url = `https:${url}`;
		if (/^http:\/\//i.test(url) && /(?:qlogo\.cn|qpic\.cn|qq\.com|gtimg\.cn)/i.test(url)) url = `https://${url.slice(7)}`;
		if (/y\.qq\.com\/music\/photo_new\//i.test(url)) url = url.replace("://y.qq.com/music/photo_new/", "://y.gtimg.cn/music/photo_new/");
		if (/\/music\/photo_new\/T00[12]R\d+x\d+M000/i.test(url)) {
			const m = url.match(/T00[12]R(\d+)x(\d+)M000/i);
			const cur = m ? Number(m[1]) : 0;
			if (!cur || ![
				68,
				90,
				126,
				150,
				180,
				300,
				500,
				800
			].includes(cur)) {
				const px = qqOfficialCoverSize(cur || 300);
				url = url.replace(/(T00[12]R)\d+x\d+(M000)/i, `$1${px}x${px}$2`);
			}
		}
		if (/mediastyle\/(?:y|global)\/img\/cover_qzone/i.test(url)) return "";
		if (/T002R\d+x\d+M0000{10,}/i.test(url)) return "";
		return url;
	}
	function normalizeQQUserPlaylistRow(pl, opts) {
		opts = opts || {};
		if (!pl || typeof pl !== "object") return null;
		const dirid = pl.dirid != null ? pl.dirid : pl.dirId != null ? pl.dirId : pl.dir_id;
		const tid = pl.tid || pl.dissid || pl.diss_id || pl.dissId || pl.playlist_id || pl.playlistId;
		const id = tid || pl.id || dirid;
		if (id == null || id === "") return null;
		if (String(id) === "0" && String(dirid || "") !== "201") return null;
		const name = String(pl.dirName || pl.dirname || pl.dir_name || pl.DissName || pl.dissname || pl.diss_name || pl.Title || pl.title || pl.name || "").trim();
		const cover = normalizeQQPlaylistCover(pl.diss_cover || pl.logo || pl.picurl || pl.picUrl || pl.pic_url || pl.bigpicUrl || pl.bigpic_url || pl.albumPicUrl || pl.album_pic_url || pl.cover || pl.pic || pl.headurl || pl.imgurl || pl.img || pl.portrait || "");
		const trackCount = Number(pl.songNum || pl.songnum || pl.song_cnt || pl.song_num || pl.total_song_num || pl.cnt || pl.total_num || pl.totalNum || 0) || 0;
		const playCount = Number(pl.play_cnt || pl.playCnt || pl.listen_num || pl.listennum || pl.play_count || pl.playCount || pl.playcnt || 0) || 0;
		const creator = pl.nickname || pl.nick || pl.creator || pl.host_nickname || pl.hostname || "";
		const subscribed = opts.subscribed != null ? !!opts.subscribed : !!(pl.subscribed || pl.isFav || pl.is_fav || pl.fav);
		const diridStr = dirid != null && dirid !== "" ? String(dirid) : "";
		return {
			id: String(id),
			qqId: String(tid || pl.dissid || id),
			dirid: diridStr,
			name: name || (diridStr === "201" ? "我喜欢" : "未命名歌单"),
			cover,
			trackCount,
			playCount,
			creator,
			provider: "qq",
			subscribed
		};
	}
	function qqPlaylistDedupeKey(pl) {
		if (!pl) return "";
		const dirid = String(pl.dirid || "");
		const id = String(pl.id || pl.qqId || "");
		if (dirid === "201" || id === "201" || pl.name === "我喜欢") return "liked:201";
		if (id) return `id:${id}`;
		if (dirid) return `dir:${dirid}`;
		return `name:${pl.name || ""}`;
	}
	function mergeQQUserPlaylists(lists) {
		const seen = /* @__PURE__ */ new Set();
		const out = [];
		(lists || []).flat().forEach((pl) => {
			if (!pl) return;
			const key = qqPlaylistDedupeKey(pl);
			if (!key) return;
			if (seen.has(key)) {
				const idx = out.findIndex((item) => qqPlaylistDedupeKey(item) === key);
				if (idx < 0) return;
				const cur = out[idx];
				out[idx] = Object.assign({}, cur, {
					name: cur.name && cur.name !== "未命名歌单" ? cur.name : pl.name,
					cover: cur.cover || pl.cover,
					trackCount: Math.max(Number(cur.trackCount) || 0, Number(pl.trackCount) || 0),
					playCount: Math.max(Number(cur.playCount) || 0, Number(pl.playCount) || 0),
					dirid: cur.dirid || pl.dirid,
					qqId: cur.qqId || pl.qqId,
					subscribed: !!(cur.subscribed && pl.subscribed)
				});
				return;
			}
			seen.add(key);
			out.push(pl);
		});
		return out;
	}
	function ensureQQLikedPlaylist(playlists, uin) {
		const list = Array.isArray(playlists) ? playlists.slice() : [];
		const likedIdx = list.findIndex((pl) => qqPlaylistDedupeKey(pl) === "liked:201");
		if (likedIdx >= 0) {
			const liked = Object.assign({}, list[likedIdx], {
				name: list[likedIdx].name || "我喜欢",
				dirid: "201",
				subscribed: false
			});
			list.splice(likedIdx, 1);
			list.unshift(liked);
			return list;
		}
		list.unshift({
			id: "201",
			qqId: "201",
			dirid: "201",
			name: "我喜欢",
			cover: uin ? `https://q1.qlogo.cn/g?b=qq&nk=${encodeURIComponent(String(uin))}&s=100` : "",
			trackCount: 0,
			playCount: 0,
			creator: "",
			provider: "qq",
			subscribed: false
		});
		return list;
	}
	async function fetchQQUserCreatedPlaylistsLegacy(uin, cookieHeader) {
		const body = await qqGetJSON("https://c.y.qq.com/rsc/fcgi-bin/fcg_user_created_diss", {
			hostUin: 0,
			hostuin: uin,
			sin: 0,
			size: 200,
			g_tk: qqGtk$1(cookieHeader),
			loginUin: uin,
			format: "json",
			inCharset: "utf8",
			outCharset: "utf-8",
			notice: "0",
			platform: "yqq.json",
			needNewCode: "0"
		}, cookieHeader);
		if (!body) return [];
		if (isQQAuthRejectedCode(Number(body.code ?? body.result))) throw qqLoginRequiredError("created-playlists(legacy)", body.code ?? body.result);
		return (body.data && body.data.disslist || []).map((pl) => normalizeQQUserPlaylistRow(pl, { subscribed: false })).filter(Boolean);
	}
	async function fetchQQUserCreatedPlaylistsByUin(uin, cookieHeader) {
		const json = await qqMusicRequest({
			comm: buildQQAuthComm(cookieHeader),
			req_0: {
				module: "music.musicasset.PlaylistBaseRead",
				method: "GetPlaylistByUin",
				param: { uin: String(uin) }
			}
		}, cookieHeader);
		const block = json && json.req_0;
		const code = Number(block && block.code);
		if (code && code !== 0 && code !== 200) {
			if (isQQAuthRejectedResponse(json)) throw qqLoginRequiredError("created-playlists", code);
			return [];
		}
		const data = block && block.data || {};
		const list = data.v_playlist || data.vPlaylist || data.playlist || data.list || [];
		return (Array.isArray(list) ? list : []).map((pl) => normalizeQQUserPlaylistRow(pl, { subscribed: false })).filter(Boolean);
	}
	async function fetchQQUserCreatedPlaylists(uin, cookieHeader) {
		const primary = await fetchQQUserCreatedPlaylistsByUin(uin, cookieHeader).catch(swallowUnlessLoginRequired);
		if (primary && primary.length) return primary;
		return fetchQQUserCreatedPlaylistsLegacy(uin, cookieHeader).catch(swallowUnlessLoginRequired);
	}
	async function fetchQQUserCollectedPlaylistsLegacy(uin, cookieHeader) {
		const body = await qqGetJSON("https://c.y.qq.com/fav/fcgi-bin/fcg_get_profile_order_asset.fcg", {
			ct: 20,
			cid: 205360956,
			userid: uin,
			reqtype: 3,
			sin: 0,
			ein: 200
		}, cookieHeader);
		if (isQQAuthRejectedCode(Number(body && (body.code ?? body.result)))) throw qqLoginRequiredError("collected-playlists(legacy)", body.code ?? body.result);
		return (body && body.data && body.data.cdlist || []).map((pl) => normalizeQQUserPlaylistRow(pl, { subscribed: true })).filter(Boolean);
	}
	async function fetchQQUserCollectedPlaylistsFavApi(uin, cookieHeader) {
		const json = await qqMusicRequest({
			comm: buildQQAuthComm(cookieHeader),
			req_0: {
				module: "music.musicasset.PlaylistFavRead",
				method: "CgiGetPlaylistFavInfo",
				param: {
					uin: String(uin),
					offset: 0,
					size: 200
				}
			}
		}, cookieHeader);
		const block = json && json.req_0;
		const code = Number(block && block.code);
		if (code && code !== 0 && code !== 200) {
			if (isQQAuthRejectedResponse(json)) throw qqLoginRequiredError("collected-playlists", code);
			return [];
		}
		const data = block && block.data || {};
		const list = data.v_list || data.vList || data.list || data.cdlist || [];
		return (Array.isArray(list) ? list : []).map((pl) => normalizeQQUserPlaylistRow(pl, { subscribed: true })).filter(Boolean);
	}
	async function fetchQQUserCollectedPlaylists(uin, cookieHeader) {
		const [legacy, modern] = await Promise.all([fetchQQUserCollectedPlaylistsLegacy(uin, cookieHeader).catch(swallowUnlessLoginRequired), fetchQQUserCollectedPlaylistsFavApi(uin, cookieHeader).catch(swallowUnlessLoginRequired)]);
		return mergeQQUserPlaylists([modern, legacy]);
	}
	async function fetchQQPersonalPlaylists(uin, cookieHeader) {
		const json = await qqMusicRequest({
			comm: buildQQAuthComm(cookieHeader),
			req_0: {
				module: "libPersonal.PersonalSvr",
				method: "GetPlaylist",
				param: {
					uin,
					req_num: 200
				}
			}
		}, cookieHeader);
		const block = json && json.req_0;
		const code = Number(block && block.code);
		if (code && code !== 0 && code !== 200) {
			if (isQQAuthRejectedResponse(json)) throw qqLoginRequiredError("personal-playlists", code);
			return [];
		}
		const data = block && block.data || {};
		const list = data.cdlist || data.v_playlist || data.vPlaylist || [];
		return (Array.isArray(list) ? list : []).map((pl) => normalizeQQUserPlaylistRow(pl, { subscribed: false })).filter(Boolean);
	}
	async function handleQQUserPlaylists(cookieHeader) {
		const status = await getQQLoginStatus(cookieHeader);
		if (!status.loggedIn) return {
			loggedIn: false,
			playlists: []
		};
		const uin = status.uin || qqCookieUin(cookieHeader) || "0";
		let playlists = [];
		let loginRequired = false;
		const guard = (step) => (error) => {
			const message = error && error.message ? error.message : String(error);
			if (error && error.loginRequired) {
				loginRequired = true;
				noteQQLibraryStep(`playlists:${step}:login-required`, { message });
				return [];
			}
			noteQQLibraryStep(`playlists:${step}:error`, { message });
			return [];
		};
		const createdResult = await fetchQQUserCreatedPlaylists(uin, cookieHeader).catch(guard("created"));
		const collectedResult = await fetchQQUserCollectedPlaylists(uin, cookieHeader).catch(guard("collected"));
		const personalResult = await fetchQQPersonalPlaylists(uin, cookieHeader).catch(guard("personal"));
		if (loginRequired) return {
			loggedIn: false,
			loginRequired: true,
			playlists: [],
			provider: "qq",
			count: 0,
			message: "QQ 登录凭据已失效，请重新登录"
		};
		noteQQLibraryStep("playlists:sources", {
			created: createdResult.length,
			collected: collectedResult.length,
			personal: personalResult.length,
			loggedIn: true
		});
		try {
			playlists = mergeQQUserPlaylists([
				createdResult,
				personalResult,
				collectedResult
			]);
		} catch (error) {
			noteQQLibraryStep("playlists:merge:error", { message: error && error.message ? error.message : String(error) });
		}
		if (!playlists.length) try {
			playlists = await fetchQQUserCreatedPlaylists(uin, cookieHeader);
		} catch (error) {
			noteQQLibraryStep("playlists:retry:error", { message: error && error.message ? error.message : String(error) });
		}
		playlists = ensureQQLikedPlaylist(playlists, uin);
		noteQQLibraryStep("playlists:final", { count: playlists.length });
		return {
			loggedIn: true,
			playlists,
			provider: "qq",
			count: playlists.length,
			createdCount: playlists.filter((pl) => !pl.subscribed).length,
			collectedCount: playlists.filter((pl) => pl.subscribed).length
		};
	}
	function mapQQPlaylistSonglist(list) {
		return (Array.isArray(list) ? list : []).map((item) => mapQQTrack(item, {})).filter((song) => song.name || song.mid || song.qqId);
	}
	function extractQQPlaylistMeta(source) {
		const dirinfo = source && source.dirinfo || {};
		return {
			name: source && (source.dissname || source.diss_title || source.title) || dirinfo.title || "",
			cover: normalizeQQPlaylistCover(source && (source.logo || source.picurl) || dirinfo.picurl || "")
		};
	}
	async function fetchQQPlaylistTracksUcc(disstid, cookieHeader) {
		const uin = qqCookieUin(cookieHeader) || "0";
		const body = await qqGetJSON("https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg", {
			type: 1,
			json: 1,
			utf8: 1,
			onlysong: 0,
			new_format: 1,
			disstid,
			format: "json",
			g_tk: qqGtk$1(cookieHeader),
			loginUin: uin,
			hostUin: 0,
			inCharset: "utf8",
			outCharset: "utf-8",
			notice: 0,
			platform: "yqq.json",
			needNewCode: 0
		}, cookieHeader);
		if (!body || Number(body.code) !== 0 || Number(body.subcode) !== 0 || !body.cdlist || !body.cdlist[0]) return null;
		const cd = body.cdlist[0];
		const songs = mapQQPlaylistSonglist(cd.songlist);
		if (!songs.length) return null;
		return {
			meta: extractQQPlaylistMeta(cd),
			songs
		};
	}
	async function fetchQQPlaylistTracksUniform(disstid, cookieHeader, hostUin) {
		const json = await qqMusicRequest({
			comm: Object.assign(buildQQAuthComm(cookieHeader), {
				cv: 4747474,
				needNewCode: 1
			}),
			req_1: {
				module: "music.srfDissInfo.aiDissInfo",
				method: "uniform_get_Dissinfo",
				param: {
					disstid: Number(disstid) || disstid,
					userinfo: 1,
					tag: 1,
					orderlist: 1,
					song_begin: 0,
					song_num: 300,
					onlysonglist: 0,
					enc_host_uin: hostUin || ""
				}
			}
		}, cookieHeader);
		const block = json && json.req_1;
		const code = Number(block && block.code);
		if (!block || code && code !== 0 && code !== 200) return null;
		const result = block.data || {};
		const songs = mapQQPlaylistSonglist(result.songlist);
		if (!songs.length) return null;
		return {
			meta: extractQQPlaylistMeta(result),
			songs
		};
	}
	async function fetchQQPlaylistTracksPlaza(disstid, cookieHeader) {
		const json = await qqMusicRequest({
			comm: buildQQAuthComm(cookieHeader),
			req_0: {
				module: "playlist.PlayListPlazaServer",
				method: "GetPlaylistById",
				param: {
					id: Number(disstid) || disstid,
					num: 300,
					onlysong: 0
				}
			}
		}, cookieHeader);
		const block = json && json.req_0;
		const code = Number(block && block.code);
		if (!block || code && code !== 0 && code !== 200) return null;
		const data = block.data || {};
		const songs = mapQQPlaylistSonglist(data.songlist || data.songList);
		if (!songs.length) return null;
		return {
			meta: {
				name: data.title || data.diss_title || "",
				cover: normalizeQQPlaylistCover(data.picurl || data.logo || "")
			},
			songs
		};
	}
	async function fetchQQDirPlaylistTracks(dirid, cookieHeader) {
		const uin = qqCookieUin(cookieHeader);
		if (!uin || dirid == null || dirid === "") return null;
		const dirNum = Number(dirid);
		const json = await qqMusicRequest({
			comm: buildQQAuthComm(cookieHeader),
			req_0: {
				module: "music.musicasset.PlaylistFavRead",
				method: "GetSongList",
				param: {
					dirId: dirNum,
					uin: Number(uin) || uin,
					order: 1,
					begin: 0,
					num: 300
				}
			}
		}, cookieHeader);
		const block = json && json.req_0;
		const code = Number(block && block.code);
		if (!block || code && code !== 0 && code !== 200) return null;
		const data = block.data || {};
		const songs = mapQQPlaylistSonglist(data.songlist || data.songList || data.list);
		if (!songs.length) return null;
		return {
			meta: {
				name: data.title || data.diss_title || data.name || "",
				cover: normalizeQQPlaylistCover(data.picurl || data.logo || "")
			},
			songs
		};
	}
	async function fetchQQFavPlaylistTracks(cookieHeader) {
		const dirResult = await fetchQQDirPlaylistTracks(201, cookieHeader);
		if (dirResult && dirResult.songs.length) return {
			meta: {
				name: "我喜欢",
				cover: dirResult.meta.cover || ""
			},
			songs: dirResult.songs
		};
		const uin = qqCookieUin(cookieHeader);
		const gtk = qqGtk$1(cookieHeader);
		try {
			const body = await qqGetJSON("https://c.y.qq.com/splcloud/fcgi-bin/fcg_musiclist_getmyfav.fcg", {
				dirid: 201,
				dirinfo: 1,
				g_tk: gtk,
				format: "json",
				loginUin: uin,
				hostUin: uin
			}, cookieHeader);
			const midMap = body && body.mapmid || {};
			const mids = Object.keys(midMap).filter(Boolean);
			if (!mids.length) return null;
			const items = mids.slice(0, 300).map((mid) => ({
				mid,
				songmid: mid,
				id: midMap[mid]
			}));
			await qqSongDetailsBatch(items, cookieHeader);
			const songs = mapQQPlaylistSonglist(items);
			if (!songs.length) return null;
			return {
				meta: {
					name: "我喜欢",
					cover: ""
				},
				songs
			};
		} catch (_) {}
		return null;
	}
	async function handleQQPlaylistTracks(id, cookieHeader, options) {
		options = options || {};
		const disstid = String(id || "").trim();
		const dirid = options.dirid != null ? String(options.dirid).trim() : "";
		if (!disstid && !dirid) return {
			provider: "qq",
			id: "",
			tracks: [],
			songs: [],
			playlist: {
				provider: "qq",
				tracks: []
			}
		};
		let meta = {
			id: disstid || dirid,
			name: "",
			cover: "",
			provider: "qq"
		};
		let songs = [];
		const attempts = [];
		if (dirid === "201" || disstid === "201") attempts.push(() => fetchQQFavPlaylistTracks(cookieHeader));
		if (dirid && dirid !== "201") attempts.push(() => fetchQQDirPlaylistTracks(dirid, cookieHeader));
		if (disstid) {
			attempts.push(() => fetchQQPlaylistTracksUcc(disstid, cookieHeader));
			attempts.push(() => fetchQQPlaylistTracksPlaza(disstid, cookieHeader));
			attempts.push(() => fetchQQPlaylistTracksUniform(disstid, cookieHeader, options.hostUin || ""));
		}
		if (dirid && dirid !== "201" && disstid) attempts.push(() => fetchQQDirPlaylistTracks(dirid, cookieHeader));
		for (const attempt of attempts) try {
			const result = await attempt();
			if (result && result.songs && result.songs.length) {
				if (result.meta) meta = {
					...meta,
					...result.meta
				};
				songs = result.songs;
				break;
			}
		} catch (_) {}
		const outMeta = {
			...meta,
			id: disstid || dirid,
			trackCount: songs.length,
			provider: "qq"
		};
		return {
			...outMeta,
			playlist: outMeta,
			tracks: songs,
			songs,
			provider: "qq"
		};
	}
	/** QQ 上游表示「不认这个凭据」的业务码。 */
	const QQ_LOGIN_REQUIRED_CODE = 1e3;
	/**
	* musicu 的两层码：整体一个，req_0 里还有一个（外加 subcode）。
	* 任一层非零都不是成功；1000 单独认出来，交给调用方当成「登录失效」而不是空数据。
	*/
	/** 单个 req_N 的两层码。1000 单独认出来，好让调用方当成「登录失效」而不是空数据。 */
	function qqMusicuReadBlock(block) {
		if (!block || typeof block !== "object") return {
			ok: false,
			loginRequired: false,
			code: -1,
			data: null
		};
		const code = Number(block.code);
		const subcode = block.subcode === void 0 ? 0 : Number(block.subcode);
		if (!Number.isFinite(code) || code !== 0 || Number.isFinite(subcode) && subcode !== 0) return {
			ok: false,
			loginRequired: code === QQ_LOGIN_REQUIRED_CODE,
			code,
			data: null
		};
		return {
			ok: true,
			loginRequired: false,
			code: 0,
			data: block.data
		};
	}
	function qqMusicuRead(json) {
		const gatewayCode = Number(json && json.code);
		if (!json || !Number.isFinite(gatewayCode) || gatewayCode !== 0) return {
			ok: false,
			loginRequired: false,
			code: gatewayCode,
			data: null
		};
		return qqMusicuReadBlock(json.req_0);
	}
	async function qqMusicuCall(module, method, param, cookieHeader, extraComm) {
		return qqMusicuRead(await qqMusicRequest({
			comm: buildQQAuthComm(cookieHeader, extraComm),
			req_0: {
				module,
				method,
				param
			}
		}, cookieHeader));
	}
	/**
	* 一次请求带多支调用（req_0 / req_1 / …）。新碟上架要把地区清单和专辑放在同一次请求里，
	* 上游就是这么发的；分开问也能读，但两支的口径可能对不上。
	*/
	async function qqMusicuBatch(descriptors, cookieHeader, extraComm) {
		const payload = { comm: buildQQAuthComm(cookieHeader, extraComm) };
		descriptors.forEach((descriptor, index) => {
			payload[`req_${index}`] = {
				module: descriptor.module,
				method: descriptor.method,
				param: descriptor.param
			};
		});
		const json = await qqMusicRequest(payload, cookieHeader);
		const gatewayCode = Number(json && json.code);
		if (!json || !Number.isFinite(gatewayCode) || gatewayCode !== 0) return descriptors.map(() => ({
			ok: false,
			loginRequired: false,
			code: gatewayCode,
			data: null
		}));
		return descriptors.map((descriptor, index) => qqMusicuReadBlock(json[`req_${index}`]));
	}
	const qqAuthRequired = (where) => ({
		__foliaBridgeError: "AUTH_REQUIRED",
		message: `QQ ${where}: login required`
	});
	const qqBridgeFailure = (where, code) => ({
		__foliaBridgeError: "NETWORK",
		message: `QQ ${where} failed (code ${code})`
	});
	/** 私人 FM（猜你喜欢）。上游实测 num 再大也只回 5 首，参数照抄。 */
	async function handleQQGuessYouLike(cookieHeader) {
		const result = await qqMusicuCall("music.radioProxy.MbTrackRadioSvr", "get_radio_track", {
			id: 99,
			firstplay: 1,
			num: 15
		}, cookieHeader);
		if (!result.ok) return result.loginRequired ? qqAuthRequired("guess-you-like") : {
			code: 0,
			songs: []
		};
		return {
			code: 0,
			songs: Array.isArray(result.data && result.data.tracks) ? result.data.tracks : []
		};
	}
	/** 每日 30 首。dirid 202 是上游实测的「日推」目录。 */
	async function handleQQDailySongs(cookieHeader) {
		const result = await qqMusicuCall("music.srfDissInfo.aiDissInfo", "uniform_get_Dissinfo", {
			dirid: 202,
			optype: 3,
			tag: 1,
			userinfo: 0,
			pic_dpi: 300
		}, cookieHeader);
		if (!result.ok) return result.loginRequired ? qqAuthRequired("daily-songs") : {
			code: 0,
			songs: []
		};
		return {
			code: 0,
			songs: Array.isArray(result.data && result.data.songlist) ? result.data.songlist : []
		};
	}
	/** 推荐歌单一次最多 60 张（上游实测）。 */
	const QQ_RECOMMEND_PLAYLISTS_MAX = 60;
	/**
	* `/recommend/playlists` 的条目摊平成歌单列表认得的样子（tid / title / picurl / songnum /
	* creator）。没有可用 tid 的条目读不了歌，跳过 —— 与上游同一个判定。
	*/
	function qqRecommendPlaylistRow(entry) {
		const basic = entry && entry.Playlist && entry.Playlist.basic;
		const tid = Number(basic && basic.tid);
		if (!Number.isSafeInteger(tid) || tid <= 0) return null;
		const cover = basic.cover && typeof basic.cover === "object" ? basic.cover : {};
		const creator = basic.creator && typeof basic.creator === "object" ? basic.creator : {};
		const songnum = Number(basic.song_cnt);
		const playCount = Number(basic.play_cnt);
		return {
			tid,
			title: String(basic.title || ""),
			desc: String(basic.desc || ""),
			picurl: String(cover.default_url || cover.big_url || cover.medium_url || cover.small_url || ""),
			...Number.isSafeInteger(songnum) && songnum >= 0 ? { songnum } : {},
			...Number.isSafeInteger(playCount) && playCount >= 0 ? { play_cnt: playCount } : {},
			creator: {
				...creator.uin !== void 0 ? { uin: creator.uin } : {},
				...creator.encrypt_uin !== void 0 ? { encrypt_uin: creator.encrypt_uin } : {},
				...creator.nick !== void 0 ? { nick: creator.nick } : {},
				...creator.avatar !== void 0 ? { avatar: creator.avatar } : {}
			}
		};
	}
	async function handleQQRecommendPlaylists(limit, cookieHeader) {
		const size = Math.min(QQ_RECOMMEND_PLAYLISTS_MAX, Math.max(1, Math.floor(Number(limit)) || 25));
		const result = await qqMusicuCall("music.playlist.PlaylistSquare", "GetRecommendFeed", {
			From: 0,
			Size: size
		}, cookieHeader);
		if (!result.ok) return result.loginRequired ? qqAuthRequired("recommend-playlists") : {
			code: 0,
			playlists: []
		};
		return {
			code: 0,
			playlists: (Array.isArray(result.data && result.data.List) ? result.data.List : []).map(qqRecommendPlaylistRow).filter(Boolean).slice(0, size),
			more: result.data.HasMore === true
		};
	}
	/**
	* 往自建歌单加歌删歌。与上游同一条准入：先按 uin 取回本人目录，只有目录号 1–199、
	* 没有系统类型标记、tid 对得上的歌单才写 —— 「我喜欢」是 201，另有红心接口，不走这里。
	*/
	async function handleQQPlaylistTracksWrite(input, cookieHeader) {
		const tid = Number(input && input.tid);
		const op = String(input && input.op || "");
		const songs = Array.isArray(input && input.songs) ? input.songs : [];
		if (!Number.isSafeInteger(tid) || tid <= 0 || op !== "add" && op !== "del" || songs.length === 0 || songs.length > 100) return {
			__foliaBridgeError: "UNSUPPORTED",
			message: "QQ playlist tracks: bad input"
		};
		const uin = qqCookieUin(cookieHeader);
		if (!uin) return qqAuthRequired("playlist-tracks");
		const vSongInfo = songs.map((song) => ({
			songId: Number(song && song.id),
			songType: Number(song && song.type) || 0
		}));
		if (vSongInfo.some((song) => !Number.isSafeInteger(song.songId) || song.songId <= 0)) return {
			__foliaBridgeError: "UNSUPPORTED",
			message: "QQ playlist tracks: bad song id"
		};
		const owned = await qqMusicuCall("music.musicasset.PlaylistBaseRead", "GetPlaylistByUin", { uin: Number(uin) || uin }, cookieHeader);
		if (!owned.ok) return owned.loginRequired ? qqAuthRequired("playlist-tracks") : {
			code: 0,
			changed: false
		};
		const playlist = (Array.isArray(owned.data && owned.data.v_playlist) ? owned.data.v_playlist : []).find((row) => Number(row && row.tid) === tid);
		const dirId = Number(playlist && playlist.dirId);
		if (!playlist || !Number.isSafeInteger(dirId) || dirId < 1 || dirId >= 200) return {
			code: 0,
			changed: false
		};
		if (playlist.dirType !== void 0 && Number(playlist.dirType) !== 0) return {
			code: 0,
			changed: false
		};
		const write = await qqMusicuCall("music.musicasset.PlaylistDetailWrite", op === "add" ? "AddSonglist" : "DelSonglist", {
			dirId,
			v_songInfo: vSongInfo
		}, cookieHeader);
		if (!write.ok) return write.loginRequired ? qqAuthRequired("playlist-tracks") : {
			code: 0,
			changed: false
		};
		const data = write.data && typeof write.data === "object" ? write.data : {};
		const changed = Number(data.dirId) === dirId && Number(data.tid) === tid || Number(data.dirId) === 0 && (data.tid === 0 || String(data.tid) === "0");
		if (changed) return {
			code: 0,
			changed
		};
		return {
			code: 0,
			changed,
			verification: { status: await qqVerifyTrackPresence(dirId, vSongInfo.map((song) => song.songId), cookieHeader) }
		};
	}
	/** 收藏 / 取消收藏歌单（不是「我喜欢」，那是目录 201）。 */
	async function handleQQPlaylistSubscribe(input, cookieHeader) {
		const tid = Number(input && input.tid);
		const subscribed = (input && input.subscribed) === true || String(input && input.subscribed) === "true";
		if (!Number.isSafeInteger(tid) || tid <= 0) return {
			__foliaBridgeError: "UNSUPPORTED",
			message: "QQ playlist subscribe: bad tid"
		};
		const uin = qqCookieUin(cookieHeader);
		if (!uin) return qqAuthRequired("playlist-subscribe");
		const result = await qqMusicuCall("music.musicasset.PlaylistFavWrite", subscribed ? "FavPlaylist" : "CancelFavPlaylist", {
			uin: Number(uin) || uin,
			v_playlistId: [tid]
		}, cookieHeader);
		if (!result.ok) return result.loginRequired ? qqAuthRequired("playlist-subscribe") : qqBridgeFailure("playlist-subscribe", result.code);
		return {
			code: 0,
			subscribed
		};
	}
	/**
	* 查收藏状态。查不出来回 unknown，前端会报错而不是当成「没收藏」—— 收藏按钮宁可空着，
	* 也不能显示成未收藏然后一点就取消。
	*/
	async function handleQQSubscriptionStatus(type, ids, cookieHeader) {
		const requested = String(ids || "").split(",").map((id) => id.trim()).filter(Boolean);
		if (requested.length === 0 || requested.length > 100) return {
			code: 0,
			items: []
		};
		const uin = qqCookieUin(cookieHeader);
		if (!uin) return qqAuthRequired("subscription-status");
		const protocol = type === "playlist" ? {
			module: "music.musicasset.PlaylistFavRead",
			method: "IsPlaylistFan",
			param: { v_tid: requested.map((id) => Number(id)).filter((id) => Number.isSafeInteger(id) && id > 0) }
		} : {
			module: "music.musicasset.AlbumFavRead",
			method: "IsAlbumFan",
			param: {
				uin: Number(uin) || uin,
				v_albumMid: requested
			}
		};
		if (protocol.param.v_tid && protocol.param.v_tid.length === 0) return {
			code: 0,
			items: []
		};
		const result = await qqMusicuCall(protocol.module, protocol.method, protocol.param, cookieHeader);
		if (!result.ok) return result.loginRequired ? qqAuthRequired("subscription-status") : {
			code: 0,
			items: []
		};
		const fan = result.data && result.data.m_fan && typeof result.data.m_fan === "object" ? result.data.m_fan : {};
		return {
			code: 0,
			items: requested.map((id) => ({
				id,
				status: fan[id] === true ? "subscribed" : fan[id] === false ? "not-subscribed" : "unknown"
			}))
		};
	}
	/**
	* 「我喜欢」的读回：按 songmid 问这首歌现在是不是已收藏。
	*
	* 与自建服务（qq-music-api 3.3.1 的 `/user/song/like`）同一条协议，写完之后要读回确认 ——
	* 只看写入回包不够：dirId 201 的写入回「成功」而收藏状态没变的情况实测存在。
	* 读不出来回 undefined（不是 false）：差别在于「没收藏」与「不知道」，前端只认前者。
	*/
	async function qqSongFanByMid(mid, cookieHeader) {
		const result = await qqMusicuCall("music.musicasset.SongFavRead", "IsSongFanByMid", { v_songMid: [mid] }, cookieHeader);
		if (!result.ok) return void 0;
		const fan = result.data && result.data.m_fan && typeof result.data.m_fan === "object" ? result.data.m_fan : {};
		return fan[mid] === true ? true : fan[mid] === false ? false : void 0;
	}
	/** 专辑收藏的读回，与上面的歌同理。 */
	async function qqAlbumFanByMid(mid, cookieHeader, uin) {
		const result = await qqMusicuCall("music.musicasset.AlbumFavRead", "IsAlbumFan", {
			uin,
			v_albumMid: [mid]
		}, cookieHeader);
		if (!result.ok) return void 0;
		const fan = result.data && result.data.m_fan && typeof result.data.m_fan === "object" ? result.data.m_fan : {};
		return fan[mid] === true ? true : fan[mid] === false ? false : void 0;
	}
	/**
	* 红心 / 取消红心（`/user/song/like`，qq-music-api 3.3.1）。
	*
	* 与自建服务同一个契约：写一次、读回确认后才回成功，结果不明时报失败而不重送。
	* 已经是用户要的样子就不写（读回等于目标值直接回成功）。
	*/
	async function handleQQSongLikeWrite(input, cookieHeader) {
		const song = input && typeof input.song === "object" && input.song !== null ? input.song : {};
		const liked = (input && input.liked) === true || String(input && input.liked) === "true";
		const mid = typeof song.mid === "string" ? song.mid.trim() : "";
		const id = Number(song.id);
		if (!mid || !Number.isSafeInteger(id) || id <= 0) return {
			__foliaBridgeError: "UNSUPPORTED",
			message: "QQ song like: bad input"
		};
		if (!qqCookieUin(cookieHeader)) return qqAuthRequired("song-like");
		const before = await qqSongFanByMid(mid, cookieHeader);
		if (before === liked) return {
			code: 0,
			liked: before
		};
		const result = await handleQQSongLike(String(id), mid, liked, cookieHeader);
		if (!result || result.error) return result && result.loggedIn === false ? qqAuthRequired("song-like") : qqBridgeFailure("song-like", result && result.code || "failed");
		const after = await qqSongFanByMid(mid, cookieHeader);
		if (after !== liked) return qqBridgeFailure("song-like", after === void 0 ? "unconfirmed" : "mismatch");
		return {
			code: 0,
			liked: after
		};
	}
	/** 收藏 / 取消收藏专辑（`/user/album/subscribe`，qq-music-api 3.3.1）。同样写一次、读回确认。 */
	async function handleQQAlbumSubscribe(input, cookieHeader) {
		const mid = typeof (input && input.id) === "string" ? input.id.trim() : "";
		const subscribed = (input && input.subscribed) === true || String(input && input.subscribed) === "true";
		if (!mid) return {
			__foliaBridgeError: "UNSUPPORTED",
			message: "QQ album subscribe: bad input"
		};
		const uin = qqCookieUin(cookieHeader);
		if (!uin) return qqAuthRequired("album-subscribe");
		const numericUin = Number(uin) || uin;
		const before = await qqAlbumFanByMid(mid, cookieHeader, numericUin);
		if (before === subscribed) return {
			code: 0,
			subscribed: before
		};
		const write = await qqMusicuCall("music.musicasset.AlbumFavWrite", subscribed ? "FavAlbum" : "CancelFavAlbum", {
			uin: numericUin,
			v_albumMid: [mid]
		}, cookieHeader);
		if (!write.ok) return write.loginRequired ? qqAuthRequired("album-subscribe") : qqBridgeFailure("album-subscribe", write.code);
		const after = await qqAlbumFanByMid(mid, cookieHeader, numericUin);
		if (after !== subscribed) return qqBridgeFailure("album-subscribe", after === void 0 ? "unconfirmed" : "mismatch");
		return {
			code: 0,
			subscribed: after
		};
	}
	/**
	* 加歌删歌回了「没有改动」时读一遍歌单，说明这批歌现在到底在不在。
	*
	* 与自建服务同一个字段：`verification.status` 是 present（加歌时都在）/ absent（删歌时都不在）/
	* unknown（读不出来）。只有前两种能让前端按成功处理 —— 读不出来时照旧报错，不猜。
	*/
	async function qqVerifyTrackPresence(dirId, ids, cookieHeader) {
		const playlist = await fetchQQDirPlaylistTracks(String(dirId), cookieHeader);
		if (!playlist || !Array.isArray(playlist.songs)) return "unknown";
		const present = new Set(playlist.songs.map((song) => String(song && song.qqId || "").trim()).filter(Boolean));
		const wanted = ids.filter((id) => Number.isSafeInteger(id) && id > 0);
		if (wanted.length === 0) return "unknown";
		const found = wanted.filter((id) => present.has(String(id))).length;
		if (found === wanted.length) return "present";
		if (found === 0) return "absent";
		return "unknown";
	}
	//#endregion
	//#region src/webBridge/api/netease.js
	function firstPositiveNumberFrom(objects, keys) {
		for (const obj of objects) {
			if (!obj || typeof obj !== "object") continue;
			for (const key of keys) {
				const value = Number(obj[key]);
				if (Number.isFinite(value) && value > 0) return value;
			}
		}
		return 0;
	}
	function collectStringValues(value, out, depth) {
		if (depth > 4 || value == null) return out;
		if (typeof value === "string") {
			if (value) out.push(value);
			return out;
		}
		if (Array.isArray(value)) {
			value.forEach((item) => collectStringValues(item, out, depth + 1));
			return out;
		}
		if (typeof value === "object") Object.keys(value).forEach((key) => collectStringValues(value[key], out, depth + 1));
		return out;
	}
	function collectVipStringValues(value, out, depth) {
		if (depth > 4 || value == null) return out;
		if (Array.isArray(value)) {
			value.forEach((item) => collectVipStringValues(item, out, depth + 1));
			return out;
		}
		if (typeof value !== "object") return out;
		Object.keys(value).forEach((key) => {
			const child = value[key];
			if (/vip|svip|member|associator|privilege|right|level|package|label|title|type|redplus/i.test(key)) collectStringValues(child, out, depth + 1);
			else if (child && typeof child === "object") collectVipStringValues(child, out, depth + 1);
		});
		return out;
	}
	function normalizeNeteaseVip(profile, account, extra) {
		profile = profile || {};
		account = account || {};
		extra = extra || {};
		const vipInfo = profile.vipInfo || profile.vipinfo || account.vipInfo || account.vipinfo || extra.vipInfo || extra.vipinfo || {};
		const objects = [
			account,
			profile,
			vipInfo,
			extra
		];
		const vipType = firstPositiveNumberFrom(objects, [
			"vipType",
			"vip_type",
			"viptype",
			"musicVipType",
			"music_vip_type",
			"musicVipLevel",
			"music_vip_level",
			"redVipLevel",
			"red_vip_level",
			"blackVipLevel",
			"black_vip_level",
			"luxuryVipLevel",
			"luxury_vip_level",
			"svipType",
			"svip_type"
		]);
		const text = collectVipStringValues({
			account,
			profile,
			vipInfo,
			extra
		}, [], 0).join(" ").toLowerCase();
		const redplus = extra.redplus || vipInfo.redplus || profile.redplus || account.redplus || {};
		const redplusExpire = Number(redplus.expireTime || redplus.expire_time || 0);
		const redplusActive = Number.isFinite(redplusExpire) && redplusExpire > Date.now() || !!(redplus.vipLevel || redplus.status || redplus.isSign);
		const svipFlag = objects.some((obj) => obj && (obj.isSvip === true || obj.is_svip === true || obj.svip === true || Number(obj.isSvip || obj.is_svip || obj.svip || obj.svipType || obj.svip_type || 0) > 0)) || /svip|supervip|super_vip|黑胶svip|超级会员|redplus/.test(text) || redplusActive;
		const vipFlag = objects.some((obj) => obj && (obj.isVip === true || obj.is_vip === true || obj.vip === true || Number(obj.isVip || obj.is_vip || obj.vip || obj.vipFlag || obj.vipflag || 0) > 0)) || /vip|黑胶|会员/.test(text);
		const isSvip = svipFlag || vipType === 11 || redplusActive;
		const isVip = isSvip || vipFlag || vipType >= 10 || vipType > 0;
		const vipLevel = isSvip ? "svip" : isVip ? "vip" : "none";
		let vipLabel = "无VIP";
		if (isSvip) vipLabel = "黑胶SVIP";
		else if (vipType === 10) vipLabel = "黑胶VIP";
		else if (isVip) vipLabel = "VIP";
		return {
			vipType,
			vipLevel,
			isVip,
			isSvip,
			vipLabel
		};
	}
	function normalizeLoginInfo(profile, account, body) {
		profile = profile || {};
		account = account || {};
		body = body || {};
		const userId = profile.userId || profile.user_id || profile.id || account.userId || account.user_id || account.id || body.account && (body.account.id || body.account.userId);
		if (!(userId || userId === 0)) return {
			loggedIn: false,
			vipType: 0,
			vipLevel: "none",
			isVip: false,
			isSvip: false,
			vipLabel: "无VIP"
		};
		return {
			loggedIn: true,
			userId,
			nickname: profile.nickname || profile.userName || account.userName || "网易云用户",
			avatar: profile.avatarUrl || profile.avatar || account.avatarUrl || "",
			...normalizeNeteaseVip(profile, account, body)
		};
	}
	const NETEASE_QUALITY = [
		{
			level: "jymaster",
			br: 999e3,
			label: "超清母带",
			svip: true
		},
		{
			level: "hires",
			br: 1999e3,
			label: "高清臻音",
			svip: true
		},
		{
			level: "lossless",
			br: 999e3,
			label: "无损",
			svip: false
		},
		{
			level: "exhigh",
			br: 32e4,
			label: "极高",
			svip: false
		},
		{
			level: "standard",
			br: 128e3,
			label: "标准",
			svip: false
		}
	];
	function normalizeQualityPreference$1(value) {
		value = String(value || "").toLowerCase();
		if (value === "jymaster" || value === "master" || value === "svip") return "jymaster";
		if (value === "hires" || value === "hi-res" || value === "highres" || value === "highest") return "hires";
		if (value === "lossless" || value === "flac" || value === "sq") return "lossless";
		if (value === "exhigh" || value === "high" || value === "320k" || value === "hq") return "exhigh";
		if (value === "standard" || value === "normal" || value === "std") return "standard";
		return "hires";
	}
	function qualityCandidates(pref) {
		const order = [
			"jymaster",
			"hires",
			"lossless",
			"exhigh",
			"standard"
		];
		const idx = order.indexOf(normalizeQualityPreference$1(pref));
		const start = idx >= 0 ? idx : 1;
		return NETEASE_QUALITY.filter((q) => order.indexOf(q.level) >= start);
	}
	function hasNeteaseSvip(info) {
		return !!(info && info.isSvip);
	}
	function extractAccountPayload(body) {
		body = body || {};
		let root = body;
		if (body.data && typeof body.data === "object") {
			if (body.data.profile || body.data.account) root = body.data;
			else if (body.data.userId || body.data.id || body.data.nickname) root = {
				profile: body.data,
				account: body.data
			};
		}
		const profile = root.profile || body.profile || body.data && body.data.profile || root.account || body.account || {};
		return {
			profile,
			account: root.account || body.account || body.data && body.data.account || profile,
			root
		};
	}
	function pickUserIdFromPayload(body) {
		const extracted = extractAccountPayload(body);
		const info = normalizeLoginInfo(extracted.profile, extracted.account, extracted.root);
		return info.loggedIn ? info.userId : "";
	}
	async function api(path, data, cookie) {
		const cookies = parseCookieString(cookie);
		const body = (await eapiRequest(path, Object.assign({}, data, { csrf_token: cookies.__csrf || "" }), cookie)).body || {};
		const code = Number(body.code);
		if (code && code !== 200 && code !== 0 && !body.result && !body.playlist && !body.playlists && !body.songs && !body.profile && !body.account && !body.unikey && !body.data && !body.comments && !body.hotComments && !body.recommend && !body.dailySongs) throw new Error(body.msg || body.message || `Netease API ${path} failed (${code})`);
		return body;
	}
	async function weapiApi(path, data, cookie) {
		const cookies = parseCookieString(cookie);
		const body = await weapiRequest(path, Object.assign({}, data, { csrf_token: cookies.__csrf || "" }), cookie);
		const code = Number(body.code);
		if (code && code !== 200 && code !== 0 && !body.data && !body.result) throw new Error(body.msg || body.message || `Netease WeAPI ${path} failed (${code})`);
		return body;
	}
	function hasNeteaseMusicU(cookieHeader) {
		return !!parseCookieString(cookieHeader).MUSIC_U;
	}
	function playbackRestriction(provider, category, message, action, extra) {
		return {
			provider,
			category,
			message,
			action: action || "",
			...extra || {}
		};
	}
	function classifyNeteasePlaybackRestriction(lastData, loginInfo) {
		const loggedIn = !!(loginInfo && loginInfo.loggedIn);
		const fee = Number(lastData && lastData.fee);
		const code = Number(lastData && lastData.code);
		const freeTrial = lastData && lastData.freeTrialInfo;
		if (!loggedIn) return playbackRestriction("netease", "login_required", "网易云需要登录后尝试获取完整播放地址", "login", {
			code,
			fee
		});
		if (freeTrial) return playbackRestriction("netease", "trial_only", "网易云仅返回试听片段，完整播放需要会员或购买", "upgrade", {
			code,
			fee
		});
		if (fee === 1) return playbackRestriction("netease", "vip_required", "网易云歌曲需要 VIP 权限，当前无法获取完整播放地址", "upgrade", {
			code,
			fee
		});
		if (fee === 4 || fee === 8) return playbackRestriction("netease", "paid_required", "网易云歌曲需要单曲、专辑购买或更高权限", "purchase", {
			code,
			fee
		});
		if (code === 404 || code === 403) return playbackRestriction("netease", "copyright_unavailable", "网易云版权暂不可播，换源或稍后重试会更稳", "switch_source", {
			code,
			fee
		});
		return playbackRestriction("netease", "url_unavailable", "网易云没有返回可播放地址，可能是版权、会员或地区限制", loggedIn ? "switch_source" : "login", {
			code,
			fee
		});
	}
	async function ensureNeteaseCookieHeader(cookie) {
		let header = String(cookie || "");
		if (!parseCookieString(header).MUSIC_U) {
			const musicU = await getNeteaseMusicU();
			if (musicU) header = header ? `${header}; MUSIC_U=${musicU}` : `MUSIC_U=${musicU}`;
		}
		return header;
	}
	async function enrichLoginInfoWithVip(info, cookie) {
		if (!info || !info.loggedIn) return info;
		try {
			const vipBody = await api("/api/music-vip-membership/front/vip/info", { userId: info.userId || "" }, cookie);
			const data = vipBody.data || vipBody;
			const vip = normalizeNeteaseVip({}, {}, {
				...data,
				vipInfo: data
			});
			const userId = info.userId || data.userId || data.uid || data.accountId || "";
			return {
				...info,
				...vip,
				userId,
				pendingProfile: info.pendingProfile && !(info.nickname && info.nickname !== "网易云用户")
			};
		} catch (_) {}
		return info;
	}
	async function getLoginInfo(cookie) {
		cookie = await ensureNeteaseCookieHeader(cookie);
		if (!hasNeteaseMusicU(cookie)) return {
			loggedIn: false,
			vipType: 0,
			vipLevel: "none",
			isVip: false,
			isSvip: false,
			vipLabel: "无VIP"
		};
		for (const path of ["/api/w/nuser/account/get", "/api/nuser/account/get"]) try {
			const extracted = extractAccountPayload(await api(path, {}, cookie));
			const info = normalizeLoginInfo(extracted.profile, extracted.account, extracted.root);
			if (info.loggedIn) return enrichLoginInfoWithVip({
				...info,
				hasCookie: true
			}, cookie);
		} catch (_) {}
		return enrichLoginInfoWithVip({
			loggedIn: true,
			pendingProfile: true,
			nickname: "网易云用户",
			avatar: "",
			userId: "",
			vipType: 0,
			vipLevel: "none",
			isVip: false,
			isSvip: false,
			vipLabel: "无VIP",
			hasCookie: true
		}, cookie);
	}
	async function handleSongUrl(id, cookie, qualityPreference) {
		cookie = await ensureNeteaseCookieHeader(cookie);
		const loginInfo = await getLoginInfo(cookie);
		const svipReady = hasNeteaseSvip(loginInfo);
		const vipReady = !!(loginInfo.isVip || loginInfo.isSvip);
		const qualities = qualityCandidates(qualityPreference).filter((q) => !q.svip || svipReady);
		let trialFallback = null;
		let lastData = null;
		let lastError = null;
		const songId = String(id || "").trim();
		if (!songId) return {
			url: null,
			trial: false,
			playable: false,
			requestedQuality: normalizeQualityPreference$1(qualityPreference),
			reason: "missing_id"
		};
		for (const q of qualities) try {
			let d = null;
			try {
				const v1 = await api("/api/song/enhance/player/url/v1", {
					ids: `[${songId}]`,
					level: q.level,
					encodeType: "flac"
				}, cookie);
				d = v1.data && v1.data[0];
			} catch (err) {
				lastError = err;
				const legacy = await api("/api/song/enhance/player/url", {
					ids: `[${songId}]`,
					br: q.br
				}, cookie);
				d = legacy.data && legacy.data[0];
			}
			if (d) lastData = d;
			const url = d && d.url;
			const freeTrial = d && d.freeTrialInfo;
			if (url && !freeTrial) return {
				url,
				trial: false,
				playable: true,
				level: q.level,
				quality: q.label,
				br: d.br,
				requestedQuality: normalizeQualityPreference$1(qualityPreference),
				loggedIn: loginInfo.loggedIn,
				vipType: loginInfo.vipType || 0,
				vipLevel: loginInfo.vipLevel || "none",
				isVip: !!loginInfo.isVip,
				isSvip: !!loginInfo.isSvip,
				vipLabel: loginInfo.vipLabel || "无VIP"
			};
			if (url && freeTrial && !trialFallback) trialFallback = {
				url,
				trial: true,
				playable: true,
				level: q.level,
				quality: q.label,
				br: d.br,
				requestedQuality: normalizeQualityPreference$1(qualityPreference),
				restriction: classifyNeteasePlaybackRestriction(d, loginInfo),
				loggedIn: loginInfo.loggedIn,
				vipType: loginInfo.vipType || 0,
				vipLevel: loginInfo.vipLevel || "none",
				isVip: !!loginInfo.isVip,
				isSvip: !!loginInfo.isSvip,
				vipLabel: loginInfo.vipLabel || "无VIP"
			};
		} catch (err) {
			lastError = err;
		}
		if (trialFallback) return trialFallback;
		const restriction = classifyNeteasePlaybackRestriction(lastData, loginInfo);
		return {
			url: null,
			trial: false,
			playable: false,
			reason: restriction.category,
			message: restriction.message,
			restriction,
			lastCode: lastData && lastData.code,
			fee: lastData && lastData.fee,
			error: lastError && lastError.message,
			requestedQuality: normalizeQualityPreference$1(qualityPreference),
			loggedIn: loginInfo.loggedIn,
			vipType: loginInfo.vipType || 0,
			vipLevel: loginInfo.vipLevel || "none",
			isVip: !!loginInfo.isVip,
			isSvip: !!loginInfo.isSvip,
			vipLabel: loginInfo.vipLabel || "无VIP",
			hasCookie: hasNeteaseMusicU(cookie),
			vipReady
		};
	}
	async function handleLyric(id, cookie) {
		let body = {};
		try {
			body = await api("/api/song/lyric/v1", {
				id,
				cp: false,
				tv: 0,
				lv: 0,
				rv: 0,
				kv: 0,
				yv: 1,
				ytv: 0,
				yrv: 0
			}, cookie);
		} catch (_) {
			body = await api("/api/song/lyric", {
				id,
				lv: -1,
				tv: -1
			}, cookie);
		}
		return {
			lyric: body.lrc && body.lrc.lyric || "",
			tlyric: body.tlyric && body.tlyric.lyric || "",
			yrc: body.yrc && body.yrc.lyric || "",
			source: "extension"
		};
	}
	async function resolveNeteaseUserId(cookie, info) {
		if (info && info.userId) return info;
		for (const path of [
			"/api/w/nuser/account/get",
			"/api/nuser/account/get",
			"/api/user/account"
		]) try {
			const extracted = extractAccountPayload(await api(path, {}, cookie));
			const merged = normalizeLoginInfo(extracted.profile, extracted.account, extracted.root);
			if (merged.userId) return {
				...info,
				...merged
			};
		} catch (_) {}
		try {
			const vipBody = await api("/api/music-vip-membership/front/vip/info", {}, cookie);
			const data = vipBody.data || vipBody;
			const userId = data.userId || data.uid || data.accountId || pickUserIdFromPayload(vipBody);
			if (userId) return {
				...info,
				userId
			};
		} catch (_) {}
		return info || { loggedIn: false };
	}
	async function handleSongLikeCheck(ids, cookie) {
		cookie = await ensureNeteaseCookieHeader(cookie);
		let info = await getLoginInfo(cookie);
		const liked = {};
		if (!info.loggedIn) return {
			error: "LOGIN_REQUIRED",
			loggedIn: false,
			liked,
			ids
		};
		info = await resolveNeteaseUserId(cookie, info);
		const numericIds = ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
		let likedSet = /* @__PURE__ */ new Set();
		if (numericIds.length) try {
			const body = await weapiApi("/api/song/like/check", { trackIds: JSON.stringify(numericIds) }, cookie);
			const data = body.data || body;
			numericIds.forEach((id) => {
				if (data[id] || data[String(id)] || data[Number(id)]) likedSet.add(String(id));
			});
		} catch (_) {}
		if (!likedSet.size && info.userId) try {
			const body = await weapiApi("/api/song/like/get", { uid: info.userId }, cookie);
			const list = body.ids || body.data && body.data.ids || [];
			likedSet = new Set(list.map(String));
		} catch (_) {}
		ids.forEach((id) => {
			liked[id] = likedSet.has(String(id));
		});
		return {
			loggedIn: true,
			ids,
			liked,
			userId: info.userId
		};
	}
	async function handleSongLike(id, like, cookie) {
		cookie = await ensureNeteaseCookieHeader(cookie);
		const info = await getLoginInfo(cookie);
		if (!info.loggedIn) return {
			error: "LOGIN_REQUIRED",
			loggedIn: false
		};
		const trackId = Number(id);
		if (!Number.isFinite(trackId) || trackId <= 0) return {
			error: "INVALID_ID",
			loggedIn: true,
			id: String(id || "")
		};
		const wanted = like !== false;
		noteLibraryStep("netease", "like:login", {
			loggedIn: Boolean(info.loggedIn),
			hasMusicU: Boolean(parseCookieString(cookie).MUSIC_U),
			userId: info.userId ? "present" : "absent"
		});
		/**
		* 现场问题：提示收藏成功，但「我喜欢的音乐」里没有这首歌。
		*
		* 原来这里只打 `/api/radio/like`（私人FM 的「喜欢」）并且**完全不校验结果** —— 上游无论有没有
		* 真的写进收藏库都回 code 200，于是 UI 点亮心形、缓存也把歌记成已收藏。
		*
		* 现在按「写完再读确认」来：写之前读一次（已是目标状态就直接返回），写完用
		* `/api/song/like/check` 复查；没变就换 `/api/radio/like` 再试一次；
		* 仍然没变就报错 —— 宁可显示失败，也不假报成功。
		*/
		const readLikedNow = async () => {
			try {
				const body = await weapiApi("/api/song/like/check", { trackIds: JSON.stringify([trackId]) }, cookie);
				const data = body && (body.data || body) || {};
				const value = data[trackId] ?? data[String(trackId)];
				if (typeof value === "boolean") return value;
				const list = Array.isArray(body && body.ids) ? body.ids : Array.isArray(data.ids) ? data.ids : Array.isArray(body && body.songs) ? body.songs.map((song) => song && song.id) : null;
				if (list) return list.map(String).includes(String(trackId));
				noteLibraryStep("netease", "like:check-shape", {
					code: body && body.code,
					bodyKeys: Object.keys(body || {}).slice(0, 8).join(","),
					dataKeys: Object.keys(data).slice(0, 8).join(",")
				});
			} catch (error) {
				noteLibraryStep("netease", "like:check-error", { message: String(error && error.message || error).slice(0, 90) });
			}
			return null;
		};
		const before = await readLikedNow();
		if (before === wanted) return {
			loggedIn: true,
			id: String(id),
			liked: wanted,
			code: 200,
			via: "already"
		};
		const attempts = [{
			path: "/api/song/like",
			data: {
				trackId,
				like: wanted
			}
		}, {
			path: "/api/radio/like",
			data: {
				alg: "itembased",
				trackId,
				like: wanted,
				time: "3"
			}
		}];
		let lastReason = "";
		for (const attempt of attempts) try {
			const body = await weapiApi(attempt.path, attempt.data, cookie);
			const code = Number(body && body.code);
			noteLibraryStep("netease", "like:write", {
				path: attempt.path,
				like: wanted,
				code,
				bodyKeys: Object.keys(body || {}).slice(0, 8).join(",")
			});
			if (code && code !== 200) {
				lastReason = `${attempt.path} code ${code}`;
				continue;
			}
			const after = await readLikedNow();
			if (after === wanted) return {
				loggedIn: true,
				id: String(id),
				liked: wanted,
				code: 200,
				via: attempt.path
			};
			lastReason = after === null ? `${attempt.path} 后无法复查` : `${attempt.path} 后关系仍是 ${after}`;
		} catch (err) {
			lastReason = `${attempt.path} ${err.message || String(err)}`;
		}
		return {
			error: `LIKE_NOT_APPLIED: ${lastReason}`,
			loggedIn: true,
			id: String(id),
			liked: before === true,
			code: -1
		};
	}
	function buildLoginQrUrl(key) {
		return `https://music.163.com/login?codekey=${encodeURIComponent(key)}`;
	}
	function cookieHeaderFromSetCookieList(list) {
		const map = /* @__PURE__ */ new Map();
		(list || []).forEach((raw) => {
			const part = String(raw || "").split(";")[0];
			const eq = part.indexOf("=");
			if (eq <= 0) return;
			const name = part.slice(0, eq).trim();
			const value = part.slice(eq + 1).trim();
			if (name && value) map.set(name, value);
		});
		return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
	}
	/**
	* QR unikey/check must use EAPI (weapi often returns empty body in extension SW).
	* Do NOT route 800-803 through api() — it treats those codes as fatal errors.
	*/
	async function neteaseQrEapi(path, data, cookie) {
		const raw = await eapiRequest(path, data || {}, cookie || "");
		return {
			body: raw.body || {},
			setCookies: raw.setCookies || [],
			status: raw.status
		};
	}
	async function handleLoginQrKey(cookie) {
		let body = {};
		try {
			({body} = await neteaseQrEapi("/api/login/qrcode/unikey", { type: 3 }, cookie));
		} catch (err) {
			throw new Error(err && err.message || "获取二维码 key 失败");
		}
		const key = body.unikey || body.uniKey || body.data && (body.data.unikey || body.data.uniKey) || "";
		if (!key) {
			const hint = body.message || body.msg || (body.code != null ? `code=${body.code}` : "empty body");
			throw new Error(`获取二维码 key 失败（${hint}）`);
		}
		return {
			key,
			unikey: key,
			code: Number(body.code) || 200
		};
	}
	async function handleLoginQrCreate(key) {
		if (!key) throw new Error("缺少二维码 key");
		const url = buildLoginQrUrl(key);
		const img = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(url)}`;
		return {
			img,
			qrimg: img,
			url
		};
	}
	async function handleLoginQrCheck(key, cookieHeader) {
		key = String(key || "").trim();
		if (!key) return {
			code: 800,
			message: "缺少二维码 key",
			loggedIn: false
		};
		let body = {};
		let setCookies = [];
		try {
			const raw = await neteaseQrEapi("/api/login/qrcode/client/login", {
				key,
				type: 3
			}, cookieHeader);
			body = raw.body || {};
			setCookies = raw.setCookies || [];
		} catch (err) {
			return {
				code: 801,
				error: err && err.message ? err.message : "扫码状态查询失败",
				message: err && err.message ? err.message : "扫码状态查询失败",
				loggedIn: false
			};
		}
		const code = Number(body.code || 0);
		const profile = body.profile || body.data && body.data.profile || {};
		let cookieText = "";
		if (Array.isArray(body.cookie)) cookieText = body.cookie.filter(Boolean).join("; ");
		else cookieText = String(body.cookie || body.data && body.data.cookie || "").trim();
		if (!cookieText && setCookies.length) cookieText = cookieHeaderFromSetCookieList(setCookies);
		if (code === 803) {
			if (cookieText) {
				await setBrowserCookies("https://music.163.com/", cookieText);
				await saveProviderCookie("netease", cookieText);
				try {
					const obj = parseCookieString(cookieText);
					if (obj.MUSIC_U) await chrome.cookies.set({
						url: "https://music.163.com/",
						name: "MUSIC_U",
						value: obj.MUSIC_U,
						path: "/",
						secure: true,
						httpOnly: true
					}).catch(() => null);
				} catch (_) {}
			}
			const cookie = await getNeteaseCookie();
			let info = await getLoginInfo(cookie);
			if (!info.loggedIn && cookieText) info = {
				loggedIn: true,
				pendingProfile: true,
				nickname: profile.nickname || body.nickname || "网易云用户",
				avatar: profile.avatarUrl || body.avatarUrl || "",
				hasCookie: true
			};
			return Object.assign({}, info, {
				code: 803,
				message: body.message || "授权登录成功",
				nickname: profile.nickname || body.nickname || info.nickname || "网易云用户",
				avatar: profile.avatarUrl || body.avatarUrl || info.avatar || "",
				loggedIn: !!(info.loggedIn || cookieText),
				hasCookie: !!(info.loggedIn || cookieText || hasNeteaseLogin(cookie)),
				cookie: (() => {
					const merged = Object.assign(parseCookieString(cookie || ""), parseCookieString(cookieText || ""));
					return Object.entries(merged).map(([name, value]) => `${name}=${value}`).join("; ");
				})()
			});
		}
		return {
			code,
			message: body.message || {
				800: "二维码已过期",
				801: "等待扫码",
				802: "已扫码，待确认"
			}[code] || "",
			nickname: profile.nickname || body.nickname || "",
			avatar: profile.avatarUrl || body.avatarUrl || "",
			loggedIn: false,
			hasCookie: false
		};
	}
	//#endregion
	//#region src/webBridge/api/qq-wechat-login.js
	/**
	* QQ 音乐「微信扫码」登录通道（tmeLoginType: 1）。
	*
	* 协议与原版 Folia 用的 @yakult-green-tea/qq-music-api 一致，是社区逆向结论，非官方定义：
	*  1. GET  open.weixin.qq.com/connect/qrconnect → 页面里带 uuid
	*  2. GET  open.weixin.qq.com/connect/qrcode/<uuid> → 二维码图
	*  3. GET  lp.open.weixin.qq.com/connect/l/qrconnect → 长轮询，回 wx_errcode / wx_code
	*  4. POST u.y.qq.com musicu Login（tmeLoginType:1）用 OAuth code 换 musickey
	*
	* 和 QQ 通道（ptlogin + MQTT）完全无关，只是最后一步都落在同一个 musicu 接口。
	*/
	const WECHAT_APP_ID = "wx48db31d50e334801";
	const WECHAT_LOGIN_TYPE = 1;
	const CONNECT_URL = "https://open.weixin.qq.com/connect/qrconnect";
	const IMAGE_URL_PREFIX = "https://open.weixin.qq.com/connect/qrcode/";
	const POLL_URL = "https://lp.open.weixin.qq.com/connect/l/qrconnect";
	const REDIRECT_URI = "https://y.qq.com/portal/wx_redirect.html?login_type=2&surl=https://y.qq.com/";
	const STYLE_HREF = "https://y.qq.com/mediastyle/music_v17/src/css/popup_wechat.css#wechat_redirect";
	const MUSICU_URL$1 = "https://u.y.qq.com/cgi-bin/musicu.fcg";
	const UUID_PATTERN = /uuid=(.+?)"/;
	const STATUS_PATTERN = /window\.wx_errcode=(\d+);window\.wx_code='([^']*)'/;
	const WECHAT_STATUS = {
		waiting: 408,
		scanned: 404,
		confirmed: 405,
		expired: 402,
		refused: 403
	};
	/** 二维码会话：key 就是微信的 uuid，只在内存里活到取消/过期。 */
	const sessions$1 = /* @__PURE__ */ new Map();
	const sessionKey$1 = (uuid) => `wechat:${uuid}`;
	const retryableCheckFailure = (message, error, extra = {}) => ({
		isOk: false,
		code: 801,
		refresh: false,
		message,
		error,
		provider: "qq",
		status: "wait",
		retryable: true,
		...extra
	});
	const textOf = (value) => typeof value === "string" ? value : "";
	function imageMimetype(bytes) {
		const head = Array.from(bytes.slice(0, 8)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
		if (head.startsWith("89504e470d0a1a0a")) return "image/png";
		if (head.startsWith("ffd8ff")) return "image/jpeg";
		return null;
	}
	async function readBytes(response) {
		return new Uint8Array(await response.arrayBuffer());
	}
	/** 取微信 OAuth 二维码；返回 uuid 与内联图片。 */
	async function qqWechatGetLoginQr() {
		resetQrLoginTrace();
		noteQrLoginStep("wx:qr:create:start");
		await clearQQPlatformSessionCookies();
		const url = new URL(CONNECT_URL);
		url.searchParams.set("appid", WECHAT_APP_ID);
		url.searchParams.set("redirect_uri", REDIRECT_URI);
		url.searchParams.set("response_type", "code");
		url.searchParams.set("scope", "snsapi_login");
		url.searchParams.set("state", "STATE");
		url.searchParams.set("href", STYLE_HREF);
		const page = await fetchWithTimeout(url.toString(), {
			method: "GET",
			headers: {
				"User-Agent": UA,
				Referer: "https://y.qq.com/",
				Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
			}
		}, 15e3);
		if (!page.ok) {
			noteQrLoginStep("wx:qr:create:http", { status: page.status });
			throw new Error("Failed to fetch WeChat login QR");
		}
		const uuid = UUID_PATTERN.exec(textOf(await page.text()))?.[1] ?? "";
		if (!uuid) {
			noteQrLoginStep("wx:qr:create:no-uuid");
			throw new Error("WeChat qrconnect response missing uuid");
		}
		const imageRes = await fetchWithTimeout(`${IMAGE_URL_PREFIX}${uuid}`, {
			method: "GET",
			headers: {
				"User-Agent": UA,
				Referer: CONNECT_URL
			}
		}, 15e3);
		if (!imageRes.ok) {
			noteQrLoginStep("wx:qr:image:http", { status: imageRes.status });
			throw new Error("Failed to fetch WeChat QR image");
		}
		const bytes = await readBytes(imageRes);
		const mimetype = imageMimetype(bytes);
		if (!mimetype) {
			noteQrLoginStep("wx:qr:image:invalid");
			throw new Error("WeChat QR response is not a PNG/JPEG image");
		}
		let base64 = "";
		for (let index = 0; index < bytes.length; index += 1) base64 += String.fromCharCode(bytes[index]);
		const qrimg = `data:${mimetype};base64,${btoa(base64)}`;
		sessions$1.set(sessionKey$1(uuid), {
			uuid,
			qrimg,
			cancelled: false
		});
		noteQrLoginStep("wx:qr:create:ok");
		return {
			qrsig: uuid,
			ptqrtoken: uuid,
			qrimg,
			uuid
		};
	}
	/** 用 musicu 的 Login 把微信 OAuth code 换成 QQ 音乐凭证。 */
	async function exchangeWechatCredential(code) {
		const body = JSON.stringify({
			comm: {
				ct: 11,
				cv: 14090008,
				v: 14090008,
				tmeAppID: "qqmusic",
				tmeLoginType: WECHAT_LOGIN_TYPE
			},
			req: {
				module: "music.login.LoginServer",
				method: "Login",
				param: {
					code,
					strAppid: WECHAT_APP_ID
				}
			}
		});
		const json = await (await fetchWithTimeout(`${MUSICU_URL$1}?format=json`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json;charset=UTF-8",
				Referer: "https://y.qq.com/",
				"User-Agent": UA
			},
			body
		}, 15e3)).json().catch(() => null);
		const data = json && json.req && json.req.data;
		if (!data || typeof data !== "object") throw new Error("WeChat credential exchange returned no data");
		return data;
	}
	/** 一次微信长轮询。 */
	async function pollWechat(uuid, budgetMs = 1500) {
		const url = new URL(POLL_URL);
		url.searchParams.set("uuid", uuid);
		url.searchParams.set("_", String(Date.now()));
		const response = await fetchWithTimeout(url.toString(), {
			method: "GET",
			headers: {
				"User-Agent": UA,
				Referer: "https://open.weixin.qq.com/"
			}
		}, Math.max(2e3, budgetMs + 1e3));
		const match = STATUS_PATTERN.exec(textOf(await response.text()));
		if (!match) throw new Error("WeChat poll response missing wx_errcode");
		return {
			upstreamCode: Number(match[1]),
			code: match[2]
		};
	}
	/** 与 qqCheckLoginQr 同形：把微信状态映射成后端约定的 code/status。 */
	async function qqWechatCheckLoginQr(params = {}) {
		const uuid = String(params.qrsig || params.ptqrtoken || "");
		const qrSession = sessions$1.get(sessionKey$1(uuid));
		if (!qrSession) return {
			isOk: false,
			code: 800,
			provider: "qq",
			status: "expired",
			message: "二维码已过期"
		};
		if (qrSession.cancelled) return {
			isOk: false,
			code: 803,
			provider: "qq",
			status: "cancelled",
			message: "已取消"
		};
		let status;
		try {
			status = await pollWechat(uuid);
		} catch (error) {
			return retryableCheckFailure(error?.message || "微信轮询失败", String(error));
		}
		if (status.upstreamCode === WECHAT_STATUS.waiting) return {
			isOk: false,
			code: 801,
			provider: "qq",
			status: "wait",
			message: "等待扫码"
		};
		if (status.upstreamCode === WECHAT_STATUS.scanned) return {
			isOk: false,
			code: 802,
			provider: "qq",
			status: "scanned",
			message: "已扫码，请在手机上确认"
		};
		if (status.upstreamCode === WECHAT_STATUS.expired) {
			sessions$1.delete(sessionKey$1(uuid));
			return {
				isOk: false,
				code: 800,
				provider: "qq",
				status: "expired",
				message: "二维码已过期"
			};
		}
		if (status.upstreamCode === WECHAT_STATUS.refused) {
			sessions$1.delete(sessionKey$1(uuid));
			return {
				isOk: false,
				code: 803,
				provider: "qq",
				status: "cancelled",
				message: "已取消"
			};
		}
		if (status.upstreamCode !== WECHAT_STATUS.confirmed || !status.code) return retryableCheckFailure("未识别的微信二维码状态", "unknown-status", { upstreamCode: status.upstreamCode });
		try {
			const credential = await exchangeWechatCredential(status.code);
			const musicKey = String(credential.musickey || "");
			const strMusicId = String(credential.str_musicid ?? "").trim();
			const rawMusicId = String(credential.musicid ?? "").trim();
			const accountId = (strMusicId && strMusicId !== "0" ? strMusicId : "") || (rawMusicId && rawMusicId !== "0" ? rawMusicId : "");
			const musicid = accountId.replace(/\D/g, "");
			if (!musicKey || !musicid) throw new Error("微信登录未拿到 musickey/musicid");
			const cookiePairs = [
				"login_type=2",
				`wxuin=${musicid}`,
				`uin=o${musicid}`,
				`qqmusic_uin=o${musicid}`,
				`qm_keyst=${musicKey}`,
				`qqmusic_key=${musicKey}`,
				`tmeLoginType=${WECHAT_LOGIN_TYPE}`
			];
			if (accountId) cookiePairs.push(`str_musicid=${accountId}`);
			const sessionData = buildLoginSession(cookiePairs.join("; "));
			await clearQQPlatformSessionCookies();
			await setBrowserCookies("https://y.qq.com/", sessionData.cookie);
			await setBrowserCookies("https://qq.com/", sessionData.cookie);
			await setBrowserCookies("https://graph.qq.com/", sessionData.cookie);
			clearCookieCache();
			await saveProviderCookie("qq", sessionData.cookie);
			sessions$1.delete(sessionKey$1(uuid));
			noteQrLoginStep("wx:qr:done:ok");
			return {
				isOk: true,
				message: "登录成功",
				session: sessionData,
				provider: "qq",
				code: 0,
				status: "ok",
				loggedIn: true,
				hasCookie: true,
				userId: musicid,
				uin: musicid,
				nickname: String(credential.nick || credential.nickname || `微信用户 ${musicid}`)
			};
		} catch (error) {
			noteQrLoginStep("wx:qr:exchange:failed", { message: error?.message || String(error) });
			return retryableCheckFailure(error?.message || "微信凭证换取失败", String(error));
		}
	}
	function qqWechatCancelLoginQr(key) {
		const uuid = String(key || "");
		const session = sessions$1.get(sessionKey$1(uuid));
		if (session) session.cancelled = true;
		sessions$1.delete(sessionKey$1(uuid));
	}
	//#endregion
	//#region src/webBridge/api/qq/mqtt.js
	/**
	* MQTT 5 over WebSocket 的最小实现，只够 QQ 音乐 App 扫码（三合一那张码）用。
	*
	* 为什么需要它：QQ 音乐 App 的登录码不是一张普通的图片 —— 它绑着一条 MQTT 会话，
	* 扫码、确认、下发换票令牌全在那条长连接上推过来。上游（`@yakult-green-tea/qq-music-api`
	* 的 `mqtt` 模块）也是这套协议：CONNECT 用 auth method `pass` 带上 tme 的几项 user
	* property（`tmeAppID` / `hashTag` / `userID` 都填二维码 id），SUBSCRIBE 到
	* `management.qrcode_login/<qrcodeId>`（unicast，不重放），然后收 PUBLISH。
	*
	* 🔴 订阅必须在二维码显示**之前**成立：CONNECT 请求的是 clean session、订阅是 unicast，
	* 断连期间的 `scanned` / `cookies` 上游既不保留也不补送。所以 `openQrListener` 等的是
	* SUBACK，不是连接建立。
	*
	* 本文件不 import 任何东西：纯字节层，能脱开桥单独跑单测（`test/unit/nativeBridge/qqAppLoginMqtt.test.ts`）。
	*/
	const MQTT_HOST = "mu.y.qq.com";
	const MQTT_INITIAL_PATH = "/ws/handshake";
	const textEncoder = new TextEncoder();
	const textDecoder = new TextDecoder();
	/** MQTT 的可变长度整数（每字节 7 位，最高位是「后面还有」）。 */
	const encodeVarint = (input) => {
		const bytes = [];
		let value = input;
		do {
			let digit = value % 128;
			value = Math.floor(value / 128);
			if (value > 0) digit |= 128;
			bytes.push(digit);
		} while (value > 0);
		return Uint8Array.from(bytes);
	};
	/** 读一个可变长度整数；字节不够时回 null（网络分片里很常见，调用方据此等下一片）。 */
	const decodeVarint = (buffer, offset = 0) => {
		let multiplier = 1;
		let value = 0;
		for (let bytes = 0; bytes < 4; bytes += 1) {
			if (offset + bytes >= buffer.length) return null;
			const digit = buffer[offset + bytes];
			value += (digit & 127) * multiplier;
			if ((digit & 128) === 0) return {
				value,
				bytes: bytes + 1
			};
			multiplier *= 128;
		}
		throw new Error("Malformed MQTT variable integer");
	};
	const joinBytes = (chunks) => {
		const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
		const out = new Uint8Array(total);
		let offset = 0;
		for (const chunk of chunks) {
			out.set(chunk, offset);
			offset += chunk.length;
		}
		return out;
	};
	/** MQTT 的 UTF-8 字段：两字节大端长度 + 正文。 */
	const encodeUtf8 = (value) => {
		const data = textEncoder.encode(String(value));
		return joinBytes([Uint8Array.of(data.length >> 8 & 255, data.length & 255), data]);
	};
	const readUInt16 = (buffer, offset) => buffer[offset] << 8 | buffer[offset + 1];
	const readUtf8 = (buffer, offset) => {
		const length = readUInt16(buffer, offset);
		const start = offset + 2;
		return {
			value: textDecoder.decode(buffer.subarray(start, start + length)),
			next: start + length
		};
	};
	/** 属性块：0x15 = 认证方式，0x26 = 用户属性（键值都是 UTF-8 字符串）。 */
	const encodeProperties = (authMethod, properties) => {
		const chunks = [];
		if (authMethod) chunks.push(Uint8Array.of(21), encodeUtf8(authMethod));
		for (const [key, value] of properties) chunks.push(Uint8Array.of(38), encodeUtf8(key), encodeUtf8(value));
		const data = joinBytes(chunks);
		return joinBytes([encodeVarint(data.length), data]);
	};
	const wrapPacket = (header, body) => joinBytes([
		Uint8Array.of(header),
		encodeVarint(body.length),
		body
	]);
	/**
	* CONNECT：协议版本 5、clean session、keepalive 45 秒；认证方式是 `pass`，凭据就是那几项
	* user property（上游的 `business=management` / `clientTag=management.user`）。
	*/
	const buildConnectPacket = (clientId, qrcodeId) => {
		const properties = encodeProperties("pass", [
			["tmeAppID", "qqmusic"],
			["business", "management"],
			["hashTag", qrcodeId],
			["clientTag", "management.user"],
			["userID", qrcodeId]
		]);
		return wrapPacket(16, joinBytes([
			encodeUtf8("MQTT"),
			Uint8Array.of(5, 2),
			Uint8Array.of(0, 45),
			properties,
			encodeUtf8(clientId)
		]));
	};
	/** SUBSCRIBE：QoS 0、`authorization=tmelogin`、`pubsub=unicast`；包 id 固定 1，一条连接只订阅一次。 */
	const buildSubscribePacket = (qrcodeId) => {
		const properties = encodeProperties(null, [["authorization", "tmelogin"], ["pubsub", "unicast"]]);
		return wrapPacket(130, joinBytes([
			Uint8Array.of(0, 1),
			properties,
			encodeUtf8(`management.qrcode_login/${qrcodeId}`),
			Uint8Array.of(0)
		]));
	};
	/** PINGREQ：0xc0 0x00。 */
	const PING_PACKET = Uint8Array.of(192, 0);
	const skipProperty = (buffer, offset, id) => {
		if ([
			3,
			8,
			18,
			21,
			26,
			28,
			31
		].includes(id)) return readUtf8(buffer, offset).next;
		if ([
			19,
			33,
			34,
			35
		].includes(id)) return offset + 2;
		if ([
			2,
			17,
			24,
			39
		].includes(id)) return offset + 4;
		if ([
			1,
			23,
			25,
			36,
			37,
			40,
			41,
			42
		].includes(id)) return offset + 1;
		if ([9, 22].includes(id)) return offset + 2 + readUInt16(buffer, offset);
		if (id === 11) {
			const value = decodeVarint(buffer, offset);
			if (!value) throw new Error("Truncated MQTT subscription identifier");
			return offset + value.bytes;
		}
		throw new Error(`Unsupported MQTT property 0x${id.toString(16)}`);
	};
	const parseProperties = (buffer, offset) => {
		const length = decodeVarint(buffer, offset);
		if (!length) throw new Error("Truncated MQTT properties");
		let cursor = offset + length.bytes;
		const end = cursor + length.value;
		const userProperties = {};
		const values = { userProperties };
		while (cursor < end) {
			const id = buffer[cursor];
			cursor += 1;
			if (id === 38) {
				const key = readUtf8(buffer, cursor);
				const value = readUtf8(buffer, key.next);
				userProperties[key.value] = value.value;
				cursor = value.next;
			} else if (id === 28 || id === 31) {
				const value = readUtf8(buffer, cursor);
				values[id === 28 ? "serverReference" : "reasonString"] = value.value;
				cursor = value.next;
			} else cursor = skipProperty(buffer, cursor, id);
		}
		return {
			values,
			next: end
		};
	};
	/** 一片 WebSocket 消息里可能有半个包、也可能有好几个包，剩下的留给下一次。 */
	const splitPackets = (buffer) => {
		const packets = [];
		let cursor = 0;
		while (cursor < buffer.length) {
			const remaining = decodeVarint(buffer, cursor + 1);
			if (!remaining) break;
			const end = cursor + 1 + remaining.bytes + remaining.value;
			if (end > buffer.length) break;
			packets.push(buffer.subarray(cursor, end));
			cursor = end;
		}
		return {
			packets,
			rest: buffer.subarray(cursor)
		};
	};
	const parseConnack = (packet) => {
		const remaining = decodeVarint(packet, 1);
		if (!remaining) throw new Error("Truncated MQTT CONNACK");
		const offset = 1 + remaining.bytes;
		return {
			reasonCode: packet[offset + 1],
			...parseProperties(packet, offset + 2).values
		};
	};
	/** PUBLISH：主题跳过去，QoS>0 时跳过包 id，正文按 JSON 解析；事件类型在 user property `type` 上。 */
	const parsePublish = (packet) => {
		const remaining = decodeVarint(packet, 1);
		if (!remaining) throw new Error("Truncated MQTT PUBLISH");
		let cursor = 1 + remaining.bytes;
		cursor = readUtf8(packet, cursor).next;
		if ((packet[0] >> 1 & 3) > 0) cursor += 2;
		const properties = parseProperties(packet, cursor);
		const raw = textDecoder.decode(packet.subarray(properties.next));
		let payload = null;
		if (raw.trim()) try {
			payload = JSON.parse(raw);
		} catch (_) {
			payload = null;
		}
		return {
			type: properties.values.userProperties.type || null,
			payload
		};
	};
	const toBytes = (value) => {
		if (value instanceof Uint8Array) return value;
		if (value instanceof ArrayBuffer) return new Uint8Array(value);
		if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
		return /* @__PURE__ */ new Uint8Array(0);
	};
	/**
	* 包队列：把「等下一个包」写成 Promise，超时即 reject。
	* 先建队列、再把它的 handlers 交给连接，是因为第一帧可能在 `connect` resolve 之前就到了。
	*/
	const createPacketQueue = () => {
		let buffered = /* @__PURE__ */ new Uint8Array(0);
		const packets = [];
		const waiters = [];
		let terminalError = null;
		const settle = () => {
			while (waiters.length && packets.length) waiters.shift().resolve(packets.shift());
			while (terminalError && waiters.length) waiters.shift().reject(terminalError);
		};
		const push = (value) => {
			const split = splitPackets(joinBytes([buffered, toBytes(value)]));
			buffered = split.rest;
			packets.push(...split.packets);
			settle();
		};
		const fail = (error) => {
			terminalError = error;
			settle();
		};
		const next = (timeoutMs) => {
			if (packets.length) return Promise.resolve(packets.shift());
			if (terminalError) return Promise.reject(terminalError);
			return new Promise((resolve, reject) => {
				const waiter = {
					resolve,
					reject
				};
				waiters.push(waiter);
				const timer = setTimeout(() => {
					const index = waiters.indexOf(waiter);
					if (index >= 0) waiters.splice(index, 1);
					reject(/* @__PURE__ */ new Error("MQTT packet timeout"));
				}, timeoutMs);
				waiter.resolve = (packet) => {
					clearTimeout(timer);
					resolve(packet);
				};
				waiter.reject = (error) => {
					clearTimeout(timer);
					reject(error);
				};
			});
		};
		return {
			push,
			fail,
			next
		};
	};
	const HANDSHAKE_TIMEOUT_MS = 2e4;
	const PING_INTERVAL_MS = 3e4;
	const defaultOpenSocket = (url) => new Promise((resolve, reject) => {
		const socket = new WebSocket(url, "mqtt");
		socket.binaryType = "arraybuffer";
		const timer = setTimeout(() => {
			try {
				socket.close();
			} catch (_) {}
			reject(/* @__PURE__ */ new Error("MQTT handshake timeout"));
		}, HANDSHAKE_TIMEOUT_MS);
		socket.addEventListener("open", () => {
			clearTimeout(timer);
			resolve(socket);
		}, { once: true });
		socket.addEventListener("error", () => {
			clearTimeout(timer);
			reject(/* @__PURE__ */ new Error("MQTT WebSocket error"));
		}, { once: true });
	});
	/** 重定向：CONNACK 用 0x9c / 0x9d + `serverReference` 让客户端换一条路径重连（最多 3 跳）。 */
	const redirectPath = (path, reference) => {
		const parts = path.replace(/\/$/, "").split("/");
		if ((parts[parts.length - 1] || "").includes(":")) parts[parts.length - 1] = reference;
		else parts.push(reference);
		return parts.join("/");
	};
	const randomDigits$1 = (count) => {
		let out = "";
		for (let index = 0; index < count; index += 1) out += Math.floor(Math.random() * 10);
		return out;
	};
	const connectMqtt = async (qrcodeId, openSocket) => {
		let path = MQTT_INITIAL_PATH;
		for (let redirects = 0; redirects <= 3; redirects += 1) {
			const queue = createPacketQueue();
			const socket = await openSocket(`wss://${MQTT_HOST}${path}`);
			socket.addEventListener("message", (event) => queue.push(event.data));
			socket.addEventListener("close", () => queue.fail(/* @__PURE__ */ new Error("MQTT WebSocket closed")));
			socket.addEventListener("error", () => queue.fail(/* @__PURE__ */ new Error("MQTT WebSocket error")));
			socket.send(buildConnectPacket(`${Date.now()}${randomDigits$1(4)}`, qrcodeId));
			const connack = parseConnack(await queue.next(HANDSHAKE_TIMEOUT_MS));
			const reasonCode = Number(connack.reasonCode ?? -1);
			if (reasonCode === 0) return {
				socket,
				queue
			};
			try {
				socket.close();
			} catch (_) {}
			const reference = connack.serverReference || "";
			if (![156, 157].includes(reasonCode) || !reference || redirects === 3) throw new Error(`MQTT CONNACK rejected: 0x${reasonCode.toString(16)}`);
			path = redirectPath(path, reference);
		}
		throw new Error("MQTT redirect limit exceeded");
	};
	/**
	* 连上、订阅、**等到 SUBACK** 再把句柄交出去；之后在后台收事件，直到出现终态或超时。
	* `ready` 不单独暴露：调用方要在拿到句柄之前就知道订阅成立，所以这个函数本身就是 await 的点。
	*/
	const openQrListener = async (qrcodeId, onEvent, timeoutMs, options = {}) => {
		const openSocket = options.openSocket || defaultOpenSocket;
		const { socket, queue } = await connectMqtt(qrcodeId, openSocket);
		let closed = false;
		let ping = null;
		const close = () => {
			if (closed) return;
			closed = true;
			if (ping) clearInterval(ping);
			try {
				socket.close();
			} catch (_) {}
		};
		try {
			socket.send(buildSubscribePacket(qrcodeId));
			for (;;) {
				const packet = await queue.next(HANDSHAKE_TIMEOUT_MS);
				const type = packet[0] >> 4;
				if (type === 9) {
					const reasonCode = packet[packet.length - 1] ?? 128;
					if (reasonCode >= 128) throw new Error(`MQTT SUBACK rejected: 0x${reasonCode.toString(16)}`);
					break;
				}
				if (type === 3) onEvent(parsePublish(packet));
			}
		} catch (error) {
			close();
			throw error;
		}
		onEvent({
			type: "waiting",
			payload: null
		});
		ping = setInterval(() => {
			if (closed) return;
			try {
				socket.send(PING_PACKET);
			} catch (_) {
				close();
			}
		}, PING_INTERVAL_MS);
		const deadline = Date.now() + Math.max(0, timeoutMs);
		(async () => {
			let terminal = false;
			while (!closed && Date.now() < deadline) {
				let packet = null;
				try {
					packet = await queue.next(Math.max(1, deadline - Date.now()));
				} catch (_) {
					break;
				}
				if (!packet || packet[0] >> 4 !== 3) continue;
				const event = parsePublish(packet);
				onEvent(event);
				if ([
					"cookies",
					"canceled",
					"timeout",
					"loginFailed"
				].includes(event.type || "")) {
					terminal = true;
					break;
				}
			}
			if (!closed && !terminal) onEvent({
				type: "timeout",
				payload: null
			});
			close();
		})().catch(() => void 0);
		return { close };
	};
	//#endregion
	//#region src/webBridge/api/qq/appLogin.js
	/**
	* QQ 音乐 App 扫码登录（「三合一」那张码）—— 手机上用 **QQ音乐 App / 手机QQ / 微信** 任一款扫同一张码。
	*
	* 与 `qq-login-qr.js`（手机QQ 的 ptlogin 网页码）、`qq-wechat-login.js`（微信 OAuth 码）并列，
	* 是第三条通道，也是上游 `qqmusic` 通道在安卓内置桥里的落地：
	*  0. POST musicu `music.getSession.session/GetSession` → 设备会话 uid / sid，之后每笔 comm 都带
	*  1. POST u.y.qq.com musicu `music.login.LoginServer/CreateQRCode` → qrcodeID + 二维码图
	*     （comm 照安卓客户端：ct 23 / cv 0，参数里 tmeAppID qqmusic、ct 11、cv 14090008）
	*  2. 连 `wss://mu.y.qq.com/ws/handshake`，订阅 `management.qrcode_login/<qrcodeID>`（见 `mqtt.js`）
	*  3. 收到 `cookies` 事件：载荷里是 `qqmusic_uin` 与换票令牌 `qqmusic_key`，**不是**最终凭证
	*  4. POST musicu `music.login.LoginServer/Login`（tmeLoginType 6，微信账号以回包的 loginType 为准）
	*     换出 musickey，再按二维码通道的口径拼出会话 cookie
	*
	* 🔴 换票令牌只在内存里活到这次登录结束：本模块不留任何落盘状态，二维码取消 / 过期 / 成功都关连接。
	* 🔴 `loginType` 不能一律写 6：QQ 音乐 App 里登的是微信账号时，回包会给 1，写成 6 会让之后每个请求
	* 都被上游按 QQ 账号解析而拒收（和 `qq-wechat-login.js` 里那段同源）。
	*/
	const MUSICU_URL = "https://u.y.qq.com/cgi-bin/musicu.fcg";
	const CHANNEL = "qqmusic";
	/** 手机 QQ 的账号类型。App 通道照官方客户端也送 6，账号真正的类型以换票回包为准。 */
	const MOBILE_LOGIN_TYPE = 6;
	/** 二维码最长活 3 分钟（上游 `QR_TTL_MS`）：再长的 ttl 只会在后台多占一条连接。 */
	const MAX_TTL_MS = 18e4;
	/** 二维码会话：key 就是 qrcodeID，只在内存里活到取消 / 过期 / 成功。 */
	const sessions = /* @__PURE__ */ new Map();
	const sessionKey = (qrcodeId) => `app:${qrcodeId}`;
	const randomHex = (length) => {
		let out = "";
		const cryptoObject = typeof crypto !== "undefined" ? crypto : null;
		if (cryptoObject?.getRandomValues) {
			const buffer = new Uint8Array(Math.ceil(length / 2));
			cryptoObject.getRandomValues(buffer);
			out = Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join("");
		} else for (let index = 0; index < length; index += 1) out += Math.floor(Math.random() * 16).toString(16);
		return out.slice(0, length);
	};
	const randomDigits = (length) => {
		let out = "";
		for (let index = 0; index < length; index += 1) out += Math.floor(Math.random() * 10);
		return out;
	};
	let deviceIdentity = null;
	const device = () => {
		if (!deviceIdentity) deviceIdentity = {
			openUdid: randomHex(32),
			androidId: randomHex(16),
			osRelease: "10",
			model: "MI 6",
			sdk: 29,
			fingerprint: `xiaomi/iarim/sagit:10/eomam.200122.001/${randomDigits(7)}:user/release-keys`,
			sessionUid: "",
			sessionSid: ""
		};
		return deviceIdentity;
	};
	/**
	* musicu 的 comm，照安卓客户端那一套（上游 `buildAndroidComm`）。
	*
	* 🔴 `ct/cv` 是「我是谁」：**取码那一笔**上游传 `{ ct: 23, cv: 0 }`（网页那张脸），
	* **换票这一笔**必须回到安卓客户端的 `{ ct: 11, cv: 14090008 }` —— 差在这一对上，上游就是
	* 一句不带任何解释的 `code 1000`（凭据不被接受），看不出是脸不对还是令牌不对。
	*/
	const buildComm = (overrides = {}) => {
		const identity = device();
		return {
			ct: 11,
			cv: 14090008,
			v: 14090008,
			chid: "10003505",
			tmeAppID: "qqmusic",
			QIMEI: "",
			QIMEI36: "",
			OpenUDID: identity.openUdid,
			udid: identity.openUdid,
			OpenUDID2: identity.openUdid,
			aid: identity.androidId,
			os_ver: identity.osRelease,
			phonetype: identity.model,
			devicelevel: String(identity.sdk),
			newdevicelevel: String(identity.sdk),
			rom: identity.fingerprint,
			...identity.sessionUid ? { uid: identity.sessionUid } : {},
			...identity.sessionSid ? { sid: identity.sessionSid } : {},
			...overrides
		};
	};
	/**
	* 设备会话 bootstrap：上游在取码 **之前** 先 `GetSession` 拿 `uid` / `sid`，之后每一笔 comm 都带上
	* （`buildAndroidComm` 里那两个 `device.sessionUid/sessionSid` 分支）。不带这两个字段，换票那一笔
	* 上游照样回一句没有解释的 `code 1000` —— 而 `1000 / 104400 / 104401` 这一组在上游的错误码登记表里
	* 就是「凭据不被接受」，不是网络问题。
	*
	* 这一笔失败不拦登录：实测 `CreateQRCode` 没有它也能出码（QIMEI 同理，空串照走），
	* 所以这里只记一条诊断，剩下的交给二维码本身成败。
	*/
	const bootstrapDeviceSession = async () => {
		const identity = device();
		if (identity.sessionUid && identity.sessionSid) return identity;
		try {
			const body = JSON.stringify({
				comm: buildComm(),
				req_0: {
					module: "music.getSession.session",
					method: "GetSession",
					param: {
						uid: identity.sessionUid || "",
						vkey: 0,
						caller: 0
					}
				}
			});
			const data = await postMusicu(body);
			const session = data && data.session || {};
			const uid = String(session.uid ?? "").trim();
			const sid = String(session.sid ?? "").trim();
			if (!uid || !sid) throw new Error("GetSession returned no uid/sid");
			identity.sessionUid = uid;
			identity.sessionSid = sid;
			noteQrLoginStep("app:qr:session:ok");
		} catch (error) {
			noteQrLoginStep("app:qr:session:failed", { message: error?.message || String(error) });
		}
		return identity;
	};
	const postMusicu = async (body, timeout = 15e3) => {
		const json = await (await fetchWithTimeout(`${MUSICU_URL}?format=json`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json;charset=UTF-8",
				"User-Agent": `QQMusic 14090008(android ${device().osRelease})`
			},
			body
		}, timeout)).json().catch(() => null);
		const item = json && (json.req_0 || json.req);
		const globalCode = Number(json?.code ?? 0);
		const upstreamCode = Number(item?.code ?? 0);
		if (!item || globalCode !== 0 || upstreamCode !== 0 || !item.data) {
			const error = /* @__PURE__ */ new Error(`QQ app QR: musicu rejected (upstream ${item?.code ?? "unknown"}, global ${json?.code ?? "unknown"})`);
			error.upstreamCode = Number.isFinite(upstreamCode) ? upstreamCode : void 0;
			error.globalCode = Number.isFinite(globalCode) ? globalCode : void 0;
			throw error;
		}
		return item.data;
	};
	/** 要一张 App 扫码的码。图和 id 一起回来，图是 data URL，界面拿到就能画。 */
	const createAppQr = async () => {
		const body = JSON.stringify({
			comm: buildComm({
				ct: 23,
				cv: 0
			}),
			req_0: {
				module: "music.login.LoginServer",
				method: "CreateQRCode",
				param: {
					tmeAppID: "qqmusic",
					ct: 11,
					cv: 14090008
				}
			}
		});
		const data = await postMusicu(body);
		const qrcodeId = String(data.qrcodeID || "");
		const image = String(data.qrcode || "");
		if (!qrcodeId || !image.startsWith("data:image/")) throw new Error("QQ app QR: CreateQRCode returned no qrcodeID/image");
		const expiresIn = Number(data.expiresIn);
		return {
			qrcodeId,
			qrimg: image,
			expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 180
		};
	};
	/**
	* 换票：MQTT 给的是令牌，拿它换 musickey。
	* 19 位的微信账号 id 超过安全整数，`Number()` 会变成另一个账号（上游 50006），所以数字原样写进正文。
	*/
	const exchangeCredential = async (qrcodeId, musicid, token) => {
		const musicIdLiteral = /^\d{1,19}$/.test(musicid) ? musicid : JSON.stringify(musicid);
		const body = `{"comm":${JSON.stringify(buildComm({ tmeLoginType: MOBILE_LOGIN_TYPE }))},"req_0":{"module":"music.login.LoginServer","method":"Login","param":{"musicid":${musicIdLiteral},"qrCodeID":${JSON.stringify(qrcodeId)},"token":${JSON.stringify(token)}}}}`;
		const data = await postMusicu(body);
		const musicKey = String(data.musickey || "");
		const strMusicId = String(data.str_musicid ?? "").trim();
		const rawMusicId = String(data.musicid ?? "").trim();
		const accountId = (strMusicId && strMusicId !== "0" ? strMusicId : "") || (rawMusicId && rawMusicId !== "0" ? rawMusicId : "") || musicid;
		const loginType = Number(data.loginType) || MOBILE_LOGIN_TYPE;
		if (!musicKey) throw new Error("QQ app QR: exchange returned no musickey");
		return {
			accountId: accountId.replace(/\D/g, ""),
			musicKey,
			loginType
		};
	};
	/**
	* 拿一份凭据去读登录用户（`music.UserInfo.userInfoServer/GetLoginUserInfo`），能读通就说明
	* 上游认这份凭据。上游把这当成换票失败后的兜底验证（`getLoginUser`）。
	*
	* 🔴 comm 里带 `qq` / `authst` / `tmeLoginType` 就是「我是谁」：这三个字段就是上游
	* `buildAndroidComm(device, credential)` 在带凭据时多加的那一段。
	*/
	const validateCredential = async (credential) => {
		const body = JSON.stringify({
			comm: buildComm({
				qq: credential.accountId,
				authst: credential.musicKey,
				tmeLoginType: credential.loginType
			}),
			req_0: {
				module: "music.UserInfo.userInfoServer",
				method: "GetLoginUserInfo",
				param: {}
			}
		});
		await postMusicu(body);
		return credential;
	};
	/**
	* 换票失败后的兜底：MQTT 给的那个令牌本身有时就是能用的 musickey（上游
	* `exchangeQqLogin` 里记着这条：`fallbackAttempted`）。用「拿它去读一次登录用户」来判定，
	* 读得通就认，读不通再抛换票那一步的原始错误 —— 别让兜底的失败盖掉真正的原因。
	*/
	const credentialFromToken = (musicid, token) => ({
		accountId: String(musicid).replace(/\D/g, ""),
		musicKey: String(token || ""),
		loginType: MOBILE_LOGIN_TYPE
	});
	const resolveCredential = async (qrcodeId, musicid, token) => {
		try {
			return await exchangeCredential(qrcodeId, musicid, token);
		} catch (error) {
			noteQrLoginStep("app:qr:exchange:fallback:start", { message: error?.message || String(error) });
			const direct = credentialFromToken(musicid, token);
			if (!direct.musicKey) throw error;
			try {
				await validateCredential(direct);
				noteQrLoginStep("app:qr:exchange:fallback:ok");
				return direct;
			} catch (validationError) {
				noteQrLoginStep("app:qr:exchange:fallback:failed", { message: validationError?.message || String(validationError) });
				throw error;
			}
		}
	};
	const buildCookie = ({ accountId, musicKey, loginType }) => {
		const pairs = [
			`uin=o${accountId}`,
			`qqmusic_uin=o${accountId}`,
			`qm_keyst=${musicKey}`,
			`qqmusic_key=${musicKey}`,
			`tmeLoginType=${loginType}`,
			`str_musicid=${accountId}`
		];
		if (Number(loginType) === 1) pairs.unshift("login_type=2", `wxuin=${accountId}`);
		return pairs.join("; ");
	};
	const applySession = async (cookie) => {
		const sessionData = buildLoginSession(cookie);
		await clearQQPlatformSessionCookies();
		await setBrowserCookies("https://y.qq.com/", sessionData.cookie);
		await setBrowserCookies("https://qq.com/", sessionData.cookie);
		clearCookieCache();
		await saveProviderCookie("qq", sessionData.cookie);
		return sessionData;
	};
	const expired = () => ({
		isOk: false,
		code: 65,
		refresh: true,
		provider: "qq",
		status: "expired",
		message: "二维码已过期"
	});
	const waiting = () => ({
		isOk: false,
		code: 66,
		refresh: false,
		provider: "qq",
		status: "wait",
		message: "等待扫码"
	});
	/**
	* 要码 + 立刻订阅。**订阅成立（SUBACK）之后才返回**：先给人看码、后订阅，
	* 中间那一下被扫的事件不会补送，用户会看到「手机提示登录成功、窗口一直转圈」。
	*/
	async function qqAppGetLoginQr() {
		resetQrLoginTrace();
		prune();
		noteQrLoginStep("app:qr:create:start");
		await clearQQPlatformSessionCookies().catch(() => void 0);
		await bootstrapDeviceSession();
		const qr = await createAppQr();
		const session = {
			qrcodeId: qr.qrcodeId,
			qrimg: qr.qrimg,
			events: [],
			listener: null,
			result: null,
			exchanging: null,
			startedAt: Date.now(),
			expiresAt: Date.now() + Math.min(qr.expiresIn * 1e3, MAX_TTL_MS)
		};
		sessions.set(sessionKey(qr.qrcodeId), session);
		try {
			session.listener = await openQrListener(qr.qrcodeId, (event) => session.events.push(event), Math.max(1e3, session.expiresAt - Date.now()));
		} catch (error) {
			sessions.delete(sessionKey(qr.qrcodeId));
			noteQrLoginStep("app:qr:create:listen-failed", { message: error?.message || String(error) });
			throw error;
		}
		noteQrLoginStep("app:qr:create:ok");
		return {
			qrsig: qr.qrcodeId,
			ptqrtoken: qr.qrcodeId,
			qrimg: qr.qrimg,
			channel: CHANNEL
		};
	}
	/** 关掉连接；条目留着 —— 界面拿到 803 / 终态之后可能还会再问一次，那时不能答「已过期」。 */
	const release = (session) => {
		session.listener?.close();
		session.listener = null;
		session.finishedAt = session.finishedAt || Date.now();
	};
	const forget = (session) => {
		release(session);
		sessions.delete(sessionKey(session.qrcodeId));
	};
	/** 收掉早就结束的条目：每次要新码时的第一件事。 */
	const prune = () => {
		const now = Date.now();
		sessions.forEach((session, key) => {
			if (session.finishedAt ? now - session.finishedAt > 3e5 : now > session.expiresAt + 6e4) {
				release(session);
				sessions.delete(key);
			}
		});
	};
	/**
	* 一次查询。桥里**不做长轮询**：事件已经由 `mqtt.js` 的后台循环收进 `session.events`，
	* 这里只报当前状态，界面按自己的节奏来问。
	*/
	async function qqAppCheckLoginQr(qrcodeId) {
		const key = sessionKey(String(qrcodeId || ""));
		const session = sessions.get(key);
		if (!session) return expired();
		if (session.result) return session.result;
		if (Date.now() > session.expiresAt) {
			forget(session);
			noteQrLoginStep("app:qr:check:expired");
			return expired();
		}
		const terminal = session.events.find((event) => [
			"canceled",
			"timeout",
			"loginFailed"
		].includes(event.type || ""));
		if (terminal) {
			forget(session);
			noteQrLoginStep("app:qr:check:terminal", { type: terminal.type });
			return expired();
		}
		const cookies = session.events.find((event) => event.type === "cookies");
		if (cookies) {
			if (!session.exchanging) session.exchanging = (async () => {
				const bag = cookies.payload && cookies.payload.cookies || {};
				const valueOf = (name) => {
					const entry = bag[name];
					if (entry && typeof entry === "object") return String(entry.value ?? "");
					return typeof entry === "string" ? entry : "";
				};
				const musicid = valueOf("qqmusic_uin");
				const token = valueOf("qqmusic_key");
				noteQrLoginStep("app:qr:check:cookies", {
					hasMusicId: Boolean(musicid),
					hasToken: Boolean(token),
					loginType: valueOf("tmeLoginType") || "unknown"
				});
				if (!musicid || !token) throw new Error("QQ app QR: MQTT cookies missing credential");
				const credential = await resolveCredential(session.qrcodeId, musicid, token);
				const sessionData = await applySession(buildCookie(credential));
				noteQrLoginStep("app:qr:done:ok", { loginType: credential.loginType });
				const result = {
					isOk: true,
					loggedIn: true,
					code: 0,
					status: "ok",
					message: "登录成功",
					provider: "qq",
					session: sessionData,
					userId: credential.accountId,
					uin: credential.accountId,
					hasCookie: true
				};
				session.result = result;
				release(session);
				return result;
			})().catch((error) => {
				noteQrLoginStep("app:qr:exchange:failed", { message: error?.message || String(error) });
				release(session);
				const result = {
					isOk: false,
					code: 0,
					provider: "qq",
					status: "error",
					retryable: false,
					message: error?.message || "登录失败"
				};
				session.result = result;
				return result;
			});
			return session.exchanging;
		}
		if (session.events.some((event) => event.type === "scanned")) return {
			isOk: false,
			code: 67,
			refresh: false,
			provider: "qq",
			status: "scanned",
			message: "已扫码，请在手机上确认"
		};
		return waiting();
	}
	/** 关掉这次登录：二维码取消、关窗口都走这里，连接立刻释放。 */
	function qqAppCancelLoginQr(qrcodeId) {
		const key = sessionKey(String(qrcodeId || ""));
		const session = sessions.get(key);
		if (session) forget(session);
	}
	//#endregion
	//#region src/webBridge/api/kugou/playlists.js
	/** 网关地址；上游的默认 baseURL，cloudlist 的路由另外拼。 */
	const KG_GATEWAY = "https://gateway.kugou.com";
	/** 未登录时的回答：读取那几条的写法，前端据此去登录。 */
	const kgLoggedOut = (where) => ({
		status: 0,
		error_code: 401,
		data: {},
		message: `KuGou ${where}: login required`
	});
	const credentialsOf = (cookieHeader, params) => {
		const userId = String(kgCookieUserId(cookieHeader) || params.userid || "").trim();
		const token = String(kgCookieToken(cookieHeader) || params.token || "").trim();
		return userId && token ? {
			userId,
			token
		} : null;
	};
	/**
	* 收藏歌单是 type 1，收藏专辑是 source 2，建自己的歌单是 type 0。
	* 上游在 type 为 0 时还多带一组 query（last_time / last_area / userid / token）。
	*/
	async function handlePlaylistAdd(params, cookieHeader) {
		const credentials = credentialsOf(cookieHeader, params);
		if (!credentials) return kgLoggedOut("playlist-add");
		const { userId, token } = credentials;
		const type = Number(params.type) || 0;
		const source = params.source === 0 ? 0 : Number(params.source) || 1;
		const clienttime = Math.floor(Date.now() / 1e3);
		const body = {
			userid: Number(userId) || userId,
			token,
			total_ver: 0,
			name: String(params.name || ""),
			type,
			source,
			is_pri: type === 0 ? Number(params.is_pri) || 0 : 0,
			list_create_userid: String(params.list_create_userid || ""),
			list_create_listid: String(params.list_create_listid || ""),
			list_create_gid: String(params.list_create_gid || ""),
			from_shupinmv: 0
		};
		const answer = await kgPostAndroidSigned(KG_CLOUDLIST_GATEWAY, "/v5/add_list", cookieHeader, body, type === 0 ? {
			last_time: clienttime,
			last_area: "gztx",
			userid: userId,
			token
		} : {});
		noteLibraryStep("kugou", "playlist:add", {
			type,
			source,
			status: answer && answer.status,
			errorCode: answer && answer.error_code
		});
		return answer || kgLoggedOut("playlist-add");
	}
	/** `data` 是 `名称|hash|专辑id|mixsongid`，多首用逗号分隔；最少要有名称和 hash。 */
	const trackResources = (raw) => String(raw || "").split(",").filter(Boolean).map((entry) => {
		const parts = String(entry).split("|");
		return {
			number: 1,
			name: parts[0] || "",
			hash: parts[1] || "",
			size: 0,
			sort: 0,
			timelen: 0,
			bitrate: 0,
			album_id: Number(parts[2] || 0),
			mixsongid: Number(parts[3] || 0)
		};
	});
	async function handlePlaylistTracksAdd(params, cookieHeader) {
		const credentials = credentialsOf(cookieHeader, params);
		if (!credentials) return kgLoggedOut("playlist-tracks-add");
		const { userId, token } = credentials;
		const clienttime = Math.floor(Date.now() / 1e3);
		const answer = await kgPostAndroidSigned(KG_CLOUDLIST_GATEWAY, "/v6/add_song", cookieHeader, {
			userid: Number(userId) || userId,
			token,
			listid: String(params.listid || ""),
			list_ver: 0,
			type: 0,
			slow_upload: 1,
			scene: "false;null",
			data: trackResources(params.data)
		}, {
			last_time: clienttime,
			last_area: "gztx",
			userid: userId,
			token
		});
		noteLibraryStep("kugou", "playlist:tracks-add", {
			count: trackResources(params.data).length,
			status: answer && answer.status,
			errorCode: answer && answer.error_code
		});
		return answer || kgLoggedOut("playlist-tracks-add");
	}
	async function handlePlaylistTracksDel(params, cookieHeader) {
		const credentials = credentialsOf(cookieHeader, params);
		if (!credentials) return kgLoggedOut("playlist-tracks-del");
		const { userId, token } = credentials;
		const fileIds = String(params.fileids || "").split(",").filter(Boolean).map((id) => ({ fileid: Number(id) }));
		if (!fileIds.length) return {
			status: 1,
			error_code: 0,
			data: {}
		};
		const answer = await kgPostAndroidSigned(KG_GATEWAY, "/v4/delete_songs", cookieHeader, {
			listid: String(params.listid || ""),
			userid: Number(userId) || userId,
			data: fileIds,
			type: 0,
			token,
			list_ver: 0
		}, {}, KG_CLOUDLIST_ROUTER);
		noteLibraryStep("kugou", "playlist:tracks-del", {
			count: fileIds.length,
			status: answer && answer.status,
			errorCode: answer && answer.error_code
		});
		return answer || kgLoggedOut("playlist-tracks-del");
	}
	/** 概念版（lite）的公钥，1024 位；指数固定 65537。 */
	const RSA_MODULUS = BigInt("0xc40a2d0da76511f3bb1cc2bbd3afbd8bea83b4d6b05b6c13eb8920c53f1af7679b32ba0d0edb843240ef1b836efed3ee240734c14c1399fd6594d16af22f52525d14d72e0155c6dcc8638d4f7bb94f3a0b1f4c29f991972f2a160a25eb0a9e724336be7f69bbd319ffab1c6dd8470b021dc434f3faba89f4a2a01b33bdbdd08b");
	const RSA_EXPONENT = 65537n;
	/** 1024 位公钥的字节长度。 */
	const RSA_SIZE = 128;
	const modPow = (base, exponent, modulus) => {
		let result = 1n;
		let value = base % modulus;
		let power = exponent;
		while (power > 0n) {
			if (power % 2n === 1n) result = result * value % modulus;
			value = value * value % modulus;
			power /= 2n;
		}
		return result;
	};
	/** PKCS#1 v1.5 的加密块：0x00 0x02 || 非零随机填充 || 0x00 || 明文。 */
	const pkcs1Pad = (bytes) => {
		const block = new Uint8Array(RSA_SIZE);
		block[0] = 0;
		block[1] = 2;
		const filler = new Uint8Array(125 - bytes.length);
		crypto.getRandomValues(filler);
		for (let index = 0; index < filler.length; index += 1) block[2 + index] = filler[index] || 1;
		block[RSA_SIZE - bytes.length - 1] = 0;
		block.set(bytes, RSA_SIZE - bytes.length);
		return block;
	};
	const rsaEncryptPkcs1 = (text) => {
		const bytes = new TextEncoder().encode(text);
		if (bytes.length > 117) throw new Error("too long");
		let value = 0n;
		for (const byte of pkcs1Pad(bytes)) value = value << 8n | BigInt(byte);
		return modPow(value, RSA_EXPONENT, RSA_MODULUS).toString(16).padStart(256, "0").toUpperCase();
	};
	/** 上游的 key 从同一个 36 字符的字表里随机取 6 位。 */
	const KEY_CHARS = "1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const randomKey = () => {
		const bytes = /* @__PURE__ */ new Uint8Array(6);
		crypto.getRandomValues(bytes);
		return Array.from(bytes, (byte) => KEY_CHARS[byte % 36]).join("").toLowerCase();
	};
	/** 钥匙 md5 的前 16 位是 AES 的 key，后 16 位是 iv。 */
	const aesParts = (key) => {
		const digest = crypto_es_default.MD5(key).toString();
		return {
			cipherKey: digest.substring(0, 16),
			iv: digest.substring(16, 32)
		};
	};
	const aesEncrypt = (data) => {
		const key = randomKey();
		const { cipherKey, iv } = aesParts(key);
		const encrypted = crypto_es_default.AES.encrypt(crypto_es_default.enc.Utf8.parse(typeof data === "object" ? JSON.stringify(data) : String(data)), crypto_es_default.enc.Utf8.parse(cipherKey), {
			iv: crypto_es_default.enc.Utf8.parse(iv),
			mode: crypto_es_default.mode.CBC,
			padding: crypto_es_default.pad.Pkcs7
		});
		return {
			key,
			str: crypto_es_default.enc.Base64.stringify(encrypted.ciphertext)
		};
	};
	const aesDecrypt = (key, str) => {
		const { cipherKey, iv } = aesParts(key);
		const text = crypto_es_default.AES.decrypt(crypto_es_default.lib.CipherParams.create({ ciphertext: crypto_es_default.enc.Base64.parse(str) }), crypto_es_default.enc.Utf8.parse(cipherKey), {
			iv: crypto_es_default.enc.Utf8.parse(iv),
			mode: crypto_es_default.mode.CBC,
			padding: crypto_es_default.pad.Pkcs7
		}).toString(crypto_es_default.enc.Utf8);
		try {
			return JSON.parse(text);
		} catch (_) {
			return null;
		}
	};
	/** 上游的 signParamsKey：md5(appid + 盐 + clientver + data)。 */
	const signParamsKey = (data) => crypto_es_default.MD5(`${KG_ANDROID_APPID}${KG_ANDROID_SIGN_SALT}${KG_ANDROID_CLIENTVER}${data}`).toString();
	/**
	* 取消收藏歌单 / 取消收藏专辑。
	*
	* 回包是密文，本地桥这一侧只能拿到文本；解不开就按「已经删了」回成功 ——
	* 换成报错的话，界面会显示取消失败而服务端其实已经取消，那才是真的错。
	* 解不开会在诊断里留下 playlist:del:unverified，看日志能认出来。
	*/
	async function handlePlaylistDel(params, cookieHeader) {
		const credentials = credentialsOf(cookieHeader, params);
		if (!credentials) return kgLoggedOut("playlist-del");
		const { userId, token } = credentials;
		const listId = Number(params.listid);
		if (!Number.isSafeInteger(listId) || listId <= 0) return {
			status: 0,
			error_code: 400,
			data: {},
			message: "KuGou playlist-del: bad listid"
		};
		const clienttime = Math.floor(Date.now() / 1e3);
		const aes = aesEncrypt({
			listid: listId,
			total_ver: 0,
			type: 1
		});
		let p;
		try {
			p = rsaEncryptPkcs1(JSON.stringify({
				aes: aes.key,
				uid: Number(userId) || userId,
				token
			}));
		} catch (error) {
			noteLibraryStep("kugou", "playlist:del:rsa-failed", { message: String(error && error.message) });
			return kgLoggedOut("playlist-del");
		}
		const raw = await kgPostAndroidSigned(KG_GATEWAY, "/v2/delete_list", cookieHeader, aes.str, {
			clienttime,
			key: signParamsKey(String(clienttime)),
			last_area: "gztx",
			clientver: KG_ANDROID_CLIENTVER,
			appid: KG_ANDROID_APPID,
			last_time: clienttime,
			p
		}, KG_CLOUDLIST_ROUTER, {
			rawBody: true,
			rawText: true
		});
		const answer = typeof raw === "string" && raw.trim() ? aesDecrypt(aes.key, raw.trim()) : null;
		if (!answer) {
			noteLibraryStep("kugou", "playlist:del:unverified", { length: String(raw || "").length });
			return {
				status: 1,
				error_code: 0,
				data: {}
			};
		}
		noteLibraryStep("kugou", "playlist:del", {
			status: answer.status,
			errorCode: answer.error_code
		});
		return answer;
	}
	//#endregion
	//#region src/webBridge/api/kugou.js
	const KG_UA_MOBILE = "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Mobile Safari/537.36";
	const KG_UA_PC = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
	const KG_DEMO_UA = "Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36 KGMusic/9.3.0";
	const KG_ANDROID_UA = "Android15-1070-11083-46-0-DiscoveryDRADProtocol-wifi";
	const KG_LITE_APPID = 3116;
	const KG_LITE_CLIENTVER = 11440;
	const KG_ANDROID_APPID = KG_LITE_APPID;
	const KG_ANDROID_CLIENTVER = KG_LITE_CLIENTVER;
	const KG_PLATFORM = "lite";
	const KG_PLATFORM_MIGRATION_KEY = "kgPlatformMigration";
	const KG_PLATFORM_MIGRATION_VERSION = "lite-v1";
	const KG_DEVICE_STORAGE_KEY = "kgLiteDevice";
	const KG_LOGIN_STORAGE_KEY = "kgLoginPersist";
	function buildKuGooCookieValue(patch) {
		const userId = String(patch.KugooID || patch.userid || "").trim();
		const token = String(patch.token || patch.t || "").trim();
		if (!userId || !token) return "";
		const parts = [`KugooID=${userId}`, `t=${token}`];
		if (patch.NickName) parts.push(`NickName=${patch.NickName}`);
		if (patch.pic) parts.push(`Pic=${patch.pic}`);
		if (patch.vip_type) parts.push(`vip_type=${patch.vip_type}`);
		if (patch.vip_token) parts.push(`vip_token=${patch.vip_token}`);
		return parts.join("&");
	}
	async function saveKGLoginPersist(patch) {
		const userId = String(patch.userid || patch.KugooID || "").trim();
		const token = String(patch.token || patch.t || "").trim();
		if (!userId || !token) return;
		const kuGoo = buildKuGooCookieValue(patch);
		const payload = {
			userid: userId,
			KugooID: userId,
			token,
			t: token,
			savedAt: Date.now()
		};
		if (patch.NickName) payload.NickName = patch.NickName;
		if (patch.pic) payload.pic = patch.pic;
		if (patch.vip_type) payload.vip_type = String(patch.vip_type);
		if (patch.vip_token) payload.vip_token = String(patch.vip_token);
		if (patch.t1) payload.t1 = String(patch.t1);
		if (patch.KUGOU_API_PLATFORM) payload.KUGOU_API_PLATFORM = String(patch.KUGOU_API_PLATFORM);
		if (patch.KUGOU_API_GUID) payload.KUGOU_API_GUID = String(patch.KUGOU_API_GUID);
		if (patch.KUGOU_API_MID) payload.KUGOU_API_MID = String(patch.KUGOU_API_MID);
		if (patch.KUGOU_API_DEV) payload.KUGOU_API_DEV = String(patch.KUGOU_API_DEV);
		if (patch.KUGOU_API_MAC) payload.KUGOU_API_MAC = String(patch.KUGOU_API_MAC);
		if (patch.KUGOU_API_WEBGL) payload.KUGOU_API_WEBGL = String(patch.KUGOU_API_WEBGL);
		if (kuGoo) payload.KuGoo = kuGoo;
		try {
			await chrome.storage.local.set({ [KG_LOGIN_STORAGE_KEY]: payload });
		} catch (_) {}
	}
	async function restoreKGLoginPersistIfNeeded() {
		let header = "";
		try {
			header = await getKGCookie();
		} catch (_) {}
		if (kgCookieUserId(header) && kgCookieToken(header)) return false;
		let stored = null;
		try {
			const hit = await chrome.storage.local.get([KG_LOGIN_STORAGE_KEY]);
			stored = hit && hit[KG_LOGIN_STORAGE_KEY];
		} catch (_) {}
		const userId = String(stored && (stored.userid || stored.KugooID) || "").trim();
		const token = String(stored && (stored.token || stored.t) || "").trim();
		if (!userId || !token) return false;
		const cookiePatch = {
			...buildKGDeviceCookiePatch(await getKGDeviceIdentity()),
			userid: userId,
			KugooID: userId,
			token,
			t: token
		};
		if (stored.NickName) cookiePatch.NickName = stored.NickName;
		if (stored.pic) cookiePatch.pic = stored.pic;
		if (stored.vip_type) cookiePatch.vip_type = String(stored.vip_type);
		if (stored.vip_token) cookiePatch.vip_token = String(stored.vip_token);
		if (stored.t1) cookiePatch.t1 = String(stored.t1);
		if (stored.KUGOU_API_PLATFORM) cookiePatch.KUGOU_API_PLATFORM = String(stored.KUGOU_API_PLATFORM);
		if (stored.KUGOU_API_GUID) cookiePatch.KUGOU_API_GUID = String(stored.KUGOU_API_GUID);
		if (stored.KUGOU_API_MID) cookiePatch.KUGOU_API_MID = String(stored.KUGOU_API_MID);
		if (stored.KUGOU_API_DEV) cookiePatch.KUGOU_API_DEV = String(stored.KUGOU_API_DEV);
		if (stored.KUGOU_API_MAC) cookiePatch.KUGOU_API_MAC = String(stored.KUGOU_API_MAC);
		if (stored.KUGOU_API_WEBGL) cookiePatch.KUGOU_API_WEBGL = String(stored.KUGOU_API_WEBGL);
		const kuGoo = stored.KuGoo || buildKuGooCookieValue(cookiePatch);
		if (kuGoo) cookiePatch.KuGoo = kuGoo;
		try {
			await setBrowserCookies("https://www.kugou.com/", cookiePatch);
			await setBrowserCookies("https://m.kugou.com/", cookiePatch);
		} catch (_) {
			return false;
		}
		clearCookieCache();
		return true;
	}
	async function ensureKGCookie() {
		clearCookieCache();
		let header = await getKGCookie();
		if (kgCookieUserId(header) && kgCookieToken(header)) return header;
		if (!await restoreKGLoginPersistIfNeeded()) return header;
		clearCookieCache();
		return getKGCookie();
	}
	async function persistKGLoginCookies(patch) {
		const kuGoo = buildKuGooCookieValue(patch);
		const cookiePatch = Object.assign({}, buildKGDeviceCookiePatch(await getKGDeviceIdentity()), patch || {});
		if (kuGoo && !cookiePatch.KuGoo) cookiePatch.KuGoo = kuGoo;
		try {
			await setBrowserCookies("https://www.kugou.com/", cookiePatch);
			await setBrowserCookies("https://m.kugou.com/", cookiePatch);
		} catch (_) {}
		await saveProviderCookie("kg", cookiePatch);
		await saveKGLoginPersist(cookiePatch);
	}
	/** Official KuGouMusicApi song_url hardcoded clientver for /v5/url */
	const KG_TRACKER_CLIENTVER = 11430;
	const KG_SONG_PAGE_ID = 967177915;
	const KG_SONG_PPID = "356753938,823673182,967485191";
	const KG_SONG_PID = 411;
	const KG_WEB_CLIENTVER = KG_ANDROID_CLIENTVER;
	const KG_SRCAPPID = 2919;
	const KG_QR_KEY_APPID = 1001;
	const KG_ANDROID_SIGN_SALT = "LnT6xpN3khm36zse0QzvmgTZ3waWdRSA";
	const KG_CLOUDLIST_GATEWAY = "https://gateway.kugou.com/cloudlist.service";
	const KG_CLOUDLIST_ROUTER = { "x-router": "cloudlist.service.kugou.com" };
	const KG_PRODUCT_VIP_TYPE = {
		tvip: 6,
		vip: 6,
		svip: 33,
		qvip: 6,
		dvip: 6,
		mvip: 3
	};
	const KG_TRACKER_SECRET = "185672dd44712f60bb1736df5a377e82";
	const KG_TRACKER_HOSTS = [
		"https://trackercdn.kugou.com",
		"https://trackercdnbj.kugou.com",
		"http://trackercdn.kugou.com",
		"http://trackercdnbj.kugou.com"
	];
	const KG_TRACKER_FAST_HOSTS = ["https://trackercdn.kugou.com", "https://trackercdnbj.kugou.com"];
	const KG_SESSION_CACHE_TTL_MS = 3e5;
	const KG_PLAY_URL_CACHE_TTL_MS = 24e4;
	const KG_VIP_STORAGE_TTL_MS = 216e5;
	const KG_AUTH_REFRESH_TTL_MS = 3e6;
	const KG_VIP_TOKEN_REFRESH_INTERVAL_MS = 3e5;
	let kgVipTokenRefreshAt = 0;
	const KG_AUTH_REFRESH_BASE_DEADLINE_MS = 8e3;
	const KG_LOGIN_AES_KEY = "c24f74ca2820225badc01946dba4fdf7";
	const KG_LOGIN_AES_IV = "adc01946dba4fdf7";
	const KG_LITE_T2_KEY = "fd14b35e3f81af3817a20ae7adae7020";
	const KG_LITE_T2_IV = "17a20ae7adae7020";
	const KG_LITE_T1_KEY = "5e4ef500e9597fe004bd09a46d8add98";
	const KG_LITE_T1_IV = "04bd09a46d8add98";
	const KG_RSA_MODULUS = BigInt("0xc40a2d0da76511f3bb1cc2bbd3afbd8bea83b4d6b05b6c13eb8920c53f1af7679b32ba0d0edb843240ef1b836efed3ee240734c14c1399fd6594d16af22f52525d14d72e0155c6dcc8638d4f7bb94f3a0b1f4c29f991972f2a160a25eb0a9e724336be7f69bbd319ffab1c6dd8470b021dc434f3faba89f4a2a01b33bdbdd08b");
	const KG_RSA_EXP = BigInt(65537);
	const KG_RSA_KEY_BYTES = 128;
	let kgMidCache = "";
	let kgDeviceCache = null;
	let kgPlatformMigrationPromise = null;
	let kgSessionCache = {
		key: "",
		at: 0,
		session: null
	};
	let kgVipSessionCache = {
		userId: "",
		vipType: 0,
		vipToken: "",
		vipLabel: "",
		expireTime: "",
		isVip: false,
		appToken: "",
		sourceToken: "",
		authAt: 0,
		at: 0
	};
	let kgAuthRefreshPromise = null;
	const kgPlayUrlCache = /* @__PURE__ */ new Map();
	function md5$1(text) {
		return crypto_es_default.MD5(String(text || "")).toString();
	}
	function kgRandomString(len) {
		const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
		let out = "";
		for (let i = 0; i < (len || 16); i++) out += alphabet[Math.floor(Math.random() * 36)];
		return out;
	}
	function kgRandomHex(len) {
		const alphabet = "0123456789ABCDEF";
		let out = "";
		for (let i = 0; i < (len || 16); i++) out += alphabet[Math.floor(Math.random() * 16)];
		return out;
	}
	function buildKGLiteDeviceIdentity() {
		const guid = (() => {
			try {
				if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replace(/-/g, "").toUpperCase();
			} catch (_) {}
			return `${kgRandomHex(8)}-${kgRandomHex(4)}-4${kgRandomHex(3)}-${kgRandomHex(4)}-${kgRandomHex(12)}`.replace(/-/g, "");
		})();
		const mid = BigInt(`0x${md5$1(guid)}`).toString(10);
		const mac = Array.from({ length: 6 }, () => kgRandomHex(2)).join(":");
		return {
			platform: KG_PLATFORM,
			guid,
			mid,
			dev: kgRandomHex(10),
			mac,
			webgl: BigInt(`0x${kgRandomHex(16)}`).toString(10)
		};
	}
	async function loadKGDeviceIdentity() {
		if (kgDeviceCache) return kgDeviceCache;
		try {
			const stored = await chrome.storage.local.get([KG_DEVICE_STORAGE_KEY]);
			const candidate = stored && stored[KG_DEVICE_STORAGE_KEY];
			if (candidate && candidate.guid && candidate.mid && candidate.dev && candidate.mac && candidate.webgl) {
				kgDeviceCache = {
					...candidate,
					platform: KG_PLATFORM
				};
				return kgDeviceCache;
			}
		} catch (_) {}
		kgDeviceCache = buildKGLiteDeviceIdentity();
		try {
			await chrome.storage.local.set({ [KG_DEVICE_STORAGE_KEY]: kgDeviceCache });
		} catch (_) {}
		return kgDeviceCache;
	}
	async function getKGDeviceIdentity(cookieHeader) {
		await ensureKGLitePlatformMigration();
		const device = await loadKGDeviceIdentity();
		const parsed = parseCookieString(cookieHeader || "");
		return {
			platform: KG_PLATFORM,
			guid: String(parsed.KUGOU_API_GUID || device.guid),
			mid: String(parsed.KUGOU_API_MID || device.mid),
			dev: String(parsed.KUGOU_API_DEV || device.dev),
			mac: String(parsed.KUGOU_API_MAC || device.mac),
			webgl: String(parsed.KUGOU_API_WEBGL || device.webgl)
		};
	}
	function buildKGDeviceCookiePatch(device) {
		return {
			KUGOU_API_PLATFORM: device.platform,
			KUGOU_API_GUID: device.guid,
			KUGOU_API_MID: device.mid,
			KUGOU_API_DEV: device.dev,
			KUGOU_API_MAC: device.mac,
			KUGOU_API_WEBGL: device.webgl
		};
	}
	const KG_COOKIE_URLS = [
		"https://www.kugou.com/",
		"https://m.kugou.com/",
		"https://kugou.com/"
	];
	const KG_LEGACY_COOKIE_KEYS = [
		"userid",
		"token",
		"KugooID",
		"KuGoo",
		"Kugoo",
		"NickName",
		"nickname",
		"dfid",
		"DFID",
		"KToken",
		"t",
		"t1",
		"KugooPwd",
		"vip_type",
		"vip_token",
		"VIPType",
		"VipType",
		"musicvip",
		"MusicPack",
		"musicpack",
		"is_vip",
		"IsVIP",
		"isVIP",
		"su_vip",
		"m_type",
		"y_type",
		"music_vip",
		"VipLevel",
		"vip_level",
		"vip_endtime",
		"vip_end_time",
		"su_vip_end_time",
		"m_end_time"
	];
	async function clearLegacyKugouPlatformSession() {
		try {
			await Promise.all(KG_COOKIE_URLS.flatMap((url) => KG_LEGACY_COOKIE_KEYS.map((name) => chrome.cookies.remove({
				url,
				name
			}).catch(() => null))));
		} catch (_) {}
		try {
			await chrome.storage.local.remove([
				KG_LOGIN_STORAGE_KEY,
				KG_DEVICE_STORAGE_KEY,
				"kgMid",
				"kgVipSession",
				"foliaBridgeKgCookie"
			]);
		} catch (_) {}
		try {
			[
				"online_provider:kugou:cookie",
				"online_provider:kugou:token",
				"online_provider:kugou:userid",
				"online_provider:kugou:dfid",
				"online_provider:kugou:vip_token",
				"online_provider:kugou:vip_type"
			].forEach((key) => localStorage.removeItem(key));
		} catch (_) {}
		clearCookieCache();
		kgMidCache = "";
		kgDeviceCache = null;
		kgSessionCache = {
			key: "",
			at: 0,
			session: null
		};
		kgVipSessionCache = {
			userId: "",
			vipType: 0,
			vipToken: "",
			vipLabel: "",
			expireTime: "",
			isVip: false,
			appToken: "",
			sourceToken: "",
			authAt: 0,
			at: 0
		};
		kgAuthRefreshPromise = null;
		kgVipTokenRefreshAt = 0;
		kgPlayUrlCache.clear();
	}
	async function ensureKGLitePlatformMigration() {
		if (kgPlatformMigrationPromise) return kgPlatformMigrationPromise;
		kgPlatformMigrationPromise = (async () => {
			try {
				const stored = await chrome.storage.local.get([KG_PLATFORM_MIGRATION_KEY]);
				if (stored && stored[KG_PLATFORM_MIGRATION_KEY] === KG_PLATFORM_MIGRATION_VERSION) return;
			} catch (_) {
				try {
					if (localStorage.getItem(KG_PLATFORM_MIGRATION_KEY) === KG_PLATFORM_MIGRATION_VERSION) return;
				} catch (_) {}
			}
			noteLibraryStep("kugou", "platform:migration:start", {
				from: "legacy",
				to: KG_PLATFORM
			});
			await clearLegacyKugouPlatformSession();
			try {
				await chrome.storage.local.set({ [KG_PLATFORM_MIGRATION_KEY]: KG_PLATFORM_MIGRATION_VERSION });
			} catch (_) {
				try {
					localStorage.setItem(KG_PLATFORM_MIGRATION_KEY, KG_PLATFORM_MIGRATION_VERSION);
				} catch (_) {}
			}
			noteLibraryStep("kugou", "platform:migration:done", { platform: KG_PLATFORM });
		})().finally(() => {
			kgPlatformMigrationPromise = null;
		});
		return kgPlatformMigrationPromise;
	}
	async function getKGCookie() {
		await ensureKGLitePlatformMigration();
		return getKGCookie$1();
	}
	function kgModPow(base, exp, mod) {
		let result = BigInt(1);
		let b = base % mod;
		let e = exp;
		while (e > BigInt(0)) {
			if (e % BigInt(2) === BigInt(1)) result = result * b % mod;
			b = b * b % mod;
			e /= BigInt(2);
		}
		return result;
	}
	function kgAesEncryptHex(data, key, iv) {
		const text = typeof data === "object" ? JSON.stringify(data) : String(data || "");
		const encrypted = crypto_es_default.AES.encrypt(crypto_es_default.enc.Utf8.parse(text), crypto_es_default.enc.Utf8.parse(key), {
			iv: crypto_es_default.enc.Utf8.parse(iv),
			mode: crypto_es_default.mode.CBC,
			padding: crypto_es_default.pad.Pkcs7
		});
		return crypto_es_default.enc.Hex.stringify(encrypted.ciphertext);
	}
	function kgAesEncryptParams(data) {
		const tempKey = kgRandomString(16);
		const key = md5$1(tempKey).substring(0, 32);
		const iv = key.substring(16);
		return {
			str: kgAesEncryptHex(data == null ? {} : data, key, iv),
			key: tempKey
		};
	}
	function kgAesDecryptParams(hex, tempKey) {
		const key = md5$1(String(tempKey || "")).substring(0, 32);
		const iv = key.substring(16);
		const cipherParams = crypto_es_default.lib.CipherParams.create({ ciphertext: crypto_es_default.enc.Hex.parse(String(hex || "")) });
		const text = crypto_es_default.AES.decrypt(cipherParams, crypto_es_default.enc.Utf8.parse(key), {
			iv: crypto_es_default.enc.Utf8.parse(iv),
			mode: crypto_es_default.mode.CBC,
			padding: crypto_es_default.pad.Pkcs7
		}).toString(crypto_es_default.enc.Utf8);
		try {
			return JSON.parse(text);
		} catch (_) {
			return text;
		}
	}
	function kgRsaEncryptRaw(data) {
		const text = typeof data === "object" ? JSON.stringify(data) : String(data || "");
		const bytes = new TextEncoder().encode(text);
		if (bytes.length > KG_RSA_KEY_BYTES) throw new Error("KG_RSA_OVERFLOW");
		const padded = new Uint8Array(KG_RSA_KEY_BYTES);
		padded.set(bytes);
		let x = BigInt(0);
		for (let i = 0; i < padded.length; i++) x = (x << BigInt(8)) + BigInt(padded[i]);
		return kgModPow(x, KG_RSA_EXP, KG_RSA_MODULUS).toString(16).padStart(256, "0");
	}
	function buildKGAuthHeaders(token) {
		token = String(token || "").trim();
		if (!token) return {};
		return { Authorization: `KugooToken ${token}` };
	}
	async function loadKGVipSessionCache(userId) {
		userId = String(userId || "").trim();
		if (!userId) return null;
		if (kgVipSessionCache.userId === userId && Date.now() - kgVipSessionCache.at < KG_VIP_STORAGE_TTL_MS) return kgVipSessionCache;
		try {
			const stored = await chrome.storage.local.get(["kgVipSession"]);
			const data = stored && stored.kgVipSession;
			if (data && String(data.userId || "") === userId && Date.now() - Number(data.at || 0) < KG_VIP_STORAGE_TTL_MS) {
				kgVipSessionCache = {
					userId,
					vipType: Number(data.vipType) || 0,
					vipToken: String(data.vipToken || ""),
					vipLabel: String(data.vipLabel || ""),
					expireTime: String(data.expireTime || ""),
					appToken: String(data.appToken || ""),
					sourceToken: String(data.sourceToken || ""),
					authAt: Number(data.authAt) || 0,
					isVip: !!data.isVip,
					at: Number(data.at) || Date.now()
				};
				return kgVipSessionCache;
			}
		} catch (_) {}
		return null;
	}
	async function clearKGVipAppToken(userId) {
		userId = String(userId || "").trim();
		if (!userId) return;
		const prev = await loadKGVipSessionCache(userId);
		if (!prev || !prev.appToken) return;
		const next = Object.assign({}, prev, {
			appToken: "",
			sourceToken: "",
			authAt: 0,
			at: Date.now()
		});
		kgVipSessionCache = next;
		try {
			await chrome.storage.local.set({ kgVipSession: next });
		} catch (_) {}
	}
	async function saveKGVipSessionCache(userId, patch) {
		userId = String(userId || "").trim();
		if (!userId || !patch) return;
		const prev = await loadKGVipSessionCache(userId) || {
			userId,
			vipType: 0,
			vipToken: "",
			vipLabel: "",
			expireTime: "",
			isVip: false,
			appToken: "",
			sourceToken: "",
			authAt: 0,
			at: 0
		};
		const next = {
			userId,
			vipType: Number(patch.vipType) || prev.vipType || 0,
			vipToken: String(patch.vipToken != null && patch.vipToken !== "" ? patch.vipToken : prev.vipToken || ""),
			vipLabel: String(patch.vipLabel || prev.vipLabel || ""),
			expireTime: String(patch.expireTime || prev.expireTime || ""),
			appToken: String(patch.appToken != null && patch.appToken !== "" ? patch.appToken : prev.appToken || ""),
			sourceToken: String(patch.sourceToken != null ? patch.sourceToken : prev.sourceToken || ""),
			authAt: Number(patch.authAt) || prev.authAt || 0,
			isVip: !!(patch.isVip || prev.isVip || Number(patch.vipType) > 0 || prev.vipToken || patch.vipToken),
			at: Date.now()
		};
		if (!next.isVip && next.vipToken) next.isVip = true;
		if (next.isVip && !next.vipType) next.vipType = 6;
		if (next.isVip && !next.vipLabel) next.vipLabel = "VIP";
		kgVipSessionCache = next;
		try {
			await chrome.storage.local.set({ kgVipSession: next });
		} catch (_) {}
		return next;
	}
	/** Drop cached android token when web cookie was re-login'd / changed. */
	async function syncKGVipCacheWithCookie(cookieHeader) {
		const userId = kgCookieUserId(cookieHeader);
		const cookieToken = kgCookieWebToken(cookieHeader) || kgCookieToken(cookieHeader);
		if (!userId || !cookieToken) return null;
		const cached = await loadKGVipSessionCache(userId);
		if (!cached) return null;
		if (cached.sourceToken && cached.sourceToken !== cookieToken && cached.appToken && cached.appToken !== cookieToken) {
			await clearKGVipAppToken(userId);
			return loadKGVipSessionCache(userId);
		}
		return cached;
	}
	function harvestKGVipToken(payload, depth) {
		if (!payload || depth > 4) return "";
		if (typeof payload === "string") return "";
		if (Array.isArray(payload)) {
			for (const item of payload) {
				const hit = harvestKGVipToken(item, (depth || 0) + 1);
				if (hit) return hit;
			}
			return "";
		}
		if (typeof payload !== "object") return "";
		const direct = String(payload.vip_token || payload.vipToken || payload.VipToken || payload.viptoken || payload.VIPToken || payload.vip_key || "").trim();
		if (direct) return direct;
		for (const key of [
			"data",
			"info",
			"user_vip",
			"userVip",
			"vip",
			"detail",
			"result"
		]) if (payload[key]) {
			const hit = harvestKGVipToken(payload[key], (depth || 0) + 1);
			if (hit) return hit;
		}
		return "";
	}
	async function enrichKGCookieHeader(cookieHeader, opts) {
		opts = opts || {};
		cookieHeader = String(cookieHeader || "");
		const userId = kgCookieUserId(cookieHeader);
		const fromCookieToken = kgCookieWebToken(cookieHeader) || kgCookieToken(cookieHeader);
		const fromCookieVipToken = kgCookieVipToken(cookieHeader);
		const fromCookieVipType = kgCookieVipType(cookieHeader);
		const cached = userId ? await syncKGVipCacheWithCookie(cookieHeader) : null;
		const appToken = cached && cached.appToken || "";
		const token = !!opts.preferAppToken && appToken ? appToken : fromCookieToken;
		const vipToken = fromCookieVipToken || cached && cached.vipToken || "";
		const vipType = fromCookieVipType || cached && cached.vipType || 0;
		const parts = [];
		const devicePatch = buildKGDeviceCookiePatch(await getKGDeviceIdentity(cookieHeader));
		Object.entries(devicePatch).forEach(([key, value]) => {
			if (!new RegExp(`(?:^|;)\\s*${key}=`, "i").test(cookieHeader)) parts.push(`${key}=${value}`);
		});
		if (userId && !/(?:^|;\s*)userid=/i.test(cookieHeader)) parts.push(`userid=${userId}`);
		if (userId && !/(?:^|;\s*)KugooID=/i.test(cookieHeader)) parts.push(`KugooID=${userId}`);
		if (token) {
			parts.push(`token=${token}`);
			parts.push(`t=${token}`);
		}
		if (vipToken) parts.push(`vip_token=${vipToken}`);
		if (vipType > 0) parts.push(`vip_type=${vipType}`);
		return parts.length ? `${cookieHeader}${cookieHeader ? "; " : ""}${parts.join("; ")}` : cookieHeader;
	}
	async function refreshKGLoginByToken(cookieHeader) {
		cookieHeader = String(cookieHeader || "");
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieWebToken(cookieHeader) || kgCookieToken(cookieHeader);
		if (!userId || !token) return null;
		const dateNow = Date.now();
		const clienttime = Math.floor(dateNow / 1e3);
		let encryptParams;
		let bodyData;
		try {
			encryptParams = kgAesEncryptParams({});
			const device = await getKGDeviceIdentity(cookieHeader);
			const cookie = parseCookieString(cookieHeader);
			const t2 = kgAesEncryptHex(`${device.guid}|0f607264fc6318a92b9e13c65db7cd3c|${device.mac}|${device.dev}|${dateNow}`, KG_LITE_T2_KEY, KG_LITE_T2_IV);
			const t1 = kgAesEncryptHex(`${cookie.t1 || ""}|${dateNow}`, KG_LITE_T1_KEY, KG_LITE_T1_IV);
			bodyData = {
				dfid: kgCookieDfid(cookieHeader) || "-",
				p3: kgAesEncryptHex({
					clienttime,
					token
				}, KG_LOGIN_AES_KEY, KG_LOGIN_AES_IV),
				plat: 1,
				t1,
				t2,
				t3: "MCwwLDAsMCwwLDAsMCwwLDA=",
				pk: kgRsaEncryptRaw({
					clienttime_ms: dateNow,
					key: encryptParams.key
				}),
				params: encryptParams.str,
				userid: userId,
				clienttime_ms: dateNow,
				dev: device.dev
			};
		} catch (_) {
			return null;
		}
		for (const entry of [{
			base: "https://gateway.kugou.com",
			headers: { "x-router": "login.user.kugou.com" }
		}, {
			base: "http://login.user.kugou.com",
			headers: {}
		}]) {
			const base = entry.base;
			const refreshStartedAt = Date.now();
			const refreshHost = (() => {
				try {
					return new URL(base).host;
				} catch (_) {
					return base;
				}
			})();
			noteLibraryStep("kugou", "auth:refresh:request", { host: refreshHost });
			try {
				const body = await Promise.race([kgPostAndroidSigned(base, "/v5/login_by_token", cookieHeader, bodyData, {}, entry.headers, { preferAppToken: false }), new Promise((resolve) => setTimeout(() => resolve(null), KG_AUTH_REFRESH_BASE_DEADLINE_MS))]);
				if (!body) {
					noteLibraryStep("kugou", "auth:refresh:timeout", {
						host: refreshHost,
						ms: Date.now() - refreshStartedAt
					});
					continue;
				}
				const bodyStatus = Number(body && body.status) || 0;
				noteLibraryStep("kugou", "auth:refresh:attempt", {
					host: refreshHost,
					ms: Date.now() - refreshStartedAt,
					status: bodyStatus,
					errCode: Number(body && (body.error_code || body.errcode)) || void 0
				});
				if (!body || bodyStatus !== 1) continue;
				let data = body.data || {};
				if (data.secu_params) {
					const decrypted = kgAesDecryptParams(data.secu_params, encryptParams.key);
					if (decrypted && typeof decrypted === "object") {
						data = Object.assign({}, data, decrypted);
						noteLibraryStep("kugou", "auth:refresh:secu", {
							kind: "object",
							keys: Object.keys(decrypted).slice(0, 16).join(",")
						});
					} else if (typeof decrypted === "string" && decrypted) {
						data.token = decrypted;
						noteLibraryStep("kugou", "auth:refresh:secu", { kind: "string" });
					} else noteLibraryStep("kugou", "auth:refresh:secu", { kind: "failed" });
				} else noteLibraryStep("kugou", "auth:refresh:secu", {
					kind: "absent",
					keys: Object.keys(data).slice(0, 16).join(",")
				});
				const nextToken = String(data.token || data.t || "").trim();
				const vipToken = String(data.vip_token || data.vipToken || "").trim();
				const vipType = Number(data.vip_type || data.vipType || 0) || 0;
				if (!nextToken && !vipToken) continue;
				try {
					const cookiePatch = {};
					if (data.t1) cookiePatch.t1 = String(data.t1);
					if (vipToken) cookiePatch.vip_token = vipToken;
					if (vipType) cookiePatch.vip_type = String(vipType);
					if (Object.keys(cookiePatch).length) await setBrowserCookies("https://www.kugou.com/", cookiePatch);
				} catch (_) {}
				await saveKGVipSessionCache(userId, {
					appToken: nextToken || "",
					sourceToken: token,
					vipToken,
					vipType: vipType || (vipToken ? 6 : 0),
					isVip: !!(vipType > 0 || vipToken || data.is_vip),
					vipLabel: vipType === 33 || vipType === 4 ? "超级VIP" : vipType || vipToken ? "VIP" : "",
					authAt: Date.now()
				});
				noteLibraryStep("kugou", "auth:refresh:ok", {
					host: refreshHost,
					hasVipToken: !!vipToken,
					vipType: vipType || (vipToken ? 6 : 0),
					dataKeys: Object.keys(data || {}).slice(0, 20).join(",")
				});
				return {
					token: nextToken || token,
					vipToken,
					vipType,
					userId: String(data.userid || userId),
					raw: data
				};
			} catch (error) {
				noteLibraryStep("kugou", "auth:refresh:error", {
					host: refreshHost,
					ms: Date.now() - refreshStartedAt,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}
		noteLibraryStep("kugou", "auth:refresh:fail");
		return null;
	}
	async function ensureKGAndroidAuth(cookieHeader, opts) {
		opts = opts || {};
		cookieHeader = String(cookieHeader || "");
		const userId = kgCookieUserId(cookieHeader);
		const cookieToken = kgCookieWebToken(cookieHeader) || kgCookieToken(cookieHeader);
		if (!userId || !cookieToken) return {
			cookieHeader,
			vipToken: "",
			token: "",
			refreshed: false,
			hasAppToken: false
		};
		await syncKGVipCacheWithCookie(cookieHeader);
		const cached = await loadKGVipSessionCache(userId);
		const vipToken = resolveKGEffectiveVipToken(cookieHeader, cached);
		const appToken = cached && cached.appToken || "";
		const sourceOk = !cached || !cached.sourceToken || cached.sourceToken === cookieToken;
		const authFresh = cached && cached.authAt && Date.now() - Number(cached.authAt) < KG_AUTH_REFRESH_TTL_MS;
		const preferApp = !!opts.requireAppToken || !!opts.preferAppToken;
		if (!opts.force && preferApp && appToken && sourceOk && (authFresh || !!vipToken)) return {
			cookieHeader: await enrichKGCookieHeader(cookieHeader, { preferAppToken: true }),
			vipToken,
			token: appToken,
			refreshed: false,
			hasAppToken: true
		};
		if (!opts.force && !preferApp) return {
			cookieHeader: await enrichKGCookieHeader(cookieHeader, { preferAppToken: false }),
			vipToken,
			token: cookieToken,
			refreshed: false,
			hasAppToken: !!appToken
		};
		if (!kgAuthRefreshPromise) kgAuthRefreshPromise = refreshKGLoginByToken(cookieHeader).finally(() => {
			kgAuthRefreshPromise = null;
		});
		const refreshed = await kgAuthRefreshPromise;
		const nextCached = await loadKGVipSessionCache(userId);
		const nextApp = nextCached && nextCached.appToken || "";
		const enriched = await enrichKGCookieHeader(cookieHeader, { preferAppToken: !!nextApp });
		return {
			cookieHeader: enriched,
			vipToken: resolveKGEffectiveVipToken(enriched, nextCached),
			token: nextApp || cookieToken,
			refreshed: !!refreshed,
			hasAppToken: !!nextApp,
			auth: refreshed
		};
	}
	function resolveKGEffectiveVipToken(cookieHeader, cached) {
		return kgCookieVipToken(cookieHeader) || cached && cached.vipToken || "";
	}
	function buildKGRequestHeaders(cookieHeader, token) {
		return Object.assign({ Cookie: cookieHeader || "" }, buildKGAuthHeaders(token || kgCookieToken(cookieHeader)));
	}
	function mapKGUserCenterVipType(vipTypeRaw) {
		const t = Number(vipTypeRaw) || 0;
		if (t === 4) return 33;
		if (t === 7) return 3;
		if (t === 2) return 6;
		return t;
	}
	function kgApiBodyOk(body) {
		if (!body || typeof body !== "object") return false;
		if (Number(body.status) === 1) return true;
		if (Number(body.error_code) === 0 && body.data) return true;
		if (Number(body.errcode) === 0 && body.data) return true;
		return !!(body.data && typeof body.data === "object" && (body.userid || body.data.userid || body.data.vip_type != null));
	}
	function parseKGUserCenterVipEnd(data) {
		const raw = data.vip_endtime || data.vip_end_time || data.su_vip_end_time || data.m_end_time || "";
		if (!raw) return {
			endMs: 0,
			hasEnd: false
		};
		const num = Number(raw);
		if (Number.isFinite(num) && num > 0) return {
			endMs: num > 1e11 ? num : num * 1e3,
			hasEnd: true
		};
		const endMs = Date.parse(String(raw).replace(/-/g, "/"));
		return {
			endMs: Number.isFinite(endMs) ? endMs : 0,
			hasEnd: Number.isFinite(endMs)
		};
	}
	function formatKGExpireTime(endMs) {
		if (!endMs || endMs <= 0) return "";
		return new Date(endMs).toISOString().slice(0, 19).replace("T", " ");
	}
	function parseKGUserCenterVip(data) {
		if (!data || typeof data !== "object") return {
			vipType: 0,
			isVip: false,
			vipLabel: "",
			expireTime: ""
		};
		const extracted = extractKGVipFromPayload(data);
		const meta = resolveKGVipMeta(data);
		let vipType = Number(extracted.vipType) || 0;
		let isVip = !!(extracted.isVip || meta.vipLabel);
		let vipLabel = meta.vipLabel || "";
		let expireTime = meta.expireTime || "";
		if (!isVip) {
			let vipTypeRaw = Number(data.vip_type || data.vipType || 0) || 0;
			if (!vipTypeRaw) {
				if (Number(data.su_vip) > 0) vipTypeRaw = 4;
				else if (Number(data.m_type) > 0) vipTypeRaw = 7;
				else if (Number(data.y_type) > 0 || Number(data.music_vip) > 0) vipTypeRaw = 2;
				else if (Number(data.is_vip) === 1 || Number(data.MusicPack) === 1) vipTypeRaw = 2;
			}
			const mapped = mapKGUserCenterVipType(vipTypeRaw);
			const { endMs, hasEnd } = parseKGUserCenterVipEnd(data);
			if (vipTypeRaw > 0 && (!hasEnd || endMs > Date.now())) {
				isVip = true;
				vipType = Math.max(vipType, mapped || 6);
				expireTime = expireTime || formatKGExpireTime(endMs);
				if (!vipLabel) {
					if (vipTypeRaw === 4) vipLabel = "超级VIP";
					else if (vipTypeRaw === 7) vipLabel = "音乐包";
					else if (vipTypeRaw === 2) vipLabel = "豪华VIP";
					else vipLabel = "VIP";
				}
			}
		}
		if (isVip && !vipType) vipType = 6;
		if (isVip && !vipLabel) vipLabel = "VIP";
		return {
			vipType,
			isVip,
			vipLabel,
			expireTime
		};
	}
	function parseKGUserCenterBody(body) {
		if (!kgApiBodyOk(body)) return null;
		const data = body.data || body;
		if (!data || typeof data !== "object") return null;
		return {
			...parseKGUserCenterVip(data),
			nickname: stripKGHighlightHtml(data.nickname || data.nick_name || data.username || ""),
			avatar: normalizeKGCover(data.pic || data.user_pic || data.avatar || "", 180),
			detail: data
		};
	}
	function signatureKGAndroidParams(params, data) {
		const paramsString = Object.keys(params).sort().map((key) => `${key}=${typeof params[key] === "object" ? JSON.stringify(params[key]) : params[key]}`).join("");
		return md5$1(`${KG_ANDROID_SIGN_SALT}${paramsString}${data || ""}${KG_ANDROID_SIGN_SALT}`);
	}
	const KG_WEB_SIGN_SALT = "NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt";
	function signatureKGWebParams(params) {
		const paramsString = Object.keys(params).map((key) => `${key}=${params[key]}`).sort().join("");
		return md5$1(`${KG_WEB_SIGN_SALT}${paramsString}${KG_WEB_SIGN_SALT}`);
	}
	/** Lean cookie for signed android APIs — avoid huge KuGoo blob breaking gateway requests. */
	function buildKGLeanCookie(cookieHeader) {
		const parsed = parseCookieString(cookieHeader);
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		const dfid = kgCookieDfid(cookieHeader) || "-";
		const vipToken = kgCookieVipToken(cookieHeader);
		const parts = [];
		if (userId) {
			parts.push(`userid=${userId}`);
			parts.push(`KugooID=${userId}`);
		}
		if (token) {
			parts.push(`token=${token}`);
			parts.push(`t=${token}`);
		}
		if (dfid && dfid !== "-") parts.push(`dfid=${dfid}`);
		if (vipToken) parts.push(`vip_token=${vipToken}`);
		if (parsed.t1) parts.push(`t1=${parsed.t1}`);
		[
			"KUGOU_API_PLATFORM",
			"KUGOU_API_GUID",
			"KUGOU_API_MID",
			"KUGOU_API_DEV",
			"KUGOU_API_MAC",
			"KUGOU_API_WEBGL"
		].forEach((key) => {
			if (parsed[key]) parts.push(`${key}=${parsed[key]}`);
		});
		return parts.join("; ");
	}
	async function kgFetchAndroidSigned(baseURL, urlPath, cookieHeader, extraParams, extraHeaders, opts) {
		opts = opts || {};
		extraParams = extraParams || {};
		extraHeaders = extraHeaders || {};
		cookieHeader = await enrichKGCookieHeader(cookieHeader, opts);
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		if (!userId || !token) return null;
		const mid = await getKGMid(cookieHeader);
		const dfid = kgCookieDfid(cookieHeader) || "-";
		const clienttime = Math.floor(Date.now() / 1e3);
		const leanCookie = buildKGLeanCookie(cookieHeader);
		const params = Object.assign({
			dfid,
			mid,
			uuid: "-",
			appid: KG_ANDROID_APPID,
			clientver: KG_ANDROID_CLIENTVER,
			clienttime,
			token,
			userid: userId
		}, extraParams);
		params.signature = signatureKGAndroidParams(params);
		const qs = Object.keys(params).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");
		return kgFetchJSON(`${String(baseURL || "").replace(/\/$/, "")}${urlPath.startsWith("/") ? urlPath : `/${urlPath}`}?${qs}`, {
			mobile: true,
			referer: "https://www.kugou.com/",
			headers: Object.assign({
				Cookie: leanCookie,
				"User-Agent": KG_ANDROID_UA,
				dfid: String(dfid),
				clienttime: String(clienttime),
				mid: String(mid),
				"kg-rc": "1",
				"kg-thash": "5d816a0",
				"kg-rec": "1",
				"kg-rf": "B9EDA08A64250DEFFBCADDEE00F8F25F"
			}, buildKGAuthHeaders(token), extraHeaders)
		});
	}
	async function kgPostAndroidSigned(baseURL, urlPath, cookieHeader, bodyData, extraParams, extraHeaders, opts) {
		opts = opts || {};
		extraParams = extraParams || {};
		extraHeaders = extraHeaders || {};
		cookieHeader = await enrichKGCookieHeader(cookieHeader, opts);
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		if (!userId || !token) return null;
		const mid = await getKGMid(cookieHeader);
		const dfid = kgCookieDfid(cookieHeader) || "-";
		const clienttime = Math.floor(Date.now() / 1e3);
		const leanCookie = buildKGLeanCookie(cookieHeader);
		const bodyJson = opts.rawBody ? String(bodyData === void 0 || bodyData === null ? "" : bodyData) : bodyData === void 0 ? "" : JSON.stringify(bodyData || {});
		const params = Object.assign({
			dfid,
			mid,
			uuid: "-",
			appid: KG_ANDROID_APPID,
			clientver: KG_ANDROID_CLIENTVER,
			clienttime,
			token,
			userid: userId
		}, extraParams);
		params.signature = signatureKGAndroidParams(params, bodyJson);
		const qs = Object.keys(params).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");
		const url = `${String(baseURL || "").replace(/\/$/, "")}${urlPath.startsWith("/") ? urlPath : `/${urlPath}`}?${qs}`;
		const init = {
			mobile: true,
			method: "POST",
			referer: "https://www.kugou.com/",
			headers: Object.assign({
				Cookie: leanCookie,
				"User-Agent": KG_ANDROID_UA,
				"Content-Type": "application/json",
				dfid: String(dfid),
				clienttime: String(clienttime),
				mid: String(mid),
				"kg-rc": "1",
				"kg-thash": "5d816a0",
				"kg-rec": "1",
				"kg-rf": "B9EDA08A64250DEFFBCADDEE00F8F25F"
			}, buildKGAuthHeaders(token), extraHeaders),
			body: bodyJson
		};
		return opts.rawText ? kgFetchText(url, init) : kgFetchJSON(url, init);
	}
	/**
	* KuGouMusicApi `/youth/union/vip`.
	*
	* This is the concept-client VIP probe used by the upstream PC build before it attempts the
	* daily listen-song reward. The response itself may report either an existing VIP or no VIP.
	*/
	async function getKGYouthUnionVip(cookieHeader) {
		cookieHeader = cookieHeader || await getKGCookie();
		noteLibraryStep("kugou", "youth:union:start");
		const body = await kgFetchAndroidSigned("https://kugouvip.kugou.com", "/v1/get_union_vip", cookieHeader, {
			appid: KG_LITE_APPID,
			clientver: KG_LITE_CLIENTVER,
			busi_type: "concept",
			opt_product_types: "dvip,qvip",
			product_type: "svip"
		}, {});
		noteLibraryStep("kugou", "youth:union:done", {
			status: body && body.status,
			errorCode: body && body.error_code
		});
		return body || {
			status: 0,
			error_code: 401,
			data: {}
		};
	}
	/**
	* KuGouMusicApi `/youth/day/vip`.
	*
	* Claims the one-day listen-song VIP reward. `receive_day` is the China-calendar date used by
	* the official client; the server rejects a second claim for the same day.
	*/
	async function claimKGYouthDayVip(cookieHeader, receiveDay) {
		cookieHeader = cookieHeader || await getKGCookie();
		noteLibraryStep("kugou", "youth:day:start", { receiveDay: String(receiveDay || "") });
		const body = await kgPostAndroidSigned("https://gateway.kugou.com", "/youth/v1/recharge/receive_vip_listen_song", cookieHeader, void 0, {
			appid: KG_LITE_APPID,
			clientver: KG_LITE_CLIENTVER,
			source_id: 90139,
			receive_day: String(receiveDay || "")
		}, { "Content-Type": "application/x-www-form-urlencoded" });
		noteLibraryStep("kugou", "youth:day:done", {
			status: body && body.status,
			errorCode: body && body.error_code
		});
		return body || {
			status: 0,
			error_code: 401,
			data: {}
		};
	}
	/**
	* KuGouMusicApi `/youth/day/vip/upgrade`.
	*
	* The upstream PC build sends `ad_type=1` after the listen-song reward. This is the server-side
	* step that promotes the temporary listen entitlement so the normal playback endpoints accept it.
	*/
	async function upgradeKGYouthDayVip(cookieHeader, userId) {
		cookieHeader = cookieHeader || await getKGCookie();
		const resolvedUserId = String(userId || kgCookieUserId(cookieHeader) || "").trim();
		if (!resolvedUserId) return {
			status: 0,
			error_code: 401,
			data: {}
		};
		noteLibraryStep("kugou", "youth:upgrade:start", { userId: resolvedUserId.slice(0, 6) });
		const body = await kgPostAndroidSigned("https://gateway.kugou.com", "/youth/v1/listen_song/upgrade_vip_reward", cookieHeader, void 0, {
			appid: KG_LITE_APPID,
			clientver: KG_LITE_CLIENTVER,
			kugouid: Number(resolvedUserId) || resolvedUserId,
			ad_type: 1
		}, { "Content-Type": "application/x-www-form-urlencoded" });
		noteLibraryStep("kugou", "youth:upgrade:done", {
			status: body && body.status,
			errorCode: body && body.error_code
		});
		return body || {
			status: 0,
			error_code: 401,
			data: {}
		};
	}
	let kgFavoriteListIdCache = {
		key: "",
		listId: "",
		at: 0
	};
	function kgCloudlistOk(body) {
		if (!body || typeof body !== "object") return false;
		const status = Number(body.status);
		const err = Number(body.error_code);
		if (status === 1) return true;
		if (err === 0 && status !== 0) return true;
		return false;
	}
	function extractKGCloudLists(body) {
		if (!body) return [];
		if (Array.isArray(body)) return body;
		if (Array.isArray(body.data)) return body.data;
		const data = body.data && typeof body.data === "object" ? body.data : null;
		const candidates = [
			data && data.info,
			data && data.files,
			data && data.songs,
			data && data.list,
			data && data.lists,
			data && data.playlist,
			data && data.playlists,
			data && data.list_info,
			data && data.listInfo,
			data && data.info_list,
			data && data.collection_list,
			data && data.collections,
			data && data.data && data.data.info,
			data && data.data && data.data.list,
			data && data.data && data.data.files,
			body.info,
			body.list,
			body.lists,
			body.files
		];
		for (const item of candidates) if (Array.isArray(item) && item.length) return item;
		for (const item of candidates) if (Array.isArray(item)) return item;
		return [];
	}
	function kgPlaylistSongCount(item) {
		item = item || {};
		return Number(item.count || item.song_count || item.songcount || item.count_total || item.total || item.song_num || item.trackCount || item.track_count || 0) || 0;
	}
	function isKGFavoriteName(name) {
		return /我喜欢|默认收藏|红心|^favorite$/i.test(String(name || ""));
	}
	/** Prefer 「我喜欢」 with songs over empty legacy 「默认收藏」. */
	function scoreKGFavoriteList(item) {
		if (!item) return -1;
		const name = String(item.name || item.listname || item.specialname || item.list_name || "");
		const count = kgPlaylistSongCount(item);
		let score = 0;
		if (/^我喜欢$/i.test(name.trim())) score += 1e3;
		else if (/我喜欢/.test(name)) score += 800;
		else if (Number(item.is_favorite) === 1) score += 700;
		else if (Number(item.is_default) === 1) score += 500;
		else if (/默认收藏|红心|^favorite$/i.test(name)) score += 300;
		else if (String(kgPlaylistListId(item)) === "2" && Number(item.type) !== 1) score += 200;
		else return -1;
		score += Math.min(500, count);
		return score;
	}
	function pickKGFavoriteList(lists) {
		const arr = Array.isArray(lists) ? lists : [];
		let best = null;
		let bestScore = -1;
		arr.forEach((item) => {
			const score = scoreKGFavoriteList(item);
			if (score > bestScore) {
				best = item;
				bestScore = score;
			}
		});
		return best;
	}
	function kgPlaylistListId(item) {
		item = item || {};
		const direct = item.listid ?? item.list_id ?? item.global_list_id ?? item.listId;
		if (direct != null && String(direct).trim() !== "") return String(direct).trim();
		const m = String(item.global_collection_id || item.globalCollectionId || item.gid || "").trim().match(/^collection_\d+_\d+_(\d+)_\d+$/i);
		if (m) return m[1];
		return "";
	}
	function kgPlaylistGlobalId(item) {
		item = item || {};
		return String(item.global_collection_id || item.globalCollectionId || item.gid || "").trim();
	}
	async function fetchKGFavoriteListId(cookieHeader, forceRefresh) {
		const cacheKey = buildKGSessionCacheKey(cookieHeader);
		if (!forceRefresh && kgFavoriteListIdCache.key === cacheKey && kgFavoriteListIdCache.listId && Date.now() - kgFavoriteListIdCache.at < KG_SESSION_CACHE_TTL_MS) return kgFavoriteListIdCache.listId;
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		if (!userId || !token) return "";
		let listId = "";
		try {
			const fav = pickKGFavoriteList((await fetchKGUserPlaylistOfficial(cookieHeader, 1, 100)).lists || []);
			listId = String(kgPlaylistListId(fav) || "").trim();
		} catch (_) {}
		if (!listId) for (const listType of [2, 0]) try {
			const fav = pickKGFavoriteList(extractKGCloudLists(await kgPostAndroidSigned("https://gateway.kugou.com", "/v7/get_all_list", cookieHeader, {
				userid: userId,
				token,
				total_ver: 979,
				type: listType,
				page: 1,
				pagesize: 50
			}, {
				plat: 1,
				userid: Number(userId) || userId,
				token
			}, KG_CLOUDLIST_ROUTER)));
			listId = String(kgPlaylistListId(fav) || "").trim();
			if (listId) break;
		} catch (_) {}
		if (!listId) return "";
		kgFavoriteListIdCache = {
			key: cacheKey,
			listId,
			at: Date.now()
		};
		return listId;
	}
	function normalizeKGCover(url, size) {
		url = String(url || "").trim();
		if (!url || /^null$/i.test(url) || url === "0" || url === "undefined") return "";
		if (/\/softhead\/(?:\{size\}\/)?(?:0+|default)/i.test(url) && !/\/[a-f0-9]{16,}/i.test(url)) return "";
		url = url.replace(/\{size\}/gi, String(size || 240));
		if (url.startsWith("//")) url = `https:${url}`;
		if (url.startsWith("http://")) url = `https://${url.slice(7)}`;
		return url;
	}
	function extractKGPlaylistCover(item, size) {
		item = item || {};
		const candidates = [
			item.pic,
			item.pic_cover,
			item.cover,
			item.imgurl,
			item.img,
			item.flexible_cover,
			item.list_pic,
			item.list_pic_url,
			item.pic_url,
			item.cover_url,
			item.heats_pic,
			item.sound,
			item.ico,
			item.icon,
			item.list_cover,
			item.collect_pic,
			item.user_cover
		];
		for (const raw of candidates) {
			const cover = normalizeKGCover(raw, size || 240);
			if (cover) return cover;
		}
		return "";
	}
	function normalizeKGDuration(value, fromSearch) {
		const n = Number(value) || 0;
		if (!n) return 0;
		if (fromSearch || n < 1e4) return Math.round(n * 1e3);
		return Math.round(n);
	}
	function stripKGHighlightHtml(value) {
		return String(value || "").replace(/<\/?em>/gi, "").replace(/<[^>]+>/g, "").trim();
	}
	/** 只认字符串。数字当名字会把歌手 id 显示成歌手名，宁可不认。 */
	const kgText = (value) => typeof value === "string" ? stripKGHighlightHtml(value) : "";
	const KG_AUTHOR_NAME_KEYS = [
		"author_name",
		"authorName",
		"singername",
		"singerName",
		"singer_name",
		"name",
		"nickname",
		"AuthorName",
		"SingerName"
	];
	const KG_AUTHOR_ID_KEYS = [
		"author_id",
		"authorId",
		"singerid",
		"singer_id",
		"singerId",
		"id",
		"SingerId"
	];
	/** 一个歌手条目：可能是字符串，也可能是对象，还可能再被包一层（{base:{...}} / {singer:{...}}）。 */
	function kgAuthorEntry(entry) {
		if (typeof entry === "string") {
			const name = kgText(entry);
			return name ? {
				name,
				id: ""
			} : null;
		}
		if (!entry || typeof entry !== "object") return null;
		const inner = entry.base && typeof entry.base === "object" ? entry.base : entry.singer && typeof entry.singer === "object" ? entry.singer : entry;
		const name = KG_AUTHOR_NAME_KEYS.map((key) => kgText(inner[key])).find(Boolean) || "";
		if (!name) return null;
		const rawId = KG_AUTHOR_ID_KEYS.map((key) => inner[key]).find((value) => value !== void 0 && value !== null && value !== "");
		return {
			name,
			id: rawId === void 0 ? "" : String(rawId).trim()
		};
	}
	/**
	* 从候选值里挑出第一个像歌手名的字符串。
	*
	* 单独写一份是因为有些接口把单个歌手也放进对象里（`singer: {name: '...'}`），
	* 直接当字符串取会得到空；这里顺手把这种形态也拆开。
	*/
	function kgFirstArtistText(values) {
		for (const value of values) {
			if (value === void 0 || value === null || value === "") continue;
			if (typeof value === "object" && !Array.isArray(value)) {
				const author = kgAuthorEntry(value);
				if (author) return author.name;
				continue;
			}
			const text = kgText(value);
			if (text) return text;
		}
		return "";
	}
	/**
	* 歌手名字与 id。
	*
	* 要点是**按顺序逐个候选试到有结果为止**，而不是取第一个「非空」的字段值 ——
	* 空数组（`authors: []`）和空对象同样是「非空值」，会把后面真正带着歌手的字段整个挡住。
	* 「别的歌单都有作者、只有这一路全显示未知」就是这一类成因，所以这里不能只看第一个。
	*/
	function collectKGAuthors(item) {
		const sources = [
			item.authors,
			item.artists,
			item.singerinfo,
			item.SingerList,
			item.singer_list,
			item.Singers,
			item.singers,
			item.artist_list,
			item.author_list,
			item.artistList
		];
		for (const source of sources) {
			if (source === void 0 || source === null) continue;
			const list = Array.isArray(source) ? source : [source];
			const names = [];
			const ids = [];
			for (const entry of list) {
				const author = kgAuthorEntry(entry);
				if (!author) continue;
				names.push(author.name);
				if (author.id && !ids.includes(author.id)) ids.push(author.id);
			}
			if (names.length) return {
				names,
				ids
			};
		}
		return {
			names: [],
			ids: []
		};
	}
	function extractKGFee(item) {
		item = item || {};
		const payType = Number(item.PayType ?? item.pay_type ?? 0);
		const privilege = Number(item.Privilege ?? item.privilege ?? 0);
		if (payType === 1 || payType === 2 || payType === 4) return 1;
		if ((privilege & 2) === 2) return 1;
		return 0;
	}
	function extractKGCover(item, size) {
		item = item || {};
		const trans = item.trans_param || item.TransParam || {};
		return normalizeKGCover(item.Image || item.img || item.album_img || item.album_sizable_cover || item.albumimg || trans.union_cover || trans.unionCover || trans.album_img || trans.imgurl || "", size || 240);
	}
	function stripKGAudioExt(text) {
		return String(text || "").replace(/\.(mp3|flac|m4a|ape|wav|ogg|aac|wma|mp4|mkv)(\?.*)?$/i, "").trim();
	}
	function mapKGSong(item, fromSearch) {
		item = item || {};
		const audio = item.audio_info || item.audioInfo || item.base || item.base_info || {};
		const goods = Array.isArray(item.relate_goods) ? item.relate_goods[0] : null;
		const nested = goods && typeof goods === "object" ? goods : {};
		const hash128 = String(item["128hash"] || item.FileHash || item.hash || item.HASH || item.filehash || audio.hash || audio.FileHash || nested.hash || nested.FileHash || "").trim().toLowerCase();
		const hash320 = String(item["320hash"] || item.HQFileHash || item.h320hash || item.hash_320 || audio.hash_320 || audio["320hash"] || nested.hash_320 || "").trim().toLowerCase();
		const hashSq = String(item.sqhash || item.SQFileHash || item.hash_flac || item.hash_sq || audio.sqhash || nested.sqhash || "").trim().toLowerCase();
		const hash = hash128 || hash320 || hashSq;
		const albumId = String(item.AlbumID || item.album_id || item.albumid || item.AlbumId || audio.album_id || nested.album_id || "").trim();
		const albumAudioId = String(item.MixSongID || item.mixsongid || item.mixSongId || item.album_audio_id || item.AlbumAudioID || item.audio_id || audio.album_audio_id || audio.mixsongid || nested.album_audio_id || item.ID || "").trim();
		const fee = extractKGFee(item);
		const authors = collectKGAuthors(item);
		const authorNames = authors.names;
		const authorIds = authors.ids;
		let rawName = stripKGHighlightHtml(item.SongName || item.songname || item.song_name || "");
		let name = stripKGAudioExt(rawName);
		let artist = kgFirstArtistText([
			item.SingerName,
			item.singername,
			item.singerName,
			item.singer_name,
			item.author_name,
			item.authorName,
			item.author,
			item.artist_name,
			item.artistName,
			item.artist,
			item.singer,
			item.Singer,
			item.album_artist,
			item.AlbumArtist,
			audio.SingerName,
			audio.singername,
			audio.singerName,
			audio.singer_name,
			audio.author_name,
			audio.authorName,
			nested.SingerName,
			nested.singername,
			nested.author_name
		]) || authorNames.join(" / ");
		const filename = stripKGAudioExt(stripKGHighlightHtml(item.filename || item.FileName || item.name || item.file_name || ""));
		if ((!name || name === filename) && filename) {
			if (filename.includes(" - ")) {
				const parts = filename.split(" - ");
				if (!artist) artist = parts[0].trim();
				name = stripKGAudioExt(parts.slice(1).join(" - ").trim() || filename);
			} else if (!name) name = filename;
		}
		if (!artist && (rawName.includes(" - ") || filename.includes(" - "))) {
			const parts = (rawName.includes(" - ") ? rawName : filename).split(" - ");
			artist = parts[0].trim();
			name = stripKGAudioExt(parts.slice(1).join(" - ").trim() || name || rawName);
		}
		name = stripKGAudioExt(name);
		const singerId = String(item.SingerId || item.singerid || item.singer_id || item.SingerID || item.author_id || authorIds[0] || "").trim();
		return {
			provider: "kg",
			source: "kg",
			type: "kg",
			id: hash,
			hash,
			hash128,
			hash320,
			hashSq,
			albumId,
			albumAudioId,
			singerId,
			artistId: singerId,
			name,
			artist,
			album: stripKGHighlightHtml(item.AlbumName || item.album_name || item.album || ""),
			cover: extractKGCover(item, 240),
			duration: normalizeKGDuration(item.Duration || item.duration || item.timelength || item.timelen || item.time_length || audio.timelength || audio.duration || nested.timelength, fromSearch),
			fee,
			privilege: Number(item.Privilege ?? item.privilege ?? 0) || 0,
			payType: Number(item.PayType ?? item.pay_type ?? 0) || 0,
			playable: fee === 0
		};
	}
	function mapKGPlaylist(item, userId) {
		item = item || {};
		const listId = kgPlaylistListId(item);
		const globalId = kgPlaylistGlobalId(item);
		const id = listId || globalId || String(item.specialid || item.special_id || item.id || "").trim();
		const name = stripKGHighlightHtml(item.name || item.list_name || item.listname || item.specialname || item.special_name || "");
		const typeNum = Number(item.type);
		const ownerId = String(item.list_create_userid || item.create_userid || item.userid || item.uid || item.ownerid || "").trim();
		const isFavorite = isKGFavoriteName(name) || Number(item.is_default) === 1 || Number(item.is_favorite) === 1;
		const subscribed = !isFavorite && (typeNum === 1 || Number(item.is_collect) === 1 || Number(item.collected) === 1);
		return {
			provider: "kg",
			source: "kg",
			type: "playlist",
			id,
			listId: listId || id,
			globalCollectionId: globalId,
			name: name || (isFavorite ? "我喜欢" : "未命名歌单"),
			cover: extractKGPlaylistCover(item, 240),
			trackCount: Number(item.count || item.song_count || item.songcount || item.count_total || item.total || item.song_num || 0) || 0,
			creator: item.nickname || item.username || item.create_username || item.list_create_username || "酷狗音乐",
			ownerId,
			subscribed,
			isFavorite,
			listType: Number.isFinite(typeNum) ? typeNum : subscribed ? 1 : 0,
			ownedByMe: !ownerId || !userId || String(ownerId) === String(userId) || subscribed || isFavorite
		};
	}
	function keepKGUserPlaylist(pl, userId) {
		if (!pl || !pl.id) return false;
		if (pl.isFavorite || pl.subscribed) return true;
		if (!userId) return true;
		if (pl.ownerId) return String(pl.ownerId) === String(userId);
		return /^\d+$/.test(String(pl.listId || "")) && Number(pl.listType) !== 1;
	}
	async function kgFetchText(url, opts) {
		opts = opts || {};
		return (await fetch(url, {
			method: opts.method || "GET",
			headers: Object.assign({
				"User-Agent": opts.mobile ? KG_UA_MOBILE : KG_UA_PC,
				Referer: opts.referer || "https://www.kugou.com/",
				Accept: "application/json, text/plain, */*"
			}, opts.headers || {}),
			body: opts.body
		})).text();
	}
	async function kgFetchJSON(url, opts) {
		const text = await kgFetchText(url, opts);
		const cleaned = String(text || "").replace(/<!--[\s\S]*?-->/g, "").trim();
		try {
			return JSON.parse(cleaned || text);
		} catch (_) {
			return null;
		}
	}
	async function getKGMid(cookieHeader) {
		const device = await getKGDeviceIdentity(cookieHeader);
		kgMidCache = String(device.mid);
		return kgMidCache;
	}
	function buildKGTrackerKey(hash, mid, userId, appid) {
		hash = String(hash || "").trim().toLowerCase();
		userId = String(userId || "0").replace(/\D/g, "") || "0";
		appid = String(appid || 3116);
		return md5$1(`${hash}${KG_TRACKER_SECRET}${appid}${mid}${userId}`);
	}
	/**
	* Fast path for the Android V5 request that the native bridge can verify with a valid reward
	* session. It mirrors the successful 20489/clientver variant as a single first request instead
	* of walking the older 11430 probes before it.
	*/
	async function fetchKGAndroidFastSongUrl(hash, albumId, albumAudioId, cookieHeader, loginVipType, quality) {
		hash = String(hash || "").trim().toLowerCase();
		if (!hash) return "";
		cookieHeader = await enrichKGCookieHeader(cookieHeader, { preferAppToken: true });
		const userId = kgCookieUserId(cookieHeader) || "0";
		const token = kgCookieToken(cookieHeader) || "";
		if (!userId || userId === "0" || !token) return "";
		const mid = await getKGMid(cookieHeader);
		const dfid = kgCookieDfid(cookieHeader) || kgRandomString(24);
		const clienttime = Math.floor(Date.now() / 1e3);
		await loadKGVipSessionCache(userId);
		const params = {
			album_id: Number(albumId) || 0,
			area_code: 1,
			hash,
			ssa_flag: "is_fromtrack",
			version: KG_TRACKER_CLIENTVER,
			page_id: KG_SONG_PAGE_ID,
			quality: quality || 128,
			album_audio_id: Number(albumAudioId) || 0,
			behavior: "play",
			pid: KG_SONG_PID,
			cmd: 26,
			pidversion: 3001,
			IsFreePart: 0,
			ppage_id: KG_SONG_PPID,
			cdnBackup: 1,
			module: "",
			clientver: KG_TRACKER_CLIENTVER,
			dfid,
			mid,
			uuid: "-",
			appid: KG_ANDROID_APPID,
			clienttime,
			token,
			userid: userId
		};
		params.key = buildKGTrackerKey(hash, mid, userId, KG_ANDROID_APPID);
		params.signature = signatureKGAndroidParams(params);
		const url = `https://gateway.kugou.com/v5/url?${Object.keys(params).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&")}`;
		const startedAt = Date.now();
		noteLibraryStep("kugou", "url:http:start", {
			name: "android-fast-v5",
			host: "gateway.kugou.com"
		});
		try {
			const body = await kgFetchJSON(url, {
				mobile: true,
				referer: "https://www.kugou.com/",
				headers: {
					Cookie: buildKGLeanCookie(cookieHeader),
					"User-Agent": KG_ANDROID_UA,
					dfid: String(dfid),
					clienttime: String(clienttime),
					mid: String(mid),
					"kg-rc": "1",
					"kg-thash": "5d816a0",
					"kg-rec": "1",
					"kg-rf": "B9EDA08A64250DEFFBCADDEE00F8F25F",
					"x-router": "trackercdn.kugou.com"
				}
			});
			noteLibraryStep("kugou", "url:http:done", {
				name: "android-fast-v5",
				host: "gateway.kugou.com",
				ms: Date.now() - startedAt,
				status: body && body.status
			});
			return parseKGPlayUrl(body);
		} catch (error) {
			noteLibraryStep("kugou", "url:http:error", {
				name: "android-fast-v5",
				host: "gateway.kugou.com",
				ms: Date.now() - startedAt,
				error: error instanceof Error ? error.message : String(error)
			});
			return "";
		}
	}
	async function fetchKGTrackerV5Url(hash, albumId, albumAudioId, cookieHeader, loginVipType, quality) {
		hash = String(hash || "").trim().toLowerCase();
		if (!hash) return {
			url: "",
			status: 0,
			blocked: false
		};
		cookieHeader = await enrichKGCookieHeader(cookieHeader, { preferAppToken: true });
		const userId = kgCookieUserId(cookieHeader) || "0";
		const token = kgCookieToken(cookieHeader) || "";
		if (!userId || userId === "0" || !token) return {
			url: "",
			status: 0,
			blocked: false
		};
		const mid = await getKGMid(cookieHeader);
		const dfid = kgCookieDfid(cookieHeader) || kgRandomString(24);
		const cached = await loadKGVipSessionCache(userId);
		const vipType = resolveKGTrackerVipType(cookieHeader, loginVipType || cached && cached.vipType);
		const vipToken = resolveKGEffectiveVipToken(cookieHeader, cached);
		const qualityCode = Number(quality) || 128;
		const attempts = [{
			clientver: KG_TRACKER_CLIENTVER,
			withVipType: false
		}];
		const leanCookie = buildKGLeanCookie(cookieHeader);
		let lastStatus = 0;
		for (const attempt of attempts) {
			const clienttime = Math.floor(Date.now() / 1e3);
			const params = {
				album_id: Number(albumId) || 0,
				album_audio_id: Number(albumAudioId) || 0,
				area_code: 1,
				behavior: "play",
				hash,
				cmd: 26,
				pid: KG_SONG_PID,
				pidversion: 3001,
				IsFreePart: 0,
				cdnBackup: 1,
				module: "",
				page_id: KG_SONG_PAGE_ID,
				ppage_id: KG_SONG_PPID,
				quality: qualityCode,
				ssa_flag: "is_fromtrack",
				version: attempt.clientver,
				clientver: attempt.clientver,
				appid: KG_ANDROID_APPID,
				clienttime,
				dfid,
				mid,
				uuid: "-",
				userid: userId,
				token
			};
			if (attempt.withVipType && Number(loginVipType) > 0) params.vipType = loginVipType;
			params.key = buildKGTrackerKey(hash, mid, userId, KG_ANDROID_APPID);
			params.signature = signatureKGAndroidParams(params);
			const qs = Object.keys(params).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");
			const urls = [`https://gateway.kugou.com/v5/url?${qs}`, `https://gateway.kugou.com/tracker/v5/url?${qs}`];
			for (const url of urls) {
				const httpStartedAt = Date.now();
				const httpHost = new URL(url).host;
				noteLibraryStep("kugou", "url:http:start", {
					name: "v5",
					host: httpHost,
					clientver: attempt.clientver
				});
				try {
					const body = await kgFetchJSON(url, {
						mobile: true,
						referer: "https://www.kugou.com/",
						headers: Object.assign({
							Cookie: leanCookie,
							"User-Agent": KG_ANDROID_UA,
							dfid: String(dfid),
							clienttime: String(clienttime),
							mid: String(mid),
							"kg-rc": "1",
							"kg-thash": "5d816a0",
							"kg-rec": "1",
							"kg-rf": "B9EDA08A64250DEFFBCADDEE00F8F25F",
							"x-router": "trackercdn.kugou.com"
						}, buildKGAuthHeaders(token))
					});
					if (!body) continue;
					lastStatus = Number(body.status) || 0;
					noteLibraryStep("kugou", "url:http:done", {
						name: "v5",
						host: httpHost,
						ms: Date.now() - httpStartedAt,
						status: lastStatus
					});
					const playUrl = parseKGPlayUrl(body);
					if (playUrl) {
						const harvested = harvestKGVipToken(body);
						if (harvested || Number(vipType) > 0) await saveKGVipSessionCache(userId, {
							vipToken: harvested || vipToken,
							vipType: Number(vipType) || 6,
							isVip: true,
							vipLabel: cached && cached.vipLabel || "VIP"
						});
						return {
							url: playUrl,
							status: lastStatus || 1,
							blocked: false,
							vipType,
							via: "v5",
							clientver: attempt.clientver
						};
					}
				} catch (error) {
					noteLibraryStep("kugou", "url:http:error", {
						name: "v5",
						host: httpHost,
						ms: Date.now() - httpStartedAt,
						error: error instanceof Error ? error.message : String(error)
					});
				}
			}
		}
		return {
			url: "",
			status: lastStatus,
			blocked: lastStatus === 2,
			vipType,
			via: "v5"
		};
	}
	function parseKGPlayUrl(body) {
		if (!body) return "";
		const candidates = [
			body.url,
			body.backupUrl,
			body.backup_url,
			body.data && body.data.url,
			body.data && body.data.backupUrl,
			body.data && body.data.backup_url
		];
		for (const urls of candidates) {
			if (Array.isArray(urls)) {
				const hit = urls.find((item) => item && /^https?:\/\//i.test(item));
				if (hit) return hit;
			}
			if (typeof urls === "string" && /^https?:\/\//i.test(urls)) return urls;
		}
		return "";
	}
	function pickPlayInfoUrl(playInfo) {
		if (!playInfo || playInfo.error) return "";
		if (playInfo.url && /^https?:\/\//i.test(playInfo.url)) return playInfo.url;
		const backup = playInfo.backup_url;
		if (Array.isArray(backup) && backup[0]) return backup[0];
		if (typeof backup === "string" && backup) return backup;
		return "";
	}
	function isExpiredKGVipTime(value) {
		const ts = Date.parse(String(value || "").replace(/-/g, "/"));
		return Number.isFinite(ts) ? ts < Date.now() : false;
	}
	function parseKGVipFromData(data) {
		if (!data || typeof data !== "object" || Array.isArray(data)) return {
			vipType: 0,
			isVip: false
		};
		const nestedRaw = data.vip || data.user_vip || data.userVip || data.music_vip || {};
		const nested = nestedRaw && typeof nestedRaw === "object" && !Array.isArray(nestedRaw) ? nestedRaw : {};
		const vipEnd = data.vip_end_time || data.vipEndTime || nested.vip_end_time || data.expire_time || data.expireTime;
		let vipType = Number(data.vip_type || data.vipType || data.VIPType || data.VipType || nested.vip_type || nested.vipType || nested.type || 0) || 0;
		const productType = String(data.product_type || nested.product_type || data.busi_type || nested.busi_type || "").toLowerCase();
		const isVipFlag = Number(data.is_vip ?? data.isVip ?? nested.is_vip ?? nested.isVip ?? data.isVipUser ?? -1);
		let isVip = !!(vipType > 0 && (!vipEnd || !isExpiredKGVipTime(vipEnd)) || isVipFlag === 1 || Number(data.vip) === 1 || Number(nested.vip) === 1 || Number(data.MusicPack) === 1 || Number(data.musicpack) === 1 || Number(data.y_type) > 0 || Number(data.music_vip) > 0 || productType && !/^(free|none|0|normal)$/.test(productType) && Number(data.is_vip) === 1 || vipEnd && !isExpiredKGVipTime(vipEnd) || data.svip_end_time && !isExpiredKGVipTime(data.svip_end_time) || data.musicvip_end_time && !isExpiredKGVipTime(data.musicvip_end_time) || nested.vip_end_time && !isExpiredKGVipTime(nested.vip_end_time));
		if (Number(data.is_vip) === 1 && data.vip_end_time && !isExpiredKGVipTime(data.vip_end_time)) {
			isVip = true;
			vipType = Math.max(vipType, KG_PRODUCT_VIP_TYPE[productType] || 6);
		}
		if (Number(data.m_type) > 0 && data.m_end_time && !isExpiredKGVipTime(data.m_end_time)) {
			isVip = true;
			vipType = Math.max(vipType, Number(data.m_type) || 6);
		}
		if (Number(data.su_vip) > 0 || data.su_vip_end_time && !isExpiredKGVipTime(data.su_vip_end_time)) {
			isVip = true;
			vipType = Math.max(vipType, 33);
		}
		return {
			vipType: vipType || (isVip ? 6 : 0),
			isVip
		};
	}
	function pushKGVipQueueItem(queue, value) {
		if (!value) return;
		if (Array.isArray(value)) queue.push(...value);
		else queue.push(value);
	}
	function extractKGVipFromPayload(payload) {
		let best = parseKGVipFromData(payload);
		const queue = [];
		pushKGVipQueueItem(queue, payload);
		if (payload && typeof payload === "object" && !Array.isArray(payload)) {
			[
				"busi_vip",
				"busiVip",
				"vip_info",
				"vipInfo",
				"music_vip",
				"svip",
				"data",
				"info",
				"user_vip"
			].forEach((key) => {
				pushKGVipQueueItem(queue, payload[key]);
			});
			if (Array.isArray(payload.list)) queue.push(...payload.list);
			if (Array.isArray(payload.vip_list)) queue.push(...payload.vip_list);
		}
		queue.forEach((item) => {
			const hit = parseKGVipFromData(item);
			if (hit.isVip && (!best.isVip || hit.vipType >= best.vipType)) best = hit;
		});
		return best;
	}
	function resolveKGVipMeta(data) {
		if (!data || typeof data !== "object") return {
			vipLabel: "",
			expireTime: ""
		};
		if (Number(data.m_type) > 0 && data.m_end_time && !isExpiredKGVipTime(data.m_end_time)) return {
			vipLabel: "豪华VIP",
			expireTime: String(data.m_end_time)
		};
		if (Number(data.su_vip) > 0 || data.su_vip_end_time && !isExpiredKGVipTime(data.su_vip_end_time)) return {
			vipLabel: "超级VIP",
			expireTime: String(data.su_vip_end_time || data.vip_end_time || "")
		};
		const items = Array.isArray(data.busi_vip) ? data.busi_vip : Array.isArray(data.busiVip) ? data.busiVip : [];
		let bestItem = null;
		items.forEach((item) => {
			if (!item || Number(item.is_vip) !== 1) return;
			if (item.vip_end_time && isExpiredKGVipTime(item.vip_end_time)) return;
			if (!bestItem || String(item.vip_end_time || "") > String(bestItem.vip_end_time || "")) bestItem = item;
		});
		if (bestItem) {
			const pt = String(bestItem.product_type || "").toLowerCase();
			return {
				vipLabel: pt === "svip" ? "超级VIP" : pt === "mvip" ? "音乐包" : pt === "tvip" || pt === "vip" || pt === "qvip" || pt === "dvip" || pt ? "豪华VIP" : "VIP",
				expireTime: String(bestItem.vip_end_time || "")
			};
		}
		if (Number(data.vip_type) > 0 && data.vip_end_time && !isExpiredKGVipTime(data.vip_end_time)) return {
			vipLabel: "豪华VIP",
			expireTime: String(data.vip_end_time)
		};
		return {
			vipLabel: "",
			expireTime: ""
		};
	}
	async function fetchKGUserVipDetailOnce(cookieHeader, busiType) {
		cookieHeader = await enrichKGCookieHeader(cookieHeader);
		const extra = busiType ? { busi_type: busiType } : {};
		const attempts = [
			() => kgFetchAndroidSigned("https://kugouvip.kugou.com", "/v1/get_union_vip", cookieHeader, extra),
			() => kgFetchAndroidSigned("https://gateway.kugou.com", "/v1/get_union_vip", cookieHeader, extra, { "x-router": "kugouvip.kugou.com" }),
			() => kgFetchAndroidSigned("https://gateway.kugou.com/kugouvip.service", "/v1/get_union_vip", cookieHeader, extra, { "x-router": "kugouvip.kugou.com" })
		];
		for (const run of attempts) try {
			const body = await run();
			if (!body) continue;
			const err = Number(body.error_code ?? body.errcode ?? body.err_code ?? 0);
			if (err && err !== 0 && Number(body.status) !== 1) continue;
			const data = body.data || body.info || body;
			if (!data || typeof data !== "object") continue;
			const vip = extractKGVipFromPayload(data);
			const meta = resolveKGVipMeta(data);
			const rootVip = Number(data.is_vip ?? data.isVip ?? 0) === 1 && !(data.vip_end_time && isExpiredKGVipTime(data.vip_end_time));
			const isVip = !!(vip.isVip || meta.vipLabel || rootVip);
			if (!isVip && !meta.expireTime && !Array.isArray(data.busi_vip) && !Array.isArray(data.busiVip)) {
				if (Number(body.status) === 1 || err === 0) return {
					vipType: 0,
					isVip: false,
					vipLabel: "",
					expireTime: "",
					vipToken: harvestKGVipToken(body) || harvestKGVipToken(data),
					detail: data,
					busiType: busiType || "",
					empty: true
				};
				continue;
			}
			let vipType = vip.vipType || 0;
			if (!vipType && isVip) {
				const pt = String(data.product_type || (meta.vipLabel === "超级VIP" ? "svip" : "vip")).toLowerCase();
				vipType = KG_PRODUCT_VIP_TYPE[pt] || 6;
			}
			return {
				vipType: vipType || (isVip ? 6 : 0),
				isVip,
				vipLabel: meta.vipLabel || (isVip ? String(data.product_type || "").toLowerCase() === "svip" ? "超级VIP" : "豪华VIP" : ""),
				expireTime: meta.expireTime || String(data.vip_end_time || data.su_vip_end_time || data.m_end_time || ""),
				vipToken: harvestKGVipToken(body) || harvestKGVipToken(data),
				detail: data,
				busiType: busiType || "",
				empty: false
			};
		} catch (_) {}
		return null;
	}
	/**
	* KuGouMusicApi `/user/vip/detail`
	* Upstream: GET https://kugouvip.kugou.com/v1/get_union_vip?busi_type=concept (android signed)
	*/
	async function fetchKGUserVipDetail(cookieHeader) {
		const busiTypes = [
			"concept",
			"music",
			""
		];
		let best = null;
		for (const busiType of busiTypes) {
			const hit = await fetchKGUserVipDetailOnce(cookieHeader, busiType);
			if (!hit) continue;
			if (!best) best = hit;
			if (hit.isVip) {
				best = hit;
				break;
			}
			if (!best.detail && hit.detail) best = hit;
		}
		return best;
	}
	async function getKGUserVipDetail(cookieHeader) {
		cookieHeader = cookieHeader || await getKGCookie();
		await syncKGVipCacheWithCookie(cookieHeader);
		const auth = await ensureKGAndroidAuth(cookieHeader, { requireAppToken: true });
		cookieHeader = await enrichKGCookieHeader(auth.cookieHeader || cookieHeader, { preferAppToken: !!(auth && auth.token && auth.refreshed) });
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		if (!userId || !token) return {
			provider: "kg",
			loggedIn: false,
			error: "NOT_LOGGED_IN",
			message: "未登录，无法查询 VIP 详情。请先在 www.kugou.com 登录。"
		};
		const detail = await fetchKGUserVipDetail(cookieHeader);
		const [userCenter, union, mobileVip] = await Promise.all([
			fetchKGUserCenterVip(cookieHeader).catch(() => null),
			fetchKGUnionVip(cookieHeader).catch(() => null),
			fetchKGMobileVipInfo(cookieHeader).catch(() => null)
		]);
		let merged = mergeKGVipState({}, detail || {});
		merged = mergeKGVipState(merged, userCenter || {});
		merged = mergeKGVipState(merged, union || {});
		merged = mergeKGVipState(merged, mobileVip || {});
		if (!merged.isVip && kgCookieHasVipSession(cookieHeader)) merged = mergeKGVipState(merged, {
			vipType: kgCookieVipType(cookieHeader) || 6,
			isVip: true
		});
		const cached = await loadKGVipSessionCache(userId);
		if (!merged.isVip && cached && cached.isVip) merged = mergeKGVipState(merged, cached);
		const vipToken = detail && detail.vipToken || harvestKGVipToken(detail && detail.detail) || harvestKGVipToken(userCenter && userCenter.detail) || resolveKGEffectiveVipToken(cookieHeader, cached);
		const vipLabel = detail && detail.vipLabel || userCenter && userCenter.vipLabel || (merged.isVip ? "VIP" : "无VIP");
		const expireTime = detail && detail.expireTime || userCenter && userCenter.expireTime || "";
		if (merged.isVip || vipToken) await saveKGVipSessionCache(userId, {
			vipType: merged.vipType || 6,
			isVip: !!(merged.isVip || vipToken),
			vipLabel,
			expireTime,
			vipToken
		});
		if (!merged.isVip && !detail && !userCenter && !union && !mobileVip) return {
			provider: "kg",
			loggedIn: true,
			userId,
			isVip: false,
			vipType: 0,
			vipLabel: "无VIP",
			vipToken: "",
			error: "VIP_DETAIL_EMPTY",
			message: " /user/vip/detail 未返回会员信息，请确认会员未过期后重新登录酷狗网页",
			source: "user/vip/detail"
		};
		return {
			provider: "kg",
			loggedIn: true,
			userId,
			isVip: merged.isVip,
			vipType: merged.vipType,
			vipLabel,
			expireTime,
			vipToken: vipToken || "",
			hasVipToken: !!vipToken,
			detail: detail && detail.detail || userCenter && userCenter.detail || null,
			source: "user/vip/detail",
			busiType: detail && detail.busiType || "concept"
		};
	}
	function mergeKGVipState(base, extra) {
		base = base || {
			vipType: 0,
			isVip: false
		};
		extra = extra || {
			vipType: 0,
			isVip: false
		};
		const vipType = Math.max(Number(base.vipType) || 0, Number(extra.vipType) || 0);
		const isVip = !!(base.isVip || extra.isVip || vipType > 0);
		return {
			vipType: vipType || (isVip ? 6 : 0),
			isVip
		};
	}
	function resolveKGTrackerVipType(cookieHeader, loginVipType) {
		const fromCookie = kgCookieVipType(cookieHeader);
		if (fromCookie > 0) return String(fromCookie);
		if (Number(loginVipType) > 0) return String(loginVipType);
		if (kgCookieHasVipSession(cookieHeader)) return "6";
		if (kgCookieToken(cookieHeader)) return "6";
		return "0";
	}
	function buildKGTrackerVipTypeCandidates(cookieHeader, loginVipType) {
		return [...new Set([
			resolveKGTrackerVipType(cookieHeader, loginVipType),
			String(kgCookieVipType(cookieHeader) || ""),
			kgCookieHasVipSession(cookieHeader) ? "6" : "",
			kgCookieToken(cookieHeader) ? "6" : "",
			"6",
			"11",
			"33",
			"3"
		].filter(Boolean))];
	}
	function buildKGSessionCacheKey(cookieHeader) {
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		return `${userId}|${token ? token.slice(0, 12) : ""}|${kgCookieVipType(cookieHeader)}`;
	}
	const KG_QUALITY_OPTIONS = [
		{
			level: "lossless",
			label: "无损 SQ",
			br: 999e3
		},
		{
			level: "exhigh",
			label: "极高 HQ",
			br: 32e4
		},
		{
			level: "standard",
			label: "标准",
			br: 128e3
		}
	];
	function normalizeQualityPreference(value) {
		const raw = String(value || "").toLowerCase().trim();
		if ([
			"jymaster",
			"master",
			"studio",
			"svip",
			"highest"
		].includes(raw)) return "jymaster";
		if ([
			"hires",
			"hi-res",
			"highres",
			"zhenyin",
			"spatial"
		].includes(raw)) return "hires";
		if ([
			"lossless",
			"flac",
			"sq"
		].includes(raw)) return "lossless";
		if ([
			"exhigh",
			"high",
			"320",
			"320k",
			"hq"
		].includes(raw)) return "exhigh";
		if ([
			"standard",
			"normal",
			"128",
			"128k",
			"std"
		].includes(raw)) return "standard";
		return "hires";
	}
	function qualityCandidatesFrom(target, candidates) {
		target = normalizeQualityPreference(target);
		let start = candidates.findIndex((item) => item.level === target);
		if (start < 0) start = 0;
		return candidates.slice(start);
	}
	function extractKGQualityMap(extra, baseHash) {
		extra = extra || {};
		return {
			lossless: String(extra.sqhash || extra.SQFileHash || "").trim().toLowerCase(),
			exhigh: String(extra["320hash"] || extra.HQFileHash || "").trim().toLowerCase(),
			standard: String(extra["128hash"] || extra.FileHash || baseHash || "").trim().toLowerCase()
		};
	}
	function pickKGHashForQuality(extra, baseHash, qualityPreference) {
		const map = extractKGQualityMap(extra, baseHash);
		const order = qualityCandidatesFrom(normalizeQualityPreference(qualityPreference), KG_QUALITY_OPTIONS);
		for (const item of order) {
			const hash = map[item.level];
			if (hash) return {
				hash,
				level: item.level,
				label: item.label,
				br: item.br
			};
		}
		return {
			hash: map.standard || String(baseHash || "").trim().toLowerCase(),
			level: "standard",
			label: "标准",
			br: 128e3
		};
	}
	function buildKGPlayUrlCacheKey(hash, albumId, albumAudioId, qualityLevel) {
		return `${hash}|${albumId || "0"}|${albumAudioId || ""}|${qualityLevel || ""}`;
	}
	function readKGPlayUrlCache(key) {
		const hit = kgPlayUrlCache.get(key);
		if (!hit) return "";
		if (Date.now() - hit.at > KG_PLAY_URL_CACHE_TTL_MS) {
			kgPlayUrlCache.delete(key);
			return "";
		}
		return hit.url;
	}
	function writeKGPlayUrlCache(key, url) {
		if (!url) return;
		kgPlayUrlCache.set(key, {
			url,
			at: Date.now()
		});
		if (kgPlayUrlCache.size > 80) {
			const oldest = kgPlayUrlCache.keys().next().value;
			if (oldest) kgPlayUrlCache.delete(oldest);
		}
	}
	function rememberKGPlaySession(cookieHeader, session) {
		kgSessionCache = {
			key: buildKGSessionCacheKey(cookieHeader),
			at: Date.now(),
			session
		};
	}
	async function getKGPlayContext(cookieHeader) {
		cookieHeader = await enrichKGCookieHeader(cookieHeader || await getKGCookie());
		const cacheKey = buildKGSessionCacheKey(cookieHeader);
		const now = Date.now();
		const cached = kgSessionCache.key === cacheKey && kgSessionCache.session && now - kgSessionCache.at < KG_SESSION_CACHE_TTL_MS ? kgSessionCache.session : null;
		if (cached && (!cached.loggedIn || cached.vipResolved)) return cached;
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		const loggedIn = !!(userId && token);
		const vipCached = loggedIn ? await loadKGVipSessionCache(userId) : null;
		let vipType = kgCookieVipType(cookieHeader) || vipCached && vipCached.vipType || 0;
		let isVip = kgCookieHasVipSession(cookieHeader) || !!(vipCached && vipCached.isVip);
		let vipLabel = isVip ? vipCached && vipCached.vipLabel || "VIP" : "无VIP";
		const session = {
			loggedIn,
			userId,
			vipType,
			isVip,
			vipLabel,
			vipResolved: false
		};
		if (loggedIn) {
			const vipInfo = await resolveKGSessionVip(cookieHeader, {
				vipType,
				isVip,
				vipLabel,
				nickname: kgCookieNickname(cookieHeader),
				avatar: kgCookieAvatar(cookieHeader)
			});
			Object.assign(session, vipInfo);
		} else session.vipResolved = true;
		rememberKGPlaySession(cookieHeader, session);
		return session;
	}
	function buildKGTrackerFastVipTypes(cookieHeader, loginVipType) {
		const primary = resolveKGTrackerVipType(cookieHeader, loginVipType);
		return [...new Set([
			primary,
			"6",
			"33",
			"0"
		].filter(Boolean))].slice(0, 3);
	}
	async function raceKGPlayTasks(taskFns, pickHit) {
		if (!taskFns.length) return null;
		return new Promise((resolve) => {
			let pending = taskFns.length;
			let settled = false;
			taskFns.forEach((fn) => {
				Promise.resolve().then(fn).then((result) => {
					if (settled) return;
					const hit = pickHit(result);
					if (hit) {
						settled = true;
						resolve(hit);
						return;
					}
					pending -= 1;
					if (pending <= 0) resolve(null);
				}).catch(() => {
					pending -= 1;
					if (!settled && pending <= 0) resolve(null);
				});
			});
		});
	}
	async function fetchKGUserCenterVip(cookieHeader) {
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		if (!userId || !token) return null;
		const mid = await getKGMid(cookieHeader);
		const dfid = kgCookieDfid(cookieHeader) || "-";
		const clienttime = String(Date.now());
		const commonParams = {
			userid: userId,
			token,
			appid: String(KG_ANDROID_APPID),
			clientver: String(KG_WEB_CLIENTVER),
			mid,
			dfid,
			uuid: "-",
			clienttime
		};
		const attempts = [
			{
				base: "https://apis.user.kugou.com/usercenter/v2/user/info",
				params: commonParams,
				headers: Object.assign({
					"User-Agent": KG_DEMO_UA,
					Accept: "application/json, text/plain, */*"
				}, buildKGRequestHeaders(cookieHeader, token))
			},
			{
				base: "https://apis.user.kugou.com/usercenter/v2/user/info",
				params: { userid: userId },
				headers: Object.assign({
					"User-Agent": KG_DEMO_UA,
					Accept: "application/json, text/plain, */*"
				}, buildKGRequestHeaders(cookieHeader, token))
			},
			{
				base: "https://gateway.kugou.com/usercenter.service/v2/user/info",
				params: commonParams,
				headers: Object.assign({
					"User-Agent": KG_DEMO_UA,
					mid: String(mid),
					dfid: String(dfid),
					clienttime,
					"kg-rc": "1",
					"kg-rec": "1"
				}, buildKGRequestHeaders(cookieHeader, token))
			}
		];
		for (const attempt of attempts) {
			const u = new URL(attempt.base);
			Object.entries(attempt.params).forEach(([key, value]) => {
				if (value != null && value !== "") u.searchParams.set(key, String(value));
			});
			try {
				const parsed = parseKGUserCenterBody(await kgFetchJSON(u.toString(), {
					referer: "https://www.kugou.com/",
					headers: attempt.headers
				}));
				if (parsed) return parsed;
			} catch (_) {}
		}
		try {
			const parsed = parseKGUserCenterBody(await kgFetchAndroidSigned("https://gateway.kugou.com/usercenter.service", "/v2/user/info", cookieHeader, { clientver: String(KG_WEB_CLIENTVER) }, { "x-router": "usercenter.service.kugou.com" }));
			if (parsed) return parsed;
		} catch (_) {}
		return null;
	}
	async function resolveKGSessionVip(cookieHeader, seed) {
		seed = seed || {};
		cookieHeader = await enrichKGCookieHeader(cookieHeader);
		const userId = kgCookieUserId(cookieHeader);
		const cached = userId ? await loadKGVipSessionCache(userId) : null;
		let vipType = Number(seed.vipType) || kgCookieVipType(cookieHeader) || cached && cached.vipType || 0;
		let isVip = !!(seed.isVip || kgCookieHasVipSession(cookieHeader) || cached && cached.isVip);
		let vipLabel = seed.vipLabel || cached && cached.vipLabel || (isVip ? "VIP" : "无VIP");
		let expireTime = seed.expireTime || cached && cached.expireTime || "";
		let nickname = seed.nickname || "";
		let avatar = seed.avatar || "";
		let vipToken = resolveKGEffectiveVipToken(cookieHeader, cached);
		const [userCenter, vipDetail, profile, union, mobileVip] = await Promise.all([
			fetchKGUserCenterVip(cookieHeader),
			fetchKGUserVipDetail(cookieHeader),
			fetchKGUserProfile(cookieHeader),
			fetchKGUnionVip(cookieHeader),
			fetchKGMobileVipInfo(cookieHeader)
		]);
		const payloads = [
			userCenter,
			vipDetail,
			profile,
			union,
			mobileVip
		].map((item) => item && (item.detail || item)).filter(Boolean);
		for (const payload of payloads) {
			const harvested = harvestKGVipToken(payload);
			if (harvested) {
				vipToken = harvested;
				break;
			}
		}
		if (userCenter) {
			({vipType, isVip} = mergeKGVipState({
				vipType,
				isVip
			}, userCenter));
			if (userCenter.vipLabel) vipLabel = userCenter.vipLabel;
			if (userCenter.expireTime) expireTime = userCenter.expireTime;
			if (userCenter.nickname) nickname = userCenter.nickname;
			if (userCenter.avatar) avatar = userCenter.avatar;
		}
		if (vipDetail) {
			({vipType, isVip} = mergeKGVipState({
				vipType,
				isVip
			}, vipDetail));
			if (vipDetail.vipLabel) vipLabel = vipDetail.vipLabel;
			if (vipDetail.expireTime) expireTime = vipDetail.expireTime;
		}
		if (profile) {
			if (profile.nickname) nickname = profile.nickname;
			if (profile.avatar) avatar = profile.avatar;
			({vipType, isVip} = mergeKGVipState({
				vipType,
				isVip
			}, profile));
		}
		if (union) ({vipType, isVip} = mergeKGVipState({
			vipType,
			isVip
		}, union));
		if (mobileVip) ({vipType, isVip} = mergeKGVipState({
			vipType,
			isVip
		}, mobileVip));
		if (!isVip && (kgCookieHasVipSession(cookieHeader) || vipToken || cached && cached.isVip)) {
			vipType = vipType || cached && cached.vipType || 6;
			isVip = true;
			vipLabel = vipLabel === "无VIP" ? cached && cached.vipLabel || "VIP" : vipLabel;
		}
		if (isVip && vipLabel === "无VIP") vipLabel = "VIP";
		if (userId && (isVip || vipToken || vipType > 0)) await saveKGVipSessionCache(userId, {
			vipType,
			isVip,
			vipLabel,
			expireTime,
			vipToken
		});
		return {
			vipType,
			isVip,
			vipLabel,
			expireTime,
			nickname,
			avatar,
			vipToken,
			vipResolved: true
		};
	}
	async function fetchKGUserProfile(cookieHeader) {
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		if (!userId || !token) return null;
		const mid = await getKGMid(cookieHeader);
		const dfid = kgCookieDfid(cookieHeader);
		const buildUrl = (secure) => {
			const u = new URL(`${secure ? "https" : "http"}://userinfo.user.kugou.com/v2/get_user_info`);
			u.searchParams.set("appid", "1005");
			u.searchParams.set("clientver", String(KG_WEB_CLIENTVER));
			u.searchParams.set("mid", mid);
			u.searchParams.set("userid", userId);
			u.searchParams.set("token", token);
			u.searchParams.set("dfid", dfid);
			u.searchParams.set("plat", "0");
			u.searchParams.set("clienttime", String(Date.now()));
			return u.toString();
		};
		const headers = Object.assign({
			"User-Agent": KG_DEMO_UA,
			Accept: "application/json, text/plain, */*"
		}, buildKGRequestHeaders(cookieHeader, token));
		for (const url of [buildUrl(true), buildUrl(false)]) try {
			const body = await kgFetchJSON(url, {
				referer: "https://www.kugou.com/",
				headers
			});
			if (!kgApiBodyOk(body)) continue;
			const data = body.data || body.info;
			if (!data || typeof data !== "object") continue;
			const vip = extractKGVipFromPayload(data);
			return {
				nickname: stripKGHighlightHtml(data.nickname || data.nick_name || data.username || data.user_name || ""),
				avatar: normalizeKGCover(data.pic || data.Pic || data.user_pic || data.avatar || data.userpic || "", 180),
				vipType: vip.vipType,
				isVip: vip.isVip
			};
		} catch (_) {}
		return null;
	}
	async function fetchKGUnionVip(cookieHeader) {
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		const loginPwd = kgCookieLoginPwd(cookieHeader);
		if (!userId || !token) return null;
		const mid = await getKGMid(cookieHeader);
		const dfid = kgCookieDfid(cookieHeader);
		const common = `appid=1005&clientver=9108&mid=${encodeURIComponent(mid)}&userid=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}&dfid=${encodeURIComponent(dfid)}`;
		const pwdPart = loginPwd ? `&pwd=${encodeURIComponent(loginPwd)}&KugooPwd=${encodeURIComponent(loginPwd)}` : "";
		const urls = [
			`https://mobileservice.kugou.com/api/v5/vip_info?${common}${pwdPart}&format=json`,
			`https://mobileservice.kugou.com/api/v5/vip_status?${common}${pwdPart}`,
			`http://mobileservice.kugou.com/api/v5/vip_info?${common}${pwdPart}&format=json`,
			`http://mobileservice.kugou.com/api/v5/vip_status?${common}${pwdPart}`,
			`https://kugouvip.kugou.com/v1/get_union_vip?busi_type=concept&${common}`,
			`https://kugouvip.kugou.com/v1/get_union_vip?busi_type=music&${common}`,
			`https://kugouvip.kugou.com/v1/get_union_vip?${common}`,
			`https://vip.kugou.com/recharge/getUserVip?kugouid=${encodeURIComponent(userId)}&clienttoken=${encodeURIComponent(token)}&appid=1005${loginPwd ? `&KugooPwd=${encodeURIComponent(loginPwd)}` : ""}`,
			`https://mobilecdn.kugou.com/api/v3/user/vip?userid=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}&appid=1005&mid=${encodeURIComponent(mid)}${loginPwd ? `&KugooPwd=${encodeURIComponent(loginPwd)}` : ""}`
		];
		const headers = Object.assign({
			"User-Agent": KG_DEMO_UA,
			Accept: "application/json, text/plain, */*"
		}, buildKGRequestHeaders(cookieHeader, token));
		let best = {
			vipType: 0,
			isVip: false
		};
		for (const url of urls) try {
			const body = await kgFetchJSON(url, {
				referer: "https://www.kugou.com/",
				headers
			});
			if (!body) continue;
			const vip = extractKGVipFromPayload(body.data || body.info || body);
			if (vip.isVip) best = mergeKGVipState(best, vip);
		} catch (_) {}
		return best.isVip ? best : null;
	}
	async function fetchKGMobileVipInfo(cookieHeader) {
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		if (!userId || !token) return null;
		const mid = await getKGMid(cookieHeader);
		const dfid = kgCookieDfid(cookieHeader);
		const common = `userid=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}&appid=1005&clientver=9108&mid=${encodeURIComponent(mid)}&dfid=${encodeURIComponent(dfid)}`;
		const urls = [
			`http://mobilecdn.kugou.com/api/v3/user/vipinfo?${common}`,
			`http://mobileservice.kugou.com/api/v3/user/vip?${common}`,
			`http://mobileservice.kugou.com/api/v5/user/vip?${common}`
		];
		let best = {
			vipType: 0,
			isVip: false
		};
		for (const url of urls) try {
			const body = await kgFetchJSON(url, {
				mobile: true,
				referer: "https://www.kugou.com/",
				headers: buildKGRequestHeaders(cookieHeader, token)
			});
			if (!body) continue;
			const vip = extractKGVipFromPayload(body.data || body.info || body);
			if (vip.isVip) best = mergeKGVipState(best, vip);
		} catch (_) {}
		return best.isVip ? best : null;
	}
	async function getKGLoginStatus(cookieHeader) {
		cookieHeader = cookieHeader || await ensureKGCookie();
		noteLibraryStep("kugou", "platform:ready", { platform: KG_PLATFORM });
		if (kgCookieUserId(cookieHeader) && kgCookieToken(cookieHeader)) try {
			await syncKGVipCacheWithCookie(cookieHeader);
			cookieHeader = await enrichKGCookieHeader((await ensureKGAndroidAuth(cookieHeader, { requireAppToken: true })).cookieHeader || cookieHeader, { preferAppToken: false });
		} catch (_) {
			cookieHeader = await enrichKGCookieHeader(cookieHeader, { preferAppToken: false });
		}
		else cookieHeader = await enrichKGCookieHeader(cookieHeader, { preferAppToken: false });
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		const loggedIn = !!(userId && token);
		const cached = loggedIn ? await loadKGVipSessionCache(userId) : null;
		let nickname = kgCookieNickname(cookieHeader);
		let avatar = kgCookieAvatar(cookieHeader);
		let vipType = kgCookieVipType(cookieHeader) || cached && cached.vipType || 0;
		let isVip = kgCookieHasVipSession(cookieHeader) || !!(cached && cached.isVip);
		let vipLabel = isVip ? cached && cached.vipLabel || "VIP" : "无VIP";
		let expireTime = cached && cached.expireTime || "";
		if (loggedIn) {
			const vipInfo = await resolveKGSessionVip(cookieHeader, {
				vipType,
				isVip,
				vipLabel,
				nickname,
				avatar,
				expireTime
			});
			({vipType, isVip, vipLabel, expireTime} = vipInfo);
			if (vipInfo.nickname) nickname = vipInfo.nickname;
			if (vipInfo.avatar) avatar = vipInfo.avatar;
			rememberKGPlaySession(cookieHeader, {
				loggedIn,
				userId,
				vipType,
				isVip,
				vipLabel,
				vipResolved: true
			});
		}
		return {
			provider: "kg",
			loggedIn,
			hasCookie: !!cookieHeader,
			userId,
			nickname: nickname || (loggedIn ? `酷狗 ${userId}` : "酷狗音乐"),
			avatar,
			vipType,
			isVip,
			vipLevel: isVip ? vipType >= 33 ? "svip" : "vip" : "none",
			vipLabel,
			expireTime,
			hasVipToken: !!resolveKGEffectiveVipToken(cookieHeader, cached),
			session: analyzeKGCookieSession(cookieHeader),
			hasKuGooSession: !!(parseKGCookieObject(cookieHeader).KugooID || parseKGCookieObject(cookieHeader).KugooID),
			message: !loggedIn ? "未检测到酷狗登录 Cookie（需要 KuGoo 或 userid+token）。你目前可能只有统计/路由 Cookie，请在 www.kugou.com 用手机号或微信完整登录。" : !isVip ? "已登录（KuGoo 有效）。PC 站 Cookie 往往不含会员字段，已尝试从酷狗会员接口同步；若仍显示普通账号，请确认会员未过期后点「刷新登录状态」。" : ""
		};
	}
	async function handleKGSearch(keywords, limit, cookieHeader, page) {
		keywords = String(keywords || "").trim();
		limit = Math.max(4, Math.min(30, Number(limit) || 16));
		page = Math.max(1, Number(page) || 1);
		if (!keywords) return [];
		const u = new URL("https://songsearch.kugou.com/song_search_v2");
		u.searchParams.set("keyword", keywords);
		u.searchParams.set("platform", "WebFilter");
		u.searchParams.set("format", "json");
		u.searchParams.set("page", String(page));
		u.searchParams.set("pagesize", String(limit));
		u.searchParams.set("userid", "-1");
		u.searchParams.set("tag", "em");
		u.searchParams.set("filter", "2");
		u.searchParams.set("iscorrection", "1");
		u.searchParams.set("privilege_filter", "0");
		u.searchParams.set("_", String(Date.now()));
		const attempts = [
			{
				headers: {
					Cookie: buildKGLeanCookie(cookieHeader || "") || cookieHeader || "",
					"User-Agent": KG_UA_PC
				},
				mobile: false
			},
			{
				headers: { "User-Agent": KG_UA_MOBILE },
				mobile: true
			},
			{
				headers: {},
				mobile: true
			}
		];
		let list = [];
		for (const attempt of attempts) try {
			const body = await kgFetchJSON(u.toString(), {
				mobile: !!attempt.mobile,
				referer: "https://www.kugou.com/",
				headers: attempt.headers
			});
			list = body && body.data && body.data.lists || body && body.lists || [];
			if (Array.isArray(list) && list.length) break;
		} catch (_) {}
		return list.map((item) => mapKGSong(item, true)).filter((s) => s.hash && s.name);
	}
	async function fetchKGPlayInfo(hash, albumAudioId, cookieHeader) {
		const u = new URL("https://m.kugou.com/app/i/getSongInfo.php");
		u.searchParams.set("cmd", "playInfo");
		u.searchParams.set("hash", String(hash || "").trim());
		if (albumAudioId) u.searchParams.set("album_audio_id", String(albumAudioId));
		return kgFetchJSON(u.toString(), {
			mobile: true,
			referer: "https://m.kugou.com/",
			headers: buildKGRequestHeaders(cookieHeader)
		});
	}
	async function fetchKGTrackerOnce(host, vipType, hash, albumId, albumAudioId, cookieHeader) {
		cookieHeader = await enrichKGCookieHeader(cookieHeader);
		const userId = kgCookieUserId(cookieHeader) || "0";
		const token = kgCookieToken(cookieHeader) || "";
		const mid = await getKGMid(cookieHeader);
		const key = buildKGTrackerKey(hash, mid, userId);
		const audioId = String(albumAudioId || "0");
		const dfid = kgCookieDfid(cookieHeader);
		const cached = await loadKGVipSessionCache(userId);
		const vipToken = resolveKGEffectiveVipToken(cookieHeader, cached);
		const u = new URL(`${host}/i/v2/`);
		u.searchParams.set("cmd", "26");
		u.searchParams.set("key", key);
		u.searchParams.set("hash", hash);
		u.searchParams.set("behavior", "play");
		u.searchParams.set("mid", mid);
		u.searchParams.set("dfid", dfid);
		u.searchParams.set("appid", "1005");
		u.searchParams.set("userid", userId);
		u.searchParams.set("version", "9108");
		u.searchParams.set("vipType", vipType);
		u.searchParams.set("token", token);
		if (vipToken) u.searchParams.set("vip_token", vipToken);
		u.searchParams.set("album_id", albumId || "0");
		u.searchParams.set("album_audio_id", audioId);
		u.searchParams.set("area_code", "1");
		u.searchParams.set("pid", "2");
		u.searchParams.set("pidversion", "3001");
		u.searchParams.set("with_res_tag", "1");
		const trackerHost = u.host;
		const trackerStartedAt = Date.now();
		noteLibraryStep("kugou", "url:http:start", {
			name: "tracker",
			host: trackerHost,
			vipType
		});
		let body = null;
		try {
			body = await kgFetchJSON(u.toString(), {
				mobile: true,
				referer: "https://www.kugou.com/",
				headers: buildKGRequestHeaders(cookieHeader, token)
			});
		} catch (error) {
			noteLibraryStep("kugou", "url:http:error", {
				name: "tracker",
				host: trackerHost,
				ms: Date.now() - trackerStartedAt,
				error: error instanceof Error ? error.message : String(error)
			});
			throw error;
		}
		noteLibraryStep("kugou", "url:http:done", {
			name: "tracker",
			host: trackerHost,
			ms: Date.now() - trackerStartedAt,
			status: Number(body && body.status) || 0
		});
		const url = parseKGPlayUrl(body);
		const status = Number(body && body.status) || 0;
		if (url) {
			const harvested = harvestKGVipToken(body);
			if (harvested || Number(vipType) > 0) await saveKGVipSessionCache(userId, {
				vipToken: harvested || vipToken,
				vipType: Number(vipType) || 6,
				isVip: true
			});
		}
		return {
			url,
			status,
			blocked: status === 2,
			vipType
		};
	}
	async function fetchKGTrackerUrl(hash, albumId, albumAudioId, cookieHeader, loginVipType) {
		hash = String(hash || "").trim().toLowerCase();
		if (!hash) return {
			url: "",
			status: 0,
			blocked: false
		};
		const cached = await loadKGVipSessionCache(kgCookieUserId(cookieHeader));
		const hasVipEntitlement = Number(loginVipType) > 0 || kgCookieVipType(cookieHeader) > 0 || !!resolveKGEffectiveVipToken(cookieHeader, cached);
		let lastStatus = 0;
		const fastVipTypes = hasVipEntitlement ? buildKGTrackerFastVipTypes(cookieHeader, loginVipType) : ["0"];
		const fastTasks = [];
		KG_TRACKER_FAST_HOSTS.forEach((host) => {
			fastVipTypes.forEach((vipType) => {
				fastTasks.push(() => fetchKGTrackerOnce(host, vipType, hash, albumId, albumAudioId, cookieHeader).then((result) => {
					if (Number(result && result.status) > 0) lastStatus = Number(result.status);
					return result;
				}));
			});
		});
		const fastHit = await raceKGPlayTasks(fastTasks, (result) => result && result.url ? result : null);
		if (fastHit) return fastHit;
		const tried = /* @__PURE__ */ new Set();
		KG_TRACKER_FAST_HOSTS.forEach((host) => {
			fastVipTypes.forEach((vipType) => tried.add(`${host}|${vipType}`));
		});
		const fallbackTasks = [];
		const fallbackVipTypes = hasVipEntitlement ? buildKGTrackerVipTypeCandidates(cookieHeader, loginVipType) : ["0"];
		for (const host of KG_TRACKER_HOSTS) for (const vipType of fallbackVipTypes) {
			const key = `${host}|${vipType}`;
			if (tried.has(key)) continue;
			tried.add(key);
			fallbackTasks.push(() => fetchKGTrackerOnce(host, vipType, hash, albumId, albumAudioId, cookieHeader).then((result) => {
				if (Number(result && result.status) > 0) lastStatus = Number(result.status);
				return result;
			}));
		}
		const fallbackHit = await raceKGPlayTasks(fallbackTasks, (result) => result && result.url ? result : null);
		if (fallbackHit) return fallbackHit;
		return {
			url: "",
			status: lastStatus,
			blocked: lastStatus === 2
		};
	}
	/**
	* 单条取链策略的兜底时限。
	*
	* raceKGPlayTasks 只在「拿到地址」时提前返回，四条都没拿到就要等它们全部结束；其中任何一条卡在
	* 一个不响应的 CDN 上（安卓这边要等 OkHttp 的 45s 读超时，甚至叠加多次尝试），整个取链就一直
	* 不返回，界面永远停在「正在获取歌曲链接...」。这里给每条策略一个上限，并逐条记进诊断轨迹，
	* 这样既能保证一定会返回，也能看出是哪一条拖住了。
	*/
	const KG_PLAY_STRATEGY_DEADLINE_MS = 9e3;
	const KG_FAST_SONG_URL_DEADLINE_MS = 1500;
	async function runKGPlayStrategy(name, run, deadlineMs = KG_PLAY_STRATEGY_DEADLINE_MS) {
		const startedAt = Date.now();
		noteLibraryStep("kugou", "url:strategy:start", { name });
		let timer = null;
		try {
			const result = await Promise.race([Promise.resolve().then(run), new Promise((resolve) => {
				timer = setTimeout(() => resolve({ __timedOut: true }), deadlineMs);
			})]);
			const ms = Date.now() - startedAt;
			if (result && result.__timedOut) {
				noteLibraryStep("kugou", "url:strategy:timeout", {
					name,
					ms
				});
				return null;
			}
			noteLibraryStep("kugou", "url:strategy:done", {
				name,
				ms,
				hasUrl: Boolean(result && result.url)
			});
			return result;
		} catch (error) {
			noteLibraryStep("kugou", "url:strategy:error", {
				name,
				ms: Date.now() - startedAt,
				error: error instanceof Error ? error.message : String(error)
			});
			return null;
		} finally {
			if (timer) clearTimeout(timer);
		}
	}
	const kgPlayUrlResolutionInFlight = /* @__PURE__ */ new Map();
	async function resolveKGSongPlayUrlUncached(hash, albumId, albumAudioId, cookieHeader, login, qualityCode) {
		const vipType = login && login.vipType;
		const q = Number(qualityCode) || 128;
		const cached = await loadKGVipSessionCache(kgCookieUserId(cookieHeader));
		noteLibraryStep("kugou", "url:fast-attempt", { hasVipEntitlement: Number(vipType) > 0 || !!resolveKGEffectiveVipToken(cookieHeader, cached) });
		const fastHit = await runKGPlayStrategy("lite-v5", () => fetchKGAndroidFastSongUrl(hash, albumId, albumAudioId, cookieHeader, vipType, q).then((url) => url ? {
			url,
			source: "android-fast-v5"
		} : null), KG_FAST_SONG_URL_DEADLINE_MS);
		if (fastHit && fastHit.url) return fastHit;
		const preferredHit = await raceKGPlayTasks([() => runKGPlayStrategy("v5", () => fetchKGTrackerV5Url(hash, albumId, albumAudioId, cookieHeader, vipType, q).then((result) => result.url ? {
			url: result.url,
			source: "v5",
			tracker: result
		} : null)), () => runKGPlayStrategy("playInfo", () => fetchKGPlayInfo(hash, albumAudioId, cookieHeader).then((info) => {
			const url = pickPlayInfoUrl(info);
			return url ? {
				url,
				source: "playInfo"
			} : null;
		}))], (result) => result);
		if (preferredHit && preferredHit.url) return preferredHit;
		return raceKGPlayTasks([() => runKGPlayStrategy("getdata", () => fetchKGPlayGetData(hash, albumId, albumAudioId, cookieHeader, vipType).then((url) => url ? {
			url,
			source: "getdata"
		} : null)), () => runKGPlayStrategy("tracker", () => fetchKGTrackerUrl(hash, albumId, albumAudioId, cookieHeader, vipType).then((result) => result.url ? {
			url: result.url,
			source: "tracker",
			tracker: result
		} : null))], (result) => result);
	}
	async function resolveKGSongPlayUrl(hash, albumId, albumAudioId, cookieHeader, login, qualityCode) {
		const cacheKey = [
			String(hash || "").trim().toLowerCase(),
			String(albumId || ""),
			String(albumAudioId || ""),
			Number(qualityCode) || 128,
			buildKGSessionCacheKey(cookieHeader)
		].join("|");
		const existing = kgPlayUrlResolutionInFlight.get(cacheKey);
		if (existing) return existing;
		const request = resolveKGSongPlayUrlUncached(hash, albumId, albumAudioId, cookieHeader, login, qualityCode);
		kgPlayUrlResolutionInFlight.set(cacheKey, request);
		try {
			return await request;
		} finally {
			if (kgPlayUrlResolutionInFlight.get(cacheKey) === request) kgPlayUrlResolutionInFlight.delete(cacheKey);
		}
	}
	async function fetchKGPlayGetData(hash, albumId, albumAudioId, cookieHeader, loginVipType) {
		hash = String(hash || "").trim().toLowerCase();
		if (!hash) return "";
		cookieHeader = await enrichKGCookieHeader(cookieHeader);
		const userId = kgCookieUserId(cookieHeader) || "0";
		const token = kgCookieToken(cookieHeader) || "";
		const mid = await getKGMid(cookieHeader);
		const dfid = kgCookieDfid(cookieHeader);
		const cached = await loadKGVipSessionCache(userId);
		const vipToken = resolveKGEffectiveVipToken(cookieHeader, cached);
		const u = new URL("https://wwwapi.kugou.com/yy/index.php");
		u.searchParams.set("r", "play/getdata");
		u.searchParams.set("hash", hash);
		u.searchParams.set("album_id", albumId || "0");
		if (albumAudioId) u.searchParams.set("album_audio_id", String(albumAudioId));
		u.searchParams.set("mid", mid);
		u.searchParams.set("dfid", dfid);
		u.searchParams.set("platid", "4");
		u.searchParams.set("from", "mkugou");
		if (token) {
			u.searchParams.set("appid", String(KG_ANDROID_APPID));
			u.searchParams.set("clientver", String(KG_ANDROID_CLIENTVER));
			u.searchParams.set("userid", userId);
			u.searchParams.set("token", token);
			u.searchParams.set("vipType", resolveKGTrackerVipType(cookieHeader, loginVipType || cached && cached.vipType));
			if (vipToken) u.searchParams.set("vip_token", vipToken);
		}
		try {
			const body = await kgFetchJSON(u.toString(), {
				referer: "https://www.kugou.com/",
				headers: buildKGRequestHeaders(cookieHeader, token)
			});
			const data = body && body.data;
			const url = data && (data.play_url || data.play_backup_url || data.playUrl || data.url);
			if (typeof url === "string" && url) {
				const harvested = harvestKGVipToken(body);
				if (harvested || Number(data && data.privilege) > 0) await saveKGVipSessionCache(userId, {
					vipToken: harvested || vipToken,
					vipType: Number(resolveKGTrackerVipType(cookieHeader, loginVipType)) || 6,
					isVip: true
				});
				return url;
			}
			if (Array.isArray(url) && url[0]) return url[0];
		} catch (_) {}
		return "";
	}
	/** Only scheme + host: play urls carry signed paths and tokens, so the report must not quote them. */
	function describeKGSchemeAndHost(url) {
		try {
			const parsed = new URL(String(url || ""), "https://www.kugou.com/");
			return `${parsed.protocol}//${parsed.host}`;
		} catch (_) {
			return "unparseable";
		}
	}
	function normalizePlayUrl(url) {
		url = String(url || "").trim();
		if (!url) return "";
		if (/^https?:\/\//i.test(url)) return url;
		if (url.startsWith("//")) return "http:" + url;
		if (url.startsWith("/")) return "http://fs.open.kugou.com" + url;
		return "http://fs.open.kugou.com/" + url.replace(/^\/+/, "");
	}
	async function handleKGSongUrl(hash, albumId, albumAudioId, quality, cookieHeader, qualityHashes) {
		hash = String(hash || "").trim().toLowerCase();
		albumId = String(albumId || "").trim();
		albumAudioId = String(albumAudioId || "").trim();
		qualityHashes = qualityHashes || {};
		const hash320 = String(qualityHashes.hash320 || "").trim().toLowerCase();
		const hashSq = String(qualityHashes.hashSq || "").trim().toLowerCase();
		if (!hash) return {
			provider: "kg",
			url: "",
			playable: false,
			error: "MISSING_HASH",
			message: "Missing Kugou song hash"
		};
		cookieHeader = cookieHeader || await getKGCookie();
		await syncKGVipCacheWithCookie(cookieHeader);
		const loginBeforeVip = await getKGPlayContext(cookieHeader);
		const vipTokenBefore = !!resolveKGEffectiveVipToken(cookieHeader, await loadKGVipSessionCache(loginBeforeVip.userId));
		const shouldFetchVipToken = loginBeforeVip.loggedIn && !vipTokenBefore && Date.now() - kgVipTokenRefreshAt > KG_VIP_TOKEN_REFRESH_INTERVAL_MS;
		if (shouldFetchVipToken) {
			kgVipTokenRefreshAt = Date.now();
			noteLibraryStep("kugou", "auth:vip-token:refresh", { userId: String(loginBeforeVip.userId || "").slice(0, 6) });
		}
		const auth = await ensureKGAndroidAuth(cookieHeader, {
			requireAppToken: true,
			force: shouldFetchVipToken
		});
		cookieHeader = auth.cookieHeader || await enrichKGCookieHeader(cookieHeader, { preferAppToken: true });
		const requestedQuality = normalizeQualityPreference(quality);
		const extra = { "128hash": hash };
		if (hash320) extra["320hash"] = hash320;
		if (hashSq) extra.sqhash = hashSq;
		const desiredLevel = qualityCandidatesFrom(requestedQuality, KG_QUALITY_OPTIONS).map((item) => item.level)[0] || "standard";
		if (!extractKGQualityMap(extra, hash)[desiredLevel]) try {
			const playInfo = await fetchKGPlayInfo(hash, albumAudioId, cookieHeader);
			Object.assign(extra, playInfo && playInfo.extra || {});
			if (playInfo && playInfo.hash) extra["128hash"] = String(playInfo.hash).trim().toLowerCase();
			if (!albumAudioId && playInfo) albumAudioId = String(playInfo.mixsongid || playInfo.album_audio_id || playInfo.audio_id || "").trim();
			if (!albumId && playInfo) albumId = String(playInfo.albumid || playInfo.album_id || "").trim();
		} catch (_) {}
		const picked = pickKGHashForQuality(extra, hash, requestedQuality);
		const playHash = picked.hash;
		if (!playHash) return {
			provider: "kg",
			url: "",
			playable: false,
			error: "MISSING_HASH",
			message: "Missing Kugou song hash"
		};
		const qualityCode = picked.level === "lossless" ? "flac" : picked.level === "exhigh" ? 320 : 128;
		const cacheKey = buildKGPlayUrlCacheKey(playHash, albumId, albumAudioId, picked.level);
		const login = await getKGPlayContext(cookieHeader);
		const hasVipToken = !!resolveKGEffectiveVipToken(cookieHeader, await loadKGVipSessionCache(login.userId));
		const successPayload = (url, source) => ({
			provider: "kg",
			url: normalizePlayUrl(url),
			playable: true,
			loggedIn: login.loggedIn,
			isVip: login.isVip,
			vipType: login.vipType,
			vipLabel: login.vipLabel,
			hasVipToken,
			level: picked.level,
			quality: picked.label,
			br: picked.br,
			requestedQuality,
			playHash,
			source
		});
		const cachedUrl = readKGPlayUrlCache(cacheKey);
		if (cachedUrl) return successPayload(cachedUrl, "cache");
		let trackerResult = {
			url: "",
			status: 0,
			blocked: false
		};
		const resolveStartedAt = Date.now();
		noteLibraryStep("kugou", "url:start", {
			hash: playHash.slice(0, 8),
			quality: qualityCode,
			level: picked.level,
			loggedIn: login.loggedIn,
			isVip: login.isVip
		});
		try {
			const hit = await resolveKGSongPlayUrl(playHash, albumId, albumAudioId, cookieHeader, login, qualityCode);
			if (hit && hit.url) {
				writeKGPlayUrlCache(cacheKey, hit.url);
				if (hit.tracker) trackerResult = hit.tracker;
				noteLibraryStep("kugou", "url:hit", {
					source: hit.source,
					ms: Date.now() - resolveStartedAt,
					target: describeKGSchemeAndHost(hit.url)
				});
				return successPayload(hit.url, hit.source);
			}
			if (hit && hit.tracker) trackerResult = hit.tracker;
			noteLibraryStep("kugou", "url:miss", {
				ms: Date.now() - resolveStartedAt,
				status: trackerResult.status || 0,
				blocked: !!trackerResult.blocked,
				loggedIn: login.loggedIn
			});
			const currentVipToken = !!resolveKGEffectiveVipToken(cookieHeader, await loadKGVipSessionCache(login.userId));
			const retryMayRecoverVip = login.loggedIn && (!auth.refreshed || currentVipToken || Number(login.vipType) > 0);
			if ((trackerResult.blocked || trackerResult.status === 2 || !hit || !hit.url) && retryMayRecoverVip) {
				if (!auth.refreshed) cookieHeader = (await ensureKGAndroidAuth(cookieHeader, {
					force: true,
					requireAppToken: true
				})).cookieHeader || cookieHeader;
				else {
					await clearKGVipAppToken(login.userId);
					cookieHeader = (await ensureKGAndroidAuth(cookieHeader, {
						force: true,
						requireAppToken: true
					})).cookieHeader || cookieHeader;
				}
				const retry = await resolveKGSongPlayUrl(playHash, albumId, albumAudioId, cookieHeader, login, qualityCode);
				if (retry && retry.url) {
					writeKGPlayUrlCache(cacheKey, retry.url);
					noteLibraryStep("kugou", "url:hit", {
						source: `${retry.source}+auth-retry`,
						ms: Date.now() - resolveStartedAt,
						target: describeKGSchemeAndHost(retry.url)
					});
					return successPayload(retry.url, retry.source);
				}
				if (retry && retry.tracker) trackerResult = retry.tracker;
				noteLibraryStep("kugou", "url:retry-miss", {
					ms: Date.now() - resolveStartedAt,
					status: trackerResult.status || 0,
					blocked: !!trackerResult.blocked
				});
			} else if ((trackerResult.blocked || trackerResult.status === 2 || !hit || !hit.url) && login.loggedIn) noteLibraryStep("kugou", "url:retry-skip", {
				reason: "no-vip-entitlement-after-refresh",
				hasVipToken: currentVipToken,
				vipType: Number(login.vipType) || 0
			});
		} catch (_) {}
		const likelyVipSong = trackerResult.blocked || trackerResult.status === 2 || trackerResult.status === 2;
		const vipCacheNow = await loadKGVipSessionCache(login.userId);
		const vipTokenNow = !!resolveKGEffectiveVipToken(cookieHeader, vipCacheNow);
		const hasAppToken = !!(vipCacheNow && vipCacheNow.appToken);
		noteLibraryStep("kugou", "url:fail", {
			ms: Date.now() - resolveStartedAt,
			error: !login.loggedIn ? "LOGIN_REQUIRED" : likelyVipSong ? "VIP_REQUIRED" : "URL_UNAVAILABLE",
			trackerStatus: trackerResult.status || 0,
			loggedIn: login.loggedIn,
			hasVipToken: vipTokenNow,
			hasAppToken
		});
		return {
			provider: "kg",
			url: "",
			playable: false,
			loggedIn: login.loggedIn,
			isVip: login.isVip,
			vipType: login.vipType,
			vipLabel: login.vipLabel,
			hasVipToken: vipTokenNow,
			hasAppToken,
			error: !login.loggedIn ? "LOGIN_REQUIRED" : likelyVipSong ? "VIP_REQUIRED" : "URL_UNAVAILABLE",
			reason: !login.loggedIn ? "login_required" : likelyVipSong ? "vip_required" : "url_unavailable",
			message: !login.loggedIn ? "酷狗会员歌曲需要登录后播放" : likelyVipSong ? vipTokenNow ? "酷狗会员歌曲取链失败。请确认会员未过期，或在官网重新登录后再试" : "未拿到 vip_token（网页 Cookie 换安卓凭证失败）。请在 www.kugou.com 重新完整登录后点「刷新登录状态」" : "酷狗未返回播放地址，请确认账号会员有效并在官网重新登录",
			trackerStatus: trackerResult.status || 0
		};
	}
	function decodeKGLyricContent(content) {
		content = String(content || "").trim();
		if (!content) return "";
		try {
			if (!content.includes("[") && /^[A-Za-z0-9+/=\s]+$/.test(content)) {
				const bin = atob(content.replace(/\s+/g, ""));
				let decoded = "";
				try {
					decoded = decodeURIComponent(escape(bin));
				} catch (_) {
					decoded = bin;
				}
				if (decoded && (decoded.includes("[") || /[\u4e00-\u9fa5]/.test(decoded))) return decoded;
			}
		} catch (_) {}
		return content;
	}
	function isValidKGLyricText(text) {
		const t = String(text || "").trim();
		if (!t || t.length < 8) return false;
		if (/no action found|not found|找不到|暂无歌词|<html|<!doctype/i.test(t)) return false;
		return /\[\d{1,2}:\d{1,2}(?:\.\d{1,3})?\]/.test(t);
	}
	async function searchKGLyricCandidates(hash, albumAudioId, durationMs, keyword) {
		const keywordText = String(keyword || "").trim();
		const attempts = [
			{
				url: "https://krcs.kugou.com/search",
				params: {
					ver: "1",
					man: "yes",
					client: "mobi",
					keyword: keywordText,
					hash: hash || "",
					album_audio_id: albumAudioId || "",
					duration: durationMs ? String(durationMs) : "",
					lrctxt: "1"
				}
			},
			{
				url: "https://lyrics.kugou.com/v1/search",
				params: {
					ver: "1",
					man: "yes",
					client: "pc",
					keyword: keywordText || hash || "",
					hash: hash || "",
					album_audio_id: albumAudioId || "0",
					duration: durationMs ? String(durationMs) : "0",
					lrctxt: "1"
				}
			},
			keywordText ? {
				url: "https://krcs.kugou.com/search",
				params: {
					ver: "1",
					man: "yes",
					client: "pc",
					keyword: keywordText,
					hash: "",
					duration: durationMs ? String(durationMs) : "",
					lrctxt: "1"
				}
			} : null
		].filter(Boolean);
		for (const attempt of attempts) try {
			const u = new URL(attempt.url);
			Object.keys(attempt.params).forEach((key) => {
				if (attempt.params[key] !== "" && attempt.params[key] != null) u.searchParams.set(key, String(attempt.params[key]));
			});
			const search = await kgFetchJSON(u.toString(), {
				mobile: true,
				referer: "https://www.kugou.com/",
				headers: { "User-Agent": KG_UA_MOBILE }
			});
			const list = search && (search.candidates || search.data && search.data.candidates) || [];
			if (Array.isArray(list) && list.length) return list;
		} catch (_) {}
		return [];
	}
	async function downloadKGLyricByCandidate(candidate) {
		if (!candidate || !candidate.id || !candidate.accesskey) return "";
		for (const base of ["https://lyrics.kugou.com/download", "http://lyrics.kugou.com/download"]) try {
			const dl = new URL(base);
			dl.searchParams.set("ver", "1");
			dl.searchParams.set("client", "pc");
			dl.searchParams.set("id", String(candidate.id));
			dl.searchParams.set("accesskey", String(candidate.accesskey));
			dl.searchParams.set("fmt", "lrc");
			dl.searchParams.set("charset", "utf8");
			const body = await kgFetchJSON(dl.toString(), {
				referer: "https://www.kugou.com/",
				headers: { "User-Agent": KG_UA_PC }
			});
			const lyric = decodeKGLyricContent(body && (body.content || body.data && body.data.content));
			if (isValidKGLyricText(lyric)) return lyric;
		} catch (_) {}
		return "";
	}
	/**
	* KuGouMusicApi `/user/playlist`
	* POST gateway `/v7/get_all_list` (+ type 0/1 fallbacks)
	* Requires android token (appid=1005). Web cookie token alone → error 20017.
	*/
	async function fetchKGUserPlaylistOfficial(cookieHeader, page, pagesize, opts) {
		opts = opts || {};
		const preferApp = opts.preferAppToken !== false;
		cookieHeader = await enrichKGCookieHeader(cookieHeader, { preferAppToken: preferApp });
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		if (!userId || !token) return {
			ok: false,
			lists: [],
			attempts: [],
			error: "NOT_LOGGED_IN"
		};
		page = Math.max(1, Number(page) || 1);
		pagesize = Math.max(1, Math.min(100, Number(pagesize) || 50));
		const attempts = [];
		const merged = [];
		const seen = /* @__PURE__ */ new Set();
		const endpoints = [{
			base: "https://gateway.kugou.com",
			path: "/v7/get_all_list"
		}, {
			base: KG_CLOUDLIST_GATEWAY,
			path: "/v7/get_all_list"
		}];
		for (const listType of [
			2,
			0,
			1
		]) {
			for (let p = page; p <= page + 8; p += 1) {
				let pageLists = [];
				let pageOk = false;
				for (const endpoint of endpoints) try {
					const body = await kgPostAndroidSigned(endpoint.base, endpoint.path, cookieHeader, {
						userid: userId,
						token,
						total_ver: 979,
						type: listType,
						page: p,
						pagesize
					}, {
						plat: 1,
						userid: Number(userId) || userId,
						token
					}, KG_CLOUDLIST_ROUTER, { preferAppToken: preferApp });
					const lists = extractKGCloudLists(body);
					attempts.push({
						path: `${endpoint.base}${endpoint.path}`,
						page: p,
						type: listType,
						ok: kgCloudlistOk(body),
						status: body && body.status,
						error_code: body && body.error_code,
						count: Array.isArray(lists) ? lists.length : 0
					});
					if (Array.isArray(lists) && lists.length) {
						pageLists = lists.map((item) => Object.assign({}, item, { type: item.type != null ? item.type : listType }));
						pageOk = true;
						break;
					}
					if (kgCloudlistOk(body)) {
						pageOk = true;
						pageLists = [];
						break;
					}
				} catch (err) {
					attempts.push({
						path: `${endpoint.base}${endpoint.path}`,
						page: p,
						type: listType,
						ok: false,
						error: err && err.message ? err.message : String(err || "error")
					});
				}
				if (!pageOk && !pageLists.length) break;
				pageLists.forEach((item) => {
					const key = String(kgPlaylistListId(item) || kgPlaylistGlobalId(item) || item.specialid || item.id || "");
					if (!key || seen.has(key)) return;
					seen.add(key);
					merged.push(item);
				});
				if (pageLists.length < pagesize) break;
			}
			if (listType === 2 && merged.length) break;
		}
		return {
			ok: merged.length > 0,
			lists: merged,
			attempts,
			error: merged.length ? "" : "KG_PLAYLIST_EMPTY"
		};
	}
	async function fetchKGWebSignedLists(cookieHeader) {
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieWebToken(cookieHeader) || kgCookieToken(cookieHeader);
		cookieHeader = await enrichKGCookieHeader(cookieHeader, { preferAppToken: false });
		if (!userId || !token) return {
			lists: [],
			attempts: []
		};
		const mid = await getKGMid(cookieHeader);
		const dfid = kgCookieDfid(cookieHeader) || "-";
		const leanCookie = buildKGLeanCookie(cookieHeader);
		const attempts = [];
		const merged = /* @__PURE__ */ new Map();
		for (const endpoint of [
			{
				base: "https://wwwapi.kugou.com",
				path: "/cloudlist.service/v1/get_all_list",
				appid: 1014,
				clientver: 9003
			},
			{
				base: "https://wwwapi.kugou.com",
				path: "/cloudlist/v1/get_all_list",
				appid: 1014,
				clientver: 9003
			},
			{
				base: "https://gateway.kugou.com",
				path: "/cloudlist.service/v1/get_all_list",
				appid: 1014,
				clientver: 9003
			}
		]) {
			for (const listType of [
				2,
				0,
				1
			]) try {
				const clienttime = Math.floor(Date.now() / 1e3);
				const params = {
					appid: endpoint.appid,
					clientver: endpoint.clientver,
					clienttime,
					mid,
					uuid: mid,
					dfid,
					userid: userId,
					token,
					type: listType,
					page: 1,
					pagesize: 100,
					plat: 1
				};
				params.signature = signatureKGWebParams(params);
				const qs = Object.keys(params).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");
				const body = await kgFetchJSON(`${endpoint.base}${endpoint.path}?${qs}`, {
					referer: "https://www.kugou.com/",
					headers: {
						Cookie: leanCookie,
						"User-Agent": KG_UA_PC,
						Accept: "application/json, text/plain, */*"
					}
				});
				const lists = extractKGCloudLists(body);
				attempts.push({
					path: `${endpoint.base}${endpoint.path}`,
					type: listType,
					ok: kgCloudlistOk(body) || !!(lists && lists.length),
					status: body && body.status,
					error_code: body && (body.error_code || body.errcode || body.error),
					count: Array.isArray(lists) ? lists.length : 0
				});
				(Array.isArray(lists) ? lists : []).forEach((item) => {
					const pl = mapKGPlaylist(Object.assign({}, item, { type: item.type != null ? item.type : listType }), userId);
					if (!keepKGUserPlaylist(pl, userId)) return;
					const key = String(pl.listId || pl.globalCollectionId || pl.id);
					const prev = merged.get(key);
					if (!prev) merged.set(key, pl);
					else merged.set(key, Object.assign({}, prev, pl, {
						trackCount: Math.max(prev.trackCount || 0, pl.trackCount || 0),
						subscribed: !!(prev.subscribed || pl.subscribed),
						isFavorite: !!(prev.isFavorite || pl.isFavorite)
					}));
				});
			} catch (err) {
				attempts.push({
					path: `${endpoint.base}${endpoint.path}`,
					type: listType,
					ok: false,
					error: err && err.message ? err.message : String(err || "error")
				});
			}
			if (merged.size) break;
		}
		return {
			lists: Array.from(merged.values()),
			attempts
		};
	}
	async function fetchKGPlaylistCoverFromTracks(listId, globalCollectionId, cookieHeader) {
		listId = String(listId || "").trim();
		globalCollectionId = String(globalCollectionId || "").trim();
		const pickCover = (arr) => {
			for (const item of Array.isArray(arr) ? arr : []) {
				const song = item && item.hash ? item : mapKGSong(item, false);
				const cover = normalizeKGCover(song && song.cover || extractKGCover(item, 240), 240);
				if (cover) return cover;
			}
			return "";
		};
		cookieHeader = await enrichKGCookieHeader(cookieHeader, { preferAppToken: true });
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		if (listId && userId && token) try {
			const cover = pickCover(extractKGCloudLists(await kgPostAndroidSigned("https://gateway.kugou.com", "/v4/get_list_all_file", cookieHeader, {
				listid: Number(listId) || listId,
				userid: Number(userId) || userId,
				token,
				area_code: 1,
				show_relate_goods: 0,
				pagesize: 8,
				allplatform: 1,
				show_cover: 1,
				type: 0,
				page: 1
			}, {}, KG_CLOUDLIST_ROUTER, { preferAppToken: true })));
			if (cover) return cover;
		} catch (_) {}
		if (globalCollectionId) try {
			const cover = pickCover(extractKGCloudLists(await kgFetchAndroidSigned("https://gateway.kugou.com", "/pubsongs/v2/get_other_list_file_nofilt", cookieHeader, {
				area_code: 1,
				begin_idx: 0,
				plat: 1,
				type: 1,
				mode: 1,
				personal_switch: 1,
				pagesize: 8,
				global_collection_id: globalCollectionId
			}, {})));
			if (cover) return cover;
		} catch (_) {}
		return "";
	}
	async function enrichKGFavoritePlaylist(playlists, cookieHeader, userId) {
		let list = (Array.isArray(playlists) ? playlists : []).filter((pl) => keepKGUserPlaylist(pl, userId));
		const favCandidates = list.filter((pl) => pl && (pl.isFavorite || isKGFavoriteName(pl.name) || String(pl.listId) === "2" || String(pl.id) === "2"));
		let bestFav = pickKGFavoriteList(favCandidates.map((pl) => ({
			name: pl.name,
			listid: pl.listId || pl.id,
			count: pl.trackCount,
			is_default: pl.isFavorite ? 1 : 0,
			is_favorite: pl.isFavorite ? 1 : 0,
			type: pl.listType,
			global_collection_id: pl.globalCollectionId
		})));
		let realFavId = String(kgPlaylistListId(bestFav) || bestFav && (bestFav.listid || bestFav.listId) || "").trim();
		let realFavCount = kgPlaylistSongCount(bestFav);
		let realFavGlobal = String(bestFav && (bestFav.global_collection_id || bestFav.globalCollectionId) || "").trim();
		if (!realFavId) try {
			realFavId = String(await fetchKGFavoriteListId(cookieHeader, true) || "").trim();
		} catch (_) {}
		if (!realFavId && favCandidates.length) {
			favCandidates.sort((a, b) => (Number(b.trackCount) || 0) - (Number(a.trackCount) || 0));
			realFavId = String(favCandidates[0].listId || favCandidates[0].id || "").trim();
			realFavCount = Number(favCandidates[0].trackCount) || 0;
			realFavGlobal = String(favCandidates[0].globalCollectionId || "").trim();
		}
		if (!realFavGlobal && realFavId && userId) realFavGlobal = `collection_3_${userId}_${realFavId}_0`;
		if (realFavId) {
			let cover = (favCandidates.find((pl) => pl.cover) || {}).cover || "";
			const maxCount = Math.max(realFavCount, ...favCandidates.map((pl) => Number(pl.trackCount) || 0), 0);
			const creator = (favCandidates.find((pl) => pl.creator) || {}).creator || "酷狗音乐";
			if (!cover && maxCount > 0) try {
				cover = await fetchKGPlaylistCoverFromTracks(realFavId, realFavGlobal, cookieHeader);
			} catch (_) {}
			list = list.filter((pl) => !(pl && (pl.isFavorite || isKGFavoriteName(pl.name) || String(pl.listId) === "2" || String(pl.id) === "2")));
			list.unshift({
				provider: "kg",
				source: "kg",
				type: "playlist",
				id: realFavId,
				listId: realFavId,
				globalCollectionId: realFavGlobal,
				name: "我喜欢",
				cover,
				trackCount: maxCount,
				creator,
				ownerId: String(userId || ""),
				subscribed: false,
				isFavorite: true,
				listType: 0,
				ownedByMe: true
			});
		}
		list.sort((a, b) => {
			const af = Number(!!(a && a.isFavorite));
			const bf = Number(!!(b && b.isFavorite));
			if (af !== bf) return bf - af;
			const as = Number(!!(a && a.subscribed));
			const bs = Number(!!(b && b.subscribed));
			if (as !== bs) return as - bs;
			return 0;
		});
		return list;
	}
	function summarizeKGPlaylistAttempts(attempts) {
		const fails = (attempts || []).filter((a) => a && !a.ok).slice(0, 3);
		if (!fails.length) return "";
		return fails.map((a) => {
			const code = a.error_code != null ? a.error_code : a.error || a.status || "?";
			return `${a.path || "api"}@t${a.type}:${code}`;
		}).join(" | ");
	}
	async function handleKGUserPlaylists(cookieHeader) {
		cookieHeader = cookieHeader || await getKGCookie();
		await syncKGVipCacheWithCookie(cookieHeader);
		const userId = kgCookieUserId(cookieHeader);
		const webToken = kgCookieWebToken(cookieHeader) || kgCookieToken(cookieHeader);
		if (!userId || !webToken) return {
			provider: "kg",
			loggedIn: false,
			playlists: [],
			message: "未登录酷狗，无法获取歌单"
		};
		const cachedAuth = await loadKGVipSessionCache(userId);
		const auth = await ensureKGAndroidAuth(cookieHeader, {
			requireAppToken: true,
			force: !(cachedAuth && cachedAuth.appToken && cachedAuth.sourceToken === webToken)
		});
		cookieHeader = auth.cookieHeader || cookieHeader;
		const hasAppToken = !!(auth && auth.hasAppToken);
		let playlists = [];
		let source = "empty";
		let attempts = [];
		attempts.push({
			path: "login_by_token",
			type: "-",
			ok: hasAppToken,
			error_code: hasAppToken ? 0 : "NO_APP_TOKEN"
		});
		if (hasAppToken) try {
			const official = await fetchKGUserPlaylistOfficial(cookieHeader, 1, 50, { preferAppToken: true });
			attempts = attempts.concat(official.attempts || []);
			playlists = (official.lists || []).map((item) => mapKGPlaylist(item, userId)).filter((pl) => keepKGUserPlaylist(pl, userId));
			if (playlists.length) source = "user/playlist";
		} catch (_) {}
		if (!playlists.length) try {
			const web = await fetchKGWebSignedLists(cookieHeader);
			attempts = attempts.concat(web.attempts || []);
			let webLists = (web.lists || []).filter((pl) => keepKGUserPlaylist(pl, userId));
			if (!webLists.length && web.lists && web.lists.length) webLists = web.lists.filter((pl) => pl && /^\d+$/.test(String(pl.listId || pl.id || "")));
			if (webLists.length) {
				playlists = webLists;
				source = "web-signed";
			}
		} catch (_) {}
		playlists = await enrichKGFavoritePlaylist(playlists, cookieHeader, userId);
		const created = playlists.filter((pl) => pl && !pl.subscribed && !pl.isFavorite).length;
		const collected = playlists.filter((pl) => pl && pl.subscribed).length;
		const hint = summarizeKGPlaylistAttempts(attempts);
		const code20017 = (attempts || []).some((a) => Number(a.error_code) === 20017);
		let message = "";
		if (!playlists.length) {
			if (!hasAppToken) message = "网页登录凭证无法换成安卓 token（会员歌/云歌单都需要）。请在 www.kugou.com 退出后重新完整登录，再点「刷新登录状态」";
			else if (code20017) message = `酷狗鉴权失败 20017，安卓 token 可能无效。请重新登录酷狗后再试${hint ? `（${hint}）` : ""}`;
			else message = `未获取到酷狗歌单，请在 www.kugou.com 重新登录后再刷新${hint ? `（${hint}）` : ""}`;
		}
		return {
			provider: "kg",
			loggedIn: true,
			userId,
			playlists,
			count: playlists.length,
			createdCount: created,
			collectedCount: collected,
			source,
			hasAppToken,
			hasVipToken: !!auth.vipToken,
			attempts: attempts.slice(0, 20),
			message
		};
	}
	async function fetchKGCloudlistTracks(listId, cookieHeader) {
		listId = String(listId || "").trim();
		if (!listId) return [];
		cookieHeader = await enrichKGCookieHeader(cookieHeader, { preferAppToken: true });
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		const pageSize = 300;
		const attempts = [
			{
				base: "https://gateway.kugou.com",
				path: "/v4/get_list_all_file",
				headers: KG_CLOUDLIST_ROUTER
			},
			{
				base: KG_CLOUDLIST_GATEWAY,
				path: "/v4/get_list_all_file",
				headers: KG_CLOUDLIST_ROUTER
			},
			{
				base: "https://gateway.kugou.com",
				path: "/v2/get_list_all_file",
				headers: KG_CLOUDLIST_ROUTER
			},
			{
				base: KG_CLOUDLIST_GATEWAY,
				path: "/v2/get_list_all_file",
				headers: KG_CLOUDLIST_ROUTER
			}
		];
		for (const listType of [0, 1]) for (const endpoint of attempts) {
			let page = 1;
			let total = Infinity;
			const tracks = [];
			while (tracks.length < total && page <= 30) {
				const body = await kgPostAndroidSigned(endpoint.base, endpoint.path, cookieHeader, {
					listid: Number(listId) || listId,
					userid: Number(userId) || userId,
					token,
					area_code: 1,
					show_relate_goods: 0,
					pagesize: pageSize,
					allplatform: 1,
					show_cover: 1,
					type: listType,
					page
				}, {}, endpoint.headers, { preferAppToken: true });
				if (!body) break;
				if (Number(body.status) === 0 && Number(body.error_code) !== 0) break;
				const info = extractKGCloudLists(body);
				const arr = Array.isArray(info) ? info : [];
				total = Number(body.data && (body.data.total || body.data.count || body.data.list_count) || body.total || arr.length) || arr.length;
				arr.forEach((item) => {
					const song = mapKGSong(item, false);
					if (song.hash) tracks.push(song);
				});
				if (!arr.length) break;
				page += 1;
			}
			if (tracks.length) return tracks;
		}
		return [];
	}
	async function handleKGPlaylistTracks(id, cookieHeader, globalCollectionId) {
		id = String(id || "").trim();
		globalCollectionId = String(globalCollectionId || "").trim();
		if (!id && !globalCollectionId) return {
			provider: "kg",
			error: "Missing playlist id",
			tracks: []
		};
		cookieHeader = cookieHeader || await getKGCookie();
		await syncKGVipCacheWithCookie(cookieHeader);
		cookieHeader = await enrichKGCookieHeader((await ensureKGAndroidAuth(cookieHeader, { requireAppToken: true })).cookieHeader || cookieHeader, { preferAppToken: true });
		const loginUserId = kgCookieUserId(cookieHeader);
		const loggedIn = !!(loginUserId && kgCookieToken(cookieHeader));
		let tracks = [];
		let source = "cloudlist";
		let resolvedId = id || globalCollectionId;
		if (id === "fav" || id === "favorite" || isKGFavoriteName(id)) try {
			const favId = String(await fetchKGFavoriteListId(cookieHeader, true) || "").trim();
			if (favId) resolvedId = favId;
		} catch (_) {}
		const tryLoad = async (listOrGlobal) => {
			const key = String(listOrGlobal || "").trim();
			if (!key) return {
				tracks: [],
				id: key,
				source: ""
			};
			if (/^collection_/i.test(key) || !/^\d+$/.test(key) && key.includes("_")) {
				const m = key.match(/^collection_\d+_\d+_(\d+)_\d+$/i);
				if (m && m[1]) {
					const cloud = await fetchKGCloudlistTracks(m[1], cookieHeader);
					if (cloud.length) return {
						tracks: cloud,
						id: m[1],
						source: "cloudlist"
					};
				}
				const pub = await fetchKGGlobalCollectionTracks(key, cookieHeader);
				if (pub.length) return {
					tracks: pub,
					id: key,
					source: "pubsongs"
				};
				return {
					tracks: [],
					id: key,
					source: ""
				};
			}
			const cloud = await fetchKGCloudlistTracks(key, cookieHeader);
			if (cloud.length) return {
				tracks: cloud,
				id: key,
				source: "cloudlist"
			};
			if (loginUserId) {
				const pub = await fetchKGGlobalCollectionTracks(`collection_3_${loginUserId}_${key}_0`, cookieHeader);
				if (pub.length) return {
					tracks: pub,
					id: key,
					source: "pubsongs"
				};
			}
			return {
				tracks: [],
				id: key,
				source: ""
			};
		};
		try {
			if (globalCollectionId) {
				const got = await tryLoad(globalCollectionId);
				if (got.tracks.length) {
					tracks = got.tracks;
					resolvedId = got.id || resolvedId;
					source = got.source;
				}
			}
			if (!tracks.length && resolvedId) {
				const got = await tryLoad(resolvedId);
				tracks = got.tracks;
				if (got.id) resolvedId = got.id;
				if (got.source) source = got.source;
			}
		} catch (_) {}
		if (!tracks.length) try {
			const favId = String(await fetchKGFavoriteListId(cookieHeader, true) || "").trim();
			if (favId && favId !== resolvedId) {
				const got = await tryLoad(favId);
				if (got.tracks.length) {
					tracks = got.tracks;
					resolvedId = got.id || favId;
					source = got.source || "cloudlist-fav";
				}
			}
		} catch (_) {}
		const cover = (() => {
			for (const song of tracks) {
				const c = normalizeKGCover(song && song.cover, 240);
				if (c) return c;
			}
			return "";
		})();
		return {
			provider: "kg",
			loggedIn,
			playlist: {
				id: resolvedId,
				provider: "kg",
				trackCount: tracks.length,
				source,
				cover,
				globalCollectionId: globalCollectionId || (loginUserId && /^\d+$/.test(String(resolvedId)) ? `collection_3_${loginUserId}_${resolvedId}_0` : "")
			},
			tracks
		};
	}
	async function fetchKGGlobalCollectionTracks(globalId, cookieHeader) {
		globalId = String(globalId || "").trim();
		if (!globalId) return [];
		const pageSize = 100;
		let page = 1;
		let total = Infinity;
		const tracks = [];
		while (tracks.length < total && page <= 30) {
			const body = await kgFetchAndroidSigned("https://gateway.kugou.com", "/pubsongs/v2/get_other_list_file_nofilt", cookieHeader, {
				area_code: 1,
				begin_idx: (page - 1) * pageSize,
				plat: 1,
				type: 1,
				mode: 1,
				personal_switch: 1,
				pagesize: pageSize,
				global_collection_id: globalId
			}, {});
			const info = extractKGCloudLists(body);
			const arr = Array.isArray(info) ? info : [];
			total = Number(body && body.data && (body.data.total || body.data.count) || body.total || arr.length) || arr.length;
			arr.forEach((item) => {
				const song = mapKGSong(item, false);
				if (song.hash) tracks.push(song);
			});
			if (!arr.length) break;
			page += 1;
		}
		return tracks;
	}
	function normalizeKGArtistName(name) {
		return String(name || "").replace(/<[^>]+>/g, "").trim().toLowerCase();
	}
	async function kgFetchMobileJSON(pathWithQuery) {
		for (const base of [
			"https://mobilecdn.kugou.com",
			"http://mobilecdn.kugou.com",
			"https://m3ws.kugou.com"
		]) try {
			const body = await kgFetchJSON(`${base}${pathWithQuery}`, {
				mobile: true,
				referer: "https://www.kugou.com/",
				headers: { "User-Agent": KG_UA_MOBILE }
			});
			if (body) return body;
		} catch (_) {}
		return null;
	}
	async function searchKGSingerId(name) {
		name = String(name || "").trim().split(/\s*[/、,，]\s*/)[0].trim();
		if (!name) return {
			singerId: "",
			singerName: ""
		};
		const target = normalizeKGArtistName(name);
		const pickFromList = (list) => {
			const arr = Array.isArray(list) ? list : [];
			return arr.find((item) => normalizeKGArtistName(item.singername || item.author_name || item.name) === target) || arr.find((item) => {
				const candidate = normalizeKGArtistName(item.singername || item.author_name || item.name);
				return candidate && (candidate.includes(target) || target.includes(candidate));
			}) || arr[0];
		};
		try {
			const body = await kgFetchMobileJSON(`/api/v3/search/singer?${new URLSearchParams({
				keyword: name,
				page: "1",
				pagesize: "8",
				version: "9108",
				plat: "0",
				with_res_tag: "1"
			})}`);
			const matched = pickFromList(body && body.data && body.data.info || body && body.info || []);
			if (matched) return {
				singerId: String(matched.singerid || matched.singer_id || matched.author_id || matched.id || "").trim(),
				singerName: matched.singername || matched.author_name || matched.name || name
			};
		} catch (_) {}
		try {
			const u = new URL("https://complexsearch.kugou.com/v2/search/singer");
			u.searchParams.set("keyword", name);
			u.searchParams.set("page", "1");
			u.searchParams.set("pagesize", "8");
			u.searchParams.set("platform", "WebFilter");
			u.searchParams.set("format", "json");
			const body = await kgFetchJSON(u.toString(), {
				mobile: false,
				referer: "https://www.kugou.com/",
				headers: { "User-Agent": KG_UA_PC }
			});
			const matched = pickFromList(body && body.data && (body.data.lists || body.data.info || body.data.list) || body && body.lists || []);
			if (matched) return {
				singerId: String(matched.singerid || matched.singer_id || matched.AuthorId || matched.author_id || matched.id || "").trim(),
				singerName: matched.singername || matched.author_name || matched.AuthorName || matched.name || name
			};
		} catch (_) {}
		try {
			const songs = await handleKGSearch(name, 8, "", 1);
			const hit = (songs || []).find((s) => s && s.singerId && normalizeKGArtistName(s.artist).includes(target)) || (songs || []).find((s) => s && s.singerId);
			if (hit && hit.singerId) return {
				singerId: String(hit.singerId),
				singerName: hit.artist || name
			};
		} catch (_) {}
		return {
			singerId: "",
			singerName: name
		};
	}
	async function handleKGArtistDetail(id, name, limit) {
		limit = Math.max(10, Math.min(80, Number(limit) || 36));
		let singerId = String(id || "").trim();
		let singerName = String(name || "").trim().split(/\s*[/、,，]\s*/)[0].trim();
		if (!singerId && singerName) {
			const found = await searchKGSingerId(singerName);
			singerId = found.singerId;
			singerName = found.singerName || singerName;
		}
		if (!singerId && !singerName) return {
			provider: "kg",
			error: "MISSING_SINGER_ID",
			message: "缺少酷狗歌手 ID",
			artist: null,
			songs: []
		};
		let info = {};
		let rawSongs = [];
		if (singerId) {
			try {
				const infoBody = await kgFetchMobileJSON(`/api/v3/singer/info?singerid=${encodeURIComponent(singerId)}&with_res_tag=1`);
				info = infoBody && infoBody.data || infoBody || {};
			} catch (_) {}
			try {
				const songsBody = await kgFetchMobileJSON(`/api/v3/singer/song?${new URLSearchParams({
					singerid: singerId,
					page: "1",
					pagesize: String(limit),
					sorttype: "2",
					plat: "0",
					version: "9108",
					area_code: "1",
					with_res_tag: "1"
				})}`);
				rawSongs = songsBody && songsBody.data && songsBody.data.info || songsBody && songsBody.info || [];
			} catch (_) {}
		}
		if (!rawSongs.length && singerName) try {
			const searched = await handleKGSearch(singerName, limit, "", 1);
			rawSongs = (searched || []).map((s) => ({
				FileHash: s.hash,
				hash: s.hash,
				SongName: s.name,
				SingerName: s.artist,
				SingerId: s.singerId || singerId,
				AlbumID: s.albumId,
				MixSongID: s.albumAudioId,
				AlbumName: s.album,
				imgUrl: s.cover,
				Duration: s.duration
			}));
			if (!singerId) {
				const first = (searched || []).find((s) => s.singerId);
				if (first) singerId = String(first.singerId);
			}
		} catch (_) {}
		if (!singerId && !rawSongs.length) return {
			provider: "kg",
			error: "MISSING_SINGER_ID",
			message: "缺少酷狗歌手 ID",
			artist: null,
			songs: []
		};
		return {
			provider: "kg",
			artist: {
				provider: "kg",
				id: singerId || "",
				name: info.singername || info.author_name || singerName || "",
				avatar: normalizeKGCover(info.imgurl || info.singerHead || info.pic || info.avatar || "", 240),
				briefDesc: info.intro || info.description || ""
			},
			songs: rawSongs.map((item) => mapKGSong(item, false)).filter((song) => song.hash && song.name)
		};
	}
	/**
	* 推荐类接口用的 `signParamsKey`：md5(appid + 盐 + clientver + data)。
	*
	* 上游 KuGouMusicApi 的标准版/概念版走不同盐值，本地桥固定用概念版（lite）那一套，
	* 和 kgPostAndroidSigned 里签 signature 用的是同一个盐，别两边改了一个忘了另一个。
	*/
	function kgSignParamsKey(data) {
		return md5$1(`${KG_LITE_APPID}${KG_ANDROID_SIGN_SALT}${KG_LITE_CLIENTVER}${data}`);
	}
	/**
	* 每日推荐（/everyday/recommend → everydayrec 服务）。
	*
	* 上游是 POST 且不带 data，参数全走 query；本地桥的 kgPostAndroidSigned 会把 dfid/mid/
	* appid/clientver/clienttime/token/userid 这些默认参数一起签进去，所以这里只补 platform。
	* body 不传（与上游一致）：空 body 由原生补成 0 长度，见 kgPostAndroidSigned 里的说明。
	*/
	async function handleKGEverydayRecommend(cookieHeader, platform) {
		cookieHeader = cookieHeader || await getKGCookie();
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		if (!userId || !token) {
			noteLibraryStep("kugou", "everyday:recommend:no-session", {
				hasUserId: Boolean(userId),
				hasToken: Boolean(token)
			});
			return null;
		}
		noteLibraryStep("kugou", "everyday:recommend:start");
		const body = await kgPostAndroidSigned("https://gateway.kugou.com", "/everyday_song_recommend", cookieHeader, void 0, { platform: String(platform || "ios") }, { "x-router": "everydayrec.service.kugou.com" });
		noteLibraryStep("kugou", "everyday:recommend:done", {
			status: body && body.status,
			errorCode: body && body.error_code
		});
		return body;
	}
	/**
	* 私人 FM（/personal/fm → persnfm 服务）。
	*
	* `remain_songcnt` 是「队列里还剩几首没播」的意思，酷狗服务端在它大于 4 时**直接不返回新歌**，
	* 所以默认必须给 0 —— 否则 FM 首页会一次次拿到空列表，表现就是「私人 FM 没有歌」。
	*/
	async function handleKGPersonalFm(cookieHeader, options) {
		options = options || {};
		cookieHeader = cookieHeader || await getKGCookie();
		const userId = kgCookieUserId(cookieHeader);
		const token = kgCookieToken(cookieHeader);
		const vipType = kgCookieVipType(cookieHeader);
		const mid = await getKGMid(cookieHeader);
		const dateTime = Date.now();
		const data = {
			appid: KG_LITE_APPID,
			clienttime: dateTime,
			mid,
			action: String(options.action || "play"),
			recommend_source_locked: 0,
			song_pool_id: Number(options.song_pool_id) || 0,
			callerid: 0,
			m_type: 1,
			platform: String(options.platform || "ios"),
			area_code: 1,
			remain_songcnt: Math.max(0, Math.min(4, Number(options.remain_songcnt) || 0)),
			clientver: KG_LITE_CLIENTVER,
			is_overplay: options.is_overplay ? 1 : 0,
			mode: String(options.mode || "normal"),
			fakem: "ca981cfc583a4c37f28d2d49000013c16a0a",
			key: kgSignParamsKey(dateTime)
		};
		if (userId) {
			data.userid = userId;
			data.kguid = userId;
		}
		if (token) data.token = token;
		if (vipType) data.vip_type = vipType;
		if (options.hash) data.hash = options.hash;
		if (options.songid) data.songid = options.songid;
		if (options.playtime) data.playtime = options.playtime;
		if (options.cur_mark) data.cur_mark = options.cur_mark;
		noteLibraryStep("kugou", "personal:fm:start", {
			action: data.action,
			mode: data.mode
		});
		const body = await kgPostAndroidSigned("https://gateway.kugou.com", "/v2/personal_recommend", cookieHeader, data, {}, { "x-router": "persnfm.service.kugou.com" });
		noteLibraryStep("kugou", "personal:fm:done", {
			status: body && body.status,
			errorCode: body && body.error_code
		});
		return body;
	}
	/** 历史推荐（/everyday/history）：mode=list 拿日期列表，mode=song 拿某天的歌。 */
	async function handleKGEverydayHistory(cookieHeader, options) {
		options = options || {};
		cookieHeader = cookieHeader || await getKGCookie();
		const extra = {
			mode: String(options.mode || "list"),
			platform: String(options.platform || "ios")
		};
		if (options.history_name) extra.history_name = options.history_name;
		if (options.date) extra.date = options.date;
		noteLibraryStep("kugou", "everyday:history:start", { mode: extra.mode });
		const body = await kgPostAndroidSigned("https://gateway.kugou.com", "/everyday/api/v1/get_history", cookieHeader, void 0, extra, { "x-router": "everydayrec.service.kugou.com" });
		noteLibraryStep("kugou", "everyday:history:done", {
			status: body && body.status,
			errorCode: body && body.error_code
		});
		return body;
	}
	/** 歌曲推荐（概念版卡片，/top/card/youth）。clientver 上游写死 11490，别改成 lite 的 11440。 */
	async function handleKGTopCardYouth(cookieHeader, options) {
		options = options || {};
		cookieHeader = cookieHeader || await getKGCookie();
		const pagesize = Number(options.pagesize);
		noteLibraryStep("kugou", "top:card:youth:start", { cardId: options.card_id });
		const body = await kgPostAndroidSigned("https://gateway.kugou.com", "/youth/v1/song/single_card_recommend", cookieHeader, {
			tagid: options.tagid != null ? options.tagid : "",
			u_info: "",
			source_mixsong: ""
		}, {
			card_id: Number(options.card_id) || 3005,
			area_code: 1,
			platform: "ios",
			module_id: 1,
			ver: "v2",
			pagesize: Number.isFinite(pagesize) && pagesize > 0 ? pagesize : 30,
			clientver: 11490
		}, {});
		noteLibraryStep("kugou", "top:card:youth:done", {
			status: body && body.status,
			errorCode: body && body.error_code
		});
		return body;
	}
	async function kgFetchWebSignedGet(baseURL, urlPath, extraParams) {
		const mid = await getKGMid("");
		const clienttime = Math.floor(Date.now() / 1e3);
		const params = Object.assign({
			dfid: "-",
			mid,
			uuid: mid,
			clientver: KG_ANDROID_CLIENTVER,
			clienttime
		}, extraParams || {});
		params.signature = signatureKGWebParams(params);
		const qs = Object.keys(params).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");
		return kgFetchJSON(`${String(baseURL || "").replace(/\/$/, "")}${urlPath.startsWith("/") ? urlPath : `/${urlPath}`}?${qs}`, {
			referer: "https://www.kugou.com/",
			headers: {
				"User-Agent": KG_UA_PC,
				Accept: "application/json, text/plain, */*"
			}
		});
	}
	function kgBytesToBase64(bytes) {
		let binary = "";
		const chunk = 32768;
		for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
		return btoa(binary);
	}
	async function kgBuildQrDataUrl(text) {
		text = String(text || "").trim();
		if (!text) return "";
		try {
			const resp = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(text)}`);
			if (!resp.ok) return "";
			const buf = new Uint8Array(await resp.arrayBuffer());
			return buf.length ? `data:image/png;base64,${kgBytesToBase64(buf)}` : "";
		} catch (_) {
			return "";
		}
	}
	/** KuGouMusicApi `/login/qr/key` → login-user.kugou.com/v2/qrcode */
	async function handleKGLoginQrKey() {
		const body = await kgFetchWebSignedGet("https://login-user.kugou.com", "/v2/qrcode", {
			appid: KG_QR_KEY_APPID,
			type: 1,
			plat: 4,
			qrcode_txt: `https://h5.kugou.com/apps/loginQRCode/html/index.html?appid=${KG_ANDROID_APPID}&`,
			srcappid: KG_SRCAPPID
		});
		const key = String(body && body.data && (body.data.qrcode || body.data.qrcode_key || body.data.key) || body && (body.qrcode || body.key) || "").trim();
		return {
			provider: "kg",
			code: key ? 200 : 500,
			unikey: key,
			key,
			status: body && body.status,
			error_code: body && body.error_code,
			message: key ? "" : "酷狗二维码 key 获取失败",
			raw: body
		};
	}
	/** KuGouMusicApi `/login/qr/create` */
	async function handleKGLoginQrCreate(key) {
		key = String(key || "").trim();
		if (!key) return {
			provider: "kg",
			code: 400,
			error: "MISSING_KEY",
			message: "缺少二维码 key"
		};
		const url = `https://h5.kugou.com/apps/loginQRCode/html/index.html?qrcode=${encodeURIComponent(key)}`;
		const qrimg = await kgBuildQrDataUrl(url);
		return {
			provider: "kg",
			code: 200,
			data: {
				url,
				qrimg
			},
			url,
			qrimg
		};
	}
	/**
	* KuGouMusicApi `/login/qr/check`
	* status: 0 过期, 1 等待扫码, 2 待确认, 4 成功(返回 token)
	*/
	async function handleKGLoginQrCheck(key) {
		key = String(key || "").trim();
		if (!key) return {
			provider: "kg",
			status: 0,
			code: 0,
			message: "缺少二维码 key"
		};
		const body = await kgFetchWebSignedGet("https://login-user.kugou.com", "/v2/get_userinfo_qrcode", {
			plat: 4,
			appid: KG_ANDROID_APPID,
			srcappid: KG_SRCAPPID,
			qrcode: key
		});
		const data = body && body.data || {};
		const status = Number(data.status != null ? data.status : body && body.status) || 0;
		const message = status === 0 ? "二维码已过期，请刷新" : status === 1 ? "请用酷狗 App 扫码" : status === 2 ? "已扫码，请在手机确认" : status === 4 ? "登录成功" : "等待扫码";
		if (status !== 4) return {
			provider: "kg",
			status,
			code: status,
			message,
			loggedIn: false,
			error_code: body && body.error_code
		};
		const userId = String(data.userid || data.user_id || data.KugooID || "").trim();
		const token = String(data.token || data.t || "").trim();
		if (!userId || !token) return {
			provider: "kg",
			status: 4,
			code: 4,
			loggedIn: false,
			error: "QR_NO_TOKEN",
			message: "扫码成功但未返回 token，请刷新二维码重试",
			raw: data
		};
		const nickname = stripKGHighlightHtml(data.nickname || data.nick_name || data.username || "");
		const avatar = normalizeKGCover(data.pic || data.user_pic || data.avatar || data.headimg || "", 180);
		const vipToken = String(data.vip_token || data.vipToken || "").trim();
		const vipType = Number(data.vip_type || data.vipType || 0) || (vipToken ? 6 : 0);
		const cookiePatch = {
			userid: userId,
			KugooID: userId,
			token,
			t: token
		};
		if (nickname) cookiePatch.NickName = nickname;
		if (avatar) cookiePatch.pic = avatar;
		if (vipToken) cookiePatch.vip_token = vipToken;
		if (vipType) cookiePatch.vip_type = String(vipType);
		try {
			await persistKGLoginCookies(cookiePatch);
		} catch (_) {}
		await saveKGVipSessionCache(userId, {
			appToken: token,
			sourceToken: token,
			vipToken,
			vipType,
			isVip: !!(vipType > 0 || vipToken),
			vipLabel: vipType === 33 || vipType === 4 ? "超级VIP" : vipType || vipToken ? "VIP" : "",
			authAt: Date.now()
		});
		const cookieHeader = await ensureKGCookie();
		const info = await getKGLoginStatus(cookieHeader);
		return {
			provider: "kg",
			status: 4,
			code: 4,
			loggedIn: true,
			message: "登录成功",
			userId,
			token,
			cookie: cookieHeader || "",
			hasAppToken: true,
			hasVipToken: !!resolveKGEffectiveVipToken(cookieHeader, await loadKGVipSessionCache(userId)),
			...info,
			nickname: info.nickname || nickname || `酷狗 ${userId}`,
			avatar: info.avatar || avatar
		};
	}
	//#endregion
	//#region src/webBridge/api/bodian.js
	const API_ORIGIN = "https://bd-api.kuwo.cn";
	const LYRIC_ORIGIN = "https://mlyric.kuwo.cn";
	const STORAGE_KEY = "bodianSessionV1";
	const QR_TTL_MS = 3e5;
	const md5 = (value) => crypto_es_default.MD5(String(value || "")).toString();
	const bytesToBase64 = (bytes) => {
		let binary = "";
		const chunk = 32768;
		for (let index = 0; index < bytes.length; index += chunk) binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
		return btoa(binary);
	};
	const utf8ToBase64 = (value) => bytesToBase64(new TextEncoder().encode(String(value)));
	const base64ToUtf8 = (value) => {
		const binary = atob(String(value || ""));
		const bytes = new Uint8Array(binary.length);
		for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
		return new TextDecoder().decode(bytes);
	};
	const sessionState = {
		loaded: false,
		revision: 0,
		session: null
	};
	const loadSession = () => {
		if (sessionState.loaded) return;
		sessionState.loaded = true;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed === "object" && parsed.uid && parsed.token) sessionState.session = {
				uid: String(parsed.uid),
				token: String(parsed.token),
				user: parsed.user && typeof parsed.user === "object" ? parsed.user : null
			};
		} catch (_) {}
	};
	const getSession = () => {
		loadSession();
		return sessionState.session;
	};
	const setSession = (session) => {
		loadSession();
		sessionState.session = session;
		sessionState.revision += 1;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
		} catch (_) {}
	};
	const clearSession = () => {
		loadSession();
		sessionState.session = null;
		sessionState.revision += 1;
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch (_) {}
	};
	var BodianError = class extends Error {
		constructor(code, message, upstreamCode) {
			super(message);
			this.name = "BodianError";
			this.code = code;
			this.upstreamCode = upstreamCode;
		}
	};
	const signQuery = (path, params, body = "") => {
		const query = new URLSearchParams(params).toString();
		let seed = `kuwotest${Array.from(query).filter((char) => /[a-z0-9]/i.test(char)).sort().join("")}`;
		if (body) seed += md5(`${body}kuwotest`);
		return md5(`${seed}${path}`);
	};
	const desktopHeaders = (deviceId) => ({
		"User-Agent": "Dart/3.3 (dart:io)",
		plat: "win",
		channel: "W1",
		ver: "1.1.7",
		svrver: "13",
		"api-ver": "application/json",
		brand: "Windows",
		net: "wifi",
		devid: deviceId,
		qimei36: deviceId,
		"Content-Type": "application/json"
	});
	const readResponsePayload = async (response) => {
		const fallback = response.clone();
		try {
			return await response.json();
		} catch {
			if (String(response.headers.get("content-encoding") || "").toLowerCase().includes("gzip") && typeof DecompressionStream !== "undefined" && fallback.body) try {
				const stream = fallback.body.pipeThrough(new DecompressionStream("gzip"));
				return await new Response(stream).json();
			} catch (_) {}
			const contentType = response.headers.get("content-type") || "unknown";
			throw new BodianError("invalid-response", `Bodian returned an unreadable response (HTTP ${response.status}, content-type ${contentType})`);
		}
	};
	const createClient = (deviceId) => ({ async call(path, options = {}) {
		const { params = {}, body, method = "GET", signed = false, anonymous = false, lyric = false } = options;
		if (!String(path).startsWith("/") || String(path).includes("..")) throw new BodianError("unsupported", "Invalid Bodian path");
		const session = anonymous ? null : getSession();
		const query = {
			...params,
			uid: String(session?.uid || "-1"),
			token: session?.token || ""
		};
		const bodyText = body === void 0 ? "" : JSON.stringify(body);
		if (signed) {
			query.timestamp = String(Date.now());
			query.sign = signQuery(path, query, bodyText);
		}
		const url = new URL(path, lyric ? LYRIC_ORIGIN : API_ORIGIN);
		Object.entries(query).forEach(([key, value]) => {
			if (value !== void 0) url.searchParams.set(key, String(value));
		});
		const headers = desktopHeaders(deviceId);
		if (session) {
			headers.uid = String(session.uid);
			headers.token = session.token;
		}
		const response = await fetch(url.toString(), {
			method,
			headers,
			...bodyText ? { body: bodyText } : {},
			redirect: "follow"
		});
		let payload = null;
		try {
			payload = await readResponsePayload(response);
		} catch (error) {
			if (error instanceof BodianError) throw error;
		}
		if (response.status === 401) throw new BodianError("auth-required", "Bodian sign-in is required", 401);
		if (!response.ok) throw new BodianError("network", `Bodian HTTP ${response.status}`, response.status);
		if (!payload || Number(payload.code) !== 200) {
			const code = Number(payload?.code);
			if (code === 407) {
				const message = payload?.msg || payload?.message;
				throw new BodianError("region-restricted", typeof message === "string" && message.trim() ? message.trim() : "由于版权保护，该资源仅限中国大陆地区使用", code);
			}
			throw new BodianError(code === 11012 ? "auth-required" : code === 20018 ? "not-playable" : "invalid-response", `Bodian rejected the request (code ${payload?.code ?? "missing"})`, payload?.code);
		}
		return payload;
	} });
	const mediaId = (value) => {
		const id = String(value ?? "");
		if (!/^\d{1,20}$/.test(id) || /^0+$/.test(id)) throw new BodianError("invalid-response", "Invalid Bodian media id");
		return id;
	};
	const pagination = (params, firstPage = 0) => {
		const limit = Number(params.limit ?? 50);
		const offset = Number(params.offset ?? 0);
		if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) throw new BodianError("invalid-response", "Invalid Bodian pagination");
		return {
			pn: Math.floor(offset / limit) + firstPage,
			rn: limit
		};
	};
	const pageData = (data, params, field) => {
		if (!Array.isArray(data?.[field])) return data;
		const limit = Number(params.limit ?? 50);
		const offset = Number(params.offset ?? 0);
		const raw = data[field];
		const items = raw.slice(offset % limit);
		const pageEnd = (Math.floor(offset / limit) + 1) * limit;
		const total = Number(data.total);
		const knownTotal = data.total != null && Number.isSafeInteger(total) && total >= 0;
		const hasMore = raw.length > 0 && (knownTotal ? pageEnd < total : raw.length === limit);
		return {
			...data,
			[field]: items,
			bodianPagination: {
				nextOffset: hasMore ? pageEnd : Math.max(offset + items.length, knownTotal ? Math.min(pageEnd, total) : offset + items.length),
				hasMore
			}
		};
	};
	const playlistSource = (value) => {
		const source = Number(value ?? 4);
		if (![
			1,
			2,
			3,
			4,
			5,
			6
		].includes(source)) throw new BodianError("invalid-response", "Invalid Bodian playlist source");
		return source;
	};
	const moduleId = (value) => {
		const id = Number(value);
		if (!Number.isInteger(id) || id < 0 || id > 100) throw new BodianError("invalid-response", "Invalid Bodian home module id");
		return id;
	};
	const discoverIndex = (value) => {
		const index = Number(value);
		if (!Number.isInteger(index) || index < 0 || index > 100) throw new BodianError("invalid-response", "Invalid Bodian Discover index");
		return index;
	};
	const page = async (client, path, params, field, firstPage = 0, extra = {}) => {
		const data = (await client.call(`/api/${path}`, { params: {
			...extra,
			...pagination(params, firstPage)
		} })).data;
		return pageData(data, params, field);
	};
	const callData = async (client, path, params) => (await client.call(`/api/${path}`, { params })).data;
	const createCatalogOperations = (client) => ({
		search: async (params) => {
			if (typeof params.query !== "string" || !params.query.trim() || params.query.length > 500) throw new BodianError("invalid-response", "Invalid Bodian search query");
			return page(client, "search/music/list", params, "resultList", 0, {
				keyword: params.query.trim(),
				correct: 1
			});
		},
		song_detail: (params) => callData(client, "service/music/info", { musicId: mediaId(params.id) }),
		playlist_detail: (params) => callData(client, `service/playlist/info/${mediaId(params.id)}`, { source: playlistSource(params.source) }),
		playlist_tracks: (params) => page(client, `service/playlist/${mediaId(params.id)}/musicList`, params, "list", 1, { source: playlistSource(params.source) }),
		album_detail: (params) => callData(client, `service/album/${mediaId(params.id)}`),
		album_tracks: (params) => page(client, `service/album/music/${mediaId(params.id)}`, params, "resultList"),
		artist_detail: (params) => callData(client, `service/artist/${mediaId(params.id)}`),
		artist_songs: (params) => page(client, `service/artist/music/${mediaId(params.id)}`, params, "resultList"),
		artist_albums: (params) => page(client, `service/artist/album/${mediaId(params.id)}`, params, "resultList"),
		recommendations: () => callData(client, "service/finds/playlist"),
		home_module: (params) => callData(client, "service/home/module", { moduleId: moduleId(params.moduleId) }),
		ai_playlist_detail: (params) => callData(client, "service/home/aiPlaylistDetail", { index: discoverIndex(params.index) }),
		personal_fm: () => callData(client, "service/music/recommendList"),
		lyrics: async (params) => {
			const query = `type=lyric&req=2&lrcx=1&rid=${mediaId(params.id)}&songname=&artist=&corp=kuwo&fromchannel=bodian`;
			const result = await client.call("/mobi.s", {
				lyric: true,
				params: {
					f: "bodian",
					q: utf8ToBase64(query)
				}
			});
			if (typeof result.data?.content !== "string") throw new BodianError("invalid-response", "Bodian lyric content is missing");
			return decodeLyrics(base64ToUtf8(result.data.content));
		}
	});
	const requireSession = () => {
		const session = getSession();
		if (!session) throw new BodianError("auth-required", "Bodian sign-in is required");
		return session;
	};
	const collectionPage = (data, params, albums) => {
		const field = albums ? "albumList" : "playLists";
		if (Array.isArray(data) && data.length === 0 || data && typeof data === "object" && Object.keys(data).length === 0) return {
			[field]: [],
			bodianPagination: {
				nextOffset: Number(params.offset ?? 0),
				hasMore: false
			}
		};
		if (!Array.isArray(data?.playLists)) throw new BodianError("invalid-response", "Bodian collected list is missing");
		const result = pageData(data, params, "playLists");
		return {
			[field]: result.playLists.filter((item) => Number(item?.sourceType) === 6 === albums),
			bodianPagination: result.bodianPagination
		};
	};
	const createLibraryOperations = (client) => {
		const paramsForUser = () => {
			const { uid } = requireSession();
			return {
				userId: uid,
				fromUid: uid
			};
		};
		return {
			async user_playlists(params) {
				const user = paramsForUser();
				const [owned, liked, collected] = await Promise.all([
					callData(client, "service/playlist/userCreate", user),
					callData(client, "service/playlist/fond", user),
					callData(client, "service/collect/4/list", {
						...user,
						...pagination(params, 1)
					})
				]);
				return {
					owned,
					liked,
					collected: collectionPage(collected, params, false)
				};
			},
			async user_albums(params) {
				return collectionPage(await callData(client, "service/collect/4/list", {
					...paramsForUser(),
					...pagination(params, 1)
				}), params, true);
			},
			async liked_songs(params) {
				const liked = await callData(client, "service/playlist/fond", paramsForUser());
				if (!liked?.id) return {
					list: [],
					total: 0
				};
				return pageData(await callData(client, `service/playlist/${liked.id}/musicList`, {
					source: 5,
					...pagination(params, 1)
				}), params, "list");
			}
		};
	};
	const numericId = (value) => {
		const number = Number(mediaId(value));
		if (!Number.isSafeInteger(number)) throw new BodianError("invalid-response", "Unsafe Bodian media id");
		return number;
	};
	const updatePlaylist = async (client, playlistId, tracks, remove, revision) => {
		if (sessionState.revision !== revision) throw new BodianError("auth-required", "Bodian account changed");
		await client.call(`/api/service/playlist/music${remove ? "/delete" : ""}`, {
			method: "POST",
			signed: true,
			body: {
				playListId: playlistId,
				musicIdList: tracks
			}
		});
		return null;
	};
	const createMutationOperations = (client) => {
		const playlistTracks = async (params, remove) => {
			const { uid } = requireSession();
			const revision = sessionState.revision;
			const id = numericId(params.id);
			if (typeof params.trackIds !== "string" || params.trackIds.length > 2200) throw new BodianError("invalid-response", "Invalid Bodian track list");
			const tracks = [...new Set(params.trackIds.split(",").map(numericId))];
			if (!tracks.length || tracks.length > 100) throw new BodianError("invalid-response", "Invalid Bodian track count");
			const owned = await callData(client, "service/playlist/userCreate", { userId: uid });
			if (!(Array.isArray(owned?.playLists) && owned.playLists.some((item) => String(item.id) === String(id)))) {
				const liked = await callData(client, "service/playlist/fond", { userId: uid });
				if (String(liked?.id) !== String(id)) throw new BodianError("unsupported", "Bodian playlist is not owned by the current account");
			}
			return updatePlaylist(client, id, tracks, remove, revision);
		};
		return {
			playlist_tracks_add: (params) => playlistTracks(params, false),
			playlist_tracks_del: (params) => playlistTracks(params, true),
			async like_song(params) {
				const { uid } = requireSession();
				const revision = sessionState.revision;
				const id = numericId(params.id);
				if (typeof params.liked !== "boolean") throw new BodianError("invalid-response", "Invalid Bodian like state");
				const liked = await callData(client, "service/playlist/fond", { userId: uid });
				return updatePlaylist(client, numericId(liked?.id), [id], !params.liked, revision);
			}
		};
	};
	const QUALITIES = {
		standard: {
			format: "mp3",
			br: "128kmp3"
		},
		high: {
			format: "mp3",
			br: "320kmp3"
		},
		lossless: {
			format: "flac",
			br: "2000kflac"
		}
	};
	const validateAudioUrl = (value) => {
		try {
			const url = new URL(value);
			if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
			return url.toString();
		} catch {
			throw new BodianError("invalid-response", "Bodian returned an invalid audio URL");
		}
	};
	const createPlaybackOperation = (client, deviceId) => async (params) => {
		const id = mediaId(params.id);
		const quality = params.quality === "hires" ? "lossless" : params.quality || "high";
		if (!QUALITIES[quality]) throw new BodianError("unsupported", "Unsupported Bodian audio quality");
		const freeSign = typeof params.freeSign === "string" ? params.freeSign : "";
		if (freeSign.length > 4096) throw new BodianError("invalid-response", "Invalid Bodian playback context");
		const right = (await client.call("/api/play/music/v2/checkRight", {
			params: {
				musicId: id,
				freeSign
			},
			signed: true
		})).data;
		if (Number(right?.status) === 3) {
			const preview = right.audition;
			if (!preview || !Number.isFinite(Number(preview.start)) || !Number.isFinite(Number(preview.end))) throw new BodianError("not-playable", "Bodian preview is unavailable");
			return {
				url: validateAudioUrl(preview.https || preview.url),
				quality: "standard",
				fetchedAt: Date.now(),
				preview: {
					startTime: Number(preview.start),
					endTime: Number(preview.end)
				}
			};
		}
		if (Number(right?.status) === 7) throw new BodianError(getSession() ? "not-playable" : "auth-required", "Bodian requires additional playback rights");
		if (right?.status === void 0) throw new BodianError(getSession() ? "not-playable" : "auth-required", "Bodian playback rights are unavailable");
		const format = QUALITIES[quality];
		const body = {
			devId: deviceId,
			musicId: Number(id),
			...format,
			freeSign
		};
		const audio = (await client.call("/api/play/music/v2/audioUrl", {
			params: {
				...body,
				musicId: id
			},
			signed: true
		})).data;
		return {
			url: validateAudioUrl(audio?.audioHttpsUrl || audio?.audioUrl),
			quality,
			fetchedAt: Date.now()
		};
	};
	const decodeBodianWordTiming = (content) => {
		const tag = content.match(/\[kuwo:([0-7]+)(?:\]\[.*)?\]/);
		const factors = tag ? parseInt(tag[1], 8) : 11;
		const startFactor = Math.trunc(factors / 10);
		const durationFactor = factors % 10;
		if (!startFactor || !durationFactor) return null;
		return content.replace(/\[kuwo:[^\]]*\]/g, "").replace(/<(-?\d+),(-?\d+)>/g, (_match, left, right) => {
			const a = Number(left);
			const b = Number(right);
			return `<${Math.trunc(Math.abs((a + b) / (2 * startFactor)))},${Math.trunc(Math.abs((a - b) / (2 * durationFactor)))}>`;
		});
	};
	const decodeLyrics = (content) => ({
		mainText: content.replace(/<-?\d+,-?\d+>/g, "").replace(/\[kuwo:[^\]]*\]/g, ""),
		wordByWordText: /<-?\d+,-?\d+>/.test(content) ? decodeBodianWordTiming(content) : null
	});
	const createAuthOperations = (client) => {
		const qrSessions = /* @__PURE__ */ new Map();
		const currentQr = (key) => {
			const session = qrSessions.get(key);
			if (!session || session.expiresAt <= Date.now()) {
				qrSessions.delete(key);
				return null;
			}
			return session;
		};
		return {
			async login_qr_key() {
				for (const key of qrSessions.keys()) currentQr(key);
				if (qrSessions.size >= 5) throw new BodianError("unavailable", "Too many pending Bodian logins");
				const { data } = await client.call("/api/ucenter/login/qrCode", {
					anonymous: true,
					signed: true
				});
				if (typeof data?.qrCode !== "string" || !data.qrCode) throw new BodianError("invalid-response", "Bodian QR key is missing");
				qrSessions.set(data.qrCode, {
					expiresAt: Date.now() + QR_TTL_MS,
					revision: sessionState.revision
				});
				return { key: data.qrCode };
			},
			async login_qr_create({ key }) {
				if (!currentQr(key)) throw new BodianError("unavailable", "Bodian QR code expired");
				const url = new URL("https://bodian-oia.kuwo.cn/bodian/download.html");
				url.search = new URLSearchParams({
					pageName: "login_pc",
					pt: "3",
					id: key
				}).toString();
				return { imageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=3&data=${encodeURIComponent(url.toString())}` };
			},
			async login_qr_check({ key }) {
				const qr = currentQr(key);
				if (!qr) return { state: "expired" };
				const { data } = await client.call("/api/ucenter/login/qrCodeStatus", {
					params: { qrCode: key },
					anonymous: true,
					signed: true
				});
				if (currentQr(key) !== qr || sessionState.revision !== qr.revision) return { state: "expired" };
				if (Number(data?.status) === 1) return { state: "waiting" };
				if (Number(data?.status) === 2) {
					qrSessions.delete(key);
					return { state: "expired" };
				}
				if (Number(data?.status) !== 3) throw new BodianError("invalid-response", "Unrecognized Bodian QR status");
				let login;
				try {
					login = (await client.call("/api/ucenter/users/login", {
						method: "POST",
						body: {
							authType: 10,
							qrCode: key
						},
						signed: true,
						anonymous: true
					})).data;
				} catch (error) {
					if (error.upstreamCode === 11027) return { state: "scanned" };
					throw error;
				}
				if (currentQr(key) !== qr || sessionState.revision !== qr.revision) return { state: "expired" };
				const ids = [
					login?.id,
					login?.uid,
					login?.userInfo?.id,
					login?.userInfo?.uid
				].filter((value) => value != null).map((value) => typeof value === "number" && !Number.isSafeInteger(value) ? "" : String(value));
				if (!ids.length || !/^[1-9]\d{0,19}$/.test(ids[0]) || ids.some((id) => id !== ids[0])) throw new BodianError("invalid-response", "Bodian returned inconsistent account identity");
				const rawUser = login?.userInfo || login?.user || {};
				const user = {
					id: ids[0],
					nickname: String(rawUser.nickname || ""),
					avatarUrl: String(rawUser.headImg || rawUser.avatarUrl || "")
				};
				if (typeof login?.token === "string" && login.token.trim()) {
					setSession({
						uid: ids[0],
						token: login.token,
						user
					});
					qrSessions.clear();
					return { state: "confirmed" };
				}
				throw new BodianError("invalid-response", "Unrecognized Bodian QR status");
			},
			async login_qr_cancel({ key }) {
				qrSessions.delete(key);
				return null;
			},
			async login_status() {
				const session = getSession();
				if (!session) return null;
				if (session.user?.id !== session.uid) {
					clearSession();
					throw new BodianError("auth-required", "Bodian session identity is inconsistent");
				}
				return session.user;
			},
			async logout() {
				qrSessions.clear();
				clearSession();
				return null;
			}
		};
	};
	const BODIAN_OPERATIONS = /* @__PURE__ */ new Set([
		"search",
		"song_detail",
		"audio",
		"lyrics",
		"login_qr_key",
		"login_qr_create",
		"login_qr_check",
		"login_qr_cancel",
		"login_status",
		"logout",
		"user_playlists",
		"user_albums",
		"liked_songs",
		"playlist_detail",
		"playlist_tracks",
		"album_detail",
		"album_tracks",
		"artist_detail",
		"artist_songs",
		"artist_albums",
		"recommendations",
		"home_module",
		"ai_playlist_detail",
		"personal_fm",
		"like_song",
		"playlist_tracks_add",
		"playlist_tracks_del"
	]);
	const deviceId = (() => {
		const key = "bodianDeviceId";
		try {
			const existing = localStorage.getItem(key);
			if (/^[a-f0-9]{32}$/i.test(existing || "")) return existing.toLowerCase();
		} catch (_) {}
		const bytes = /* @__PURE__ */ new Uint8Array(16);
		crypto.getRandomValues(bytes);
		const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
		try {
			localStorage.setItem(key, value);
		} catch (_) {}
		return value;
	})();
	const client = createClient(deviceId);
	const operations = {
		...createAuthOperations(client),
		...createCatalogOperations(client),
		...createLibraryOperations(client),
		...createMutationOperations(client),
		audio: createPlaybackOperation(client, deviceId)
	};
	async function handleBodianRequest(operation, params = {}) {
		const revision = sessionState.revision;
		noteLibraryStep("bodian", "bridge:request", { operation });
		try {
			if (!BODIAN_OPERATIONS.has(operation)) throw new BodianError("unsupported", "Unsupported Bodian operation");
			if (!params || typeof params !== "object" || Array.isArray(params)) throw new BodianError("invalid-response", "Invalid Bodian request parameters");
			const result = {
				ok: true,
				data: await operations[operation](params)
			};
			noteLibraryStep("bodian", "bridge:result", {
				operation,
				ok: true
			});
			return result;
		} catch (error) {
			if (error instanceof BodianError && error.code === "auth-required" && sessionState.revision === revision) clearSession();
			const result = {
				ok: false,
				error: {
					code: error instanceof BodianError ? error.code : "invalid-response",
					message: error instanceof BodianError ? error.message : "Bodian operation failed"
				}
			};
			noteLibraryStep("bodian", "bridge:result", {
				operation,
				ok: false,
				code: result.error.code,
				message: result.error.message
			});
			return result;
		}
	}
	//#endregion
	//#region src/webBridge/api/folia.js
	function firstValue(...values) {
		for (const value of values) if (value !== void 0 && value !== null && String(value) !== "") return value;
		return "";
	}
	function numberValue(...values) {
		const value = Number(firstValue(...values));
		return Number.isFinite(value) ? value : 0;
	}
	function parseInput(input) {
		const url = new URL(String(input?.path || input?.operation || "/"), "https://folia.local");
		Object.entries(input?.query || {}).forEach(([key, value]) => {
			if (value !== void 0 && value !== null) url.searchParams.set(key, String(value));
		});
		let body = input?.body;
		if (typeof body === "string") try {
			body = JSON.parse(body);
		} catch (_) {
			body = {};
		}
		if (!body || typeof body !== "object") body = {};
		return {
			url,
			body,
			method: String(input?.method || "GET").toUpperCase()
		};
	}
	const EXPLORE_PATHS = /* @__PURE__ */ new Set([
		"/homepage/block/page",
		"/recommend/resource",
		"/toplist",
		"/simi/song",
		"/top/song",
		"/album/new",
		"/top/playlist"
	]);
	async function eapiJson(path, data, cookie) {
		const result = await eapiRequest(path, data || {}, cookie || "");
		const body = result?.body || {};
		if (result?.status >= 500) throw new Error(body.message || body.msg || `Netease EAPI ${path} failed (${result.status})`);
		return body;
	}
	async function plainApiJson(path, data, cookie) {
		const query = new URLSearchParams();
		Object.entries(data || {}).forEach(([key, value]) => {
			if (value == null || value === "" || key === "csrf_token") return;
			query.set(key, String(value));
		});
		const search = query.toString();
		let body = {};
		try {
			const resp = await fetch(`https://music.163.com${path}${search ? `?${search}` : ""}`, {
				method: "GET",
				headers: {
					"User-Agent": UA,
					Referer: "https://music.163.com/",
					Cookie: cookie || "",
					Accept: "application/json"
				}
			});
			try {
				body = await resp.json();
			} catch (_) {
				body = {};
			}
		} catch (_) {
			body = {};
		}
		return body;
	}
	/** 什么都没答（空 body、非 JSON）＝网关这条路径没了，不是「没有内容」。 */
	const isBlankAnswer = (answer) => !answer || typeof answer !== "object" || Object.keys(answer).length === 0;
	/**
	* 读一条：先走 weapi（主路径），答不出内容或会话不被认时改走未加密的 /api/。
	*
	* 只用于**读**（下面探索页那一组都是读）：写操作的路径不能靠 GET 兜底。兜底那条答不出
	* 内容时仍把 weapi 的原答案交回去 —— 于是最坏的情况与现在一样，不会更差。
	* 走了哪条路会留痕：线上再整页空着时，一眼看出是「网关没了」还是「会话没带」。
	*/
	async function readJson(path, data, cookie) {
		const answer = await weapiJson(path, data, cookie);
		if (!isBlankAnswer(answer) && answer.code !== 301 && answer.code !== 401 && answer.code !== 403) return answer;
		const plain = await plainApiJson(path, data, cookie);
		if (isBlankAnswer(plain)) return answer;
		noteLibraryStep("netease", "api:fallback", {
			path,
			source: "plain",
			code: answer?.code ?? null
		});
		return plain;
	}
	async function weapiJson(path, data, cookie) {
		const cookies = parseCookieString(cookie || "");
		return await weapiRequest(path, Object.assign({}, data, { csrf_token: cookies.__csrf || "" }), cookie || "");
	}
	function profileFromLoginInfo(info) {
		if (!info?.loggedIn) return null;
		return {
			userId: info.userId || "",
			nickname: info.nickname || "Netease User",
			avatarUrl: info.avatar || "",
			backgroundUrl: "",
			vipType: info.vipType || 0,
			vipLevel: info.vipLevel || "none"
		};
	}
	async function requireLoginInfo(cookie) {
		return await getLoginInfo(cookie);
	}
	function encodeBridgeKey(value) {
		return btoa(unescape(encodeURIComponent(JSON.stringify(value || {}))));
	}
	function decodeBridgeKey(value) {
		try {
			return JSON.parse(decodeURIComponent(escape(atob(String(value || "")))));
		} catch (_) {
			return {};
		}
	}
	/** 扫码通道归一：wechat 走微信 Web OAuth，app 走 QQ 音乐 App 那条（三合一），其余按 qq 处理。 */
	function qqChannelOf(value) {
		const channel = String(value || "").toLowerCase();
		if (channel === "wechat") return "wechat";
		if (channel === "qqmusic" || channel === "app") return "qqmusic";
		return "qq";
	}
	/** 只回报主机名：头像 URL 里带着用户 hash，整条写进报告没有必要。 */
	function describeUrlHost(value) {
		try {
			return new URL(String(value)).host || "empty";
		} catch (_) {
			return "unparseable";
		}
	}
	function qqProfile(status) {
		if (!status?.loggedIn) return null;
		return {
			uin: status.uin || status.userId || "",
			str_musicid: status.uin || status.userId || "",
			musicid: status.uin || status.userId || "",
			nickname: status.nickname || status.name || "",
			nick: status.nickname || status.name || "",
			logo: status.avatar || status.avatarUrl || "",
			avatarUrl: status.avatar || status.avatarUrl || "",
			vipType: status.vipType || 0
		};
	}
	function qqPlaylistRow(item) {
		return {
			tid: item?.id,
			dirId: Number(item?.dirid || item?.dirId || 0) || void 0,
			dirName: item?.name || "",
			name: item?.name || "",
			songNum: Number(item?.trackCount || 0),
			songnum: Number(item?.trackCount || 0),
			bigpicUrl: item?.cover || "",
			picUrl: item?.cover || "",
			dirShow: 1,
			subscribed: !!item?.subscribed
		};
	}
	function kgCollectionRow(item) {
		const data = item?.providerData || {};
		return {
			listid: data.listId || item?.id,
			list_id: data.listId || item?.id,
			global_collection_id: data.globalCollectionId || item?.id,
			specialid: data.specialId,
			name: item?.name || "",
			listname: item?.name || "",
			song_count: item?.trackCount,
			count: item?.trackCount,
			img: item?.coverUrl || "",
			cover: item?.coverUrl || "",
			type: item?.type === "album" ? 1 : 0,
			source: item?.type === "album" ? 2 : 1,
			is_pri: item?.isOwned ? 0 : 1,
			create_userid: data.creatorUserId,
			list_create_userid: data.creatorUserId,
			list_create_listid: data.creatorListId,
			list_create_gid: data.creatorGid
		};
	}
	function mergeOperationParams(input, url) {
		return {
			...Object.fromEntries(url.searchParams.entries()),
			...input?.params || {},
			...input?.body && typeof input.body === "object" ? input.body : {}
		};
	}
	function pathSegments(url) {
		return String(url.pathname || "").split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
	}
	function qqGtk(cookieHeader) {
		const cookie = parseCookieString(cookieHeader);
		const key = cookie.qm_keyst || cookie.qqmusic_key || cookie.skey || cookie.p_skey || "";
		if (!key) return 5381;
		let hash = 5381;
		for (let index = 0; index < key.length; index += 1) {
			hash += (hash << 5) + key.charCodeAt(index);
			hash &= 2147483647;
		}
		return hash & 2147483647;
	}
	async function handleLoginStatus(cookie) {
		const info = await requireLoginInfo(cookie);
		return {
			code: 200,
			data: {
				code: 200,
				account: info.loggedIn ? { id: info.userId || null } : null,
				profile: profileFromLoginInfo(info)
			}
		};
	}
	async function handleUserAccount(cookie) {
		const info = await requireLoginInfo(cookie);
		return {
			code: 200,
			account: info.loggedIn ? {
				id: info.userId || null,
				userName: info.nickname || "",
				type: 1,
				status: 0
			} : null,
			profile: profileFromLoginInfo(info)
		};
	}
	async function handleSearch(url, cookie) {
		const keywords = String(firstValue(url.searchParams.get("keywords"), url.searchParams.get("s"))).trim();
		if (!keywords) return {
			code: 200,
			result: {
				songs: [],
				songCount: 0
			}
		};
		const limit = Math.max(1, Math.min(100, numberValue(url.searchParams.get("limit"), 30)));
		const offset = Math.max(0, numberValue(url.searchParams.get("offset"), 0));
		const body = await eapiJson("/api/cloudsearch/pc", {
			s: keywords,
			type: 1,
			limit,
			offset,
			total: true
		}, cookie);
		if (Array.isArray(body?.result?.songs) && body.result.songs.length > 0) return body;
		const fallback = await eapiJson("/api/search/pc", {
			s: keywords,
			type: 1,
			limit,
			offset
		}, cookie);
		if (Array.isArray(fallback?.result?.songs) && fallback.result.songs.length > 0) return fallback;
		const response = await fetch("https://music.163.com/api/search/get/web", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Referer: "https://music.163.com/",
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
				...cookie ? { Cookie: cookie } : {}
			},
			body: new URLSearchParams({
				s: keywords,
				type: "1",
				limit: String(limit),
				offset: String(offset),
				total: "true"
			}).toString()
		});
		if (!response.ok) return {
			code: response.status,
			result: {
				songs: [],
				songCount: 0
			}
		};
		const publicBody = await response.json();
		return publicBody?.result ? publicBody : {
			code: 200,
			result: {
				songs: [],
				songCount: 0
			}
		};
	}
	async function handleSongDetail(url, cookie) {
		const ids = String(firstValue(url.searchParams.get("ids"), url.searchParams.get("id"))).split(",").map((id) => Number(id.trim())).filter((id) => Number.isFinite(id) && id > 0);
		if (!ids.length) return {
			code: 200,
			songs: [],
			privileges: []
		};
		const detail = await eapiJson("/api/v3/song/detail", { c: JSON.stringify(ids.map((id) => ({ id }))) }, cookie);
		return {
			...detail,
			code: Number(detail.code) || 200,
			songs: Array.isArray(detail.songs) ? detail.songs : [],
			privileges: Array.isArray(detail.privileges) ? detail.privileges : []
		};
	}
	async function handleSongUrlV1(url, cookie) {
		const ids = String(firstValue(url.searchParams.get("id"), url.searchParams.get("ids"))).split(",").map((id) => Number(id.trim())).filter((id) => Number.isFinite(id) && id > 0);
		const level = String(firstValue(url.searchParams.get("level"), "exhigh"));
		if (!ids.length) return {
			code: 200,
			data: []
		};
		return {
			code: 200,
			data: await Promise.all(ids.map(async (id) => {
				const result = await handleSongUrl(id, cookie, level);
				return {
					id,
					url: result?.url || null,
					br: result?.br || 0,
					size: 0,
					md5: null,
					code: result?.url ? 200 : 404,
					expi: 1200,
					type: "mp3",
					gain: 0,
					peak: 0,
					fee: 0,
					uf: null,
					payed: 0,
					flag: 0,
					canExtend: false,
					freeTrialInfo: result?.trial ? {
						start: 0,
						end: 0
					} : null,
					level: result?.level || level,
					encodeType: "mp3",
					channelLayout: null,
					freeTrialPrivilege: result?.restriction ? {
						resConsumable: false,
						userConsumable: false
					} : null,
					freeTimeTrialPrivilege: null,
					urlSource: 0,
					rightSource: 0,
					podcastCid: null,
					effectTypes: null,
					time: 0
				};
			}))
		};
	}
	async function handleLyricNew(url, cookie) {
		const id = firstValue(url.searchParams.get("id"), url.searchParams.get("ids"));
		if (!id) return {
			code: 200,
			lrc: { lyric: "" },
			tlyric: { lyric: "" },
			yrc: { lyric: "" }
		};
		let body = {};
		try {
			body = await eapiJson("/api/song/lyric/v1", {
				id,
				cp: false,
				tv: 0,
				lv: 0,
				rv: 0,
				kv: 0,
				yv: 0,
				ytv: 0,
				yrv: 0
			}, cookie);
		} catch (_) {
			const fallback = await handleLyric(id, cookie);
			body = {
				lrc: { lyric: fallback?.lyric || "" },
				tlyric: { lyric: fallback?.tlyric || "" },
				yrc: { lyric: fallback?.yrc || "" }
			};
		}
		return {
			...body,
			code: Number(body.code) || 200,
			lrc: body.lrc || { lyric: "" },
			tlyric: body.tlyric || { lyric: "" },
			yrc: body.yrc || { lyric: "" }
		};
	}
	async function handleUserPlaylists(url, cookie) {
		const info = await requireLoginInfo(cookie);
		const uid = numberValue(url.searchParams.get("uid"), info.userId);
		if (!info.loggedIn || !uid) return {
			code: 200,
			playlist: [],
			more: false
		};
		const body = await eapiJson("/api/user/playlist", {
			uid,
			limit: numberValue(url.searchParams.get("limit"), 50),
			offset: numberValue(url.searchParams.get("offset"), 0)
		}, cookie);
		return {
			...body,
			code: Number(body.code) || 200,
			playlist: Array.isArray(body.playlist) ? body.playlist : []
		};
	}
	async function handlePlaylistDetail(url, cookie) {
		const id = firstValue(url.searchParams.get("id"), url.searchParams.get("pid"));
		if (!id) return {
			code: 200,
			playlist: null
		};
		const body = await eapiJson("/api/v6/playlist/detail", {
			id,
			n: 1e3,
			s: 8
		}, cookie);
		return {
			...body,
			code: Number(body.code) || 200
		};
	}
	async function handlePlaylistTrackAll(url, cookie) {
		const detail = await handlePlaylistDetail(url, cookie);
		const playlist = detail?.playlist || {};
		return {
			code: Number(detail.code) || 200,
			songs: Array.isArray(playlist.tracks) ? playlist.tracks : [],
			privileges: Array.isArray(playlist.privileges) ? playlist.privileges : [],
			playlist
		};
	}
	async function handleArtistDetail(url, cookie) {
		const id = firstValue(url.searchParams.get("id"), url.searchParams.get("artistId"));
		if (!id) return {
			code: 200,
			data: null
		};
		const body = await eapiJson("/api/artist/head/info/get", { id }, cookie);
		return {
			...body,
			code: Number(body.code) || 200
		};
	}
	async function handleArtistTopSongs(url, cookie) {
		const id = firstValue(url.searchParams.get("id"), url.searchParams.get("artistId"));
		if (!id) return {
			code: 200,
			songs: [],
			privileges: []
		};
		const body = await eapiJson("/api/artist/top/song", { id }, cookie);
		return {
			...body,
			code: Number(body.code) || 200,
			songs: Array.isArray(body.songs) ? body.songs : [],
			privileges: Array.isArray(body.privileges) ? body.privileges : []
		};
	}
	async function handleArtistSongs(url, cookie) {
		const id = firstValue(url.searchParams.get("id"), url.searchParams.get("artistId"));
		if (!id) return {
			code: 200,
			songs: [],
			privileges: []
		};
		const body = await eapiJson("/api/v1/artist/songs", {
			id,
			order: String(firstValue(url.searchParams.get("order"), "hot")),
			limit: numberValue(url.searchParams.get("limit"), 50),
			offset: numberValue(url.searchParams.get("offset"), 0)
		}, cookie);
		return {
			...body,
			code: Number(body.code) || 200,
			songs: Array.isArray(body.songs) ? body.songs : [],
			privileges: Array.isArray(body.privileges) ? body.privileges : []
		};
	}
	async function handleArtistAlbums(url, cookie) {
		const id = firstValue(url.searchParams.get("id"), url.searchParams.get("artistId"));
		if (!id) return {
			code: 200,
			hotAlbums: [],
			more: false
		};
		const body = await weapiJson(`/api/artist/albums/${id}`, {
			limit: numberValue(url.searchParams.get("limit"), 30),
			offset: numberValue(url.searchParams.get("offset"), 0),
			total: true
		}, cookie);
		return {
			...body,
			code: Number(body.code) || 200,
			hotAlbums: Array.isArray(body.hotAlbums) ? body.hotAlbums : [],
			more: !!body.more
		};
	}
	async function handleAlbum(url, cookie) {
		const id = firstValue(url.searchParams.get("id"), url.searchParams.get("albumId"));
		if (!id) return {
			code: 200,
			album: null,
			songs: []
		};
		const body = await weapiJson(`/api/v1/album/${id}`, {}, cookie);
		return {
			...body,
			code: Number(body.code) || 200,
			songs: Array.isArray(body.songs) ? body.songs : [],
			privileges: Array.isArray(body.privileges) ? body.privileges : []
		};
	}
	async function handleLikedList(url, cookie) {
		const info = await requireLoginInfo(cookie);
		if (!info.loggedIn || !info.userId) return {
			code: 200,
			ids: []
		};
		const body = await weapiJson("/api/song/like/get", { uid: info.userId }, cookie);
		const ids = body?.ids || body?.data?.ids || [];
		return {
			...body,
			code: Number(body.code) || 200,
			ids: Array.isArray(ids) ? ids : []
		};
	}
	async function handleLike(url, body, cookie) {
		return await handleSongLike(firstValue(url.searchParams.get("id"), body.id), String(firstValue(url.searchParams.get("like"), body.like, "true")) !== "false", cookie);
	}
	async function handleLikeCheck(url, cookie) {
		return await handleSongLikeCheck(String(firstValue(url.searchParams.get("ids"), url.searchParams.get("id"))).split(",").map((id) => id.trim()).filter(Boolean), cookie);
	}
	async function handleDailyRecommend(url, cookie) {
		const params = {
			limit: 30,
			offset: 0,
			total: true,
			n: 1e3,
			...String(firstValue(url.searchParams.get("afresh"), "false")) === "true" ? { afresh: true } : {}
		};
		const attempts = [
			{
				name: "eapi-v3",
				run: () => eapiJson("/api/v3/discovery/recommend/songs", {}, cookie)
			},
			{
				name: "weapi-v3",
				run: () => weapiJson("/api/v3/discovery/recommend/songs", params, cookie)
			},
			{
				name: "eapi-legacy",
				run: () => eapiJson("/api/recommend/songs", {}, cookie)
			},
			{
				name: "weapi-legacy",
				run: () => weapiJson("/api/recommend/songs", params, cookie)
			}
		];
		const tried = [];
		let lastError = null;
		for (const attempt of attempts) try {
			const body = await attempt.run();
			const songs = Array.isArray(body?.data?.dailySongs) ? body.data.dailySongs : Array.isArray(body?.dailySongs) ? body.dailySongs : Array.isArray(body?.songs) ? body.songs : [];
			noteLibraryStep("netease", "explore:daily:source", {
				via: attempt.name,
				songs: songs.length,
				code: body?.code
			});
			return body;
		} catch (error) {
			tried.push(attempt.name);
			lastError = error;
		}
		noteLibraryStep("netease", "explore:daily:failed", { tried: tried.join(",") });
		throw lastError || /* @__PURE__ */ new Error("Daily recommendation request failed");
	}
	async function handleHistoryRecommend(url, cookie) {
		const date = url.searchParams.get("date");
		return await eapiJson(date ? "/api/history/recommend/songs/detail" : "/api/history/recommend/songs", date ? { date } : {}, cookie);
	}
	async function handlePersonalFm(url, cookie) {
		const mode = url.searchParams.get("mode");
		if (!mode || mode === "DEFAULT") return await eapiJson("/api/v1/radio/get", {}, cookie);
		const body = { mode };
		const submode = url.searchParams.get("submode");
		if (submode) body.submode = submode;
		try {
			const result = await eapiJson("/api/personal/fm/mode", body, cookie);
			if (Array.isArray(result?.data) && result.data.length) return result;
		} catch (_) {}
		return await eapiJson("/api/v1/radio/get", {}, cookie);
	}
	async function handlePlaylistTracks(url, body, cookie) {
		return await eapiJson("/api/playlist/tracks", {
			op: String(firstValue(url.searchParams.get("op"), body.op, "add")),
			pid: firstValue(url.searchParams.get("pid"), body.pid),
			tracks: firstValue(url.searchParams.get("tracks"), body.tracks)
		}, cookie);
	}
	async function handleSubscribe(url, body, cookie, path) {
		return await eapiJson(path, {
			id: firstValue(url.searchParams.get("id"), body.id),
			t: numberValue(url.searchParams.get("t"), body.t, 1)
		}, cookie);
	}
	async function handleFoliaQqRequest(input, url) {
		const operation = String(input.operation || url.pathname);
		const params = mergeOperationParams(input, url);
		const segments = pathSegments(url);
		const cookie = await getQQCookie();
		const cookieObject = parseCookieString(cookie || "");
		noteLibraryStep("qq", "request", {
			operation,
			hasUin: Boolean(qqCookieUin(cookie || "")),
			hasMusicKey: Boolean(cookieObject.qm_keyst || cookieObject.qqmusic_key || cookieObject.music_key),
			cookieCount: String(cookie || "").split(";").filter(Boolean).length
		});
		try {
			const result = await routeFoliaQqRequest(operation, params, segments, url, cookie);
			noteLibraryStep("qq", "result", {
				operation,
				code: result && typeof result === "object" ? result.code : void 0,
				songs: Array.isArray(result?.songs) ? result.songs.length : void 0,
				playlist: Array.isArray(result?.playlist) ? result.playlist.length : void 0,
				albums: Array.isArray(result?.albums) ? result.albums.length : void 0,
				total: result && typeof result === "object" ? result.total : void 0,
				keys: describePayload(result && typeof result === "object" ? result : null)
			});
			return result;
		} catch (error) {
			noteLibraryStep("qq", "error", {
				operation,
				name: error && error.name ? error.name : "Error",
				message: error && error.message ? error.message : String(error)
			});
			throw error;
		}
	}
	async function routeFoliaQqRequest(operation, params, segments, url, cookie) {
		if (operation === "login_channels") return {
			code: 200,
			data: {
				channels: [
					"qq",
					"wechat",
					"qqmusic"
				],
				sessionMode: "stored"
			}
		};
		if (operation === "login_status") {
			const status = await getQQLoginStatus(cookie);
			const profile = qqProfile(status);
			noteLibraryStep("qq", "login-status:profile", {
				loggedIn: Boolean(status?.loggedIn),
				uinTail: status?.uin ? `…${String(status.uin).slice(-4)}` : "missing",
				nickname: profile?.nickname ? `present(len=${String(profile.nickname).length})` : "missing",
				avatar: profile?.logo ? describeUrlHost(profile.logo) : "missing",
				source: status?.profileSource || "unknown",
				profileUnavailable: Boolean(status?.profileUnavailable),
				missing: status?.missing ? Object.entries(status.missing).filter(([, absent]) => absent).map(([key]) => key).join(",") || "none" : void 0
			});
			return {
				code: 200,
				data: {
					profile,
					account: status?.loggedIn ? { id: status.uin || status.userId || null } : null
				}
			};
		}
		if (operation === "user_detail") return {
			code: 200,
			profile: qqProfile(await getQQLoginStatus(cookie))
		};
		if (operation === "logout") {
			await clearQQPlatformSessionCookies();
			return { code: 200 };
		}
		if (operation === "login_qr_key") {
			let channel = qqChannelOf(firstValue(params.channel, url.searchParams.get("channel")));
			let qr;
			if (channel === "qqmusic") try {
				qr = await qqAppGetLoginQr();
			} catch (error) {
				noteLibraryStep("qq", "login-qr:app-fallback", { message: error && error.message ? error.message : String(error) });
				channel = "qq";
				qr = await handleQQLoginQrCreate();
			}
			else qr = channel === "wechat" ? await qqWechatGetLoginQr() : await handleQQLoginQrCreate();
			return {
				code: 200,
				data: {
					code: 200,
					unikey: encodeBridgeKey({
						channel,
						qrsig: qr.qrsig,
						ptqrtoken: qr.ptqrtoken,
						qrimg: qr.qrimg || qr.img
					})
				}
			};
		}
		if (operation === "login_qr_create") return {
			code: 200,
			data: {
				qrimg: decodeBridgeKey(firstValue(params.key, url.searchParams.get("key"))).qrimg || "",
				qrurl: ""
			}
		};
		if (operation === "login_qr_check") {
			const key = decodeBridgeKey(firstValue(params.key, url.searchParams.get("key")));
			const result = key.channel === "wechat" ? await qqWechatCheckLoginQr({
				qrsig: key.qrsig,
				ptqrtoken: key.ptqrtoken
			}) : key.channel === "qqmusic" ? await qqAppCheckLoginQr(key.qrsig) : await handleQQLoginQrCheck(key.qrsig, key.ptqrtoken);
			if (result?.isOk || result?.loggedIn) {
				const cookie = String(result?.session?.cookie || "").trim() || String(await getQQCookie() || "").trim();
				return {
					code: 803,
					message: result.message || "Login successful",
					cookie
				};
			}
			if (result?.refresh) return {
				code: 800,
				message: result.message || "QR expired"
			};
			if (result?.status === "scanned" || Number(result?.code) === 67 || Number(result?.code) === 802) return {
				code: 802,
				message: result.message || "Scanned"
			};
			if (result?.retryable === false && result?.status === "error") return {
				code: 0,
				message: result.message || "登录失败",
				failureStage: result.failureStage,
				failureReason: result.failureReason,
				ticketExchangeAttempts: result.ticketExchangeAttempts
			};
			return {
				code: 801,
				message: result?.message || "Waiting for scan"
			};
		}
		if (operation === "login_qr_cancel") {
			const key = decodeBridgeKey(firstValue(params.key, url.searchParams.get("key")));
			if (key.channel === "wechat") qqWechatCancelLoginQr(key.qrsig);
			if (key.channel === "qqmusic") qqAppCancelLoginQr(key.qrsig);
			return { code: 200 };
		}
		if (operation === "music_play") {
			const songmid = firstValue(params.songmid, segments[segments.length - 1]);
			const result = await handleQQSongUrl(songmid, firstValue(params.mediaId, params.media_mid), firstValue(params.quality, "320"), cookie);
			return {
				code: 200,
				data: {
					playUrl: { [songmid]: {
						url: result?.url || "",
						error: result?.error || "",
						message: result?.message || ""
					} },
					sip: []
				}
			};
		}
		if (operation === "song_info") return {
			code: 0,
			response: {
				code: 0,
				songinfo: { data: { track_info: await qqSongDetail(firstValue(params.songmid, segments[1], segments[0]), params, cookie) } }
			}
		};
		if (operation === "song_list_detail") {
			const disstid = firstValue(params.disstid, segments[segments.length - 1]);
			const result = await handleQQPlaylistTracks(disstid, cookie, {
				dirid: params.dirid,
				hostUin: params.hostUin
			});
			return {
				code: 0,
				response: {
					code: 0,
					cdlist: [{
						disstid,
						dissname: result?.playlist?.name || result?.name || "",
						logo: result?.playlist?.cover || result?.cover || "",
						songlist: result?.songs || [],
						total_song_num: Number(result?.playlist?.trackCount || result?.songs?.length || 0)
					}]
				}
			};
		}
		if (operation === "user_playlist") try {
			const result = await handleQQUserPlaylists(cookie);
			if (result?.loginRequired || result?.loggedIn === false) {
				noteLibraryStep("qq", "playlists:login-required", {
					loginExpired: Boolean(result?.loginExpired),
					message: result?.message || ""
				});
				return {
					__foliaBridgeError: "AUTH_REQUIRED",
					message: result?.message || "QQ 登录已失效，请重新登录"
				};
			}
			const playlist = (result?.playlists || []).map(qqPlaylistRow);
			noteLibraryStep("qq", "playlists", {
				count: playlist.length,
				keys: describePayload(result)
			});
			return {
				code: 0,
				playlist,
				total: playlist.length,
				more: false
			};
		} catch (error) {
			noteLibraryStep("qq", "playlists:error", { message: error && error.message ? error.message : String(error) });
			throw error;
		}
		if (operation === "user_liked_songs") {
			const offset = numberValue(params.offset, 0);
			const limit = Math.min(100, Math.max(1, numberValue(params.limit, 100)));
			const uin = qqCookieUin(cookie);
			noteLibraryStep("qq", "liked:start", {
				offset,
				limit,
				hasUin: Boolean(uin)
			});
			try {
				const cookieObject = parseCookieString(cookie);
				const encryptedUin = firstValue(cookieObject.encryptUin, cookieObject.encrypt_uin, cookieObject.str_musicid, cookieObject.wxuin, uin);
				const block = (await qqMusicRequest({
					comm: buildQQAuthComm(cookie),
					req_0: {
						module: "music.srfDissInfo.DissInfo",
						method: "CgiGetDiss",
						param: {
							disstid: 0,
							dirid: 201,
							tag: true,
							song_begin: offset,
							song_num: limit,
							userinfo: true,
							orderlist: true,
							enc_host_uin: String(encryptedUin || "")
						}
					}
				}, cookie))?.req_0 || {};
				const data = block.data || {};
				const songs = data.songlist || data.songList || [];
				const total = numberValue(data.total_song_num, data.total, data.song_num, songs.length);
				noteLibraryStep("qq", "liked:path2", {
					code: Number(block.code) || 0,
					songCount: Array.isArray(songs) ? songs.length : 0,
					total,
					keys: describePayload(data)
				});
				if (Array.isArray(songs) && songs.length) return {
					code: Number(block.code) || 0,
					songs,
					total,
					more: Boolean(data.hasmore) || offset + songs.length < total
				};
			} catch (error) {
				noteLibraryStep("qq", "liked:path2:error", { message: error && error.message ? error.message : String(error) });
			}
			try {
				const fav = await qqGetJSON("https://c.y.qq.com/splcloud/fcgi-bin/fcg_musiclist_getmyfav.fcg", {
					dirid: 201,
					dirinfo: 1,
					g_tk: qqGtk(cookie),
					format: "json",
					loginUin: uin,
					hostUin: uin
				}, cookie);
				const midMap = fav?.mapmid || fav?.data?.mapmid || {};
				const idMap = fav?.map || fav?.data?.map || {};
				const allMids = Object.keys(midMap).filter(Boolean);
				noteLibraryStep("qq", "liked:path1", {
					code: fav?.code,
					midCount: allMids.length,
					keys: describePayload(fav)
				});
				if (allMids.length) {
					const songs = allMids.slice(offset, offset + limit).map((mid) => ({
						mid,
						songmid: mid,
						id: midMap[mid] || idMap[mid]
					}));
					await qqSongDetailsBatch(songs, cookie);
					return {
						code: 0,
						songs,
						total: allMids.length,
						more: offset + songs.length < allMids.length
					};
				}
			} catch (error) {
				noteLibraryStep("qq", "liked:path1:error", { message: error && error.message ? error.message : String(error) });
			}
			try {
				const block = (await qqMusicRequest({
					comm: buildQQAuthComm(cookie),
					req_0: {
						module: "music.musicasset.PlaylistFavRead",
						method: "GetSongList",
						param: {
							dirId: 201,
							uin: Number(uin) || uin,
							order: 1,
							begin: offset,
							num: limit
						}
					}
				}, cookie))?.req_0 || {};
				const data = block.data || {};
				const songs = data.songlist || data.songList || data.list || [];
				noteLibraryStep("qq", "liked:path3", {
					code: Number(block.code) || 0,
					subcode: block.subcode,
					songCount: Array.isArray(songs) ? songs.length : 0,
					total: numberValue(data.total, data.total_song_num, data.totalSongNum, 0),
					keys: describePayload(data)
				});
				return {
					code: Number(block.code) || 0,
					songs: Array.isArray(songs) ? songs : [],
					total: numberValue(data.total, data.total_song_num, data.totalSongNum, songs.length),
					more: Array.isArray(songs) && songs.length >= limit
				};
			} catch (error) {
				noteLibraryStep("qq", "liked:path3:error", { message: error && error.message ? error.message : String(error) });
				return {
					code: 0,
					songs: [],
					total: 0,
					more: false
				};
			}
		}
		if (operation === "user_playlist_detail") {
			const result = await handleQQPlaylistTracks(firstValue(params.tid, params.id), cookie, {
				dirid: params.dirid,
				hostUin: params.hostUin
			});
			return {
				code: 0,
				songs: result?.songs || [],
				total: result?.songs?.length || 0,
				more: false
			};
		}
		if (operation === "user_albums") {
			const offset = Math.max(0, numberValue(params.offset, 0));
			const limit = Math.min(100, Math.max(1, numberValue(params.limit, 20)));
			const json = await qqGetJSON("https://c.y.qq.com/fav/fcgi-bin/fcg_get_profile_order_asset.fcg", {
				ct: 20,
				cid: 205360956,
				userid: qqCookieUin(cookie),
				reqtype: 2,
				sin: offset,
				ein: offset + limit - 1,
				format: "json"
			}, cookie);
			const data = json?.data || json || {};
			const albums = data.albumlist || data.cdlist || data.list || data.albums || [];
			const total = numberValue(data.totalalbum, data.total_album, data.total, data.album_total, albums.length);
			return {
				code: Number(json?.code) || 0,
				albums: Array.isArray(albums) ? albums : [],
				total,
				more: offset + (Array.isArray(albums) ? albums.length : 0) < total
			};
		}
		if (operation === "album_info") {
			const json = await qqGetJSON("https://c.y.qq.com/v8/fcg-bin/fcg_v8_album_info_cp.fcg", {
				albummid: firstValue(params.albummid, segments[segments.length - 1]),
				format: "json",
				outCharset: "utf-8"
			}, cookie);
			return {
				code: 0,
				response: {
					code: Number(json?.code) || 0,
					data: json?.data || {}
				}
			};
		}
		if (operation === "artist_songs") {
			const singermid = firstValue(params.singermid, segments[segments.length - 1]);
			const limit = numberValue(params.limit, 30);
			const page = numberValue(params.page, 1);
			return {
				code: 0,
				response: { singer: (await qqMusicRequest({
					comm: {
						ct: 24,
						cv: 0
					},
					singer: {
						module: "music.web_singer_info_svr",
						method: "get_singer_detail_info",
						param: {
							sort: 5,
							singermid,
							sin: Math.max(0, (page - 1) * limit),
							num: limit
						}
					}
				}, cookie))?.singer || {
					code: 0,
					data: {}
				} }
			};
		}
		if (operation === "artist_albums") {
			const singermid = firstValue(params.singermid, segments[segments.length - 1]);
			const limit = numberValue(params.limit, 30);
			return {
				code: 0,
				response: { singer: (await qqMusicRequest({
					comm: {
						ct: 24,
						cv: 0
					},
					singer: {
						module: "music.musichallAlbum.AlbumListServer",
						method: "GetAlbumList",
						param: {
							sort: 5,
							singermid,
							begin: numberValue(params.page, 0),
							num: limit
						}
					}
				}, cookie))?.singer || {
					code: 0,
					data: {}
				} }
			};
		}
		if (operation === "user_guess_you_like") return await handleQQGuessYouLike(cookie);
		if (operation === "user_daily_songs") return await handleQQDailySongs(cookie);
		if (operation === "recommend_playlists") return await handleQQRecommendPlaylists(numberValue(params.limit, 25), cookie);
		if (operation === "user_playlist_tracks") return await handleQQPlaylistTracksWrite(params, cookie);
		if (operation === "user_playlist_subscribe") return await handleQQPlaylistSubscribe(params, cookie);
		if (operation === "user_subscription_status") return await handleQQSubscriptionStatus(firstValue(params.type, "playlist"), firstValue(params.ids, ""), cookie);
		if (operation === "user_song_like") return await handleQQSongLikeWrite(params, cookie);
		if (operation === "user_album_subscribe") return await handleQQAlbumSubscribe(params, cookie);
		if (operation === "recommend_new_songs") return await readNewSongs(params, cookie);
		if (operation === "recommend_new_albums") return await readNewAlbums(params, cookie);
		if (operation === "recommend_toplists") return await readToplists(cookie);
		if (operation === "recommend_toplist") return await readToplistSongs(params, cookie);
		if (operation === "recommend_categories") return await readPlaylistCategories(cookie);
		if (operation === "recommend_category_playlists") return await readCategoryPlaylists(params, cookie);
		if (operation === "recommend_radar") return await readRadar(params, cookie);
		if (operation === "radio_list") return await readRadioList(cookie);
		if (operation === "radio_tracks") return await readRadioTracks(params, cookie);
		if (operation === "song_similar") return await readSimilarSongs(params, cookie);
		if (operation === "user_vip") return await readUserVip(cookie);
		if (operation === "user_cloud") return await readUserCloud(params, cookie);
		if (operation === "user_playlist_create") return await createPlaylist(params, cookie);
		if (operation === "search") return await searchCatalog(params, cookie);
		return {
			__foliaBridgeError: "UNSUPPORTED",
			provider: "qq",
			operation,
			message: `Folia QQ bridge does not implement ${operation}`
		};
	}
	async function handleFoliaKugouRequest(input, url) {
		const operation = String(input.operation || url.pathname);
		const params = mergeOperationParams(input, url);
		const cookie = await ensureKGCookie();
		if (operation === "register_dev") return {
			status: 1,
			error_code: 0,
			data: { dfid: params.dfid || "" }
		};
		if (operation === "login_qr_key") return await handleKGLoginQrKey();
		if (operation === "login_qr_create") return await handleKGLoginQrCreate(firstValue(params.key, params.qrcode));
		if (operation === "login_qr_check") return await handleKGLoginQrCheck(firstValue(params.key, params.qrcode));
		if (operation === "logout") return {
			status: 1,
			error_code: 0,
			code: 200
		};
		if (operation === "user_detail") {
			const info = await getKGLoginStatus(cookie);
			return {
				status: 1,
				error_code: 0,
				data: { user_info: {
					userid: info?.userId || info?.userid || "",
					nickname: info?.nickname || "",
					pic: info?.avatar || info?.avatarUrl || "",
					vip_type: info?.vipType || 0
				} }
			};
		}
		if (operation === "user_vip_detail") return await getKGUserVipDetail(cookie);
		if (operation === "search") {
			const limit = numberValue(params.pagesize, params.limit, 16);
			const page = numberValue(params.page, 1);
			const songs = await handleKGSearch(firstValue(params.keywords, params.keyword), limit, cookie, page);
			return {
				status: 1,
				error_code: 0,
				data: {
					lists: songs,
					total: songs.length
				}
			};
		}
		if (operation === "audio" || operation === "krm_audio") {
			const hash = String(firstValue(params.hash, params.id)).toLowerCase();
			const info = await handleKGSongUrl(hash, params.album_id, params.album_audio_id, "standard", cookie, {});
			return {
				status: 1,
				error_code: 0,
				data: {
					hash,
					FileHash: hash,
					url: info?.url || "",
					play_url: info?.url || ""
				}
			};
		}
		if (operation === "song_url" || operation === "user_cloud_url") {
			const result = await handleKGSongUrl(firstValue(params.hash, params.id), params.album_id, params.album_audio_id, params.quality, cookie, {
				hash320: params.hash320 || params.hash_320,
				hashSq: params.hashSq || params.hash_sq || params.sqhash
			});
			return {
				status: 1,
				error_code: result?.url ? 0 : 20027,
				data: {
					play_url: result?.url || "",
					url: result?.url || "",
					level: result?.level || "standard",
					volume: 0
				},
				...result
			};
		}
		if (operation === "search_lyric") return {
			status: 1,
			error_code: 0,
			candidates: await searchKGLyricCandidates(firstValue(params.hash, params.id), params.album_audio_id, numberValue(params.duration, 0), params.keyword || params.keywords || "")
		};
		if (operation === "lyric") {
			const content = await downloadKGLyricByCandidate({
				id: firstValue(params.id, params.lyric_id),
				accesskey: params.accesskey
			});
			return {
				status: 1,
				error_code: 0,
				decodeContent: content,
				content
			};
		}
		if (operation === "song_climax") return {
			status: 1,
			error_code: 0,
			data: []
		};
		if (operation === "user_playlist") {
			const lists = ((await handleKGUserPlaylists(cookie, numberValue(params.pagesize, 100)))?.playlists || []).map(kgCollectionRow);
			return {
				status: 1,
				error_code: 0,
				data: {
					lists,
					total: lists.length,
					count: lists.length
				}
			};
		}
		if (operation === "playlist_track_all") {
			const result = await handleKGPlaylistTracks(firstValue(params.id, params.global_collection_id), cookie, params.globalCollectionId);
			const songs = result?.songs || result?.tracks || [];
			return {
				status: 1,
				error_code: 0,
				data: {
					songs,
					info: songs,
					total: songs.length,
					count: songs.length
				}
			};
		}
		if (operation === "playlist_detail") {
			const playlist = (await handleKGPlaylistTracks(firstValue(params.ids, params.id), cookie))?.playlist || {};
			const row = {
				listid: playlist.id,
				list_id: playlist.id,
				global_collection_id: playlist.id,
				name: playlist.name,
				listname: playlist.name,
				song_count: playlist.trackCount,
				count: playlist.trackCount,
				img: playlist.cover,
				cover: playlist.cover
			};
			return {
				status: 1,
				error_code: 0,
				data: {
					info: [row],
					list: [row],
					...row
				}
			};
		}
		if (operation === "album_detail") {
			const id = firstValue(params.id, params.album_id);
			return await kgPostAndroidSigned("https://openapi.kugou.com", "/kmr/v2/albums", cookie, {
				data: [{ album_id: String(id) }],
				is_buy: numberValue(params.is_buy, 0),
				fields: "album_id,album_name,publish_date,sizable_cover,intro,language,is_publish,heat,type,quality,authors,exclusive,author_name,trans_param"
			}, {}, {
				"x-router": "openapi.kugou.com",
				"kg-tid": "255"
			}) || {
				status: 0,
				error_code: 20017,
				errmsg: "album detail needs a signed-in account",
				data: {
					info: [],
					list: []
				}
			};
		}
		if (operation === "album_songs") {
			const id = firstValue(params.id, params.album_id);
			return await kgPostAndroidSigned("https://openapi.kugou.com", "/v1/album_audio/lite", cookie, {
				album_id: String(id),
				is_buy: firstValue(params.is_buy, ""),
				page: numberValue(params.page, 1),
				pagesize: numberValue(params.pagesize, 30)
			}, {}, {
				"x-router": "openapi.kugou.com",
				"kg-tid": "255"
			}) || {
				status: 0,
				error_code: 20017,
				errmsg: "album songs need a signed-in account",
				data: {
					info: [],
					list: [],
					songs: [],
					total: 0
				}
			};
		}
		if (operation === "artist_albums") {
			const id = firstValue(params.id, params.author_id);
			return await kgPostAndroidSigned("https://openapi.kugou.com", "/kmr/v1/author/albums", cookie, {
				author_id: String(id),
				pagesize: numberValue(params.pagesize, 30),
				page: numberValue(params.page, 1),
				sort: 1,
				category: 1,
				area_code: "all"
			}, {}, {
				"x-router": "openapi.kugou.com",
				"kg-tid": "36"
			}) || {
				status: 0,
				error_code: 20017,
				data: {
					info: [],
					list: [],
					total: 0
				}
			};
		}
		if (operation === "artist_detail" || operation === "artist_audios") {
			const result = await handleKGArtistDetail(firstValue(params.id, params.singerid), params.name, numberValue(params.pagesize, params.limit, 36));
			if (operation === "artist_detail") return {
				status: 1,
				error_code: 0,
				data: result?.artist || {}
			};
			const items = result?.songs || [];
			return {
				status: 1,
				error_code: 0,
				data: {
					info: items,
					list: items,
					songs: items,
					total: items.length
				}
			};
		}
		if (operation === "everyday_recommend") return await handleKGEverydayRecommend(cookie, params.platform) || {
			status: 1,
			error_code: 0,
			data: {
				songs: [],
				total: 0
			}
		};
		if (operation === "personal_fm") return await handleKGPersonalFm(cookie, {
			action: params.action,
			hash: params.hash,
			songid: params.songid,
			playtime: params.playtime,
			mode: params.mode,
			song_pool_id: params.song_pool_id,
			is_overplay: params.is_overplay,
			remain_songcnt: params.remain_songcnt,
			platform: params.platform
		}) || {
			status: 1,
			error_code: 0,
			data: {
				songs: [],
				total: 0
			}
		};
		if (operation === "top_card_youth") return await handleKGTopCardYouth(cookie, {
			card_id: params.card_id,
			pagesize: params.pagesize,
			tagid: params.tagid
		}) || {
			status: 1,
			error_code: 0,
			data: {
				songs: [],
				total: 0
			}
		};
		if (operation === "everyday_history") return await handleKGEverydayHistory(cookie, {
			mode: params.mode,
			date: params.date,
			history_name: params.history_name,
			platform: params.platform
		}) || {
			status: 1,
			error_code: 0,
			data: {
				info: [],
				list: [],
				total: 0
			}
		};
		if (operation === "user_cloud") return {
			status: 1,
			error_code: 0,
			data: {
				info: [],
				songs: [],
				total: 0
			}
		};
		if (operation === "youth_union_vip") return await getKGYouthUnionVip(cookie);
		if (operation === "youth_day_vip") return await claimKGYouthDayVip(cookie, params.receive_day);
		if (operation === "youth_day_vip_upgrade") return await upgradeKGYouthDayVip(cookie, firstValue(params.userid, params.kugouid));
		if (operation === "playlist_add") return await handlePlaylistAdd(params, cookie);
		if (operation === "playlist_del") return await handlePlaylistDel(params, cookie);
		if (operation === "playlist_tracks_add") return await handlePlaylistTracksAdd(params, cookie);
		if (operation === "playlist_tracks_del") return await handlePlaylistTracksDel(params, cookie);
		return {
			__foliaBridgeError: "UNSUPPORTED",
			provider: "kugou",
			operation,
			message: `Folia KuGou bridge does not implement ${operation}`
		};
	}
	/** 请求属于哪一家的会话：桥对外的 provider 名，`bodian` 这类没有会话的答空串。 */
	function sessionProviderOf(input) {
		const provider = String(input?.provider || "").trim().toLowerCase();
		if (!provider || provider === "netease") return "netease";
		if (provider === "qq" || provider === "qq_raw") return "qq";
		if (provider === "kugou" || provider === "kg") return "kugou";
		return "";
	}
	/**
	* 把会话随答复交回页面。
	*
	* 网页版的桥原先自己揣着会话：罐（`chrome.cookies` 垫片）加 `chrome.storage.local` 垫片都在
	* 这个进程的内存里，`pm2 restart` 之后页面就再也认不回自己的登录态。现在会话跟着请求走 ——
	* 答复里带上这次请求之后该 provider 的会话（`__foliaBridgeSession`），页面把它覆盖进
	* localStorage，下一次请求再带回来（`sessionCookies`，见 cookies.js 的 adoptRequestSession）。
	*
	* 只交会话本身，不交罐里的搬运 cookie（ptcz / RK / qrsig 这些）：页面存的是「这份登录凭据」，
	* 未登录时答复里干脆没有这个字段，免得一串匿名 cookie 把页面存着的登录态冲掉。
	* 读不出、或者答的不是对象（数组、标量）时原样返回。
	*/
	async function withBridgeSession(provider, result) {
		if (!provider || !result || typeof result !== "object" || Array.isArray(result)) return result;
		let cookies = "";
		try {
			cookies = String(await currentProviderSession(provider) || "").trim();
		} catch (_) {
			cookies = "";
		}
		if (!cookies) return result;
		return {
			...result,
			__foliaBridgeSession: {
				provider,
				cookies
			}
		};
	}
	/**
	* 桥的入口。
	*
	* 请求里的 `sessionCookies`（Cookie 头字符串，或 `[{ name, value }]`，或 `{ name: value }`）
	* 在这次请求期间优先于罐里那份；答复里的 `__foliaBridgeSession` 是这次请求之后该 provider
	* 的会话，页面据此覆盖 localStorage。请求没带会话时，行为与以前完全一样：读罐里与
	* `chrome.storage.local` 里那份。
	*/
	async function handleFoliaApiRequest(input) {
		const provider = sessionProviderOf(input);
		adoptRequestSession(provider, firstValue(input?.sessionCookies, input?.session?.cookies));
		try {
			return await withBridgeSession(provider, await dispatchFoliaApiRequest(input));
		} finally {
			dropRequestSession();
		}
	}
	async function dispatchFoliaApiRequest(input) {
		const { url, body, method } = parseInput(input);
		if (input?.provider === "bodian") return await handleBodianRequest(String(input.operation || ""), input.params || body || {});
		if (input?.provider === "qq") return await handleFoliaQqRequest(input, url);
		if (input?.provider === "kugou") return await handleFoliaKugouRequest(input, url);
		if (input?.provider === "qq_raw") {
			if (input.operation !== "musicu") return {
				__foliaBridgeError: "UNSUPPORTED",
				message: `Unknown QQ raw operation: ${input.operation}`
			};
			return await qqMusicRequest(body, await getQQCookie());
		}
		const sent = firstValue(url.searchParams.get("cookie"), body.cookie);
		const cookie = (sent && hasNeteaseLogin(sent) ? sent : "") || await getNeteaseCookie();
		const path = url.pathname;
		const params = url.searchParams;
		if (path === "/register/anonimous") {
			const guest = await registerAnonymousCookie();
			noteLibraryStep("netease", "auth:anonimous", { ok: guest ? "yes" : "no" });
			return {
				code: 200,
				cookie: guest,
				anonymous: true
			};
		}
		if (path === "/login/status") return await handleLoginStatus(cookie);
		if (path === "/user/account") return await handleUserAccount(cookie);
		if (path === "/logout") return { code: 200 };
		const resolveQrCookie = async () => sent || await getNeteaseCookie();
		if (path === "/login/qr/key") return {
			code: 200,
			data: {
				code: 200,
				unikey: (await handleLoginQrKey(await resolveQrCookie())).key
			}
		};
		if (path === "/login/qr/create") {
			const result = await handleLoginQrCreate(firstValue(params.get("key"), body.key));
			return {
				code: 200,
				data: {
					qrimg: result.qrimg || result.img,
					qrurl: result.url
				}
			};
		}
		if (path === "/login/qr/check") return await handleLoginQrCheck(firstValue(params.get("key"), body.key), await resolveQrCookie());
		if (path === "/cloudsearch" || path === "/search") return await handleSearch(url, cookie);
		if (path === "/song/detail") return await handleSongDetail(url, cookie);
		if (path === "/song/url/v1" || path === "/song/url") return await handleSongUrlV1(url, cookie);
		if (path === "/lyric/new" || path === "/lyric") return await handleLyricNew(url, cookie);
		if (path === "/song/chorus") return await eapiJson("/api/song/chorus", { id: firstValue(params.get("id"), body.id) }, cookie);
		if (path === "/user/playlist") return await handleUserPlaylists(url, cookie);
		if (path === "/playlist/detail") return await handlePlaylistDetail(url, cookie);
		if (path === "/playlist/track/all") return await handlePlaylistTrackAll(url, cookie);
		if (path === "/playlist/tracks") return await handlePlaylistTracks(url, body, cookie);
		if (path === "/playlist/subscribe") return await handleSubscribe(url, body, cookie, "/api/playlist/subscribe");
		if (path === "/playlist/detail/dynamic") return await eapiJson("/api/playlist/detail/dynamic", { id: firstValue(params.get("id"), body.id) }, cookie);
		if (path === "/album") return await handleAlbum(url, cookie);
		if (path === "/album/sub") return await handleSubscribe(url, body, cookie, "/api/album/sub");
		if (path === "/album/sublist") return await weapiJson("/api/album/sublist", {
			limit: numberValue(params.get("limit"), 25),
			offset: numberValue(params.get("offset"), 0)
		}, cookie);
		if (path === "/album/detail/dynamic") return await eapiJson("/api/album/detail/dynamic", { id: firstValue(params.get("id"), body.id) }, cookie);
		if (path === "/artist/detail") return await handleArtistDetail(url, cookie);
		if (path === "/artist/top/song") return await handleArtistTopSongs(url, cookie);
		if (path === "/artist/songs") return await handleArtistSongs(url, cookie);
		if (path === "/artist/album") return await handleArtistAlbums(url, cookie);
		if (path === "/likelist") return await handleLikedList(url, cookie);
		if (path === "/like") return await handleLike(url, body, cookie);
		if (path === "/like/check") return await handleLikeCheck(url, cookie);
		if (path === "/recommend/songs") return await handleDailyRecommend(url, cookie);
		if (path === "/recommend/songs/dislike") return await eapiJson("/api/recommend/songs/dislike", { id: firstValue(params.get("id"), body.id) }, cookie);
		if (path === "/history/recommend/songs" || path === "/history/recommend/songs/detail") return await handleHistoryRecommend(url, cookie);
		if (path === "/personal_fm" || path === "/personal/fm/mode") return await handlePersonalFm(url, cookie);
		if (path === "/personalized") return await eapiJson("/api/personalized/playlist", { limit: numberValue(params.get("limit"), 35) }, cookie);
		if (path === "/fm_trash") return await eapiJson("/api/radio/trash", { id: firstValue(params.get("id"), body.id) }, cookie);
		if (path === "/scrobble/v1") return { code: 200 };
		if (path === "/user/cloud") return {
			code: 200,
			data: [],
			songs: []
		};
		if (path === "/user/cloud/detail") return {
			code: 200,
			data: [],
			songs: []
		};
		if (path === "/cloud/lyric/get") return {
			code: 200,
			lyric: "",
			lrc: { lyric: "" }
		};
		if (path === "/song/copyright/rcmd") return {
			code: 200,
			data: null
		};
		if (EXPLORE_PATHS.has(path)) noteLibraryStep("netease", "explore:route", {
			path,
			cookie: cookie ? cookie.length : 0
		});
		if (path === "/homepage/block/page") {
			const cursor = firstValue(params.get("cursor"));
			return await readJson("/api/homepage/block/page", {
				refresh: String(firstValue(params.get("refresh"), "false")) !== "false",
				...cursor ? { cursor } : {}
			}, cookie);
		}
		if (path === "/recommend/resource") {
			try {
				const answer = await readJson("/api/v1/discovery/recommend/resource", {}, cookie);
				if (Array.isArray(answer?.recommend) || Array.isArray(answer?.data?.recommend)) return answer;
				noteLibraryStep("netease", "explore:daily-playlists:fallback", { code: answer?.code });
			} catch (error) {
				noteLibraryStep("netease", "explore:daily-playlists:fallback", { message: error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120) });
			}
			return await eapiJson("/api/v1/discovery/recommend/resource", {}, cookie);
		}
		if (path === "/toplist") return await readJson("/api/toplist", {}, cookie);
		if (path === "/simi/song") return await readJson("/api/v1/discovery/simiSong", {
			songid: numberValue(params.get("id")),
			limit: numberValue(params.get("limit"), 50),
			offset: numberValue(params.get("offset"))
		}, cookie);
		if (path === "/top/song") return await readJson("/api/v1/discovery/new/songs", {
			areaId: numberValue(params.get("type")),
			limit: numberValue(params.get("limit"), 100),
			offset: numberValue(params.get("offset"), 0),
			total: true
		}, cookie);
		if (path === "/album/new") return await readJson("/api/album/new", {
			limit: numberValue(params.get("limit"), 30),
			offset: numberValue(params.get("offset")),
			area: firstValue(params.get("area"), "ALL"),
			total: true
		}, cookie);
		if (path === "/top/playlist") return await readJson("/api/playlist/list", {
			cat: firstValue(params.get("cat"), "全部"),
			order: firstValue(params.get("order"), "hot"),
			limit: numberValue(params.get("limit"), 30),
			offset: numberValue(params.get("offset")),
			total: true
		}, cookie);
		return {
			__foliaBridgeError: "ROUTE_NOT_IMPLEMENTED",
			path,
			method,
			message: `Folia bridge does not implement ${method} ${path}`
		};
	}
	async function getFoliaBridgeStatus() {
		const cookie = await getNeteaseCookie();
		const info = await getLoginInfo(cookie);
		return { netease: {
			loggedIn: !!info?.loggedIn,
			nickname: info?.nickname || "",
			avatar: info?.avatar || "",
			hasCookie: hasNeteaseLogin(cookie)
		} };
	}
	async function diagnoseQqLikedSongs() {
		const cookie = await getQQCookie();
		const cookieObject = parseCookieString(cookie);
		const uin = qqCookieUin(cookie);
		const report = {
			hasUin: Boolean(uin),
			hasMusicKey: Boolean(cookieObject.qm_keyst || cookieObject.qqmusic_key || cookieObject.music_key),
			steps: []
		};
		try {
			const fav = await qqGetJSON("https://c.y.qq.com/splcloud/fcgi-bin/fcg_musiclist_getmyfav.fcg", {
				dirid: 201,
				dirinfo: 1,
				g_tk: qqGtk(cookie),
				format: "json",
				loginUin: uin,
				hostUin: uin
			}, cookie);
			const midMap = fav?.mapmid || fav?.data?.mapmid || {};
			const idMap = fav?.map || fav?.data?.map || {};
			report.steps.push({
				name: "getmyfav",
				code: fav?.code,
				subcode: fav?.subcode,
				topKeys: Object.keys(fav || {}).slice(0, 30),
				midCount: Object.keys(midMap || {}).length,
				idCount: Object.keys(idMap || {}).length,
				sampleMids: Object.keys(midMap || {}).slice(0, 3)
			});
		} catch (error) {
			report.steps.push({
				name: "getmyfav",
				error: error?.message || String(error)
			});
		}
		try {
			const encryptedUin = firstValue(cookieObject.encryptUin, cookieObject.encrypt_uin, cookieObject.str_musicid, cookieObject.wxuin, uin);
			const block = (await qqMusicRequest({
				comm: buildQQAuthComm(cookie),
				req_0: {
					module: "music.srfDissInfo.DissInfo",
					method: "CgiGetDiss",
					param: {
						disstid: 0,
						dirid: 201,
						tag: true,
						song_begin: 0,
						song_num: 5,
						userinfo: true,
						orderlist: true,
						enc_host_uin: String(encryptedUin || "")
					}
				}
			}, cookie))?.req_0 || {};
			const data = block.data || {};
			const songs = data.songlist || data.songList || [];
			report.steps.push({
				name: "cgiGetDiss",
				code: block.code,
				subcode: block.subcode,
				dataKeys: Object.keys(data).slice(0, 30),
				songlistCount: Array.isArray(songs) ? songs.length : 0,
				total: numberValue(data.total_song_num, data.total, data.song_num, 0),
				sampleSongKeys: Array.isArray(songs) && songs[0] ? Object.keys(songs[0]).slice(0, 20) : []
			});
		} catch (error) {
			report.steps.push({
				name: "cgiGetDiss",
				error: error?.message || String(error)
			});
		}
		try {
			const block = (await qqMusicRequest({
				comm: buildQQAuthComm(cookie),
				req_0: {
					module: "music.musicasset.PlaylistFavRead",
					method: "GetSongList",
					param: {
						dirId: 201,
						uin: Number(uin) || uin,
						order: 1,
						begin: 0,
						num: 5
					}
				}
			}, cookie))?.req_0 || {};
			const data = block.data || {};
			const songs = data.songlist || data.songList || data.list || [];
			report.steps.push({
				name: "playlistFavRead",
				code: block.code,
				subcode: block.subcode,
				dataKeys: Object.keys(data).slice(0, 30),
				songlistCount: Array.isArray(songs) ? songs.length : 0,
				total: numberValue(data.total, data.total_song_num, data.totalSongNum, 0),
				sampleSongKeys: Array.isArray(songs) && songs[0] ? Object.keys(songs[0]).slice(0, 20) : []
			});
		} catch (error) {
			report.steps.push({
				name: "playlistFavRead",
				error: error?.message || String(error)
			});
		}
		try {
			const json = await qqGetJSON("https://c.y.qq.com/fav/fcgi-bin/fcg_get_profile_order_asset.fcg", {
				ct: 20,
				cid: 205360956,
				userid: uin,
				reqtype: 2,
				sin: 0,
				ein: 4,
				format: "json"
			}, cookie);
			const data = json?.data || json || {};
			const albums = data.albumlist || data.cdlist || data.list || data.albums || [];
			const firstAlbum = Array.isArray(albums) ? albums[0] : null;
			report.steps.push({
				name: "favoriteAlbums",
				code: json?.code,
				subcode: json?.subcode,
				dataKeys: Object.keys(data).slice(0, 30),
				albumCount: Array.isArray(albums) ? albums.length : 0,
				total: numberValue(data.totalalbum, data.total_album, data.total, data.album_total, 0),
				sampleAlbumKeys: Array.isArray(albums) && albums[0] ? Object.keys(albums[0]).slice(0, 20) : []
			});
			const firstAlbumMid = firstValue(firstAlbum?.albumMID, firstAlbum?.albummid, firstAlbum?.albumMid, firstAlbum?.mid);
			if (firstAlbumMid) {
				const detail = await qqGetJSON("https://c.y.qq.com/v8/fcg-bin/fcg_v8_album_info_cp.fcg", {
					albummid: firstAlbumMid,
					format: "json",
					outCharset: "utf-8"
				}, cookie);
				const detailData = detail?.data || {};
				report.steps.push({
					name: "favoriteAlbumDetail",
					code: detail?.code,
					albumMid: firstAlbumMid,
					albumName: detailData.name,
					dataKeys: Object.keys(detailData).slice(0, 30),
					trackCount: Array.isArray(detailData.list) ? detailData.list.length : 0
				});
			}
		} catch (error) {
			report.steps.push({
				name: "favoriteAlbums",
				error: error?.message || String(error)
			});
		}
		return report;
	}
	//#endregion
	exports.diagnoseQqLikedSongs = diagnoseQqLikedSongs;
	exports.getFoliaBridgeStatus = getFoliaBridgeStatus;
	exports.handleFoliaApiRequest = handleFoliaApiRequest;
	return exports;
})({});

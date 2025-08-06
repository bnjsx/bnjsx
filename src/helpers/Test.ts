/**
 * Checks if a value is an instance of `Set`.
 *
 * @param value The value to check.
 * @returns `true` if the value is a `Set`; otherwise, `false`.
 *
 * @example
 * // Instance of Set
 * console.log(isSet(new Set())); // true
 *
 * // Not a Set (Array type)
 * console.log(isSet([])); // false
 */
export function isSet(value: any): value is Set<any> {
  return value instanceof Set;
}

/**
 * Checks if a value is an instance of `Map`.
 *
 * @param value The value to check.
 * @returns `true` if the value is a `Map`; otherwise, `false`.
 *
 * @example
 * // Instance of Map
 * console.log(isMap(new Map())); // true
 *
 * // Not a Map (Object type)
 * console.log(isMap({})); // false
 */
export function isMap(value: any): value is Map<any, any> {
  return value instanceof Map;
}

/**
 * Checks if a value is an instance of `WeakSet`.
 *
 * @param value The value to check.
 * @returns `true` if the value is a `WeakSet`; otherwise, `false`.
 *
 * @example
 * // Instance of WeakSet
 * console.log(isWeakSet(new WeakSet())); // true
 *
 * // Not a WeakSet (Set type)
 * console.log(isWeakSet(new Set())); // false
 */
export function isWeakSet(value: any): value is WeakSet<any> {
  return value instanceof WeakSet;
}

/**
 * Checks if a value is an instance of `WeakMap`.
 *
 * @param value The value to check.
 * @returns `true` if the value is a `WeakMap`; otherwise, `false`.
 *
 * @example
 * // Instance of WeakMap
 * console.log(isWeakMap(new WeakMap())); // true
 *
 * // Not a WeakMap (Map type)
 * console.log(isWeakMap(new Map())); // false
 */
export function isWeakMap(value: any): value is WeakMap<any, any> {
  return value instanceof WeakMap;
}

/**
 * Checks if a value is an array.
 *
 * @param value The value to check.
 * @returns `true` if the value is an array; otherwise, `false`.
 *
 * @example
 * // Array type
 * console.log(isArr([])); // true
 *
 * // Not an array (Object type)
 * console.log(isArr({})); // false
 */
export function isArr(value: any): value is Array<any> {
  return Array.isArray(value);
}

/**
 * Checks if a value is a non-null object (excluding arrays).
 *
 * @param value The value to check.
 * @returns `true` if the value is a non-null object; otherwise, `false`.
 *
 * @example
 * // Object type
 * console.log(isObj({})); // true
 *
 * // Not an object (Array type)
 * console.log(isObj([])); // false
 *
 * // Not an object (null)
 * console.log(isObj(null)); // false
 */
export function isObj(value: any): value is Record<any, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks if a value is a number.
 *
 * @param value The value to check.
 * @returns `true` if the value is a number; otherwise, `false`.
 *
 * @example
 * // Number type
 * console.log(isNum(42)); // true
 *
 * // Not a number (String type)
 * console.log(isNum('42')); // false
 */
export function isNum(value: any): value is number {
  return typeof value === 'number';
}

/**
 * Checks if a value is a string.
 *
 * @param value The value to check.
 * @returns `true` if the value is a string; otherwise, `false`.
 *
 * @example
 * // String type
 * console.log(isTxt('hello')); // true
 *
 * // Not a string (Number type)
 * console.log(isTxt(42)); // false
 */
export function isTxt(value: any): value is string {
  return typeof value === 'string';
}

/**
 * Alias for `isTxt`. Checks if a value is a string.
 *
 * @param value The value to check.
 * @returns `true` if the value is a string; otherwise, `false`.
 *
 * @example
 * // String type
 * console.log(isStr('hello')); // true
 *
 * // Not a string (Number type)
 * console.log(isStr(42)); // false
 */
export function isStr(value: any): value is string {
  return isTxt(value);
}

/**
 * Checks if a value is a boolean.
 *
 * @param value The value to check.
 * @returns `true` if the value is a boolean; otherwise, `false`.
 *
 * @example
 * // Boolean type
 * console.log(isBool(true)); // true
 *
 * // Not a boolean (String type)
 * console.log(isBool('true')); // false
 */
export function isBool(value: any): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Checks if a value is a function.
 *
 * @param value The value to check.
 * @returns `true` if the value is a function; otherwise, `false`.
 *
 * @example
 * // Function type
 * console.log(isFunc(() => {})); // true
 *
 * // Not a function (Object type)
 * console.log(isFunc({})); // false
 */
export function isFunc(value: any): value is Function {
  return typeof value === 'function';
}

/**
 * Checks if a value is a symbol.
 *
 * @param value The value to check.
 * @returns `true` if the value is a symbol; otherwise, `false`.
 *
 * @example
 * // Symbol type
 * console.log(isSymbol(Symbol())); // true
 *
 * // Not a symbol (String type)
 * console.log(isSymbol('symbol')); // false
 */
export function isSymbol(value: any): value is Symbol {
  return typeof value === 'symbol';
}

/**
 * Checks if a value is an integer.
 *
 * @param value The value to check.
 * @returns `true` if the value is an integer; otherwise, `false`.
 *
 * @example
 * // Integer type
 * console.log(isInt(42)); // true
 *
 * // Not an integer (Float type)
 * console.log(isInt(42.42)); // false
 */
export function isInt(value: any): value is number {
  return Number.isFinite(value) && Number.isInteger(value);
}

/**
 * Checks if a value is a floating-point number.
 *
 * @param value The value to check.
 * @returns `true` if the value is a float; otherwise, `false`.
 *
 * @example
 * // Float type
 * console.log(isFloat(42.42)); // true
 *
 * // Not a float (Integer type)
 * console.log(isFloat(42)); // false
 */
export function isFloat(value: any): value is number {
  return Number.isFinite(value) && !Number.isInteger(value);
}

/**
 * Checks if a value is NaN (Not a Number).
 *
 * @param value The value to check.
 * @returns `true` if the value is NaN; otherwise, `false`.
 *
 * @example
 * // NaN value
 * console.log(isNan(NaN)); // true
 *
 * // Not NaN (Number type)
 * console.log(isNan(42)); // false
 */
export function isNan(value: any): value is number {
  return Number.isNaN(value);
}

/**
 * Checks if a value is null.
 *
 * @param value The value to check.
 * @returns `true` if the value is null; otherwise, `false`.
 *
 * @example
 * // Null value
 * console.log(isNull(null)); // true
 *
 * // Not null (Undefined)
 * console.log(isNull(undefined)); // false
 */
export function isNull(value: any): value is null {
  return value === null;
}

/**
 * Checks if a value is undefined.
 *
 * @param value The value to check.
 * @returns `true` if the value is undefined; otherwise, `false`.
 *
 * @example
 * // Undefined value
 * console.log(isUndefined(undefined)); // true
 *
 * // Not undefined (Null value)
 * console.log(isUndefined(null)); // false
 */
export function isUndefined(value: any): value is undefined {
  return value === undefined;
}

/**
 * Checks if a value is defined (not undefined).
 *
 * @param value The value to check.
 * @returns `true` if the value is defined; otherwise, `false`.
 *
 * @example
 * // Defined value
 * console.log(isDefined(42)); // true
 *
 * // Undefined value
 * console.log(isDefined(undefined)); // false
 */
export function isDefined(value: any): boolean {
  return value !== undefined;
}

/**
 * Strictly checks if a value is defined (not null, undefined, or NaN).
 *
 * @param value The value to check.
 * @returns `true` if the value is strictly defined; otherwise, `false`.
 *
 * @example
 * // Defined value
 * console.log(isDefinedStrict(42)); // true
 *
 * // Null value
 * console.log(isDefinedStrict(null)); // false
 *
 * // NaN value
 * console.log(isDefinedStrict(NaN)); // false
 *
 * // Undefined value
 * console.log(isDefinedStrict(undefined)); // false
 */
export function isDefinedStrict(value: any): boolean {
  return !isNull(value) && !isUndefined(value) && !isNan(value);
}

/**
 * Checks if a value is Infinity.
 *
 * @param value The value to check.
 * @returns `true` if the value is Infinity; otherwise, `false`.
 *
 * @example
 * // Infinity value
 * console.log(isInf(Infinity)); // true
 *
 * // Not Infinity (Number type)
 * console.log(isInf(42)); // false
 */
export function isInf(value: any): value is number {
  return value === +Infinity || value === -Infinity;
}

/**
 * Checks if a value is a finite number.
 *
 * @param value The value to check.
 * @returns `true` if the value is finite; otherwise, `false`.
 *
 * @example
 * // Finite number
 * console.log(isFinite(42)); // true
 *
 * // Infinite number
 * console.log(isFinite(Infinity)); // false
 *
 * // NaN value
 * console.log(isFinite(NaN)); // false
 */
export function isFinite(value: any): value is number {
  return Number.isFinite(value);
}

/**
 * Checks if a value is truthy (not falsy).
 *
 * @param value The value to check.
 * @returns `true` if the value is truthy; otherwise, `false`.
 *
 * @example
 * // Truthy value
 * console.log(isTruthy(1)); // true
 *
 * // Falsy value
 * console.log(isTruthy(0)); // false
 */
export function isTruthy(value: any): boolean {
  return !!value;
}

/**
 * Checks if a value is falsy (i.e., false, 0, "", null, undefined, or NaN).
 *
 * @param value The value to check.
 * @returns `true` if the value is falsy; otherwise, `false`.
 *
 * @example
 * // Falsy value
 * console.log(isFalsy(0)); // true
 *
 * // Truthy value
 * console.log(isFalsy(1)); // false
 */
export function isFalsy(value: any): boolean {
  return !value;
}

/**
 * Checks if a value is strictly `false`.
 *
 * @param value The value to check.
 * @returns `true` if the value is strictly `false`; otherwise, `false`.
 *
 * @example
 * // False value
 * console.log(isFalse(false)); // true
 *
 * // Not false (Boolean value)
 * console.log(isFalse(true)); // false
 */
export function isFalse(value: any): value is false {
  return value === false;
}

/**
 * Checks if a value is strictly `true`.
 *
 * @param value The value to check.
 * @returns `true` if the value is strictly `true`; otherwise, `false`.
 *
 * @example
 * // True value
 * console.log(isTrue(true)); // true
 *
 * // Not true (Boolean value)
 * console.log(isTrue(false)); // false
 */
export function isTrue(value: any): value is true {
  return value === true;
}

/**
 * Checks if a value is iterable (i.e., has an `Symbol.iterator` property).
 *
 * @param value The value to check.
 * @returns `true` if the value is iterable; otherwise, `false`.
 *
 * @example
 * // Iterable (Array)
 * console.log(isIterable([1, 2, 3])); // true
 *
 * // Not iterable (Number type)
 * console.log(isIterable(42)); // false
 */
export function isIterable(value: any): value is Iterable<any, any> {
  return Symbol.iterator in Object(value);
}

/**
 * Checks if a number is even.
 *
 * @param value The value to check.
 * @returns `true` if the number is even; otherwise, `false`.
 *
 * @example
 * // Even number
 * console.log(isEven(42)); // true
 *
 * // Odd number
 * console.log(isEven(43)); // false
 */
export function isEven(value: any): value is number {
  return isNum(value) && value % 2 === 0;
}

/**
 * Checks if a number is odd.
 *
 * @param value The value to check.
 * @returns `true` if the number is odd; otherwise, `false`.
 *
 * @example
 * // Odd number
 * console.log(isOdd(43)); // true
 *
 * // Even number
 * console.log(isOdd(42)); // false
 */
export function isOdd(value: any): value is number {
  return isNum(value) && value % 2 !== 0;
}

/**
 * Checks if a string is in camelCase format.
 *
 * @param value The value to check.
 * @returns `true` if the string is camelCase; otherwise, `false`.
 *
 * @example
 * // camelCase format
 * console.log(isCamelCase('camelCase')); // true
 *
 * // Not camelCase (Snake case)
 * console.log(isCamelCase('snake_case')); // false
 */
export function isCamelCase(value: any): boolean {
  if (!isStr(value)) return false;
  return /^[a-z]+(?:[A-Z][a-z0-9]*)*$/.test(value);
}

/**
 * Checks if a string is in PascalCase format.
 *
 * @param value The value to check.
 * @returns `true` if the string is PascalCase; otherwise, `false`.
 *
 * @example
 * // PascalCase format
 * console.log(isPascalCase('PascalCase')); // true
 *
 * // Not PascalCase (camelCase)
 * console.log(isPascalCase('pascalCase')); // false
 */
export function isPascalCase(value: any): boolean {
  if (!isStr(value)) return false;
  return /^([A-Z][a-z0-9]*)+$/.test(value);
}

/**
 * Checks if a string is in snake_case format.
 *
 * @param value The value to check.
 * @returns `true` if the string is snake_case; otherwise, `false`.
 *
 * @example
 * // snake_case format
 * console.log(isSnakeCase('snake_case')); // true
 *
 * // Not snake_case (camelCase)
 * console.log(isSnakeCase('snakeCase')); // false
 */
export function isSnakeCase(value: any): boolean {
  if (!isStr(value)) return false;
  return /^[a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)*$/.test(value);
}

/**
 * Checks if a string is in kebab-case format.
 *
 * @param value The value to check.
 * @returns `true` if the string is kebab-case; otherwise, `false`.
 *
 * @example
 * // kebab-case format
 * console.log(iskababCase('kebab-case')); // true
 *
 * // Not kebab-case (camelCase)
 * console.log(iskababCase('kebabCase')); // false
 */
export function iskababCase(value: any): boolean {
  if (!isStr(value)) return false;
  return /^[a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*$/.test(value);
}

/**
 * Checks if a value is an instance of the `Error` object.
 *
 * @param value The value to check.
 * @returns `true` if the value is an `Error` object; otherwise, `false`.
 *
 * @example
 * // Error object
 * console.log(isError(new Error())); // true
 *
 * // Not an Error object (String)
 * console.log(isError('Error')); // false
 */
export function isError(value: any): value is Error {
  return value instanceof Error;
}

/**
 * Checks if an object is a child of the given class (instanceof).
 *
 * @param child The child object.
 * @param parent The parent class.
 * @returns `true` if `c` is a child of `p`; otherwise, `false`.
 *
 * @example
 * class Parent {} // Parent class
 * const child = new Parent(); // child object
 *
 * // child instanceof Parent
 * console.log(isChildOf(child, Parent)); // true
 *
 * // {} instanceof Parent
 * console.log(isChildOf({}, Parent)); // false
 */
export function isChildOf(child: any, parent: any): boolean {
  return child instanceof parent;
}

/**
 * Checks if a value is a class (constructor function).
 *
 * @param value The value to check.
 * @returns `true` if the value is a class; otherwise, `false`.
 *
 * @example
 * // Class (constructor function)
 * console.log(isClass(class MyClass {})); // true
 *
 * // Not a class (Function)
 * console.log(isClass(function myFunc() {})); // false
 */
export function isClass(value: any): boolean {
  return isFunc(value) && value.toString().startsWith('class');
}

/**
 * Checks if a class is a subclass of another class.
 *
 * @param child The child class.
 * @param parent The parent class.
 * @returns `true` if `child` is a subclass of `parent`; otherwise, `false`.
 *
 * @example
 * class Parent {} // Parent class
 * class Child extends Parent {} // Child class
 *
 * // Child class is a subclass of Parent class (child extends parent)
 * console.log(isSubclass(Child, Parent)); // true
 *
 * // Parent class is a subclass of Child class (parent extends child)
 * console.log(isSubclass(Parent, Child)); // false
 */
export function isSubclass(child: any, parent: any): boolean {
  if (!isFunc(child) || !isFunc(parent)) return false;
  return parent.prototype.isPrototypeOf(child.prototype);
}

/**
 * Checks if a value is a valid `Date` object.
 *
 * @param value The value to check.
 * @returns `true` if the value is a `Date` object; otherwise, `false`.
 *
 * @example
 * // Date object
 * console.log(isDate(new Date())); // true
 *
 * // Not a Date object (String)
 * console.log(isDate('2021-01-01')); // false
 */
export function isDate(value: any): value is Date {
  return value instanceof Date;
}

/**
 * Checks if a value is a valid `RegExp` (Regular Expression).
 *
 * @param value The value to check.
 * @returns `true` if the value is a `RegExp` object; otherwise, `false`.
 *
 * @example
 * // Regular Expression object
 * console.log(isRegex(/abc/)); // true
 *
 * // Not a Regular Expression object (String)
 * console.log(isRegex('abc')); // false
 */
export function isRegex(value: any): value is RegExp {
  return value instanceof RegExp;
}

/**
 * Checks if a value is a Promise.
 *
 * @param value The value to check.
 * @returns `true` if the value is a Promise; otherwise, `false`.
 *
 * @example
 * // Promise object
 * console.log(isPromise(Promise.resolve())); // true
 *
 * // Not a Promise (Function)
 * console.log(isPromise(function() {})); // false
 */
export function isPromise(value: any): value is Promise<any> {
  return value instanceof Promise;
}

/**
 * Checks if an object is non-empty (has at least one property).
 *
 * @param value The value to check.
 * @returns `true` if the object is non-empty; otherwise, `false`.
 *
 * @example
 * // Non-empty object
 * console.log(isFullObj({ key: 'value' })); // true
 *
 * // Empty object
 * console.log(isFullObj({})); // false
 */
export function isFullObj(value: any): value is Record<any, any> {
  return isObj(value) && Object.keys(value).length > 0;
}

/**
 * Checks if an array is non-empty (has at least one element).
 *
 * @param value The value to check.
 * @returns `true` if the array is non-empty; otherwise, `false`.
 *
 * @example
 * // Non-empty array
 * console.log(isFullArr([1, 2, 3])); // true
 *
 * // Empty array
 * console.log(isFullArr([])); // false
 */
export function isFullArr(value: any): value is Array<any> {
  return isArr(value) && value.length > 0;
}

/**
 * Checks if a string is non-empty (contains at least one non-whitespace character).
 *
 * @param value The value to check.
 * @returns `true` if the string is non-empty; otherwise, `false`.
 *
 * @example
 * // Non-empty string
 * console.log(isFullStr('Hello')); // true
 *
 * // Empty string
 * console.log(isFullStr('   ')); // false
 */
export function isFullStr(value: any): value is string {
  return isStr(value) && value.trim().length > 0;
}

/**
 * Checks if an object is empty (has no properties).
 *
 * @param value The value to check.
 * @returns `true` if the object is empty; otherwise, `false`.
 *
 * @example
 * // Empty object
 * console.log(isEmptyObj({})); // true
 *
 * // Non-empty object
 * console.log(isEmptyObj({ key: 'value' })); // false
 */
export function isEmptyObj(value: any): value is Record<any, any> {
  return isObj(value) && Object.keys(value).length === 0;
}

/**
 * Checks if an array is empty (contains no elements).
 *
 * @param value The value to check.
 * @returns `true` if the array is empty; otherwise, `false`.
 *
 * @example
 * // Empty array
 * console.log(isEmptyArr([])); // true
 *
 * // Non-empty array
 * console.log(isEmptyArr([1])); // false
 */
export function isEmptyArr(value: any): boolean {
  return isArr(value) && value.length === 0;
}

/**
 * Checks if a string is empty (contains non-whitespace characters).
 *
 * @param value The value to check.
 * @returns `true` if the string is empty; otherwise, `false`.
 *
 * @example
 * // Empty string
 * console.log(isEmptyStr('')); // true
 * console.log(isEmptyStr('   ')); // true
 * console.log(isEmptyStr('\s\s\s')); // true
 *
 * // Non-empty string
 * console.log(isEmptyStr('Hello')); // false
 */
export function isEmptyStr(value: any): boolean {
  return isStr(value) && value.trim().length === 0;
}

/**
 * Checks if an array is non-empty and contains only numbers.
 *
 * @param value The value to check.
 * @returns `true` if the array contains only numbers; otherwise, `false`.
 *
 * @example
 * // Array of numbers
 * console.log(isArrOfNum([1, 2, 3.3])); // true
 *
 * // Array containing non-number values
 * console.log(isArrOfNum([1, 'two', 3.3])); // false
 */
export function isArrOfNum(value: any): boolean {
  return isFullArr(value) && value.every((item: any) => isNum(item));
}

/**
 * Checks if an array is non-empty and contains only integers.
 *
 * @param value The value to check.
 * @returns `true` if the array contains only integers; otherwise, `false`.
 *
 * @example
 * // Array of integers
 * console.log(isArrOfInt([1, 2, 3])); // true
 *
 * // Array containing non-integer values
 * console.log(isArrOfInt([1, 2.5, 3])); // false
 */
export function isArrOfInt(value: any): boolean {
  return isFullArr(value) && value.every((item: any) => isInt(item));
}

/**
 * Checks if an array is non-empty and contains only floating-point numbers.
 *
 * @param value The value to check.
 * @returns `true` if the array contains only floating-point numbers; otherwise, `false`.
 *
 * @example
 * // Array of floats
 * console.log(isArrOfFloat([1.5, 2.7, 3.2])); // true
 *
 * // Array containing non-float values
 * console.log(isArrOfFloat([1, 2.5, '3'])); // false
 */
export function isArrOfFloat(value: any): boolean {
  return isFullArr(value) && value.every((item: any) => isFloat(item));
}

/**
 * Checks if an array is non-empty and contains only strings.
 *
 * @param value The value to check.
 * @returns `true` if the array contains only strings; otherwise, `false`.
 *
 * @example
 * // Array of strings
 * console.log(isArrOfStr(['hello', 'world'])); // true
 *
 * // Array containing non-string values
 * console.log(isArrOfStr(['hello', 123])); // false
 */
export function isArrOfStr(value: any): value is Array<string> {
  return isFullArr(value) && value.every((item: any) => isStr(item));
}

/**
 * Checks if an array is non-empty and contains only arrays.
 *
 * @param value The value to check.
 * @returns `true` if the array contains only arrays; otherwise, `false`.
 *
 * @example
 * // Array of arrays
 * console.log(isArrOfArr([[], []])); // true
 *
 * // Array containing non-array values
 * console.log(isArrOfArr([[], 'two'])); // false
 */
export function isArrOfArr(value: any): boolean {
  return isFullArr(value) && value.every((item: any) => isArr(item));
}

/**
 * Checks if an array is non-empty and contains only objects.
 *
 * @param value The value to check.
 * @returns `true` if the array contains only objects; otherwise, `false`.
 *
 * @example
 * // Array of objects
 * console.log(isArrOfObj([{}, {}])); // true
 *
 * // Array containing non-object values
 * console.log(isArrOfObj([{}, 1])); // false
 */
export function isArrOfObj(value: any): boolean {
  return isFullArr(value) && value.every((item: any) => isObj(item));
}

/**
 * Checks if an array is non-empty and contains only functions.
 *
 * @param value The value to check.
 * @returns `true` if the array contains only functions; otherwise, `false`.
 *
 * @example
 * // Array of functions
 * console.log(isArrOfFunc([() => {}, () => {}])); // true
 *
 * // Array containing non-function values
 * console.log(isArrOfFunc([() => {}, 'string'])); // false
 */
export function isArrOfFunc(value: any): boolean {
  return isFullArr(value) && value.every((item: any) => isFunc(item));
}

/**
 * Checks if an array is non-empty and contains only booleans.
 *
 * @param value The value to check.
 * @returns `true` if the array contains only booleans; otherwise, `false`.
 *
 * @example
 * // Array of booleans
 * console.log(isArrOfBool([true, false, true])); // true
 *
 * // Array containing non-boolean values
 * console.log(isArrOfBool([true, 'false'])); // false
 */
export function isArrOfBool(value: any): boolean {
  return isFullArr(value) && value.every((item: any) => isBool(item));
}

/**
 * Checks if an array is non-empty and allows any type of value (no type restriction).
 *
 * @param value The value to check.
 * @returns `true` if the array is non-empty; otherwise, `false`.
 *
 * @example
 * // Any array (of any type of values)
 * console.log(isArrOfAny([1, 'string', true])); // true
 *
 * // Empty array
 * console.log(isArrOfAny([])); // false
 */
export function isArrOfAny(value: any): boolean {
  return isFullArr(value);
}

/**
 * Checks if an object is non-empty and contains only numeric values.
 *
 * @param value The value to check.
 * @returns `true` if the object contains only numbers; otherwise, `false`.
 *
 * @example
 * // Object with numeric values
 * console.log(isObjOfNum({a: 1, b: 2.2})); // true
 *
 * // Object containing non-numeric values
 * console.log(isObjOfNum({a: 1, b: 'two'})); // false
 */
export function isObjOfNum(value: any): boolean {
  return (
    isFullObj(value) && Object.values(value).every((item: any) => isNum(item))
  );
}

/**
 * Checks if an object is non-empty and contains only integer values.
 *
 * @param value The value to check.
 * @returns `true` if the object contains only integers; otherwise, `false`.
 *
 * @example
 * // Object with integer values
 * console.log(isObjOfInt({a: 1, b: 2})); // true
 *
 * // Object containing non-integer values
 * console.log(isObjOfInt({a: 1, b: 2.5})); // false
 */
export function isObjOfInt(value: any): boolean {
  return (
    isFullObj(value) && Object.values(value).every((item: any) => isInt(item))
  );
}

/**
 * Checks if an object is non-empty and contains only floating-point values.
 *
 * @param value The value to check.
 * @returns `true` if the object contains only floats; otherwise, `false`.
 *
 * @example
 * // Object with floating-point values
 * console.log(isObjOfFloat({a: 1.1, b: 2.5})); // true
 *
 * // Object containing non-float values
 * console.log(isObjOfFloat({a: 1, b: '2.5'})); // false
 */
export function isObjOfFloat(value: any): boolean {
  return (
    isFullObj(value) && Object.values(value).every((item: any) => isFloat(item))
  );
}

/**
 * Checks if an object is non-empty and contains only string values.
 *
 * @param value The value to check.
 * @returns `true` if the object contains only strings; otherwise, `false`.
 *
 * @example
 * // Object with string values
 * console.log(isObjOfStr({a: 'apple', b: 'banana'})); // true
 *
 * // Object containing non-string values
 * console.log(isObjOfStr({a: 'apple', b: 123})); // false
 */
export function isObjOfStr(value: any): boolean {
  return (
    isFullObj(value) && Object.values(value).every((item: any) => isStr(item))
  );
}

/**
 * Checks if an object is non-empty and contains only arrays as values.
 *
 * @param value The value to check.
 * @returns `true` if the object contains only arrays as values; otherwise, `false`.
 *
 * @example
 * // Object with array values
 * console.log(isObjOfArr({a: [1, 2], b: [3, 4]})); // true
 *
 * // Object containing non-array values
 * console.log(isObjOfArr({a: [1, 2], b: 'string'})); // false
 */
export function isObjOfArr(value: any): boolean {
  return (
    isFullObj(value) && Object.values(value).every((item: any) => isArr(item))
  );
}

/**
 * Checks if an object is non-empty and contains only objects as values.
 *
 * @param value The value to check.
 * @returns `true` if the object contains only objects as values; otherwise, `false`.
 *
 * @example
 * // Object with object values
 * console.log(isObjOfObj({a: {x: 1}, b: {y: 2}})); // true
 *
 * // Object containing non-object values
 * console.log(isObjOfObj({a: {x: 1}, b: 'string'})); // false
 */
export function isObjOfObj(value: any): boolean {
  return (
    isFullObj(value) && Object.values(value).every((item: any) => isObj(item))
  );
}

/**
 * Checks if an object is non-empty and contains only functions as values.
 *
 * @param value The value to check.
 * @returns `true` if the object contains only functions as values; otherwise, `false`.
 *
 * @example
 * // Object with function values
 * console.log(isObjOfFunc({a: () => {}, b: () => {}})); // true
 *
 * // Object containing non-function values
 * console.log(isObjOfFunc({a: () => {}, b: 'string'})); // false
 */
export function isObjOfFunc(value: any): boolean {
  return (
    isFullObj(value) && Object.values(value).every((item: any) => isFunc(item))
  );
}

/**
 * Checks if an object is non-empty and contains only boolean values.
 *
 * @param value The value to check.
 * @returns `true` if the object contains only booleans as values; otherwise, `false`.
 *
 * @example
 * // Object with boolean values
 * console.log(isObjOfBool({a: true, b: false})); // true
 *
 * // Object containing non-boolean values
 * console.log(isObjOfBool({a: true, b: 'false'})); // false
 */
export function isObjOfBool(value: any): boolean {
  return (
    isFullObj(value) && Object.values(value).every((item: any) => isBool(item))
  );
}

/**
 * Checks if an object is non-empty and allows any type of value (no type restriction).
 *
 * @param value The value to check.
 * @returns `true` if the object is non-empty; otherwise, `false`.
 *
 * @example
 * // Object with any type of values
 * console.log(isObjOfAny({a: 1, b: 'string'})); // true
 *
 * // Empty object
 * console.log(isObjOfAny({})); // false
 */
export function isObjOfAny(value: any): boolean {
  return isFullObj(value);
}

/**
 * Checks if a string is in ISO 8601 format (e.g., "2024-11-28T12:30:00.000Z").
 *
 * @param value The value to check.
 * @returns `true` if the string matches the ISO 8601 format; otherwise, `false`.
 *
 * @example
 * // Valid ISO date
 * console.log(isIso('2024-11-28T12:30:00.000Z')); // true
 *
 * // Invalid ISO date
 * console.log(isIso('2024-11-28')); // false
 */
export function isIso(value: any): boolean {
  if (!isStr(value)) return false;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value);
}

/**
 * Checks if a string is in the datetime format (e.g., "2024-11-28 12:30:00").
 *
 * @param value The value to check.
 * @returns `true` if the string matches the datetime format; otherwise, `false`.
 *
 * @example
 * // Valid datetime string
 * console.log(isDateTime('2024-11-28 12:30:00')); // true
 *
 * // Invalid datetime string
 * console.log(isDateTime('2024-11-28')); // false
 */
export function isDateTime(value: any): boolean {
  if (!isStr(value)) return false;
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
}

/**
 * Checks if a string is in the date format (e.g., "2024-11-28").
 *
 * @param date The value to check.
 * @returns `true` if the string matches the date format; otherwise, `false`.
 *
 * @example
 * // Valid date string
 * console.log(isDateStr('2024-11-28')); // true
 *
 * // Invalid date string
 * console.log(isDateStr('2024-11-28 12:30:00')); // false
 */
export function isDateExp(date: any): boolean {
  if (!isStr(date)) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/**
 * Checks if a string is in the time format (e.g., "12:30:00").
 *
 * @param date The value to check.
 * @returns `true` if the string matches the time format; otherwise, `false`.
 *
 * @example
 * // Valid time string
 * console.log(isTimeStr('12:30:00')); // true
 *
 * // Invalid time string
 * console.log(isTimeStr('12:30')); // false
 */
export function isTimeExp(date: any): boolean {
  if (!isStr(date)) return false;
  return /^\d{2}:\d{2}:\d{2}$/.test(date);
}

/**
 * Checks if a string is a valid property name (e.g., a valid JavaScript variable name).
 *
 * @param value The value to check.
 * @returns `true` if the string matches the property name pattern; otherwise, `false`.
 *
 * @example
 * // Valid property name
 * console.log(isPropExp('myVar')); // true
 *
 * // Invalid property name
 * console.log(isPropExp('123var')); // false
 */
export function isPropExp(value: any): boolean {
  if (!isStr(value)) return false;

  return /^(?:[a-zA-Z_$][a-zA-Z0-9_$]*)$/.test(value);
}

/**
 * Checks if a string is a valid number (including integers and floats).
 *
 * @param value The value to check.
 * @returns `true` if the string is a valid number; otherwise, `false`.
 *
 * @example
 * // Valid number
 * console.log(isNumExp('123')); // true
 * console.log(isNumExp('123.45')); // true
 *
 * // Invalid number
 * console.log(isNumExp('abc')); // false
 */
export function isNumExp(value: any): boolean {
  if (!isStr(value)) return false;
  return /^(?:[0-9]+(?:\.[0-9]+)?)$/.test(value);
}

/**
 * Checks if a string is a valid integer.
 *
 * @param value The value to check.
 * @returns `true` if the string is a valid integer; otherwise, `false`.
 *
 * @example
 * // Valid integer
 * console.log(isIntExp('123')); // true
 *
 * // Invalid integer
 * console.log(isIntExp('123.45')); // false
 */
export function isIntExp(value: any): boolean {
  if (!isStr(value)) return false;

  return /^(?:[0-9]*)$/.test(value);
}

/**
 * Checks if a string is a valid float (decimal number).
 *
 * @param value The value to check.
 * @returns `true` if the string is a valid float; otherwise, `false`.
 *
 * @example
 * // Valid float
 * console.log(isFloatExp('123.45')); // true
 *
 * // Invalid float
 * console.log(isFloatExp('123')); // false
 */
export function isFloatExp(value: any): boolean {
  if (!isStr(value)) return false;

  return /^(?:[0-9]+\.[0-9]+)$/.test(value);
}

/**
 * Checks if a string is a valid string literal (single or double-quoted).
 *
 * @param value The value to check.
 * @returns `true` if the string is a valid string literal; otherwise, `false`.
 *
 * @example
 * // Valid string literal
 * console.log(isStrExp("'hello'")); // true
 * console.log(isStrExp('"world"')); // true
 *
 * // Invalid string literal
 * console.log(isStrExp('hello')); // false
 */
export function isStrExp(value: any): boolean {
  if (!isStr(value)) return false;

  return /^(?:'[^']*'|"[^"]*")$/.test(value);
}

/**
 * Checks if a string is a valid dot notation expression for property access.
 *
 * @param value The value to check.
 * @returns `true` if the string is a valid dot notation expression; otherwise, `false`.
 *
 * @example
 * // Valid dot notation expression
 * console.log(isDotExp('object.property')); // true
 *
 * // Invalid dot notation expression
 * console.log(isDotExp('object.123property')); // false
 */
export function isDotExp(value: any): boolean {
  if (!isStr(value)) return false;

  return /^([a-z_$][a-z0-9_$]*(?:\.[a-z_$][a-z0-9_$]*)+)$/i.test(value);
}

/**
 * Checks if a string is a valid bracket notation expression for property access.
 *
 * @param value The value to check.
 * @returns `true` if the string is a valid bracket notation expression; otherwise, `false`.
 *
 * @example
 * // Valid bracket notation expression
 * console.log(isBracketExp('object["property"]')); // true
 *
 * // Invalid bracket notation expression
 * console.log(isBracketExp('object["123"]')); // false
 */
export function isBracketExp(value: any): boolean {
  if (!isStr(value)) return false;
  return /^([a-z_$][a-z0-9_$]*(?:\[(?:\d+|["'][a-z_$][a-z0-9_$]*["'])\])+)$/i.test(
    value
  );
}

/**
 * Checks if a string is a valid combination of dot and bracket notations.
 *
 * @param value The value to check.
 * @returns `true` if the string is a valid combination of dot and bracket notations; otherwise, `false`.
 *
 * @example
 * // Valid combination of dot and bracket notations
 * console.log(isAnyExp('object.property[0]')); // true
 * console.log(isAnyExp('object.property["key"]')); // true
 *
 * // Invalid combination of dot and bracket notations
 * console.log(isAnyExp('object.123property[0]')); // false
 */
export function isAnyExp(value: any): boolean {
  if (!isStr(value)) return false;
  return /^(?:[a-z_$][a-z0-9_$]*(?:\[(?:\d+|["'][a-z_$][a-z0-9_$]*["'])\]|\.[a-z_$][a-z0-9_$]*)+)$/.test(
    value
  );
}

/**
 * Checks if an object has a specific property.
 *
 * @param object The object to check.
 * @param property The property to check for.
 * @returns `true` if the object has the specified property; otherwise, `false`.
 *
 * @example
 * // Object with the property
 * console.log(hasProp({a: 1, b: 2}, 'a')); // true
 *
 * // Object without the property
 * console.log(hasProp({a: 1, b: 2}, 'c')); // false
 */
export function hasProp(object: any, property: any): boolean {
  if (!isObj(object)) return false;
  if (!isStr(property)) return false;
  return property in object;
}

/**
 * Checks if an object has all specified properties.
 *
 * @param object The object to check.
 * @param properties The list of properties to check for.
 * @returns `true` if the object has all the specified properties; otherwise, `false`.
 *
 * @example
 * // Object with all properties
 * console.log(hasProps({a: 1, b: 2}, 'a', 'b')); // true
 *
 * // Object without all properties
 * console.log(hasProps({a: 1, b: 2}, 'a', 'c')); // false
 */
export function hasProps(object: any, ...properties: Array<any>): boolean {
  if (!isObj(object)) return false;
  if (!isArrOfStr(properties)) return false;
  return properties.every((prop) => prop in object);
}

/**
 * Checks if an index is within the range of a target (array, string).
 *
 * @param target The target (array, string) to check.
 * @param index The index to check.
 * @returns `true` if the index is within range; otherwise, `false`.
 *
 * @example
 * // Valid index in array
 * console.log(hasIndex([1, 2, 3], 1)); // true
 *
 * // Invalid index in array
 * console.log(hasIndex([1, 2, 3], 3)); // false
 *
 * // Valid index in string
 * console.log(hasIndex('hello', 1)); // true
 *
 * // Invalid index in string
 * console.log(hasIndex('hello', 5)); // false
 */
export function hasIndex(target: any, index: any): boolean {
  if (!isInt(index) || index < 0) return false;
  if (isArr(target) && index < target.length) return true;
  if (isStr(target) && index < target.length) return true;
  return false;
}

/**
 * Checks if the length of a target (array, string, or object) matches a specified length.
 *
 * @param target The target (array, string, or object) to check.
 * @param length The length to compare against.
 * @returns `true` if the length of the target matches the specified length; otherwise, `false`.
 *
 * @example
 * // Array with the correct length
 * console.log(hasLength([1, 2, 3], 3)); // true
 *
 * // Array with the incorrect length
 * console.log(hasLength([1, 2, 3], 2)); // false
 *
 * // String with the correct length
 * console.log(hasLength('hello', 5)); // true
 *
 * // String with the incorrect length
 * console.log(hasLength('hello', 4)); // false
 *
 * // Object with the correct number of properties
 * console.log(hasLength({a: 1, b: 2}, 2)); // true
 *
 * // Object with the incorrect number of properties
 * console.log(hasLength({a: 1, b: 2}, 1)); // false
 */
export function hasLength(target: any, length: any): boolean {
  if (!isInt(length) || length < 0) return false;
  if (isArr(target) && length === target.length) return true;
  if (isStr(target) && length === target.length) return true;
  if (isObj(target) && length === Object.keys(target).length) return true;
  return false;
}

/**
 * Checks if a regex has a specific flag.
 *
 * @param regex The regular expression to check.
 * @param flag The flag to check for.
 * @returns `true` if the regex has the specified flag; otherwise, `false`.
 *
 * @example
 * // Regex with a specific flag
 * console.log(hasFlag(/abc/i, 'i')); // true
 *
 * // Regex without a specific flag
 * console.log(hasFlag(/abc/i, 'g')); // false
 */
export function hasFlag(regex: any, flag: any): boolean {
  if (!isRegex(regex)) return false;
  if (!isStr(flag)) return false;
  return regex.flags.includes(flag);
}

/**
 * Checks if an object has a specific key (property name).
 *
 * @param object The object to check.
 * @param key The key to check for.
 * @returns `true` if the object has the specified key; otherwise, `false`.
 *
 * @example
 * // Object with the key
 * console.log(hasKey({a: 1, b: 2}, 'a')); // true
 *
 * // Object without the key
 * console.log(hasKey({a: 1, b: 2}, 'c')); // false
 */
export function hasKey(object: any, key: any): boolean {
  return hasProp(object, key);
}

/**
 * Checks if an object contains all of the specified keys (property names).
 *
 * @param object The object to check.
 * @param keys The array of keys to check for.
 * @returns `true` if the object has all the specified keys; otherwise, `false`.
 *
 * @example
 * // Object with all the keys
 * console.log(hasKeys({a: 1, b: 2}, 'a', 'b')); // true
 *
 * // Object missing a key
 * console.log(hasKeys({a: 1, b: 2}, 'a', 'c')); // false
 *
 * // Object with extra keys
 * console.log(hasKeys({a: 1, b: 2, c: 3}, 'a', 'b')); // true
 */
export function hasKeys(object: any, ...keys: Array<any>): boolean {
  return hasProps(object, ...keys);
}

/**
 * Checks if an (object|array|string) has a specific value.
 *
 * @param target The (object|array|string) to check.
 * @param value The value to check for.
 * @returns `true` if the target contains the specified value; otherwise, `false`.
 *
 * @example
 * // Object with the value
 * console.log(hasValue({a: 1, b: 2}, 2)); // true
 *
 * // Array with the value
 * console.log(hasValue([1, 2, 3], 2)); // true
 *
 * // String with the value
 * console.log(hasValue('hello world', 'world')); // true
 *
 * // Object without the value
 * console.log(hasValue({a: 1, b: 2}, 3)); // false
 */
export function hasValue(target: any, value: any): boolean {
  if (isObj(target)) return Object.values(target).includes(value);
  if (isArr(target)) return target.includes(value);
  if (isStr(target)) return target.includes(value);
  return false;
}

/**
 * Checks if an (object|array|string) contains all of the specified values.
 *
 * @param target The (object|array|string) to check.
 * @param values The array of values to check for.
 * @returns `true` if the target contains all the specified values; otherwise, `false`.
 *
 * @example
 * // Object with all the values
 * console.log(hasValues({a: 1, b: 2}, 1, 2)); // true
 *
 * // Array with all the values
 * console.log(hasValues([1, 2, 3], 1, 3)); // true
 *
 * // String with all the values
 * console.log(hasValues('hello world', 'hello', 'world')); // true
 *
 * // Array missing a value
 * console.log(hasValues(['hello', 'foo'], 'hello', 'bar')); // false
 */
export function hasValues(target: any, ...values: Array<any>): boolean {
  if (isObj(target)) {
    return values.every((value) => Object.values(target).includes(value));
  }

  if (isArr(target)) {
    return values.every((value) => target.includes(value));
  }

  if (isStr(target)) {
    return values.every((value) => target.includes(value));
  }

  return false;
}

/**
 * Checks if the given value is a valid email address.
 *
 * @param value - The value to be checked.
 * @returns - Returns `true` if the value is a valid email, otherwise `false`.
 */
export function isEmail(value: any): boolean {
  if (!isStr(value)) return false;

  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return emailPattern.test(value);
}

/**
 * Defines the validation rules for a password.
 */
export type PasswordOptions = {
  /** Minimum required numeric characters (digits) in the password. */
  numbers?: number;
  /** Minimum required letter characters (any language) in the password. */
  letters?: number;
  /** Minimum required special characters (non-letter, non-digit) in the password. */
  symbols?: number;
};

/**
 * Checks if the given value is a valid password based on the specified requirements.
 *
 * This function supports multiple languages and scripts, ensuring proper validation
 * for passwords containing numbers, letters (from any language), and symbols.
 *
 * @param value - The value to be checked.
 * @param options - The password validation options.
 * @param options.numbers - Minimum required numeric characters (digits) in the password. Defaults to `1`.
 * @param options.letters - Minimum required letter characters (any language) in the password. Defaults to `1`.
 * @param options.symbols - Minimum required special characters (non-letter, non-digit) in the password. Defaults to `1`.
 * @returns Returns `true` if the password meets the specified criteria, otherwise `false`.
 */
export function isPassword(value: any, options: PasswordOptions = {}): boolean {
  if (!isStr(value)) return false;
  if (!isInt(options.letters)) options.letters = 1;
  if (!isInt(options.numbers)) options.numbers = 1;
  if (!isInt(options.symbols)) options.symbols = 1;

  const { numbers, letters, symbols } = options;

  if ((value.match(/\p{N}/gu) || []).length < numbers) return false;
  if ((value.match(/\p{L}/gu) || []).length < letters) return false;
  if ((value.match(/[^\p{L}\p{N}]/gu) || []).length < symbols) return false;

  return true;
}

/**
 * Checks if the given value is a valid HTTP method.
 *
 * @param value - The value to check.
 * @returns Returns `true` if the value is a valid HTTP method, otherwise `false`.
 */
export function isHTTPMethod(value: any): boolean {
  return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'].includes(
    value
  );
}

/**
 * Checks if the given value is a `Buffer` or `Uint8Array`.
 *
 * @param value - The value to check.
 * @returns Returns `true` if the value is a `Buffer` or `Uint8Array`, otherwise `false`.
 */
export function isBuffer(value: any): value is Buffer | Uint8Array {
  return value instanceof Buffer || value instanceof Uint8Array;
}

/**
 * Validates whether a given string is a well-formed, fully valid URL.
 *
 * @param url - The URL string to validate.
 * @param protocols - An optional array of allowed protocols (e.g., `['http', 'https']`). Defaults to `['https']`.
 * @param strict - If true, disables normalization (e.g., trimming or lowercasing). Defaults to false (normalizes).
 *
 * @returns True if the URL is valid, matches an allowed protocol, and matches its full normalized form. False otherwise.
 **/
export function isUrl(
  url: string,
  protocols?: string[],
  strict?: boolean
): boolean {
  if (!isStr(url)) return false;
  if (!isArrOfStr(protocols)) protocols = ['https'];
  if (!strict) url = url.trim().toLocaleLowerCase();

  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.slice(0, -1).toLowerCase();
    const isAllowed = protocols.map((p) => p.toLowerCase()).includes(protocol);

    url = url.endsWith('/') ? url : url.concat('/');
    return isAllowed && url === parsed.href;
  } catch {
    return false;
  }
}

/**
 * Check if the given value is a valid integer ID (non-zero).
 *
 * Typically used to validate route parameters such as `:id`
 * to ensure they are positive integers and safe for use in DB queries.
 *
 * @param value - The value to check (string or number).
 * @returns `true` if the value is a valid integer ID > 0.
 */
export function isId(value: any): boolean {
  if (isInt(value)) return value > 0;

  if (isStr(value)) {
    const parsed = parseInt(value, 10);
    return parsed > 0 && parsed.toString() === value.trim();
  }

  return false;
}

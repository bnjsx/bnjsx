import {
  isFullObj,
  isFullArr,
  isFullStr,
  isEmptyObj,
  isEmptyArr,
  isEmptyStr,
  isArrOfNum,
  isArrOfInt,
  isArrOfFloat,
  isArrOfStr,
  isArrOfObj,
  isArrOfArr,
  isArrOfFunc,
  isArrOfBool,
  isArrOfAny,
  isObjOfNum,
  isObjOfInt,
  isObjOfFloat,
  isObjOfStr,
  isObjOfArr,
  isObjOfObj,
  isObjOfFunc,
  isObjOfBool,
  isObjOfAny,
  isArr,
  isObj,
  isNum,
  isStr,
  isBool,
  isFunc,
  isSymbol,
  isInt,
  isFloat,
  isNan,
  isUndefined,
  isDefined,
  isDefinedStrict,
  isInf,
  isTruthy,
  isFalsy,
  isFalse,
  isTrue,
  isIterable,
  isEven,
  isOdd,
  isError,
  isPromise,
  isChildOf,
  isClass,
  isSubclass,
  isRegex,
  isIso,
  isDateExp,
  isTimeExp,
  isDateTime,
  isCamelCase,
  isSnakeCase,
  isPascalCase,
  iskababCase,
  isPropExp,
  isNumExp,
  isIntExp,
  isFloatExp,
  isStrExp,
  isDotExp,
  isBracketExp,
  isAnyExp,
  hasProp,
  hasProps,
  hasIndex,
  hasLength,
  hasFlag,
  hasKey,
  hasKeys,
  hasValue,
  hasValues,
  isDate,
  isMap,
  isSet,
  isWeakMap,
  isFinite,
  isWeakSet,
  isEmail,
  isPassword,
  isBuffer,
  isHTTPMethod,
  isId,
  isUrl,
} from '../../src/helpers';

test('isFullObj should correctly check if object is fully populated', () => {
  expect(isFullObj({ a: 1 })).toBe(true);
  expect(isFullObj({})).toBe(false);
});

test('isFullArr should correctly check if array is fully populated', () => {
  expect(isFullArr([1, 2, 3])).toBe(true);
  expect(isFullArr([])).toBe(false);
});

test('isFullStr should correctly check if string is fully populated', () => {
  expect(isFullStr('Hello')).toBe(true);
  expect(isFullStr('  ')).toBe(false);
  expect(isFullStr('')).toBe(false);
});

test('isEmptyObj should correctly check if object is empty', () => {
  expect(isEmptyObj({})).toBe(true);
  expect(isEmptyObj({ a: 1 })).toBe(false);
});

test('isEmptyArr should correctly check if array is empty', () => {
  expect(isEmptyArr([])).toBe(true);
  expect(isEmptyArr([1, 2])).toBe(false);
});

test('isEmptyStr should correctly check if string is empty', () => {
  expect(isEmptyStr('')).toBe(true);
  expect(isEmptyStr('  ')).toBe(true);
  expect(isEmptyStr('Hello')).toBe(false);
});

test('isArrOfNum should correctly check if array contains only numbers', () => {
  expect(isArrOfNum([1, 2, 3.3])).toBe(true);
  expect(isArrOfNum([1, 'a'])).toBe(false);
});

test('isArrOfInt should correctly check if array contains only integers', () => {
  expect(isArrOfInt([1, 2, 3])).toBe(true);
  expect(isArrOfInt([1.5, 2])).toBe(false);
});

test('isArrOfFloat should correctly check if array contains only floats', () => {
  expect(isArrOfFloat([1.1, 2.2, 3.3])).toBe(true);
  expect(isArrOfFloat([1, 2])).toBe(false);
});

test('isArrOfStr should correctly check if array contains only strings', () => {
  expect(isArrOfStr(['a', 'b', 'c'])).toBe(true);
  expect(isArrOfStr(['a', 1])).toBe(false);
});

test('isArrOfObj should correctly check if array contains only objects', () => {
  expect(isArrOfObj([{ a: 1 }, { b: 2 }])).toBe(true);
  expect(isArrOfObj([{ a: 1 }, 2])).toBe(false);
});

test('isArrOfArr should correctly check if array contains only arrays', () => {
  expect(isArrOfArr([[], []])).toBe(true);
  expect(isArrOfArr([{ a: 1 }, 2])).toBe(false);
});

test('isArrOfFunc should correctly check if array contains only functions', () => {
  expect(isArrOfFunc([() => {}, () => {}])).toBe(true);
  expect(isArrOfFunc([() => {}, 'not a func'])).toBe(false);
});

test('isArrOfBool should correctly check if array contains only booleans', () => {
  expect(isArrOfBool([true, false, true])).toBe(true);
  expect(isArrOfBool([true, 1])).toBe(false);
});

test('isArrOfAny should correctly check if array contains any type of value', () => {
  expect(isArrOfAny([1, 'string', true])).toBe(true);
  expect(isArrOfAny([1, {}, []])).toBe(true);
  expect(isArrOfAny([])).toBe(false);
});

test('isObjOfNum should correctly check if object has number properties', () => {
  expect(isObjOfNum({ a: 1, b: 2.2 })).toBe(true);
  expect(isObjOfNum({ a: 1, b: '2' })).toBe(false);
});

test('isObjOfInt should correctly check if object has integer properties', () => {
  expect(isObjOfInt({ a: 1, b: 2 })).toBe(true);
  expect(isObjOfInt({ a: 1.5, b: 2 })).toBe(false);
});

test('isObjOfFloat should correctly check if object has float properties', () => {
  expect(isObjOfFloat({ a: 1.1, b: 2.2 })).toBe(true);
  expect(isObjOfFloat({ a: 1, b: 2 })).toBe(false);
});

test('isObjOfStr should correctly check if object has string properties', () => {
  expect(isObjOfStr({ a: 'Hello', b: 'World' })).toBe(true);
  expect(isObjOfStr({ a: 'Hello', b: 2 })).toBe(false);
});

test('isObjOfArr should correctly check if object has array properties', () => {
  expect(isObjOfArr({ a: [], b: [] })).toBe(true);
  expect(isObjOfArr({ a: [], b: 'string' })).toBe(false);
});

test('isObjOfObj should correctly check if object has object properties', () => {
  expect(isObjOfObj({ a: {}, b: {} })).toBe(true);
  expect(isObjOfObj({ a: {}, b: 2 })).toBe(false);
});

test('isObjOfFunc should correctly check if object has function properties', () => {
  expect(isObjOfFunc({ a: () => {}, b: () => {} })).toBe(true);
  expect(isObjOfFunc({ a: () => {}, b: 'string' })).toBe(false);
});

test('isObjOfBool should correctly check if object has boolean properties', () => {
  expect(isObjOfBool({ a: true, b: false })).toBe(true);
  expect(isObjOfBool({ a: true, b: 1 })).toBe(false);
});

test('isObjOfAny should correctly check if object has properties of any type', () => {
  expect(isObjOfAny({ a: 1, b: 'string', c: true })).toBe(true);
  expect(isObjOfAny({ a: 1, b: {}, c: [] })).toBe(true);
  expect(isObjOfAny({})).toBe(false);
});

test('isArr should correctly check if value is an array', () => {
  expect(isArr([])).toBe(true);
  expect(isArr([1, 2, 3])).toBe(true);
  expect(isArr('string')).toBe(false);
});

test('isObj should correctly check if value is an object', () => {
  expect(isObj({})).toBe(true);
  expect(isObj([])).toBe(false);
  expect(isObj('string')).toBe(false);
});

test('isNum should correctly check if value is a number', () => {
  expect(isNum(123)).toBe(true);
  expect(isNum(123.123)).toBe(true);
  expect(isNum('string')).toBe(false);
});

test('isStr should correctly check if value is a string', () => {
  expect(isStr('string')).toBe(true);
  expect(isStr(123)).toBe(false);
});

test('isBool should correctly check if value is a boolean', () => {
  expect(isBool(true)).toBe(true);
  expect(isBool(false)).toBe(true);
  expect(isBool(1)).toBe(false);
});

test('isFunc should correctly check if value is a function', () => {
  expect(isFunc(() => {})).toBe(true);
  expect(isFunc('string')).toBe(false);
});

test('isSymbol should correctly check if value is a symbol', () => {
  expect(isSymbol(Symbol('symbol'))).toBe(true);
  expect(isSymbol('string')).toBe(false);
});

test('isInt should correctly check if value is an integer', () => {
  expect(isInt(1)).toBe(true);
  expect(isInt(1.5)).toBe(false);
  expect(isInt('1')).toBe(false);
});

test('isFloat should correctly check if value is a float', () => {
  expect(isFloat(1.5)).toBe(true);
  expect(isFloat(1)).toBe(false);
});

test('isNan should correctly check if value is NaN', () => {
  expect(isNan(NaN)).toBe(true);
  expect(isNan(123)).toBe(false);
});

test('isUndefined should correctly check if value is undefined', () => {
  expect(isUndefined(undefined)).toBe(true);
  expect(isUndefined(null)).toBe(false);
});

test('isDefined should correctly check if value is defined', () => {
  expect(isDefined(123)).toBe(true);
  expect(isDefined(undefined)).toBe(false);
});

test('isDefinedStrict should correctly check if value is strictly defined', () => {
  expect(isDefinedStrict(123)).toBe(true);
  expect(isDefinedStrict(undefined)).toBe(false);
  expect(isDefinedStrict(null)).toBe(false);
  expect(isDefinedStrict(NaN)).toBe(false);
});

test('isInf should correctly check if value is infinity', () => {
  expect(isInf(Infinity)).toBe(true);
  expect(isInf(-Infinity)).toBe(true);
  expect(isInf(123)).toBe(false);
});

test('isFinite should correctly check if value is finite', () => {
  expect(isFinite(123)).toBe(true);
  expect(isFinite(Infinity)).toBe(false);
});

test('isTruthy should correctly check if value is truthy', () => {
  expect(isTruthy(1)).toBe(true);
  expect(isTruthy(0)).toBe(false);
});

test('isFalsy should correctly check if value is falsy', () => {
  expect(isFalsy(0)).toBe(true);
  expect(isFalsy(1)).toBe(false);
});

test('isFalse should correctly check if value is strictly false', () => {
  expect(isFalse(false)).toBe(true);
  expect(isFalse(0)).toBe(false);
});

test('isTrue should correctly check if value is strictly true', () => {
  expect(isTrue(true)).toBe(true);
  expect(isTrue(1)).toBe(false);
});

test('isIterable should correctly check if value is iterable', () => {
  expect(isIterable([1, 2, 3])).toBe(true);
  expect(isIterable('string')).toBe(true);
  expect(isIterable(123)).toBe(false);
});

test('isEven should correctly check if value is even', () => {
  expect(isEven(2)).toBe(true);
  expect(isEven(3)).toBe(false);
});

test('isOdd should correctly check if value is odd', () => {
  expect(isOdd(1)).toBe(true);
  expect(isOdd(2)).toBe(false);
});

test('isError should correctly check if value is an error', () => {
  expect(isError(new Error('Test Error'))).toBe(true);
  expect(isError('string')).toBe(false);
});

test('isPromise should correctly check if value is a promise', () => {
  expect(isPromise(Promise.resolve())).toBe(true);
  expect(isPromise('string')).toBe(false);
});

test('isChildOf should correctly check if value is a child of a class', () => {
  class Parent {}

  expect(isChildOf(new Parent(), Parent)).toBe(true);
  expect(isChildOf({}, Parent)).toBe(false);
});

test('isClass should correctly check if value is a class', () => {
  class MyClass {}
  expect(isClass(MyClass)).toBe(true);
  expect(isClass({})).toBe(false);
});

test('isSubclass should correctly check if value is a subclass of another class', () => {
  class Parent {}
  class Child extends Parent {}
  expect(isSubclass(Child, Parent)).toBe(true);
  expect(isSubclass(Parent, Child)).toBe(false);
  expect(isSubclass('child', 'parent')).toBe(false);
});

test('isMap should correctly identify Map', () => {
  const map = new Map();
  expect(isMap(map)).toBe(true);
  expect(isMap({})).toBe(false);
});

test('isSet should correctly identify Set', () => {
  const set = new Set();
  expect(isSet(set)).toBe(true);
  expect(isSet([])).toBe(false);
});

test('isWeakMap should correctly identify WeakMap', () => {
  const weakMap = new WeakMap();
  expect(isWeakMap(weakMap)).toBe(true);
  expect(isWeakMap(new Map())).toBe(false);
});

test('isWeakSet should correctly identify WeakSet', () => {
  const weakSet = new WeakSet();
  expect(isWeakSet(weakSet)).toBe(true);
  expect(isWeakSet(new Set())).toBe(false);
});

test('isDate should correctly check if value is a date', () => {
  expect(isDate(new Date())).toBe(true);
  expect(isDate('2024-11-28')).toBe(false);
});

test('isRegex should correctly check if value is a regex', () => {
  expect(isRegex(/abc/)).toBe(true);
  expect(isRegex('abc')).toBe(false);
});

test('isIso should correctly check if value is in ISO format', () => {
  expect(isIso('2024-11-28T00:00:00.000Z')).toBe(true);
  expect(isIso('2024-11-28')).toBe(false);
  expect(isIso(123)).toBe(false);
});

test('isDateExp should correctly check if value matches a date regex pattern', () => {
  expect(isDateExp('2024-11-28')).toBe(true);
  expect(isDateExp('11/28/2024')).toBe(false);
  expect(isDateExp(123)).toBe(false);
});

test('isTimeExp should correctly check if value matches a time regex pattern', () => {
  expect(isTimeExp('12:30:00')).toBe(true);
  expect(isTimeExp('12-30-2020')).toBe(false);
  expect(isTimeExp(123)).toBe(false);
});

test('isDateTime should correctly check if value matches a datetime regex pattern', () => {
  expect(isDateTime('2024-11-28 12:30:00')).toBe(true);
  expect(isDateTime('2024-11-28')).toBe(false);
  expect(isDateTime(123)).toBe(false);
});

test('isCamelCase should correctly check if value is in camel case', () => {
  expect(isCamelCase('camelCase')).toBe(true);
  expect(isCamelCase('snake_case')).toBe(false);
  expect(isCamelCase(123)).toBe(false);
});

test('isSnakeCase should correctly check if value is in snake case', () => {
  expect(isSnakeCase('snake_case')).toBe(true);
  expect(isSnakeCase('camelCase')).toBe(false);
  expect(isSnakeCase(123)).toBe(false);
});

test('isPascalCase should correctly check if value is in pascal case', () => {
  expect(isPascalCase('PascalCase')).toBe(true);
  expect(isPascalCase('camelCase')).toBe(false);
  expect(isPascalCase(123)).toBe(false);
});

test('iskababCase should correctly check if value is in kebab case', () => {
  expect(iskababCase('kebab-case')).toBe(true);
  expect(iskababCase('camelCase')).toBe(false);
  expect(iskababCase(123)).toBe(false);
});

test('isPropExp should correctly check if value matches a property regex pattern', () => {
  expect(isPropExp('prop_name')).toBe(true);
  expect(isPropExp('propName')).toBe(true);
  expect(isPropExp('PROP')).toBe(true);
  expect(isPropExp('_PROP')).toBe(true);
  expect(isPropExp('123prop')).toBe(false);
  expect(isPropExp(123)).toBe(false);
});

// Test for isNumExp
test('isNumExp should validate number expressions', () => {
  expect(isNumExp('123')).toBe(true);
  expect(isNumExp('123.45')).toBe(true);
  expect(isNumExp('abc')).toBe(false);
  expect(isNumExp('123a')).toBe(false);
  expect(isNumExp(123)).toBe(false);
});

// Test for isIntExp
test('isIntExp should validate integer expressions', () => {
  expect(isIntExp('123')).toBe(true);
  expect(isIntExp('123.45')).toBe(false);
  expect(isIntExp('abc')).toBe(false);
  expect(isIntExp(123)).toBe(false);
});

// Test for isFloatExp
test('isFloatExp should validate float expressions', () => {
  expect(isFloatExp('123.45')).toBe(true);
  expect(isFloatExp('123')).toBe(false);
  expect(isFloatExp('abc')).toBe(false);
  expect(isFloatExp(123)).toBe(false);
});

// Test for isStrExp
test('isStrExp should validate string literal expressions', () => {
  expect(isStrExp('"hello"')).toBe(true);
  expect(isStrExp("'world'")).toBe(true);
  expect(isStrExp('hello')).toBe(false);
  expect(isStrExp(123)).toBe(false);
});

// Test for isDotExp
test('isDotExp should validate dot notation expressions', () => {
  expect(isDotExp('object.property.name')).toBe(true);
  expect(isDotExp('object.123property')).toBe(false);
  expect(isDotExp('property')).toBe(false);
  expect(isDotExp(123)).toBe(false);
});

// Test for isBracketExp
test('isBracketExp should validate bracket notation expressions', () => {
  expect(isBracketExp('object["property"][0]')).toBe(true);
  expect(isBracketExp('object["123"]')).toBe(false);
  expect(isBracketExp(123)).toBe(false);
});

// Test for isAnyExp
test('isAnyExp should validate combinations of dot and bracket notation expressions', () => {
  expect(isAnyExp('object.property[0]')).toBe(true);
  expect(isAnyExp('object.property["key"]')).toBe(true);
  expect(isAnyExp('object.property[0]["key"]')).toBe(true);
  expect(isAnyExp('object.123property[0]')).toBe(false); // Invalid format
  expect(isAnyExp(123)).toBe(false);
});

test('hasProp should correctly check if object has a specific property', () => {
  expect(hasProp({ a: 1, b: 2 }, 'a')).toBe(true);
  expect(hasProp({ a: 1, b: 2 }, 'c')).toBe(false);

  expect(hasProp(null, 'a')).toBe(false); // Test invalid object
  expect(hasProp({ a: 1, b: 2 }, null)).toBe(false); // Test invalid property
});

test('hasProps should correctly check if object has all specified properties', () => {
  expect(hasProps({ a: 1, b: 2 }, 'a', 'b')).toBe(true);
  expect(hasProps({ a: 1, b: 2 }, 'a', 'c')).toBe(false);

  expect(hasProps(null, 'a', 'b')).toBe(false); // Test invalid object
  expect(hasProps({ a: 1, b: 2 }, null)).toBe(false); // Test invalid properties
});

test('hasIndex should correctly check if index is within range', () => {
  expect(hasIndex([1, 2, 3], 1)).toBe(true);
  expect(hasIndex([1, 2, 3], 3)).toBe(false);

  expect(hasIndex('hello', 1)).toBe(true);
  expect(hasIndex('hello', 5)).toBe(false);

  expect(hasIndex(null, 1)).toBe(false); // Test invalid object for index
  expect(hasIndex([1, 2, 3], -1)).toBe(false); // Test invalid index
});

test('hasLength should correctly check if length matches for array, string, or object', () => {
  expect(hasLength([1, 2, 3], 3)).toBe(true);
  expect(hasLength([1, 2, 3], 4)).toBe(false);

  expect(hasLength({ a: 1, b: 2 }, 2)).toBe(true);
  expect(hasLength({ a: 1, b: 2 }, 3)).toBe(false);

  expect(hasLength('hello', 5)).toBe(true);
  expect(hasLength('hello', 4)).toBe(false);

  expect(hasLength(null, 3)).toBe(false); // Test invalid target
  expect(hasLength([1, 2, 3], -1)).toBe(false); // Test invalid length
});

test('hasFlag should correctly check if regex has a specific flag', () => {
  expect(hasFlag(/abc/i, 'i')).toBe(true);
  expect(hasFlag(/abc/i, 'g')).toBe(false);

  expect(hasFlag(null, 'i')).toBe(false); // Test invalid regex
  expect(hasFlag(/abc/i, null)).toBe(false); // Test invalid flag
});

test('hasKey should correctly check if object has a specific key', () => {
  expect(hasKey({ a: 1, b: 2 }, 'a')).toBe(true);
  expect(hasKey({ a: 1, b: 2 }, 'c')).toBe(false);

  expect(hasKey(null, 'a')).toBe(false); // Test invalid object
  expect(hasKey({ a: 1, b: 2 }, null)).toBe(false); // Test invalid key
});

test('hasKeys should correctly check if object has all specified keys', () => {
  expect(hasKeys({ a: 1, b: 2 }, 'a', 'b')).toBe(true);
  expect(hasKeys({ a: 1, b: 2 }, 'a', 'c')).toBe(false);

  expect(hasKeys(null, 'a', 'b')).toBe(false); // Test invalid object
  expect(hasKeys({ a: 1, b: 2 }, null)).toBe(false); // Test invalid keys
});

test('hasValue should correctly check if target contains a specific value', () => {
  expect(hasValue({ a: 1, b: 2 }, 1)).toBe(true);
  expect(hasValue({ a: 1, b: 2 }, 3)).toBe(false);

  expect(hasValue([1, 2], 1)).toBe(true);
  expect(hasValue([1, 2], 3)).toBe(false);

  expect(hasValue('foo bar', 'foo')).toBe(true);
  expect(hasValue('foo bar', 'baz')).toBe(false);

  expect(hasValue(null, 1)).toBe(false); // Test invalid target
  expect(hasValue({ a: 1, b: 2 }, null)).toBe(false); // Test invalid value
});

test('hasValues should correctly check if target contains all specified values', () => {
  expect(hasValues({ a: 1, b: 2 }, 1, 2)).toBe(true);
  expect(hasValues({ a: 1, b: 2 }, 3, 2)).toBe(false);

  expect(hasValues([1, 2], 1, 2)).toBe(true);
  expect(hasValues([1, 2], 3, 2)).toBe(false);

  expect(hasValues('foo bar', 'foo', 'bar')).toBe(true);
  expect(hasValues('foo bar', 'baz', 'foo')).toBe(false);

  expect(hasValues(null, 1, 2)).toBe(false); // Test invalid object
  expect(hasValues({ a: 1, b: 2 }, null)).toBe(false); // Test invalid values array
});

describe('isEmail', () => {
  it('should return true for valid email addresses', () => {
    expect(isEmail('test@example.com')).toBe(true);
    expect(isEmail('user.name@domain.co')).toBe(true);
    expect(isEmail('user-name@sub.domain.com')).toBe(true);
  });

  it('should return false for invalid email addresses', () => {
    expect(isEmail('invalid-email')).toBe(false);
    expect(isEmail('user@domain')).toBe(false);
    expect(isEmail('user@.com')).toBe(false);
  });

  it('should return false for non-string values', () => {
    expect(isEmail(12345)).toBe(false);
    expect(isEmail(null)).toBe(false);
    expect(isEmail(undefined)).toBe(false);
    expect(isEmail({})).toBe(false);
  });
});

describe('isPassword', () => {
  it('should return true for valid passwords with default rules', () => {
    expect(isPassword('pass1!')).toBe(true);
    expect(isPassword('a1#')).toBe(true);
  });

  it('should return false for passwords not meeting default requirements', () => {
    expect(isPassword('password')).toBe(false);
    expect(isPassword('123456')).toBe(false);
    expect(isPassword('abcdef')).toBe(false);
  });

  it('should validate passwords against custom rules', () => {
    expect(isPassword('A1b!', { numbers: 1, letters: 1, symbols: 1 })).toBe(
      true
    );
    expect(isPassword('A1b', { numbers: 1, letters: 1, symbols: 1 })).toBe(
      false
    );
  });

  it('should return false for non-string values', () => {
    expect(isPassword(12345)).toBe(false);
    expect(isPassword(null)).toBe(false);
    expect(isPassword(undefined)).toBe(false);
    expect(isPassword({})).toBe(false);
  });
});

describe('isPassword - Multi-language support', () => {
  it('should return true for valid Arabic passwords', () => {
    expect(isPassword('كلمة1!')).toBe(true); // Arabic letters + number + symbol
    expect(isPassword('مرحبا123@')).toBe(true); // Arabic + numbers + symbol
  });

  it('should return false for Arabic passwords missing required characters', () => {
    expect(isPassword('كلمةسرية')).toBe(false); // No numbers or symbols
    expect(isPassword('١٢٣٤٥٦')).toBe(false); // Only numbers, no letters
    expect(isPassword('!@#$%^')).toBe(false); // Only symbols, no letters or numbers
  });

  it('should return true for valid Chinese passwords', () => {
    expect(isPassword('密码123@')).toBe(true); // Chinese characters + numbers + symbol
    expect(isPassword('安全密碼!123')).toBe(true); // Chinese characters + numbers + symbol
  });

  it('should return false for Cyrillic passwords missing requirements', () => {
    expect(isPassword('пароль')).toBe(false); // Only letters
    expect(isPassword('123456')).toBe(false); // Only numbers
  });
});

describe('isHTTPMethod', () => {
  it('should return true for valid HTTP methods', () => {
    expect(isHTTPMethod('GET')).toBe(true);
    expect(isHTTPMethod('POST')).toBe(true);
    expect(isHTTPMethod('PUT')).toBe(true);
    expect(isHTTPMethod('DELETE')).toBe(true);
    expect(isHTTPMethod('PATCH')).toBe(true);
    expect(isHTTPMethod('OPTIONS')).toBe(true);
    expect(isHTTPMethod('HEAD')).toBe(true);
  });

  it('should return false for invalid HTTP methods', () => {
    expect(isHTTPMethod('CONNECT')).toBe(false);
    expect(isHTTPMethod('TRACE')).toBe(false);
    expect(isHTTPMethod('FETCH')).toBe(false);
    expect(isHTTPMethod('INVALID')).toBe(false);
    expect(isHTTPMethod(123)).toBe(false);
    expect(isHTTPMethod(null)).toBe(false);
    expect(isHTTPMethod(undefined)).toBe(false);
  });
});

describe('isBuffer', () => {
  it('should return true for Buffer instances', () => {
    expect(isBuffer(Buffer.from('test'))).toBe(true);
  });

  it('should return true for Uint8Array instances', () => {
    expect(isBuffer(new Uint8Array([1, 2, 3]))).toBe(true);
  });

  it('should return false for non-buffer values', () => {
    expect(isBuffer('string')).toBe(false);
    expect(isBuffer(123)).toBe(false);
    expect(isBuffer(null)).toBe(false);
    expect(isBuffer(undefined)).toBe(false);
    expect(isBuffer({})).toBe(false);
    expect(isBuffer([])).toBe(false);
  });
});

describe('isUrl', () => {
  test('returns false for non-strings', () => {
    expect(isUrl(null as any)).toBe(false);
    expect(isUrl(undefined as any)).toBe(false);
    expect(isUrl(123 as any)).toBe(false);
    expect(isUrl({} as any)).toBe(false);
  });

  test('validates https URL by default', () => {
    expect(isUrl('https://example.com')).toBe(true);
    expect(isUrl('https://example.com/')).toBe(true);
  });

  test('normalizes and trims in non-strict mode (default)', () => {
    expect(isUrl('   HTTPS://example.com  ')).toBe(true);
  });

  test('fails with protocol not in the allowed list', () => {
    expect(isUrl('ftp://example.com')).toBe(false);
    expect(isUrl('http://example.com', ['https'])).toBe(false);
  });

  test('passes with allowed protocols', () => {
    expect(isUrl('http://example.com', ['http', 'https'])).toBe(true);
    expect(isUrl('ftp://example.com', ['ftp'])).toBe(true);
  });

  test('passes strict mode only when url matches parsed.href exactly (with trailing slash)', () => {
    const url = 'https://example.com/';
    expect(isUrl(url, ['https'], true)).toBe(true);
    expect(isUrl('https://EXAMPLE.com/', ['https'], true)).toBe(false); // case-sensitive
    expect(isUrl(' https://example.com/ ', ['https'], true)).toBe(false); // space-sensitive
  });

  test('rejects invalid URLs with invalid characters', () => {
    const url =
      "https://localhost/foo\xa41```''a'a;slslslsoowiwuu26y252557322o,ss";
    expect(isUrl(url)).toBe(false);
  });

  test('accepts localhost with valid protocol', () => {
    expect(isUrl('https://localhost')).toBe(true);
    expect(isUrl('http://localhost', ['http'])).toBe(true);
  });

  test('returns false if new URL throws (e.g., badly formed input)', () => {
    expect(isUrl('not a url')).toBe(false);
    expect(isUrl('https://')).toBe(false);
    expect(isUrl('')).toBe(false);
  });
});

describe('isId', () => {
  test('returns false for non-int values', () => {
    expect(isId(null)).toBe(false);
    expect(isId(undefined)).toBe(false);
    expect(isId('')).toBe(false);
    expect(isId('abc')).toBe(false);
    expect(isId({})).toBe(false);
    expect(isId('12a')).toBe(false);
  });

  test('returns true for positive integer numbers', () => {
    expect(isId(1)).toBe(true);
    expect(isId(123)).toBe(true);
    expect(isId(0)).toBe(false);
    expect(isId(-1)).toBe(false);
  });

  test('returns true for positive integer strings', () => {
    expect(isId('1')).toBe(true);
    expect(isId('123')).toBe(true);
    expect(isId('  456  ')).toBe(true); // trimmed
  });

  test('returns false for non-integer numeric strings or decimals', () => {
    expect(isId('1.23')).toBe(false);
    expect(isId('0')).toBe(false);
    expect(isId('-10')).toBe(false);
  });

  test('returns false for integer but with extra spaces or characters', () => {
    expect(isId(' 1a')).toBe(false);
    expect(isId('a1')).toBe(false);
  });
});

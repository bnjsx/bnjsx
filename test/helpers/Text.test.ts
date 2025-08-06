import {
  countOf,
  dictionary,
  indexesOf,
  indexOf,
  infix,
  lastIndexOf,
  prefix,
  suffix,
  TextError,
  toArray,
  toChars,
  toFloat,
  toISO,
  toKababCase,
  toKamelCase,
  toLower,
  toLowerAt,
  toLowerFrom,
  toNumber,
  toPascalCase,
  toPercent,
  toPlural,
  toRegex,
  toShort,
  toSingular,
  toSize,
  toSlug,
  toSnakeCase,
  toSnap,
  toTitle,
  toUpper,
  toUpperAt,
  toUpperFirst,
  toUpperFrom,
  toWords,
  round,
  floor,
  pad,
  percent,
  comma,
  trim,
  join,
  avg,
  escapeHTML,
  mark,
  unmark,
  host,
  botInput,
  csrfInput,
  toInt,
  toMs,
  base,
  map,
  mapping,
  mappings,
} from '../../src/helpers/Text';

describe('Text', () => {
  describe('dictionary', () => {
    it('should add a new singular/plural pair if the singular/plural does not exist', () => {
      // Call dictionary to add a new pair
      dictionary('foo', 'bar');

      // Check if the new entry is added
      expect(toSingular('bar')).toBe('foo');
      expect(toPlural('foo')).toBe('bar');
    });

    it('should update the plural form if the singular already exists', () => {
      // Initially, the plural form of 'child' is 'children'
      dictionary('child', 'kids');

      // After update, 'child' should now have the plural 'kids'
      expect(toSingular('kids')).toBe('child');
      expect(toPlural('child')).toBe('kids');

      // Reset
      dictionary('child', 'children');
    });

    it('should update the singular form if the plural already exists', () => {
      // Initially, the plural form of 'child' is 'children'
      dictionary('kid', 'children');

      // After update, 'kid' should now have the plural 'children'
      expect(toSingular('children')).toBe('kid');
      expect(toPlural('kid')).toBe('children');

      // Reset
      dictionary('child', 'children');
    });

    it('should throw an error if the singular is not a valid string', () => {
      // Try adding an invalid singular
      expect(() => dictionary('', 'invalid')).toThrow(TextError);
      expect(() => dictionary(123 as any, 'invalid')).toThrow(TextError);
    });

    it('should throw an error if the plural is not a valid string', () => {
      // Try adding an invalid plural
      expect(() => dictionary('book', '')).toThrow(TextError);
      expect(() => dictionary('book', 123 as any)).toThrow(TextError);
    });
  });

  describe('toPlural()', () => {
    it('should return the plural form for a registered singular word', () => {
      // Test with a registered word
      expect(toPlural('child')).toBe('children');
      expect(toPlural('man')).toBe('men');
      expect(toPlural('woman')).toBe('women');
    });

    it('should convert a singular word to plural using default rules', () => {
      // Test default pluralization rules

      // Regular 's' rule
      expect(toPlural('dog')).toBe('dogs');
      expect(toPlural('cat')).toBe('cats'); // Regular 's' rule for 'cat'
      expect(toPlural('book')).toBe('books'); // Regular 's' rule for 'book'

      // 'sh' ending, add 'es'
      expect(toPlural('bush')).toBe('bushes');
      expect(toPlural('dish')).toBe('dishes'); // 'sh' ending -> 'es'
      expect(toPlural('wish')).toBe('wishes'); // 'sh' ending -> 'es'

      // 'x' ending, add 'es'
      expect(toPlural('fox')).toBe('foxes');
      expect(toPlural('box')).toBe('boxes'); // 'x' ending -> 'es'
      expect(toPlural('fix')).toBe('fixes'); // 'x' ending -> 'es'

      // Consonant + 'y' -> 'ies'
      expect(toPlural('baby')).toBe('babies');
      expect(toPlural('city')).toBe('cities'); // Consonant + 'y' -> 'ies'
      expect(toPlural('party')).toBe('parties'); // Consonant + 'y' -> 'ies'

      // Vowel + 'y' -> 's'
      expect(toPlural('key')).toBe('keys');
      expect(toPlural('toy')).toBe('toys'); // Vowel + 'y' -> 's'
      expect(toPlural('day')).toBe('days'); // Vowel + 'y' -> 's'

      // // Vowel + 'o' -> 's'
      expect(toPlural('photo')).toBe('photos');
      expect(toPlural('video')).toBe('videos'); // Vowel + 'o' -> 's'
      expect(toPlural('radio')).toBe('radios'); // Vowel + 'o' -> 's'

      // Consonant + 'o' -> 'es'
      expect(toPlural('potato')).toBe('potatoes');
      expect(toPlural('hero')).toBe('heroes'); // Consonant + 'o' -> 'es'
      expect(toPlural('tomato')).toBe('tomatoes'); // Consonant + 'o' -> 'es'

      // 'f' or 'fe' -> 'ves'
      expect(toPlural('leaf')).toBe('leaves');
      expect(toPlural('wolf')).toBe('wolves'); // 'f' ending -> 'ves'
      expect(toPlural('life')).toBe('lives'); // 'fe' ending -> 'ves'

      // 'fe' -> 'ves'
      expect(toPlural('knife')).toBe('knives');
      expect(toPlural('wife')).toBe('wives'); // 'fe' ending -> 'ves'
      expect(toPlural('self')).toBe('selves'); // 'f' ending -> 'ves'
    });

    it('should throw an error if the input is not a valid string', () => {
      // Test invalid inputs (e.g., non-strings)
      expect(() => toPlural(123 as any)).toThrow(TextError);
      expect(() => toPlural('')).toThrow(TextError); // Empty string
      expect(() => toPlural(null as any)).toThrow(TextError);
      expect(() => toPlural(undefined as any)).toThrow(TextError);
    });

    it('should handle custom registered words added via dictionary()', () => {
      // Register a custom plural form
      dictionary('car', 'my_cars');

      // Test the custom registered word
      expect(toPlural('car')).toBe('my_cars');

      // Register another custom plural form
      dictionary('city', 'my_cities');

      // Test the custom registered word
      expect(toPlural('city')).toBe('my_cities');

      // Rest
      dictionary('car', 'cars');
      dictionary('city', 'cities');
    });
  });

  describe('toSingular', () => {
    it('should convert a plural word to singular using registered mappings', () => {
      expect(toSingular('dogs')).toBe('dog'); // Using registered word
      expect(toSingular('bushes')).toBe('bush'); // Using registered word
      expect(toSingular('boxes')).toBe('box'); // Using registered word
      expect(toSingular('parties')).toBe('party'); // Using registered word
    });

    it('should convert a plural word to singular using default rules', () => {
      // Test default pluralization rules
      expect(toSingular('babies')).toBe('baby'); // 'ies' -> 'y'
      expect(toSingular('bushes')).toBe('bush'); // 'es' -> ''
      expect(toSingular('boxes')).toBe('box'); // 'es' -> ''
      expect(toSingular('dogs')).toBe('dog'); // 's' -> ''
      expect(toSingular('potatoes')).toBe('potato'); // 'es' -> ''
    });

    it('should throw an error if the input is not a valid string', () => {
      // Test invalid inputs
      expect(() => toSingular('')).toThrow(TextError); // Empty string
      expect(() => toSingular(123 as unknown as string)).toThrow(TextError); // Non-string input
      expect(() => toSingular(null as unknown as string)).toThrow(TextError); // null input
      expect(() => toSingular(undefined as unknown as string)).toThrow(
        TextError
      ); // undefined input
    });

    it('should return the plural unchanged for irregular plurals (e.g., fish, deer)', () => {
      // Test cases where the plural form should remain the same (irregular)
      expect(toSingular('fish')).toBe('fish');
      expect(toSingular('deer')).toBe('deer');
      expect(toSingular('sheep')).toBe('sheep');
    });
  });

  describe('toRegex', () => {
    it('should match strings that start with the given pattern', () => {
      const regex = toRegex('hello*');
      expect(regex.test('hello world')).toBe(true); // matches start with 'hello'
      expect(regex.test('world hello')).toBe(false); // does not start with 'hello'
    });

    it('should match strings that end with the given pattern', () => {
      const regex = toRegex('*hello');
      expect(regex.test('world hello')).toBe(true); // matches end with 'hello'
      expect(regex.test('hello world')).toBe(false); // does not end with 'hello'
    });

    it('should match strings that contain the given pattern', () => {
      const regex = toRegex('*hello*');
      expect(regex.test('world hello world')).toBe(true); // contains 'hello'
      expect(regex.test('hello world')).toBe(true); // contains 'hello'
      expect(regex.test('world world')).toBe(false); // does not contain 'hello'
    });

    it('should handle case-insensitive flag', () => {
      const regex = toRegex('hello*', 'i'); // 'i' flag for case-insensitive
      expect(regex.test('HELLO world')).toBe(true); // matches start with 'hello' (case-insensitive)
      expect(regex.test('hello world')).toBe(true); // matches start with 'hello'
      expect(regex.test('world hello')).toBe(false); // does not start with 'hello'
    });

    it('should throw an error for invalid pattern (non-string)', () => {
      expect(() => toRegex(123 as any)).toThrow('Invalid text: 123');
    });

    it('should throw an error for invalid flags (non-string)', () => {
      expect(() => toRegex('hello*', 123 as any)).toThrow('Invalid flags: 123');
    });

    it('should match an empty string when pattern is empty', () => {
      const regex = toRegex('');
      expect(regex.test('')).toBe(true); // matches empty string
      expect(regex.test('non-empty')).toBe(false); // doesn't match non-empty string
    });
  });

  describe('toUpper', () => {
    it('should convert a string to uppercase', () => {
      expect(toUpper('hello')).toBe('HELLO');
    });

    it('should throw an error if input is not a string', () => {
      expect(() => toUpper(123 as any)).toThrow('Invalid text: 123');
    });
  });

  describe('toLower', () => {
    it('should convert a string to lowercase', () => {
      expect(toLower('HELLO')).toBe('hello');
    });

    it('should throw an error if input is not a string', () => {
      expect(() => toLower({} as any)).toThrow('Invalid text: [object Object]');
    });
  });

  describe('toUpperAt', () => {
    it('should convert the character at the specified index to uppercase', () => {
      expect(toUpperAt('hello', 1)).toBe('hEllo');
    });

    it('should throw an error if the string is not valid', () => {
      expect(() => toUpperAt(123 as any, 1)).toThrow('Invalid text: 123');
    });

    it('should return the string unchanged if index is out of bounds', () => {
      expect(toUpperAt('hello', 10)).toBe('hello');
    });

    it('should convert the first character to uppercase if index is 0', () => {
      expect(toUpperAt('hello', 0)).toBe('Hello');
    });

    it('should throw an error if the index is not an integer', () => {
      expect(() => toUpperAt('hello', '1' as any)).toThrow('Invalid index: 1');
    });
  });

  describe('toLowerAt', () => {
    it('should convert the character at the specified index to lowercase', () => {
      expect(toLowerAt('HELLO', 1)).toBe('HeLLO');
    });

    it('should throw an error if the string is not valid', () => {
      expect(() => toLowerAt(123 as any, 1)).toThrow('Invalid text: 123');
    });

    it('should return the string unchanged if index is out of bounds', () => {
      expect(toLowerAt('HELLO', 10)).toBe('HELLO');
    });

    it('should convert the first character to lowercase if index is 0', () => {
      expect(toLowerAt('HELLO', 0)).toBe('hELLO');
    });

    it('should throw an error if the index is not an integer', () => {
      expect(() => toLowerAt('HELLO', '1' as any)).toThrow('Invalid index: 1');
    });
  });

  describe('toUpperFrom', () => {
    it('should convert characters from the specified index to uppercase', () => {
      expect(toUpperFrom('hello world', 6)).toBe('hello WORLD');
    });

    it('should convert characters from the index to the specified "to" index to uppercase', () => {
      expect(toUpperFrom('hello world', 6, 8)).toBe('hello WORld');
    });

    it('should throw an error if the string is not valid', () => {
      expect(() => toUpperFrom(123 as any, 6)).toThrow('Invalid text: 123');
    });

    it('should throw an error if the index is not an integer', () => {
      expect(() => toUpperFrom('hello world', '6' as any)).toThrow(
        'Invalid index: 6'
      );
    });

    it('should return the string unchanged if the "to" index is out of bounds', () => {
      expect(toUpperFrom('hello world', 6, -1)).toBe('hello world');
    });

    it('should return the string unchanged if the start index is out of bounds', () => {
      expect(toUpperFrom('hello world', -1)).toBe('hello world');
    });
  });

  describe('toLowerFrom', () => {
    it('should convert characters from the specified index to lowercase', () => {
      expect(toLowerFrom('HELLO WORLD', 6)).toBe('HELLO world');
    });

    it('should convert characters from the index to the specified "to" index to lowercase', () => {
      expect(toLowerFrom('HELLO WORLD', 6, 8)).toBe('HELLO worLD');
    });

    it('should throw an error if the string is not valid', () => {
      expect(() => toLowerFrom(123 as any, 6)).toThrow('Invalid text: 123');
    });

    it('should throw an error if the index is not an integer', () => {
      expect(() => toLowerFrom('HELLO WORLD', '6' as any)).toThrow(
        'Invalid index: 6'
      );
    });

    it('should return the string unchanged if the "to" index is out of bounds', () => {
      expect(toLowerFrom('HELLO WORLD', 6, -1)).toBe('HELLO WORLD');
    });

    it('should return the string unchanged if the start index is out of bounds', () => {
      expect(toLowerFrom('HELLO WORLD', -1)).toBe('HELLO WORLD');
    });
  });

  describe('toUpperFirst', () => {
    it('should convert the first character of the string to uppercase', () => {
      expect(toUpperFirst('hello')).toBe('Hello');
    });

    it('should return the string unchanged if the first character is already uppercase', () => {
      expect(toUpperFirst('Hello')).toBe('Hello');
    });

    it('should return the string unchanged if the string is empty', () => {
      expect(toUpperFirst('')).toBe('');
    });

    it('should throw an error if the string is not valid', () => {
      expect(() => toUpperFirst(123 as any)).toThrow('Invalid text: 123');
    });
  });

  // Test for toKamelCase
  describe('toKamelCase', () => {
    it('should convert a string to camelCase', () => {
      expect(toKamelCase('hello world')).toBe('helloWorld');
      expect(toKamelCase('Hello world')).toBe('helloWorld');
      expect(toKamelCase('hello 123 world!')).toBe('hello123World');
      expect(toKamelCase('   hello   world   ')).toBe('helloWorld');
    });

    it('should remove non-alphanumeric characters and spaces', () => {
      expect(toKamelCase('hello@world!')).toBe('helloWorld');
      expect(toKamelCase('123 hello world')).toBe('helloWorld');
    });

    it('should throw an error if the input is not a valid string', () => {
      expect(() => toKamelCase(null as any)).toThrow('Invalid text: null');
      expect(() => toKamelCase(undefined as any)).toThrow(
        'Invalid text: undefined'
      );
    });
  });

  // Test for toPascalCase
  describe('toPascalCase', () => {
    it('should convert a string to PascalCase', () => {
      expect(toPascalCase('hello world')).toBe('HelloWorld');
      expect(toPascalCase('hello 123 world!')).toBe('Hello123World');
      expect(toPascalCase('hello_world')).toBe('HelloWorld');
      expect(toPascalCase(' hello   world ')).toBe('HelloWorld');
    });

    it('should remove non-alphanumeric characters and spaces', () => {
      expect(toPascalCase('hello@world!')).toBe('HelloWorld');
      expect(toPascalCase('123 hello world')).toBe('HelloWorld');
    });

    it('should throw an error if the input is not a valid string', () => {
      expect(() => toPascalCase(null as any)).toThrow('Invalid text: null');
      expect(() => toPascalCase(undefined as any)).toThrow(
        'Invalid text: undefined'
      );
    });
  });

  // Test for toSnakeCase
  describe('toSnakeCase', () => {
    it('should convert a string to snake_case', () => {
      expect(toSnakeCase('hello world')).toBe('hello_world');
      expect(toSnakeCase('hello world')).toBe('hello_world');
      expect(toSnakeCase('hello 123 world!')).toBe('hello_123_world');
      expect(toSnakeCase('hello_world')).toBe('hello_world');
      expect(toSnakeCase(' hello   world ')).toBe('hello_world');
    });

    it('should remove non-alphanumeric characters and replace spaces with underscores', () => {
      expect(toSnakeCase('hello@world!')).toBe('hello_world');
      expect(toSnakeCase('123 hello world')).toBe('hello_world');
    });

    it('should throw an error if the input is not a valid string', () => {
      expect(() => toSnakeCase(null as any)).toThrow('Invalid text: null');
      expect(() => toSnakeCase(undefined as any)).toThrow(
        'Invalid text: undefined'
      );
    });
  });

  // Test for toKababCase
  describe('toKababCase', () => {
    it('should convert a string to kebab-case', () => {
      expect(toKababCase('hello world')).toBe('hello-world');
      expect(toKababCase('hello 123 world!')).toBe('hello-123-world');
      expect(toKababCase('hello_world')).toBe('hello-world');
      expect(toKababCase(' hello   world ')).toBe('hello-world');
    });

    it('should remove non-alphanumeric characters and replace spaces with hyphens', () => {
      expect(toKababCase('hello@world!')).toBe('hello-world');
      expect(toKababCase('123 hello world')).toBe('hello-world');
    });

    it('should throw an error if the input is not a valid string', () => {
      expect(() => toKababCase(null as any)).toThrow('Invalid text: null');
      expect(() => toKababCase(undefined as any)).toThrow(
        'Invalid text: undefined'
      );
    });
  });

  // Test for toTitle
  describe('toTitle', () => {
    it('should convert the first character to uppercase for every word', () => {
      expect(toTitle('hello world 123')).toBe('Hello World 123');
    });

    it('should handle a single character string', () => {
      expect(toTitle('a')).toBe('A');
    });

    it('should throw an error if the input is not a valid string', () => {
      expect(() => toTitle(null as any)).toThrow('Invalid text: null');
      expect(() => toTitle(undefined as any)).toThrow(
        'Invalid text: undefined'
      );
    });
  });

  // Test for toSlug
  describe('toSlug', () => {
    it('should convert a string to a slug (lowercase and hyphenated)', () => {
      expect(toSlug('Hello World')).toBe('hello-world');
      expect(toSlug('Hello, World!')).toBe('hello-world');
      expect(toSlug('hello_world')).toBe('hello-world');
      expect(toSlug('HELLO world 123')).toBe('hello-world-123');
    });

    it('should remove special characters and multiple spaces', () => {
      expect(toSlug('Hello @World #123')).toBe('hello-world-123');
      expect(toSlug('HELLO   world   123!')).toBe('hello-world-123');
    });

    it('should throw an error if the input is not a valid string', () => {
      expect(() => toSlug(null as any)).toThrow('Invalid text: null');
      expect(() => toSlug(undefined as any)).toThrow('Invalid text: undefined');
    });
  });

  // Test for toSnap
  describe('toSnap', () => {
    it('should add "..." if the string is longer than the specified length', () => {
      expect(toSnap('Hello world', 5)).toBe('Hello...');
      expect(toSnap('Hello world', 10)).toBe('Hello worl...');
      expect(toSnap('Hello world', 20)).toBe('Hello world');
    });

    it('should return the string as is if it is shorter than the specified length', () => {
      expect(toSnap('Hello', 10)).toBe('Hello');
    });

    it('should trim and append "..." to the string if necessary', () => {
      expect(toSnap('Hello world, this is a test.', 15)).toBe(
        'Hello world, th...'
      );
    });

    it('should throw an error if the length is not a valid number or is <= 0', () => {
      expect(() => toSnap('Hello', 0)).toThrow('Invalid length: 0.');
      expect(() => toSnap('Hello', -5)).toThrow('Invalid length: -5.');
      expect(() => toSnap('Hello', null as any)).toThrow(
        'Invalid length: null.'
      );
    });

    it('should throw an error if the input is not a valid string', () => {
      expect(() => toSnap(null as any, 10)).toThrow('Invalid text: null');
      expect(() => toSnap(undefined as any, 10)).toThrow(
        'Invalid text: undefined'
      );
    });
  });

  // Test for toChars
  describe('toChars', () => {
    it('should split the string into an array of characters', () => {
      const result = toChars('hello');
      expect(result).toEqual(['h', 'e', 'l', 'l', 'o']);
    });

    it('should exclude specified characters', () => {
      const result = toChars('hello', 'l');
      expect(result).toEqual(['h', 'e', 'o']);
    });

    it('should exclude multiple characters', () => {
      const result = toChars('hello world', ' ', 'o', 'l');
      expect(result).toEqual(['h', 'e', 'w', 'r', 'd']);
    });

    it('should return an empty array for an empty string', () => {
      const result = toChars('');
      expect(result).toEqual([]);
    });

    it('should throw an error if input is not a string', () => {
      expect(() => toChars(123 as any)).toThrow(TextError);
    });
  });

  // Test for toWords
  describe('toWords', () => {
    it('should convert a string to an array of words', () => {
      expect(toWords('hello world')).toEqual(['hello', 'world']);
      expect(toWords('   hello    world    ')).toEqual(['hello', 'world']);
      expect(toWords('hello world test')).toEqual(['hello', 'world', 'test']);
    });

    it('should handle multiple spaces and trim', () => {
      expect(toWords('hello    world')).toEqual(['hello', 'world']);
      expect(toWords('  hello  world   test  ')).toEqual([
        'hello',
        'world',
        'test',
      ]);
    });

    it('should handle single word input', () => {
      expect(toWords('hello')).toEqual(['hello']);
    });

    it('should handle empty string', () => {
      expect(toWords('')).toEqual([]);
    });

    it('should throw an error if the input is not a valid string', () => {
      expect(() => toWords(null as any)).toThrow('Invalid text: null');
    });
  });

  describe('toSize', () => {
    test('should return bytes without decimals when size is less than 1024', () => {
      expect(toSize(0)).toBe('0 bytes');
      expect(toSize(512)).toBe('512 bytes');
      expect(toSize(1023)).toBe('1023 bytes');
    });

    test('should convert bytes to KB with two decimal places', () => {
      expect(toSize(1024)).toBe('1.00 KB');
      expect(toSize(1536)).toBe('1.50 KB');
      expect(toSize(2048)).toBe('2.00 KB');
    });

    test('should convert bytes to MB with two decimal places', () => {
      expect(toSize(1024 * 1024)).toBe('1.00 MB');
      expect(toSize(2.5 * 1024 * 1024)).toBe('2.50 MB');
    });

    test('should convert bytes to GB with two decimal places', () => {
      expect(toSize(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(toSize(5.75 * 1024 * 1024 * 1024)).toBe('5.75 GB');
    });

    test('should convert bytes to TB with two decimal places', () => {
      expect(toSize(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB');
      expect(toSize(3.33 * 1024 * 1024 * 1024 * 1024)).toBe('3.33 TB');
    });

    test('should convert bytes to PB with two decimal places', () => {
      expect(toSize(1024 * 1024 * 1024 * 1024 * 1024)).toBe('1.00 PB');
      expect(toSize(7.89 * 1024 * 1024 * 1024 * 1024 * 1024)).toBe('7.89 PB');
    });

    test('should not exceed PB in unit conversion', () => {
      expect(toSize(1024 * 1024 * 1024 * 1024 * 1024 * 2)).toBe('2.00 PB');
    });
  });

  // Test prefix function
  describe('prefix', () => {
    it('should prefix the string with the given portion', () => {
      expect(prefix('world', 'hello ')).toBe('hello world');
    });

    it('should throw a TextError if "str" is not a string', () => {
      expect(() => prefix(123 as any, 'hello ')).toThrow(TextError);
      expect(() => prefix(null as any, 'hello ')).toThrow(TextError);
      expect(() => prefix(undefined as any, 'hello ')).toThrow(TextError);
    });

    it('should throw a TextError if "portion" is not a string', () => {
      expect(() => prefix('world', 123 as any)).toThrow(TextError);
      expect(() => prefix('world', null as any)).toThrow(TextError);
      expect(() => prefix('world', undefined as any)).toThrow(TextError);
    });
  });

  // Test suffix function
  describe('suffix', () => {
    it('should suffix the string with the given portion', () => {
      expect(suffix('world', ' hello')).toBe('world hello');
    });

    it('should throw a TextError if "str" is not a string', () => {
      expect(() => suffix(123 as any, ' hello')).toThrow(TextError);
      expect(() => suffix(null as any, ' hello')).toThrow(TextError);
      expect(() => suffix(undefined as any, ' hello')).toThrow(TextError);
    });

    it('should throw a TextError if "portion" is not a string', () => {
      expect(() => suffix('world', 123 as any)).toThrow(TextError);
      expect(() => suffix('world', null as any)).toThrow(TextError);
      expect(() => suffix('world', undefined as any)).toThrow(TextError);
    });
  });

  // Test infix function
  describe('infix', () => {
    it('should insert the portion at the given index', () => {
      expect(infix('hello world', ' my', 5)).toBe('hello my world');
      expect(infix('world', ' beautiful', -1)).toBe('worl beautifuld');
      expect(infix('world', ' beautiful', 10)).toBe('world beautiful');
    });

    it('should throw a TextError if "str" is not a string', () => {
      expect(() => infix(123 as any, ' beautiful', 5)).toThrow(TextError);
      expect(() => infix(null as any, ' beautiful', 5)).toThrow(TextError);
      expect(() => infix(undefined as any, ' beautiful', 5)).toThrow(TextError);
    });

    it('should throw a TextError if "portion" is not a string', () => {
      expect(() => infix('world', 123 as any, 5)).toThrow(TextError);
      expect(() => infix('world', null as any, 5)).toThrow(TextError);
      expect(() => infix('world', undefined as any, 5)).toThrow(TextError);
    });

    it('should throw a TextError if "index" is not an integer', () => {
      expect(() => infix('hello', ' world', 'hi' as any)).toThrow(TextError);
      expect(() => infix('hello', ' world', null as any)).toThrow(TextError);
      expect(() => infix('hello', ' world', {} as any)).toThrow(TextError);
    });
  });

  // Test countOf function
  describe('countOf', () => {
    it('should count occurrences of the substring or pattern in the string', () => {
      expect(countOf('hello world', 'o')).toBe(2);
      expect(countOf('hello world', /o/)).toBe(2);
      expect(countOf('hello world', /o/g)).toBe(2);
      expect(countOf('hello world', 'z')).toBe(0);
    });

    it('should throw TextError if str is not a string', () => {
      expect(() => countOf(123 as any, 'o')).toThrow(TextError);
      expect(() => countOf(null as any, 'o')).toThrow(TextError);
      expect(() => countOf(undefined as any, 'o')).toThrow(TextError);
    });

    it('should throw TextError if search is not a string or RegExp', () => {
      expect(() => countOf('hello world', 123 as any)).toThrow(TextError);
      expect(() => countOf('hello world', null as any)).toThrow(TextError);
      expect(() => countOf('hello world', undefined as any)).toThrow(TextError);
    });
  });

  describe('indexOf()', () => {
    it('should find the index of the first occurrence of the substring or pattern', () => {
      expect(indexOf('hello world', 'o')).toBe(4);
      expect(indexOf('hello world', /o/)).toBe(4);
      expect(indexOf('hello world', /o/g)).toBe(4);
      expect(indexOf('hello world', 'z')).toBeUndefined();
    });

    it('should throw TextError if str is not a string', () => {
      expect(() => indexOf(123 as any, 'o')).toThrow(TextError);
      expect(() => indexOf(null as any, 'o')).toThrow(TextError);
      expect(() => indexOf(undefined as any, 'o')).toThrow(TextError);
    });

    it('should throw TextError if search is not a string or RegExp', () => {
      expect(() => indexOf('hello world', 123 as any)).toThrow(TextError);
      expect(() => indexOf('hello world', null as any)).toThrow(TextError);
      expect(() => indexOf('hello world', undefined as any)).toThrow(TextError);
    });

    it('should return the correct index from a specific position (pos)', () => {
      expect(indexOf('hello world', 'o', 5)).toBe(7); // Start searching from index 5
      expect(indexOf('hello world', /o/, 5)).toBe(7);
      expect(indexOf('hello world', /o/g, 5)).toBe(7);
      expect(indexOf('hello world', /o/g, 'invalid' as any)).toBe(4); // Default to 0
    });
  });

  describe('indexesOf', () => {
    it('should return all index ranges of the pattern matches', () => {
      expect(indexesOf('hello world', 'o')).toEqual([
        { start: 4, end: 5 },
        { start: 7, end: 8 },
      ]);

      expect(indexesOf('hello world', /o/)).toEqual([
        { start: 4, end: 5 },
        { start: 7, end: 8 },
      ]);

      expect(indexesOf('hello world', /o/g)).toEqual([
        { start: 4, end: 5 },
        { start: 7, end: 8 },
      ]);

      expect(indexesOf('hello world', 'z')).toBeUndefined();
    });

    it('should throw TextError if str is not a string', () => {
      expect(() => indexesOf(123 as any, 'o')).toThrow(TextError);
      expect(() => indexesOf(null as any, 'o')).toThrow(TextError);
      expect(() => indexesOf(undefined as any, 'o')).toThrow(TextError);
    });

    it('should throw TextError if search is not a string or RegExp', () => {
      expect(() => indexesOf('hello world', 123 as any)).toThrow(TextError);
      expect(() => indexesOf('hello world', null as any)).toThrow(TextError);
      expect(() => indexesOf('hello world', undefined as any)).toThrow(
        TextError
      );
    });
  });

  describe('lastIndexOf', () => {
    it('should return the index of the last occurrence of the pattern', () => {
      expect(lastIndexOf('hello world', 'o')).toBe(7);
      expect(lastIndexOf('hello world', /o/)).toBe(7);
      expect(lastIndexOf('hello world', /o/g)).toBe(7);
      expect(lastIndexOf('hello world', 'z')).toBeUndefined();
    });

    it('should throw TextError if str is not a string', () => {
      expect(() => lastIndexOf(123 as any, 'o')).toThrow(TextError);
      expect(() => lastIndexOf(null as any, 'o')).toThrow(TextError);
      expect(() => lastIndexOf(undefined as any, 'o')).toThrow(TextError);
    });

    it('should throw TextError if search is not a string or RegExp', () => {
      expect(() => lastIndexOf('hello world', 123 as any)).toThrow(TextError);
      expect(() => lastIndexOf('hello world', null as any)).toThrow(TextError);
      expect(() => lastIndexOf('hello world', undefined as any)).toThrow(
        TextError
      );
    });
  });
});

describe('toNumber', () => {
  test('returns 0 for null, undefined, or invalid values', () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined as any)).toBe(0);
    expect(toNumber('abc')).toBe(0);
    expect(toNumber(NaN)).toBe(0);
  });

  test('returns number for valid numeric strings and numbers', () => {
    expect(toNumber('123')).toBe(123);
    expect(toNumber(456)).toBe(456);
    expect(toNumber(' 7 ')).toBe(7);
  });
});

describe('toPercent', () => {
  test('calculates percentage correctly', () => {
    expect(toPercent(50, 200)).toBe(25);
    expect(toPercent(0, 100)).toBe(0);
    expect(toPercent(10, 0)).toBe(0);
  });

  test('returns 0 if inputs are invalid', () => {
    expect(toPercent(NaN, 10)).toBe(0);
    expect(toPercent(10, NaN)).toBe(0);
    expect(toPercent('10' as any, 100)).toBe(0);
  });
});

describe('toShort', () => {
  test('returns string for numbers less than 1000', () => {
    expect(toShort(950)).toBe('950');
    expect(toShort('800')).toBe('800');
  });

  test('converts thousands to k notation', () => {
    expect(toShort(1200)).toBe('1.2k');
    expect(toShort(10000)).toBe('10k');
  });

  test('converts millions to m notation', () => {
    expect(toShort(1000000)).toBe('1m');
    expect(toShort(2500000)).toBe('2.5m');
  });

  test('converts billions to b notation', () => {
    expect(toShort(1000000000)).toBe('1b');
    expect(toShort(3500000000)).toBe('3.5b');
  });

  test('returns "0" for invalid inputs', () => {
    expect(toShort(null)).toBe('0');
    expect(toShort(undefined)).toBe('0');
    expect(toShort('abc')).toBe('0');
  });
});

describe('toFloat', () => {
  test('rounds number to 1 decimal place as string', () => {
    expect(toFloat(2.345, 1)).toBe('2.3');
    expect(toFloat('3.789', 1)).toBe('3.8');
    expect(toFloat(null, 1)).toBe('0.0');
  });

  test('defaults places to 1 if invalid', () => {
    expect(toFloat(5.678, NaN)).toBe('5.7');
    expect(toFloat(5.678, 0 as any)).toBe('5.7');
  });

  test('handles negative numbers and zero', () => {
    expect(toFloat(-2.345, 1)).toBe('-2.3');
    expect(toFloat(0, 1)).toBe('0.0');
  });

  test('handles non-numeric input gracefully', () => {
    expect(toFloat('abc', 1)).toBe('0.0');
    expect(toFloat(undefined, 1)).toBe('0.0');
  });
});

describe('toSlug', () => {
  test('converts text to slug correctly', () => {
    expect(toSlug('Café au lait!')).toBe('cafe-au-lait');
    expect(toSlug('Hello, World!')).toBe('hello-world');
    expect(toSlug('Multiple   Spaces')).toBe('multiple-spaces');
    expect(toSlug('---Dashes---')).toBe('dashes');
    expect(toSlug('ÄÖÜ äöü')).toBe('aou-aou');
  });

  test('throws error if input is not a string', () => {
    expect(() => toSlug(null as any)).toThrow('Invalid text: null');
    expect(() => toSlug(123 as any)).toThrow('Invalid text: 123');
  });
});

describe('toArray', () => {
  test('returns input if already array', () => {
    expect(toArray(['a', 'b'])).toEqual(['a', 'b']);
  });

  test('wraps non-array values into array', () => {
    expect(toArray('hello')).toEqual(['hello']);
    expect(toArray(123)).toEqual([123]);
  });

  test('returns empty array for null or undefined', () => {
    expect(toArray(null)).toEqual([]);
    expect(toArray(undefined)).toEqual([]);
  });
});

describe('toISO', () => {
  test('converts yyyy-mm-dd to full ISO string', () => {
    const result = toISO('2025-08-06');
    expect(result).toBe('2025-08-06T00:00:00.000Z');
  });

  test('converts yyyy-mm-dd hh:mm:ss to full ISO string', () => {
    const result = toISO('2025-08-06 15:30:45');
    expect(result).toBe('2025-08-06T15:30:45.000Z');
  });

  test('returns ISO string as-is if already valid', () => {
    const input = '2025-08-06T15:30:45.000Z';
    const result = toISO(input);
    expect(result).toBe(input);
  });

  test('returns current date in ISO if input is invalid string', () => {
    const now = new Date().toISOString().slice(0, 10);
    const result = toISO('not-a-date');
    expect(result.slice(0, 10)).toBe(now);
  });

  test('returns current date in ISO if input is not a string', () => {
    const now = new Date().toISOString().slice(0, 10);
    const result = toISO(null as any);
    expect(result.slice(0, 10)).toBe(now);
  });
});

describe('round()', () => {
  test('rounds valid numbers', () => {
    expect(round(1.2)).toBe(1);
    expect(round(2.6)).toBe(3);
  });

  test('coerces string numbers and rounds', () => {
    expect(round('4.4')).toBe(4);
    expect(round('7.8')).toBe(8);
  });

  test('returns 0 on invalid input', () => {
    expect(round('abc')).toBe(0);
    expect(round(null)).toBe(0);
    expect(round(undefined)).toBe(0);
    expect(round({})).toBe(0);
    expect(round([])).toBe(0);
    expect(() => round(Symbol('x'))).not.toThrow();
  });
});

describe('floor()', () => {
  test('floors valid numbers', () => {
    expect(floor(2.9)).toBe(2);
    expect(floor(5.1)).toBe(5);
  });

  test('coerces string numbers and floors', () => {
    expect(floor('4.7')).toBe(4);
  });

  test('returns 0 on invalid input', () => {
    expect(floor('abc')).toBe(0);
    expect(floor(null)).toBe(0);
    expect(floor(undefined)).toBe(0);
    expect(floor({})).toBe(0);
    expect(() => floor(Symbol('x'))).not.toThrow();
  });
});

describe('pad()', () => {
  test('pads numbers with leading zeros', () => {
    expect(pad(5)).toBe('05');
    expect(pad(23)).toBe('23');
    expect(pad(7, 3)).toBe('007');
  });

  test('handles negative numbers and strings', () => {
    expect(pad('-9')).toBe('09');
  });

  test('returns padded zero string on invalid input', () => {
    expect(pad('abc')).toBe('00');
    expect(pad(null)).toBe('00');
    expect(() => pad(Symbol('x'))).not.toThrow();
  });
});

describe('percent()', () => {
  test('formats valid numbers as percentage', () => {
    expect(percent(75)).toBe('75%');
    expect(percent('33')).toBe('33%');
  });

  test('returns "0%" on invalid input', () => {
    expect(percent('abc')).toBe('0%');
    expect(percent(null)).toBe('0%');
    expect(() => percent(Symbol('x'))).not.toThrow();
  });
});

describe('comma()', () => {
  test('formats numbers with commas', () => {
    expect(comma(1000)).toBe('1,000');
    expect(comma('1234567')).toBe('1,234,567');
  });

  test('returns "0" on invalid input', () => {
    expect(comma('abc')).toBe('0');
    expect(comma(null)).toBe('0');
    expect(() => comma(Symbol('x'))).not.toThrow();
  });
});

describe('trim()', () => {
  test('trims whitespace from strings', () => {
    expect(trim('  hello  ')).toBe('hello');
  });

  test('handles null, undefined, and non-string types', () => {
    expect(trim(null)).toBe('');
    expect(trim(undefined)).toBe('');
    expect(trim(123)).toBe('123');
    expect(() => trim(Symbol('x'))).not.toThrow();
  });
});

describe('join()', () => {
  test('joins array of strings with default separator', () => {
    expect(join(['a', 'b'])).toBe('a, b');
  });

  test('joins with custom separator', () => {
    expect(join(['x', 'y', 'z'], '-')).toBe('x-y-z');
  });

  test('returns empty string if not an array', () => {
    expect(join('abc')).toBe('');
    expect(join({})).toBe('');
    expect(() => join(Symbol('x'))).not.toThrow();
  });
});

describe('avg()', () => {
  test('calculates average with 1 decimal', () => {
    expect(avg(4, 20)).toBe('5.0');
    expect(avg('5', '25')).toBe('5.0');
  });

  test('returns "0.0" on invalid input or divide-by-zero', () => {
    expect(avg(0, 50)).toBe('0.0');
    expect(avg('a', 10)).toBe('0.0');
    expect(avg(2, 'abc')).toBe('0.0');
    expect(avg(null, 10)).toBe('0.0');
    expect(() => avg(Symbol('x'), 10)).not.toThrow();
  });
});

describe('escapeHTML()', () => {
  test('escapes all special HTML characters', () => {
    const input = `"<script>alert('xss')</script>"`;
    const result = escapeHTML(input);
    expect(result).toBe(
      '&quot;&lt;script&gt;alert(&#39;xss&#39;)&lt;&#x2F;script&gt;&quot;'
    );
  });

  test('returns empty string for non-string input', () => {
    expect(escapeHTML(null)).toBe('');
    expect(escapeHTML(undefined)).toBe('');
    expect(escapeHTML({})).toBe('');
    expect(escapeHTML(123)).toBe('');
  });

  test('returns string untouched if no special characters', () => {
    const input = 'safeText123';
    expect(escapeHTML(input)).toBe(input);
  });

  test('does not throw on invalid input', () => {
    expect(() => escapeHTML(undefined)).not.toThrow();
    expect(() => escapeHTML({})).not.toThrow();
  });
});

describe('mark()', () => {
  test('marks objects with checked: true if id is selected', () => {
    const list = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = mark(list, 2, 3);
    expect(result).toEqual([
      { id: 1, checked: false },
      { id: 2, checked: true },
      { id: 3, checked: true },
    ]);
  });

  test('marks primitives with checked: true if value is selected', () => {
    const list = ['a', 'b', 'c'];
    const result = mark(list, 'b');
    expect(result).toEqual([
      { value: 'a', checked: false },
      { value: 'b', checked: true },
      { value: 'c', checked: false },
    ]);
  });

  test('returns empty array for invalid input', () => {
    expect(mark(null as any)).toEqual([]);
    expect(mark(undefined as any)).toEqual([]);
    expect(mark(123 as any)).toEqual([]);
  });

  test('handles mixed types safely', () => {
    const list = [1, { id: '2' }, '3'];
    const result = mark(list, '1', 2, '3');
    expect(result).toEqual([
      { value: 1, checked: true },
      { id: '2', checked: true },
      { value: '3', checked: true },
    ]);
  });

  test('does not throw on unexpected inputs', () => {
    expect(() => mark(undefined as any, '1')).not.toThrow();
    expect(() => mark({} as any, '1')).not.toThrow();
  });
});

describe('unmark()', () => {
  test('unmarks all object items by setting checked: false', () => {
    const list = [{ id: 1, checked: true }, { id: 2 }];
    const result = unmark(list);
    expect(result).toEqual([
      { id: 1, checked: false },
      { id: 2, checked: false },
    ]);
  });

  test('wraps primitives with checked: false', () => {
    const list = ['x', 'y'];
    const result = unmark(list);
    expect(result).toEqual([
      { value: 'x', checked: false },
      { value: 'y', checked: false },
    ]);
  });

  test('returns empty array for invalid input', () => {
    expect(unmark(null as any)).toEqual([]);
    expect(unmark(undefined as any)).toEqual([]);
    expect(unmark(123 as any)).toEqual([]);
  });

  test('does not throw on unexpected input', () => {
    expect(() => unmark(undefined as any)).not.toThrow();
    expect(() => unmark('bad' as any)).not.toThrow();
  });
});

describe('host()', () => {
  test('extracts domain from full URL with www', () => {
    expect(host('https://www.youtube.com')).toBe('youtube');
  });

  test('extracts domain from full URL without www', () => {
    expect(host('https://github.com')).toBe('github');
  });

  test('trims input before parsing', () => {
    expect(host('  https://www.facebook.com  ')).toBe('facebook');
  });

  test('returns fallback for invalid URL', () => {
    expect(host('invalid-url')).toBe('bnjsx');
    expect(host('://::')).toBe('bnjsx');
  });

  test('returns fallback for empty input', () => {
    expect(host('')).toBe('bnjsx');
    expect(host('   ')).toBe('bnjsx');
  });

  test('returns fallback if not a string', () => {
    expect(host(null as any)).toBe('bnjsx');
    expect(host(123 as any)).toBe('bnjsx');
  });

  test('returns custom fallback if provided', () => {
    expect(host('', 'default')).toBe('default');
    expect(host('bad-url', 'fallback')).toBe('fallback');
  });

  test('returns domain even for subdomains', () => {
    expect(host('https://blog.medium.com')).toBe('blog');
  });

  test('does not throw on unexpected input', () => {
    expect(() => host(undefined as any)).not.toThrow();
    expect(() => host({} as any)).not.toThrow();
  });

  test('returns fallback from domain || def (not from catch)', () => {
    // This is a valid URL that results in an empty hostname
    const fakeURL = 'http://www.'; // hostname: 'www.', clean: '', domain: ''
    expect(host(fakeURL)).toBe('bnjsx');
  });
});

describe('botInput()', () => {
  test('returns correct hidden bot trap input', () => {
    expect(botInput()).toBe(
      '<input type="text" name="honeyPot" style="display:none" />'
    );
  });

  test('does not throw or require input', () => {
    expect(() => botInput()).not.toThrow();
  });
});

describe('csrfInput()', () => {
  test('returns hidden input with the given CSRF token', () => {
    const token = 'abc123';
    const result = csrfInput(token);
    expect(result).toBe(
      '<input type="hidden" name="csrfToken" value="abc123" />'
    );
  });

  test('escapes input as string and embeds in input field', () => {
    const result = csrfInput('"><script>alert(1)</script>');
    expect(result).toBe(
      '<input type="hidden" name="csrfToken" value="&quot;&gt;&lt;script&gt;alert(1)&lt;&#x2F;script&gt;" />'
    );
  });

  test('handles empty string safely', () => {
    expect(csrfInput('')).toBe(
      '<input type="hidden" name="csrfToken" value="" />'
    );
  });

  test('does not throw on unexpected input', () => {
    expect(() => csrfInput(null as any)).not.toThrow();
    expect(() => csrfInput(undefined as any)).not.toThrow();
  });
});

describe('toInt()', () => {
  test('returns same integer if input is a valid integer number', () => {
    expect(toInt(42)).toBe(42);
    expect(toInt(-7)).toBe(-7);
  });

  test('floors float numbers', () => {
    expect(toInt(4.9)).toBe(4);
    expect(toInt(-4.9)).toBe(-5);
  });

  test('converts numeric strings to integers', () => {
    expect(toInt('123')).toBe(123);
    expect(toInt('5.8')).toBe(5);
    expect(toInt('-3.2')).toBe(-4);
  });

  test('returns 0 for invalid strings', () => {
    expect(toInt('abc')).toBe(0);
    expect(toInt('123abc')).toBe(0);
    expect(toInt('')).toBe(0);
  });

  test('returns 0 for null, undefined, NaN', () => {
    expect(toInt(null)).toBe(0);
    expect(toInt(undefined)).toBe(0);
    expect(toInt(NaN)).toBe(0);
  });

  test('returns 0 for non-numeric types', () => {
    expect(toInt({})).toBe(0);
    expect(toInt([])).toBe(0);
    expect(toInt([1, 2])).toBe(0);
    expect(toInt(true)).toBe(1); // Number(true) = 1
    expect(toInt(false)).toBe(0); // Number(false) = 0
  });

  test('does not throw on unexpected input', () => {
    expect(() => toInt(null)).not.toThrow();
    expect(() => toInt('bad')).not.toThrow();
    expect(() => toInt({})).not.toThrow();
  });
});

describe('toMs()', () => {
  test('converts seconds to ms', () => {
    expect(toMs('5s')).toBe(5000);
  });

  test('converts minutes to ms', () => {
    expect(toMs('30m')).toBe(1000 * 60 * 30);
  });

  test('converts hours to ms', () => {
    expect(toMs('2h')).toBe(1000 * 60 * 120);
  });

  test('converts days to ms', () => {
    expect(toMs('1d')).toBe(1000 * 60 * 60 * 24);
  });

  test('converts months to ms (30 days)', () => {
    expect(toMs('1mo')).toBe(1000 * 60 * 60 * 24 * 30);
  });

  test('converts years to ms (365 days)', () => {
    expect(toMs('1y')).toBe(1000 * 60 * 60 * 24 * 365);
  });

  test('returns default 48h ms for invalid unit', () => {
    expect(toMs('10w')).toBe(1000 * 60 * 60 * 48);
  });

  test('returns default for malformed string', () => {
    expect(toMs('abc')).toBe(1000 * 60 * 60 * 48);
    expect(toMs('100')).toBe(1000 * 60 * 60 * 48);
    expect(toMs('m30')).toBe(1000 * 60 * 60 * 48);
  });

  test('returns default for missing input', () => {
    expect(toMs()).toBe(1000 * 60 * 60 * 48);
    expect(toMs(undefined)).toBe(1000 * 60 * 60 * 48);
    expect(toMs(null as any)).toBe(1000 * 60 * 60 * 48);
  });

  test('returns 0 if the unit is not found', () => {
    expect(toMs('5ms')).toBe(0);
    expect(toMs('10mm')).toBe(0);
  });
});

describe('base()', () => {
  test('builds valid base URL with custom port', () => {
    expect(base('example.com', 'https', 8080)).toBe('https://example.com:8080');
  });

  test('omits default ports (http:80, https:443)', () => {
    expect(base('example.com', 'http', 80)).toBe('http://example.com');
    expect(base('secure.com', 'https', 443)).toBe('https://secure.com');
  });

  test('defaults to localhost if host is invalid', () => {
    expect(base(null as any, 'http', 2025)).toBe('http://localhost:2025');
  });

  test('defaults to port 2025 if port is invalid or negative', () => {
    expect(base('host.com', 'http', -1)).toBe('http://host.com:2025');
    expect(base('host.com', 'http', NaN as any)).toBe('http://host.com:2025');
  });

  test('defaults to http if protocol is invalid', () => {
    expect(base('site.com', 'ftp' as any, 3000)).toBe('http://site.com:3000');
  });

  test('builds full URL safely for all inputs', () => {
    expect(() =>
      base(undefined as any, undefined as any, undefined as any)
    ).not.toThrow();
  });
});

describe('mapping()', () => {
  beforeEach(() => {
    // clear mappings before each test
    mappings.clear();
  });

  test('registers valid key-value pairs', () => {
    mapping({ key1: 'val1', key2: 'val2' });
    expect(map('key1')).toBe('val1');
    expect(map('key2')).toBe('val2');
  });

  test('ignores non-string keys and values', () => {
    mapping({
      valid: 'yes',
      '': 'blank',
      good: 123 as any,
    });
    expect(map('valid')).toBe('yes');
    expect(map('')).toBe('');
    expect(map('good')).toBe('');
  });

  test('does not throw on null or invalid input', () => {
    expect(() => mapping(null)).not.toThrow();
    expect(() => mapping(undefined)).not.toThrow();
    expect(() => mapping('not-object' as any)).not.toThrow();
  });
});

describe('map()', () => {
  beforeEach(() => {
    mappings.clear();
    mapping({ hello: 'world' });
  });

  test('returns mapped value if exists', () => {
    expect(map('hello')).toBe('world');
  });

  test('returns empty string if not mapped', () => {
    expect(map('unmapped')).toBe('');
  });

  test('returns empty string for null, undefined, or empty key', () => {
    expect(map('')).toBe('');
    expect(map(null)).toBe('');
    expect(map(undefined)).toBe('');
  });

  test('does not throw on any input', () => {
    expect(() => map(null)).not.toThrow();
    expect(() => map({} as any)).not.toThrow();
  });
});

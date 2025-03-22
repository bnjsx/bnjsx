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
  toChars,
  toKababCase,
  toKamelCase,
  toLower,
  toLowerAt,
  toLowerFrom,
  toPascalCase,
  toPlural,
  toRegex,
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
} from '../../../src/helpers';

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

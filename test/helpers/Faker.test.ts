import { Faker, FakerError } from '../../src/helpers';

describe('Faker', () => {
  let faker: any;

  beforeEach(() => {
    faker = new Faker();
  });

  describe('ids()', () => {
    test('generates sequential array from start to end inclusive', () => {
      expect(faker.ids(1, 5)).toEqual([1, 2, 3, 4, 5]);
      expect(faker.ids(3, 3)).toEqual([3]);
    });

    test('throws FakerError if start is greater than end', () => {
      expect(() => faker.ids(5, 1)).toThrow('Invalid arguments provided');
    });

    test('throws FakerError if start or end is not a number', () => {
      expect(() => faker.ids('a', 5)).toThrow('Invalid arguments provided');
      expect(() => faker.ids(1, null)).toThrow('Invalid arguments provided');
      expect(() => faker.ids(undefined, 5)).toThrow(
        'Invalid arguments provided'
      );
    });
  });

  describe('random.between', () => {
    test('should return a number between min and max, inclusive', () => {
      const result = faker.random.between(1, 5);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(5);
    });

    test('should throw FakerError if min is greater than max', () => {
      expect(() => faker.random.between(5, 1)).toThrow(FakerError);
    });
  });

  describe('random.index', () => {
    test('should return a valid index within the bounds of the array', () => {
      const values = ['a', 'b', 'c'];
      const index = faker.random.index(values);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(values.length);
    });

    test('should throw FakerError if values is not a non-empty array', () => {
      expect(() => faker.random.index([])).toThrow(FakerError);
      expect(() => faker.random.index(null)).toThrow(FakerError);
      expect(() => faker.random.index('string')).toThrow(FakerError);
    });
  });

  describe('random.select', () => {
    test('should return a random element from the provided array', () => {
      const values = [1, 2, 3];
      const element = faker.random.select(values);
      expect(values).toContain(element);
    });

    test('should throw FakerError if values is not a non-empty array', () => {
      expect(() => faker.random.select([])).toThrow(FakerError);
      expect(() => faker.random.select(null)).toThrow(FakerError);
      expect(() => faker.random.select('string')).toThrow(FakerError);
    });
  });

  describe('random.char', () => {
    test('should return a character from the allowed set', () => {
      expect(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()'
      ).toContain(faker.random.char());
    });
  });

  describe('firstName', () => {
    test('should return a random first name', () => {
      faker.random.select = jest.fn(() => 'First');
      expect(faker.firstName()).toBe('First');
    });
  });

  describe('lastName', () => {
    test('should return a random last name', () => {
      faker.random.select = jest.fn(() => 'Last');
      expect(faker.lastName()).toBe('Last');
    });
  });

  describe('name', () => {
    test('should return a full name', () => {
      faker.firstName = jest.fn(() => 'First');
      faker.lastName = jest.fn(() => 'Last');
      expect(faker.name()).toBe('First Last');
    });
  });

  describe('username', () => {
    test('should return a unique username', () => {
      faker.firstName = jest.fn(() => 'First');
      faker.lastName = jest.fn(() => 'Last');
      faker.random.between = jest.fn(() => 123);
      expect(faker.username()).toBe('firstlast123');
    });
  });

  describe('email', () => {
    test('should return a random email address', () => {
      faker.firstName = jest.fn(() => 'First');
      faker.lastName = jest.fn(() => 'Last');
      faker.random.between = jest.fn(() => 123);
      faker.random.select = jest.fn(() => 'gmail.com');

      expect(faker.email()).toBe('firstlast123@gmail.com');
    });
  });

  describe('gmail', () => {
    test('should return a random Gmail address', () => {
      faker.firstName = jest.fn(() => 'First');
      faker.lastName = jest.fn(() => 'Last');
      faker.random.between = jest.fn(() => 123);

      expect(faker.gmail()).toBe('FirstLast123@gmail.com');
    });
  });

  describe('password', () => {
    test('should return a password of default length 8', () => {
      faker.random.char = jest.fn(() => 'A'); // Mock character generation
      expect(faker.password()).toHaveLength(8);
      expect(faker.password()).toBe('AAAAAAAA');
    });

    test('should return a password of specified length', () => {
      faker.random.char = jest.fn(() => 'A'); // Mock character generation
      expect(faker.password(12)).toHaveLength(12);
    });

    test('should return a password of length 8 if invalid length is provided', () => {
      faker.random.char = jest.fn(() => 'A'); // Mock character generation
      expect(faker.password(-1)).toHaveLength(8);
    });
  });

  describe('continent', () => {
    test('should return a random continent name', () => {
      faker.random.select = jest.fn(() => 'Africa'); // Mocking to always return 'Africa'
      expect(faker.continent()).toBe('Africa');
    });
  });

  describe('country', () => {
    test('should return a random country name', () => {
      faker.random.select = jest.fn(() => 'Canada'); // Mocking to always return 'Canada'
      expect(faker.country()).toBe('Canada');
    });
  });

  describe('city', () => {
    test('should return a random city name based on country', () => {
      faker.random.select = jest.fn(() => 'Toronto'); // Mocking to always return 'Toronto'
      expect(faker.city()).toBe('Toronto');
    });
  });

  describe('street', () => {
    test('should return a random street name', () => {
      faker.random.select = jest.fn(() => 'Street'); // Mocking to always return 'Street'
      expect(faker.street()).toBe('Street Street');
    });
  });

  describe('address', () => {
    test('should return a random address', () => {
      faker.random.between = jest.fn(() => 123); // Mocking between method
      faker.country = jest.fn(() => 'Canada');
      faker.random.select = jest.fn(() => 'Toronto');
      faker.street = jest.fn(() => 'River Street');

      expect(faker.address()).toBe('123 River Street, Toronto, Canada');
    });
  });

  describe('sentence', () => {
    test('should return a randomly generated sentence', () => {
      faker.random.select = jest.fn(() => 'Hello');
      expect(faker.sentence()).toBe('Hello');
    });
  });

  describe('paragraph', () => {
    test('should return a random paragraph with a specific number of sentences', () => {
      faker.sentence = jest.fn(() => 'The child runs to beautiful park.'); // Mock the sentence method
      faker.random.between = jest.fn(() => 3); // Mock to always return 3 sentences
      expect(faker.paragraph(3)).toBe(
        'The child runs to beautiful park. The child runs to beautiful park. The child runs to beautiful park.'
      );
    });

    test('should return a random paragraph with a default number of sentences', () => {
      faker.sentence = jest.fn(() => 'The child runs to beautiful park.'); // Mock the sentence method
      faker.random.between = jest.fn(() => 5); // Mock to always return 5 sentences
      expect(faker.paragraph()).toBe(
        'The child runs to beautiful park. The child runs to beautiful park. The child runs to beautiful park. The child runs to beautiful park. The child runs to beautiful park.'
      );
    });
  });

  describe('text', () => {
    test('should return a random text with a specific number of paragraphs', () => {
      faker.paragraph = jest.fn(() => 'The child runs to beautiful park.'); // Mock the paragraph method
      faker.random.between = jest.fn(() => 2); // Mock to always return 2 paragraphs
      expect(faker.text(2)).toBe(
        'The child runs to beautiful park.\n\nThe child runs to beautiful park.'
      );
    });

    test('should return a random text with a default number of paragraphs', () => {
      faker.paragraph = jest.fn(() => 'The child runs to beautiful park.'); // Mock the paragraph method
      faker.random.between = jest.fn(() => 4); // Mock to always return 4 paragraphs
      expect(faker.text()).toBe(
        'The child runs to beautiful park.\n\nThe child runs to beautiful park.\n\nThe child runs to beautiful park.\n\nThe child runs to beautiful park.'
      );
    });
  });

  describe('lorem', () => {
    test('should generate Lorem Ipsum text with the default length of 500', () => {
      const result = faker.lorem();
      expect(result).toHaveLength(500);
    });

    test('should generate Lorem Ipsum text with the specified length', () => {
      const length = 100;
      const result = faker.lorem(length);
      expect(result).toHaveLength(length);
    });

    test('should handle invalid inputs gracefully and return the default length', () => {
      expect(faker.lorem(0)).toHaveLength(500); // Zero is invalid
      expect(faker.lorem(-10)).toHaveLength(500); // Negative is invalid
      expect(faker.lorem('abc')).toHaveLength(500); // Non-numeric input
      expect(faker.lorem(null)).toHaveLength(500); // Null input
      expect(faker.lorem(undefined)).toHaveLength(500); // Undefined input
    });

    test('should generate different results on repeated calls (random selection)', () => {
      const result1 = faker.lorem(500);
      const result2 = faker.lorem(500);
      expect(result1).not.toEqual(result2); // They may overlap but shouldn't be identical
    });
  });

  describe('id', () => {
    test('should return a random ID number between 1 and a specified maximum value', () => {
      faker.random.between = jest.fn(() => 5); // Mock to always return 5
      expect(faker.id(10)).toBe(5);
      expect(faker.id()).toBe(5); // Test with default max value
    });

    test('should default to 10 if max is invalid', () => {
      faker.random.between = jest.fn(() => 3);
      expect(faker.id(-1)).toBe(3); // Invalid input should default
      expect(faker.id(undefined)).toBe(3); // Undefined should default
    });
  });

  describe('price', () => {
    test('should return a random price between specified minimum and maximum values', () => {
      faker.random.between = jest.fn(() => 123);
      expect(faker.price()).toBe(123.123);
    });

    test('should use default values if parameters are invalid', () => {
      faker.random.between = jest.fn(() => 123);
      expect(faker.price(-1, -1, -1)).toBe(123.123); // Invalid inputs should use defaults
    });
  });

  describe('category', () => {
    test('should return a random unique category name', () => {
      faker.categories = ['Books', 'Toys', 'Games']; // Mock categories
      faker.random.index = jest.fn(() => 0); // Mock to always return the first category
      expect(faker.category()).toBe('Books');
      expect(faker.categories.length).toBe(2); // Should have removed the used category
    });

    test('should throw an error if all categories have been used', () => {
      faker.categories = ['Books', 'Toys', 'Games']; // Mock categories
      faker.random.index = jest.fn(() => 0); // Mock to always return the first category
      expect(faker.category()).toBe('Books');
      expect(faker.category()).toBe('Toys');
      expect(faker.category()).toBe('Games');
      expect(() => faker.category()).toThrow(FakerError);
    });
  });

  describe('phone', () => {
    test('should return a random phone number based on the provided format', () => {
      faker.random.between = jest.fn(() => 2); // Mock random digits
      const format = '(###) ###-####';
      expect(faker.phone(format)).toBe('(222) 222-2222');
    });

    test('should use a random format if none is provided', () => {
      faker.random.select = jest.fn(() => '(###) ###-####'); // Mock random select
      faker.random.between = jest.fn(() => 2); // Mock random digits
      expect(faker.phone()).toBe('(222) 222-2222');
    });
  });

  describe('zip', () => {
    test('should return a random ZIP code in the specified format', () => {
      faker.random.between = jest.fn(() => 5); // Mock random digit generation
      expect(faker.zip()).toBe('55555'); // Default format
      expect(faker.zip('#####-####')).toBe('55555-5555'); // Custom format
    });

    test('should use default format if provided format is invalid', () => {
      faker.random.between = jest.fn(() => 5); // Mock random digit generation
      expect(faker.zip(123)).toBe('55555'); // Invalid format should default
    });
  });

  describe('date', () => {
    test('should return a random date formatted according to the specified format', () => {
      faker.random.between = jest.fn((min: number, max: number) => {
        if (min === 1990 && max === new Date().getFullYear()) return 2023; // Mock year
        if (min === 1 && max === 12) return 11; // Mock month (November)
        return 15; // Mock day
      });

      expect(faker.date()).toBe('2023-11-15');
      expect(faker.date('YYYY/MM/DD')).toBe('2023/11/15'); // Custom format
    });

    test('should use default format if provided format is invalid', () => {
      faker.random.between = jest.fn((min: number, max: number) => {
        if (min === 1990 && max === new Date().getFullYear()) return 2023; // Mock year
        if (min === 1 && max === 12) return 11; // Mock month (November)
        return 15; // Mock day
      });
      expect(faker.date(123)).toBe('2023-11-15'); // Invalid format should default
    });
  });

  describe('time', () => {
    test('should return a random time formatted according to the specified format', () => {
      faker.random.between = jest.fn((min: number, max: number) => {
        if (min === 0 && max === 23) return 14; // Mock hour
        if (min === 0 && max === 59) return 5; // Mock minute/seconds
      });

      expect(faker.time()).toBe('14:05:05'); // Adjusted expected output accordingly
      expect(faker.time('hh_mm_ss')).toBe('14_05_05'); // Custom format
    });

    test('should use default format if provided format is invalid', () => {
      faker.random.between = jest.fn((min: number, max: number) => {
        if (min === 0 && max === 23) return 14; // Mock hour
        if (min === 0 && max === 59) return 5; // Mock minute/seconds
      });

      expect(faker.time(123)).toBe('14:05:05'); // Invalid format should default
    });
  });

  describe('datetime', () => {
    test('should return a random datetime string', () => {
      const datePart = '2023-11-15';
      const timePart = '14:05:32';

      jest.spyOn(faker, 'date').mockReturnValue(datePart); // Mock date method
      jest.spyOn(faker, 'time').mockReturnValue(timePart); // Mock time method

      expect(faker.datetime()).toBe('2023-11-15 14:05:32'); // Adjusted expected output accordingly
    });

    test('should use specified formats for date and time', () => {
      const datePart = '15/11/2023';
      const timePart = '14:05:32';

      jest.spyOn(faker, 'date').mockReturnValue(datePart); // Mock date method
      jest.spyOn(faker, 'time').mockReturnValue(timePart); // Mock time method

      expect(faker.datetime('DD/MM/YYYY', 'hh:mm:ss')).toBe(
        '15/11/2023 14:05:32'
      );
    });
  });

  describe('boolean', () => {
    test('should return either 0 or 1', () => {
      const results = Array.from({ length: 100 }).map(() => faker.boolean());
      expect(results.every((val) => val === 0 || val === 1)).toBe(true);
    });
  });

  describe('card', () => {
    test('should return a random credit card number in the specified format', () => {
      faker.random.between = jest.fn(() => 0); // Mock to return 0 for simplification
      expect(faker.card()).toBe('0000 0000 0000 0000'); // Default format
      expect(faker.card('#### #### #### ###')).toBe('0000 0000 0000 000'); // Custom format
    });

    test('should use default format if provided format is invalid', () => {
      faker.random.between = jest.fn(() => 0); // Mock to return 0 for simplification
      expect(faker.card(123)).toBe('0000 0000 0000 0000'); // Invalid format should default
    });
  });

  describe('ipv4', () => {
    test('should return a valid IPv4 address', () => {
      faker.random.between = jest.fn(() => 100);
      expect(faker.ipv4()).toBe('100.100.100.100'); // Based on mocked values
    });

    test('should return an IPv4 address in the correct format', () => {
      const results = Array.from({ length: 100 }).map(() => faker.ipv4());
      expect(results.every((val) => /^\d{1,3}(\.\d{1,3}){3}$/.test(val))).toBe(
        true
      ); // Validate format
    });
  });

  describe('ipv6', () => {
    test('should return a valid IPv6 address', () => {
      faker.random.between = jest.fn(() => 0x1234); // Mocking random values
      expect(faker.ipv6()).toBe('1234:1234:1234:1234:1234:1234:1234:1234'); // Based on mocked values
    });

    test('should return an IPv6 address in the correct format', () => {
      const results = Array.from({ length: 100 }).map(() => faker.ipv6());
      expect(
        results.every((val) => /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/.test(val))
      ).toBe(true); // Validate format
    });
  });

  describe('product', () => {
    test('should return a randomly generated product name', () => {
      faker.random.select = jest.fn((arr) => 'Poduct'); // Mock to always return the first element for testing
      expect(faker.product()).toBe('Poduct Poduct'); // Based on mocked values
    });
  });

  describe('sku', () => {
    test('should return a SKU in the format "###-###-###"', () => {
      faker.random.between = jest.fn(() => 0); // Mock to return 0 for simplification
      expect(faker.sku()).toBe('000-000-000'); // Based on mocked values
    });
  });

  describe('domain', () => {
    test('should return a randomly selected domain name', () => {
      faker.random.select = jest.fn(() => 'example.com'); // Mock to return a specific domain
      expect(faker.domain()).toBe('example.com'); // Based on mocked values
    });
  });

  describe('path', () => {
    test('should return a valid URL path', () => {
      faker.random.select = jest.fn((arr) => 'path'); // Mock to always return the first element
      expect(faker.path()).toBe('path/path'); // Based on mocked values
    });
  });

  describe('url', () => {
    test('should return a randomly generated URL with a protocol, domain, and path', () => {
      faker.domain = jest.fn(() => 'shop.net'); // Mock domain
      faker.path = jest.fn(() => 'products/pricing'); // Mock path
      faker.random.select = jest.fn(() => 'https'); // Mock protocol
      expect(faker.url()).toBe('https://shop.net/products/pricing'); // Based on mocked values
    });
  });

  describe('job', () => {
    test('should return a randomly selected job title', () => {
      faker.random.select = jest.fn(() => 'Software Engineer'); // Mock to return a specific job
      expect(faker.job()).toBe('Software Engineer'); // Based on mocked values
    });
  });

  describe('company', () => {
    test('should return a randomly generated company name', () => {
      faker.random.select = jest.fn((arr) => arr[0]); // Mock to always return the first element
      expect(faker.company()).toBe('Global Solutions'); // Based on mocked values
    });
  });
});

import { isFullArr, isInt, isStr, isUndefined } from './Test';

/**
 * Formats a given date based on the specified format string.
 *
 * @param year The year part of the date.
 * @param month The month part of the date (1-12).
 * @param day The day part of the date (1-31).
 * @param format The format string where 'YYYY' represents the year, 'MM' the month, and 'DD' the day.
 * @returns A string representing the formatted date.
 */
function formatDate(
  year: number,
  month: number,
  day: number,
  format: string
): string {
  return format
    .replace('YYYY', year.toString())
    .replace('MM', pad(month))
    .replace('DD', pad(day));
}

/**
 * Formats a given time based on the specified format string.
 *
 * @param hours The hour part of the time (0-23).
 * @param minutes The minutes part of the time (0-59).
 * @param seconds The seconds part of the time (0-59).
 * @param format The format string where 'hh' represents hours, 'mm' minutes, and 'ss' seconds.
 * @returns A string representing the formatted time.
 */
function formatTime(
  hours: number,
  minutes: number,
  seconds: number,
  format: string
): string {
  return format
    .replace('hh', pad(hours))
    .replace('mm', pad(minutes))
    .replace('ss', pad(seconds));
}

/**
 * Pads a number with a leading zero if it is a single digit.
 *
 * @param num The number to pad.
 * @returns The padded number as a string.
 */
function pad(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Get a random integer between the specified minimum and maximum values, inclusive.
 *
 * @param min The minimum integer value (inclusive).
 * @param max The maximum integer value (inclusive).
 * @returns A random integer between min and max.
 * @throws `FakerError` if min is greater than max.
 */
export function randomBetween(min: number, max: number): number {
  if (min > max) {
    throw new FakerError(`Invalid min and max values: ${min}, ${max}`);
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get a random index from the provided array.
 *
 * @param values The array from which to retrieve a random index.
 * @returns A random index within the bounds of the array.
 * @throws `FakerError` if values is not an array.
 */
export function randomIndex(values: Array<any>): number {
  if (!isFullArr(values)) {
    throw new FakerError(`Invalid values: ${String(values)}`);
  }

  return randomBetween(0, values.length - 1);
}

/**
 * Get a random element from the provided array.
 *
 * @param values The array from which to retrieve a random element.
 * @returns A random element from the array.
 * @throws `FakerError` if values is not an array.
 */
export function randomSelect(values: Array<any>) {
  if (!isFullArr(values)) {
    throw new FakerError(`Invalid values: ${String(values)}`);
  }

  return values[randomIndex(values)];
}

/**
 * Get a random character from a predefined set of alphanumeric and special characters.
 *
 * @returns A random character from 'A-Z', 'a-z', '0-9', and selected symbols.
 */
export function randomChar(): string {
  return randomSelect(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()'.split(
      ''
    )
  );
}

/**
 * Interface defining a set of utility methods for generating random values.
 * Each method is designed to provide flexible randomization options for various data types.
 */
interface Random {
  /**
   * Get a random integer between the specified minimum and maximum values (inclusive).
   *
   * @param min The minimum value for the random integer.
   * @param max The maximum value for the random integer.
   * @returns A random integer between min and max.
   * @throws `FakerError` if min or max are not positive integers, or if min is greater than max.
   *
   */
  between(min: number, max: number): number;

  /**
   * Get a random index within the bounds of the provided array.
   *
   * @param values The array from which to select a random index.
   * @returns A random index between 0 and values.length - 1.
   * @throws `FakerError` if values is not an array.
   *
   */
  index(values: Array<any>): number;

  /**
   * Get a random element from the provided array.
   *
   * @param values The array from which to select a random element.
   * @returns A random element from the array.
   * @throws `FakerError` if values is not an array or is empty.
   *
   */
  select(values: Array<any>): any;

  /**
   * Get a random character from a predefined set of alphanumeric characters and symbols.
   *
   * @returns A random character from the character set.
   *
   */
  char(): string;
}

/**
 * Custom error class for handling errors specific to the Faker.
 * Extends the built-in JavaScript Error class.
 */
export class FakerError extends Error {}

/**
 *
 * This class provides a suite of methods for generating random data, including names, locations, products,
 * dates, internet-related values, and more. It is designed to simulate real-world data for testing and
 * development purposes, ensuring variety and realism across different domains.
 *
 * ```typescript
 * const faker = new Faker();
 *
 * // Personal Information
 * console.log('first name:', faker.firstName());     // e.g., "John"
 * console.log('last name:', faker.lastName());       // e.g., "Doe"
 * console.log('email:', faker.email());              // e.g., "johndoe123@gmail.com"
 * console.log('password:', faker.password());        // e.g., "p@ssw0rd123"
 * console.log('username:', faker.username());        // e.g., "johndoe92"
 *
 * // Location Information
 * console.log('continent:', faker.continent());      // e.g., "Asia"
 * console.log('country:', faker.country());          // e.g., "Canada"
 * console.log('city:', faker.city());                // e.g., "San Francisco"
 * console.log('address:', faker.address());          // e.g., "1234 Maple St, Toronto, Canada"
 *
 * // Professional Information
 * console.log('job:', faker.job());                  // e.g., "Software Engineer"
 * console.log('company:', faker.company());          // e.g., "Global Solutions"
 *
 * // Product Information
 * console.log('product:', faker.product());          // e.g., "Pro Laptop"
 * console.log('sku:', faker.sku());                  // e.g., "123-456-789"
 *
 * // Web and Internet Data
 * console.log('path:', faker.path());                // e.g., "blog/introduction"
 * console.log('domain:', faker.domain());            // e.g., "example.com"
 * console.log('url:', faker.url());                  // e.g., "https://shop.net/products/pricing"
 * console.log('ipv4:', faker.ipv4());                // e.g., "192.168.1.1"
 * console.log('ipv6:', faker.ipv6());                // e.g., "2001:0db8:85a3:0000:0000:8a2e:0370:7334"
 *
 * // Miscellaneous Data
 * console.log('boolean:', faker.boolean());          // e.g., 1 | 0
 * console.log('date:', faker.date());                // e.g., "2024-11-01"
 * console.log('time:', faker.time());                // e.g., "14:30:00"
 * console.log('datetime:', faker.datetime());        // e.g., "2024-11-01 14:30:00"
 * console.log('zip:', faker.zip());                  // e.g., "90210"
 * console.log('phone:', faker.phone('+1 (###) ###-#####'));  // e.g., "+1 (123) 612-3456"
 * console.log('id:', faker.id(100));                    // e.g., 23 (number between 0 and max)
 *
 * // Text Generation
 * console.log('sentence:', faker.sentence());        // e.g., "Random sentence"
 * console.log('paragraph:', faker.paragraph());      // e.g., "Random paragraph"
 * console.log('text:', faker.text());                // e.g., "Random text"
 * ```
 *
 * Each method is designed to return a value in a realistic format for testing purposes, with variations to simulate real-world data.
 */
export class Faker {
  /**
   * A list of product categories commonly used in e-commerce.
   *
   * This array includes a variety of categories that can be used for product classification
   * in an online store or shopping platform.
   */
  private categories = [
    'Electronics',
    'Clothing',
    'Home',
    'Books',
    'Furniture',
    'Beauty',
    'Sports',
    'Toys',
    'Jewelry',
    'Auto',
    'Health',
    'Grocery',
    'Pets',
    'Office',
    'Gym',
    'Garden',
    'Kitchen',
    'Footwear',
    'Accessories',
    'Crafts',
    'Fashion',
    'Music',
    'Games',
    'Decor',
    'Fitness',
    'Travel',
    'Baby',
    'Phones',
    'Computers',
    'Watches',
    'Art',
    'Camping',
    'Cleaning',
    'Party',
    'Snacks',
    'Digital',
    'Parenting',
    'Relationships',
    'Safety',
    'Gifts',
    'Nature',
    'Education',
    'Luxury',
    'Wellness',
    'Tech',
  ];

  /**
   * An object mapping countries to their respective major cities.
   *
   * This object contains key-value pairs where the key is a country name and the value is an array
   * of strings representing major cities in that country. It can be used for location selection in
   * applications related to travel, e-commerce, or demographic data.
   *
   */
  private locations: Record<string, string[]> = {
    'United States': ['New York', 'Los Angeles', 'Chicago'],
    Canada: ['Toronto', 'Vancouver', 'Montreal'],
    'United Kingdom': ['London', 'Birmingham', 'Manchester'],
    Germany: ['Berlin', 'Munich', 'Hamburg'],
    France: ['Paris', 'Marseille', 'Lyon'],
    Japan: ['Tokyo', 'Osaka', 'Kyoto'],
    Australia: ['Sydney', 'Melbourne', 'Brisbane'],
    India: ['Mumbai', 'Delhi', 'Bengaluru'],
    Brazil: ['São Paulo', 'Rio de Janeiro', 'Salvador'],
    Mexico: ['Mexico City', 'Guadalajara', 'Monterrey'],
    Italy: ['Rome', 'Milan', 'Florence'],
    Spain: ['Madrid', 'Barcelona', 'Valencia'],
    'South Africa': ['Johannesburg', 'Cape Town', 'Durban'],
    Russia: ['Moscow', 'Saint Petersburg', 'Novosibirsk'],
    China: ['Beijing', 'Shanghai', 'Shenzhen'],
  };

  /**
   * An object providing various methods for generating random values.
   *
   * This object contains methods that generate random numbers, select random items from an array,
   * and generate random characters. It is used throughout the class to create various random values
   * needed for data generation.
   *
   */
  public random: Random = {
    between: randomBetween,
    index: randomIndex,
    select: randomSelect,
    char: randomChar,
  };

  /**
   * Get a random first name.
   *
   * @returns A randomly selected first name as a string.
   */
  public firstName(): string {
    return this.random.select([
      'John',
      'Robert',
      'James',
      'Michael',
      'William',
      'David',
      'Richard',
      'Joseph',
      'Charles',
      'Thomas',
      'Margaret',
      'Lisa',
      'Betty',
      'Helen',
      'Sandra',
      'Ashley',
      'Dorothy',
      'Kimberly',
      'Emily',
      'Donna',
    ]);
  }

  /**
   * Get a random last name.
   *
   * @returns A randomly selected last name as a string.
   */
  public lastName(): string {
    return this.random.select([
      'Smith',
      'Johnson',
      'Williams',
      'Jones',
      'Brown',
      'Davis',
      'Miller',
      'Wilson',
      'Moore',
      'Taylor',
      'Anderson',
      'Thomas',
      'Jackson',
      'White',
      'Harris',
      'Martin',
      'Thompson',
      'Garcia',
      'Martinez',
      'Robinson',
      'Clark',
    ]);
  }

  /**
   * Get a random full name.
   *
   * @returns A string representing a randomly generated full name.
   */
  public name(): string {
    return `${this.firstName()} ${this.lastName()}`;
  }

  /**
   * Get a random unique username.
   *
   * @returns A string representing a randomly generated username.
   */
  public username(): string {
    const first = this.firstName().toLowerCase();
    const last = this.lastName().toLowerCase();
    const number = this.random.between(1, 9999);

    return `${first}${last}${number}`;
  }

  /**
   * Get a random email address.
   *
   * @returns A string representing a randomly generated email address.
   */
  public email(): string {
    const first = this.firstName().toLowerCase();
    const last = this.lastName().toLowerCase();
    const number = this.random.between(0, 1000);
    const domain = this.random.select([
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'icloud.com',
      'mail.com',
      'zoho.com',
    ]);

    return `${first}${last}${number}@${domain}`;
  }

  /**
   * Get a random Gmail address.
   *
   * @returns A string representing a randomly generated Gmail address.
   */
  public gmail(): string {
    const number = this.random.between(0, 1000);

    return `${this.firstName()}${this.lastName()}${number}@gmail.com`;
  }

  /**
   * Get a random password of the specified length.
   *
   * @param length The desired length of the password. Defaults to 8 if not provided or invalid.
   * @returns A string representing a randomly generated password.
   */
  public password(length: number = 8): string {
    length = isInt(length) && length > 0 ? length : 8;

    let password = '';

    while (password.length < length) {
      password += this.random.char();
    }

    return password;
  }

  /**
   * Get a random continent name.
   *
   * @returns A string representing a random continent name.
   */
  public continent(): string {
    return this.random.select([
      'Africa',
      'Antarctica',
      'Asia',
      'Europe',
      'North America',
      'Australia',
      'South America',
    ]);
  }

  /**
   * Get a random country name.
   *
   * @returns A string representing a randomly country name.
   */
  public country(): string {
    return this.random.select(Object.keys(this.locations));
  }

  /**
   * Get a random city name.
   *
   * @returns A string representing a random city name.
   */
  public city(): string {
    return this.random.select(this.locations[this.country()]);
  }

  /**
   * Get a random street name.
   *
   * @returns A string representing a randomly generated street name.
   */
  public street(): string {
    const prefix = this.random.select([
      'River',
      'Hill',
      'Lake',
      'Sunset',
      'Forest',
      'Valley',
      'Holly',
    ]);

    const suffix = this.random.select([
      'Street',
      'Boulevard',
      'Road',
      'Drive',
      'Place',
      'Way',
    ]);

    return `${prefix} ${suffix}`;
  }

  /**
   * Get a random address.
   *
   * @returns A string representing a randomly generated address in the format "number street, city, country".
   */
  public address(): string {
    const number = this.random.between(1, 1000);
    const country = this.country();
    const city = this.random.select(this.locations[country]);
    const street = this.street();

    return `${number} ${street}, ${city}, ${country}`;
  }

  /**
   * Get a randomly generated, varied sentence with a mix of structures.
   *
   * @returns A string representing a randomly generated sentence with simple language.
   */
  public sentence(): string {
    const subjects = [
      'The child',
      'She',
      'He',
      'The artist',
      'The teacher',
      'A friend',
      'The cat',
      'The hero',
      'The traveler',
      'The farmer',
      'The old man',
      'The young girl',
      'The scientist',
      'The baker',
      'The musician',
      'The doctor',
      'The writer',
      'The mother',
      'The father',
      'The little boy',
      'The dog',
    ];

    const verbs = [
      'finds',
      'makes',
      'shares',
      'sees',
      'knows',
      'loves',
      'remembers',
      'builds',
      'enjoys',
      'dreams of',
    ];

    const adjectives = [
      'quiet',
      'good',
      'happy',
      'new',
      'bright',
      'calm',
      'nice',
      'small',
      'big',
      'warm',
      'fresh',
      'clear',
    ];

    const objects = [
      'path',
      'story',
      'sunset',
      'garden',
      'world',
      'house',
      'day',
      'place',
      'moment',
      'plan',
      'view',
      'sky',
      'forest',
      'beach',
      'mountain',
      'field',
      'river',
      'town',
      'village',
      'school',
      'lake',
    ];

    const prepositions = [
      'near',
      'with',
      'in',
      'by',
      'at',
      'on',
      'under',
      'around',
      'inside',
    ];

    const additionalPhrases = [
      'the ocean',
      'a quiet town',
      'a good friend',
      'the bright sky',
      'the open field',
      'the warm sun',
      'the clear water',
      'the small village',
      'the big mountain',
      'the cool breeze',
      'the calm lake',
      'the green trees',
      'the river bend',
      'the sandy shore',
      'a friendly smile',
      'the soft grass',
    ];

    const structure = this.random.select([
      `${this.random.select(subjects)} ${this.random.select(
        verbs
      )} a ${this.random.select(adjectives)} ${this.random.select(
        objects
      )} ${this.random.select(prepositions)} ${this.random.select(
        additionalPhrases
      )}.`,

      `A ${this.random.select(adjectives)} ${this.random.select(
        objects
      )} ${this.random.select(prepositions)} ${this.random.select(
        additionalPhrases
      )}.`,

      `${this.random.select(adjectives)} ${this.random.select(
        objects
      )} ${this.random.select(prepositions)} ${this.random.select(
        additionalPhrases
      )} feels peaceful.`,

      `A ${this.random.select(adjectives)} day ends ${this.random.select(
        prepositions
      )} ${this.random.select(additionalPhrases)}.`,

      `${this.random.select(subjects)} enjoys the ${this.random.select(
        adjectives
      )} ${this.random.select(objects)} ${this.random.select(
        prepositions
      )} ${this.random.select(additionalPhrases)}, taking it all in.`,

      `${this.random.select(subjects)} finds peace ${this.random.select(
        prepositions
      )} ${this.random.select(adjectives)} ${this.random.select(
        objects
      )} ${this.random.select(prepositions)} ${this.random.select(
        additionalPhrases
      )}.`,

      `The ${this.random.select(objects)} is ${this.random.select(
        adjectives
      )}, ${this.random.select(prepositions)} ${this.random.select(
        additionalPhrases
      )}.`,
    ]);

    return structure;
  }

  /**
   * Get a random paragraph composed of the specified number of sentences.
   *
   * @param sentences Optional number of sentences to include in the paragraph. If not provided, a random number between 5 and 15 will be used.
   * @returns A string representing a randomly generated paragraph.
   */
  public paragraph(sentences?: number): string {
    if (isUndefined(sentences) || !(isInt(sentences) && sentences > 0)) {
      sentences = this.random.between(5, 15);
    }

    const randomSentences = [];

    while (randomSentences.length < sentences) {
      randomSentences.push(this.sentence());
    }

    return randomSentences.join(' ');
  }

  /**
   * Get a random text composed of the specified number of paragraphs.
   *
   * @param paras Optional number of paragraphs to include in the text. If not provided, a random number between 3 and 7 will be used.
   * @returns A string representing a randomly generated text consisting of multiple paragraphs.
   */
  public text(paras?: number): string {
    if (isUndefined(paras) || !(isInt(paras) && paras > 0)) {
      paras = this.random.between(3, 7);
    }

    const randomParas = [];

    while (randomParas.length < paras) {
      randomParas.push(this.paragraph());
    }

    return randomParas.join('\n\n');
  }

  /**
   * Get a random ID number between 1 and a specified maximum value.
   *
   * @param max The maximum value for the ID. Defaults to 10 if not provided or invalid.
   * @returns A random integer ID between 1 and the specified maximum.
   */
  public id(max: number = 10): number {
    max = isInt(max) && max > 0 ? max : 10;
    return this.random.between(1, max);
  }

  /**
   * Generates a Lorem Ipsum text with the specified length.
   *
   * @param length The desired length of the Lorem Ipsum text.
   * @returns A string of Lorem Ipsum text with the specified length.
   *
   */
  public lorem(length: number = 500): string {
    length = isInt(length) && length > 0 ? length : 500;

    const lorem = [
      'Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    ];

    let result = 'Lorem ipsum dolor sit amet,';

    while (result.length < length) {
      result += this.random.select(lorem);
    }

    return result.slice(0, length);
  }

  /**
   * Get a random price between the specified minimum and maximum values.
   *
   * @param min The minimum price value. Defaults to 5 if not provided or invalid.
   * @param max The maximum price value. Defaults to 1000 if not provided or invalid.
   * @param places The number of decimal places for the price. Defaults to 2 if not provided or invalid.
   * @returns A random price as a floating-point number.
   */
  public price(
    min: number = 5,
    max: number = 1000,
    places: number = 2
  ): number {
    min = isInt(min) && min > 0 ? min : 5;
    max = isInt(max) && max > 0 ? max : 1000;
    places = isInt(places) && places > 0 ? places : 2;

    const integer = this.random.between(min, max);
    const decimal = this.random.between(0, Number('9'.repeat(places)));

    return Number(`${integer}.${decimal}`);
  }

  /**
   * Get a random unique category name, ensuring each category is only used once.
   *
   * @throws `FakerError` If all categories have been used after 45 executions.
   * @returns A string representing a randomly selected category.
   * @note This method provides up to 45 unique category names!
   */
  public category(): string {
    if (this.categories.length === 0) {
      throw new FakerError('All categories have been used');
    }

    const index = this.random.index(this.categories);
    const category = this.categories[index];

    this.categories.splice(index, 1);

    return category;
  }

  /**
   * Get a random phone number.
   *
   * This method generates a phone number based on the specified format or a random format if none is provided.
   *
   * @param format Optional format string. If not provided, a random format will be used.
   * @returns A string representing a randomly generated phone number.
   */
  public phone(format?: string): string {
    const formats = ['(###) ###-####', '###-###-####', '###.###.####'];
    format = isStr(format) ? format : this.random.select(formats);
    return format.replace(/#/g, () => String(this.random.between(0, 9)));
  }

  /**
   * Get a random ZIP code.
   *
   * @param format Optional format string. Defaults to '#####'.
   * @returns A string representing a randomly generated ZIP code in the specified format.
   */
  public zip(format: string = '#####'): string {
    format = isStr(format) ? format : '#####';
    return format.replace(/#/g, () => String(this.random.between(0, 9)));
  }

  /**
   * Get a random date formatted according to the specified format.
   *
   * @param format The format string for the date. Defaults to 'YYYY-MM-DD' if not provided.
   * @returns A string representing a randomly generated date.
   */
  public date(format: string = 'YYYY-MM-DD'): string {
    format = isStr(format) ? format : 'YYYY-MM-DD';

    const year = this.random.between(1990, new Date().getFullYear());
    const month = this.random.between(1, 12); // Months are 1-12
    const day = this.random.between(1, 28); // Simplified, could adjust for month length

    return formatDate(year, month, day, format);
  }

  /**
   * Get a random time formatted according to the specified format.
   *
   * @param format The format string for the time. Defaults to 'hh:mm:ss' if not provided.
   * @returns A string representing a randomly generated time.
   */
  public time(format: string = 'hh:mm:ss'): string {
    format = isStr(format) ? format : 'hh:mm:ss';

    const hours = this.random.between(0, 23);
    const minutes = this.random.between(0, 59);
    const seconds = this.random.between(0, 59);

    return formatTime(hours, minutes, seconds, format);
  }

  /**
   * Get a random datetime string.
   *
   * @param date Optional format string for the date. If not provided, defaults to 'YYYY-MM-DD'.
   * @param time Optional format string for the time. If not provided, defaults to 'hh:mm:ss'.
   * @returns A string representing a randomly generated datetime.
   */
  public datetime(date?: string, time?: string): string {
    const datePart = this.date(date);
    const timePart = this.time(time);

    return `${datePart} ${timePart}`;
  }

  /**
   * Get a random binary value of 0 or 1.
   *
   * @returns Either 0 or 1.
   */
  public boolean(): 0 | 1 {
    return this.random.between(0, 1) as 0 | 1;
  }

  /**
   * Get a random credit card number formatted according to the specified format.
   *
   * @param format The format string for the card number. Defaults to '#### #### #### ####' if not provided.
   * @returns A string representing a randomly generated credit card number.
   */
  public card(format: string = '#### #### #### ####'): string {
    format = isStr(format) ? format : '#### #### #### ####';
    return format.replace(/#/g, () => String(this.random.between(0, 9)));
  }

  /**
   * Get a random IPv4 address.
   *
   * @returns A string representing a randomly generated IPv4 address.
   */
  public ipv4(): string {
    return Array.from({ length: 4 }, () => this.random.between(0, 255)).join(
      '.'
    );
  }

  /**
   * Generate a random IPv6 address.
   *
   * @returns A string representing a randomly generated IPv6 address.
   */
  public ipv6(): string {
    return Array.from({ length: 8 }, () =>
      this.random.between(0, 0xffff).toString(16).padStart(4, '0')
    ).join(':');
  }

  /**
   * Generate a random product name.
   *
   * @returns A string representing a randomly generated product name.
   */
  public product(): string {
    const descriptors = ['Advanced', 'Pro', 'Eco', 'Premium', 'New'];
    const items = [
      // Electronics
      'Laptop',
      'Phone',
      'Tablet',
      'Headphones',
      'Smartwatch',

      // Home Goods
      'Sofa',
      'Chair',
      'Table',
      'Lamp',
      'Bed',

      // Fashion
      'T-Shirt',
      'Jeans',
      'Jacket',
      'Shoes',
      'Hat',

      // Health & Beauty
      'Shampoo',
      'Perfume',
      'Vitamins',
      'Makeup',

      // Sports
      'Bicycle',
      'Tennis Racket',
      'Yoga Mat',
      'Dumbbells',
      'Soccer Ball',
    ];

    return `${this.random.select(descriptors)} ${this.random.select(items)}`;
  }

  /**
   * Generate a random SKU (Stock Keeping Unit) in the format "###-###-###".
   *
   * @returns A string representing a randomly generated SKU.
   */
  public sku(): string {
    const format = '###-###-###';
    return format.replace(/#/g, () => String(this.random.between(0, 9)));
  }

  /**
   * Generate a random domain name.
   *
   * @returns A string representing a randomly selected domain name.
   */
  public domain(): string {
    return this.random.select([
      'example.com',
      'site.org',
      'shop.net',
      'news.io',
      'service.co',
      'tech.dev',
      'portfolio.biz',
      'store.info',
      'blog.co',
      'media.org',
    ]);
  }

  /**
   * Generate a random URL path.
   *
   * @returns A string representing a randomly generated URL path.
   */
  public path(): string {
    const categories = [
      'blog',
      'news',
      'products',
      'services',
      'about',
      'contact',
      'portfolio',
    ];

    const items = [
      'introduction',
      'pricing',
      'features',
      'reviews',
      'latest-updates',
      'how-it-works',
      'team',
      'terms-of-service',
      'privacy-policy',
    ];

    return `${this.random.select(categories)}/${this.random.select(items)}`;
  }

  /**
   * Generate a random URL with a protocol, domain, and path.
   *
   * @returns A string representing a randomly generated URL.
   */
  public url(): string {
    const protocol = this.random.select(['http', 'https']);
    const domain = this.domain();
    const path = this.path();
    return `${protocol}://${domain}/${path}`;
  }

  /**
   * Generate a random job title.
   *
   * @returns A string representing a randomly selected job title.
   */
  public job(): string {
    return this.random.select([
      'Software Engineer',
      'Product Manager',
      'Data Scientist',
      'Web Developer',
      'Graphic Designer',
      'Marketing Specialist',
      'Sales Executive',
      'System Analyst',
      'UX/UI Designer',
      'DevOps Engineer',
    ]);
  }

  /**
   * Generate a random company name.
   *
   * @returns A string representing a randomly generated company name.
   */
  public company(): string {
    const prefix = [
      'Global',
      'Dynamic',
      'Secure',
      'Innovative',
      'Prime',
      'NextGen',
    ];

    const suffix = [
      'Solutions',
      'Technologies',
      'Enterprises',
      'Corporation',
      'Services',
      'Systems',
    ];

    return `${this.random.select(prefix)} ${this.random.select(suffix)}`;
  }
}

export class MixerError extends Error {}

/**
 * Mixer allows you to generate unique combinations of data across multiple keys.
 * Supports both combinatorial data (via `.set()`) and static fields (via `.with()`).
 */
export class Mixer {
  private sets: Record<string, any[]> = {};
  private statics: Record<string, any | (() => any)> = {};
  private usedCombinations = new Set<string>();
  private keys: string[] = [];
  private combinations: string[][] = [];
  private exhausted = false;

  /**
   * Registers a key with a list of possible values to be combined with others.
   * Recomputes the Cartesian product of all `.set()` values.
   *
   * @param key - The field name to register.
   * @param values - An array of values for this key.
   * @returns This mixer instance (chainable).
   */
  public set(key: string, values: any[]): this {
    if (!Array.isArray(values)) {
      throw new MixerError(`.set("${key}") expects an array of values`);
    }

    this.sets[key] = values;
    this.recompute();
    return this;
  }

  /**
   * Adds a static field that will be merged into every generated combination.
   * Can be a value or a callback returning a value.
   *
   * @param key - The static field name.
   * @param value - A value or function returning a value.
   * @returns This mixer instance (chainable).
   */
  public with(key: string, value: any | (() => any)): this {
    this.statics[key] = value;
    return this;
  }

  /**
   * Returns the next unused combination of values as a record.
   * Also merges static fields.
   *
   * @throws If all combinations are exhausted.
   */
  public get<T extends Record<string, any> = Record<string, any>>(): T {
    if (this.exhausted) {
      throw new MixerError('All unique combinations have been exhausted.');
    }

    for (const combo of this.combinations) {
      const signature = combo.join('|');

      if (!this.usedCombinations.has(signature)) {
        this.usedCombinations.add(signature);

        const result: Record<string, any> = {};

        // Set values from combinations
        combo.forEach((value, i) => {
          result[this.keys[i]] = this.cast(value);
        });

        // Set static fields
        for (const [key, value] of Object.entries(this.statics)) {
          result[key] = this.cast(value);
        }

        return result as T;
      }
    }

    this.exhausted = true;
    throw new MixerError('All unique combinations have been exhausted.');
  }

  /**
   * Returns a single value from a single-key `.set()` mixer.
   * Useful for quick value extraction.
   *
   * @param key - The key to extract from the generated combination.
   * @throws If multiple keys were registered with `.set()` or if the key is missing.
   */
  public pick(key: string): any {
    if (this.keys.length !== 1) {
      throw new MixerError(`.pick("${key}") requires exactly one .set() key`);
    }

    const row = this.get();

    if (!(key in row)) {
      throw new MixerError(`Key "${key}" not found in generated row`);
    }

    return row[key];
  }

  /**
   * Returns true if there are unused combinations left to generate.
   */
  public ready(): boolean {
    return this.usedCombinations.size < this.combinations.length;
  }

  /**
   * Returns the total number of possible unique combinations.
   */
  public size(): number {
    return this.combinations.length;
  }

  private cast(value: any): any {
    return typeof value === 'function' ? value() : value;
  }

  private recompute(): void {
    this.keys = Object.keys(this.sets);
    const valueArrays = this.keys.map((key) => this.sets[key]);

    this.combinations = this.cartesian(valueArrays);
    this.usedCombinations.clear();
    this.exhausted = false;
  }

  private cartesian(arrays: any[][]): string[][] {
    return arrays.reduce<string[][]>(
      (acc, curr) => acc.flatMap((a) => curr.map((v) => [...a, v])),
      [[]]
    );
  }
}

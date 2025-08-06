import { ValidatorError } from '../../errors';
import { ValidationMessages } from './Messages';
import { format, isArr, isInt, isObj, isStr, toSize } from '../../helpers';

export class File {
  private messages: ValidationMessages;

  private state = {
    name: null,
    options: {
      count: null,
      size: { min: null, max: null },
      type: [],
      required: null,
      location: null,
      messages: {
        count: null,
        type: null,
        size: { min: null, max: null },
        required: null,
      },
    },
  };

  /**
   * Creates a new File validator for a given field name.
   *
   * @param name The name of the file input field.
   * @param messages An object containing validation messages templates.
   */
  constructor(name: string, messages: ValidationMessages) {
    if (!isStr(name)) {
      throw new ValidatorError(`Invalid file name: ${String(name)}`);
    }

    if (!isObj(messages)) {
      throw new ValidatorError(`Invalid messages: ${String(messages)}`);
    }

    this.state.name = name;
    this.messages = messages;
  }

  /**
   * Sets the exact number of files allowed.
   *
   * @param count Required number of files.
   * @param message Optional custom error message.
   * @returns The File instance for chaining.
   */
  public count(count: number, message?: string): this {
    this.state.options.count = count;
    this.state.options.messages.count =
      message ??
      format(this.messages.file.count, { field: this.state.name, count });
    return this;
  }

  /**
   * Sets minimum and/or maximum file size limits in bytes.
   *
   * @param min Minimum file size allowed.
   * @param max Maximum file size allowed.
   * @param messages Optional custom error messages for min and max size.
   * @returns The File instance for chaining.
   */
  size(
    min?: number,
    max?: number,
    messages?: { min?: string; max?: string }
  ): this {
    const hasMin = isInt(min);
    const hasMax = isInt(max);

    // If neither min nor max is provided, default to [0, Number.MAX_SAFE_INTEGER]
    if (!hasMin && !hasMax) {
      min = 0;
      max = Number.MAX_SAFE_INTEGER;
    }

    // If only min is provided, treat it as max and default min to 0
    if (!hasMax && hasMin) {
      max = min;
      min = 0;
    }

    // If only max is provided, default min to 0
    if (!hasMin && hasMax) {
      min = 0;
    }

    this.state.options.size.min = min;
    this.state.options.size.max = max;

    this.state.options.messages.size.min =
      messages?.min ??
      format(this.messages.file.minSize, {
        field: this.state.name,
        min: toSize(min),
      });

    this.state.options.messages.size.max =
      messages?.max ??
      format(this.messages.file.maxSize, {
        field: this.state.name,
        max: toSize(max),
      });

    return this;
  }

  /**
   * Specifies allowed MIME types.
   *
   * @param types Single or multiple allowed file types.
   * @param message Optional custom error message.
   * @returns The File instance for chaining.
   */
  type(types: string | string[], message?: string): this {
    if (!isArr(types)) this.state.options.type = [types];
    else this.state.options.type = types;

    this.state.options.messages.type =
      message ??
      format(this.messages.file.type, {
        field: this.state.name,
        types: isArr(types) ? types.join(', ') : types,
      });

    return this;
  }

  /**
   * Marks the file field as required.
   *
   * @param required Whether the file is required (default: true).
   * @param message Optional custom error message.
   * @returns The File instance for chaining.
   */
  required(message?: string): this {
    this.state.options.required = true;
    this.state.options.messages.required =
      message ?? format(this.messages.required, { field: this.state.name });
    return this;
  }

  /**
   * Sets a custom storage location/path for uploaded files.
   *
   * @param path Directory path where files should be saved.
   * @returns The File instance for chaining.
   */
  location(path: string): this {
    this.state.options.location = path;
    return this;
  }
}

import { readFile } from 'fs/promises';
import { basename, isAbsolute, resolve as resolver, sep } from 'path';

import { Binary, Operand, Unary } from './Condition';
import { Reference } from './Reference';
import { Scalar } from './Scalar';
import { Global } from './Global';
import { Tool } from './Tool';
import { Locals } from './statements/Render';
import { parseTokens } from './Parser';
import { config, AppOptions } from '../../config';

import {
  ComponentParser,
  Node,
  IfNode,
  ForEachNode,
  IncludeNode,
  PlaceNode,
  ReplaceNode,
} from './ComponentParser';

import {
  hasKey,
  isArr,
  isBracketExp,
  isDefined,
  isNull,
  isObj,
  isStr,
  isUndefined,
  isPromise,
  warn,
} from '../../helpers';

/**
 * Asynchronously finds the first item in an array that satisfies the given finder function.
 *
 * @param  items - The array of items to search through.
 * @param  finder - An async function that returns a promise resolving to `true` if the item satisfies the condition.
 * @param index - The starting index for the search. Defaults to 0.
 *
 * @returns A promise that resolves to the first item that satisfies the finder function.
 */
function find<T>(
  items: Array<T>,
  finder: (item: T) => Promise<boolean>,
  index = 0
): Promise<undefined | T> {
  return new Promise((resolve, reject) => {
    if (items === undefined) return resolve(undefined);
    if (index >= items.length) return resolve(undefined);

    const item = items[index];

    finder(item)
      .then((r) => {
        if (r) return resolve(item);
        find(items, finder, index + 1) // Next
          .then(resolve)
          .catch(reject);
      })
      .catch(reject);
  });
}

/**
 * Cleans unwanted extra whitespace and consecutive newlines from a template.
 *
 * @param template - The input string to be cleaned.
 *
 * @returns A cleaned string with unwanted characters removed, preserving single newlines.
 */
function clean(template: string): string {
  return template
    .split('\n') // Split into lines for better control
    .map((line) => line.trim()) // Remove trailing spaces on each line
    .filter((line) => line !== '') // Remove completely blank lines
    .join('\n'); // Rejoin into a single string
}

/**
 * Resolves the absolute path of a component file based on a dot notation path.
 *
 * @param notation - The dot notation path of the component (e.g., `buttons.active`).
 * @returns - The absolute path of the component (e.g., `/absolute/path/to/buttons/active.fx`).
 */
function resolvePath(notation: string): string {
  const path = notation.split('.').join(sep).concat('.fx');
  const root = config().loadSync<AppOptions>().paths.views;

  if (isAbsolute(root)) return resolver(root, path);
  return resolver(config().resolveSync(), root, path);
}

/**
 * Renders a `Flex` component from the given path with optional locals and replacements.
 *
 * @param path - The file path to the `Flex` component to be rendered.
 * @param locals - An optional object containing local variables to be passed to the component.
 * @param replacements - An optional object containing replacements to be applied during rendering.
 *
 * @returns A promise that resolves to the rendered string output of the `Flex` component.
 */
export function render(
  path: string,
  locals?: Record<string, any>,
  replacements?: Record<string, string>
): Promise<string> {
  return new Promise((resolve, reject) => {
    new Component(path, locals, replacements)
      .render()
      .then(resolve)
      .catch(reject);
  });
}

/**
 * Represents an error specific to the `Component` class or rendering process.
 */
export class ComponentError extends Error {}

type CacheComponent = { template?: string; nodes?: Node[]; layout?: string };

/**
 * Represents a Flex (.fx) component to be rendered, with optional locals and string replacements.
 */
export class Component {
  /**
   * The name of the component (derived from the path).
   */
  private name: string;

  /**
   * The file path to the component.
   */
  private path: string;

  /**
   * Optional local variables to be passed to the component.
   */
  private locals?: Record<string, any>;

  /**
   * Optional string replacements to be applied during rendering.
   */
  private replacements?: Record<string, string>;

  // Configuration file
  private config = config().loadSync();

  // Component templates cache
  private static cache?: Record<string, CacheComponent> = {};

  /**
   * Creates an instance of the `Component` class.
   *
   * @param path - The file path to the `Flex` component.
   * @param locals - An optional object containing local variables.
   * @param replacements - An optional object containing string replacements.
   *
   * @throws `ComponentError` If the path is invalid, or if locals or replacements are not objects.
   */
  constructor(
    path: string,
    locals?: Record<string, any>,
    replacements?: Record<string, string>
  ) {
    if (!isStr(path)) {
      throw new ComponentError(`Invalid component path: ${path}`);
    }

    if (isDefined(locals) && !isObj(locals)) {
      throw new ComponentError(`Invalid locals: ${locals}`);
    }

    if (isDefined(replacements) && !isObj(replacements)) {
      throw new ComponentError(`Invalid replacements: ${replacements}`);
    }

    this.path = path;
    this.locals = locals;
    this.replacements = replacements;
  }

  /**
   * Safely resolves a value from a nested object structure using a dot-notation or bracket-notation path.
   *
   * @param value - The base object from which to resolve the value.
   * @param path - The string path to the desired property, using dot-notation or bracket-notation.
   * @param line - The line number in the component where this method is called (used for error reporting).
   *
   * @returns The resolved value from the object at the specified path.
   * @throws `ComponentError` If the path attempts to access properties of `undefined` or `null` at any level.
   */
  private find(value: object, path: string, line: number): any {
    path
      .split('.')
      .filter((item) => item.trim() !== '')
      .forEach((exp) => {
        if (isUndefined(value)) {
          if (this.config.env === 'dev') {
            warn(
              `Heads up: '${exp}' was accessed, but its parent is undefined.`,
              {
                reason: `'${exp}' cannot be read because the parent object is undefined.`,
                context: `${resolvePath(this.path)}:${line}`,
                note: 'This is usually safe if optional chaining is intended.',
              },
              'ComponentInfo'
            );
          }

          return undefined;
        }

        if (isNull(value)) {
          if (this.config.env === 'dev') {
            warn(
              `Heads up: '${exp}' was accessed, but its parent is null.`,
              {
                reason: `'${exp}' cannot be read because the parent object is null.`,
                context: `${resolvePath(this.path)}:${line}`,
                note: 'This is usually safe if optional chaining is intended.',
              },
              'ComponentInfo'
            );
          }

          return null;
        }

        if (isBracketExp(exp)) {
          const indexes = parseTokens(exp, /[\[\]]/g);

          value = value[indexes.shift()];

          indexes.forEach((index) => {
            if (isUndefined(value)) {
              if (this.config.env === 'dev') {
                warn(
                  `Heads up: index [${index}] was accessed, but its parent is undefined.`,
                  {
                    reason: `Cannot read index [${index}] because the parent is undefined.`,
                    context: `${resolvePath(this.path)}:${line}`,
                    note: 'Usually harmless if optional chaining is expected.',
                  },
                  'ComponentInfo'
                );
              }

              return undefined;
            }

            if (isNull(value)) {
              if (this.config.env === 'dev') {
                warn(
                  `Heads up: index [${index}] was accessed, but its parent is null.`,
                  {
                    reason: `Cannot read index [${index}] because the parent is null.`,
                    context: `${resolvePath(this.path)}:${line}`,
                    note: 'Usually harmless if optional chaining is expected.',
                  },
                  'ComponentInfo'
                );
              }

              return null;
            }

            value = value[Number(index)];
          });

          return;
        }

        value = value[exp];
      });

    return value;
  }

  /**
   * Resolves the value of a global reference from the configuration.
   *
   * @param global - An object containing details about the global reference.
   *
   * @returns The resolved global value from the configuration.
   * @throws `ComponentError` If the global reference is undefined in the configuration.
   */
  private findGlobal(global: Global): any {
    const key = global.key;
    const path = global.path ? global.path : '';
    const globals = this.config.globals;

    if (!hasKey(globals, key)) {
      throw new ComponentError(
        `Undefined global reference '${global.key}' in '${global.name}' at line number ${global.line}`
      );
    }

    return this.find(globals, key.concat(path), global.line);
  }

  /**
   * Resolves a tool reference from the configuration.
   *
   * @param tool - An object containing details about the tool reference.
   *
   * @returns The resolved tool function from the configuration.
   * @throws `ComponentError` If the tool reference is undefined in the configuration.
   */
  private findTool(tool: Tool): Function {
    const key = tool.key;
    const tools = this.config.tools;

    if (!hasKey(tools, key)) {
      throw new ComponentError(
        `Undefined tool reference '${tool.key}' in '${tool.name}' at line number ${tool.line}`
      );
    }

    return tools[key];
  }

  /**
   * Evaluates a given argument, resolving its value based on its type (Tool, Scalar, Global, or Reference).
   *
   * @param value - The argument to evaluate.
   * @param scopes - An array of objects representing variable scopes to search for references.
   *
   * @returns A promise that resolves to the evaluated value.
   * @throws `ComponentError` if a reference is undefined or a tool execution fails.
   */
  private evalArgument(
    value: Tool | Scalar | Global | Reference,
    scopes: Array<object>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (value instanceof Scalar) return resolve(value.value);

      if (value instanceof Global) return resolve(this.findGlobal(value));

      if (value instanceof Tool) {
        const args = value.args
          ? value.args.map((arg) => this.evalArgument(arg, scopes))
          : [];

        return Promise.all(args)
          .then((args) => {
            const tool = this.findTool(value);
            const result = tool(...args);

            if (isPromise(result)) {
              return result
                .then((v: any) => {
                  if (value.path) resolve(this.find(v, value.path, value.line));
                  else resolve(v);
                })
                .catch(reject);
            }

            if (value.path) resolve(this.find(result, value.path, value.line));
            else resolve(result);
          })
          .catch(reject);
      }

      if (value instanceof Reference) {
        const key = value.key;
        const path = value.path ? value.path : '';
        const line = value.line;

        const scope = scopes.find((scope) => hasKey(scope, value.key));

        if (scope) {
          return resolve(this.find(scope, key.concat(path), line));
        }

        if (!hasKey(this.locals, key)) return resolve(undefined);

        return resolve(this.find(this.locals, key.concat(path), line));
      }
    });
  }

  /**
   * Evaluates the local variables provided to a component and resolves their values.
   *
   * @param locals - An array of objects.
   * @param scopes - An array of objects representing variable scopes for resolving references.
   * @param result - An accumulator for resolved local variables.
   * @param index - The current index of the `locals` array being processed.
   *
   * @returns A promise that resolves to an object containing all resolved local variables.
   */
  private evalLocals(
    locals: Locals,
    scopes: Array<object>,
    result: Record<string, any> = {},
    index: number = 0
  ): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      if (!locals) return resolve(undefined);

      if (index >= locals.length) return resolve(result);

      const local = locals[index];

      this.evalArgument(local.value, scopes)
        .then((value) => {
          result[local.key] = value;
          return this.evalLocals(locals, scopes, result, index + 1);
        })
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Evaluates replacement nodes, resolving their dynamic values and assembling the final replacement map.
   *
   * @param replacements - An array of replacement nodes.
   * @param scopes - An array of objects representing variable scopes for resolving references.
   * @param result - An accumulator for resolved replacements.
   * @param index - The current index of the `replacements` array being processed.
   *
   * @returns A promise that resolves to an object containing all resolved replacements.
   */
  private evalReplacements(
    replacements: ReplaceNode[],
    scopes: Array<object>,
    result: Record<string, string> = {},
    index: number = 0
  ): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
      if (!replacements) return resolve(undefined);

      if (index >= replacements.length) return resolve(result);

      const replacement = replacements[index];

      if (!replacement.nodes) {
        result[replacement.key] = replacement.body;
        return this.evalReplacements(replacements, scopes, result, index + 1)
          .then(resolve)
          .catch(reject);
      }

      return this.evalNodes(replacement.nodes, replacement.body, scopes)
        .then((body) => {
          result[replacement.key] = body;
          return this.evalReplacements(replacements, scopes, result, index + 1);
        })
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Evaluates a series of nodes, modifying the body based on the type of each node (e.g., `foreach`, `if`, `render`, etc.).
   * Processes nodes recursively, replacing placeholders with evaluated results.
   *
   * @param nodes - An array of nodes to be evaluated, where each node represents a different operation such as `foreach`, `render`, etc.
   * @param body - The body content in which node placeholders will be replaced with evaluated results.
   * @param scopes - An array of objects representing the variable scopes to resolve references during node evaluation.
   * @param index - The current index of the node being evaluated in the `nodes` array.
   *
   * @returns A promise that resolves with the modified body after all nodes have been evaluated and placeholders replaced.
   */
  private evalNodes(
    nodes: Node[],
    body: string,
    scopes: Array<object>,
    index: number = 0
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (index >= nodes.length) {
        return resolve(body);
      }

      const node = nodes[index];

      if (node.type === 'foreach') {
        return this.evalForEach(node, scopes)
          .then((result) => {
            body = body.replace(node.placeholder, result);
            return this.evalNodes(nodes, body, scopes, index + 1); // Next
          })
          .then(resolve)
          .catch(reject);
      }

      if (node.type === 'if') {
        return this.evalIf(node, scopes)
          .then((result) => {
            body = body.replace(node.placeholder, result);
            return this.evalNodes(nodes, body, scopes, index + 1); // Next
          })
          .then(resolve)
          .catch(reject);
      }

      if (node.type === 'render') {
        this.evalLocals(node.locals, scopes)
          .then((locals) => {
            this.evalReplacements(node.replaceNodes, scopes)
              .then((replacements) => {
                return render(node.path, locals, replacements);
              })
              .then((result) => {
                body = body.replace(node.placeholder, result);
                return this.evalNodes(nodes, body, scopes, index + 1); // Next
              })
              .then(resolve)
              .catch(reject);
          })
          .catch(reject);
      }

      if (node.type === 'include') {
        return this.evalInclude(node)
          .then((result) => {
            body = body.replace(node.placeholder, result);
            return this.evalNodes(nodes, body, scopes, index + 1); // Next
          })
          .then(resolve)
          .catch(reject);
      }

      if (node.type === 'place') {
        return this.evalPlace(node)
          .then((result) => {
            body = body.replace(node.placeholder, result);
            return this.evalNodes(nodes, body, scopes, index + 1); // Next
          })
          .then(resolve)
          .catch(reject);
      }

      if (node.type === 'log') {
        this.evalArgument(node.describer, scopes)
          .then((value) => {
            console.log(value);
            body = body.replace(node.placeholder, '');
            return this.evalNodes(nodes, body, scopes, index + 1); // Next
          })
          .then(resolve)
          .catch(reject);
      }

      if (node.type === 'print') {
        this.evalArgument(node.describer, scopes)
          .then((value) => {
            body = body.replace(node.placeholder, String(value));
            return this.evalNodes(nodes, body, scopes, index + 1); // Next
          })
          .then(resolve)
          .catch(reject);
      }
    });
  }

  /**
   * Resolves a placeholder replacement for a given node.
   *
   * @param node - The placeholder node containing a key for replacement.
   * @returns A promise that resolves with the replacement value for the given key.
   * @throws `ComponentError` if no replacement is found for the specified key.
   */
  private evalPlace(node: PlaceNode): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!hasKey(this.replacements, node.key)) {
        return reject(
          new ComponentError(
            `No replacement found for '${node.key}' in '${resolvePath(
              this.path
            )}:${node.line}'`
          )
        );
      }

      return resolve(this.replacements[node.key]);
    });
  }

  /**
   * Resolves the content of an included component from the file system.
   *
   * @param node - The include node containing the path of the component to include.
   * @returns A promise that resolves with the content of the included component.
   * @throws `ComponentError` if the specified component cannot be found.
   */
  private evalInclude(node: IncludeNode): Promise<string> {
    return new Promise((resolve, reject) => {
      const path = resolvePath(node.path);
      const name = basename(path);

      if (this.config.cache && Component.cache[path]) {
        return resolve(Component.cache[path].template);
      }

      readFile(path, { encoding: 'utf-8' })
        .then((template) => {
          if (this.config.cache) {
            if (!Component.cache[path]) Component.cache[path] = {};
            Component.cache[path].template = template;
          }

          resolve(template);
        })
        .catch((error) => {
          if (error.code !== 'ENOENT') return reject(error);
          reject(
            new ComponentError(
              `Undefined component '${name}' included in '${resolvePath(
                this.path
              )}:${node.line}'`
            )
          );
        });
    });
  }

  /**
   * Evaluates a `foreach` node.
   *
   * @param node - The `foreach` node containing the collection to iterate over, the item name, and optionally the index name and child nodes.
   * @param scopes - An array of objects representing the variable scopes to resolve references during node evaluation.
   *
   * @returns A promise that resolves with the concatenated result of evaluating the body or child nodes for each item in the collection.
   * @throws `ComponentError` if the collection is not an array or any error occurs during the evaluation.
   */
  private evalForEach(
    node: ForEachNode,
    scopes: Array<object>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.evalArgument(node.collection, scopes)
        .then((collection) => {
          const scope = {};

          if (!isArr(collection)) {
            return reject(
              new ComponentError(
                `Invalid collection type in '${resolvePath(this.path)}:${
                  node.line
                }'`
              )
            );
          }

          // Unshift new scope
          scopes.unshift(scope);

          // Process ForEach Nodes
          const process = (index: number = 0, result: Array<string> = []) => {
            return new Promise<string>((resolve, reject) => {
              if (index >= collection.length) {
                return resolve(result.join(''));
              }

              if (!node.nodes) {
                result.push(node.body);
                return process(index + 1, result)
                  .then(resolve)
                  .catch(reject);
              }

              scope[node.item] = collection[index];
              if (node.index) scope[node.index] = index;

              return this.evalNodes(node.nodes, node.body, scopes)
                .then((node) => {
                  result.push(node);
                  return process(index + 1, result)
                    .then(resolve)
                    .catch(reject);
                })
                .catch(reject);
            });
          };

          return process()
            .then((result) => {
              scopes.shift(); // Shift scope
              resolve(result);
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }

  /**
   * Evaluates a unary condition.
   *
   * @param condition - The unary condition to evaluate.
   * @param scopes - The current scope stack used to resolve operands.
   *
   * @returns A promise that resolves to the result of the unary evaluation.
   */
  private evalUnary(condition: Unary, scopes: Array<object>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (condition.operand.type === 'unary') {
        return this.evalUnary(condition.operand, scopes)
          .then((r) => resolve(!r))
          .catch(reject);
      }

      if (condition.operand.type === 'operand') {
        return this.evalArgument(condition.operand.value, scopes)
          .then((r) => resolve(!r))
          .catch(reject);
      }

      if (condition.operand.type === 'binary') {
        return this.evalBinary(condition.operand, scopes)
          .then((r) => resolve(!r))
          .catch(reject);
      }
    });
  }

  /**
   * Evaluates a binary condition.
   *
   * @param condition - The binary condition containing the operator and two operands.
   * @param scopes - The current scope stack used to resolve operands.
   *
   * @returns A promise that resolves to the result of the binary evaluation.
   */
  private evalBinary(
    condition: Binary,
    scopes: Array<object>
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Evaluate the first operand based on parentheses (priority)
      const first = condition.right.paren ? condition.right : condition.left;
      this.evalCondition(first, scopes)
        .then((left) => {
          // Apply short-circuiting for logical operators
          if (condition.operator.type === 'logical') {
            if (condition.operator.sign === '&&' && !left)
              return resolve(false);
            if (condition.operator.sign === '||' && left) return resolve(true);
          }

          // Evaluate the second operand
          this.evalCondition(
            condition.left === first ? condition.right : condition.left,
            scopes
          )
            .then((right) => {
              // Evaluate the operator
              switch (condition.operator.sign) {
                case '&&':
                  return resolve(left && right);
                case '||':
                  return resolve(left || right);
                case '===':
                  return resolve(left === right);
                case '==':
                  return resolve(left == right);
                case '!==':
                  return resolve(left !== right);
                case '!=':
                  return resolve(left != right);
                case '<':
                  return resolve(left < right);
                case '>':
                  return resolve(left > right);
                case '<=':
                  return resolve(left <= right);
                case '>=':
                  return resolve(left >= right);
              }
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }

  /**
   * Evaluates a condition, which can be a unary, binary, or an operand condition, by delegating to the appropriate evaluator.
   *
   * @param condition - The condition to evaluate.
   * @param scopes - The current scope stack used to resolve operands.
   *
   * @returns A promise that resolves to the result of the condition evaluation.
   */
  private evalCondition(
    condition: Binary | Unary | Operand,
    scopes: Array<object>
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (condition.type === 'operand') {
        return resolve(this.evalArgument(condition.value, scopes));
      }

      if (condition.type === 'unary') {
        return resolve(this.evalUnary(condition, scopes));
      }

      if (condition.type === 'binary') {
        return resolve(this.evalBinary(condition, scopes));
      }
    });
  }

  /**
   * Evaluates an `if` node.
   *
   * @param node - The `if` node containing conditions and their corresponding bodies.
   * @param scopes - The current scope stack used to resolve variables and conditions.
   *
   * @returns A promise that resolves to the evaluated body of the matched condition, or an empty string if no condition is met.
   */
  private evalIf(node: IfNode, scopes: Array<object>): Promise<string> {
    return new Promise((resolve, reject) => {
      this.evalCondition(node.if.condition.description, scopes)
        .then((isMet) => {
          if (isMet) {
            if (!node.if.nodes) return resolve(node.if.body);
            return this.evalNodes(node.if.nodes, node.if.body, scopes)
              .then(resolve)
              .catch(reject);
          }

          const finder = (node: any) => {
            return this.evalCondition(node.condition.description, scopes);
          };

          return find(node.elseif, finder)
            .then((elseif) => {
              if (elseif) {
                if (!elseif.nodes) return resolve(elseif.body);
                return this.evalNodes(elseif.nodes, elseif.body, scopes)
                  .then(resolve)
                  .catch(reject);
              }

              if (node.else) {
                if (!node.else.nodes) return resolve(node.else.body);
                return this.evalNodes(node.else.nodes, node.else.body, scopes)
                  .then(resolve)
                  .catch(reject);
              }

              // No condition is met
              return resolve('');
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }

  /**
   * Renders the component.
   *
   * @returns A promise that resolves to the rendered component as a string.
   * @throws Throws an error if the component is not found or another error occurs during rendering.
   */
  public render(): Promise<string> {
    return new Promise((resolve, reject) => {
      const path = resolvePath(this.path);
      this.name = basename(path);

      if (this.config.cache && Component.cache[path]) {
        let nodes: Node[];
        let layout: string;

        if (!Component.cache[path].layout) {
          const parser = new ComponentParser(
            this.name,
            Component.cache[path].template
          );

          Component.cache[path].nodes = parser.nodes;
          Component.cache[path].layout = parser.layout;

          nodes = parser.nodes;
          layout = parser.layout;
        } else {
          nodes = Component.cache[path].nodes;
          layout = Component.cache[path].layout;
        }

        if (!nodes) return resolve(clean(layout));

        return this.evalNodes(nodes, layout, [])
          .then((result) => resolve(clean(result)))
          .catch(reject);
      }

      readFile(path, { encoding: 'utf-8' })
        .then((template) => {
          if (this.config.cache) {
            if (!Component.cache[path]) Component.cache[path] = {};
            Component.cache[path].template = template;
          }

          const { layout, nodes } = new ComponentParser(this.name, template);

          if (this.config.cache) {
            Component.cache[path].nodes = nodes;
            Component.cache[path].layout = layout;
          }

          if (!nodes) return resolve(clean(layout));

          this.evalNodes(nodes, layout, [])
            .then((result) => resolve(clean(result)))
            .catch(reject);
        })
        .catch((error) => {
          if (error.code !== 'ENOENT') return reject(error);
          reject(
            new ComponentError(
              `Undefined component '${resolvePath(this.path)}'`
            )
          );
        });
    });
  }
}

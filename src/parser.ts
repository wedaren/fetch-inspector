import * as acorn from 'acorn';

export type ParsedFetch = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  cookies?: Record<string, string>;
  raw?: any;
};

function astToJs(node: any): any {
  if (!node) return undefined;
  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'ObjectExpression': {
      const obj: Record<string, any> = {};
      for (const prop of node.properties) {
        if (prop.type !== 'Property') throw new Error('Unsupported property type: ' + prop.type);
        let key: string;
        const keyNode = prop.key;
        if (keyNode.type === 'Identifier') key = keyNode.name;
        else if (keyNode.type === 'Literal') key = String(keyNode.value);
        else throw new Error('Unsupported object key type: ' + keyNode.type);
        obj[key] = astToJs(prop.value);
      }
      return obj;
    }
    case 'ArrayExpression':
      return node.elements.map((el: any) => (el ? astToJs(el) : null));
    case 'TemplateLiteral':
      if (node.expressions && node.expressions.length > 0) throw new Error('TemplateLiteral with expressions is not supported.');
      return node.quasis.map((q: any) => q.value.cooked).join('');
    case 'UnaryExpression': {
      const v = astToJs(node.argument);
      switch (node.operator) {
        case '-':
          return -v;
        case '+':
          return +v;
        case '!':
          return !v;
        default:
          throw new Error('Unsupported unary operator: ' + node.operator);
      }
    }
    case 'CallExpression': {
      // support JSON.stringify(obj)
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.object &&
        node.callee.object.name === 'JSON' &&
        node.callee.property &&
        node.callee.property.name === 'stringify'
      ) {
        if (node.arguments.length !== 1) throw new Error('Unsupported JSON.stringify usage');
        const arg = astToJs(node.arguments[0]);
        return JSON.stringify(arg);
      }
      // support Headers({...})
      if (node.callee.type === 'Identifier' && node.callee.name === 'Headers') {
        if (node.arguments.length === 1 && node.arguments[0].type === 'ObjectExpression') {
          return astToJs(node.arguments[0]);
        }
      }
      throw new Error('Unsupported CallExpression: cannot evaluate safely');
    }
    default:
      throw new Error('Unsupported AST node type: ' + node.type);
  }
}

function findFetchCall(ast: any): any {
  let found: any = null;
  function walk(node: any) {
    if (!node || found) return;
    if (Array.isArray(node)) {
      for (const n of node) walk(n);
      return;
    }
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      if (callee.type === 'Identifier' && callee.name === 'fetch') {
        found = node;
        return;
      }
      if (callee.type === 'MemberExpression' && callee.property && callee.property.name === 'fetch') {
        found = node;
        return;
      }
    }
    for (const k of Object.keys(node)) {
      const child = node[k];
      if (child && typeof child === 'object') walk(child);
    }
  }
  walk(ast);
  return found;
}

export function parseFetchSnippet(code: string): ParsedFetch {
  const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' as any }) as any;
  const call = findFetchCall(ast);
  if (!call) throw new Error('No fetch() call found in input');

  const args = call.arguments;
  if (!args || args.length === 0) throw new Error('fetch() call has no arguments');

  const urlNode = args[0];
  let url: string;
  if (urlNode.type === 'Literal') url = urlNode.value;
  else if (urlNode.type === 'TemplateLiteral') {
    if (urlNode.expressions && urlNode.expressions.length > 0) throw new Error('Template literal with expressions not supported for URL');
    url = urlNode.quasis.map((q: any) => q.value.cooked).join('');
  } else throw new Error('Unsupported URL node type: ' + urlNode.type);

  let options: any = {};
  if (args.length > 1) {
    options = astToJs(args[1]);
  }

  const headers: Record<string, string> = {};
  if (options.headers && typeof options.headers === 'object') {
    for (const k of Object.keys(options.headers)) {
      const v = options.headers[k];
      headers[k.toLowerCase()] = v == null ? '' : String(v);
    }
  }

  const cookies: Record<string, string> = {};
  if (headers.cookie) {
    headers.cookie.split(';').forEach((c) => {
      const idx = c.indexOf('=');
      if (idx !== -1) {
        const k = c.slice(0, idx).trim();
        const v = c.slice(idx + 1).trim();
        cookies[k] = v;
      }
    });
  }

  const method = options.method ? String(options.method).toUpperCase() : options.body ? 'POST' : 'GET';

  return { url, method, headers, body: options.body, cookies, raw: { options } };
}

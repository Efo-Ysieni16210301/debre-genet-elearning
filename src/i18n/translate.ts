export type PluralMessage = { one: string; other: string };

export type Leaf = string | PluralMessage;

export type Tree = { [key: string]: Leaf | Tree };

type Join<K extends string, P> = P extends string ? `${K}.${P}` : never;

export type Path<T> = T extends Leaf
  ? never
  : {
      [K in keyof T & string]: T[K] extends Leaf ? K : Join<K, Path<T[K]>>;
    }[keyof T & string];

export type Params = Record<string, string | number>;

function isPlural(value: unknown): value is PluralMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as PluralMessage).one === "string" &&
    typeof (value as PluralMessage).other === "string"
  );
}

export function translate(
  messages: Tree,
  key: string,
  params?: Params,
): string {
  let node: Leaf | Tree | undefined = messages;

  for (const part of key.split(".")) {
    if (
      typeof node !== "object" ||
      node === null ||
      isPlural(node) ||
      !(part in node)
    ) {
      node = undefined;
      break;
    }

    node = (node as Tree)[part];
  }

  let text: string | undefined;

  if (typeof node === "string") {
    text = node;
  } else if (isPlural(node)) {
    text = params?.count === 1 ? node.one : node.other;
  }

  if (text === undefined) {
    return key;
  }

  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    params && name in params ? String(params[name]) : match,
  );
}

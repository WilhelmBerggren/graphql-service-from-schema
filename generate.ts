import {
  ConstDirectiveNode,
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
  StringValueNode,
} from "graphql";
import { makeResolver } from "./db";

const commandValue = (directives?: readonly ConstDirectiveNode[]) => {
  const command = directives
    ?.find((node) => node.name.value === "SQL")
    ?.arguments?.find((node) => node.name.value === "command");
  return (command?.value as StringValueNode | undefined)?.value;
};

const defsWithCommands = (typeDefs: DocumentNode) =>
  typeDefs.definitions.filter(
    (node) => node.kind === Kind.OBJECT_TYPE_DEFINITION
  ) as ObjectTypeDefinitionNode[];

export const getCommands = (typeDefs: DocumentNode) =>
  defsWithCommands(typeDefs)
    .map(({ directives }) => commandValue(directives))
    .filter(Boolean) as string[];

export const getResolvers = (typeDefs: DocumentNode) =>
  Object.fromEntries(
    defsWithCommands(typeDefs).map(({ name: { value: root }, fields = [] }) => [
      root,
      Object.fromEntries(
        fields
          .filter((field) => commandValue(field.directives))
          .map((field) => [
            field.name.value,
            makeResolver({
              root,
              field: field.name.value,
              command: commandValue(field.directives)!,
            }),
          ])
      ),
    ])
  );

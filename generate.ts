import {
  DocumentNode,
  FieldDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
  StringValueNode,
} from "graphql";
import { createMutation, createQuery } from "./db";
import { ObjectStringLiteral, QueryCommands } from "./typeUtils";

const sqlCommands = (node: ObjectTypeDefinitionNode | FieldDefinitionNode) =>
  (node.directives || [])
    .filter((directive) => directive.name.value === "SQL")
    .flatMap(({ arguments: args }) =>
      (args || []).filter((arg) => arg.name.value === "command")
    );

const extractCommands = (
  node: readonly (ObjectTypeDefinitionNode | FieldDefinitionNode)[]
) =>
  node.reduce<ObjectStringLiteral>((commands, childNode) => {
    sqlCommands(childNode)
      .map((command) => (command.value as StringValueNode).value)
      .forEach((value) => (commands[childNode.name.value] = value));
    return commands;
  }, {});

const objectDefinitions = (node: DocumentNode) =>
  node.definitions.filter(
    (definition) => definition.kind === Kind.OBJECT_TYPE_DEFINITION
  ) as ObjectTypeDefinitionNode[];

const queryCommands = (objectDefinitions: ObjectTypeDefinitionNode[]) =>
  objectDefinitions.reduce<QueryCommands>((commands, node) => {
    if (node.fields) {
      commands[node.name.value] = extractCommands(node.fields);
    }
    return commands;
  }, {});

export const createCommands = (typeDefs: DocumentNode) =>
  extractCommands(objectDefinitions(typeDefs));

export const createResolvers = (typeDefs: DocumentNode) =>
  Object.fromEntries(
    Object.entries(queryCommands(objectDefinitions(typeDefs))).map(
      ([root, fields]) => [
        root,
        Object.fromEntries(
          Object.entries(fields).map(([field, command]) => [
            field,
            (root === "Mutation" ? createMutation : createQuery)(
              command,
              field
            ),
          ])
        ),
      ]
    )
  );

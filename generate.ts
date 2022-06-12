import {
  DocumentNode,
  FieldDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
  StringValueNode,
} from "graphql";
import { makeQuery } from "./db";

export const getCommands = (typeDefs: DocumentNode) => {
  return typeDefs.definitions
    .filter((node) => node.kind === Kind.OBJECT_TYPE_DEFINITION)
    .map((object) => {
      const command = (object as ObjectTypeDefinitionNode).directives
        ?.find((d) => d.name.value === "SQL")
        ?.arguments?.find((a) => a.name.value === "command");
      return command;
    })
    .filter((command) => Boolean(command))
    .map((command) => (command?.value as StringValueNode).value);
};

export const getResolvers = (typeDefs: DocumentNode) =>
  Object.fromEntries(
    (typeDefs.definitions as ObjectTypeDefinitionNode[])
      .filter((node) => node.kind === Kind.OBJECT_TYPE_DEFINITION)
      .map((object) => [
        object.name.value,
        Object.fromEntries(
          ((object.fields || []) as FieldDefinitionNode[])
            .map((field) => [
              field.name.value,
              (
                field.directives
                  ?.find((d) => d.name.value === "SQL")
                  ?.arguments?.find((a) => a.name.value === "command")
                  ?.value as StringValueNode
              ).value,
            ])
            .filter(([_, command]) => Boolean(command))
            .map(([name, command]) => {
              return [name, makeQuery(object.name.value, name, command)];
            })
        ),
      ])
  );

import { ApolloServer } from "apollo-server";
import Sqlite from "better-sqlite3";
import fs from "fs";
import {
  FieldDefinitionNode,
  ObjectTypeDefinitionNode,
  parse,
  StringValueNode,
  visit,
} from "graphql";

/** TODO:
 *
 * - Generalise resolver generation by root type
 * - Dataloaders based on @key directive
 * - Joins or relations
 */

const schema = fs.readFileSync("schema.graphql").toString();

const createCommands: { [key: string]: string } = {};
const resolverCommands: { [key: string]: { [key: string]: string } } = {};

function visitCommands(
  node: ObjectTypeDefinitionNode | FieldDefinitionNode,
  visit: (name: string, command: string) => void
) {
  for (let directive of node.directives || []) {
    if (directive.name.value === "SQL") {
      for (let argument of directive.arguments || []) {
        if (argument.name.value === "command") {
          visit(node.name.value, (argument.value as StringValueNode).value);
        }
      }
    }
  }
}

visit(parse(schema), {
  ObjectTypeDefinition: {
    enter(node) {
      visitCommands(node, (name, command) => (createCommands[name] = command));
      resolverCommands[node.name.value] = {};
      for (let field of node.fields || []) {
        visitCommands(
          field,
          (name, command) => (resolverCommands[node.name.value][name] = command)
        );
      }
    },
  },
});

console.log(JSON.stringify(createCommands, null, 2));
console.log(JSON.stringify(resolverCommands, null, 2));

const db = new Sqlite("sqlite.db", { verbose: console.log });
for (let command of Object.values(createCommands)) {
  console.log(db.prepare(command).run());
}

const server = new ApolloServer({
  typeDefs: schema,
  resolvers: Object.fromEntries(
    Object.entries(resolverCommands).map(([root, fields]) => [
      root,
      Object.fromEntries(
        Object.entries(fields).map(([field, command]) => [
          field,
          (_: any, args: any) => {
            if (root === "Mutation") {
              const id = Math.random().toString();
              db.prepare(command).run(id, Object.values(args));
              return { id, ...args };
            }
            const verb = field[field.length - 1] === "s" ? "all" : "get";

            return db.prepare(command)[verb](Object.values(args));
          },
        ])
      ),
    ])
  ),
});

server.listen().then(({ url }) => console.log("Server ready at", url));

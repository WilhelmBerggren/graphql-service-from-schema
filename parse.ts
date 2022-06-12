import { ApolloServer } from "apollo-server";
import Sqlite from "better-sqlite3";
import fs from "fs";
import { ASTVisitor, parse, StringValueNode, visit } from "graphql";

/** TODO:
 *
 * - Generalise resolver generation by root type
 * - Dataloaders based on @key directive
 * - Joins or relations
 */

const schema = fs.readFileSync("schema.graphql").toString();

const commands: { [key: string]: string } = {};

visit(parse(schema), {
  ObjectTypeDefinition: {
    enter(node) {
      const sqlDirective = node.directives?.find((d) => d.name.value === "SQL");
      const command = sqlDirective?.arguments?.find(
        (a) => a.name.value === "command"
      );
      if (command) {
        commands["ObjectTypeDefinition-" + node.name.value] = (
          command.value as StringValueNode
        ).value;
      }
      node.fields?.forEach((field) => {
        const sqlFindAllDirective = field.directives?.find(
          (d) => d.name.value === "SQL"
        );
        const command = sqlFindAllDirective?.arguments?.find(
          (a) => a.name.value === "command"
        );
        if (command) {
          commands[node.name.value + "-" + field.name.value] = (
            command.value as StringValueNode
          ).value;
        }
      });
    },
  },
});

const db = new Sqlite("sqlite.db", { verbose: console.log });
for (let command of Object.values(commands).filter((command) =>
  command.startsWith("create table")
)) {
  console.log(db.prepare(command).run());
}

const server = new ApolloServer({
  typeDefs: schema,
  resolvers: {
    Query: Object.fromEntries(
      Object.entries(commands)
        .filter((c) => c[0].startsWith("Query-"))
        .map(([key, command]) => {
          const name = key.split("-")[1];
          return [
            name,
            (_: any, args: any) => {
              const result = db
                .prepare(command)
                [name[name.length - 1] === "s" ? "all" : "get"](
                  ...Object.values(args)
                );
              console.log(result);
              return result;
            },
          ];
        })
    ),
    Mutation: Object.fromEntries(
      Object.entries(commands)
        .filter((c) => c[0].startsWith("Mutation-"))
        .map(([key, command]) => {
          const name = key.split("-")[1];
          console.log(key, name);
          return [
            name,
            (_: any, args: any) => {
              const id = Math.random().toString();
              db.prepare(command).run(id, ...Object.values(args));
              return {
                id,
                ...args,
              };
            },
          ];
        })
    ),
  },
});

server.listen().then(({ url }) => console.log("Server ready at", url));

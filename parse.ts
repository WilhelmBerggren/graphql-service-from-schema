import { ApolloServer } from "apollo-server";
import Sqlite from "better-sqlite3";
import fs from "fs";
import { ASTVisitor, parse, StringValueNode, visit } from "graphql";

/** TODO:
 *
 * - Generalise resolver logic by prefixing command names by root type
 * - Dataloaders based on @key directive
 * - Joins or relations
 */

const schema = fs.readFileSync("schema.graphql").toString();

const sqlCommands: { [key: string]: string } = {};

visit(parse(schema), {
  ObjectTypeDefinition: {
    enter(node) {
      const sqlCreateDirective = node.directives?.find(
        (d) => d.name.value === "SQL"
      );
      const createCommand = sqlCreateDirective?.arguments?.find(
        (a) => a.name.value === "command"
      );
      if (createCommand) {
        sqlCommands["ObjectTypeDefinition-" + node.name.value] = (
          createCommand.value as StringValueNode
        ).value;
      }
      node.fields?.forEach((field) => {
        const sqlFindAllDirective = field.directives?.find(
          (d) => d.name.value === "SQL"
        );
        const findAllCommand = sqlFindAllDirective?.arguments?.find(
          (a) => a.name.value === "command"
        );
        if (findAllCommand) {
          sqlCommands[node.name.value + "-" + field.name.value] = (
            findAllCommand.value as StringValueNode
          ).value;
        }
      });
    },
  },
});

const db = new Sqlite("sqlite.db", { verbose: console.log });
for (let command of Object.values(sqlCommands).filter((command) =>
  command.startsWith("create table")
)) {
  console.log(db.prepare(command).run());
}

console.log(
  Object.fromEntries(
    Object.entries(sqlCommands).map(([key, command]) => {
      return [key.split("-")[1], () => command];
    })
  )
);

const server = new ApolloServer({
  typeDefs: schema,
  resolvers: {
    Query: Object.fromEntries(
      Object.entries(sqlCommands)
        .filter((c) => c[0].startsWith("Query-"))
        .map(([key, command]) => {
          const name = key.split("-")[1];
          console.log(key, name);
          return [
            name,
            (_: any, args: any) => {
              console.log(name, args);
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
      Object.entries(sqlCommands)
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

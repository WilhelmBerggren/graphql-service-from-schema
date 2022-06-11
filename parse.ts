import fs from "fs";
import {
  ASTNode,
  ASTVisitor,
  DirectiveDefinitionNode,
  parse,
  print,
  StringValueNode,
  visit,
} from "graphql";
import Sqlite from "better-sqlite3";
import { ApolloServer } from "apollo-server";

const schema = fs.readFileSync("schema.graphql").toString();

const parsed = parse(schema);

const sqlCommands: { [key: string]: string } = {};

const visitor: ASTVisitor = {
  ObjectTypeDefinition: {
    enter(node) {
      const sqlCreateDirective = node.directives?.find(
        (d) => d.name.value === "SQL"
      );
      const createCommand = sqlCreateDirective?.arguments?.find(
        (a) => a.name.value === "command"
      );
      if (createCommand) {
        sqlCommands["Object-" + node.name.value] = (
          createCommand.value as StringValueNode
        ).value;
      }
    },
  },
  FieldDefinition: {
    enter(node) {
      const sqlFindAllDirective = node.directives?.find(
        (d) => d.name.value === "SQL"
      );
      const findAllCommand = sqlFindAllDirective?.arguments?.find(
        (a) => a.name.value === "command"
      );
      if (findAllCommand) {
        sqlCommands["Field-" + node.name.value] = (
          findAllCommand.value as StringValueNode
        ).value;
      }
    },
  },
};

visit(parsed, visitor);

const db = new Sqlite("sqlite.db", { verbose: console.log });
for (let command of Object.values(sqlCommands).filter((command) =>
  command.startsWith("create table")
)) {
  console.log(db.prepare(command).run());
}

const server = new ApolloServer({
  typeDefs: schema,
  resolvers: {
    Query: {
      user: (_, { id }) => {
        return db.prepare(sqlCommands["Field-user"]).get(id);
      },
    },
    Mutation: {
      createUser: (_, { username }) => {
        const id = Math.random().toString();
        console.log({ sqlCommands });
        db.prepare(sqlCommands["Field-createUser"]).run(id, username);
        return {
          id,
          username,
        };
      },
    },
  },
});
server.listen().then(({ url }) => console.log("Server ready at", url));

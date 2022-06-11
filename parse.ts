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

const sqlCreateTableCommands: { [key: string]: string } = {};
const sqlInsertCommands: { [key: string]: string } = {};
const sqlFindAllCommands: { [key: string]: string } = {};
const sqlFindCommands: { [key: string]: string } = {};

const visitor: ASTVisitor = {
  ObjectTypeDefinition: {
    enter(node) {
      const sqlCreateDirective = node.directives?.find(
        (d) => d.name.value === "SQLCreateTable"
      );
      const createCommand = sqlCreateDirective?.arguments?.find(
        (a) => a.name.value === "command"
      );
      if (createCommand) {
        sqlCreateTableCommands[node.name.value] = (
          createCommand.value as StringValueNode
        ).value;
      }
    },
  },
  FieldDefinition: {
    enter(node) {
      const sqlFindAllDirective = node.directives?.find(
        (d) => d.name.value === "SQLFindAll"
      );
      const findAllCommand = sqlFindAllDirective?.arguments?.find(
        (a) => a.name.value === "command"
      );
      if (findAllCommand) {
        sqlFindAllCommands[node.name.value] = (
          findAllCommand.value as StringValueNode
        ).value;
      }

      const sqlFindDirective = node.directives?.find(
        (d) => d.name.value === "SQLFind"
      );
      const findCommand = sqlFindDirective?.arguments?.find(
        (a) => a.name.value === "command"
      );
      if (findCommand) {
        sqlFindCommands[node.name.value] = (
          findCommand.value as StringValueNode
        ).value;
      }

      const sqlInsertDirective = node.directives?.find(
        (d) => d.name.value === "SQLInsert"
      );
      const insertCommand = sqlInsertDirective?.arguments?.find(
        (a) => a.name.value === "command"
      );
      if (insertCommand) {
        sqlInsertCommands[node.name.value] = (
          insertCommand.value as StringValueNode
        ).value;
      }
    },
  },
};

visit(parsed, visitor);

const db = new Sqlite("sqlite.db", { verbose: console.log });
for (let command of Object.values(sqlCreateTableCommands)) {
  console.log(db.prepare(command).run());
}

const server = new ApolloServer({
  typeDefs: schema,
  resolvers: {
    Query: {
      user: (_, { id }) => {
        return db.prepare(sqlFindCommands["user"]).get(id);
      },
    },
    Mutation: {
      createUser: (_, { username }) => {
        const id = Math.random().toString();
        console.log({ sqlInsertCommands });
        db.prepare(sqlInsertCommands["createUser"]).run(id, username);
        return {
          id,
          username,
        };
      },
    },
  },
});
server.listen().then(({ url }) => console.log("Server ready at", url));

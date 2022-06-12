import Sqlite from "better-sqlite3";
import { DocumentNode } from "graphql";
import { getCommands } from "./generate";

const db = new Sqlite("sqlite.db", { verbose: console.log });

export const initDb = (typeDefs: DocumentNode) => {
  Object.values(getCommands(typeDefs)).forEach((command) =>
    db.prepare(command).run()
  );
};

export const makeResolver =
  (root: string, field: string, command: string) =>
  (parent: any, args: any) => {
    if (root === "Mutation") {
      const id = Math.random().toString();
      db.prepare(command).run({ id, ...args });
      return { id, ...args };
    } else {
      return db
        .prepare(command)
        [field[field.length - 1] === "s" ? "all" : "get"]({
          [field + "Id"]: parent?.[field + "Id"],
          id: parent?.id,
          ...args,
        });
    }
  };

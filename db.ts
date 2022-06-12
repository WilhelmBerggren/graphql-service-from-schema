import Sqlite from "better-sqlite3";
import { DocumentNode } from "graphql";
import { getCommands } from "./generate";

const db = new Sqlite("sqlite.db", { verbose: console.log });

export const initDb = (typeDefs: DocumentNode) => {
  Object.values(getCommands(typeDefs)).forEach((command) =>
    db.prepare(command).run()
  );
};

export const createMutation = (command: string) => (_: any, args: any) => {
  const id = Math.random().toString();
  db.prepare(command).run({ id, ...args });
  return { id, ...args };
};

export const createQuery =
  (command: string, field: string) => (_: any, args: any) => {
    return db
      .prepare(command)
      [field[field.length - 1] === "s" ? "all" : "get"](args);
  };

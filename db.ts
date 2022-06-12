import Sqlite from "better-sqlite3";
import { DocumentNode } from "graphql";
import { getCommands } from "./generate";

const db = new Sqlite("sqlite.db", { verbose: console.log });

export const initDb = (typeDefs: DocumentNode) =>
  Object.values(getCommands(typeDefs)).forEach((command) =>
    db.prepare(command).run()
  );

type makeResolverArgs = { root: string; field: string; command: string };
export const makeResolver =
  ({ root, field, command }: makeResolverArgs) =>
  (parent: any, args: any) => {
    const id = Math.random().toString();
    return root === "Mutation"
      ? db.prepare(command).run({ id, ...args }) && { id, ...args }
      : db.prepare(command)[field[field.length - 1] === "s" ? "all" : "get"]({
          [field + "Id"]: parent?.[field + "Id"],
          id: parent?.id,
          ...args,
        });
  };

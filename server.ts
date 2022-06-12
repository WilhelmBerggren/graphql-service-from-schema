import { ApolloServer } from "apollo-server";
import fs from "fs";
import { parse } from "graphql";
import { initDb } from "./db";
import { createCommands, createResolvers } from "./parse";

const typeDefs = parse(fs.readFileSync("schema.graphql").toString());

initDb(typeDefs);

const server = new ApolloServer({
  typeDefs: typeDefs,
  resolvers: createResolvers(typeDefs),
});

server.listen().then(({ url }) => console.log("Server ready at", url));

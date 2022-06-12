import { buildSubgraphSchema } from "@apollo/subgraph";
import { ApolloServer } from "apollo-server";
import fs from "fs";
import { parse } from "graphql";
import { initDb } from "./db";
import { getResolvers } from "./generate";

const typeDefs = parse(fs.readFileSync("schema.graphql").toString());

initDb(typeDefs);

const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs: typeDefs,
    resolvers: getResolvers(typeDefs),
  }),
});

server.listen().then(({ url }) => console.log("Server ready at", url));

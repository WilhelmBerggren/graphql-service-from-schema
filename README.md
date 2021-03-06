# What

Generate a backend from a GraphQL schema, using a custom directive called `@SQL`.

[Live Example](https://graphql-service-from-schema.onrender.com) (in a free tier container)

```graphql
@SQL(command: "create table if not exists users(id text, username text);")
type User {
  id: ID!,
  username: String,
}

type Query {
  user(id: ID!): User @SQL(command: "select * from users where id = :id")
  users(first: Int!, offset: Int!): [User] @SQL(command: "select * from users limit :first offset :offset")
}

type Mutation {
  createUser(username: String): User @SQL(command: "insert into users ( id, username ) values ( :id, :username )")
}
```

# How

Resolvers are generated by parsing the schema. Annotate object descriptions on how to create a SQLite table, and fields on how to fetch them.

Simply write your schema in `schema.gql` and run `yarn dev`.

Alternatively, for a "production" docker container, run `yarn docker`

# Tools

This is written using these libraries:

- better-sqlite3: a fast library for using SQLite
- graphql: the official library for parsing and printing GraphQL syntax
- apollo-server: the easiest to use GraphQL server

# Tour

This project was made to be as minimal as possible. Here are the files:

## `generate.ts`

### `getCommands`

Takes in a parsed GraphQL schema, and returns each SQL command which defines how to create an SQL table for its respective object type.

### `getResolvers`

Takes in a parsed GraphQL schema, and for each field which has a defined SQL command. Returns a resolver which executes that command using `initDb.ts/makeQuery`.

## `db.ts`

### `initDb`

Takes in a parsed GraphQL schema, and uses the aforementioned `getCommands` to execute each object's respective table.

### `makeResolver`

Takes in the name of a root, a field and a command to access that field. Returns a resolver which executes that command.

## `server.ts`

The entrypoint of the service. Parses the typeDefs, initialises the database and starts the server with the generated resolvers.

# TODO:

- Look into adding dataloaders based on @key directive
- Better Federation support

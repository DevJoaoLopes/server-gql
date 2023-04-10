import {ApolloServer} from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import cors from 'cors';
import bodyParser from 'body-parser';
import express from 'express';
import http from 'http';
import {randomUUID} from 'node:crypto';

const app = express();
const httpServer = http.createServer(app);
const DOCS = [];
const corsOptions = {
    origin: 'ws://localhost:4000/' // For WebSocket CORS
}

const typeDefs = `#graphql
    type Doc {
        id: String,
        name: String
    },

    type Query {
        docsSigned: [Doc]! #always return array
    },

    type Mutation {
        signDocs(name: String): String!
    }
`;

const resolvers = {
    Query: {
        docsSigned: () => DOCS
    },

    Mutation: {
        signDocs: (_, args) => {
            const dataDoc = {id: randomUUID(), name: args.name}
            DOCS.push(dataDoc);
            return args.name;
        }
    }
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

await server.start();

app.use('/', cors(corsOptions), bodyParser.json(), expressMiddleware(server));

await new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));

console.log('Server ready at: http://localhost:4000/');
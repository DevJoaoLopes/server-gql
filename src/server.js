import {ApolloServer} from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import cors from 'cors';
import bodyParser from 'body-parser';
import express from 'express';
import http from 'http';
import {randomUUID} from 'node:crypto';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { PubSub } from 'graphql-subscriptions';


const pubSub = new PubSub();
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

    type Subscription {
        successDoc: String!
    }
`;

const resolvers = {
    Query: {
        docsSigned: () => DOCS
    },

    Mutation: {
        signDocs: (_, args) => {
            const dataDoc = {id: randomUUID(), name: args.name};
            const date = new Date();
            DOCS.push(dataDoc);
            pubSub.publish('SIGN_DOC', { successDoc: `Documento ${args.name} foi assinado em ${date}` });
            return args.name;
        }
    },

    Subscription: {
        successDoc: {
            subscribe: () => pubSub.asyncIterator(['SIGN_DOC']),
        }
    }
};

const schema = makeExecutableSchema({ typeDefs, resolvers });
const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/'
});
const serverCleanup = useServer({schema}, wsServer);

const server = new ApolloServer({
    schema,
    plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer }),
        {
            async serverWillStart() {
                return {
                    async drainServer(){
                        await serverCleanup.dispose();
                    }
                }
            }
        }
    ],
    
});


await server.start();

app.use('/', cors(corsOptions), bodyParser.json(), expressMiddleware(server));

await new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));

console.log('Server ready at: http://localhost:4000/');
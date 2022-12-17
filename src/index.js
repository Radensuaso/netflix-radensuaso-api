import express from "express"; // import express from express
import cors from "cors"; // will enable the frontend to communicate with the backend
import listEndpoints from "express-list-endpoints"; // will show us the detailed endpoints
import mediaRouter from "./services/index.js";
import {
    notFoundHandler,
    badRequestHandler,
    forbiddenHandler,
    genericServerErrorHandler,
} from "./errorHandlers.js";

const server = express();
const PORT = process.env.PORT || 9000; // this will be the port on with the server will run

//=========== GLOBAL MIDDLEWARES ======================
server.use(cors());
server.use(express.json()); // this will enable reading of the bodies of requests, THIS HAS TO BE BEFORE server.use("/authors", authorsRouter)

// ========== ROUTES =======================
server.use("/media", mediaRouter); // this will provide the endpoints of authors with a common name to POST, GET, PUT and DELETE

// ============== ERROR HANDLING ==============

server.use(notFoundHandler);
server.use(badRequestHandler);
server.use(forbiddenHandler);
server.use(genericServerErrorHandler);

console.table(listEndpoints(server)); // will show us the detailed endpoints in a table

server.listen(PORT, () =>
    console.log(`Server is listening to the port ${PORT}.`)
);

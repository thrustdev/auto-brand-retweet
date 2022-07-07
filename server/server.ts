import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch"
import needle from 'needle'
import path from "path";
import { Server } from "socket.io"
import http from "http"

const app = express();
let port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = http.createServer(app);
const io = new Server(server);

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

let timeout = 0;

const streamURL = "https://api.twitter.com/2/tweets/search/stream?tweet.fields=context_annotations&expansions=author_id"
const rulesURL = "https://api.twitter.com/2/tweets/search/stream/rules"

const errorMessage = {
    title: "Please Wait",
    detail: "Waiting for new Tweets to be posted...",
};

const authMessage = {
    title: "Could not authenticate",
    details: [
        `Please make sure your bearer token is correct. 
      If using Glitch, remix this app and add it to the .env file`,
    ],
    type: "https://developer.twitter.com/en/docs/authentication",
};

const sleep = async (delay: number) => {
    return new Promise((resolve) => setTimeout(() => resolve(true), delay));
};

app.get("/api/rules", async (req, res) => {
    if (!BEARER_TOKEN) {
        res.status(400).send(authMessage);
    }

    const token = BEARER_TOKEN;

    try {
        const response = await fetch(rulesURL, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status !== 200) {
            if (response.status === 403) {
                res.status(403).send(response.body);
            } else {
                throw new Error(await response.text());
            }
        }

        res.send(await response.json());
    } catch (e) {
        res.send(e);
    }
});

app.post("/api/rules", async (req, res) => {
    if (!BEARER_TOKEN) {
        res.status(400).send(authMessage);
    }

    const token = BEARER_TOKEN;

    try {
        const response = await fetch(rulesURL, {
            headers: {
                'method': 'POST',
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200 || response.status === 201) {
            res.send(await response.json());
        } else {
            throw new Error(await response.text());
        }
    } catch (e) {
        res.send(e);
    }
});

const streamTweets = async (socket: Server, token: string) => {
    let stream: needle.ReadableStream;

    try {
        stream = await needle.get(streamURL, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 20000
        });

        stream
            .on("data", (data: string) => {
                try {
                    const json = JSON.parse(data);
                    if (json.connection_issue) {
                        socket.emit("error", json);
                        reconnect(stream, socket, token);
                    } else {
                        if (json.data) {
                            socket.emit("tweet", json);
                        } else {
                            socket.emit("authError", json);
                        }
                    }
                } catch (e) {
                    socket.emit("heartbeat");
                }
            })
            .on("error", () => {
                // Connection timed out
                socket.emit("error", errorMessage);
                reconnect(stream, socket, token);
            });
    } catch (e) {
        socket.emit("authError", authMessage);
    }
};

const reconnect = async (stream: needle.ReadableStream, socket: Server, token: string) => {
    timeout++;
    // @ts-ignore
    stream.cancel();
    await sleep(2 ** timeout * 1000);
    streamTweets(socket, token);
};

io.on("connection", async (socket) => {
    try {
        const token = BEARER_TOKEN as string;
        io.emit("connect", "Client connected");
        const stream = streamTweets(io, token);
    } catch (e) {
        io.emit("authError", authMessage);
    }
});

console.log("NODE_ENV is", process.env.NODE_ENV);

if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../build")));
    app.get("*", (request, res) => {
        res.sendFile(path.join(__dirname, "../build", "index.html"));
    });
} else {
    port = 3001;
}

server.listen(port, () => console.log(`Listening on port ${port}`));